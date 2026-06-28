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
- `npm test` passed: 443 tests, 0 failed.

This supersedes older local counts in nearby docs for this checkout. The
current release-readiness docs and latest rerun agree on 443/443.

## Fast Local Gates

| Command | Scope | Current result |
| --- | --- | --- |
| `git diff --check` | Whitespace/conflict-marker sanity | Passed |
| `npm audit --audit-level=high` | High-severity dependency audit for desktop package | Passed, 0 vulnerabilities |
| `npm test` | Full desktop Node test suite: `node --test 'test/*.test.js'` | Passed, 443/443 |
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
| `node scripts/runtime-rpc-smoke.mjs --timeout 20000 --max-storage-percent 100 --json` | Diagnostic WebSocket smoke against an already-running app. Requires PearBrowser to be launched first; public smoke should fail if the profile is over quota |
| `node scripts/release-rpc-story-smoke.mjs --timeout 45000 --request-timeout 30000 --local-stories --json` | Nonvisual story preflight against an already-running app. Loads the release catalogues, fetches the PearBrowser homepage through the local proxy, validates featured catalogue rows, confirms Peercord remains window-only, and with `--local-stories` proves local search first-paint, curated/petname naming, and bookmark/session round-trips without launching third-party apps, approving trust prompts, or publishing a test site |
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
| `node scripts/check-relays.js` | HiveRelay discovery/connection health |
| `node scripts/verify-pin.js --expect 18640 --hiverelay` | Fresh-peer production browser drive reachability and length, plus HiveRelay proof evidence when available |
| `node scripts/verify-release-contents.js --expect 18640 --missing /.landing-seed.mjs --missing /pearbrowser-storage --missing /docs --missing /scripts --missing /examples --missing /test` | Fresh-peer release contents and forbidden-path absence |
| `node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm` | Live PearBrowser Network catalogue contents |
| `node scripts/verify-app-full.js --key 1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d --name pearbrowser-homepage --samples 12 --timeout 90` | Fresh-peer homepage drive sampling |
| `node scripts/verify-app-full.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord --samples 12 --timeout 90` | Fresh-peer Peercord bundle sampling without executing it |
| `node scripts/verify-app-full.js --key 82110be69e2a531e840bc886dc7b9cab16729c587815295f55035109b45e4ddb --name keet --samples 12 --timeout 90` | Fresh-peer Keet bundle sampling without executing it |
| `node scripts/verify-pear-bundle-contract.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord-linux --app-root by-arch/linux-x64/app/peercord/resources/app --expect-type desktop --expect-main index.js --contains index.js:BrowserWindow --absent index.js:Pear.worker.pipe` | Peercord Linux bundle contract without execution |
| `node scripts/verify-pear-bundle-contract.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord-windows --app-root by-arch/win32-x64/app/peercord/resources/app --expect-type desktop --expect-main index.js --contains index.js:BrowserWindow --absent index.js:Pear.worker.pipe` | Peercord Windows bundle contract without execution |

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

Latest mobile evidence refresh: sibling repo
`bigdestiny2/PearBrowser@9101200d8bb54ff31b21d6d90154cb2321756a6c` passed
Mobile Release Preflight run
`https://github.com/bigdestiny2/PearBrowser/actions/runs/28316870344` on `main`:
`npm test` at 139/139, high-severity audit exit `0`, native bundle and BareKit
mirror steps green, and the uploaded `mobile-release-preflight` artifact
verified as 14 pass, 0 warn, 4 expected blockers, and 0 unexpected blockers or
warnings. The four blockers remain the expected production
credential/store-validation gates.

## Release Operations And Publish Gates

The release scripts are operational gates, not ordinary tests:

- `scripts/release-prod.sh` stages/releases/pins/verifies production desktop.
- `npm run check:appling-release -- --tag v0.5.0` verifies native wrapper
  metadata, lockfile-owned CMake tooling, signing defaults, and package assets.
- `npm run check:native-signing` verifies macOS/Windows/Linux signing credential
  completeness for the packaging-proof path; add `-- --require-public-trust`
  before public distribution to require macOS Developer ID/notary and Windows
  PFX credential sets.
- `cd appling && npm ci && npm run generate && npm run build` builds the native
  wrapper for the current platform.
- `npm run package:appling -- --tag v0.5.0` collects native artifacts,
  `.sha256` sidecars, `SHA256SUMS-*`, and `manifest-*` files.
- `.github/workflows/desktop-native-release.yml` is the cross-platform release
  asset backfill path. It must be present on the default branch, and manual
  backfills should run with tag `v0.5.0` plus `source_ref` set to the branch or
  commit containing the packaging code. Latest proof: run
  `https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/28317333414`
  succeeded from `main` after the native signing credential preflight merge and
  refreshed 16 `v0.5.0` assets.
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
