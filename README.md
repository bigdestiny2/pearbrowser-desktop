# PearBrowser Desktop

A peer-to-peer browser, app store, and site publisher for macOS, Windows, and Linux, built on the Pear Runtime.

No servers. No accounts. No CDN. Sites are Hyperdrives, addressed by public key, pinned 24/7 on the HiveRelay network.

## Run it

```sh
npm i -g pear
pear
pear run pear://1gkr4ak5c4itbuhzz43zaapjgpkxat9n55hqzq3wzzp3dn4fgrpo
```

One install, one key, works on all three desktop platforms — Pear downloads the matching native runtime on first launch.

## What's inside

- **Browse** — `hyper://` URL bar, hex and z-base-32 drive keys, localhost HTTP proxy, streaming peer discovery
- **Apps** — paste any `pear://` link to launch a Pear app in its own window, or load a decentralized catalog (Hyperdrive) to install / launch / uninstall
- **P2P Sites** — block editor (headings, paragraphs, images, lists, quotes, code, raw HTML, divider), publish creates a Hyperdrive + broadcasts Ed25519-signed HiveRelay seed request + waits for replication, delete sends signed unseed
- **Library** — bookmarks and history in a local Hyperbee
- **Settings** — BIP-39 identity backup, connected relay count, storage usage, danger-zone reset-with-unseed

## Architecture

```
Chromium renderer (React UI)
    │ WebSocket (length-prefixed JSON) ws://127.0.0.1:9876
    ▼
Bare main process
    ├── HiveRelayClient        (Protomux, signed seed + unseed)
    ├── Hyperswarm             (HyperDHT peer discovery)
    ├── Corestore              (auto-managed primaryKey)
    ├── Hyperdrive             (per-site namespace)
    ├── Hyperbee               (bookmarks, history, profile)
    ├── Identity               (BIP-39 → Ed25519 publisher keypair)
    └── HyperProxy             (http://127.0.0.1:PORT/hyper/KEY/path)
```

Three independent keypairs — BIP-39 identity, HiveRelay publisher key, Corestore primaryKey — all with separate backup stories. Identity regeneration never bricks the store; storage resets never orphan your pinned sites (signed unseeds first).

## Develop

```sh
git clone https://github.com/bigdestiny2/pearbrowser-desktop  # or your fork
cd pearbrowser-desktop
npm install
pear run --dev .
```

`.js` UI files use htm + React (no build step). Backend in `backend/` is CommonJS. See `package.json` `pear` field for runtime config.

## Native installers

```sh
cd appling
npm i
bare-make generate
bare-make build                                   # produces unsigned .app/.exe/.deb
```

Code signing is per-platform:
- macOS: add `MACOS_SIGNING_IDENTITY` in `appling/CMakeLists.txt`
- Windows: add `WINDOWS_SIGNING_SUBJECT` / `WINDOWS_SIGNING_THUMBPRINT`
- Linux: no signing required

## Stage and release your own fork

```sh
pear stage production .
pear release production .
```

## Credits

Forked from [bigdestiny2/PearBrowser](https://github.com/bigdestiny2/PearBrowser) (the mobile-focused project). Built on:

- [Pear Runtime](https://pears.com) — Bare + Chromium for desktop
- [Hyperswarm](https://github.com/holepunchto/hyperswarm), [Hyperdrive](https://github.com/holepunchto/hyperdrive), [Corestore](https://github.com/holepunchto/corestore), [Hyperbee](https://github.com/holepunchto/hyperbee)
- [HiveRelay](https://github.com/bigdestiny2/P2P-Hiverelay) — always-on pin infrastructure

## License

Apache-2.0 (upstream backend reuse) / MIT (desktop additions). See LICENSE.
