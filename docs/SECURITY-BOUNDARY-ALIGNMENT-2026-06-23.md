# PearBrowser Desktop Security Boundary Alignment

Generated: 2026-06-23
Loop candidate: `pearbrowser-desktop-security-crosscheck`
Source root: `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop`

## Executive Status

PearBrowser Desktop's current security posture is strongest at the local,
deterministic, verify-and-drop boundaries: catalogue rows normalize through one
target sanitizer, relay/index rows are re-verified client-side, search and name
trust are rooted in signed identity bindings, Nostr events are accepted only
after event-signature and contact-binding checks, and page APIs are scoped by
per-page loopback tokens.

This pass did not need a runtime code change. It adds the missing dated
alignment map between the current threat/security claims and the maintained
source boundaries. Public release risk remains mostly operational: manual GUI
smoke, third-party trust prompts, real-DHT release proof, mobile production
signing/store validation, and eventual HiveRelay dependency publication.

## Boundary Map

| Boundary | Current control | Source anchors | Local proof |
| --- | --- | --- | --- |
| Hyperdrive page proxy | 64-hex drive keys, path traversal/NUL rejection, per-request API token injection, raw HTML cache with fresh token injection on hits, CSP shim hashes instead of `unsafe-inline`, P2P-first relay race | `backend/hyper-proxy.js:84`, `backend/hyper-proxy.js:125`, `backend/hyper-proxy.js:344`, `backend/hyper-proxy.js:514`, `backend/hyper-proxy.js:690`, `backend/hyper-proxy.js:849` | `test/anongpt-gate.test.js`, `test/release-packaging.test.js`, `test/p2p-first-fetch.test.js` |
| `/api/*` loopback bridge | Loopback Origin check when `Origin` is present, 100 req/min per IP, token required for privileged routes, app IDs scoped as `driveKey:appId`, request body size cap, prototype-pollution scrub | `backend/http-bridge.js:32`, `backend/http-bridge.js:57`, `backend/http-bridge.js:72`, `backend/http-bridge.js:108`, `backend/http-bridge.js:132`, `backend/http-bridge.js:598` | `test/http-bridge-sync.test.js`, `test/anongpt-gate.test.js` |
| Runtime sync bridge | Validated app IDs, reserved prototype names rejected, per-app Corestore namespaces, invite keys constrained to 64-hex, result limits capped | `backend/pear-bridge.js:27`, `backend/pear-bridge.js:60`, `backend/pear-bridge.js:94`, `backend/pear-bridge.js:173`, `backend/pear-bridge.js:224`, `backend/pear-bridge.js:501` | `test/http-bridge-sync.test.js`, `test/pear-bridge-shared-store.test.js` |
| `swarm.v1` page API | Topic joins are drive-derived Tier A, persisted-grant Tier B, or consent-gated Tier C; per-app channel/join limits, one pending consent, per-peer outbound byte cap | `backend/swarm-bridge.js:14`, `backend/swarm-bridge.js:31`, `backend/swarm-bridge.js:94`, `backend/swarm-bridge.js:182`, `backend/swarm-bridge.js:251`, `backend/swarm-bridge.js:461` | `test/mobile-source-contract.test.js`, `docs/SWARM-V1.md`, `docs/PEARBROWSER-APP-COMPAT-STANDARD.md` |
| Catalogue ingestion | Prototype keys scrubbed, safe target universe limited to 64-hex/z32/hyper/pear/file, stable dedupe by drive/link/id, verification rank preferred over version, personal entries sanitized before write | `backend/catalog-safety.cjs:1`, `backend/catalog-safety.cjs:27`, `backend/catalog-safety.cjs:93`, `backend/catalog-safety.cjs:138`, `backend/catalog-safety.cjs:164`, `backend/catalog-safety.cjs:247` | `test/catalog-manager-safety.test.js`, `test/catalog-bee.test.js`, `test/autobee-catalog.test.js`, `test/community-submit.test.js` |
| schema-sheets catalogue | Strict apps schema, validated `sheets://` decoding, public room only, safe JMESPath subset and row cap, row DTO normalization through catalogue safety helper, CJS bundle is generated from `schema-sheets` | `backend/sheets-catalog.js:23`, `backend/sheets-catalog.js:54`, `backend/sheets-catalog.js:67`, `backend/sheets-catalog.js:91`, `backend/sheets-catalog.js:103`, `backend/sheets-import.mjs:1` | `test/sheets-catalog-query.test.js`, `test/keys.test.js` |
| HiveRelay index room | Index room is treated as an index, not authority; relay-directory capability docs are re-verified client-side; Nostr rows are event-verified before trust-frontier handling | `backend/index-room-client.js:1`, `backend/index-room-client.js:31`, `backend/index-room-client.js:50`, `backend/index-room-client.js:155`, `backend/capability-verify.cjs:1` | `test/index-room-client.test.js`, `test/capability-verify.test.js`, `test/relay-directory.test.js` |
| Search federation | Query and limits are clamped; local first-paint cannot be blocked by federation; stale federated results are suppressed by `queryId`; trust rows use verified memberkey fields only; merge rank is deterministic | `backend/search-handler.js:12`, `backend/search-handler.js:31`, `backend/search-handler.js:45`, `backend/search-federation.cjs:57`, `backend/search-federation.cjs:89`, `backend/search-federation.cjs:139` | `test/cmd-search-contract.test.js`, `test/search-federation.test.js`, `test/query-planner.test.js`, `test/search-completeness.test.js` |
| Identity binding | Per-app signatures are domain-separated; root-signed purpose-specific v3 bindings prevent cross-purpose replay; bindings and revocations verify against the expected Contacts root | `backend/identity-binding.cjs:24`, `backend/identity-binding.cjs:50`, `backend/identity-binding.cjs:53`, `backend/identity-binding.cjs:92`, `backend/identity-binding.cjs:116`, `backend/identity-binding.cjs:132` | `test/identity-verify.test.js`, `test/identity-binding-publisher.test.js`, `test/lighthouse-phase2.test.js` |
| Naming | Targets use the same safe link universe as catalogues; normalization/homograph handling is tested; ambiguity remains a product UX issue rather than an integrity failure | `backend/names.cjs`, `backend/name-normalize.cjs`, `backend/resolve-name.cjs`, `docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md` | `test/names.test.js`, `test/name-normalize.test.js`, `test/resolve-name.test.js`, `test/federated-name-resolver.test.js` |
| Nostr bridge | Local bind/revoke signs canonical backend-built bytes; NIP-01 events are verify-and-drop; trusted-contact feed admits only contact-attested author keys and quarantines unknown/revoked/stale authors | `backend/nostr-binding-store.cjs:1`, `backend/nostr-binding-store.cjs:86`, `backend/nostr-events-apply.cjs:1`, `backend/federated-nostr-feed.cjs:1`, `backend/federated-nostr-feed.cjs:70` | `test/nostr-bind.test.js`, `test/nostr-events-store.test.js`, `test/nostr-ingest.test.js`, `test/federated-nostr-feed.test.js` |
| anonGPT page capability | Shim only injected for the configured anonGPT drive and a manifest declaring required privacy claims; HTTP route is also drive-token gated and fails closed without buyer wiring | `backend/hyper-proxy.js:238`, `backend/hyper-proxy.js:273`, `backend/pear-bridge.js:673`, `backend/http-bridge.js:530` | `test/anongpt-gate.test.js`, `test/anongpt-buyer.test.js` |

