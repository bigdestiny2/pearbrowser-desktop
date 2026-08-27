# PearBrowser Desktop - Current Status Audit (2026-06-23)

This note is the current, source-backed status surface for PearBrowser Desktop.
It is intended to help future agents distinguish shipped facts, release proof,
and remaining operator gates before doing Level 1 or Level 2 work.

## Current Read

PearBrowser Desktop is a mature v0.5.0 release candidate for a P2P-native
browser, app catalogue, site publisher, local-first search engine, naming layer,
trusted-contact Nostr bridge, and Pear app launcher.

The core architecture is already beyond a prototype: the README and release
readiness notes describe a live production Pear link, HiveRelay pinning, a
default PearBrowser Network catalogue, multi-source app ingestion, personal and
federated search, safe target normalization, identity-backed login, swarm.v1,
and operational scripts for pin, catalogue, relay, and bundle verification.

The strongest current evidence is local and protocol-level. The release notes
record `npm test` passing with 443/443 desktop tests, Desktop CI passing on the
release branch, high-severity dependency audit passing, the live catalogue
fresh-peer check passing at Hyperbee length 273 with 14 apps, and the production
browser drive fresh-peer check passing at length 18640. The search handover
also records that local self-search is live and opt-in trusted-peer federation
is wired through `QueryPlanner`.

This is not fully public-release-cleared by automation alone. The remaining
gates are mostly operator, network, trust, and distribution proof: real-network
smoke, explicit human approval of Peercord's third-party trust prompt, a
featured-app regression launch, live GUI flows, mobile production signing/store
validation, and broader real-device smoke.

## Source Evidence Read

- `package.json` declares `pearbrowser-desktop` v0.5.0 and a compact local test
  command: `node --test 'test/*.test.js'`.
- `README.md` describes the current release key, HiveRelay pinning model,
  catalogue shape, app launch behavior, search, naming, Nostr, identity,
  swarm.v1, settings, release scripts, and distribution path.
- `docs/RELEASE_READINESS_2026-06-23.md` is the highest-level release state and
  evidence ledger.
- `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md` is the human/operator gate checklist
  for UI flows, Peercord trust approval, mobile device smoke, and signing/store
  gates.
- `docs/SEARCH-HANDOVER.md` is the live Lighthouse search handover, including
  invariants and remaining search maturity work.
- `docs/P2P-BROWSER-FEATURE-ROADMAP.md` tracks shipped browser capability,
  near-term product priorities, and medium-term tracks.
- `docs/DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md` captures the
  catalogue, search, naming, and Nostr boundary audit plus later addenda through
  the 2026-06-23 release recheck.
- `docs/HIVERELAY-BACKBONE-HANDOVER.md` describes the schema-sheets relay-index
  design that future desktop relay discovery can consume.
- `docs/PEERCORD_BUNDLE_REPAIR_2026-06-28.md` records why Peercord's public
  bundle availability repair depends on the Peercord publisher/operator even
  though the upstream source is reachable.

## Strong Evidence Completed

- Desktop browser surface is documented as a current product, not only a
  research branch: Browse, Apps, Publish, Library, Search, Naming, Nostr,
  Identity, Login consent, swarm.v1, Settings, and release operations are all
  described in source docs and backed by test families.
- The app catalogue is multi-source and safety-aware: Hyperdrive JSON, signed
  Hyperbee, Autobee, schema-sheets, HiveRelay index rooms, default curated seed,
  community rows, and writable personal catalogues all flow toward a normalized
  safe target model.
- The default PearBrowser Network catalogue is documented as live at
  `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`
  with 14 apps, including Peercord, peerit, and HiveWorm.
- Peercord is intentionally treated as `standalone`, not a headless tab app,
  because the historical bundle contract and latest source audit both show a
  desktop Pear app with `BrowserWindow` and no `Pear.worker.pipe` entry.
- Lighthouse search is live locally and federates through a trust graph when
  requested. The handover records deterministic ranking, bounded fanout,
  identity binding, digest checks, completeness primitives, and verify/drop
  behavior for relay/index rows.
- Naming has local petnames, owner-signed registry records, curated aliases,
  trusted-contact claims, Unicode normalization, homograph checks, and safe
  target parity with catalogue rows.
- The Nostr bridge is intentionally scoped to Pear-native trusted-contact Nostr,
  with binding, revocation, event verification, quarantine/hidden diagnostics,
  and no default public `wss://` relay behavior.
- Release operations have clear scripts for staging/release/pin/verification,
  plus explicit caveats around the retired shared-CLI launch/release path and
  the future native-installer path.

