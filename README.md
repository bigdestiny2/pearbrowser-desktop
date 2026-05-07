# PearBrowser Desktop

A peer-to-peer browser, app store, and site publisher for macOS, Windows, and Linux, built on the Pear Runtime.

No servers. No accounts. No CDN. Sites are Hyperdrives, addressed by public key, pinned 24/7 on the HiveRelay network.

## Run it

```sh
npm i -g pear
pear
pear run pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty
```

One install, one key, works on all three desktop platforms — Pear downloads the matching native runtime on first launch. The key above is the **production channel**: every `pear release production` updates what it serves, so you always get the latest cut without re-copying a link.

## What's inside

- **Multi-tab Browse** — `⌘T` / `⌘W` / `⌘L` / `⌘1`–`⌘9`. `hyper://` URL bar, hex and z-base-32 drive keys, localhost HTTP proxy, per-tab back/forward history, devtools button (`⌘⇧I`)
- **Apps** — paste any `pear://` link to launch a Pear app in its own window, or load a decentralized catalog (Hyperdrive) to install / launch / uninstall. Recent catalogs are remembered across launches.
- **P2P Sites** — block editor (headings, paragraphs, images, lists, quotes, code, raw HTML, divider). Publish creates a Hyperdrive, broadcasts an Ed25519-signed HiveRelay seed request with the drive's keyed-BLAKE2b discoveryKey, and uses the SDK's `waitForDurable()` to confirm at least one relay has actually replicated the content before reporting success. Delete sends a signed unseed.
- **Library** — bookmarks and history in a local Hyperbee
- **Identity** — BIP-39 backup phrase + restore-from-phrase. Per-app sub-keys derived from your root identity.
- **Profile** — display name, bio, avatar, website, email — opt-in fields apps see when you grant a sign-in
- **Connected Apps** — view and revoke per-app login grants
- **Login consent** — `window.pear.login()` from any `hyper://` page shows a modal where you pick which scopes to grant
- **Relays** — add / remove / mark-primary; toggle hybrid-fetch vs pure-P2P

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
