# PearBrowser Desktop

A local-first peer-to-peer browser, app store, search engine, naming layer, Nostr bridge, and site publisher for macOS, Windows, and Linux, built on the Pear Runtime.

**No accounts. No DNS. Local-first data.** Sites are addressed by stable Hyperdrive keys and can be pinned on the [HiveRelay](https://github.com/bigdestiny2/P2P-Hiverelay) backbone. Native applications are installed from verified packages; a catalogue never turns a remote executable link into a runtime command.

**HiveRelay compatibility baseline:** the relay fleet/source stable line is
HiveRelay `v0.24.3`. HiveRelay never published exact `0.24.3` npm packages, so
PearBrowser's reproducible bundled client dependencies remain on the compatible
npm `0.20.2` line and CI guards that fact explicitly. Network compatibility is
verified through signed capability documents rather than by pretending those
two distribution versions are the same. The `v0.25.0-rc.*` fleet and separate
blind-substrate track remain candidate/development opt-ins; neither is required
or presented as stable by PearBrowser `v0.9.1`.

**Current release:** `v0.9.1`. This corrective release makes the embedded-Electron window render (the shell is now an esbuild bundle — bare specifiers never resolved over `file://`), stops the renderer racing backend boot, and repairs the Settings relay capability checks (`bare-https` has no `get()` shorthand). It retains everything from `v0.9.0`: the experimental WDK wallet preview (desktop-only, Stable Testnet only, off by default behind `experimentalWalletWdk`; see [docs/WDK_WALLET_V0.9_SPEC.md](./docs/WDK_WALLET_V0.9_SPEC.md)), the Bare boot fix, the embedded Pear v3 runtime backend, host-confirmed `pear-install` native delivery separate from browsable `hyper://` content, signed catalogue submission/moderation receipts, private search, reconnect-safe RPC, Content Shield, Pear Plugins, and the local-first catalogue/search/naming stack. See [docs/RELEASE_NOTES_v0.9.1.md](./docs/RELEASE_NOTES_v0.9.1.md).

**Current architecture:** start with [docs/ARCHITECTURE_AND_CAPABILITIES.md](./docs/ARCHITECTURE_AND_CAPABILITIES.md). The deeper catalogue/search/naming/Nostr audit is in [docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md](./docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md).

## Install it

Primary desktop distribution is now native GitHub release packages. The
`v0.9.1` release targets macOS, Windows, and Linux assets with SHA-256 sidecars
and platform manifests. Download from the
[`v0.9.1` release](https://github.com/bigdestiny2/pearbrowser-desktop/releases/tag/v0.9.1),
follow the [native install guide](./docs/INSTALL_NATIVE_PACKAGES.md), or resolve
the recommended asset for your machine from a source checkout:

```sh
npm run resolve:native-release -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop
```

The current package targets match the `cmake-pear` appling toolchain:

- macOS: `PearBrowser-<version>-macos-arm64.app.zip` and `PearBrowser-<version>-macos-x64.app.zip` now; public-trust runs create signed/notarized `.dmg` assets once Developer ID credentials are wired in
- Windows: `PearBrowser-<version>-windows-x64.msix` now
- Linux: `PearBrowser-<version>-linux-x64.AppImage` now, distro packages such as `.deb` later if demand warrants them

The retained PearBrowser `upgrade` key is a **migration record** until the v3
production provision/multisig quorum is independently verified; it is not an
install instruction in the catalogue. PearBrowser never passes a remote link
to `PearRuntime.run()`. Keep legacy data intact, install the native package for
your platform, and use the migration guidance in
[docs/PEAR_V3_MIGRATION.md](./docs/PEAR_V3_MIGRATION.md).

## What's inside

### Browse
- Multi-tab browsing with proper keyboard shortcuts: `⌘T` new tab · `⌘W` close · `⌘L` focus URL bar · `⌘1`–`⌘9` switch · `⌘R` reload · `⌘⇧I` devtools
- `hyper://` URL bar accepting hex (64-char) or z-base-32 (52-char) keys
- Localhost HTTP proxy resolves Hyperdrive content for the Chromium engine
- Per-tab back/forward history; tabs persist across launches and survive panel switches
- URL bar autocomplete from your bookmarks + history Hyperbees (↑↓ to navigate, Enter to pick)
- "About this site" panel (ⓘ button): drive key in hex + z-base-32 with copy buttons, scheme + path, one-click bookmark toggle
- **Private-search home:** the active first tab on launch opens a browser-owned search page powered by DuckDuckGo. PearBrowser sends no search analytics and excludes submitted queries from the optional persistent visit log; the on-page disclosure makes clear that DuckDuckGo still receives the query and network address, and that private search is not anonymity.
- **Ask Browser:** click **✦ Ask** to question a local QVAC/Qwen model about the active page, with private on-device streaming, cancellation, short follow-ups, source provenance, and no page access to the browser-owned AI channel
- **Local AI widget:** every blank new tab (`⌘T`) hosts a QVAC quick-ask card — zero page context, streamed on-device answers, model picker, and load-on-first-use progress ([docs](./docs/ASK_BROWSER.md))
- **Content Shield:** Brave-style ad/tracker blocking enforced inside the browser-owned proxy — blocked requests never reach a peer, relay, or the network; cosmetic element hiding + scriptlets ride the CSP-safe HTML injection path; per-drive allowlist/strict modes, toggle + live counters in Settings ([plan](./docs/BROWSER_PARITY_PLAN.md))
- **P2P filter lists:** subscribe to a filter-list Hyperdrive by key — rules sync peer-to-peer with SHA-256 verification, hot-swap when the publisher updates, and keep blocking fully offline; the default list is live at `842fb9e6…` and you can publish your own with `scripts/build-shield-list.mjs` + `scripts/publish-and-pin.js` ([guide](./filter-lists/README.md))
- **Pear Plugins:** extensions as Hyperdrives with declared capabilities (`pear.content.styles/scripts`, `pear.net.filter`) — install by drive key, contributions inject hash-authorized, and a swarm update that requests new capabilities is auto-disabled pending re-approval; Pear Dark Reader and peerit Enhancer are published and pinned
- **Plugin catalogue:** one-click discovery in Settings — curated entries install without pasting keys, `kind: "app"` entries like **anonGPT** open directly as P2P apps, and additional catalogues load from any drive with a `/plugins.json`; the public catalogue is live at `01b74736…`

### Apps
- Open `hyper://` sites in a browser tab.
- Install an explicitly configured Pear v3 build through a host-confirmed native action. Catalogue rows use `nativeDelivery: { status: "available", kind: "pear-v3", installLink: "pear://…" }`; the installed app owns its own runtime, storage, windows, and OTA lifecycle.
- A top-level `pear://` or `file://` row remains a **legacy migration record**. PearBrowser never sends catalogue values to `PearRuntime.run()`.
- Native Pear apps and installed Hyperdrive sites are tracked separately: sites launch through the tab proxy, while native apps launch through the operating system.
- Load decentralized catalogues from Hyperdrive JSON, signed Hyperbee, Autobee, schema-sheets rooms, HiveRelay index rooms, default curated seeds, community submissions, and your own writable catalogues
- Keep multiple catalogs loaded at once with search, category, and source filters across the aggregated app store
- **My Catalog:** create a writable personal catalog, add apps from loaded catalogs or installed apps, rename it, edit saved metadata (name, description, version, author, categories), and share the catalog key; copies opened without the writer key stay read-only
- Safe catalogue normalization accepts `apps[]`, `items[]`, or `entries[]`, classifies `hyper://` as browsable content, classifies compatible signed package releases for install, retains `pear://`/`file://` only for migration, rejects malformed targets, and strips prototype-pollution keys before rendering
- Default catalog auto-loads on first Apps-tab visit (the "PearBrowser Network" Hyperbee `hyperbee://f5fb7500bccd…` — PearBrowser, peerit, HiveRelay, P2P Builders, Pear Dealroom, Paste, PearPoker, Keet, PearPass, Peercord, anonGPT, Pear POS, Pear Tickets, HiveWorm), generated from a single source manifest and mirrored into the offline seed
- **peerit — "the front page of the P2P internet"** (a peer-to-peer Reddit, `hyper://ec6e2d6d…/`): a browsable `hypersite` whose communities, posts, threaded comments and votes live in a shared Autobase+Hyperbee log. It opens as the **active front tab on every fresh launch** (alongside the landing page) and is **pinned to the top** of the Sites discovery grid. Source: `02-apps/peerit`.
- Featured projects include **Keet**, **PearPass**, **anonGPT**, **Paste**, and **[Peercord](https://git.churchofmalware.org/mastercodeon/Peercord)**. Legacy Pear desktop releases remain visible as migration-required records until their owners publish compatible native v3 package metadata.

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
- Private web search is available from the browser-owned home page through DuckDuckGo over HTTPS with Content Shield enabled; PearBrowser does not send search analytics or add these queries to its optional persistent visit log.
- Local-first personal index returns first-paint results immediately from local browser/catalogue data
- Optional trusted-peer federation enriches results in the background through `QueryPlanner`, digest checks, provenance, and stale-query suppression
- Local-index query length and result limits are bounded; local queries do not leave the device unless the user asks for federated search. Web-search submissions do leave the device for DuckDuckGo, as disclosed on the home page.

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
| [Ask Browser](./docs/ASK_BROWSER.md) | Local-model side panel, Ollama/Qwen discovery, authenticated page-context capture, stream RPC, safety boundaries, and verification. |
| [QVAC native AI](./docs/QVAC_NATIVE_AI.md) | Native Bare/QVAC runtime, model aliases, browser-page AI API, security limits, and smoke commands. |
| [Browser parity plan](./docs/BROWSER_PARITY_PLAN.md) | Roadmap to Brave-grade capability: Content Shield phases, P2P filter lists, the Pear Plugins extension model, and the clearnet session bridge. |
| [Filter lists & plugins guide](./filter-lists/README.md) | Publishing and subscribing to P2P filter-list drives, and packaging/installing Pear Plugins with the capability-escalation guard. |
| [Deep audit](./docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md) | Detailed catalogue/search/naming/Nostr audit, issue list, fixes, and test evidence. |
| [Manual release smoke](./docs/MANUAL_RELEASE_SMOKE_2026-06-23.md) | Final human-run release checklist for UI flows, Peercord trust approval, mobile device smoke, and signing/store gates. |
| [Native install guide](./docs/INSTALL_NATIVE_PACKAGES.md) | User-facing package selection, checksum verification, and OS-specific install steps for the current native assets. |
| [Packaging strategy](./docs/PACKAGING_STRATEGY_2026-06-28.md) | Desktop packaging lanes, public-trust signing/notarization gates, and channel expansion plan. |
| [Release evidence log](./docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md) | Operator-fillable proof table for final PASS/FAIL/DEFER release evidence and announcement decision. |
| [Test command matrix](./docs/TEST-COMMAND-MATRIX-2026-06-23.md) | Separates deterministic local checks from GUI, real-DHT, third-party trust, release-drive, and mobile/native gates. |
| [App compatibility standard](./docs/PEARBROWSER-APP-COMPAT-STANDARD.md) | Author-facing release contract for apps targeting desktop and mobile. |
| [Community review process](./docs/COMMUNITY_REVIEW_PROCESS.md) | Submission queue, due-diligence evidence, guarded relay decisions, audit records, and the separate catalogue-publication gate. |
| [Feature roadmap](./docs/P2P-BROWSER-FEATURE-ROADMAP.md) | Current shipped/next/parking-lot roadmap after the 2026 audit. |

## Develop

```sh
mkdir -p pear-ecosystem/01-browser
git clone https://github.com/bigdestiny2/pearbrowser-desktop pear-ecosystem/01-browser/pearbrowser-desktop
cd pear-ecosystem/01-browser/pearbrowser-desktop
npm install
npm run start # fails closed until the embedded v3 runtime host is configured
```

Source installs are standalone. The desktop packages default to npm `latest` for HiveRelay; the root package defaults to npm `latest` for `p2p-hiverelay`, `p2p-hiverelay-client`, and `p2p-hiverelay-verifier`, with the current dist-tag resolving to `0.20.2` in the lockfile, so a clone of just this repo resolves them from the registry. `npm install` runs `scripts/check-hiverelay-layout.mjs`, which exits quietly for the registry line and fails only if the HiveRelay dependency/lockfile line drifts or you opt into incomplete/mismatched `file:` workspace dependencies. The guard accepts either the `latest` dist-tag or an explicit semver range (for example `^0.26.0`) for those three specs, so the pins can move to a numbered release line without the `preinstall` hook blocking installs; it still refuses dist-tags other than `latest`, `npm:` aliases, git/`http(s)` specs, and bare wildcards. A sibling `../../00-core/hiverelay` checkout is optional and only needed for HiveRelay co-development.

UI files use htm + React (no build step). Backend in `backend/` is CommonJS. The source checkout starts through the native Electron + embedded Pear v3 host; it does not accept remote app links as worker input. Third-party Pear v3 builds install through the narrow Electron-main `pear-install` boundary and then launch as ordinary OS applications.

## Release pipeline

The checked-in command is a native-release **preflight**, not a publisher:

```sh
bash ./scripts/release-prod.sh    # local v3 release evidence checks only
```

Catalogue updates are versioned from [`catalog-source/pearbrowser-network.catalog.json`](./catalog-source/pearbrowser-network.catalog.json):

```sh
node scripts/gen-catalogue-seed.mjs
node scripts/publish-catalog-bee.js catalog-source/pearbrowser-network.catalog.json --storage ~/pear-ecosystem/03-sites/pearbrowser-publishers/catalog
node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm
```

The preflight never stages or publishes a release. Promotion requires a signed
native package, an AppRelease v2 record, independent availability evidence, and
human approval of clean-install, upgrade, rollback, and data-continuity proof.

## Operator scripts

| Script | What |
|---|---|
| `scripts/pin-self-on-hiverelay.js <64-hex-key>` | Pin an explicit non-executable content or release-evidence drive on HiveRelay. Availability does not approve a package. |
| `scripts/publish-and-pin.js <dir>` | Publish a directory as a Hyperdrive + auto-pin to relays. |
| `scripts/unseed-drive.js <key>` | Send a signed unseed (publisher-only). |
| `scripts/extract-drive.js <key>` | Pull a drive's full content out to a local directory. |
| `scripts/list-drive.js <key>` | Diagnose what's inside a drive's manifest. |
| `scripts/check-relays.js` | Discovery probe — print all HiveRelays reachable via DHT. |
| `scripts/verify-pin.js --key <64-hex> --expect <length> --hiverelay` | Fresh-peer content/evidence-drive check plus optional HiveRelay `proveSeeded` evidence when upgraded relays expose storage-proof. |
| `scripts/verify-release-contents.js --expect <length> --missing <path>` | Fresh-peer release metadata scan: proves ignored scratch/docs/scripts/tests paths are absent from the production drive after purge staging. |
| `scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm` | Fresh-peer Hyperbee catalogue check: proves the live app catalogue key is reachable and contains expected release rows and Peercord launch metadata. |
| `scripts/runtime-rpc-smoke.mjs` | Runtime GUI smoke: after launching PearBrowser, checks the diagnostic RPC path reports DHT, proxy, relay, peer-count, and storage readiness without becoming the renderer. |
| `scripts/release-rpc-story-smoke.mjs --desktop-gui-stories --json` | Runtime story smoke: after launching PearBrowser, proves automatable desktop GUI/user-story rows and emits release-evidence row suggestions without approving trust prompts or launching third-party Pear apps. |
| `scripts/check-hiverelay-layout.mjs` | Confirms HiveRelay installs from npm (the `latest` dist-tag or an explicit semver range, lockfile `0.20.2`) for standalone source installs; validates the sibling checkout only when `file:` HiveRelay dependencies are used. |
| `npm run resolve:native-release -- --tag <tag>` | Prints the recommended native release package and SHA-256 sidecar for the current or requested platform/architecture. |
| `npm run verify:native-downloads -- --tag <tag> --all` | Downloads the recommended native packages and verifies each package against its `.sha256` sidecar. |
| `npm run check:linux-appimage-metadata` | Verifies Linux AppImage desktop integration metadata source files, and can inspect a built AppDir/AppImage with `--build-dir`, `--appdir`, or `--appimage`. |
| `npm run -s generate:native-signing-secret-plan` | Emits the public-trust GitHub Actions secret inventory, guarded `gh secret set` command templates, and follow-up signing/readiness checks. |
| `npm run -s generate:native-install-snippet -- --tag <tag>` | Emits release-note/install-page Markdown for the recommended desktop packages and checksum sidecars. |
| `npm run -s generate:native-install-guide -- --tag <tag>` | Emits the full user-facing native install guide with direct package and checksum links. |
| `npm run -s generate:native-install-smoke-plan -- --tag <tag>` | Emits clean-host install smoke commands, source-free runtime diagnostics, and evidence bullets for macOS, Windows, and Linux. |
| `npm run -s generate:origin-isolation-smoke-evidence -- --plan docs/origin-isolation-smoke-plan-peerit-pearfeed-2026-07-02.json --out docs/origin-isolation-smoke-evidence-peerit-pearfeed-2026-07-04.json --json` | Runs the automated Peerit/Pearfeed per-drive-origin verifier and writes the evidence artifact consumed by `check:origin-isolation-smoke-evidence`. |
| `npm run generate:package-manager-manifests -- --tag <tag>` | Emits Homebrew Cask and WinGet manifest drafts from release assets; defaults to public-trust gates. |
| `npm run check:public-trust-readiness -- --tag <tag>` | Aggregates the public-trust signing, published asset, download, Linux metadata, clean-install smoke-plan, package-manager draft, and evidence-log gates; pass `--source-ref` to pin the clean-host runtime smoke helper and `--signing-secret-source github` to verify GitHub Actions secret names before dispatching CI. |
| `npm run -s generate:public-trust-operator-report -- --tag <tag>` | Formats the public-trust readiness state into a Markdown handoff with grouped blockers and exact next commands, including the release-evidence handoff. |
| `npm run -s generate:release-evidence-handoff` | Formats the operator evidence log into grouped manual rows with copy-ready PASS/DEFER templates; pass `--story-smoke-json <file>` to prefill rows from release story smoke JSON. |
| `npm run check:release-evidence` | Reads the operator evidence log and fails until required gates are marked `PASS` or documented `DEFER`, with a final announcement decision. |
| `scripts/verify-app-full.js --key <driveKey>` | Deeper fresh-peer blob sampling across a drive's file tree. |
| `scripts/verify-pear-bundle-contract.js --key <driveKey>` | Metadata-only Pear bundle contract check: reads `pear.json` and selected files from a fresh peer without executing third-party code. |
| `scripts/release-prod.sh` | Fail-closed v3 native-release preflight; it never publishes. |

## Distribution

The `appling/` directory contains the multi-architecture native shell — Bare + CMake builds for macOS / Windows / Linux. GitHub release assets are produced by `.github/workflows/desktop-native-release.yml`, which builds the appling on hosted macOS, Windows, and Linux runners, collects the native artifacts, writes SHA-256 sidecars, and attaches them to the matching release tag. Run the workflow manually with tag `v0.9.1` and `source_ref` set to the release commit to produce or refresh the attached release assets.

Current generated artifacts are `.app.zip` on macOS, `.msix` on Windows, and `.AppImage` on Linux. The workflow uses `npm ci --prefix appling`, so update `appling/package-lock.json` deliberately when the native wrapper toolchain changes.

```sh
npm run check:appling-release -- --tag v0.9.1
npm run check:linux-appimage-metadata
npm run resolve:native-release -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop
npm run -s generate:native-signing-secret-plan -- --repo bigdestiny2/pearbrowser-desktop --tag v0.9.1 --source-ref <release-commit>
npm run -s generate:native-install-snippet -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop
npm run -s generate:native-install-guide -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop
npm run -s generate:native-install-smoke-plan -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop --source-ref <release-commit>
npm run generate:package-manager-manifests -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop --trust-mode package-proof
npm run check:native-signing -- --require-public-trust --secret-source github --repo bigdestiny2/pearbrowser-desktop
npm run check:public-trust-readiness -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop --source-ref <release-commit> --signing-secret-source github
npm run -s generate:public-trust-operator-report -- --tag v0.9.1 --repo bigdestiny2/pearbrowser-desktop --source-ref <release-commit> --signing-secret-source github
npm run -s generate:release-evidence-handoff
cd appling
npm ci
npm run generate
npm run build
cd ..
npm run package:appling -- --tag v0.9.1
```

Code signing is per-platform:
- macOS: ad-hoc signed by default; use `PEARBROWSER_MACOS_SIGNING_IDENTITY` /
  `PEARBROWSER_MACOS_SIGNING_KEYCHAIN` plus notarization for public Developer ID releases
- Windows: unsigned MSIX packaging by default; set
  `PEARBROWSER_WINDOWS_SIGNING_SUBJECT` /
  `PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT` after importing a certificate for
  public signed releases
- Linux: no signing required

The native release workflow has two modes. Manual runs default to
`release_mode=package-proof` for ad-hoc/unsigned packaging validation. Use
`release_mode=public-trust` for announcement-ready assets; release-published and
tag-triggered runs default to that mode and fail closed unless macOS Developer
ID/notary and Windows signing credentials are configured.

## Companion projects

| Repo | What |
|---|---|
| [`bigdestiny2/hyper-fetch`](https://github.com/bigdestiny2/hyper-fetch) | ~5 KB JS library — read `hyper://` drives from any browser via the HiveRelay HTTP gateway. Pair with PearBrowser to embed hyper:// content in regular web pages. |
| [`bigdestiny2/hiveworm`](https://github.com/bigdestiny2/hiveworm) | Featured multiplayer life-sim. Uses `window.pear.swarm.v1` for direct peer gossip; its legacy native release needs a verified v3 package. |
| [`mastercodeon/Peercord`](https://git.churchofmalware.org/mastercodeon/Peercord) | Featured decentralized Discord-style chat. Its legacy desktop release needs a publisher-provided verified v3 package. |
| [`bigdestiny2/P2P-Hiverelay`](https://github.com/bigdestiny2/P2P-Hiverelay) | The always-on relay backbone keeping the whole network alive; this desktop checkout consumes the compatible `0.20.2` npm packages and verifies live relay compatibility through capability docs. |
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

Apache-2.0 AND MIT: upstream backend reuse remains Apache-2.0 and desktop additions are MIT. See [LICENSE](./LICENSE).
