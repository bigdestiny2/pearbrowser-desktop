# Privacy & Anonymity Routing for Pear / Hyperswarm

> Status: **Design / RFC** · Stack: Holepunch / Pear — Bare (CommonJS) + Chromium · Date: 2026-06-17
> Branch grounded: `feat/phase5-relay-directory`
> Reference patterns: [`../AUTOBEE-RESEARCH.md`](../AUTOBEE-RESEARCH.md) · `backend/autobee-catalog-{ops,apply,manager}.cjs` · `backend/relay-record.js` · `backend/relay-directory.js` · `backend/hyper-proxy.js` · `backend/swarm-grants.js` · `backend/identity.js`

## 1. Title & executive summary

**Privacy & Anonymity Routing for Pear / Hyperswarm** is a design for adding *metadata privacy* — unlinkability of who-talks-to-whom, what-is-fetched, and from-which-IP — to a Holepunch/Pear stack that today provides *authenticity and liveness* but **no anonymity whatsoever**. Every user-visible feature in PearBrowser rides one transport: a single shared `Hyperswarm` over the default clearnet `HyperDHT` (`backend/index.js:1536`, `swarm = new Hyperswarm()` with no `firewall`, no `relayThrough`, no custom `bootstrap`), plus an optional default-on **HiveRelay** HTTP gateway fast-path (`backend/relay-client.js` + `backend/hyper-proxy.js:_doHybridFetch:671`). That transport announces the peer's `(IP, port)` to the DHT by construction — that is how NAT holepunching works — so any peer who joins a topic learns your IP, and the HiveRelay gateway sees the `{drive key, path, timing, source IP}` of nearly every navigation because the proxy fires a relay fetch and a P2P fetch in parallel via `Promise.any` on every cache-miss. There is no Tor, onion routing, mixnet, SOCKS, cover traffic, or per-session topic rotation anywhere in the tree (grep-confirmed: zero `tor|onion|socks|mixnet|sphinx|i2p|relayThrough` hits across `backend/`). This is acceptable for a liveness-first browser of *public* content and becomes a real problem the moment payments, social identity, or names ride the same wire. This doc threat-models the transport, surveys prior art (Tor, I2P, Nym/Loopix, Dandelion++, Sphinx, HOPR, Oblivious HTTP, PIR, and the in-house pear-pos Tor-relay proposal), and proposes a **four-layer, cheapest-high-value-first roadmap**: Layer 0 metadata-minimizing defaults that ship now at ~zero latency cost (flip the relay race P2P-first, encrypt what the relay pins via the proven `browser-state-sync.cjs` encrypted-Autobase pattern, rotate discovery topics per session, derive ephemeral per-request keys), then a firewall + self-certifying **routing-node directory** (a verbatim clone of the `relay-record.js` signed-`mutableGet` pattern), then opt-in single-hop and multi-hop onion routing gated honestly on an anonymity-set analysis. The governing constraint, stated everywhere: **Pear gives us self-certifying authenticity nearly for free and unlinkability nowhere**, and low-latency anonymity is anonymity-set-bound — so the cheap layers are the default (to grow the set) and the expensive layers are opt-in, latency-gated, scoped to high-stakes paths, and **never claimed to be Tor-equivalent**.

## 2. Problem & why it matters for the Pear/PearBrowser ecosystem

Pear's thesis is local-first, serverless, peer-to-peer software. The transport that delivers that thesis was designed to answer "can two peers behind NATs reach each other and stay live," **not** "can a passive observer learn who is talking to whom." The result is a transport that is adversarial-network-naive by design, and three forces make that a *now* problem rather than a someday one.

1. **The leaks are in shipped defaults, not hypotheticals.** Vanilla `new Hyperswarm()` exposes your IP to every co-swarming peer; the parallel relay race exposes every fetch to the gateway; stable topics are long-lived correlation handles. All three are live on this branch (§3).
2. **Higher-stakes payloads are arriving on the same wire.** A browser of public Hyperdrives leaks "this IP read this public blog" — low stakes. The moment a payment, a social identity, or a human-readable name binds to your root Ed25519 key (BIP-39 root + per-app subkeys), the *same* transport leaks "this IP paid this merchant," "this IP is this identity," "this IP looked up this name." A merchant's stable pubkey + the DHT topic their point-of-sale announces on + the HiveRelay pin pattern of their receipt ledger jointly **cluster their entire customer base by IP**. A payments-bearing P2P app whose transport clusters customers by IP is a de-anonymization engine wearing a privacy logo — strategically worse than no privacy claim, because users assume P2P implies private.
3. **Anonymity has a network effect and a ratchet.** An anonymity set of one is no anonymity; mitigations only matter if many users share them *before* a body of linkable history accumulates. Retrofitting unlinkability onto a user who already published a year of IP-linked receipts recovers nothing for that history. The cheap layers must ship early precisely because their value compounds.

The honest framing carried throughout: authenticity is a *solved corner* in this stack (`dht.mutableGet` signature-verifies records — `relay-record.js:6-9`), while unlinkability is the *entire job* of this track, and its hardest parts (a low-latency mixnet with a real anonymity set; exit-node legal exposure) are bounded-risk, not solved.

## 3. Current state in our codebase (grounded)

Every path below was read on `feat/phase5-relay-directory`.

### 3.1 The transport, as shipped

- **One shared vanilla Hyperswarm, no privacy options.** `backend/index.js:1536` — `swarm = new Hyperswarm()` with **no `firewall`, no `relayThrough`, no custom `bootstrap`, no `keyPair` override**. This single process-wide swarm is shared by every manager (`CatalogManager`, `AppManager`, `SiteManager`, `PearBridge`, `UserData`, `SwarmGrants`, `SwarmBridge`, the HiveRelay client). HyperDHT announces `(topic → {ip, port})` so peers can holepunch, so **every co-swarming peer learns your IP**. This is correct for reachability and is the single largest IP-exposure surface.
- **The connection handler discards peer metadata and applies no policy.** `backend/index.js:1539` — `swarm.on('connection', (conn) => …)` calls `store.replicate(conn)` for **every** peer that dials. `peerInfo` is not even destructured; there is no `firewall` predicate and no per-peer allow-list — no hook where anonymity/peer-policy enforcement could attach today.
- **A second independent swarm leaks separately.** `backend/anongpt-buyer.js:135` constructs a *fresh* `new Hyperswarm()` per inference call (`swarm.join(sellerKey, { client: true, server: false })`). Any anonymity layer must cover **both** swarms or they leak independently.
- **The relay race leaks fetch metadata by default.** `backend/hyper-proxy.js:_doHybridFetch:671` starts a relay fetch (`this._relay.fetch(keyHex, resolvedPath)`, GET `<relay>/v1/hyper/<key><path>` — `relay-client.js:133`) and a P2P Hyperdrive fetch **concurrently**, resolved by `Promise.any` (`:686`). The relay leg fires on essentially every navigation whenever a relay is configured, so the HiveRelay gateway sees `{drive key, path, time, source IP}` for nearly every page — **even when P2P would have answered**. This relay *terminates plaintext HTTP*: it sees the cleartext drive key, path, and the client's real source IP. It is a CDN-style accelerator + offline-availability pin — the opposite of anonymizing.
- **HiveRelay is default-on and central.** Defaults are `https://relay-us.p2phiverelay.xyz` and `https://relay-sg.p2phiverelay.xyz` (`backend/index.js:1648-1651`); the backbone client (`p2p-hiverelay-client`, dynamically imported at `index.js:1576`) shares the main swarm and pins/seeds content. A relay that pins your ledger *and* answers your fetches is one party with a near-complete metadata view. The backbone client's internal NAT-traversal/circuit-relay behavior is not visible in this repo and needs separate review before being trusted in an anonymity story (gap).
- **No anonymity overlay of any kind.** Grep across `backend/` for `tor|onion|socks|mixnet|circuit|cover|relayThrough|sphinx|garlic|padding` → **zero hits** (substring false-positives like `Corestore`/`directory`/`constructor` excluded). The proxy dials drives directly; there is no routing indirection.
- **No feed-level encryption by default.** Hyperdrives are served in the clear over the proxy; only Hyperswarm's Noise handshake protects transit. Encrypted Autobase *is* available and *is* used for paired-device sync (`browser-state-sync.cjs`), but it is not the default for served content.

### 3.2 Primitives we *do* have (the reuse budget)

