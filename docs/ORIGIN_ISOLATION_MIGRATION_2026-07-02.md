# PearBrowser Per-App Origin Isolation Migration - 2026-07-02

## Decision

Use **per-drive ephemeral loopback ports** as the first browser-level app-origin
isolation migration.

Each active Hyperdrive app gets its own document origin:

```text
http://127.0.0.1:<drive-scoped-port>/hyper/<driveKey>/...
http://127.0.0.1:<drive-scoped-port>/app/<driveKey>/...
```

This keeps the implementation inside the current HTTP proxy model while giving
the browser a real origin boundary, because origin includes the port. It avoids
custom schemes, wildcard DNS, TLS certificates, and Electron protocol-handler
semantics while preserving existing CSP, `<base>`, one-time SSE ticketing, and
`window.pear.*` bridge injection.

## Why This Option

### DMC Lens

- Release risk stays visible: the migration can be shipped behind a feature flag
  and proved with focused origin/session tests before any release claim changes.
- Operator behavior is measurable: a test can prove two apps receive different
  `location.origin`, distinct browser storage, and independently scoped
  `pear-api-token` values.
- Rollback is clean: fall back to the existing single-port proxy if per-drive
  listener allocation fails.

### Mafintosh Lens

- Keep the primitive small: one drive/app maps to one local origin capability.
- Avoid app semantics in the proxy: the drive key remains the routing authority;
  app-level identity, sync, and group policy stay in the bridge/apps.
- Prefer boring web isolation over invented trust machinery: port separation is
  a native browser boundary.

## Current State

Desktop now serves each static Hyperdrive or installed app through its own
loopback origin by default:

```text
http://127.0.0.1:<drive-a-port>/hyper/<driveA>/...
http://127.0.0.1:<drive-b-port>/app/<driveB>/...
```

The browser-origin boundary is now enforced in addition to backend tokens:

- `backend/hyper-proxy.js` injects a fresh `<meta name="pear-api-token">` and
  `<base href="http://127.0.0.1:<port>/<prefix>/<driveKey>/">` into HTML.
- `backend/http-bridge.js` requires `X-Pear-Token`, scopes sync app IDs by
  drive key, and now requires one-time SSE tickets for `/api/swarm/events`.
- `ui/shell.js` renders app pages in sandboxed iframes with
  `allow-same-origin`, but distinct per-drive ports isolate cookies,
  localStorage, IndexedDB, DOM access, and injected tokens.

## Rejected Alternatives

| Option | Decision | Reason |
|---|---|---|
| Custom `pearbrowser://` / `hyper://` protocol handler | Defer | High Electron/mobile parity risk; custom protocol origin behavior and CSP/ServiceWorker semantics need a separate spike. |
| Wildcard hostnames like `<drive>.localhost` | Reject for first slice | DNS behavior is platform-dependent and may not resolve under Pear/Electron without extra host plumbing. |
| One random subdomain under an owned HTTPS domain | Reject | Requires online DNS/TLS and breaks the local-first/offline browser property. |
| `sandbox` without `allow-same-origin` | Reject for migration | Gives opaque origins but breaks same-origin `/api/*`, relative resource behavior, and existing app compatibility unless paired with a new postMessage bridge. |
| Keep one port and rely only on tokens | Current fallback only | Protects backend APIs but does not isolate cookies, localStorage, IndexedDB, or same-origin script blast radius. |

## Migration Shape

### Phase 0 - Guard The Existing Invariants

No behavior change.

- Add an origin-isolation contract test that documents current single-origin
  behavior as the thing to replace.
- Keep `test/http-bridge-sse-ticket.test.js` green so EventSource never regresses
  to bearer tokens in URLs.
- Correct app-author docs: desktop `<base>` uses `127.0.0.1`; EventSource uses
  `?ticket=`, not `?token=`.

### Phase 1 - Per-Drive Origin Registry

Add a small registry owned by `HyperProxy`:

```js
// driveKeyHex -> { port, server, ready, lastUsedAt }
_driveOrigins = new Map()
```

Behavior:

- `originForDrive(driveKeyHex, mode)` starts or reuses a listener bound to
  `127.0.0.1` for that drive.
- The listener reuses the same route implementation but only serves that bound
  drive key.
- HTML injection uses the listener's port in `<base>`.
- `CMD_NAVIGATE` and `CMD_LAUNCH_APP` return the drive-specific local URL.
- Initial implementation closes per-drive listeners on proxy shutdown and exposes
  `CMD_RELEASE_ORIGIN` / `HyperProxy.releaseDriveOrigin()` so the UI can release
  idle drive listeners when tabs close or navigate away. LRU/default-on policy
  remains a lifecycle follow-up before the flag is flipped.

