# PearBrowser Desktop v0.6.0 — operator release runbook

> Historical v2 operator record. It must not be reused to publish, launch, or
> recover current builds; use the verified native-package v3 release workflow.

Date: 2026-07-15
Tag: `v0.6.0`  
Repo: `bigdestiny2/pearbrowser-desktop`  
Production link: `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty` (stable; length advances on release)
Release source merge: `4e0f56adadf7e33f0c7686be563349fe56f3985a`
Tag target: `74e0af8e7fac1feb9144c59bd665a1686995eef6`
Released Pear length: `63158`

This document is the **release schedule/routine** for shipping this version. It
compresses `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`, `docs/NATIVE_RELEASE_PACKAGING.md`,
and `scripts/release-prod.sh` into an ordered checklist for v0.6.0.

## 0. What ships in 0.6.0

- Content Shield Phases 1–3 + expanded tracker seed
- Pear Plugins foundation
- Clearnet tabs (proxy default) + privacy ladder
- History / search index opt-in; telemetry never
- Ask Browser / QVAC (on-device AI)

## 1. Preflight (local — automated)

Run from repo root with network access:

```sh
npm test
git diff --check
npm audit --audit-level=high
npm run check:appling-release -- --tag v0.6.0
npm run check:linux-appimage-metadata -- --json
node scripts/check-relays.js
# Optional live network proofs (need healthy DHT/relays):
# node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm
# node scripts/verify-pin.js --expect <PREV_LEN> --hiverelay   # before release
```

Gates that must be green before publishing:

| Gate | Command | Expected |
|------|---------|----------|
| Unit/integration suite | `npm test` | 0 fail |
| Whitespace | `git diff --check` | clean |
| High vulns | `npm audit --audit-level=high` | 0 |
| Appling metadata | `npm run check:appling-release -- --tag v0.6.0` | exit 0 |
| Linux AppImage metadata | `npm run check:linux-appimage-metadata` | exit 0 |

## 2. Merge to main

1. Land the release candidate branch on `main` (PR review as usual).
2. Record the merge commit SHA as `SOURCE_REF`.
3. Confirm desktop CI is green for that commit.

```sh
SOURCE_REF=$(git rev-parse origin/main)
echo "SOURCE_REF=$SOURCE_REF"
```

## 3. Pear production release (content-addressed channel)

Publishes the staged drive on the **stable** production key (users hot-sync):

```sh
./scripts/release-prod.sh
# Dry-run without pin:
# ./scripts/release-prod.sh --no-pin
```

Pipeline:

1. `pear stage --purge <production-link> .`
2. `pear release <production-link> .` (deprecated but still the solo-publisher path)
3. `node scripts/pin-self-on-hiverelay.js` (365-day TTL refresh)
4. Verify reachability (publisher-box path uses durable seeder log; remote CI can use `verify-pin.js`)

After success, record:

- New **released length** from script output → update README “Current release” line
- Pin acceptance count
- `node scripts/verify-release-contents.js --expect <NEW_LEN> --missing /.landing-seed.mjs --missing /pearbrowser-storage --missing /docs --missing /scripts --missing /examples --missing /test`

## 4. GitHub tag + release notes

```sh
git tag -a v0.6.0 -m "PearBrowser Desktop v0.6.0"
git push origin v0.6.0

gh release create v0.6.0 \
  --repo bigdestiny2/pearbrowser-desktop \
  --title "PearBrowser Desktop v0.6.0" \
  --notes-file CHANGELOG.md \
  --draft
# Promote from draft after native assets attach.
```

## 5. Native installer assets (GitHub Actions)

```sh
gh workflow run desktop-native-release.yml \
  --repo bigdestiny2/pearbrowser-desktop \
  --ref main \
  -f tag=v0.6.0 \
  -f source_ref="$SOURCE_REF" \
  -f release_mode=package-proof
```

For announcement-ready signed/notarized assets (needs secrets):

```sh
npm run check:native-signing -- --require-public-trust --secret-source github --repo bigdestiny2/pearbrowser-desktop
gh workflow run desktop-native-release.yml \
  --repo bigdestiny2/pearbrowser-desktop \
  --ref main \
  -f tag=v0.6.0 \
  -f source_ref="$SOURCE_REF" \
  -f release_mode=public-trust
```

