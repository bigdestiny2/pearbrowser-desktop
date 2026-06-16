# P2P Naming & Resolution — Design Doc (human-readable names → keys)

> Status: **Design / RFC** · Stack: Bare (CJS) + Chromium · Branch grounded: `feat/phase5-relay-directory`
> Companion docs: [`docs/AUTOBEE-RESEARCH.md`](../AUTOBEE-RESEARCH.md) · [`docs/P2P-SEARCH-RESEARCH.md`](../P2P-SEARCH-RESEARCH.md) · [`docs/HIVERELAY-BACKBONE-RESPONSE.md`](../HIVERELAY-BACKBONE-RESPONSE.md)

---

## 1. Executive summary

Today every navigable thing in PearBrowser is a raw 32-byte key — a 64-char hex or 52-char z-base-32 string, or a `pear://<z32>` link. There is **no name-resolution layer anywhere in the codebase**: a human-readable name like `keet` typed into the URL bar falls straight through `normalizeUrl()` (`ui/lib/keys.js:122`) to `hyper://keet/` and fails to resolve. The only "name table" that exists is a hardcoded, unsigned constant — `FEATURED_APPS` in `ui/shell.js:33`, manually copied from Holepunch's upstream `pear-aliases` allow-list. This doc proposes a **petname-first naming layer** in which a human→key binding is a *signed assertion inside a trust context* (your own saved aliases, the curators/contacts you follow, and an optional baked-in alias set), **never a first-come global registrar**. The design is built almost entirely from primitives already shipped on this branch: the self-certifying HyperDHT `mutableGet` resolver (`backend/relay-record.js`), the Autobase op-log + pure-reducer pattern (`backend/autobee-catalog-{ops,apply,manager}.cjs`), the schema-sheets signed/queryable rooms and verify-and-drop directory merge (`backend/sheets-catalog.js`, `backend/index-room-client.js`, `backend/relay-directory.js`), the social graph keyed on root pubkeys (`backend/contacts.js`), and Ed25519 identity with deterministic per-app subkeys (`backend/identity.js`). Zooko's triangle is squared by being honest about the trade-off at every layer: the **key** is the source of truth (secure + global), a publisher's claimed **nickname** is shown with an "unverified" badge (global + memorable, not secure), and a user's saved **petname** is local-memorable-and-secure. The one genuinely new cryptographic prerequisite — an `IdentityBinding` + `identity.verify()` — is shared with the P2P-search work and is the single gate on the anti-Sybil half.

---

## 2. Problem & why it matters

Pear content is addressed by opaque 32-byte keys with no DNS, no central crawler, and no naming authority. **Zooko's triangle** [11] states a name can be at most two of {global, secure, memorable}; a Hyperdrive key is global + secure but not memorable. The naming problem is supplying the missing memorable corner without lying to the user about which property was traded away.

Why this matters for PearBrowser specifically:

1. **The URL bar is a dead end for humans.** `normalizeUrl()` blindly coerces a bare word to `hyper://<word>` (`ui/lib/keys.js:129`). A user who types `keet` gets a failed navigation, not Keet. The product's only working "names" are 64-hex / 52-z32 keys nobody can remember or type.
2. **The current name table is a frozen, unsigned, centralized artifact.** `FEATURED_APPS` (`ui/shell.js:33–94`) is a hand-vetted literal copied from `github.com/holepunchto/pear-aliases` [15][16]. No runtime fetch, no signature check, no update path, no revocation — it is the centralized corner of Zooko's triangle, baked at build time. It cannot scale past first-party apps and cannot represent *your* names.
3. **The ecosystem needs name continuity across key rotation.** A key-derived identity cannot rotate or be revoked (the universal lesson of did:key [10], did:pkh [12], IPNS [8]). When a publisher ships v2 of an app under a new drive key, or a user restores from a different device, the *name* must be able to follow — which requires a pointer/naming layer distinct from the key.
4. **Phishing pressure is real and growing.** As soon as names exist, squatting, homographs ("раypal" in Cyrillic), and forged resolution become attacks that route users to attacker-controlled drives. The defense cannot be a registrar (that re-creates DNS + a central trust root); it has to be trust-relative resolution with the key always canonical.

The project already has a documented stance on this (`docs/P2P-SEARCH-RESEARCH.md` §2.1, §6.4, §8): **the human-meaningful corner is supplied by a signed assertion from someone — a publisher self-listing, a curator listing, or a friend endorsing — that binds {human name} → {32-byte key}, resolved relative to a trust context, never a global registrar.** This doc operationalizes that stance into a concrete, phased naming subsystem.

---

## 3. Current state in our codebase

Everything below was read on `feat/phase5-relay-directory`. Line numbers are current.

### 3.1 What "names" are today

- **Key encodings are the only real names.** A 32-byte key appears as 64-hex (canonical internal) or 52-char z-base-32 (display/entry, Holepunch "Vinjari" style); private rooms use 104-char z32 = `key32 ++ encKey32`. The single codec lives in `ui/lib/keys.js`: `Z32_ALPHABET` (line 11), `z32EncodeBytes`/`z32DecodeToBytes` (29/47), `z32FromHex`/`hexFromZ32` (89/94), `shortKey` (116). Framework-free, unit-tested (`test/keys.test.js`).
- **Two URL-normalization chokepoints — the primary resolver seams.**
  - **UI:** `normalizeUrl(raw)` (`ui/lib/keys.js:122`). Recognizes only structural patterns: `hyper://`, 64-hex, 52-z32, anything with `/` or `pear://`, then the fall-through `return \`hyper://${s}\`` (line 129) — **the exact hook for a name resolver**. Called from `ui/shell.js` `go()` (507) and the URL-edit/commit handler (544). It is **synchronous today**; DHT/relay resolution is async, which ripples into `go()` (which already shows a `resolving …` status at `shell.js:512`).
  - **Backend:** `normalizeDriveKey(raw)` (`backend/index.js:19`). Accepts 64-hex / 52-z32, decodes z32→hex, and lets unknown formats pass through unchanged (`return raw`, line 26) so existing errors still fire downstream — the natural place to put DHT/relay-backed resolution since the swarm/DHT live in the backend. Called inside `CMD_NAVIGATE` (138, used at 148).
- **Per-scheme parsing + link decode already follow a repeatable pattern.** `parseCatalogRef` (`ui/lib/keys.js:138`) routes `autobee://`/`hyperbee://`/`hyper://` → `{ key, bee, autobee, kind }`; the UI maps `kind`→RPC in `catalogLoadPlan` (`ui/shell.js:123`). `decodeSheetsLink` (`backend/sheets-catalog.js:49`) is the canonical z32-link codec; `decodeIndexLink` (`backend/index-room-client.js:35`) strips `hiveindex://` and delegates to it. Each new scheme was added as a regex + a `CMD_*` constant + a manager method — **a `pearname://` scheme follows the identical recipe.**

### 3.2 The hardcoded aliases (the baseline to beat)