## Current Alignment Notes

- The security model is not a single global authority model. It is a set of
  local-first boundaries: per-page token scoping, deterministic reducers,
  signed rows, contact-root verification, and explicit user consent for
  arbitrary swarm topics or third-party app execution.
- `backend/sheets-bundle.cjs` is generated infrastructure for the schema-sheets
  catalogue/index-room path. Do not hand-edit security markers inside it; change
  `backend/sheets-import.mjs` or upstream dependency wiring and rebuild with the
  existing bundle script.
- `docs/SEARCH-HANDOVER.md`, `docs/P2P-BROWSER-FEATURE-ROADMAP.md`, and
  `docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md` agree with the
  current code shape: local search is live, trusted-peer federation is opt-in,
  naming is contact/provenance aware, and the Nostr bridge is Pear-native rather
  than a general public relay client.
- `docs/TEST-COMMAND-MATRIX-2026-06-23.md` supersedes older test-count claims.
  The current release branch records `npm test` at 469/469 after the runtime
  storage gate, release story smoke, native release asset checker/resolver,
  native download verifier, native install snippet generator, native install
  smoke plan generator, package-manager manifest draft generator,
  public-trust readiness aggregator, native public-trust workflow mode,
  macOS public-trust DMG gate, Linux AppImage metadata checker,
  package-manager license metadata, and vendored HiveRelay source-install
  coverage landed.