- **Self-certifying signed records** — `backend/relay-record.js`. `resolveRelayRecord(dht, pubkey)` calls `dht.mutableGet(key)`, which **verifies the Ed25519 signature** against the key, so a resolved record is self-certifying: a malicious DHT node can serve stale data but **never forge** (`:6-9`, `:39-48`). `resolveBootstrapRelays` (`:60-78`) lets a seed be as little as `{ pubkey }` and resolve its own `{ gatewayUrl, indexRoom }`. **A routing-node directory reuses this verbatim.**
- **Verify-and-drop directory ingest** — `backend/relay-directory.js:mergeRelayDirectory` + `backend/index-room-client.js`. "The room is an index, not an authority": each discovered row carries its full signed capability `doc`; when a `verify(doc)` function is supplied, rows that fail verification are **dropped** (`relay-directory.js:34-39`, `index-room-client.js:126-127`). Today `verify` is *optional*; for privacy mode it becomes *mandatory*.
- **Per-app deterministic subkeys** — `backend/identity.js`. BIP-39 root + per-app domain-separated subkeys already give **uncorrelated-per-app pubkeys**; the same derivation generalizes to **per-session / per-invoice ephemeral routing keys** with no new crypto.
- **Consent-gated, per-topic swarm grants** — `backend/swarm-grants.js` + `backend/swarm-bridge.js`. `SwarmBridge._resolveTopic` (`:182-233`) classifies a topic into Tier A (deterministic `H("pear.swarm.v1:" + driveKeyHex + subtopic)`, no prompt), Tier B (persisted grant), or Tier C (arbitrary topic → consent sheet via `EVT_SWARM_REQUEST` / `CMD_SWARM_RESOLVE`, persisted in the `SwarmGrants` Hyperbee). The consent UI already warns *"This will reveal your IP to those peers"* (`docs/SWARM-V1.md` §4) — but offers **no remedy**. This is the natural chokepoint for a "rotate this topic per session" policy and a "route this topic anonymously" toggle.
- **Multi-relay, swappable bootstrap** — `relay-record.js:resolveBootstrapRelays` + `constants.js:196` `BOOTSTRAP_RELAYS`. The mechanism that lets us **spread the choke point across N relays** instead of one.
- **Encrypted Autobase precedent** — `backend/browser-state-sync.cjs`: `encryptionKey` handed to the base so only paired devices that hold the key can read; the discovery key is public but block contents are ciphertext. The pattern to generalize for "the relay pins ciphertext it cannot read."
- **Autobee op-log + deterministic reducer** — `backend/autobee-catalog-{ops,apply,manager}.cjs`. Schema-versioned ops (`SCHEMA_VERSION`, `validateOp` with size/prototype-pollution guards — `autobee-catalog-ops.cjs:14-121`), a **wall-clock-free** deterministic reducer (`linearize`/`applyView` ordered by Autobase `(writer, seq)` tags, never `Date.now()` — `autobee-catalog-apply.cjs:26-32`). This pattern is reused here for the **routing-node directory state** (which relays exist, their advertised capabilities), never for routing payloads.
- **Fail-closed per-drive privacy contract** — `backend/hyper-proxy.js:_validateAnongptManifest:288-326`. A drive only receives the privileged `window.pear.anongpt` API if its `manifest.json` declares `privacy.storesPrompts===false`, `privacy.remoteHttpInference==='forbidden'`, `privacy.requiresLocalRuntime===true` (a missing field is a *failed* check, not a default-allow). The established template for a fail-closed "requires anonymous transport" manifest claim.
- **Existing relay config plumbing** — `CMD_GET_RELAYS=40 / CMD_SET_RELAYS=41 / CMD_SET_RELAY_ENABLED=42` (`constants.js:49-51`), dispatched in `index.js:776-796`, persisted in `pearbrowser-state.json` (`index.js:1652`). The boolean-`enabled` pattern to mirror for an anonymity-mode flag.

### 3.3 Honest gap list (anonymity does not exist today)

1. **IP exposed to every co-swarming peer** (vanilla Hyperswarm, no firewall/`relayThrough`) — `index.js:1536`, ×2 with `anongpt-buyer.js:135`.
2. **The relay sees ~every fetch** (parallel race, default-on relay terminating plaintext HTTP) and pins ledgers — a metadata superset (`hyper-proxy.js:686`, `relay-client.js:133`).
3. **Topics are stable** — drive-derived Tier-A topics, contact/sync topics, name rooms — none rotate per session, so DHT announces are long-lived correlation handles.
4. **No cover traffic, no padding** — request timing and response volume are distinctive (a small invoice vs a 4 KB page) and observable.
5. **No onion/mixnet layer** — sender↔receiver is one hop; the receiver and anyone seeding sees the sender's IP.
6. **Keys reused across contexts** — without per-invoice/per-session ephemeral keys, a stable pubkey is a cross-session linker.
7. **`peerInfo` dropped, no policy hook** — `index.js:1539` ignores `peerInfo` and uses no `firewall`; nowhere for allow-list/anonymity enforcement to attach.
8. **Two independent swarms** — must both be wrapped or they leak independently.
9. **HiveRelay backbone is a black box** — `p2p-hiverelay-client` internals/metadata exposure unreviewed in this repo.

## 4. Requirements & constraints

**Functional requirements**

- **R1 — Minimize what any single party sees.** No single actor should hold a full `{who, what, when, where}` tuple, starting with the relay and the swarm peer.
- **R2 — Per-session / per-invoice unlinkability.** Two payments to one merchant, or two events from one identity, must not be trivially correlatable by transport metadata.
- **R3 — Spread the choke point.** No single relay is on the path of all of a user's (or a merchant's) traffic; the pin-relay, the fetch-relay, and any route-hop should be selectable as distinct parties.
- **R4 — Honest provenance + honest privacy UX.** Surface what each mode does and does *not* hide; never render "anonymous" for a mode that only hides content from the relay but not IP from peers; surface the anonymity-set size.
- **R5 — Opt-in, latency-tiered.** A fast default (best-effort unlinkability, ~zero latency cost) and a slow high-anonymity mode (overlay routing, accepted latency), user-selectable per context.

**Stack realities & constraints**

- **C1 — Latency is the product.** Pear's pitch is local-first, instant. A Tor-style 3-hop telescoping circuit adds hundreds of milliseconds and would gut browsing UX. **The latency↔anonymity tradeoff is the governing constraint** (§6, §7): cheap layers must be ~free; expensive layers must be opt-in and scoped to high-stakes, latency-tolerant paths (settlement, publish, name lookup), never the default browse path.
- **C2 — Bare/CommonJS, no heavy native deps.** A Rust/C mixnet daemon cannot bind into Bare; `fetch`, Node `http`, `child_process.spawn('tor')`, `socks`, and `socks-proxy-agent` do not exist in Bare (the codebase uses `bare-http1`, `bare-crypto`, `b4a`). An overlay must be **JS-over-Hyperswarm relay-through hops we build**, or **IPC to an external process** — the pear-pos Node-20/Docker design is a reference, not a drop-in.
- **C3 — Offline-first, no central server, no always-on authority.** The overlay's relays must be a self-certifying, social-graph-gated, multi-relay directory (reuse `relay-record.js` + verify-and-drop) — a hardcoded relay set *is* the choke point we are removing.
- **C4 — Anonymity-set honesty.** A mitigation is only as strong as the crowd that shares it. We **must not claim** a property we cannot back with a set-size argument; "unlinkable" with 3 users is theater.
- **C5 — Self-certifying, wall-clock-free directory.** Routing descriptors are signed + DHT-self-certifying; any directory reducer uses Autobase linearization, never `Date.now()` (the catalog-reducer discipline — `autobee-catalog-apply.cjs:7-11`).
- **C6 — Sybil is free; relay capacity is the only scarce thing.** BIP-39 identities and DHT nodes mint for free. Relay selection must be **social-graph-gated** (bound by attack *edges*, not node *count* — the SybilLimit/Constellation pattern), not first-come.
- **C7 — The global passive adversary is out of scope.** No low-latency system defends against an adversary who observes the whole network and does end-to-end timing correlation. We defend against a *partial* passive observer (a relay, a swarm peer, an ISP on one leg, a curious merchant) and raise correlation cost. This ceiling is stated loudly in the UX (R4).

## 5. Prior-art survey