`ui/shell.js`: `FEATURED_APPS` (33–94, the pear-aliases reference in the header comment at line 18), `DEFAULT_URL` (109), `DEFAULT_CATALOG_KEY` (117). `backend/constants.js`: `ANONGPT_DRIVE_KEY` (181), `BOOTSTRAP_RELAYS` (196). These are the de-facto name→key table — all literal constants.

### 3.3 Primitives already wired up that a resolver reuses

- **iroh-style self-certifying `pubkey → signed DHT record` resolution (SHIPPED).** `backend/relay-record.js`: `resolveRelayRecord(dht, publicKey)` (39) does `dht.mutableGet(pubkey)`, which **verifies the Ed25519 signature against the key** — its header comment (lines 6–9): *"a resolved record is self-certifying — a malicious DHT node can only serve stale data, never forge."* Versioned/validated decode (`decodeRelayRecord`, 22; `RELAY_RECORD_VERSION = 1`). `resolveBootstrapRelays(dht, seeds)` (60) lets a seed be as little as `{ pubkey }`. Driven at boot over `swarm.dht` from `backend/index.js:1668–1681` via `relayClient.bootstrapFromDht` (`backend/relay-client.js:346`). The HTTP directory path (`listRelays`, `relay-client.js:309`) folds rows through the pure `mergeRelayDirectory(rows, current, verify)` (`backend/relay-directory.js:24`) — the **"index, not authority; drop unverifiable rows"** merge a name directory reuses verbatim.
- **Ed25519 identity + deterministic per-app subkeys (SHIPPED).** `backend/identity.js`: root keypair from BIP-39 seed (`getSigningKeypair`, 201; `entropyToSeed` = SHA-512(entropy), 111; root never leaves the worklet). `getAppKeypair(driveKeyHex)` (229) derives a subkey = `ed25519.seed_keypair(SHA-256(rootSeed ‖ "pear-app-v1:" ‖ driveKeyHex))` — same user+app = same pubkey forever; apps can't correlate. `signForApp(driveKeyHex, payload, namespace)` (262) and `sign(payload)` (292) are domain-separated detached signatures. **There is no `verify()` method** — `identity.js` only signs.
- **Contacts — the existing person→record KV (SHIPPED).** `backend/contacts.js`: Hyperbee `contact!<pubkey> → { displayName, … }` keyed on the **other user's root pubkey** (stable forever, line 12). `lookup` (64), `add` (71). `static parseInviteURL(url)` (123) parses `pear://contact?pk=<hex>&name=<url-encoded>&sig=<hex>` — an Ed25519 sig over `pear.contact:<pubkey>:<displayName>` — **the signed name↔key binding ceremony that already exists.**
- **Autobee — append-log + deterministic pure reducer (SHIPPED, feature-flagged).** `backend/autobee-catalog-ops.cjs`: `SCHEMA_VERSION=1`, op types `catalog.rename`/`app.upsert`/`app.remove`/`writer.add` (15–18); `validateOp` (89) returns the 3-way `ok`/`retain`/`reject` verdict; size caps (`MAX_OP_BYTES`, 21) + prototype-pollution scan (`hasUnsafeKey`, 34); **no wall-clock.** `backend/autobee-catalog-apply.cjs`: `linearize(tagged)` (26) total-orders by `(seq, writer, stableHash)`; `applyView` (35) folds; `toCatalogData` (67) projects to the DTO. `backend/autobee-catalog-manager.cjs`: wraps `Autobase`, records each op under `op!<index>`, handles `writer.add` via `host.addWriter(…, { indexer: true })` (42). Lifecycle in `backend/catalog-manager.js`: lazy `_autobeeManagerClass` (259, fail-closed), `_ensureAutobeeManager` (271, mint-then-reopen-by-key for a stable key-derived view namespace), `createAutobeeCatalog` (320), `autobeeAddWriter` (373), `_formatAutobee` (387, returns `shareKey: autobee://<hex>` + `writerKey`).
- **Catalog rows already are signed name→key bindings (de facto).** `apps` schema (`backend/sheets-catalog.js:24–43`, `APPS_SCHEMA`) enforces `driveKey` **or** `link` and carries a `verification` enum `['unverified','relay-listed','author-signed']`. The index room tags relay-served rows `verification: 'relay-listed'` (`backend/index-room-client.js:56`). This is precisely a per-trust-context `{name → key}` binding with a provenance tier.

### 3.4 RPC + feature-gating conventions (must be followed)

Numeric `CMD_*` in `backend/constants.js`, **hand-mirrored in `ui/boot.js`** (verified: `CMD_LOAD_CATALOG_AUTOBEE: 19`, `CMD_IDENTITY_SIGN: 74`, `CMD_CONTACTS_ADD: 92`, `CMD_AUTOBEE_CREATE: 160`). Handlers register via `rpc.handle(C.CMD_X, async (data) => …)` in `backend/index.js`. Experimental features are **gated server-side and fail closed**: `isAutobeeEnabled()`/`requireAutobee()` (`backend/index.js:810–821`) read the `experimentalAutobeeCatalogs` user-data setting and throw if absent, and the manager is **lazily required** so a disabled feature never affects boot. A name resolver adopts this flag-gated, lazy, fail-closed posture.

### 3.5 Honest gap list

1. **No name layer at all** — bare words become `hyper://<word>` and fail (`ui/lib/keys.js:129`).
2. **`pear-aliases` is upstream + static** — only adopted as the `FEATURED_APPS` literal; no fetch, no sig, no update, no revocation.
3. **`normalizeUrl` is synchronous** — resolution is async → ripples into `go()` and needs a resolving/loading UI state (the surface already exists at `shell.js:645`).
4. **Two parallel normalizers can drift** (`ui/lib/keys.js:normalizeUrl` vs `backend/index.js:normalizeDriveKey`) — the resolver must decide which layer owns resolution.
5. **No `IdentityBinding` and no `identity.verify()`** — `signForApp`'s subkey has zero cryptographic link to the drive's signing key *or* the root pubkey Contacts is keyed on. Until this exists, "the signer is a trusted contact" and "the signer owns this drive" are both unprovable.
6. **No conflict-resolution policy for name *ownership*** — the Autobee reducer's "last-in-order wins / whole-record replace" is right for catalog entries but wrong for name ownership (you want first-claim-wins or trust-weighted). The reducer is pure/swappable; the policy is undesigned.
7. **Autobee durability is explicitly unguaranteed** (`AUTOBEE-RESEARCH.md` "Do Not Do Yet") — a registry built on it inherits the open "HiveRelay won't pin all required cores yet" problem.
8. **The verify-and-drop verifier is threaded but not implemented** — `mergeRelayDirectory`/`IndexRoomClient` accept a `verify(doc)` callback but no capability verifier is wired for rows yet.

---

## 4. Requirements & constraints