## Known Security Residuals

1. **Shared loopback origin is still the largest browser-app isolation tradeoff.**
   The token, Origin check, and app-id scoping protect the backend, but all
   proxied apps still execute on the same `127.0.0.1:<port>` origin. A page XSS
   can steal its live token and call that page's `/api/*` permissions until the
   token expires. The app compatibility standard already tells app authors to
   avoid untrusted HTML, persistent browser storage, and token caching.
2. **SSE has a deliberate query-token fallback.** EventSource cannot set custom
   headers, so `/api/swarm/events` accepts `?token=`. The boundary is loopback,
   token TTL, and same app token validation; this should be replaced later with
   a one-time SSE ticket if the runtime wants to remove tokens from URLs.
3. **Tier A swarm topics are public-derivable from a drive key plus subtopic.**
   That is acceptable for app-scoped coordination, not private rendezvous. Any
   secret-room pattern must use a stronger application-layer handshake or a
   consented/private topic path.
4. **Public Nostr relay behavior is intentionally out of scope.** Current trusted
   contact feeds verify NIP-01 events and Pear-root bindings. Public relay
   ingress should remain opt-in/quarantined until productized.
5. **Peercord and other third-party Pear apps remain human trust decisions.**
   Release docs correctly require manual review of Pear's persistent trust
   prompt before executing standalone third-party code.
6. **Release proof is environment-gated.** Real-DHT relay health, fresh-peer
   production drive verification, Peercord standalone smoke, mobile signing,
   store validation, and eventual HiveRelay package publication all remain
   separate from local unit-test proof.

## Recommended Next Edge

Run a narrow release-evidence/security cleanup pass:

1. Add one-time SSE ticketing for `/api/swarm/events` while preserving the
   existing EventSource UX, then cover it in `test/http-bridge-sync.test.js`.
2. Surface search and catalogue verification provenance more clearly in the UI:
   signed/relay-listed/unverified, digest hit, fallback pull, and partial result
   state.
3. Add a compact Nostr hidden/quarantine diagnostics view so revoked, stale, and
   unverified contact notes stay fail-closed but understandable.
4. Keep Peercord execution and persistent third-party trust approval manual.

## Validation For This Pass

Local validation completed in this loop:

- `git diff --check -- docs/SECURITY-BOUNDARY-ALIGNMENT-2026-06-23.md` passed.
- `node --test test/capability-verify.test.js test/catalog-manager-safety.test.js test/http-bridge-sync.test.js test/anongpt-gate.test.js test/identity-verify.test.js test/identity-binding-publisher.test.js test/nostr-events-store.test.js test/nostr-ingest.test.js test/federated-nostr-feed.test.js test/search-federation.test.js test/cmd-search-contract.test.js test/sheets-catalog-query.test.js`
- Targeted security/trust slice passed: 78 tests, 0 failed.
- `npm test` passed: 429 tests, 0 failed.

## Source Evidence

- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/hyper-proxy.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/http-bridge.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/pear-bridge.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/swarm-bridge.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/catalog-safety.cjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/sheets-catalog.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/index-room-client.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/capability-verify.cjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/search-handler.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/search-federation.cjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/identity-binding.cjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/nostr-binding-store.cjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/nostr-events-apply.cjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/federated-nostr-feed.cjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/docs/SEARCH-HANDOVER.md`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/docs/P2P-BROWSER-FEATURE-ROADMAP.md`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/docs/TEST-COMMAND-MATRIX-2026-06-23.md`
