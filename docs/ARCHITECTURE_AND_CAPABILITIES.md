# PearBrowser Desktop Architecture and Capabilities

Last updated: 2026-06-23

PearBrowser Desktop is a local-first peer-to-peer browser built on Pear, Bare,
Hypercore, Hyperdrive, Hyperbee, Hyperswarm, and HiveRelay. It combines a
`hyper://` browser, decentralized app catalogue, site publisher, local and
federated search, petname-style naming, and a trusted-contact Nostr bridge.

This document is the current high-level map for GitHub readers. The detailed
feature audit lives in
[DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md](./DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md).

## Product Surfaces

- **Browse:** multi-tab `hyper://` browsing, URL normalization, bookmarks,
  history, session restore, autocomplete, and an inspectable site-info panel.
- **Apps:** aggregated app catalogue with stable app rows/links that launch the
  latest available release without requiring users to find a download, install
  an updater, or manually navigate back to the publisher. Sources include
  Hyperdrive, Hyperbee, Autobee, schema-sheets, HiveRelay index-room, default
  curated, community, and personal catalogues.
- **Publish:** block-based P2P site editor, one-click Hyperdrive publish,
  HiveRelay seed/unseed, durability confirmation, and shareable drive keys.
- **Library:** local Hyperbee bookmarks and history used by autocomplete and
  local search.
- **Search:** local-first personal index with optional trusted-peer federation,
  digest/provenance reporting, stale-query suppression, and bounded query
  limits.
- **Naming:** `pearname://` resolution through local petnames, owned registry
  entries, trusted-contact federation, and a small curated floor.
- **Nostr:** deterministic browser identity binding to Nostr keys, local NIP-01
  event storage, trusted-contact feed aggregation, and hidden diagnostics.
- **Settings:** identity backup/restore, profile, connected apps, permissions,
  relays, trusted peers, device sync, names, Nostr, storage cleanup, and
  experimental capability toggles.

## Runtime Layers

```text
Renderer UI (React + htm, no build step)
  Browse / Apps / Publish / Library / Search / Names / Nostr / Settings
  iframe sandbox + injected page shims
        |
        | length-prefixed JSON over ws://127.0.0.1:9876
        v
Bare backend process
  RPC command router
  HyperProxy and HTTP bridge
  CatalogManager and safety normalizers
  PersonalIndex, QueryPlanner, search federation
  NameRegistry, NameResolver, FederatedNameResolver
  Nostr binding, event store, ingest, trusted feed
  Identity, profile, contacts, grants, browser-state sync
        |
        +-- Corestore / Hyperdrive / Hyperbee / Autobase
        +-- Hyperswarm / HyperDHT / Protomux
        +-- HiveRelay seed, gateway, capability, and catalogue APIs
```

The renderer never owns raw swarm sockets or long-lived keys. It asks the Bare
backend through RPC, and the backend stores browser data in Hyperbee/Corestore
namespaces. Page APIs are token-gated through the loopback proxy.

## Catalogue Pipeline

PearBrowser treats catalogue data as untrusted input until normalized. All
catalogue sources map into the same app DTO before the Apps UI renders them.

Supported sources:

- **Hyperdrive JSON:** legacy `catalog.json` with `apps[]`.
- **Signed Hyperbee:** `hyperbee://` catalogues with a signed metadata record.
- **Autobee catalogue:** experimental multiwriter catalogue ops.
- **Schema-sheets:** `sheets://` rooms with AJV validation, JMESPath queries,
  and signed row provenance.
- **HiveRelay index room:** `hiveindex://` relay directory sidecar rows.
- **Default catalogue:** built-in PearBrowser Network Hyperbee seed.
- **My Catalog:** writable personal catalogue copied from installed or loaded
  app records, with read-only sharing when the writer key is absent.