**Functional**
- R1. Resolve a memorable name typed in the URL bar (and in catalog refs) to a 32-byte key, with the key always recoverable and always canonical.
- R2. Let a publisher *claim* a name for their drive (a nickname) and let a user *save* a private alias for any key (a petname).
- R3. Support a curated/relay-served root alias set so first-party apps (`keet`, `pear`, …) work on day one — generalizing, then replacing, `FEATURED_APPS` / `pear-aliases`.
- R4. Survive key rotation: a name can follow a publisher to a new drive key via a signed pointer, and follow a user across devices via the BIP-39 root.
- R5. Show provenance honestly: every resolved name renders a chip stating *why* it resolved (your alias / endorsed by N contacts / relay-listed / unverified claim), and never presents a non-secure nickname as if it were secure.

**Stack realities (Bare + Hyperswarm + Hypercore)**
- C1. **No central server.** Resolution rides HyperDHT (`mutableGet`), Hyperswarm topics, schema-sheets/Autobase rooms, and HiveRelay pins. The relay is *transport, not authority*.
- C2. **Offline-first.** Petnames and previously-resolved bindings live in a local Hyperbee and resolve with zero network. Only fresh third-party resolution needs the swarm.
- C3. **CJS under Bare + Node-testable.** Pure logic (codec, op schema, reducer, name-record decode, confusable skeleton) lives in `.cjs`/framework-free modules with no `bare-http1`/`autobase` import, exactly like `relay-record.js`, `relay-directory.js`, and `autobee-catalog-{ops,apply}.cjs`, so they unit-test under plain Node.
- C4. **No wall-clock in any deterministic fold.** Ordering is Autobase's job; revoke/rotate tiebreaks use deterministic linearization, never `Date.now()` (the catalog reducer already forbids it).
- C5. **Async resolution must not block boot or navigation.** Best-effort, fire-and-forget bootstrap (mirrors `index.js:1668`); the static fallback (baked aliases) always gives a working answer.

**Adversarial**
- C6. **Sybil pressure is structural.** BIP-39 identities are free (`crypto.randomBytes(16)`, `identity.js:149`). Influence must be bounded by *attack edges, not nodes* — distinct frontier root-pubkeys, where adding a contact is a signed ceremony (`contacts.js:123`), not a free action.
- C7. **No new always-trusted root.** The baked bootstrap set is a *soft* authority on a cold-start graph and must decay as the user's real trust graph grows; it must be multi-relay, swappable, and re-hostable by key so it can't strand or capture a user.

---

## 5. Prior-art survey

| System | Approach (name→key binding & resolution) | Pros | Cons | Relevance to us | Src |
|---|---|---|---|---|---|
| **iroh** (closest analog) | `EndpointID` = 32-byte Ed25519 pubkey (z32, 52 chars). Discovery maps ID→addrs via **pkarr** signed packets to DNS TXT (`_iroh.<z32>.<origin>`) and optionally **Mainline DHT**; records signed by the EndpointID's key, so any resolver verifies authenticity. | Self-certifying, no CA/chain; DHT+DNS dual-publish; pure key-addressing. | Solves *discovery* (key→addr) not *naming* (memorable→key) — **no human-name layer at all.** | This is the discovery layer Pear already has (HyperDHT + our relay-by-pubkey bootstrap in `relay-record.js`). pkarr's "signed mutable record under my pubkey" is the exact mental model for our name **pointer** records. Confirms naming is a *separate* layer we must add. | [1][2] |
| **GNS** (GNUnet) | Zone = (ztype, zone key, Ed25519); names resolve label-by-label, storage key `q = SHA-512(ZKDF(zkey,label))`, fetch→verify-sig→decrypt→follow delegation. Explicitly a **petname system**, no global root. | Best-in-class privacy (key blinding → unlinkable, no enumeration); rigorous **PoW/signed revocation**; **SHADOW** records for smooth rotation; monotonic expirations (anti-rollback). | Gives up global+memorable simultaneously; local-naming UX burden. | The single most directly transplantable design. Our petname = local Hyperbee `name → key`; delegation = "this curator vouches for these sub-names"; SHADOW/rotation maps onto our `name.rotate`/`name.revoke` ops. | [3] |
| **Handshake (HNS)** | Replaces the DNS **root zone** with a PoW (UTXO) blockchain; own a TLD, bind keys on-chain via **Vickrey auction** (winning bid burned). | Achieves full-triangle (global+memorable+secure) for root names. | Needs a PoW chain, coins, full/SPV node, on-chain fees — antithetical to a Bare app; only TLD-granularity. | **Cautionary contrast:** full-triangle naming costs a consensus chain we explicitly don't want. | [5] |
| **ENS + CCIP-read** | `name.eth` via on-chain registry/resolver; **CCIP-read (EIP-3668)** resolver reverts `OffchainLookup(sender,urls,callData,callback,extraData)`, client fetches a gateway and re-submits, contract verifies the gateway answer via `extraData`. | Mature, composable; CCIP-read is an elegant "verifiable off-chain resolution" pattern. | Requires Ethereum (RPC, gas, wallet); off-chain gateways add fetch + fingerprinting risk. | **CCIP-read is the key transplant:** resolver returns a *pointer to off-chain data + a way to cryptographically verify it.* Chain-free analog: a signed record points to a drive key, and the client verifies the pointer's sig against the publisher's Ed25519 key — never trust the resolver/gateway. | [4][7] |
| **IPNS + DNSLink** | IPNS name = multihash of a pubkey; signed record `{pubkey, sig, seq#, validity}` maps name→`/ipfs/<CID>`, published over DHT (48h expiry, ~4h republish). **DNSLink** = a DNS TXT record pointing a human domain at a CID/IPNS name. | IPNS self-certifying mutable-pointer is *exactly* our problem shape; DNSLink shows "borrow DNS for the memorable layer." | IPNS names aren't memorable (a hash); **gateway resolution is *trusted*** (the footgun). | **IPNS ≈ our exact need:** a signed mutable pointer (`{currentKey, seq, validity}`) under a stable key, monotonic seq#, TTL — we already have this in Hypercore/Autobee. We formalize it as the "current version of name X" pointer. | [8] |
| **Petnames / Zooko** | Conceptual: **keys** (global+secure) ↔ **petnames** (local memorable+secure, 1:1) ↔ **nicknames** (global+memorable, not unique). | The framing for the whole doc; tells you exactly which trade-off each layer makes. | Not a deployable system — a design discipline; pure-petname UX has adoption friction. | **The spine of our design.** key = drive key (truth); nickname = publisher's claimed display name ("unverified" badge); petname = user's saved alias. **Cardinal rule: never render a nickname as if it were secure.** | [11] |
| **did:web** | `did:web:example.com` → `https://example.com/.well-known/did.json` (DID doc holds keys). Trust = Web PKI / domain control. | Trivial to operate; human-readable via domains. | Fully centralized on DNS+CA; offline-hostile; not P2P. | Low fit for the *binding*, but the `/.well-known/*.json` convention is a familiar cross-attestation UX if a Pear publisher also owns a web domain. | [9] |
| **did:key / did:pkh** | The identifier **is** the key (multibase+multicodec), DID doc derived deterministically, no network. | Zero-infra, offline, self-verifying — identical philosophy to Pear keys. | **No rotation, no revocation** — any key change = a different identity. | Describes what a Pear Ed25519 identity already is. Confirms: the key layer is solved; rotation/recovery must live in a separate pointer/naming layer (our BIP-39 root + subkeys + op-log). | [10][12] |
| **Nostr NIP-05** | `bob@example.com` → GET `https://example.com/.well-known/nostr.json?name=bob` → `{"names":{"bob":"<hex pubkey>"}}`; client checks it matches the profile pubkey. | Dead-simple, no chain; explicitly *identify, not verify* — "keep `abc…def`, not `bob@bob.com`." | Trusts DNS+TLS+host; not P2P; offline-hostile. | **The template for an optional "domain-verified" badge.** A Pear publisher who owns a domain hosts `/.well-known/pear.json` mapping `name → drive key`; show a badge but keep the key as source of truth. | [13] |
| **Keybase proofs** | Username binds to keys via a signed append-only **sigchain**; identity proven by posting signed proofs to Twitter/GitHub/DNS, each self-verifiable. | Decentralized verification of existing identities; append-only signed chain ≈ our Hypercore. | Depends on third-party platforms; Keybase itself is semi-central. | **The sigchain ≈ a Hypercore/Autobee.** A Pear identity can append signed "I also control X" / "my display name is Y" / "I revoke key Z" ops to its own append-log — natively what we have. Multi-proof anti-impersonation is a good optional layer. | [14] |
| **Holepunch pear-aliases** | Hardcoded curated allow-list shipped by Holepunch: `ALIASES` maps `keet`, `runtime`, `doctor`, `pear`, `pass`, … → z32 keys, consumed by `pear-link`; plus an `EOLS` retirement list. Trust = trust Holepunch. | Zero-infra, instant, phishing-proof for first-party apps. | Doesn't scale past first-party; centralized; users can't mint names; revocation = client update. | **Pear's existing answer and our baseline to beat.** We generalize it: keep a curated/relay-served root list (cf. `BOOTSTRAP_RELAYS`), then layer petnames + publisher domain-attestations on top, never displacing the key. | [15][16] |

