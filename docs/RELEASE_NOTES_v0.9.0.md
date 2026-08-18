# PearBrowser Desktop v0.9.0

PearBrowser v0.9.0 previews the browser-owned WDK wallet and repairs a Bare
boot regression that could leave the shell running with a dead HTTP proxy.

## Highlights

- **WDK wallet preview** (experimental, desktop-only, Stable Testnet only,
  off by default behind `experimentalWalletWdk`): a browser-owned Tether WDK
  wallet with its own BIP-39 seed, passphrase vault, one-shot mnemonic
  ceremonies in a dedicated Bare worker, policy ceilings and rate limits, an
  append-only sanitized journal, and chrome-owned consent prompts. Pages get
  `window.pear.wallet.v1` (connect, pay, sign-app, status, transaction,
  disconnect) through a manifest-gated, CSP-hash-authorized shim with
  per-document tokens — never direct key access. Specification:
  [WDK_WALLET_V0.9_SPEC.md](./WDK_WALLET_V0.9_SPEC.md).
- Wallet settings: create/import/backup with an enforced recovery ceremony,
  unlock/lock, balance and activity, connected apps with revoke, and payment
  consent that shows a pre-approval fee quote (estimated fee, hard maximum
  fee, maximum total debit) before any prompt opens.

## Fixed

- **Boot regression:** an inline `require('crypto')` in the wallet boot
  wiring threw `MODULE_NOT_FOUND` under Bare, killing boot after the wallet
  service came up — before `proxy.start()` — so browsing, catalogues, and the
  homepage were dead while the window looked alive. Bare-run sources now use
  `bare-*` builtins throughout, enforced by a static CI guard.
- Wallet backup ceremony could never complete from the settings UI; the UI
  now speaks the engine's outcome vocabulary and routes create/import
  straight into the backup ceremony.
- QVAC host dynamic-import runtime crash in the native AI path.
- The release-preflight HiveRelay layout guard accepts semver-range specs and
  is range-aware without a ReDoS-vulnerable regex.

## Trust and distribution note

The GitHub native workflow continues to produce package-proof assets with
SHA-256 sidecars. macOS Developer ID notarization and Windows public-trust
signing remain unavailable until production credentials are configured. The
wallet preview is testnet-only and never enabled by default.

## Verification

- Desktop: 928/928 tests (includes the new Bare-runtime require guard).
- Headless backend boot on a fresh store reaches proxy-ready;
  `runtime-rpc-smoke` passes (DHT connected, HiveRelay backbone reachable).
- `release-rpc-story-smoke --desktop-gui-stories --site-story` passes end to
  end: homepage HTTP 200 through the local proxy, 2 catalogues / 14
  aggregated apps, all featured rows (Keet, PearPass, anonGPT, Paste,
  Peercord), Peercord native-migration contract, local search, curated +
  petname naming, bookmark/session round-trips with diagnostic reconnect,
  Nostr trusted-contact proof, and a temporary site publish/fetch/delete with
  HiveRelay unseed cleanup — 10 release evidence rows.
