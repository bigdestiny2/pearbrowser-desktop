# PearBrowser desktop update candidate — Pear 3.4, Autobee, and origin security

Date: 2026-09-26. State: isolated local candidate; no deployment or native distribution qualification.

This branch starts from the already committed Pear 3.4 adoption candidate (`aa2ef51`). The stable Pear CLI 3.4.0 contract and embedded `pear-runtime@1.3.1` are pinned and checked by `check:pear-v3`; the browser still owns its Electron host and Pear worker boundary. The main desktop checkout has separate uncommitted Bitcoin/WDK work and is unchanged by this branch.

## Autobee compatibility

The existing feature named “Autobee catalogue” in `backend/autobee-catalog-manager.cjs` is an experimental **Autobase 7 + Hyperbee** implementation. It does not use the upstream `autobee` package. Existing catalogue keys, browser state, and user data retain their current formats and code paths.

This candidate adds upstream `autobee@2.12.1` as an **exact development dependency** and exercises it only in `test/autobee-v2-compatibility-spike.test.js`. The test creates disposable Corestores, verifies a derived view after closing and reopening storage, then grants a second writer and verifies that concurrent writes converge. It uses deterministic apply logic, an explicit trusted-writer allowlist, `optimistic: false`, and `fastForward: false`. The install keeps the reviewed production Hypercore/Corestore cohort at its existing lockfile versions; Autobee's newer Hypercore is nested under its development dependency.

This is evidence for the upstream API on Node.js only. It does not prove Bare worker compatibility, encrypted group recovery, writer revocation, untrusted-peer behavior, live Hyperswarm replication, large-data performance, or migration of existing Autobase/Hyperbee records. A production adoption needs an independently reviewed trust and migration design plus those tests before any user data is opened with Autobee 2.

Reference: [upstream Autobee](https://github.com/holepunchto/autobee), which describes the package as experimental and subject to breaking changes.

## Browser-origin security correction

The desktop proxy uses a separate `127.0.0.1` port per Hyperdrive. A real
Electron 43.2.0 probe in `electron-cookie-port-probe-2026-09-26.json` showed
separate localStorage but a `Path=/` cookie shared between those ports.
`scripts/probe-electron-cookie-ports.cjs` reproduces this with two local HTTP
listeners and an ephemeral Electron session. The old automated smoke used
in-memory `BrowserStorageBuckets` and reported cookie separation by origin;
that simulation did not reflect Chromium. The generator now models host-scoped
cookies and produces blocked evidence. The historical July artifact is
blocked by the new gate. The checker also requires drive keys to match their `hyper://` URLs and distinct cookie hosts;
two ports on `127.0.0.1` cannot pass. Its capture check opens a separate JSON
file, verifies its SHA-256 digest, and compares both app URLs, origins, and
measured localStorage/IndexedDB/cookie values to the release evidence. A
declared file name alone cannot pass. The required capture JSON records
`kind: pearbrowser-electron-webcontents-storage-capture`, the Electron version
and capture time, and each app's `webContentsId`, URL, origin, and observed
storage. The checker keeps a hard provenance blocker even when the file and
digest match: a pair of self-authored JSON files cannot prove the runtime
source. A trusted Electron capture and review flow must be implemented before
any checker result can be called verified.

Per-drive listener and bridge-token isolation remain valuable, but full
per-app browser-storage isolation is open. Untrusted P2P apps need a reviewed
host/scheme/session-partition design and real Electron tests before any
release claim that cookies are isolated. The probe is diagnostic evidence of
the current gap, not a passing isolation proof.

## Validation and remaining gates

- The complete desktop suite passed 961 tests, with 6 skipped, after the
  candidate changes. The Pear v3 host contract and installed Pear CLI 3.4.0
  checks passed. The Autobee spike and existing collaborative-catalog focused
  tests passed 11/11. The origin-evidence focused tests passed 9/9 after
  capture binding, URL-key agreement, and the hard provenance block. The historical July
  simulated artifact is now blocked.
- The production Autobase/Corestore/Hypercore/Hyperdrive/HyperDHT cohort stays
  at its reviewed Pear 3.4 lockfile versions. Newer patch/minor releases exist,
  but changing persistent P2P formats requires cold-reopen, fresh-peer,
  multiwriter, Bare worker, and packaged-app qualification as one cohort.
- The desktop UI bundle built successfully, and the production npm audit found
  zero advisories. The runtime RPC smoke requires a running local backend and
  could not connect at `ws://127.0.0.1:9880/status-smoke` in this isolated test.
- The current release evidence checker returns FAIL for the measured cookie
  leak. This is an intentional distribution block, not a test-suite failure.
- The main checkout's unfinished Bitcoin/WDK changes are not included here;
  its Pear worker-entry contract currently fails and requires separate
  integration review.
- Native installer, Windows/Linux runtime, real P2P writer replication,
  Autobee migration, and production cookie isolation have not been qualified.