### Sources

1. iroh — Discovery concepts: https://docs.iroh.computer/concepts/discovery
2. iroh — README (dial-by-key, holepunch, `dns.iroh.link`): https://github.com/n0-computer/iroh
3. GNS — Technical spec LSD0001 (zone keys, ZKDF blinding, petname model, revocation, SHADOW): https://lsd.gnunet.org/lsd0001
4. EIP-3668 — CCIP Read (`OffchainLookup`, gateway, `extraData` verification): https://eips.ethereum.org/EIPS/eip-3668
5. Handshake — FAQ (root-zone decentralization, Vickrey auction, TRANSFER/FINALIZE): https://handshake.org/faq/
6. *(removed — was a non-retrievable "secondary aggregate" with no URL; every Handshake claim above is corroborated directly by the FAQ [5], verified 2026-06-17: blind Vickrey auction with the winning bid burned, PoW/UTXO chain replacing the DNS root zone. Number retained to keep [7]–[16] stable.)*
7. ENS — Protocol docs (registry/resolver, `.eth` tokens, hierarchical control): https://docs.ens.domains/learn/protocol
8. IPNS + DNSLink — IPFS docs (name = H(pubkey), signed records, seq#, "gateway resolution is trusted"): https://docs.ipfs.tech/concepts/ipns/
9. did:web — W3C-CCG method spec: https://w3c-ccg.github.io/did-method-web/
10. did:key — W3C-CCG method spec (no rotation/revocation): https://w3c-ccg.github.io/did-key-spec/
11. Petnames / Zooko's triangle — Marc Stiegler, "An Introduction to Petname Systems": http://www.skyhunter.com/marcs/petnames/IntroPetNames.html
12. did:pkh — W3C-CCG draft (deterministic, "no updates / no deletion"): https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md
13. Nostr NIP-05 — spec ("identify not verify", keep the hex pubkey): https://github.com/nostr-protocol/nips/blob/master/05.md
14. Keybase — proofs / sigchain docs: https://book.keybase.io/docs/proofs *(URL still returns HTTP 403 as of 2026-06-17; the sigchain/append-only-proof description is design-accurate from prior knowledge but remains unverified against this source — re-fetch before quoting verbatim)*
15. Holepunch pear-aliases — repo: https://github.com/holepunchto/pear-aliases
16. Holepunch pear-aliases — raw `index.js` (verbatim alias→z32 map, `EOLS`): https://raw.githubusercontent.com/holepunchto/pear-aliases/main/index.js

*Terminology note:* iroh's docs now say **EndpointID** where older material (and the task brief) say **NodeId** — same 32-byte Ed25519 pubkey.

---

## 6. Candidate approaches

### Approach A — Global multi-writer name registry (Autobee, first-claim-wins)

One canonical Autobase name registry; everyone appends `name.claim` ops; the reducer enforces first-claim-wins by deterministic order. A `pearname://` scheme resolves against it.

- **Pros:** Globally consistent answers; reuses the Autobee op-log + reducer scaffolding 1:1; "find pearmail" gives everyone the same key.
- **Cons:** **Re-creates a registrar** — exactly the centralized corner the project's own research argues against (`P2P-SEARCH-RESEARCH.md` §2.1). First-claim-wins + free Sybil identities = a squatting/Sybil land-grab with no honest defense. Inherits Autobee's open durability question (`AUTOBEE-RESEARCH.md`) and open writer-add/revoke races. Room membership is a free-for-all (`P2P-SEARCH-RESEARCH.md:521`: `join()` auto-promotes any key-holder to writer).
- **Verdict:** Rejected as the default. A *scoped* registry (one curator's namespace, e.g. a brand vouching for its own sub-names via delegation) is a fine **opt-in** instance of Approach C, but a single global one is the anti-pattern.

### Approach B — Pure local petnames + signed pointer records (no shared namespace)

Each user keeps a private Hyperbee `petname → key`. A publisher publishes an IPNS-style signed pointer record under their stable identity key (via `dht.mutablePut`) saying "my app `foo` currently lives at drive key K." Resolution = check local petnames, else resolve the publisher's pointer; squatting is structurally impossible (petnames are local).

- **Pros:** Maximum honesty about Zooko's triangle; zero squatting on petnames; offline-first; self-certifying pointers reuse `relay-record.js` exactly; no registrar.
- **Cons:** **Cold-start UX is brutal** — a brand-new user has named nothing, so `keet` resolves to nothing until they manually petname it. No discovery of *other people's* names. Doesn't generalize `pear-aliases` (the day-one need).
- **Verdict:** The right *base*, but incomplete alone — needs a discovery/endorsement layer and a bootstrap set on top.

### Approach C — Petname-first, trust-relative resolution with signed binding rooms + a decaying baked bootstrap (RECOMMENDED)

Layer the honest Zooko split end-to-end:
1. **Petname** — local private `petname → key` Hyperbee (Approach B), offline, squat-proof.
2. **Pointer** — IPNS/pkarr-style self-certifying `dht.mutableGet` record so a publisher's name can follow them across drive-key rotations (reuses `relay-record.js`).
3. **Endorsement / nickname** — signed `name` rows in schema-sheets/Autobee binding-rooms published by curators and contacts you follow; resolution ranks candidates by your trust graph (distinct frontier endorsers + coList), exactly the discovery model in `P2P-SEARCH-RESEARCH.md`.
4. **Bootstrap** — a baked + relay-served default alias set (generalizing `FEATURED_APPS`/`pear-aliases`), whose weight *decays* as your real trust graph grows.

- **Pros:** Squares the triangle without lying; reuses every primitive we ship; day-one names via bootstrap; names survive rotation via pointers; squatting/Sybil become *ranking/detection* problems, not catastrophes; the relay is index-not-authority throughout.
- **Cons:** The hard anti-Sybil half is gated on the new `IdentityBinding` + `identity.verify()` primitive; cold-start still leans on the bootstrap set (a soft authority we can only *soften*, not eliminate — see §10).
- **Verdict:** Recommended. It is the project's existing stance made concrete and is independently shippable in phases.

### Approach D — Borrowed-DNS attestation only (NIP-05 / did:web)

Publishers who own a web domain host `/.well-known/pear.json` mapping `name → drive key`; the client fetches over HTTPS and shows a "domain-verified" badge.

- **Pros:** Trivial; familiar; a strong *optional* verification signal; no chain.
- **Cons:** Centralizes on DNS+CA; offline-hostile; not P2P; only works for publishers who own a domain.
- **Verdict:** Adopt as an **optional badge layer** inside Approach C (a publisher-attestation tier), never as the primary binding.

---

## 7. Recommended design (Approach C, mapped onto our primitives)

### 7.1 Three layers, three identifiers

| Zooko layer | What it is here | Where it lives | Source of truth? |
|---|---|---|---|
| **key** | 32-byte drive key (hex/z32) | the URL itself | **Yes — always canonical** |
| **petname** | user's private alias for a key | local Hyperbee `pearbrowser-names-v1` | yes, *for that user* |
| **pointer** | publisher's "name → current key", self-certifying | HyperDHT mutable record under the publisher's name-subkey | yes (signature-verified) |
| **nickname / endorsement** | curator/contact-signed `name → key` row | schema-sheets/Autobee **binding-room** | no — a *hint*, ranked by trust |
| **bootstrap alias** | curated default (generalized `pear-aliases`) | baked `NAME_ALIASES` + relay-served `name-directory` rows | trusted only at cold-start, decaying |

### 7.2 The name-record (pointer) — reuse `relay-record.js` verbatim in shape

A publisher binds a memorable name to their *current* drive key with a signed, versioned, self-certifying DHT record, keyed by a **deterministic name-subkey** so the record survives drive-key rotation. New module `backend/name-record.js` mirrors `backend/relay-record.js`:

```
NAME_RECORD_VERSION = 1
// keyed by the publisher's NAME-subkey (see 7.4); dht.mutableGet verifies the sig.
record = {
  v: 1,
  n: "<name>",             // claimed memorable name, NFKC-normalized, ≤64 bytes
  k: "<64-hex drive key>", // current target ("rotation = new k, higher seq")
  s: <seq>,                // monotonic; higher seq supersedes (IPNS discipline)
  // optional: l: "<pear://… or hyper://… link>" instead of a bare drive key
}
```

```js
// backend/name-record.js (node-safe: b4a only, like relay-record.js)
async function resolveNameRecord (dht, nameSubPubkey) {
  if (!dht || typeof dht.mutableGet !== 'function') return null
  const key = toKey32(nameSubPubkey); if (!key) return null
  let res; try { res = await dht.mutableGet(key) } catch { return null }
  if (!res || res.value == null) return null
  return decodeNameRecord(res.value) // versioned JSON, validates n/k/s
}
```

This is the **CCIP-read discipline [4] / IPNS pointer [8]** with no chain: the resolver returns a pointer + the client verifies the signature against the publisher's key before trusting the derived key. `mutableGet` makes forgery impossible — a malicious DHT node can serve *stale* (lower-seq) but never forge a different `k` for the publisher's subkey.

### 7.3 The petname store — a local Hyperbee, no network

New `backend/names.js`, structurally a sibling of `backend/contacts.js`:

```
Data layout (Hyperbee `pearbrowser-names-v1` in the user's Corestore):
  pet!<name>      → { key, link?, addedAt, updatedAt, source: 'manual'|'pin'|'install' }
  seen!<keyHex>   → { lastNickname, lastResolvedAt }   // cache of the last claimed nickname per key
```

- `lookup(name)` / `put(name, key)` / `remove(name)` / `list()` — mirrors `contacts.js`.
- Petnames are *auto-suggested* (never auto-committed) when a user bookmarks/installs (auto-grow the graph from normal use, per C7).
- Offline-first: this answers first, before any swarm call.

### 7.4 Name-ownership keys — new domain separator in `identity.js`

Add a parallel to `getAppKeypair`:

```js
// backend/identity.js — new "pear-name-v1:" domain separator
getNameKeypair (name) {
  const subSeed = sha256(this._seed ‖ 'pear-name-v1:' ‖ nfkc(name))
  return ed25519.seed_keypair(subSeed)   // same root → same name-subkey forever, cross-device
}
```

And the **missing verify primitive** (the load-bearing prerequisite, §3.5 #5; shared with P2P-search):

```js
// backend/identity.js — ADD (sodium.crypto_sign_verify_detached, absent today)
verify (payload, signatureHex, publicKeyHex) {
  return sodium.crypto_sign_verify_detached(
    b4a.from(signatureHex, 'hex'), tag(payload), b4a.from(publicKeyHex, 'hex'))
}
```

`IdentityBinding` (one canonical record, also pinned + published to the DHT):

```
IdentityBinding = { rootPubkey, nameSubPubkey, sig_by_root }   // signed by the ROOT key
```

A verifier accepts a `name` row only if (a) its signature checks against `nameSubPubkey`, **and** (b) an `IdentityBinding` proves `nameSubPubkey` belongs to a `rootPubkey` that is **in the trust frontier** (Contacts is keyed on root pubkey — `contacts.js:12`). For **drive-ownership** (not just identity), require an in-drive attestation the verifier fetches:

```
drive.put('/.well-known/pear-name-attest',
          signForApp(driveKeyHex, `pear.name:${name}:${driveKeyHex}`, 'name'))
```

Only drive-anchored bindings earn the **`author-signed`** tier (reusing the existing `verification` enum, `sheets-catalog.js:38`). Everything else is `relay-listed`/`unverified` and rank-capped.

### 7.5 The signed binding row + binding-rooms — reuse schema-sheets / Autobee

A `name` row is the existing pattern with a new schema (copy the `apps` block in `sheets-catalog.js:24`):

```
name-binding schema (additions over apps):
  name         string (required, NFKC-normalized, ≤64)
  driveKey     ^[0-9a-f]{64}$    (driveKey OR link required — same anyOf as apps)
  link         ≤300
  binderPubkey ^[0-9a-f]{64}$    (the name-subkey that signed)
  bindingSig   hex               (signForApp over {name,driveKey,link,roomKey,schemaVersion})
  verification enum ['unverified','relay-listed','author-signed']  // reuse existing enum
```

- **Curators and contacts** publish `name` rows in their binding-rooms; you load the ones you follow (`loadCatalogSheets`/`querySheetsCatalog` verbatim).
- For a **scoped, multi-writer namespace** (a brand vouching for its own sub-names, a team curating a directory), reuse the Autobee op-log: add op types `name.claim` / `name.release` / `name.rotate` / `name.revoke` / `writer.add` alongside the existing `catalog.*` ops, and a **new reducer policy** in a sibling of `autobee-catalog-apply.cjs`:
  - `name.claim` — **first-claim-wins** *within that room's deterministic order* (NOT catalog's last-wins). `linearize()` already gives the total order; the policy just keeps the earliest claimant per name.
  - `name.rotate` — updates the target key (IPNS seq discipline; later-in-order supersedes).
  - `name.revoke` — **revoke-wins**: a revoke later in deterministic order always beats a stale claim/rotate regardless of arrival time (no wall-clock → no clock-skew resurrection; the property falls straight out of `linearize()`).
  - All ops inherit `validateOp`'s size cap + prototype-pollution scan (`autobee-catalog-ops.cjs:89`).

### 7.6 The bootstrap alias set — generalize `pear-aliases`

- `backend/constants.js`: add `NAME_ALIASES` (the baked, curated `{ name → pear://<z32> | driveKey }` map — the typed, signed-where-possible successor to the `FEATURED_APPS` literal) and a `NAME_DIRECTORY` seed (a relay-served `name-directory` room z32, parallel to `BOOTSTRAP_RELAYS`). Mirror any new `CMD_*` in `ui/boot.js`.
- The relay's index sidecar already publishes a `relay-directory` schema (`index-room-client.js:30`); add a `name-directory` schema next to it and consume it through the same `IndexRoomClient` verify-and-drop path (`listRelayDirectory` → `listNameDirectory`).
- **Decay:** bootstrap aliases resolve at a *floor* rank that drops as the user's trust graph gains edges (install/bookmark/contact auto-adds an edge), so the baked set never permanently out-ranks a name the user's own contacts endorse (C7).

### 7.7 Resolution flow (the full pipeline)

`normalizeUrl()` stays the syntactic gate (key/`hyper://`/`pear://` shortcuts). A new **async resolver** owns names. Because the swarm/DHT live in the backend, **resolution is owned by the backend** (`normalizeDriveKey`'s unknown-format `return raw` fall-through at `index.js:26` is the hook); the UI only awaits and renders provenance — this resolves gap #4 (no dual-normalizer drift). The UI's `go()` already shows `resolving …` (`shell.js:512`).

```
resolveName(input) →
  0. syntactic: is it a key / hyper:// / pear:// ?  → return as-is (no resolution).
  1. petname:   names.lookup(input)                 → HIT: return {key, prov:'your-alias'}     [offline]
  2. pointer:   if a publisher pointer is known for this name (from a binding row's binderPubkey),
                resolveNameRecord(dht, binderPubkey); verify seq + sig → {key, prov:'pointer'}
  3. endorsement: query loaded binding-rooms for `name == input`; RowVerifier drops rows failing
                  IdentityBinding + sig + frontier-membership; rank survivors by
                  socialProximity × endorserBreadth × tier × coList (deterministic, no Date.now).
                  → ranked candidates {key, prov:'endorsed by N incl. <contact>'}
  4. bootstrap: NAME_ALIASES / name-directory rows at a decaying floor rank → {key, prov:'curated'|'relay-listed'}
  5. disambiguate: if >1 surviving candidate, present a chooser with provenance chips;
                   NEVER silently pick a nickname. Cache the user's pick as a petname (step 1 next time).
```

**MITM is already defeated for the self-certifying paths** (`mutableGet` verifies the sig — `relay-record.js:6`); we extend the same discipline to every binding row (re-verify before trusting, drop on failure — the `verify(doc)` path in `relay-directory.js:34` and `index-room-client.js:126`).

### 7.8 Concrete integration points

| Seam | File:line | Change |
|---|---|---|
| **Backend nav resolution (owner)** | `backend/index.js` `normalizeDriveKey` (19) inside `CMD_NAVIGATE` (138) | Call `await resolveName()` on the fall-through; return `{ key, provenance, candidates }`. |
| **URL-bar (await + render)** | `ui/lib/keys.js` `normalizeUrl` (122); `ui/shell.js` `go` (507) | Keep `normalizeUrl` syntactic; let `go()` surface `resolving …`/provenance/chooser. |
| **New `pearname://` scheme** | `ui/lib/keys.js` `parseCatalogRef` (138) + `catalogLoadPlan` (`shell.js:123`); decode in `backend/sheets-catalog.js`/`index-room-client.js` style | Follow the `autobee://`/`hiveindex://` precedent. |
| **DHT pointer resolver (new)** | new `backend/name-record.js` mirroring `backend/relay-record.js` | `resolveNameRecord(dht, subPubkey)` via `mutableGet`; versioned decode. |
| **Petname store (new)** | new `backend/names.js` mirroring `backend/contacts.js` | local Hyperbee `pearbrowser-names-v1`. |
| **Binding registry (new, scoped)** | new `backend/name-registry-{ops,apply}.cjs` mirroring `autobee-catalog-{ops,apply}.cjs` | new op types + first-claim/revoke-wins reducer. |
| **Name-key + verify** | `backend/identity.js` `getAppKeypair`/`signForApp` (229/262) | add `getNameKeypair` (`pear-name-v1:` separator) + `verify()` + `IdentityBinding`. |
| **Signed binding URL** | `backend/contacts.js` `parseInviteURL` (123) | reuse the `pear://…?…&sig=` + Ed25519 shape for `pear://name?n=&k=&sig=`. |
| **Binding-room schema** | `backend/sheets-catalog.js` `apps` schema (24) | add `name-binding` schema; consume via `IndexRoomClient` `name-directory`. |
| **Bootstrap constants** | `backend/constants.js` near `BOOTSTRAP_RELAYS` (196); mirror `ui/boot.js`; replace `FEATURED_APPS` literal path in `ui/shell.js:33` | add `NAME_ALIASES` + `NAME_DIRECTORY` seed. |

**New RPC commands** (numeric `CMD_*` in `backend/constants.js`, mirrored in `ui/boot.js`, gated by `requireNaming()` modeled on `requireAutobee()` at `index.js:817`):

```
CMD_NAME_RESOLVE        // resolve a name → ranked {key, provenance, candidates}
CMD_NAME_PETNAME_LIST   // list local petnames
CMD_NAME_PETNAME_SET    // save a petname (also called after a disambiguation pick)
CMD_NAME_PETNAME_REMOVE
CMD_NAME_CLAIM          // publish a pointer record + (optional) binding row for a name you own
CMD_NAME_REVOKE         // publish a revoke op / supersede the pointer
CMD_NAME_LOAD_DIRECTORY // load a name-directory / binding room (parallels CMD_LOAD_CATALOG_INDEX:176)
```

A new server-side flag `experimentalNaming` (user-data setting, fail-closed like `experimentalAutobeeCatalogs`) gates all of it.

---

## 8. Threat model & failure modes

| Threat | Likelihood | Impact | Mitigation (grounded in our stack) |
|---|---|---|---|
| **Name squatting** — claim `pearmail`, brands en masse before legit owners | High (zero-cost in any open namespace) | Med — degrades discovery, enables phishing setups; the 32-byte key stays canonical so it can't *steal* an app | **No global first-come registry** (Approach A rejected). Names are signed rows in per-curator binding-rooms; resolution is trust-relative, so a squatter's row is invisible until a frontier member endorses it. **coList** (a key independently bound under the same name by mutually-trusted curators) is the strong honest signal. Squatting a name in a room nobody trusts = reach 0. |
| **Sybil / endorser-count forgery** — mint thousands of free identities to fake "many endorsers" | High (`crypto.randomBytes(16)`, `identity.js:149`) | High if endorser-count is trusted naively | **Bound influence by attack edges, not nodes.** `endorserBreadth` counts *distinct frontier root-pubkeys*; Contacts is keyed on root (`contacts.js:12`) and adding a contact is a signed QR/invite ceremony (`parseInviteURL`, `contacts.js:123`), not free. A Sybil army behind one honest edge can't manufacture breadth. Per-writer drop-wholesale: remove one trust edge → all that writer's name rows leave the read-time union. |
| **MITM on resolution** — DHT/relay returns a forged `name → key` | Med (anyone runs a node) | **Critical** | **Self-certifying resolution.** Pointer records are `dht.mutableGet` — the sig is verified against the key, so a malicious node serves *stale* but never *forged* (`relay-record.js:6–9`). Every binding row is signed and re-verified client-side before the key is trusted (`verify(doc)` drop path, `relay-directory.js:34`, `index-room-client.js:126`). Relay/DHT = transport, not authority. |
| **Identity-binding forgery** — `signForApp` subkey has no cryptographic link to the drive key or root pubkey | High (no binding exists today) | **Critical** — every trust/anti-squat claim is hollow until fixed | **`IdentityBinding` + `identity.verify()`** (§7.4) — the one mandatory new primitive. `{rootPubkey, nameSubPubkey, sig_by_root}` published to the DHT (`mutablePut`, self-certifying) + index; `verify()` via `sodium.crypto_sign_verify_detached` (absent today). Drive ownership requires the in-drive `/.well-known/pear-name-attest`. **Until it ships, treat all third-party name claims as rank-capped `unverified` hints.** |
| **Key rotation / lost-device** — user rotates root (`identity.rotate`, `restoreFromMnemonic`, `identity.js:314–329`) and orphans every name | Med→High (rotation/restore is first-class) | High — names silently break or the freed name gets re-squatted | **Signed succession.** Publish a `name.rotate`/succession op signed by the *old* root delegating to the *new* root pubkey; resolvers follow the chain (deterministic op-log + reducer, `autobee-catalog-apply.cjs`). Pointer records use the IPNS seq discipline. Contacts store a *succession pointer*, not a frozen pubkey. **Honest gap:** root-key *compromise* has no recovery — §10. |
| **Revocation staleness / resurrection** — a late `claim`/`add-writer` op resurrects a killed binding | Med (inherent to async replication) | High | **Deterministic revoke-wins.** Autobase linearizes all ops into one total order shared by every replica (`linearize()` on `(seq, writer, stableHash)`, `autobee-catalog-apply.cjs:26`); a revoke later in that order always wins regardless of arrival time. No wall-clock → no clock-skew resurrection. Ops are versioned + size-capped + pollution-screened before append (`validateOp`, `autobee-catalog-ops.cjs:89`). |
| **Homograph / look-alike names** — `раypal` (Cyrillic), zero-width chars | High (cheap, classic) | Med — phishing | **NFKC normalize + confusable-skeleton** at the tokenize chokepoint (pure `.cjs`, Node-testable); render **provenance chips** ("endorsed by 3 contacts incl. Maya") so the memorable corner is backed by a trust statement, not glyphs. The 32-byte key stays canonical, so a look-alike can't impersonate the *key*. |
| **Censorship / shadow-ban** — a relay/curator withholds a name (omission, not forgery) | Med | Med | **Multi-relay, swappable, re-hostable-by-key.** Directory bootstrapped from multiple DHT-resolved pubkeys (`resolveBootstrapRelays`, `relay-record.js:60`); the seed is always kept so a bad directory can't strand you (`relay-client.js:327`). Any binding-room is `hiveRelay.seed(key)`-pinnable and re-servable by key → censorship needs *all* hosts to collude. Detection of omission is the residual gap (§10). |
| **Split / eclipse registry** — divergent namespace views to different users | Med | High — partition phishing | **Content-addressed per-row verification + cross-source check.** Resolve from ≥2 independent sources and diff; compare each source's Autobase/Hyperbee head/`treeLength` against the signed manifest — a regression or epoch mismatch docks reputation. |
| **Open-room write-amplification** — Sybil floods a binding-room with validly-signed junk | Med | Med | Don't trust `memberkey` (room membership is open — `P2P-SEARCH:521`). Rank only by out-of-band attestation signed by a *frontier* key (IdentityBinding); per-writer quotas via existing swarm-grant budgets; **fix the `MAX_SHEETS_ROWS` export bug** (imported-but-unexported → `undefined`, bounds nothing) before any read path ships. |
| **Resolver lies by default (the IPNS footgun)** | Med | High | Never trust an unverified resolver/gateway. Every code path that returns a key must have re-verified a signature (pointer or row) against the publisher's Ed25519 key — the CCIP-read discipline [4]. |

---

## 9. Phased rollout plan

Each phase is independently shippable; risky phases are flag-gated (`experimentalNaming`, fail-closed) and lazily required so a disabled feature never affects boot — exactly the Autobee posture (`index.js:810`, `catalog-manager.js:259`).

- **Phase 0 — Pure foundations (no flag, no network).** Add `backend/name-record.js` (decode/`resolveNameRecord`, mirroring `relay-record.js`), a pure NFKC + confusable-skeleton normalizer (`.cjs`), and the `name-binding` schema constant. Unit tests under Node (the codec/normalizer/decode are framework-free). **Fix the `MAX_SHEETS_ROWS` export bug** as part of this slice. *Ships nothing user-visible; de-risks everything.*

- **Phase 1 — Petnames + bootstrap aliases (flagged).** Add `backend/names.js` (local Hyperbee), `CMD_NAME_PETNAME_*`, and `NAME_ALIASES` (typed successor to `FEATURED_APPS`). Wire `resolveName` steps 0–1 + 4 (petname + decaying bootstrap) into the `normalizeDriveKey` fall-through; `go()` renders provenance. *Day-one win: `keet` resolves; users can save private aliases; no Sybil surface yet (no third-party trust).* Replaces the `FEATURED_APPS` literal path.

- **Phase 2 — IdentityBinding + `identity.verify()` (the anti-Sybil unblock, flagged).** Add `getNameKeypair` (`pear-name-v1:`), `verify()` (`crypto_sign_verify_detached`), and the `IdentityBinding` record published to `meta!binding` + DHT (`mutablePut`). This is the **mandatory prerequisite** for any third-party trust; it is shared with the P2P-search work (`P2P-SEARCH-RESEARCH.md:349`). *Ships the verifier, not yet the rooms.*

- **Phase 3 — Pointer publishing + claim/revoke (flagged).** `CMD_NAME_CLAIM`/`CMD_NAME_REVOKE`: a publisher publishes a signed pointer (`dht.mutablePut`) + the in-drive `/.well-known/pear-name-attest` for `author-signed` tier. Add `resolveName` step 2. *Names now survive drive-key rotation; first publishers can claim.*

- **Phase 4 — Endorsement rooms + trust-relative ranking (flagged).** `name-binding` rooms loaded via the existing sheets/index path; a `RowVerifier` (IdentityBinding + sig + frontier membership) drops bad rows; deterministic ranker (socialProximity × endorserBreadth × tier × coList, no `Date.now`); the disambiguation chooser. Add `resolveName` step 3. *"find pearmail" resolves over your trust graph; squatting becomes a ranking problem.*

- **Phase 5 — Scoped multi-writer namespaces (flagged).** `backend/name-registry-{ops,apply}.cjs` with first-claim/revoke-wins reducer + `writer.add`, on Autobee; a `pearname://` scheme. *Brands/teams can curate delegated sub-namespaces.* **Gated on resolving Autobee durability over HiveRelay** (`AUTOBEE-RESEARCH.md` "Do Not Do Yet").

- **Phase 6 — Optional domain attestation (NIP-05 layer).** Publishers who own a domain host `/.well-known/pear.json`; a fetch adds a "domain-verified" badge — never the primary binding. *Defer; nice-to-have cross-attestation.*

---

## 10. Open questions

1. **Root-key compromise & social recovery.** Per-app/name subkeys rotate via signed succession, but the **root** key anchors the whole personal namespace and the Contacts graph and has *no recovery and no revocation* if stolen (the BIP-39 phrase *is* the key, `identity.js:111`). M-of-N social recovery fits a graph keyed on root pubkeys, but designing the recovery quorum so it isn't itself a Sybil/coercion vector — and so a thief's "rotation" *loses* to the legit owner's — is unsolved. With no timestamp authority (no wall-clock in the fold, by design), the tiebreak between *competing* successions after a compromise is genuinely open.

2. **Zooko cold-start: the bootstrap set is a soft authority.** A brand-new user has an empty trust graph, so every name resolves through the baked-in bootstrap aliases/relays — a soft central naming authority in a decentralized costume (the same open TBD as the canonical bootstrap relay z32, `HIVERELAY-BACKBONE-RESPONSE` §5 item 1). Multi-relay swappable bootstrap, auto-adding a trust edge on every install/bookmark/contact, and decaying bootstrap weight as the graph grows all *soften* it but don't eliminate it. A principled **non-ossifying bootstrap** is the deepest unsolved tension — inherent to Zooko's triangle, not a stack limitation.

3. **Detecting omission / split (eclipse) — completeness, not just authenticity.** Every primitive proves a served binding is *authentic* (signatures self-certify); **none proves the set is *complete***. A captured relay or eclipsing DHT set can serve a consistent, fully-valid, but *partial* namespace — your `pearmail` and mine differ and neither can tell. `treeLength`/head comparison and cross-checking ≥2 sources raise the bar; per-epoch signed Bloom/MPHF commitments make omission *sample-detectable* — but a cheap, robust anti-omission proof against a determined captured backbone is unsolved (the accountability ceiling of "index, not authority").

4. **Pointer-record durability & republish cadence.** HyperDHT mutable records expire; IPNS republishes ~every 4h. Who republishes a publisher's name pointer when they're offline — a HiveRelay pin, the publisher's other devices, or a TTL the UI surfaces as "stale"? This inherits the open Autobee/HiveRelay durability question.

5. **Petname vs. nickname UX boundary.** How aggressively should the chooser auto-promote a disambiguation pick into a petname, and how is a *changed* nickname (publisher renamed their app) surfaced without enabling a rug-pull? The `seen!<keyHex>` cache (§7.3) flags drift, but the UX of "this name now points somewhere new" needs design.

6. **Does a `pearname://` scheme belong at all, or only bare-word resolution?** A scheme makes intent explicit (and matches the `autobee://`/`hiveindex://` precedent), but bare-word resolution in the URL bar is the actual user need. Likely both, with the scheme as the canonical persisted form.

---

## 11. Sources

All external claims above are cited inline by bracketed number to the **Sources** list in §5 (entries 1–16). Internal grounding is cited inline by `file:line` against the `feat/phase5-relay-directory` tree; the load-bearing repo references are:

- `ui/lib/keys.js` — z32↔hex codec, `normalizeUrl` (122), `parseCatalogRef` (138)
- `ui/shell.js` — `FEATURED_APPS`/pear-aliases comment (18–94), `DEFAULT_URL` (109), `DEFAULT_CATALOG_KEY` (117), `catalogLoadPlan` (123), `go` (507)
- `backend/index.js` — `normalizeDriveKey` (19), `CMD_NAVIGATE` (138), `requireAutobee`/`isAutobeeEnabled` (810–821), DHT bootstrap (1668–1681)
- `backend/identity.js` — root + `getAppKeypair` (229), `signForApp` (262); **no `verify()`**
- `backend/relay-record.js` — `resolveRelayRecord` (39), `resolveBootstrapRelays` (60), self-certifying `mutableGet`
- `backend/relay-client.js` — `bootstrapFromDht` (346), `listRelays` (309)
- `backend/relay-directory.js` — `mergeRelayDirectory` (24, index-not-authority verify-and-drop)
- `backend/index-room-client.js` — `IndexRoomClient` (61), `listRelayDirectory` (120), `verification: 'relay-listed'` (56), `decodeIndexLink` (35)
- `backend/contacts.js` — `lookup` (64), `add` (71), `parseInviteURL` (123, signed binding ceremony)
- `backend/sheets-catalog.js` — `apps` schema (24–43) + `verification` enum (38), `decodeSheetsLink` (49)
- `backend/catalog-manager.js` — autobee lifecycle `_autobeeManagerClass`/`_ensureAutobeeManager` (259–294), `_formatAutobee` (387)
- `backend/autobee-catalog-{ops,apply,manager}.cjs` — op schema/`validateOp` (ops:89), `linearize`/`applyView` (apply:26/35), Autobase wrap (manager:32–53)
- `backend/constants.js` — `CMD_*` block + `BOOTSTRAP_RELAYS` (196), `ANONGPT_DRIVE_KEY` (181); mirror in `ui/boot.js`
- `docs/AUTOBEE-RESEARCH.md`, `docs/P2P-SEARCH-RESEARCH.md` (§2.1, §6.4, §8, §11), `docs/HIVERELAY-BACKBONE-RESPONSE.md`