### Phase 2 - Token Origin Binding

Extend `HyperProxy.issueApiToken()` to store the expected document origin:

```js
{ driveKeyHex, origin: "http://127.0.0.1:<drivePort>", issuedAt }
```

Then require matching `Origin` for origin-bound tokens in `HttpBridge`:

- `POST /api/*` with mismatched `Origin` fails `403`.
- headerless same-origin reads that omit `Origin` remain allowed only where
  browser behavior actually omits the header and the token is still valid.
- `/api/swarm/ticket` mints a ticket bound to the same drive/channel context.
- `/api/swarm/events` keeps the current one-time `?ticket=` flow.

This mirrors the sibling mobile repo's origin-scoped token shape without
requiring the entire mobile trusted-origin subsystem on desktop.

### Phase 3 - Compatibility Flag

The rollout originally used this launch/runtime flag:

```text
PEARBROWSER_PER_DRIVE_ORIGINS=1
```

Those rollout gates were:

- two static apps load from distinct `location.origin` values;
- `localStorage` written by app A is invisible to app B;
- app A's `pear-api-token` cannot call `/api/identity` from app B's origin;
- existing relative assets and strict CSP pages still load;
- one-time SSE tickets still work from the per-drive origin;
- closing tabs releases idle per-drive proxy listeners, with a GUI smoke before
  default-on.

### Phase 4 - Default-On

The default was flipped on 2026-07-11 after release evidence included:

- focused unit tests;
- a desktop GUI smoke with two installed Hyperdrive apps;
- a Peerit/real app bridge proof;
- updated PBACS guidance;
- rollback instructions.

### Operator Smoke Plan

Use the generator below to produce the exact JSON evidence checklist for the
remaining GUI/browser-storage proof. It requires two real app Hyperdrive URLs
and emits a prefilled evidence template plus the automated verifier command:

```sh
npm run -s generate:origin-isolation-smoke-plan -- --app-a hyper://<app-a-drive>/ --app-b hyper://<app-b-drive>/ --json --out origin-isolation-smoke-plan.json
```

Produce the automated evidence artifact from that plan:

```sh
npm run -s generate:origin-isolation-smoke-evidence -- --plan origin-isolation-smoke-plan.json --out origin-isolation-smoke-evidence.json --json
```

Then verify the completed artifact:

```sh
npm run -s check:origin-isolation-smoke-evidence -- --file origin-isolation-smoke-evidence.json --json
```

The generated plan covers launch with `PEARBROWSER_PER_DRIVE_ORIGINS=1`, runtime
readiness, automated HyperProxy/HttpBridge origin splitting, localStorage/cookie/
IndexedDB separation, strict-CSP shim hashing, tab-origin release behavior, and
bridge route proof.

## Test Matrix

| Gate | Proof |
|---|---|
| Origin split | two drive keys produce different `localUrl` ports and different `base href` origins |
| Storage split | browser smoke proves `localStorage`/IndexedDB/cookies do not cross between app origins |
| Token origin binding | token minted for drive A origin fails from drive B origin |
| Bridge compatibility | `/api/sync/*`, `/api/identity`, `/api/swarm/ticket`, and `/api/swarm/events?ticket=` still pass |
| CSP compatibility | strict `<meta http-equiv="Content-Security-Policy">` apps still load injected shims by hash |
| Lifecycle | unit and evidence proof close idle listeners on tab release/navigation |
| Fallback | listener allocation failure falls back to current single-port mode with an explicit warning |

## 2026-07-02 Feature-Flagged Core Implementation

The first implementation slice landed behind `PEARBROWSER_PER_DRIVE_ORIGINS=1`.

Implemented:

- `HyperProxy` owns a per-drive loopback listener registry.
- `HyperProxy.localUrlForDrive()` returns drive-scoped `/hyper/<driveKey>/...`
  and `/app/<driveKey>/...` URLs when the flag is enabled.
- Per-drive listeners reject static `/hyper/` or `/app/` requests for any other
  drive key.
- HTML injection uses the request listener origin in `<base>`.
- `HyperProxy.issueApiToken()` stores the expected document origin.
- `HttpBridge` rejects origin-bound tokens when request `Origin` or `Host`
  points at a different loopback origin.
- `POST /api/swarm/ticket` mints origin-bound tickets and
  `/api/swarm/events?...&ticket=...` enforces that inherited origin binding.
- `backend/index.js` exposes `CMD_RELEASE_ORIGIN`, and
  `HyperProxy.releaseDriveOrigin()` closes idle per-drive listeners.
- `ui/shell.js` releases a previous drive origin when the last tab for that
  drive closes or navigates to another Hyperdrive app.
- `ui/lib/tabs.js` maps `hyper://`, local `/hyper/<driveKey>/...`, and local
  `/app/<driveKey>/...` addresses back to drive keys for release decisions.