**Anchoring constraint (read first).** Hyperswarm/HyperDHT is *the opposite of an anonymity network*: a peer joins a topic by **announcing its `(IP, port)` to the DHT so others can holepunch**, so any observer learns *both the peer's IP and the topic it advertises* — and Noise encrypts the *payload*, never the *metadata* (`index.js:1536` is exactly this, by construction). HyperDHT's own privacy-preservation issues are open upstream (holepunchto/hyperdht #2, #50). **The consequence:** we cannot "configure on" anonymity inside HyperDHT — every property below is *additive* (an overlay we build over the swarm, or a tunnel through an external network). This is why §7 is structured as layers *bolted onto* the swarm, not switches flipped inside it.

| System | Approach (mechanism) | Pros | Cons | Relevance to us | Src |
|---|---|---|---|---|---|
| **Tor** (onion routing) | 3-hop telescoping circuits; fixed 512-byte cells; no inter-relay mixing → low latency by design. Trust rooted in signed directory authorities + bandwidth measurement; guard rotation bounds exposure. | Mature, large real anonymity set; low-latency enough for browsing; the reference onion model. | **Explicitly does NOT defend against a global passive adversary** doing end-to-end timing correlation [1]; weak Sybil resistance vs a wealthy adversary; **highest exit-node liability of any system** — the exit IP is the apparent source, so the operator gets DMCA/abuse/police contact [2]. TCP/stream-oriented, a poor fit for UDP-centric HyperDHT. | Reference model for the §7 onion wrapper (L2). Its GPA gap *is* the ceiling we state in C7. Its exit-liability problem is **the load-bearing legal risk (FM10)**: if Pear ever egresses to clearnet, that liability transfers to the egress operator. | [1][2] |
| **I2P** (garlic routing) | Fully P2P; unidirectional tunnels (4 per round-trip); garlic-bundles multiple messages; Kademlia floodfill netDb, **no directory authority**; **no exit by default** (internal eepsites only). | Architecturally closest to Pear's worldview (self-organizing DHT, no central authority); **no-exit-by-default sharply limits operator liability**. | netDb is more Eclipse-prone than vanilla Kademlia; partial-keyspace Sybil is the top documented threat [4]; higher round-trip latency than Tor. | Two transplantable lessons: (a) its **no-exit-by-default posture is the safer model for a P2P app store** — keep traffic Pear-internal (FM10's mitigation); (b) its floodfill Sybil/Eclipse failures are a cautionary tale for the routing-node directory's "index, not authority" posture (FM8). | [3][4] |
| **Nym / Loopix** (Poisson mixnet, Sphinx) | Stratified mixnet; each hop adds an independent exponential delay (Poisson mix, no synchronized rounds); loop + drop cover traffic resists a global passive adversary *and* active (n−1) attacks. Nym adds a staked-token reputation layer. | **Strongest unlinkability target** vs a GPA; relay compute <1.5 ms, ~300 msg/s; Sphinx maps cleanly onto a route-descriptor directory. | **Seconds of latency** (tunable) → fine for settlement/publish, **unacceptable for interactive browsing** (violates C1); Loopix leaves Sybil out of scope; Nym closes it only with a token economy we do not want. ⚠ Nym's ~800 ms e2e figure is from vendor docs, not the peer-reviewed paper (Loopix's "order of seconds" *is* peer-reviewed). | The gold-standard model for the §7 "unlinkable" tier (L2 + padding) that would discharge transaction-graph correlation against a global observer. Confirms the §6 verdict: the mixnet tax is payable only on latency-tolerant high-stakes paths, never the browse default. Nym's staking is the thing we *replace* with the social-graph Sybil gate (C6). | [5][6][7] |
| **Dandelion++** (stem → fluff) | Anti-deanonymization for broadcast: relay along a random single-relay **stem** (≈4-regular anonymity graph) *before* normal **fluff** diffusion; ~epoch-rotated, pseudorandom forwarding. | **Near-zero latency overhead, mainnet-proven on Bitcoin**; formal precision/recall bounds; needs no new crypto. | Bounds adversary precision/recall, not perfect anonymity; defends source-IP-of-a-broadcast, not who-fetches-what. | **The cheapest win, directly applicable**: instead of announcing a topic / broadcasting a settlement to the DHT immediately, relay it through a short random stem of trusted peers, then diffuse. The closest analog to the DHT-announce pattern (FM9); a candidate to fold into **L0/L1**. | [8] |
| **Sphinx** (packet format) | Fixed-size packets; per-hop blinded ephemeral keys; HMAC integrity; hides path length & relay position; **SURB** reply blocks for anonymous replies. | The on-the-wire format that stops size/position/key correlation across hops; SURBs solve anonymous reply without a return path. | A packet format, not a network — no anonymity on its own. | The wire format the §7 onion/mixnet wrapper should **adopt rather than invent.** Fixed-size + ephemeral-key blinding is exactly what stops size/key correlation across hops (FM7); **SURBs** are the clean mechanism for an *anonymous per-invoice response* without exposing a return path. | [9] |
| **HOPR** (incentivized mixnet) | Sphinx mixnet + staked relays + probabilistic-payment tickets; **proof-of-relay** — a node earns its ticket only *after* relaying to the next hop. | Directly answers "how do you stop a routing node from black-holing traffic and still claim to route"; economic Sybil cost via stake. | Mixnet-class latency + per-hop payment-channel overhead; the incentive layer is a blockchain we do not want. ⚠ specifics are vendor-grade, not peer-reviewed. | Closest prior art to a Pear relay-selection-and-reward model. **Proof-of-relay** is the conceptual answer to FM8's black-hole/availability problem — adapt the *idea* (verifiable forwarding) onto a **social-graph-gated** directory (C6) instead of a token; informs open question §10.2. | [10] |
| **Oblivious HTTP (RFC 9458)** + **oDoH (RFC 9230)** | Client → relay → gateway split; HPKE-encrypted request body. **Relay sees IP not content; gateway sees content not IP.** One extra hop. Firefox uses it for address-bar queries + oDoH. | **The pragmatic 80/20**: request↔identity unlinkability for single request/response at ~1 hop, far cheaper than onion/mixnet; matches "relay = index, not authority." | **Security hinges entirely on relay ≠ gateway non-collusion** — collusion or co-observation collapses all privacy; no traffic-analysis defense. ⚠ RFC 9230 is an experimental Independent Submission, not IETF-endorsed. | The model for **L1 split-trust (§7.2)**: HiveRelay-as-relay + a *separate, non-colluding* gateway gives request-unlinkability for **single-request settlement broadcast and name lookups**. The social-graph directory hardens the non-collusion assumption by **picking relay & gateway from disjoint trust sets** (R3, FM2). Its non-collusion limit is why L1 is honestly labeled "proxied," not "anonymous" (FM11). | [11][12] |
| **PIR** (Private Information Retrieval) | Hides **which record** a client queries from the server(s) holding the DB. cPIR (single-server, LWE/FHE): heavy CPU. itPIR (≥2 non-colluding replicas): cheaper compute, same non-collusion shape as OHTTP. | Closes the gap OHTTP/onion leave open — hides *what item*, not just *who*. | **Whole-DB scan per query** → too expensive for v1; itPIR needs replicated DBs + non-collusion. | Relevant to **name/catalogue lookups**: resolving `name → key` against a HiveRelay-pinned Hyperbee *leaks which name you wanted* even under L1. **Flagged "future research" only** — too expensive for the cheap layers. | [13] |
| **iroh relays** (in-stack lineage) | DERP-derived (borrowed from Tailscale's DERP); coordinate holepunching and relay QUIC datagrams as encrypted fallback. Docs: relays "do not have access to the data being transmitted, as it's encrypted end-to-end" and "authentication is about access, not privacy." | The exact pattern HiveRelay's signed `mutableGet` bootstrap is "iroh-inspired" by (`relay-record.js` header) — self-certifying relay descriptors; encrypted relay payloads. | **The relay observes each node's public IP+port and the Ed25519-derived NodeId** and learns which nodes communicate. Availability/NAT-traversal infrastructure, **not** metadata-privacy infrastructure. | Confirms our HiveRelay posture is *iroh-equivalent for authenticity, weaker for privacy* (HiveRelay also terminates plaintext HTTP, so it sees the requested content too). The relay-descriptor + verify pattern is the asset to reuse; the IP/NodeId-visibility is the gap. ⚠ the IP/NodeId-visibility point leans on iroh blog/docs synthesis — re-read the relay protocol spec before citing as load-bearing. | [14] |
| **pear-pos `tor-relay-architecture.md`** (in-house prior art) | A fleet of always-on **Tor-hidden-service relay/mirror/bootstrap nodes that front Hyperswarm**; 3 encryption layers (Tor circuit ⊃ Noise ⊃ Hypercore feed enc); embedded-`tor`-child + SOCKS5 dial; 4-tier fallback (direct P2P → DHT-over-Tor → Tor relay → mirror). | Concrete IP-hiding mechanism that fits Holepunch's encryption stack; zero-knowledge blind relay/mirror; an embedded-Tor lifecycle + fallback chain to mine for L1/Approach D. | **Hides IP but is single-hop-to-hidden-service — NOT onion/source-routing**: the relay still sees the full stream of whoever connects. No topic blinding, no traffic-correlation defense. Written for **Node 20 + Docker, not Bare** — `child_process.spawn('tor')`/`socks-proxy-agent` don't exist under Bare; keeps a clearnet Gateway that re-leaks IPs and a hardcoded signed bootstrap list (the soft-authority we reject). Daemon uses `firewall: () => false`. | **Partial input, not a drop-in.** Its IP-hiding + 3-layer-crypto framing informs L1/Approach D; its single-hop-to-relay limitation is exactly the gap **L2 (§7.3)** exists to close; its Node-20-not-Bare stack is the **porting spike** (C2). We inherit the *design*, not the code, and explicitly avoid its clearnet Gateway + hardcoded bootstrap. | [15] |
| **Hyperswarm / HyperDHT** (baseline) | Kademlia-style DHT; announce/lookup by 32-byte topic hash; Noise-encrypted E2E streams; UDP holepunching. | Topics are hashes (more private than DNS names); payload E2E-encrypted; signed announce proofs. | **Not anonymous: announces peer IP+port; any DHT observer harvests IP↔topic mappings.** | **The status-quo gap this doc closes.** | [16] |

### Sources

1. *Tor: The Second-Generation Onion Router*, Dingledine/Mathewson/Syverson — https://svn-archive.torproject.org/svn/projects/design-paper/tor-design.html ; Tor specs — https://spec.torproject.org/intro/index.html
2. *Legal FAQ for Tor Relay Operators* (EFF / Tor Project) — https://community.torproject.org/relay/community-resources/eff-tor-legal-faq/
3. I2P — Garlic Routing / Tunnel Routing (official docs) — https://i2p.net/en/docs/overview/garlic-routing/ ; https://i2p.net/en/docs/overview/tunnel-routing/
4. *Practical Attacks Against the I2P Network* (Egger et al., RAID 2013) — https://sites.cs.ucsb.edu/~chris/research/doc/raid13_i2p.pdf
5. *The Loopix Anonymity System* (Piotrowska et al., USENIX Security 2017) — https://arxiv.org/pdf/1703.00536
6. *The Nym Network* whitepaper — https://nym.com/nym-whitepaper.pdf ; latency figure cross-ref (vendor-grade, flagged) — https://nym.com/docs/network/concepts/mixing
7. Nym packet mixing / Sphinx (docs) — https://nym.com/docs/network/concepts/mixing
8. *Dandelion++: Lightweight Cryptocurrency Networking with Formal Anonymity Guarantees* (Fanti et al., SIGMETRICS 2018) — https://arxiv.org/pdf/1805.11060 ; ACM — https://dl.acm.org/doi/pdf/10.1145/3292040.3219620
9. *Sphinx: A Compact and Provably Secure Mix Format* (Danezis & Goldberg, IEEE S&P 2009) — https://cypherpunks.ca/~iang/pubs/Sphinx_Oakland09.pdf
10. HOPR — Proof of Relay (docs, vendor-grade) — https://docs.hoprnet.org/core/proof-of-relay
11. RFC 9458 — *Oblivious HTTP* (IETF, Jan 2024) — https://www.ietf.org/rfc/rfc9458.html
12. RFC 9230 — *Oblivious DNS over HTTPS* (Independent Submission, experimental) — https://datatracker.ietf.org/doc/rfc9230/
13. *Private Information Retrieval* (Chor/Goldreich/Kushilevitz/Sudan) — https://www.cs.umd.edu/~gasarch/TOPICS/pir/first.pdf ; CPIR overview — https://en.wikipedia.org/wiki/Private_information_retrieval
14. iroh connectivity & relays (docs + DERP lineage) — https://docs.iroh.computer/concepts/relays ; https://www.iroh.computer/blog/what-is-derp (IP/NodeId-visibility synthesized — flagged)
15. pear-pos Tor relay architecture (in-house prior art) — `~/Desktop/pear-pos/docs/tor-relay-architecture.md`
16. HyperDHT / Hyperswarm privacy — README + privacy issues — https://github.com/holepunchto/hyperdht ; https://github.com/holepunchto/hyperdht/issues/50 ; https://github.com/holepunchto/hyperdht/issues/2

## 6. Candidate approaches (with tradeoffs)

### Approach A — Discipline + config hardening only (no overlay)

Flip the relay race P2P-first; rotate topics per session; derive ephemeral per-invoice/per-session keys; firewall the vanilla swarm; encrypt what the relay pins. **No new routing layer.**

- **Pros:** every change is config/discipline on primitives we already ship; ~zero latency cost; retires the highest-*likelihood* leaks (relay-sees-every-fetch, stable-topic correlation, key reuse) immediately.
- **Cons:** does **not** hide the user's IP from a determined direct peer (you still dial the drive); does not defeat relay+peer collusion; no sender anonymity. It *reduces* the metadata each party sees and *unlinks sessions*, but it is not "anonymity."
- **Verdict:** **the cheap, high-value core — ship first, unconditionally.** Most of the realized value for ~none of the latency.

### Approach B — Single-hop relay-through (proxy, not onion)

Route fetch/settlement/publish through a **chosen relay-through hop** (the receiver sees the relay's IP, not yours), selected from a self-certifying, social-gated directory. One hop only — the OHTTP relay/gateway split mapped onto Hyperswarm.

- **Pros:** hides the user's IP from the *receiver/peer* at one-hop latency cost; reuses `relay-record.js` directory + verify-and-drop; a *different* relay than your pinner can be chosen (split the choke point, R3).
- **Cons:** the chosen hop now sees `{your IP, your destination}` — you have **moved** the choke point, not eliminated it; a single malicious hop de-anonymizes you for that request; no protection against hop↔destination collusion.
- **Verdict:** a useful **middle tier** for IP-hiding on high-stakes single requests where you trust the hop more than the destination — honestly labeled "proxy," not "anonymous."

### Approach C — Onion / mixnet overlay over Hyperswarm (multi-hop, layered encryption)

A real overlay: N-hop circuits with layered (onion) encryption built on Hyperswarm relay-through, so no single hop sees both source and destination; optional batching/padding for the paranoid tier.

- **Pros:** the only approach that gives **sender anonymity** against a non-global adversary; no single hop links source↔destination; can carry high-stakes paths for users who accept latency.
- **Cons:** **expensive** — hundreds of ms latency (violates C1 for browsing), real engineering (circuit build, per-hop key agreement, relay incentives/availability), and **anonymity-set-dependent** (C4): with few users and few honest relays it provides little real anonymity and is vulnerable to a Sybil-relay coalition doing end-to-end timing correlation (C6). JS-over-Hyperswarm-Bare (C2) is feasible but unproven at this layer.
- **Verdict:** **opt-in, latency-gated, high-stakes-paths-only, gated on an anonymity-set + relay-availability analysis.** Specify the descriptor schema early (so the directory is routing-aware from day one); **build last**; never default-on for browsing.

### Approach D — Lean on an external anonymity network (Tor / I2P transport)

Tunnel Hyperswarm/relay traffic through an external Tor/I2P process via IPC (the pear-pos model, adapted to out-of-process because Bare cannot embed Tor).

- **Pros:** a real, audited anonymity set we do not have to grow ourselves; strong sender anonymity.
- **Cons:** external daemon dependency (off-thesis, packaging burden, not in Bare — C2); Tor over a holepunching UDP-centric transport is a poor fit (Tor is TCP/stream-oriented); high latency; couples Pear to infra we do not control; inherits exit liability if egress is enabled (FM10).
- **Verdict:** **track, don't build.** A power-user "route through my own Tor" escape hatch is reasonable; making it the design is not.

**Chosen:** A as the unconditional foundation, B as a middle IP-hiding tier for high-stakes single requests, C as the opt-in high-anonymity tier (specified-early, built-last), D as a power-user escape hatch. This is the layered, cheapest-high-value-first roadmap of §9.

## 7. Recommended design (mapped onto our primitives)

The design is **four layers**, each independently shippable, each labeled with exactly what it hides and from whom (R4). Higher layers cost more latency (C1) and are opt-in. The single net-new shared primitive is the **routing-node directory** (§7.5); everything else is config + key-derivation discipline on shipped code.

### 7.0 The governing latency ↔ anonymity table

| Tier | Added latency | Hides | Does NOT hide | Default? |
|---|---|---|---|---|
| **L0 defaults** | ~0 (P2P-first can be *faster*) | content from relay; unneeded fetches; cross-session linkage | your IP from peers/relay | **Yes, unconditional** |
| **L1 firewall + 1-hop** | low (one extra hop, per request) | your IP from the destination (for routed requests) | `{IP, destination}` from the chosen hop | Opt-in, high-stakes paths |
| **L2 onion N-hop** | high (hundreds of ms) | source↔destination from any single hop | global passive adversary; Sybil-relay coalition; timing without padding | Opt-in, latency-gated, **never browse default** |
| **L2 + padding/batching** | very high | + timing/volume correlation | global passive adversary | Paranoid opt-in only |

Non-negotiables this encodes: **browsing stays on L0**; **more anonymity needs more crowd, not just more hops** (C4); **we never claim Tor-equivalence** (C7).

### 7.1 Layer 0 — Metadata-minimizing defaults (Approach A; ships first, no flag)

1. **Flip the relay race P2P-first.** Change `HyperProxy._doHybridFetch` (`hyper-proxy.js:671-702`) from unconditional parallel `Promise.any([relayPromise, p2pPromise])` to **P2P-first with a short relay-fallback grace window**: start the P2P fetch; only start the relay fetch if P2P has not answered within `RELAY_GRACE_MS` (~300–800 ms). Concretely, replace the simultaneous launch with a timed race:

   ```
   async _doHybridFetch(keyHex, filePath):
     p2p = this._fetchP2P(keyHex, resolvedPath)          // start P2P immediately
     winner = await raceWithTimeout(p2p, RELAY_GRACE_MS)  // resolves p2p OR 'timeout'
     if winner !== 'timeout' and winner != null: return { ...winner, source: 'p2p' }
     relay = this._relay?.fetch(keyHex, resolvedPath)     // only now touch the relay
     return await Promise.any([p2p, relay]) ?? null       // p2p may still land first
   ```

   The relay stops seeing fetches it never needed to serve — the single highest-value line-change, and already flagged as desirable in `docs/P2P-SEARCH-RESEARCH.md`.

2. **Encrypt everything the relay pins.** Receipt ledgers, name rooms, private collaborative bases → **encrypted Autobase** via `encryptionKey`, generalizing the `browser-state-sync.cjs` precedent (`:31`, `:61`). The pinner stores ciphertext bytes and cannot read amounts/recipients/names. Relay stays "index, not authority" *and* now "blind pinner." (Note: encryption hides block *contents*, not the discovery key — see §7.1.3 and §10.)

3. **Per-session discovery-topic rotation.** At the `SwarmGrants` / `SwarmBridge` chokepoint (`swarm-grants.js`, `swarm-bridge.js:_resolveTopic:182-233`), derive **session-scoped topics** for rotation-tolerant flows:

   `topic = H("pear.privacy.v1:" ‖ baseTopic ‖ epoch ‖ sessionSalt)`

   where `epoch = floor(now / EPOCH_MS)` is the *only* time input (coarse, shared, not a per-event clock) and `sessionSalt` is a per-launch random. A stable topic stops being a long-lived DHT correlation handle. Tier-A derivation in `_resolveTopic` already hashes `driveKeyHex + subtopic`; this extends the same hashing with an epoch/salt term behind a per-flow `rotatable` flag. **Caveat:** a service that must be discoverable by strangers (a public merchant POS, a public name room) cannot fully rotate its advertised topic — see §10.

4. **Ephemeral per-invoice / per-session keys.** Generalize the per-app domain-separated derivation in `backend/identity.js` to a **per-invoice buyer subkey** and a **per-session posting subkey** under the root-authorized chain. Never reuse a buyer key across merchants; never reuse a session key across sessions. Pure key-derivation discipline, **zero network cost** — the cheapest high-value mitigation in the doc.

**What L0 hides:** content from the relay (encryption), unneeded fetches from the relay (P2P-first), cross-session linkage (rotation + ephemeral keys). **What it does NOT hide:** your IP from a direct peer/seeder or from the relay at the HTTP layer. That is L1+.

**Files touched (L0):** `backend/hyper-proxy.js` (`_doHybridFetch`), `backend/swarm-bridge.js` + `backend/swarm-grants.js` (rotatable topic derivation), `backend/identity.js` (ephemeral subkeys), `backend/constants.js` (`RELAY_GRACE_MS`, `EPOCH_MS`, a `privacyDefaults` settings block). No new RPC — L0 is invisible defaults; expose only a Settings → Privacy read-out.

### 7.2 Layer 1 — Firewall + selective single-hop relay-through (Approach B; flagged)

1. **Firewall the vanilla swarms.** Construct *both* swarms (`index.js:1536` and `anongpt-buyer.js:135`) with a `firewall(remotePublicKey, peerInfo)` predicate so the user is **not freely holepunchable by arbitrary topic peers**: accept direct connections only from peers with a reason (a `SwarmGrants` grant, a contact, an explicit dial), `relayThrough` the rest. This is the policy hook that `index.js:1539` lacks today (it currently ignores `peerInfo`). The firewall decision reuses the `SwarmGrants` Hyperbee as the allow-list source of truth.

2. **Single-hop relay-through for high-stakes single requests.** For settlement broadcast, name resolution, and publish — paths that are *one request, latency-tolerant, high-stakes* — route through a **relay-through hop chosen from the routing-node directory** (§7.5). The destination sees the hop's IP, not yours. **Choose a different relay than your pinner** so no single party sees both your pins and your destinations (R3). This is the OHTTP relay/gateway split mapped onto Hyperswarm: the hop is the "oblivious relay" (sees your IP, not the ultimate content destination's identity if the request body is HPKE-sealed to the gateway).

**What L1 hides:** your IP from the destination/peer for the routed request (one hop). **What it does NOT hide:** `{your IP, your destination}` from the chosen hop — you trust that hop for that request. Label it "proxied," not "anonymous."

**Files touched (L1):** `backend/index.js` (firewall predicate on swarm construction + connection handler), `backend/anongpt-buyer.js` (firewall on its swarm), new `backend/routing-record.js` (§7.5), `backend/swarm-grants.js` (allow-list lookup for firewall). New RPC: `CMD_GET_PRIVACY_MODE` / `CMD_SET_PRIVACY_MODE` (mirror the `CMD_GET_RELAYS`/`CMD_SET_RELAY_ENABLED` boolean pattern, `index.js:776-796`), persisted in `pearbrowser-state.json`. Flag: `experimentalPrivacyRouting` (mirror `experimentalAutobeeCatalogs`).

### 7.3 Layer 2 — Onion overlay for the high-anonymity tier (Approach C; opt-in, latency-gated, built last)

- **N-hop onion circuits over Hyperswarm relay-through.** Layered encryption per hop using the **Sphinx fixed-size packet format** (adopt, don't invent — [9]): a circuit is built by selecting `k` routing-node descriptors from the directory, agreeing an ephemeral key per hop, and wrapping the payload in `k` blinded layers so no single hop sees both predecessor and successor identities. **SURBs** carry the anonymous reply (e.g. a per-invoice response) without exposing a return path.
- **Selection is social-graph-gated** (attack edges, not node count — C6) with **diversity constraints** (don't pick multiple hops from one operator/AS).
- **Optional batching/padding** for the paranoid tier to blunt timing/volume correlation, at further latency cost.
- **Hard gates before this ships:** (a) an **anonymity-set analysis** — how many users + honest relays make this meaningful (C4); (b) a **relay-availability/incentive** story — who runs hops and why (the empirical killer of every volunteer overlay); (c) **strictly opt-in, never the browse default** (C1). Until all three hold, this is "available for settlement/publish if you accept latency," not "Pear is anonymous."

**What L2 hides:** source↔destination linkage from any single hop (sender anonymity vs a non-global, non-coalition adversary). **What it does NOT hide:** anything against a global passive adversary or a Sybil-relay coalition large enough to own your whole circuit (C7) — the UX states this.

### 7.4 Layer 3 — Power-user external-network escape hatch (Approach D; track only)

A documented "route Hyperswarm/relay traffic through my own Tor/I2P" option (out-of-process IPC, since Bare cannot embed `tor` — C2), for users who already run one. Not built; an escape hatch, not the design.

### 7.5 The routing-node directory (the one net-new shared record) — reuses the Autobee op-log + reducer pattern

This is the only new primitive, and it is built by **cloning two patterns we already ship**: the self-certifying `relay-record.js` mutable record for *node identity*, and the `autobee-catalog-{ops,apply}.cjs` op-log + deterministic reducer for *directory state*.

**(a) Routing-node descriptor — self-certifying mutable record (clone `relay-record.js`).** Each routing node publishes, keyed by its routing pubkey:

```
RoutingNodeRecord (v1):
  v:            1
  routingPubkey: <32-byte Ed25519>     // the DHT mutable-record key; self-certifying
  capabilities: ["relay-through", "onion-hop"]   // subset
  maxBandwidth: <int, advertised>
  transportHint: <swarm topic / addr hint>
  epoch:        <coarse epoch, the only time field>
  sig:          <Ed25519 over the canonical encoding>
```

Resolved with `dht.mutableGet(routingPubkey)` exactly as `resolveRelayRecord` does (`relay-record.js:39-48`) — a malicious DHT node can serve stale, never forge. A new `backend/routing-record.js` mirrors `relay-record.js` field-for-field (`decode` / `resolveRoutingRecord` / `resolveBootstrapRoutingNodes`), Node-safe (`b4a` only, no `bare-http1`) so it is unit-testable outside Bare.

**(b) Directory state — Autobee op-log + deterministic reducer (clone `autobee-catalog-{ops,apply}.cjs`).** Which nodes exist and their advertised capabilities is *collaborative, multi-writer directory state* — exactly the shape the catalog Autobee already solves. We reuse the pattern verbatim:

- **Ops** (`backend/routing-directory-ops.cjs`, clone of `autobee-catalog-ops.cjs`): `node.upsert` (a descriptor), `node.remove`, `writer.add`. Each op is schema-versioned (`v`), size-bounded (`MAX_OP_BYTES`), and prototype-pollution-guarded by the *same* `validateOp`/`hasUnsafeKey` machinery (`autobee-catalog-ops.cjs:33-121`). App-style identity rule: `routingPubkey` is stable identity, not editable metadata.
- **Reducer** (`backend/routing-directory-apply.cjs`, clone of `autobee-catalog-apply.cjs`): **wall-clock-free** (C5) — order comes from Autobase `(writer, seq)` linearization (`autobee-catalog-apply.cjs:26-32`), never `Date.now()`. Folds the op-log into a `Map<routingPubkey, descriptor>` view, last-write-wins per node, unknown ops retained-but-ignored (forward-compat).
- **Ingest trust** is verify-and-drop (`relay-directory.js:mergeRelayDirectory`, `index-room-client.js:126-127`): every adopted descriptor is re-verified against its own signed record; in privacy mode the `verify(doc)` gate is **mandatory** (it is optional for the catalog today). The room is an index, not an authority — a Sybil cannot inject a forged descriptor, only spam valid-but-useless ones (bounded by selection, §7.3, FM8).

**Why Autobee here and not for payloads:** the directory is exactly the catalog's problem (multi-writer, eventually-consistent, deterministic-merge, no central authority) — so the catalog reducer is the right tool. **Routing payloads never touch Autobee**; they flow over Sphinx-wrapped relay-through streams. Autobee is *only* the shared "who can route" registry.

**(c) Selection** is social-graph-gated like contact/relay selection (C6): bound by attack edges, with path-diversity constraints. Bootstrap mirrors `resolveBootstrapRelays` — a seed can be `{ routingPubkey }` and resolve its own descriptor over the DHT, plus a `BOOTSTRAP_ROUTING_NODES` constant (mirror `BOOTSTRAP_RELAYS`, `constants.js:196`).

### 7.6 New RPC commands & constants (consolidated)

Following the house pattern — numeric command constants in `backend/constants.js` (mirrored UI-side per existing convention), dispatched in `backend/index.js` via `rpc.handle(...)`, events pushed via `rpc.event(C.EVT_*, …)`, consent via an `EVT_*_REQUEST` → UI sheet → `CMD_*_RESOLVE` round-trip (the `EVT_SWARM_REQUEST`/`CMD_SWARM_RESOLVE` shape, `index.js:1241`).

| New constant | Kind | Mirrors | Purpose |
|---|---|---|---|
| `CMD_GET_PRIVACY_MODE` / `CMD_SET_PRIVACY_MODE` | RPC cmd | `CMD_GET_RELAYS` / `CMD_SET_RELAY_ENABLED` (40/42) | Read/set the active tier (`off`/`L0`/`L1`/`L2`), persisted in `pearbrowser-state.json` |
| `CMD_LIST_ROUTING_NODES` | RPC cmd | `CMD_GET_RELAYS` (40) | Surface the verified routing-node directory for UI/debug |
| `CMD_PRIVACY_ROUTE_RESOLVE` | RPC cmd | `CMD_SWARM_RESOLVE` (120) | UI reply to a per-topic "route anonymously?" consent ceremony |
| `EVT_PRIVACY_ROUTE_REQUEST` | RPC event | `EVT_SWARM_REQUEST` (107) | Backend asks the UI to confirm routing a high-stakes request through a hop |
| `BOOTSTRAP_ROUTING_NODES` | config array | `BOOTSTRAP_RELAYS` (196) | Well-known `{ routingPubkey }` seeds the directory self-populates from |
| `RELAY_GRACE_MS`, `EPOCH_MS` | tuning | — | P2P-first grace window; coarse topic-rotation epoch |

### 7.7 Consent integration (reuse the Tier-C seam)

`SWARM-V1.md` §4 and `SwarmBridge` Tier C already warn *"This will reveal your IP to those peers"* but offer no remedy. Add an **"route anonymously instead"** option to that consent sheet: when a Tier-C topic is approved with the anonymous option, the join is performed via L1/L2 (the destination sees a hop's IP, not yours) and the grant in `SwarmGrants` records the chosen mode. This turns the existing informational warning into an actionable choice (R4) at the exact seam (`swarm-bridge.js:_resolveTopic`, `EVT_SWARM_REQUEST` / `CMD_SWARM_RESOLVE`) the consent machinery already owns.

## 8. Threat model & failure modes (each with a mitigation)

**Likelihood** = how easily an actor can do this against the *shipped* stack today; **Impact** = damage when payments/identity/names ride the wire; **Mitigation** is keyed to the layer (L0–L2) that addresses it, cheapest-first.

| # | Threat | Likelihood | Impact | Mitigation (layered, cheapest-first) |
|---|---|---|---|---|
| **FM1** | **IP exposure in vanilla Hyperswarm** — any co-swarming peer/seeder learns your `IP:port` via holepunch (`new Hyperswarm()`, `index.js:1536`, no firewall; the connection handler `:1539` ignores `peerInfo`). | **High** (it's how discovery works) | **High** (IP → identity once payments/nostr ride the wire) | **L1**: `firewall` predicate + `relayThrough` so strangers can't freely holepunch you; accept direct only from grant/contact peers (`SwarmGrants` as allow-list). **L2** for sender anonymity on high-stakes paths. *No L0 fix — IP exposure is inherent to direct dialing; you must add a hop.* |
| **FM2** | **HiveRelay as metadata choke point** — default-on relay sees `{drive key, path, time, IP}` of ~every fetch via the parallel race (`_doHybridFetch`, `hyper-proxy.js:686`) **and** pins your ledgers → near-complete view; it terminates plaintext HTTP so it reads the content too. | **High** (default-on, every fetch) | **High** (one party, full {who/what/when}) | **L0**: flip the race **P2P-first** (relay only on P2P miss) → relay stops seeing most fetches; **encrypt pinned ledgers/rooms** → relay holds ciphertext. **L1**: pin-relay ≠ fetch-relay ≠ route-hop (split the choke, R3). **L2** for IP. Relay stays *index, not authority*. |
| **FM3** | **Transaction-graph / interest correlation** — stable pubkey + stable DHT topic + pin pattern **clusters a service's entire audience** (by IP via FM1, by key via reuse). | **Med–High** (cheap for any topic peer) | **High** (whole audience graph) | **L0**: **per-invoice/per-session ephemeral subkeys** (never reused) + **per-session topic rotation** + **encrypted ledger** → no stable key/topic handle to cluster on. **L1/L2** removes the IP coordinate. A *public* service's own pubkey stays public by design (accountability) — selective disclosure: service bound, audience ephemeral. |
| **FM4** | **Per-invoice / per-session linkability** — key/topic reuse lets two actions be tied to one party by transport metadata alone. | **High** (keys reused today) | **Med–High** (defeats the whole unlinkability premise) | **L0**: ephemeral per-invoice/per-session keys + topic rotation (§7.1.3–4). Pure key-derivation discipline, **zero network cost** — the cheapest high-value mitigation. |
| **FM5** | **Passive traffic analysis (timing)** — an observer on ≥2 legs correlates request/response timing to link source↔destination even when content is encrypted. | **Med** (needs a position on ≥2 legs) | **Med–High** (defeats single-hop indirection) | **L2 + padding/batching** only — timing is *not* cheaply defeatable. L0/L1 do **not** stop a timing adversary; the UX must not claim they do (R4). Honest scope: raise cost, don't defeat a global timing adversary (C7). |
| **FM6** | **Volume/size correlation** — distinctive response sizes (a small invoice vs a 4 KB page vs an event) fingerprint *what* you did under encryption. | **Med** | **Med** | **L2 padding** (pad to size buckets) for high-stakes paths via Sphinx fixed-size packets; **L0** commit only hashes, never cleartext amounts, to any shared room. Accept residual leakage on the fast path (C1). |
| **FM7** | **Sybil routing relays** — attacker floods the routing directory with cheap descriptors; if enough of a circuit is attacker-owned, end-to-end correlation de-anonymizes. | **High** (descriptors/keys are free) | **High** (breaks L2's core guarantee) | **Directory**: verify-and-drop self-certifying descriptors (authenticity, `routing-record.js`) bounds *forgery* not *count*. **Selection**: **social-graph-gated** (attack edges, C6) + **path diversity** (no two hops same operator/AS). **Honest ceiling**: a coalition large *relative to honest relays* still wins — an anonymity-set/relay-count gate precedes L2 shipping (C4, FM12). |
| **FM8** | **DHT enumeration** — a DHT node near a topic enumerates `announce`/`lookup`: which keys are discovered, by which IPs, and tracks a **stable** topic over time. | **Med–High** (any DHT participant near the keyspace) | **Med** (maps topic→IP→interest; tracks long-lived topics) | **L0**: **per-session topic rotation** (FM4) shrinks the observable window; **derive non-guessable topics** (`H(secret ‖ epoch ‖ salt)`) for private flows so enumeration yields opaque hashes. **Dandelion++ stem** before DHT-announce for broadcasts (FM3). *Caveat:* publicly-discoverable services **must** keep a findable topic — mitigate their IP coordinate via L1/L2 instead. |
| **FM9** | **Black-holing / unverifiable forwarding** — a routing node accepts traffic and silently drops it (or claims to relay without doing so), degrading the overlay. | **Med** | **Med** (availability/DoS) | **Directory** health signals + **path diversity**; conceptually adopt HOPR's **proof-of-relay** idea (verifiable forwarding) onto the social-graph directory *without* a token. Open question §10.2. |
| **FM10** | **Exit-node abuse & legal liability** — if a routing relay (esp. a future HiveRelay "exit") forwards *arbitrary* internet traffic, the operator's IP is attributed to others' actions → abuse/takedown/legal exposure (the classic Tor-exit problem [2]). | **Low today** (relay forwards only Pear content), **rises with L1/L2** | **Critical (legal)** for operators | **Design constraint, not a code fix**: scope relays to **Pear-protocol content only** (the I2P no-exit-by-default posture) → not a general exit, sharply bounding liability. If a true exit is ever added: explicit operator opt-in, exit policies, abuse handling, jurisdiction-aware, **flag for counsel**. Default: **no open-internet exit.** |
| **FM11** | **Relay/hop collusion or compromise** — your chosen single hop (L1) colludes with the destination, or is compromised, recovering `{your IP, your destination}`. | **Med** (single hop = single point) | **High** (full de-anon for that request) | **L1 is honestly "proxy," not "anonymous"** (R4) — use only where you trust the hop more than the destination. **L2** (multi-hop, no single hop sees both ends) is the real fix; **path diversity** (FM7) reduces collusion odds. |
| **FM12** | **Anonymity-set collapse** — a mode advertised "anonymous" with too few users gives ~no real anonymity; users over-trust it and link themselves by acting on the false belief. | **High** (early adoption is small) | **High** (false confidence is worse than none) | **C4 honesty gate**: never ship a mode whose claim outruns its set size; **surface the set** (R4 — "N users share this path this epoch"); gate L2 on minimum honest-relay + user counts; default to honest L0/L1 claims until the crowd exists. |
| **FM13** | **Cover-traffic / availability cost** — padding/batching/multi-hop degrade the latency that is Pear's product; users disable them, collapsing the set (FM12). | **Med** | **Med** (mitigations rejected ⇒ no protection) | **The §7.0 tradeoff, managed**: cheap L0 is default + invisible; expensive L2 is opt-in + scoped to latency-tolerant high-stakes paths only; browsing never pays the mixnet tax (C1). Adoption-by-default of L0 builds the set L2 needs. |
| **FM14** | **Two-swarm leak** — `anongpt-buyer.js:135` opens a second `new Hyperswarm()`; any layer wrapping only the main swarm leaves it leaking. | **High** (already a separate swarm) | **Med** | Apply the L1 firewall/`relayThrough` and L0 topic discipline to **both** swarm construction sites; or route the buyer through the shared swarm so there is one chokepoint. |

### Hardest unsolved problems (scoped honestly)

- **Low-latency anonymity is anonymity-set-bound, and Pear's set is small and latency-allergic.** No engineering defeats a global passive adversary or a circuit-owning Sybil coalition at low latency (C7); the real defense is crowd size, which is in tension with the latency that draws the crowd (FM12/FM13). Not solved — *managed* by making the cheap layer the default so the set grows, and never over-claiming.
- **Hiding the discovery key without losing P2P discoverability.** The discovery key is `hash(coreKey)` — deterministic and public *by design*, because that is how two peers find each other without a server. Encryption hides block contents but the topic you join is still in the clear, so a passive observer or DHT crawler learns *which* core you want. The realistic answers push discovery onto the relay tier (PIR-style or oblivious lookups, relay-mediated rendezvous) — none of which exist in-stack today. **This is the central tension of the whole effort**, and a genuine research item (§10), not a config change.
- **Public discoverability vs topic rotation conflict.** A service that must be found by strangers cannot rotate its advertised topic away from enumeration (FM8). Selective disclosure (rotate the private legs, accept a findable public handle, hide the IP coordinate via L1/L2) is the compromise; a publicly-addressable service is inherently more correlatable — an inherent ceiling, not a stack limitation.
- **Exit-node legal exposure has no cryptographic answer.** FM10 is a jurisdiction/policy problem; the only robust mitigation is *not being a general exit* (Pear-content-only relays). Flag for counsel before any open-internet egress is reconsidered.
- **Completeness/omission (eclipse) is unprovable.** The routing directory's self-certifying records prove a listed node is *authentic*, never that the set you see is *complete* — a captured directory can omit honest relays to steer you onto attacker hops (an FM7 amplifier). Cross-checking ≥2 independent directory sources raises the bar; a cheap robust anti-omission proof is open.

## 9. Phased rollout plan

Each phase is independently shippable; risky/expensive phases are flag-gated and fail closed (the `experimentalAutobeeCatalogs` / `requireSync` posture already in the tree). Ordered **cheapest-high-value-first** — the §8 roadmap in build order.

- **Phase 0 — Metadata-minimizing defaults (no flag, ships first).**
  Flip `_doHybridFetch` to **P2P-first** with `RELAY_GRACE_MS` (`hyper-proxy.js:671-702`); **encrypt** relay-pinned ledgers/rooms via `encryptionKey` (reuse `browser-state-sync.cjs`); land the **per-session rotatable-topic** derivation in `swarm-bridge.js`/`swarm-grants.js` and the **ephemeral per-invoice/per-session key** derivation in `identity.js`. Add a Settings → Privacy read-out (no toggle yet). Retires FM2, FM3, FM4, FM8 (private flows) at ~zero latency cost. *This is the bulk of the realized value.* **Tests:** unit-test the new pure helpers Node-side (the `*.cjs` discipline already in `test/`).

- **Phase 1 — Firewall + the routing-node directory primitive (flagged: `experimentalPrivacyRouting`).**
  Add `backend/routing-record.js` (clone `relay-record.js`), `backend/routing-directory-{ops,apply}.cjs` (clone `autobee-catalog-{ops,apply}.cjs`), and a `routing-node` index-room schema consumed **verify-and-drop with mandatory `verify`**. Add `firewall`/`relayThrough` to **both** swarm construction sites (`index.js:1536`, `anongpt-buyer.js:135`) sourced from `SwarmGrants`. Add `CMD_GET_PRIVACY_MODE`/`CMD_SET_PRIVACY_MODE`, `CMD_LIST_ROUTING_NODES`, `BOOTSTRAP_ROUTING_NODES` (constants + UI mirror). Addresses FM1's stranger-holepunch surface and FM14; lays the directory L1/L2 both need. No multi-hop yet.

- **Phase 2 — Single-hop relay-through for high-stakes requests (flagged).**
  Route settlement broadcast / name resolution / publish through a chosen, social-gated, *different-from-pinner* hop (the OHTTP relay/gateway split). Wire the **"route anonymously"** option into the Tier-C consent sheet (`EVT_PRIVACY_ROUTE_REQUEST` / `CMD_PRIVACY_ROUTE_RESOLVE`, mirroring `EVT_SWARM_REQUEST`/`CMD_SWARM_RESOLVE`). Hides IP from the destination for those requests (FM1 on high-stakes paths), honestly labeled "proxied" (FM11). Split the choke point (FM2/R3).

- **Phase 3 — Onion overlay, opt-in, latency-gated (flagged, gated on analysis).**
  N-hop Sphinx-format circuits, layered encryption, SURB replies, social-gated + diverse hop selection. **Blocked until** the anonymity-set + honest-relay-count + incentive analysis clears (C4, FM7, FM12). Never the browse default (C1). Optional padding/batching tier for FM5/FM6.

- **Phase 4 — Power-user external-network escape hatch (track only).**
  Documented "route through my own Tor/I2P" via out-of-process IPC (Bare cannot embed `tor`, C2). Not built.

**Sequencing in one line:** `P2P-first race + encrypt pins + ephemeral keys + topic rotation` (free, default, now) → `firewall + routing directory` → `single-hop proxy for high-stakes paths` → `opt-in onion overlay, gated on a real anonymity set` → `external-network escape hatch`. The cheap first phase carries most of the value; the expensive last phase is honestly scoped and never over-claimed.

## 10. Open questions

1. **Topic rotation vs discoverability.** What is the exact rotation policy for *semi*-public flows (a merchant who wants repeat customers to find them but not be clustered)? A rotating private topic + a stable "find me" pointer resolved once? (FM3/FM8 tension, and the discovery-key hard problem of §8.)
2. **Routing-relay incentives.** Who runs onion hops, and why? Every volunteer overlay dies on this. Is HiveRelay-operator-run hops + social-graph relays enough, or does L2 need an incentive (adapted proof-of-relay, FM9) that does not reintroduce pay-to-route corruption?
3. **Anonymity-set floor.** What concrete (user count, honest-relay count, path-diversity) thresholds gate L2 from "available" to "honestly anonymous"? Without a number, FM12 is unmanaged.
4. **Padding/batching latency budget.** For settlement/publish specifically, what latency will users trade for timing/volume resistance (FM5/FM6)? Needs a UX measurement, not a guess.
5. **Firewall vs connectivity.** How aggressively can we firewall the vanilla swarm (FM1) before NAT-traversal/reachability regresses for legitimate flows? The `relayThrough` fallback must cover what the firewall rejects — and we must confirm HyperDHT's `relayThrough`/firewall surface supports the policy we want (the `index.js:1670` `swarm.dht` handle is the seam).
6. **HiveRelay backbone metadata.** What does `p2p-hiverelay-client` actually expose to relay operators (NAT-traversal, circuit-relay internals)? It is a dynamically-imported black box in this repo (`index.js:1576`) and must be reviewed before being trusted in the anonymity story (gap #9).
7. **Discovery-key obliviousness.** Is an oblivious/PIR-style rendezvous against the index room (hide *which* core/name you query) ever affordable at catalogue scale, or does it stay research-grade? (§8 hard problem.)
8. **Exit policy if egress is ever wanted.** Is open-internet egress ever in scope, and under what operator opt-in / exit-policy / jurisdiction model (FM10)? Default today: **no** — flag for counsel before reconsidering.

## 11. Sources

External prior-art claims are cited inline by bracketed number to this list; internal grounding is cited inline by `file:line` against the `feat/phase5-relay-directory` tree.

1. *Tor: The Second-Generation Onion Router* (Dingledine, Mathewson, Syverson) — https://svn-archive.torproject.org/svn/projects/design-paper/tor-design.html ; Tor specs — https://spec.torproject.org/intro/index.html ; guard-spec — https://spec.torproject.org/guard-spec/guard-selection/index.html
2. *Legal FAQ for Tor Relay Operators* (EFF / Tor Project) — https://community.torproject.org/relay/community-resources/eff-tor-legal-faq/
3. I2P — Garlic Routing — https://i2p.net/en/docs/overview/garlic-routing/ ; Tunnel Routing — https://i2p.net/en/docs/overview/tunnel-routing/
4. *Practical Attacks Against the I2P Network* (Egger et al., RAID 2013) — https://sites.cs.ucsb.edu/~chris/research/doc/raid13_i2p.pdf
5. *The Loopix Anonymity System* (Piotrowska et al., USENIX Security 2017) — https://arxiv.org/pdf/1703.00536 ; abstract — https://arxiv.org/abs/1703.00536
6. *The Nym Network* whitepaper — https://nym.com/nym-whitepaper.pdf ; latency figure (vendor docs, flagged non-peer-reviewed) — https://nym.com/docs/network/concepts/mixing
7. Nym packet mixing / Sphinx (docs) — https://nym.com/docs/network/concepts/mixing
8. *Dandelion++: Lightweight Cryptocurrency Networking with Formal Anonymity Guarantees* (Fanti et al., ACM SIGMETRICS 2018) — https://arxiv.org/pdf/1805.11060 ; ACM published — https://dl.acm.org/doi/pdf/10.1145/3292040.3219620
9. *Sphinx: A Compact and Provably Secure Mix Format* (Danezis & Goldberg, IEEE S&P 2009) — https://cypherpunks.ca/~iang/pubs/Sphinx_Oakland09.pdf
10. HOPR — Proof of Relay (docs, vendor-grade) — https://docs.hoprnet.org/core/proof-of-relay ; Mixnets — https://docs.hoprnet.org/core/mixnets
11. RFC 9458 — *Oblivious HTTP* (IETF, Jan 2024) — https://www.ietf.org/rfc/rfc9458.html
12. RFC 9230 — *Oblivious DNS over HTTPS* (Independent Submission, experimental — "not endorsed by the IETF") — https://datatracker.ietf.org/doc/rfc9230/
13. *Private Information Retrieval* (Chor, Goldreich, Kushilevitz, Sudan) — https://www.cs.umd.edu/~gasarch/TOPICS/pir/first.pdf ; cPIR/itPIR overview — https://en.wikipedia.org/wiki/Private_information_retrieval ; CACM survey — https://cacm.acm.org/research/private-information-retrieval/
14. iroh connectivity & relays — https://docs.iroh.computer/concepts/relays ; DERP lineage (blog) — https://www.iroh.computer/blog/what-is-derp ; holepunching — https://www.iroh.computer/docs/protocols/net/holepunching (IP/NodeId-visibility synthesized from blog/docs — flagged; re-read the relay protocol spec before citing as load-bearing)
15. pear-pos Tor relay architecture (in-house prior art, design-only, Node-20/Docker not Bare) — `~/Desktop/pear-pos/docs/tor-relay-architecture.md`
16. HyperDHT / Hyperswarm privacy — README (server-mode announces keypair to the DHT) — https://github.com/holepunchto/hyperdht ; privacy issues — https://github.com/holepunchto/hyperdht/issues/50 , https://github.com/holepunchto/hyperdht/issues/2 ; independent analysis — https://hypha.coop/dripline/p2p-primer-part-3/

---

### Internal grounding (file:line, `feat/phase5-relay-directory`)

- `backend/index.js` — `swarm = new Hyperswarm()` with no privacy options (1536); connection handler discards `peerInfo`, replicates to all (1539-1565); HiveRelay backbone dynamic import (1576); default relays (1648-1651); DHT relay bootstrap via `swarm.dht` (1668-1671); relay RPC handlers (776-796); `CMD_SWARM_RESOLVE` consent round-trip (1241-1248)
- `backend/anongpt-buyer.js` — second independent `new Hyperswarm()` (135), `swarm.join(sellerKey, { client: true, server: false })` (170)
- `backend/hyper-proxy.js` — `_doHybridFetch` parallel relay+P2P `Promise.any` race (671-702, the default-on fetch leak); `_fetchP2P` (710-724); fail-closed `_validateAnongptManifest` privacy contract (288-326); CSP-hash-whitelisted head injection (340-377)
- `backend/relay-client.js` — plaintext HTTP gateway fetch `GET /v1/hyper/<key><path>` (133); `bootstrapFromDht` (346); `listRelays` verify-and-drop (309-332)
- `backend/relay-record.js` — self-certifying `mutableGet` (6-9, 39-48); `resolveBootstrapRelays` multi-relay swappable bootstrap (60-78)
- `backend/relay-directory.js` — `mergeRelayDirectory` verify-and-drop "index, not authority" (24-43)
- `backend/index-room-client.js` — optional-today `verify(doc)` gate (65, 126-127)
- `backend/swarm-bridge.js` — Tier A/B/C `_resolveTopic` consent seam (182-233); `peerInfo`-filtered, IP-never-surfaced channel handler (374-380)
- `backend/swarm-grants.js` — per-`(driveKey, topic)` consent grants (the topic-rotation + firewall-allow-list chokepoint)
- `backend/identity.js` — BIP-39 root + per-app domain-separated subkeys (the per-invoice/per-session ephemeral-key derivation basis)
- `backend/browser-state-sync.cjs` — encrypted-Autobase `encryptionKey` precedent (31, 61) — the blind-pinner pattern to generalize
- `backend/autobee-catalog-ops.cjs` — schema-versioned ops, `validateOp` size/prototype-pollution guards (14-121) — cloned for routing-directory ops
- `backend/autobee-catalog-apply.cjs` — wall-clock-free deterministic reducer, `(writer, seq)` linearization (7-11, 26-32) — cloned for routing-directory state
- `backend/constants.js` — `CMD_GET_RELAYS`/`CMD_SET_RELAYS`/`CMD_SET_RELAY_ENABLED` (49-51), `EVT_SWARM_REQUEST` (=107, defined line 157), `CMD_SWARM_RESOLVE` (=120, defined line 98), `ANONGPT_DRIVE_KEY` (181), `BOOTSTRAP_RELAYS` (196) — the patterns the new constants mirror
- `docs/SWARM-V1.md` §4 — "Hyperswarm peers see your IP; any topic-join is a fingerprinting vector"; Tier-C consent copy "This will reveal your IP to those peers" (the seam for the "route anonymously" option)
- `docs/AUTOBEE-RESEARCH.md` — the op-log + deterministic-reducer reference pattern reused for the routing-node directory
