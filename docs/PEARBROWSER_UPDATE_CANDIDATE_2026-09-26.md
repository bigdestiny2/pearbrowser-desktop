# PearBrowser desktop update candidate — Pear 3.4, Autobee, and origin security

Date: 2026-09-26. Release audit refreshed: 2026-09-28. State: pushed draft PR; local macOS package proof passed, but no public distribution qualification.

This branch starts from the already committed Pear 3.4 adoption candidate (`aa2ef51`). The stable Pear CLI 3.4.0 contract and embedded `pear-runtime@1.3.1` are pinned and checked by `check:pear-v3`; the browser still owns its Electron host and Pear worker boundary. The main desktop checkout has separate uncommitted Bitcoin/WDK work and is unchanged by this branch.

## Autobee compatibility

The existing feature named “Autobee catalogue” in `backend/autobee-catalog-manager.cjs` is an experimental **Autobase 7 + Hyperbee** implementation. It does not use the upstream `autobee` package. Existing catalogue keys, browser state, and user data retain their current formats and code paths.

This candidate adds upstream `autobee@2.12.1` as an **exact development dependency** and exercises it only in `test/autobee-v2-compatibility-spike.test.js`. The test creates disposable Corestores, verifies a derived view after closing and reopening storage, then grants a second writer and verifies that concurrent writes converge. It uses deterministic apply logic, an explicit trusted-writer allowlist, `optimistic: false`, and `fastForward: false`. The install keeps the reviewed production Hypercore/Corestore cohort at its existing lockfile versions; Autobee's newer Hypercore is nested under its development dependency.

This is evidence for the upstream API on Node.js only. It does not prove Bare worker compatibility, encrypted group recovery, writer revocation, untrusted-peer behavior, live Hyperswarm replication, large-data performance, or migration of existing Autobase/Hyperbee records. A production adoption needs an independently reviewed trust and migration design plus those tests before any user data is opened with Autobee 2.