## Validated In This Loop

- Promoted copy matched the draft with `cmp -s`.
- `git diff --check` passed on the current dirty worktree.
- `npm test` passed on the latest release branch.
  - Node test runner: 443 tests passed, 0 failed.
  - This supersedes the older 404/404, 408-test, and 427-test counts recorded in
    older release notes for purposes of current release evidence.

## Open Loops

- The manual desktop release smoke is still the public-announcement gate. It
  covers branch/head confirmation, local tests, `git diff --check`, high-severity
  audit, relay checks, production browser launch, Browse, Apps, catalogue launch,
  Peercord trust prompt, existing featured-app launch, Search, Naming, Nostr,
  site publishing, and Library/session persistence.
- Do not automate Peercord's trust-prompt approval. It executes third-party code
  and creates a persistent Pear trust decision for
  `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`.
- Do not run Peercord's `pear:stage`, `pear:seed`, or `release:*` scripts from
  the PearBrowser release machine unless the Peercord publisher explicitly
  grants authority to operate the canonical key. Current Peercord bundle repair
  needs upstream/operator reseed or complete publisher storage.
- Real-network checks can false-negative in restricted/sandboxed environments.
  `scripts/check-relays.js`, `scripts/verify-pin.js`, `scripts/verify-live-catalog.js`,
  and bundle sampling should be run with real DHT access before announcement.
- Desktop source install installs HiveRelay from npm at `^0.20.2` (lockfile
  `0.20.2`). A standalone clone resolves it from the registry; the optional
  sibling `../../00-core/hiverelay` checkout is dev-only. The
  `scripts/check-hiverelay-layout.mjs` guard exits quietly for registry installs,
  fails on dependency/lockfile drift, and validates the sibling checkout only
  when all three HiveRelay deps are explicit `file:` workspace specs.
  (Updated 2026-06-29: superseded the earlier vendored-`0.20.0`-tarball approach
  once the packages were published to npm.)
- Search's next product improvement is term-level result explanation inside
  result rows, beyond batch-level digest/fallback/partial provenance.
- Naming's next product improvement is clearer ambiguity and candidate
  provenance when multiple trusted contacts claim the same name.
- Nostr's next product improvement is a fuller quarantine/hidden-events browser
  for revoked, stale, untrusted, malformed, or future-dated contact activity.
- Catalogue's next product improvement is debounced Apps search that can query
  loaded schema-sheets catalogues via `CMD_SHEETS_LIST`, while retaining the
  aggregate offline fallback.
- Mobile/native is not app-store-release-cleared by desktop proof. The release
  readiness note records strong simulator/emulator and structural proof, but
  production Apple/Android signing, store validation, and broader real-device
  evidence are still required before mobile distribution.

## Relevant Commands

Local non-mutating checks:

```bash
npm test
git diff --check
npm audit --audit-level=high
```

Real-network release checks:

```bash
node scripts/check-relays.js
node scripts/verify-pin.js --expect 18640 --hiverelay
node scripts/verify-release-contents.js --expect 18640 --missing /.landing-seed.mjs --missing /pearbrowser-storage --missing /docs --missing /scripts --missing /examples --missing /test
node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm
node scripts/verify-app-full.js --key 1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d --name pearbrowser-homepage --samples 12 --timeout 90
node scripts/verify-app-full.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord --samples 12 --timeout 90
node scripts/verify-app-full.js --key 82110be69e2a531e840bc886dc7b9cab16729c587815295f55035109b45e4ddb --name keet --samples 12 --timeout 90
```

Human/operator checks:

```bash
npm start
# In a second terminal after the native host is ready:
npm run smoke:runtime
```

The former shared-CLI pointer is retired and is not an executable release check.
Public native verification must use a signed package bound to its AppRelease.

Then follow `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md` and record machine,
commit SHA, screenshots/logs, and pass/fail notes beside each checked item.

## Recommended Next Level 1/2 Edge

Run a PearBrowser Desktop release-evidence cleanup pass:

1. Re-run `npm test`, `git diff --check`, and `npm audit --audit-level=high` on
   the current dirty worktree and record whether failures are from current code
   or pre-existing local edits.
2. Run real-network verifier scripts from a non-sandboxed environment and
   append exact results to the manual smoke checklist.
3. Coordinate Peercord upstream/operator reseed, then capture a human
   trust-prompt and standalone-window launch result without automating the
   persistent trust decision.
4. Pick one bounded product clarity improvement: term-level search result
   explanations, naming ambiguity UI, fuller Nostr quarantine inspection, or
   schema-sheets Apps search.