Normalization accepts `apps[]`, `items[]`, or `entries[]`, strips prototype
pollution keys, lowercases safe schemes, extracts drive keys from safe
`hyper://` links, preserves safe link-only `pear://`, `hyper://`, and
`file://` rows, and rejects rows with neither a safe link nor a valid drive key.
Because app records point at stable Pear/Hyperdrive release targets, users can
open the current available app from the browser catalogue instead of managing a
separate download/update cycle.

## Search Pipeline

Search is local-first. The renderer asks `CMD_SEARCH`; the backend returns local
results from `PersonalIndex` immediately with a `first-paint` phase. If the user
asked for federation and the query planner is available, trusted-peer federation
runs in the background and returns one correlated enriched event.

The federation path uses bounded query length and result limits, digest checks
before heavier pulls, provenance in the response, and stale-query suppression so
an older network reply cannot overwrite a newer search.

## Naming Pipeline

Names are deliberately petname-first rather than a global first-claim registry.
Resolution checks:

1. Local aliases and owned registry records.
2. Trusted-contact federated records.
3. Curated built-in aliases.
4. Raw key parsing as the fallback for explicit `hyper://`/`pear://` targets.

Name normalization uses Unicode normalization and homograph-aware guardrails.
Resolved records keep provenance so the UI can distinguish a local petname from
a contact assertion or a curated default.

## Nostr Bridge

The Nostr bridge is not a general public relay client. It is a trusted-contact
bridge for PearBrowser identity:

- derives a deterministic Nostr key from the browser identity seed;
- stores and revokes cross-curve binding proofs;
- stores NIP-01-like events locally;
- ingests signed events into a local Hyperbee view;
- builds a feed from trusted contacts and hides noisy diagnostics by default.

This gives PearBrowser a social discovery and contact activity surface without
turning every query into public relay traffic.

## App Runtime APIs

Apps loaded through the browser can feature-detect:

- `window.pear.login()` for scoped per-app sign-in and profile consent;
- `window.pear.identity.*` for per-app public keys and signatures;
- `window.pear.sync.*` for local-first Autobase/Hyperbee data;
- `window.pear.swarm.v1` for page-scoped Hyperswarm channels;
- `/api/*` bridge routes when the richer object is not injected;
- a drive-gated `window.pear.anongpt.infer` shim for the anonGPT app.

Arbitrary swarm topics and profile/contact access are consent-gated. Tokens are
short-lived and read from the injected page metadata or request headers.

## Mobile Relationship

The sibling [PearBrowser mobile repo](https://github.com/bigdestiny2/PearBrowser)
shares the same product direction but has a different host architecture:
React Native compatibility shell, SwiftUI and Jetpack Compose native shells,
and a Bare Kit worklet backend. Mobile currently focuses on safe catalogue
loading, WebView bridge parity, native consent flows, site publishing, QR/share
flows, and native shell source-contract parity.

## Validation Snapshot

The current 2026-06-23 release audit verified:

- Desktop automated tests: `npm test` passing, 412 tests. The PR Desktop CI
  workflow also passes source checkouts, HiveRelay layout guard, install, tests,
  and high-severity audit on the release branch.
- Mobile automated tests: `npm test` passing, 136 tests.
- Live PearBrowser Network catalogue: `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d` reachable from a fresh peer, signed, and carrying 14 apps including Peercord, peerit, and HiveWorm.
- Production PearBrowser drive: reachable from a fresh peer at length 16898, with blob sampling proving content blocks replicate.
- Featured app bundles: Peercord and Keet fresh-peer sampled with zero missing sampled blobs.
- Focused automated coverage includes catalogue safety, signed Hyperbee
  catalogues, Peercord catalogue wiring, name resolution, search planning and
  verification, Nostr binding/events/feed diagnostics, command-surface mirrors,
  mobile source contracts, bridge consent, sync, and storage cleanup.
- Historical tracker counts and the step-by-step discovery-surface audit are
  preserved in
  [DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md](./DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md).