- If per-drive listener allocation fails, URL generation falls back to the
  current single-port proxy and emits an explicit warning.

Focused proof passed:

- `node --check backend/hyper-proxy.js`
- `node --check backend/http-bridge.js`
- `node --check backend/index.js`
- `node --check backend/constants.js`
- `node --check ui/lib/tabs.js`
- `node --check ui/shell.js`
- `node --check ui/boot.js`
- `node --check test/origin-isolation.test.js`
- `node --check test/tabs.test.js`
- `node --check scripts/generate-origin-isolation-smoke-plan.mjs`
- `node --check scripts/generate-origin-isolation-smoke-evidence.mjs`
- `node --check scripts/check-origin-isolation-smoke-evidence.mjs`
- `node --test test/origin-isolation.test.js` (`6/6`)
- `node --test test/origin-isolation.test.js test/http-bridge-sse-ticket.test.js test/http-bridge-sync.test.js test/anongpt-gate.test.js` (`13/13`)
- `node --test test/origin-isolation.test.js test/tabs.test.js test/constants-mirror.test.js` (`24/24`)
- `node --test test/origin-isolation-smoke-evidence.test.js` (`6/6`)
- `node --test test/release-packaging.test.js` (`56/56`)
- `node --test test/origin-isolation-smoke-evidence.test.js test/release-packaging.test.js` (`62/62`)
- `npm test` (`512/512`)
- `npx standard test/origin-isolation.test.js test/tabs.test.js ui/lib/tabs.js`
- `npx standard scripts/generate-origin-isolation-smoke-plan.mjs scripts/generate-origin-isolation-smoke-evidence.mjs`
- `npx standard scripts/check-origin-isolation-smoke-evidence.mjs test/origin-isolation-smoke-evidence.test.js`
- `git diff --check -- backend/hyper-proxy.js backend/http-bridge.js backend/index.js backend/constants.js ui/boot.js ui/lib/tabs.js ui/shell.js scripts/generate-origin-isolation-smoke-plan.mjs scripts/generate-origin-isolation-smoke-evidence.mjs scripts/check-origin-isolation-smoke-evidence.mjs package.json test/origin-isolation.test.js test/tabs.test.js test/release-packaging.test.js test/origin-isolation-smoke-evidence.test.js docs/ORIGIN_ISOLATION_MIGRATION_2026-07-02.md docs/PEARBROWSER-APP-COMPAT-STANDARD.md docs/SECURITY-BOUNDARY-ALIGNMENT-2026-06-23.md docs/RELEASE_NETWORK_EVIDENCE_2026-07-02.md docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`

Remaining refinement outside the security flip:

- an additional LRU ceiling beyond the existing tab-driven listener release;
- manual GUI screenshot/window evidence, if required for a release handoff beyond
  the automated HyperProxy/HttpBridge artifact.

Now available: `npm run -s generate:origin-isolation-smoke-plan` emits the
feature-flagged origin/storage/CSP/tab-navigation/bridge evidence plan,
`npm run -s generate:origin-isolation-smoke-evidence` produces the automated JSON
artifact, and `npm run -s check:origin-isolation-smoke-evidence` verifies it.

## Implementation Notes

### 2026-07-11 Default-On Security Flip

Per-drive loopback origins are now the default. The completed origin/storage,
strict-CSP, lifecycle, and bridge evidence artifact is verified at
`docs/origin-isolation-smoke-evidence-peerit-pearfeed-2026-07-04.json`. Set
`PEARBROWSER_PER_DRIVE_ORIGINS=0` only as an emergency compatibility rollback;
the old shared-origin posture allows one drive to read sibling-drive DOM and
injected tokens.

- Do not move app policy into `HyperProxy`; drive key is the only routing
  authority for the origin listener.
- Do not reintroduce bearer query tokens. EventSource stays ticket-only.
- Do not require app authors to hardcode ports. Apps keep using relative URLs and
  the injected `<base>`.
- Keep `localhost` accepted as a compatibility origin in the bridge, but desktop
  generated URLs should continue using `127.0.0.1` unless a platform test proves
  a reason to change.
- Preserve the single-port path only as the explicit
  `PEARBROWSER_PER_DRIVE_ORIGINS=0` emergency rollback.

## Completion Bar For PB-AUDIT-002

PB-AUDIT-002 can move from "design open" to "implementation ready" when this
document is linked from the audit ledger and the stale PBACS claims are corrected.

PB-AUDIT-002 is closed locally: storage, strict-CSP, listener lifecycle,
default-on policy, and real-app bridge gates are represented by the verified
evidence artifact. A release handoff may still request a manual window
screenshot as presentation evidence.
