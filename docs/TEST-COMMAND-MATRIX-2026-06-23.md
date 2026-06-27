# PearBrowser Desktop Test Command Matrix

Generated: 2026-06-23
Loop candidate: `pearbrowser-desktop-test-matrix`
Autonomy level: Level 1 docs-tests
Source root: `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop`

## Executive Status

PearBrowser Desktop has a compact local test command and a much larger release
proof surface. This matrix separates local deterministic checks from GUI,
real-DHT, third-party app, and mobile/native gates so future agents can collect
evidence without accidentally executing third-party code or treating network
proof as unit-test proof.

Current local status from this loop:

- `git diff --check` passed.
- `npm audit --audit-level=high` passed with `found 0 vulnerabilities`.
- `npm test` passed: 432 tests, 0 failed.

This supersedes older local counts in nearby docs for this checkout. The
current release-readiness docs and latest rerun agree on 432/432.

## Fast Local Gates

| Command | Scope | Current result |
| --- | --- | --- |
| `git diff --check` | Whitespace/conflict-marker sanity | Passed |
| `npm audit --audit-level=high` | High-severity dependency audit for desktop package | Passed, 0 vulnerabilities |
| `npm test` | Full desktop Node test suite: `node --test 'test/*.test.js'` | Passed, 432/432 |
| `npm run check:release-evidence` | Operator evidence-log completeness; fails until required rows are `PASS` or documented `DEFER` | Expected fail until manual gates are filled |

The root package is the only package with test scripts relevant to this desktop
matrix. `backend/package.json` has no scripts. `examples/headless-tab` has a
placeholder `npm test` that intentionally exits with "no test specified" and
should not be treated as a failing desktop gate.

## Current Test Coverage Map

The desktop test suite currently covers these broad families:

- anonGPT verification and gate behavior.
- catalogue normalizers, personal catalogues, signed catalogues, Autobee and
  schema-sheets catalogues, HiveRelay/index-room rows, and community submissions.
- app launch metadata and safety contracts for Peercord, peerit, Pear bridge,
  peer-first fetch, and mobile source contracts.
- browser state, tabs, storage quota, history serialization, and sync/shared
  store behavior.
- contacts, identity, Nostr key/binding/event ingestion/query/verification, and
  trusted-contact feed behavior.
- naming records, registry convergence, normalization, NIP-19/Nostr identity,
  and name resolution precedence.
- search core, shards, frontier/federation, completeness, query planner,
  personal index, and signed row verification.
- encrypted Autobase helper behavior, blind-pin durability experiments, and
  relay record/capability verification.

## GUI And Runtime Gates

These require a launched PearBrowser desktop process. Do not count them as
covered by `npm test`.

| Command | Classification |
| --- | --- |
| `node scripts/runtime-rpc-smoke.mjs --timeout 20000 --json` | Diagnostic WebSocket smoke against an already-running app. Requires PearBrowser to be launched first |
| `npm run start` | Interactive Pear dev launch: `pear run --dev .` |
| `npm run run` | Interactive Pear launch: `pear run .` |
| `pear run pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty` | Production browser launch/manual smoke gate |

Use `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md` for GUI proof. Record machine,
commit SHA, screenshots/logs, and pass/fail notes beside each checked item.

## Real-DHT And Release-Drive Gates

These require real network/DHT access and can false-negative in restricted or
sandboxed environments.

| Command | Scope |
| --- | --- |
| `npm run evidence:desktop -- --write --ci-url <Desktop CI run URL>` | Runs the safe desktop release-evidence gates and patches matching rows in the evidence log |
| `node scripts/check-relays.js --require-relay --json` | HiveRelay discovery/connection health; exits non-zero when no real-DHT relay is reachable |
| `node scripts/verify-pin.js --expect 18614 --hiverelay` | Fresh-peer production browser drive reachability and length, plus HiveRelay proof evidence when available |
| `node scripts/verify-release-contents.js --expect 18614 --missing /.landing-seed.mjs --missing /pearbrowser-storage --missing /docs --missing /scripts --missing /examples --missing /test` | Fresh-peer release contents and forbidden-path absence |
| `node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm` | Live PearBrowser Network catalogue contents |
| `node scripts/verify-app-full.js homepage` | Fresh-peer homepage drive sampling |
| `node scripts/verify-app-full.js peercord` | Fresh-peer Peercord bundle sampling without executing it |
| `node scripts/verify-app-full.js keet` | Fresh-peer Keet bundle sampling without executing it |
| `node scripts/verify-pear-bundle-contract.js peercord-linux` | Peercord Linux bundle contract without execution |
| `node scripts/verify-pear-bundle-contract.js peercord-windows` | Peercord Windows bundle contract without execution |

## Third-Party Trust Gate

Peercord is a `standalone` Pear desktop app. Launching it from PearBrowser
executes third-party code and can create a persistent Pear trust decision for:

```text
pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy
```

Do not automate approval. The release gate is a human/operator check: review the
Pear trust prompt, approve intentionally, confirm the standalone window launches,
and record evidence in the manual smoke checklist.

## Mobile/Native Cross-Repo Gates

Desktop local tests do not prove mobile distribution. `docs/RELEASE_READINESS_2026-06-23.md`
records separate mobile/native proof from the sibling mobile repo. Keep those
as separate gates:

- mobile/native `npm test`.
- mobile/native `npm run release:preflight -- --soft` and then strict
  `npm run release:preflight` when production signing/store markers are ready.
- generated Expo iOS Debug/Release simulator builds.
- tracked SwiftUI iOS shell build/install/launch.
- Android native builds with the known-good Temurin JDK setup.
- Android APK/AAB signing and verification.
- broader real-device smoke before mobile distribution.

Latest mobile evidence refresh: sibling repo `bigdestiny2/PearBrowser@01eb8c7`
records `npm test` at 136/136, high-severity audit exit `0`, and release
preflight `14 pass / 0 warn / 4 fail` at `2026-06-23T15:51:08.065Z`. The four
failures remain the expected production credential/store-validation gates.

## Release Operations And Publish Gates

The release scripts are operational gates, not ordinary tests:

- `scripts/release-prod.sh` stages/releases/pins/verifies production desktop.
- Fresh-peer verification should be run off the publisher box when possible.
- Desktop source install depends on sibling local HiveRelay packages:
  `../../00-core/hiverelay/packages/{core,client,verifier}`.
- A standalone clone of `pearbrowser-desktop` is not yet sufficient until those
  relay packages are published or vendored differently.

## Recommended Next Edge

Run the PearBrowser Desktop release-evidence cleanup pass:

1. Run real-DHT verifier scripts from a non-sandboxed, real-network environment
   and append exact results to `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`.
2. Capture runtime RPC smoke only after launching the desktop app.
3. Capture Peercord trust-prompt and standalone-window evidence manually,
   without automating approval.
4. Run `npm run check:release-evidence`; it should exit `0` only after the
   operator evidence log is filled and the final decision is `GO` or
   `GO desktop only`.
5. Keep mobile/native production signing and store validation in the mobile
   release lane.

## Source Evidence

- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/package.json`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/backend/package.json`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/examples/headless-tab/package.json`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/docs/CURRENT_STATUS_AUDIT_2026-06-23.md`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/docs/RELEASE_READINESS_2026-06-23.md`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/runtime-rpc-smoke.mjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/check-release-evidence.mjs`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/check-relays.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/verify-pin.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/verify-live-catalog.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/verify-release-contents.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/verify-app-full.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/scripts/verify-pear-bundle-contract.js`
- `/Users/localllm/Projects/pear-ecosystem/01-browser/pearbrowser-desktop/test`