Reference: [upstream Autobee](https://github.com/holepunchto/autobee), which describes the package as experimental and subject to breaking changes.

## Browser-origin security correction

The published `v0.9.0` proxy gives drives separate `127.0.0.1` ports. A real
Electron 43.2.0 probe in `electron-cookie-port-probe-2026-09-26.json` showed
that a `Path=/` cookie is shared between those ports. The older in-memory
`BrowserStorageBuckets` smoke did not reflect Chromium's host-scoped cookies.
The corrected evidence generator and checker now block that historical fixture.

The `v0.9.1` draft now assigns each drive a deterministic `d-<z32-key>.localhost`
host as well as a separate port. Bound listeners require their exact Host and
Origin, main-listener drive routes return 403, bound drive listeners cannot serve
Clearnet pages under a drive origin, API tokens are tied to the live
host and port, and direct loopback URLs cannot acquire a drive's tab or wallet
identity. A repeatable `npm run check:electron-cookie-isolation` probe uses
normal Electron DNS and a disposable session. On macOS with Electron 43.2.0,
it kept two drives' JavaScript, HTTP-only, and localStorage data separate;
12 hostile Domain-cookie attempts were rejected. Proxy, bridge, navigation,
and wallet regression tests also cover the named-host rules.

This is a local browser-engine probe and source integration test, not a trusted
capture of two real P2P apps in a distributed package. Windows and Linux
Electron behavior, real-app CSP and tab lifecycle, packaged WebContents
provenance, and clean-install journeys remain to be checked. The origin
release-evidence checker deliberately keeps its provenance check blocked;
a self-authored JSON file cannot satisfy that gate.

## Validation and remaining gates

- The complete desktop suite passed 965 tests, with 6 skipped and 0 failed,
  after the named-host changes. The Pear v3 host contract and installed Pear CLI 3.4.0
  checks passed. The Autobee spike and existing collaborative-catalog focused
  tests passed 11/11. The origin-evidence focused tests passed 9/9 after
  capture binding, URL-key agreement, and the hard provenance block. The historical July
  simulated artifact is now blocked.
- The production Autobase/Corestore/Hypercore/Hyperdrive/HyperDHT cohort stays
  at its reviewed Pear 3.4 lockfile versions. Newer patch/minor releases exist,
  but changing persistent P2P formats requires cold-reopen, fresh-peer,
  multiwriter, Bare worker, and packaged-app qualification as one cohort.
- The desktop UI bundle built successfully, and the production npm audit found
  zero advisories. An initial source-only runtime RPC smoke had no running
  backend. The later packaged macOS smoke below launched its own backend and passed.
- The current release evidence checker still returns FAIL for current P2P app
  cookie isolation because trusted packaged-app capture is missing. The source
  fix and local engine probe narrow the gap but do not replace that proof.
- The main checkout's unfinished Bitcoin/WDK changes are not included here;
  its Pear worker-entry contract currently fails and requires separate
  integration review.
- Current-version native installers, Windows/Linux runtime, real P2P writer
  replication, Autobee migration, and integrated production cookie isolation
  have not been qualified.

## 2026-09-28 release audit

- [Desktop PR #84](https://github.com/bigdestiny2/pearbrowser-desktop/pull/84)
  is open and draft. The audited source commit
  `cb602520521fd9a2bed9a2dfb20af472f28eed1e` passed its
  [Desktop CI run](https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/36264816718/job/108467360852)
  on Ubuntu. That job runs `npm ci`, the test suite, a generated UI
  bundle check, and a high-severity dependency audit. It does not build or
  exercise native macOS, Windows, or Linux installers. No candidate
  cross-platform packaged-app smoke has been recorded.
- `npm run -s check:release-evidence` reports 54 PASS, 17 DEFER, and one FAIL:
  **Current P2P app cookie isolation**. Historical release-log decisions and
  deferrals are retained as prior evidence; they do not qualify this candidate.
  The named-host candidate and local Electron probe address the measured
  shared-host leak; a trusted packaged-app capture and review remain
  prerequisites for a new release decision.
- A read-only `check:public-trust-readiness` run for `v0.9.1` and the exact PR
  head failed. The GitHub repository and protected `production` environment
  exposed no native signing secret names. The missing gates are macOS
  Developer ID and notarization credentials, a Windows PFX certificate, and
  the `v0.9.1` release assets, provenance, downloads, and clean-install proof.
  The latter artifacts have not been created; their absence is not a failed
  download of a published candidate.
- [GitHub's latest published desktop release](https://github.com/bigdestiny2/pearbrowser-desktop/releases/tag/v0.9.0)
  remains `v0.9.0`. [Website PR #7](https://github.com/bigdestiny2/pearbrowser-com/pull/7)
  merged on 2026-09-28. Fresh HTTPS reads of the [website](https://www.pearbrowser.com/)
  and [downloads metadata](https://www.pearbrowser.com/downloads.json) now
  show its four exact `v0.9.0` assets and SHA-256 values, with this `v0.9.1`
  PR labeled as an unmerged draft. The advertised Hyperdrive website remains
  an older edition. No `v0.9.1` app release is live.
- From PR head `4b2f43cc0c61098484427e70a5c6b6dd23829c0a`, a local
  arm64 macOS `package-proof` Electron 43.2.0 app built successfully.
  `check:electron-package` verified the embedded Pear 3.4.0 runtime,
  integrity-signed physical runtime tree (8,394 files), 128 byte-identical
  reviewed source files, fuses, and exact source provenance. A disposable
  profile launch passed `runtime-rpc-smoke`: DHT connected, two peers and
  two HiveRelays, status RPC on port 9876, backend proxy active. This is
  one local macOS package smoke; Windows/Linux packages, clean install,
  human browse journeys, cookie isolation, and public-trust signing remain
  unqualified.
- The separate `release/v0.9.1` checkout still contains uncommitted
  Bitcoin/WDK work. Its current `check:pear-v3` fails because
  `electron/main.cjs` does not meet the host-owned Pear worker-entry contract.
  Those changes remain outside PR #84 and need their own integration review.

- The draft adds a PR-only, read-only `package-proof` matrix for macOS
  Apple Silicon/Intel, Windows x64, and Linux x64. It checks generated UI,
  real Electron cookie behavior, native package integrity and provenance,
  installer existence, and a disposable unpacked-app Pear RPC launch. Its cross-platform
  CI result is pending; it uses no signing secrets and publishes no assets.

**Decision:** HOLD for distribution. Prove the named-host boundary with
trusted packaged WebContents capture and real-app journeys, refresh current
operator evidence, qualify native installers and public-trust signing, then
verify exact public downloads before publishing a new app release.
