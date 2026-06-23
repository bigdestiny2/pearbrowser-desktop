# PearBrowser Desktop

A local-first peer-to-peer browser, app store, search engine, naming layer, Nostr bridge, and site publisher for macOS, Windows, and Linux, built on the Pear Runtime.

**No accounts. No DNS. No manual app updates.** Sites and apps are addressed by stable Pear/Hyperdrive keys and pinned 24/7 on the [HiveRelay](https://github.com/bigdestiny2/P2P-Hiverelay) backbone. The publisher's laptop being offline doesn't matter — the relays carry the bytes, and users launch the current release from the catalogue without hunting for a download or applying an updater.

**Current release:** `v0.5.0` · production length `18552` · pinned on the HiveRelay backbone · fresh-peer verified · desktop packages pinned to local [`00-core/hiverelay`](/Users/localllm/Projects/pear-ecosystem/00-core/hiverelay) packages at `0.16.3`, with runtime compatibility checked through relay capability documents rather than npm package publication.

**Current architecture:** start with [docs/ARCHITECTURE_AND_CAPABILITIES.md](./docs/ARCHITECTURE_AND_CAPABILITIES.md). The deeper catalogue/search/naming/Nostr audit is in [docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md](./docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md).

## Run it

```sh
npm i -g pear
pear
pear run pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty
```

One install, one key, works on all three desktop platforms — Pear downloads the matching native runtime on first launch. The key above is **content-addressed and stable**: when we ship a new release, the same key starts serving the new version. Existing installs hot-sync on next launch.

> **Heads up:** `pear run` is officially deprecated in Pear runtime `v2.4.0` ("use `pear-runtime` module instead for embeddable runtime with P2P OTA updates"). It still works today; the migration path is to ship as a signed native installer (see [Distribution](#distribution) below). The `pear run pear://...` command above continues to work for the foreseeable future.

## What's inside

### Browse (v0.4.x)
- Multi-tab browsing with proper keyboard shortcuts: `⌘T` new tab · `⌘W` close · `⌘L` focus URL bar · `⌘1`–`⌘9` switch · `⌘R` reload · `⌘⇧I` devtools
- `hyper://` URL bar accepting hex (64-char) or z-base-32 (52-char) keys
- Localhost HTTP proxy resolves Hyperdrive content for the Chromium engine
- Per-tab back/forward history; tabs persist across launches and survive panel switches
- URL bar autocomplete from your bookmarks + history Hyperbees (↑↓ to navigate, Enter to pick)
- "About this site" panel (ⓘ button): drive key in hex + z-base-32 with copy buttons, scheme + path, one-click bookmark toggle

### Apps
- Paste any `pear://` link → opens in its own isolated window
- Launch the latest available release from a stable catalogue row or app link; users do not need to revisit a project page, download a package, or manually update installed app bytes
- Load decentralized catalogues from Hyperdrive JSON, signed Hyperbee, Autobee, schema-sheets rooms, HiveRelay index rooms, default curated seeds, community submissions, and your own writable catalogues
- Keep multiple catalogs loaded at once with search, category, and source filters across the aggregated app store
- **My Catalog:** create a writable personal catalog, add apps from loaded catalogs or installed apps, rename it, edit saved metadata (name, description, version, author, categories), and share the catalog key; copies opened without the writer key stay read-only
- Safe catalogue normalization accepts `apps[]`, `items[]`, or `entries[]`, preserves safe link-only rows (`hyper://`, `pear://`, `file://`), rejects malformed targets, and strips prototype-pollution keys before rendering
- Default catalog auto-loads on first Apps-tab visit (the "PearBrowser Network" Hyperbee `hyperbee://f5fb7500bccd…` — PearBrowser, peerit, HiveRelay, P2P Builders, Pear Dealroom, Paste, PearPoker, Keet, PearPass, Peercord, anonGPT, Pear POS, Pear Tickets, HiveWorm), generated from a single source manifest and mirrored into the offline seed
- **peerit — "the front page of the P2P internet"** (a peer-to-peer Reddit, `hyper://ec6e2d6d…/`): a browsable `hypersite` whose communities, posts, threaded comments and votes live in a shared Autobase+Hyperbee log. It opens as the **active front tab on every fresh launch** (alongside the landing page) and is **pinned to the top** of the Sites discovery grid. Source: `02-apps/peerit`.
- Featured apps: **Keet** · **PearPass** · **anonGPT** · **Paste** · **[Peercord](https://git.churchofmalware.org/mastercodeon/Peercord)**. Peercord's current Pear release is a full desktop app (`pear.json` `type:"desktop"`), so PearBrowser launches it via the standalone `pear://` window path; it should only move to headless "Run in tab" once Peercord publishes a pear-request worker entry.

### Publish (P2P Sites)
- Block editor: heading, paragraph, image, link, list, quote, code, raw HTML/CSS/JS, divider
- One-click publish + auto-pin to HiveRelay
- Replication confirmation — the editor only reports "published" after `waitForDurable()` confirms at least one relay has actually replicated the drive
- Drive identified by the current Hypercore/HiveRelay `discoveryKey` contract
- Ed25519-signed unseed for revocation
- Relay-aware publishing: HTTP `/seed`, capability docs at `/.well-known/hiverelay.json`, signed `catalogBeeKey` catalogs when advertised, and optional `indexRoom` discovery for richer directory hydration

### Library
- Bookmarks + history stored in a local Hyperbee (private, local-only by default)
- Cross-launch persistence; powers the URL-bar autocomplete

### Search
- Local-first personal index returns first-paint results immediately from local browser/catalogue data
- Optional trusted-peer federation enriches results in the background through `QueryPlanner`, digest checks, provenance, and stale-query suppression
- Query length and result limits are bounded; no query leaves the device unless the user asks for federated search

### Naming
- `pearname://` and typed names resolve through local petnames, owned registry records, trusted-contact federation, and curated defaults
- Unicode normalization and homograph guardrails keep memorable names from hiding unsafe targets
- Resolution keeps provenance so a local petname, contact assertion, and curated alias do not look equivalent

### Nostr Bridge
- Deterministic Nostr key derived from the PearBrowser identity seed, with binding and revoke records
- Local NIP-01-style event storage and ingest
- Trusted-contact feed aggregation with hidden diagnostics; this is not a general public relay client

### Identity (BIP-39)
- 12-word backup phrase + Restore-from-phrase ("Moving to a new device?" framing in Settings)
- Per-app sub-keys derived from your root identity — every site you grant login to sees a different `appPubkey`
- Apps that have logged you in are listed in Settings → Connected Apps; revocable individually or bulk

### Login consent
- `window.pear.login()` from any `hyper://` page → modal with per-scope toggles → CMD_LOGIN_RESOLVE
- Scopes: `profile:name`, `profile:avatar`, `profile:email`, `profile:website` (extendable)
- See [docs/SWARM-V1.md](./docs/SWARM-V1.md) for the surrounding identity model

### `window.pear.swarm.v1` (v0.3+)
- Direct Hyperswarm access for `hyper://` pages — full P2P, no proxy round-trip
- Three trust tiers: drive-derived topics (no prompt) · mint-then-rejoin · arbitrary topics (consent sheet)
- Per-app rate limits, 1 MB/s/peer cap, persistent grants in `swarm-grants.bee`
- Full spec: [docs/SWARM-V1.md](./docs/SWARM-V1.md)

### Settings
- **Identity:** public key, Backup Phrase, Restore from phrase
- **Profile:** display name, bio, avatar URL, website, email — opt-in fields apps see when you grant a login
- **Connected Apps:** per-app login grants list, revoke individually or all
- **Relays:** add / remove / mark-primary URLs · toggle hybrid-fetch vs pure-P2P · live capability advertisement pills showing version + region + transports (`hyperswarm` · `dht-relay-ws`) from `/.well-known/hiverelay.json`
- **Trusted peers, names, and Nostr:** manage trusted contacts, name sources, binding state, and bridge diagnostics
- **Device Sync:** browser-state sync primitives for tabs/bookmarks/settings across your own devices
- **Storage:** path, usage, clear cache, reset data (signed-unseed every pinned site first)

## Architecture

```
Renderer UI (React + htm, no build step)
  Browse / Apps / Publish / Library / Search / Names / Nostr / Settings
  iframe sandbox + page shims
        |
        | WebSocket (length-prefixed JSON) ws://127.0.0.1:9876
        v
Bare backend process
  HiveRelayClient, Hyperswarm, Corestore, Hyperdrive, Hyperbee, Autobase
  HyperProxy, HttpBridge, PearBridge, SwarmBridge
  CatalogManager, PersonalIndex, QueryPlanner, NameRegistry, Nostr stores
  Identity, profile, contacts, grants, browser-state sync, storage quota
```

Three independent keypairs — BIP-39 identity, HiveRelay publisher key, Corestore primaryKey — all with separate backup stories. Identity regeneration never bricks the store; storage resets never orphan your pinned sites (signed unseeds first).

## Documentation

| Document | What |
|---|---|
| [Architecture and capabilities](./docs/ARCHITECTURE_AND_CAPABILITIES.md) | Current system map for browser surfaces, runtime layers, catalogue, search, naming, Nostr, APIs, and validation. |
| [Deep audit](./docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md) | Detailed catalogue/search/naming/Nostr audit, issue list, fixes, and test evidence. |
| [Manual release smoke](./docs/MANUAL_RELEASE_SMOKE_2026-06-23.md) | Final human-run release checklist for UI flows, Peercord trust approval, mobile device smoke, and signing/store gates. |
| [Release evidence log](./docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md) | Operator-fillable proof table for final PASS/FAIL/DEFER release evidence and announcement decision. |
| [Test command matrix](./docs/TEST-COMMAND-MATRIX-2026-06-23.md) | Separates deterministic local checks from GUI, real-DHT, third-party trust, release-drive, and mobile/native gates. |
| [App compatibility standard](./docs/PEARBROWSER-APP-COMPAT-STANDARD.md) | Author-facing release contract for apps targeting desktop and mobile. |
| [Feature roadmap](./docs/P2P-BROWSER-FEATURE-ROADMAP.md) | Current shipped/next/parking-lot roadmap after the 2026 audit. |

## Develop

```sh
mkdir -p pear-ecosystem/00-core pear-ecosystem/01-browser
git clone https://github.com/bigdestiny2/p2p-hiverelay pear-ecosystem/00-core/hiverelay
git clone https://github.com/bigdestiny2/pearbrowser-desktop pear-ecosystem/01-browser/pearbrowser-desktop
cd pear-ecosystem/01-browser/pearbrowser-desktop
npm install
pear run --dev .
```

The desktop currently consumes HiveRelay as local workspace packages at `../../00-core/hiverelay/packages/{core,client,verifier}`. Those `0.16.3` packages are not published to npm yet, so the sibling checkout is required for community source installs until the relay packages are published.

UI files use htm + React (no build step). Backend in `backend/` is CommonJS. See `package.json` `pear` field for runtime config, and `pear.json` for multisig signing config.

## Release pipeline

Solo publisher, two steps:

```sh
./scripts/release-prod.sh         # pear stage --purge + pear release (deprecated path)
node scripts/pin-self-on-hiverelay.js   # re-pin the new length on relays
```

Catalogue updates are versioned from [`catalog-source/pearbrowser-network.catalog.json`](./catalog-source/pearbrowser-network.catalog.json):

```sh
node scripts/gen-catalogue-seed.mjs
node scripts/publish-catalog-bee.js catalog-source/pearbrowser-network.catalog.json --storage /Users/localllm/Projects/pear-ecosystem/03-sites/pearbrowser-publishers/catalog
node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm
```

`pear release` is deprecated in Pear runtime `v2.4.0` but still works and we use it deliberately — the replacement (`pear provision` + `pear multisig` quorum-cosigning) is designed for multi-publisher releases. A solo 1-of-1 multisig is pure ceremony with no security gain.

**When to migrate to multisig:** when we add a co-signer (genuine quorum security), or when Pear actually removes `pear release` (not just deprecates it). The link config + provision target are pre-staged in `pear.json` so the migration is just plumbing — see the `_comment` field there.

## Operator scripts

| Script | What |
|---|---|
| `scripts/pin-self-on-hiverelay.js` | Seed the desktop's own production drive on the HiveRelay backbone. Run after every release. |
| `scripts/publish-and-pin.js <dir>` | Publish a directory as a Hyperdrive + auto-pin to relays. |
| `scripts/unseed-drive.js <key>` | Send a signed unseed (publisher-only). |
| `scripts/extract-drive.js <key>` | Pull a drive's full content out to a local directory. |
| `scripts/list-drive.js <key>` | Diagnose what's inside a drive's manifest. |
| `scripts/check-relays.js` | Discovery probe — print all HiveRelays reachable via DHT. |
| `scripts/verify-pin.js --expect <length>` | Fresh-peer production-drive check: proves the released browser drive is reachable and serving at least the expected length. |
| `scripts/verify-release-contents.js --expect <length> --missing <path>` | Fresh-peer release metadata scan: proves ignored scratch/docs/scripts/tests paths are absent from the production drive after purge staging. |
| `scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm` | Fresh-peer Hyperbee catalogue check: proves the live app catalogue key is reachable and contains expected release rows and Peercord launch metadata. |
| `scripts/runtime-rpc-smoke.mjs` | Runtime GUI smoke: after launching PearBrowser, checks the diagnostic RPC path reports DHT, proxy, relay, peer-count, and storage readiness without becoming the renderer. |
| `scripts/verify-app-full.js --key <driveKey>` | Deeper fresh-peer blob sampling across a drive's file tree. |
| `scripts/verify-pear-bundle-contract.js --key <driveKey>` | Metadata-only Pear bundle contract check: reads `pear.json` and selected files from a fresh peer without executing third-party code. |
| `scripts/release-prod.sh` | The two-step release pipeline above. |

## Distribution

The `appling/` directory contains the multi-architecture native shell — Bare + CMake builds for macOS / Windows / Linux. Currently optional (most users `pear run` the production key); future v0.5+ will ship signed installers via `pear build` (Pear runtime v2.5.0+).

```sh
cd appling
npm i
bare-make generate
bare-make build                      # produces unsigned .app/.exe/.deb
```

Code signing is per-platform:
- macOS: `MACOS_SIGNING_IDENTITY` in `appling/CMakeLists.txt`
- Windows: `WINDOWS_SIGNING_SUBJECT` / `WINDOWS_SIGNING_THUMBPRINT`
- Linux: no signing required

## Companion projects

| Repo | What |
|---|---|
| [`bigdestiny2/hyper-fetch`](https://github.com/bigdestiny2/hyper-fetch) | ~5 KB JS library — read `hyper://` drives from any browser via the HiveRelay HTTP gateway. Pair with PearBrowser to embed hyper:// content in regular web pages. |
| [`bigdestiny2/hiveworm`](https://github.com/bigdestiny2/hiveworm) | Featured multiplayer life-sim. Uses `window.pear.swarm.v1` for direct peer gossip. Live at `pear://d1xbkcpc…`. |
| [`mastercodeon/Peercord`](https://git.churchofmalware.org/mastercodeon/Peercord) | Featured decentralized Discord-style chat. Current Pear release: `pear://wmir47w7…`, window-class desktop app. |
| [`bigdestiny2/P2P-Hiverelay`](https://github.com/bigdestiny2/P2P-Hiverelay) | The always-on relay backbone keeping the whole network alive; this desktop checkout currently consumes the local `0.16.3` workspace packages and verifies live relay compatibility through capability docs. |
| [`bigdestiny2/PearBrowser`](https://github.com/bigdestiny2/PearBrowser) | Mobile-focused sibling — iOS / Android port. Bare-kit-based. |

## Credits

Built on the Holepunch / Pear stack:

- [Pear Runtime](https://pears.com) — Bare JS + Chromium for desktop
- [Hyperswarm](https://github.com/holepunchto/hyperswarm) — peer discovery + NAT traversal
- [Hyperdrive](https://github.com/holepunchto/hyperdrive) — P2P filesystems
- [Hyperbee](https://github.com/holepunchto/hyperbee) — P2P key/value store
- [Corestore](https://github.com/holepunchto/corestore) — Hypercore multiplexing
- [HiveRelay](https://github.com/bigdestiny2/P2P-Hiverelay) — always-on pin infrastructure

## License

Apache-2.0 (upstream backend reuse) / MIT (desktop additions). See [LICENSE](./LICENSE).