After the attach job succeeds:

```sh
npm run check:native-release-assets -- --tag v0.6.0 --repo bigdestiny2/pearbrowser-desktop --require-backfill-formats
npm run verify:native-downloads -- --tag v0.6.0 --repo bigdestiny2/pearbrowser-desktop --all
npm run -s generate:native-install-snippet -- --tag v0.6.0 --repo bigdestiny2/pearbrowser-desktop
npm run -s generate:native-install-guide -- --tag v0.6.0 --repo bigdestiny2/pearbrowser-desktop
npm run -s generate:native-install-smoke-plan -- --tag v0.6.0 --repo bigdestiny2/pearbrowser-desktop --source-ref "$SOURCE_REF"
```

Regenerate `docs/INSTALL_NATIVE_PACKAGES.md` from the install guide output if asset names match.

## 6. Runtime / story smoke (human + automated)

With a launched desktop build:

```sh
node scripts/runtime-rpc-smoke.mjs --timeout 20000
node scripts/release-rpc-story-smoke.mjs --local-stories --site-story --json
npm run -s generate:release-evidence-handoff
# After filling docs/RELEASE_SMOKE_EVIDENCE_LOG_*.md:
# npm run check:release-evidence
```

Manual UI (from MANUAL_RELEASE_SMOKE): Browse landing, shield toggle, clearnet `example.com`, history-off default, Ask Browser if QVAC models present, Apps catalogue, publish temp site.

## 7. Public-trust readiness (announcement)

```sh
npm run check:public-trust-readiness -- --tag v0.6.0 --repo bigdestiny2/pearbrowser-desktop --source-ref "$SOURCE_REF" --signing-secret-source github
npm run -s generate:public-trust-operator-report -- --tag v0.6.0 --repo bigdestiny2/pearbrowser-desktop --source-ref "$SOURCE_REF" --signing-secret-source github
```

Do **not** announce if:

- `npm test` / CI red
- Pear release length unverified from a fresh peer
- Native assets missing or checksum verify fails
- `check:release-evidence` non-zero without documented DEFERs
- Public-trust readiness reports unresolved blockers (for signed announcement)

## 8. Post-release

- [x] Publish GitHub release after package-proof asset and public-download verification
- [x] Update README “Current release” with **new length** + precise fresh-peer/replication evidence
- [x] Commit length record (pattern: “Record v0.6.0 Pear release length”)
- [x] Update and deploy `pearbrowser.com` release/download metadata
- [ ] Optional: package-manager drafts (`generate:package-manager-manifests`)
- [ ] Announce (Discord/community) with install guide + pear:// fallback

## Status of this run

Filled while preparing and releasing the desktop preview (2026-07-15):

| Step | Status |
|------|--------|
| Version bump 0.6.0 (package, lock, CMake, AppStream) | **done** |
| CHANGELOG v0.6.0 | **done** |
| README / install docs retargeted to v0.6.0 | **done** |
| `npm test` | **640/640 pass** (including sibling mobile source-contract checks) |
| `git diff --check` | **clean** |
| `npm audit --audit-level=high` | **0 vulnerabilities** |
| `check:appling-release --tag v0.6.0` | **ok** (PearBrowser 0.6.0 → production key) |
| `check:linux-appimage-metadata` | **ok** |
| `check-relays.js` | **ok** (1 unique DHT relay, 11 live connections) |
| Production `pear info` | **release/length 63158** (advanced from 45758) |
| Merge to main | **done** (`4e0f56adadf7e33f0c7686be563349fe56f3985a`; main CI green) |
| `./scripts/release-prod.sh` | **done** (five pin acceptances; durable seeder observed five remote peers) |
| `gh release create v0.6.0` + native workflow | **done** (public release; package-proof run `29423320986`; 18 assets) |
| Production stable-address runtime/story evidence | **done** (DHT/proxy/relay and first-party desktop stories pass) |
| Public download verification | **done** (macOS arm64/x64, Windows x64, Linux x64 match sidecars) |
| `pearbrowser.com` release surface | **done** (PR #1 merged; Vercel and live metadata verified) |
| Evidence log | **done** |
| Discord/community announcement | **operator** (target/account not supplied in this run) |

Preflight log (this machine): capture under implementer scratch
`release-v0.6.0-preflight.log`.
