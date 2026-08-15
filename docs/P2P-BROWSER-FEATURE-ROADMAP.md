# P2P Browser Feature Roadmap

Last updated: 2026-08-13

This roadmap tracks the current browser direction after the catalogue, search,
naming, Nostr, and mobile-parity audit. For a system map, see
[ARCHITECTURE_AND_CAPABILITIES.md](./ARCHITECTURE_AND_CAPABILITIES.md). For the
full audit log and issue evidence, see
[DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md](./DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md).

## Current Shape

PearBrowser Desktop now has the substrate for a P2P-native browser rather than
only a `hyper://` viewer:

- Browse: multi-tab browsing, URL normalization, history, bookmarks,
  autocomplete, session persistence, site inspection, and Hyperdrive proxying.
- Apps: aggregated catalogues from Hyperdrive JSON, signed Hyperbee, Autobee,
  schema-sheets, HiveRelay index rooms, default curated seeds, community rows,
  and writable personal catalogues.
- Search: local-first personal index plus optional trusted-peer federation with
  digest checks, provenance, stale-query suppression, and bounded query limits.
- Naming: local petnames, owned name registry records, trusted-contact
  federation, curated aliases, Unicode normalization, and `pearname://`.
- Nostr: deterministic identity binding, local event store, ingest, revocation,
  trusted-contact feed aggregation, and hidden diagnostics.
- Runtime APIs: `window.pear.login`, identity signing, sync, swarm.v1,
  contacts, `/api/*`, and gated anonGPT inference.
- Settings: identity, profile, connected apps, relays, trusted peers, device
  sync, Nostr, names, experimental capabilities, storage cleanup, and reset.
- Tests: v0.8 release evidence records desktop at 700/700 and mobile at 566/566;
  the current head and high-severity dependency audits must be rerun for every
  release candidate.

## Shipped Since The Original Roadmap

- Drive/site inspection moved from placeholder to live metadata and copy flows.
- Permission and grants surfaces are visible in Settings.
- Session restore and tab persistence were hardened.
- Default catalogue auto-load, catalog source aggregation, and My Catalog are
  implemented.
- Profile `name`/`displayName` drift and settings shape drift were fixed in
  the audited paths.
- Automated test coverage exists for the root desktop repo and targeted mobile
  contracts.
- Catalogue safety now covers malformed envelopes, link-only rows, prototype
  pollution, signed Hyperbee fallback, and app search.
- Search, naming, and Nostr moved from research-only documents into tested
  backend modules and UI/Settings flows.

## Near-Term Priorities

1. **Public documentation and website polish**
   - Keep both GitHub READMEs aligned with the current architecture.
   - Keep the app compatibility standard in sync with desktop/mobile behavior.
   - Add screenshots or short demos once the release candidate UI settles.

2. **Catalogue operator UX**
   - Show signed-catalog verification status and fallback reason in the Apps UI.
   - Add clearer author feedback when a schema-sheets row fails validation.
   - Expose index-room provenance and relay capability diagnostics without
     overwhelming normal users.

3. **Search quality and transparency**
   - Improve ranking explanations for local vs federated results.
   - Add source filters and provenance chips consistently across result types.
   - Continue measuring first-paint latency and federation verification budget.

4. **Naming trust UX**
   - Make local petname, contact assertion, and curated alias provenance obvious.
   - Add conflict-resolution UI for competing trusted names.
   - Expand homograph warnings and unsafe-target copy.

5. **Nostr bridge hardening**
   - Surface binding state and revoke status in a compact Settings view.
   - Keep public-relay behavior out of scope unless deliberately productized.
   - Add import/export diagnostics for trusted-contact feed troubleshooting.

6. **Mobile parity handoff**
   - Keep the mobile README and architecture doc explicit about what is desktop
     only today: federated search, naming registry, and Nostr bridge.
   - Continue source-contract tests for native SwiftUI/Compose shells.
   - Decide whether mobile should eventually honor desktop `type` semantics or
     formally remain static-drive-first.

## Medium-Term Tracks

- P2P workspaces: named tab groups, notes, files, and optional Hyperdrive share.
- Encrypted device sync: tabs, bookmarks, history, settings, profile, contacts.
- Trust center: publisher identity, manifest permissions, release history,
  relay/pin durability, known contacts, and block/revoke controls.
- Local-first sharing: page, text, bookmark folder, workspace, or draft shared
  directly to a trusted contact.
- Downloads with seeding: resumable verified downloads that can become seeded
  Hyperdrive content.
- Developer diagnostics: active drives, swarm channels, relay health, sync
  groups, Autobase writers, API tokens, and grants.

## Next Release — v0.9 WDK Wallet Preview

**Status: implemented in source** (engine, service layer, settings UI, page
bridge, consent flow); **release proof pending** — the packaged-target smoke
matrix and an explorer-confirmed funded test payment are still open
(`WDK_WALLET_V0.9_SPEC.md` §12, Milestone 4).

The next release adds a desktop-only, opt-in and testnet-only Tether WDK wallet
preview. It is deliberately a structured payment capability rather than a
generic injected signer:

- one Stable Testnet account and test USD₮0 asset;
- separate WDK seed and encrypted wallet vault;
- browser-owned receive, balance and activity UI;
- manifest-declared app connection on an exclusive per-wallet-tab origin;
- one exact `window.pear.wallet.v1.requestPayment()` operation;
- fresh browser-chrome approval for every payment;
- durable intent journalling and on-chain finality reconciliation;
- no mainnet, `window.ethereum`, arbitrary signing/calldata, x402, wallet seed
  sync, extra chains or mobile page injection.

The implementation and release gates are defined in
[`WDK_WALLET_V0.9_SPEC.md`](./WDK_WALLET_V0.9_SPEC.md).

## Research Parking Lot

- Broader payments: signed P2P receipt op-logs, POS settlement, refunds, escrow,
  x402, Lightning and additional chains.
- Privacy routing and relay-directory privacy defaults.
- Public Nostr relay integration, if it becomes a product goal.
- App capability declarations at install time.
- Cross-platform lifecycle and update semantics for tab apps and window apps.

## Source Anchors

- Pear docs: https://docs.pears.com/
- Hypercore: https://github.com/holepunchto/hypercore
- Hyperbee: https://github.com/holepunchto/hyperbee
- Hyperdrive: https://github.com/holepunchto/hyperdrive
- Autobase: https://github.com/holepunchto/autobase
- Hyperswarm: https://github.com/holepunchto/hyperswarm
- Corestore: https://github.com/holepunchto/corestore
- Protomux: https://github.com/holepunchto/protomux
- HiveRelay: https://github.com/bigdestiny2/P2P-Hiverelay
