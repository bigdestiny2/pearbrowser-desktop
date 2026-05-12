# PearBrowser Desktop

A peer-to-peer browser, app store, and site publisher for macOS, Windows, and Linux, built on the Pear Runtime.

**No accounts. No DNS. No servers.** Sites are Hyperdrives, addressed by public key, pinned 24/7 on the [HiveRelay](https://github.com/bigdestiny2/P2P-Hiverelay) backbone. The publisher's laptop being offline doesn't matter — the relays carry the bytes.

**Current release:** `v0.4.2` · production length `4909` · pinned on 5 relays · 365-day TTL.

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
- Load a decentralized catalog Hyperdrive → install / launch / uninstall apps
- Default catalog auto-loads on first Apps-tab visit (`hyper://0c35d12fd9b1…/` — featuring PearBrowser, HiveRelay, P2P Builders)
- Featured apps: **Keet** · **PearPass** · **[HiveWorm](https://github.com/bigdestiny2/hiveworm)** (a multiplayer life-sim that uses `window.pear.swarm.v1` directly)

### Publish (P2P Sites)
- Block editor: heading, paragraph, image, link, list, quote, code, raw HTML/CSS/JS, divider
- One-click publish + auto-pin to HiveRelay
- Replication confirmation — the editor only reports "published" after `waitForDurable()` confirms at least one relay has actually replicated the drive
- Drive identified by keyed-BLAKE2b discoveryKey (fixed in HiveRelay 0.8.0; we ship `0.8.5`)
- Ed25519-signed unseed for revocation

### Library
- Bookmarks + history stored in a local Hyperbee (private, local-only by default)
- Cross-launch persistence; powers the URL-bar autocomplete

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
- **Relays:** add / remove / mark-primary URLs · toggle hybrid-fetch vs pure-P2P · live capability advertisement pills showing version + region + transports (`hyperswarm` · `dht-relay-ws`)
- **Storage:** path, usage, clear cache, reset data (signed-unseed every pinned site first)

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Chromium renderer  (React + htm, no build step)         │
│  - Multi-tab Browse / Apps / Sites / Library / Settings  │
│  - window.pear.swarm.v1 / window.pear.login() in iframes │
└────────────────────────────┬─────────────────────────────┘
                             │ WebSocket (length-prefixed JSON) ws://127.0.0.1:9876
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Bare main process                                       │
│  ├── HiveRelayClient        (Protomux, signed seed/unseed, 0.8.5)
│  ├── Hyperswarm             (HyperDHT + UDX)
│  ├── Corestore              (auto-managed primaryKey, decoupled from identity)
│  ├── Hyperdrive             (per-site namespace)
│  ├── Hyperbee × 5           (bookmarks, history, profile, contacts, swarm-grants)
│  ├── Identity               (BIP-39 entropy → ed25519 root → per-app sub-keys)
│  ├── SwarmBridge            (per-page swarm.v1 channels + tier policy)
│  └── HyperProxy             (http://127.0.0.1:PORT/hyper/<key>/path)
└──────────────────────────────────────────────────────────┘
```

Three independent keypairs — BIP-39 identity, HiveRelay publisher key, Corestore primaryKey — all with separate backup stories. Identity regeneration never bricks the store; storage resets never orphan your pinned sites (signed unseeds first).

## Develop

```sh
git clone https://github.com/bigdestiny2/pearbrowser-desktop
cd pearbrowser-desktop
npm install
pear run --dev .
```

UI files use htm + React (no build step). Backend in `backend/` is CommonJS. See `package.json` `pear` field for runtime config, and `pear.json` for multisig signing config.

## Release pipeline

Solo publisher, two steps:

```sh
./scripts/release-prod.sh         # pear stage + pear release (deprecated path)
node scripts/pin-self-on-hiverelay.js   # re-pin the new length on relays
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
| [`bigdestiny2/P2P-Hiverelay`](https://github.com/bigdestiny2/P2P-Hiverelay) | The always-on relay backbone keeping the whole network alive (`v0.8.6`). |
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
