# PearBrowser Release Readiness - 2026-06-23

Scope: desktop PearBrowser, mobile/native PearBrowser, the live PearBrowser Network catalogue, and the high-risk systems called out for review: catalogue, app launch, search, naming, Nostr bridge, site publishing, sync, and release operations.

## Current Verdict

The release is in strong shape for a community launch. The core protocol tests are broad and green after the final catalogue cleanup:

- Desktop: `node --test 'test/*.test.js'` passed `402/402`.
- Mobile/native: `npm test` passed `124/124`.
- Publisher catalogue: `npm run validate` passes with no warnings.
- Desktop and mobile `git diff --check` are clean.
- Live catalogue Hyperbee republished at `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`; 5 relay seed requests were accepted.
- Production browser drive fresh-peer verification passed at length `16898`, with `/CHANGELOG.md` blob fetch proving content blocks are reachable.
- Live catalogue fresh-peer verification passed at Hyperbee core length `206`, with signed meta present and Peercord/HiveWorm rows matching expected release metadata.

One transient desktop `npm test` run reported `401/402`; the immediately repeated compact full run passed `402/402`, and the catalogue-focused subset passed `30/30`. No code change was needed for that blip.

## Fixes In This Pass

- Added Peercord to the featured apps and default catalogue, with tests.
- Kept Peercord on the standalone Pear launch path. Upstream Peercord currently ships as a full Pear desktop app, not a pear-request worker, so surfacing "Run in tab" would create a bad launch experience. It can move to headless tab launch once Peercord publishes a worker/headless entry point.
- Cleaned the HiveWorm catalogue row: explicit `driveKey`, `url` for the Hyperdrive page, and no misleading `pearLink` for a `hyper://` target.
- Added `catalog-source/pearbrowser-network.catalog.json` so the canonical catalogue source is versioned in the desktop GitHub repo.
- Regenerated `backend/catalogue-seed.js` from the versioned catalogue source so the offline seed and live catalogue agree.
- Added `.landing-seed.mjs` to `.gitignore` so the local operational landing-page seeder does not appear as release source.

## Catalogue And Launch

The Apps surface is coherent now:

- Featured apps include Keet, PearPass, anonGPT, Paste, and Peercord.
- The default live catalogue and the offline seed both contain 13 entries.
- The catalogue loader accepts Hyperdrive JSON, signed Hyperbee, Autobee, schema-sheets rooms, HiveRelay index rooms, community submissions, and writable personal catalogues.
- App rows distinguish launch behavior:
  - `standalone`: full Pear/file apps open in their own isolated window through `CMD_LAUNCH_PEAR_LINK`.
  - `hypersite`: pear-request/streamed apps use `CMD_RUN_APP_IN_TAB` and render headless in a Browse tab.
  - static Hyperdrive pages open directly in Browse.
- The browser prefetches known Pear bundle keys before standalone launch and surfaces download/peer progress, so a user can run the latest catalogue version without visiting a project page, downloading a package, or applying manual updates.

Peercord specifically:

- Catalogue link: `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`
- Version: `1.0.8`
- Source: `https://git.churchofmalware.org/mastercodeon/Peercord`
- Launch mode: `standalone`
- Reason: current upstream `pear.json` is `type: "desktop"` with `main: "index.js"` and no pear-request worker bridge.

## Search

The search engine is well defended for a release:

- Local-first search returns first-paint results without waiting on federation.
- Queries are NFKC-normalized and capped at 512 chars.
- Limits are clamped to `0..100`.
- Federated search is opt-in and emits a correlated enriched event with `queryId`; stale federations are dropped.
- Personal index records are signed and verifiable by peers.
- Ranking is deterministic, resistant to NaN/negative-score poisoning, and avoids burying strong text matches.
- Fanout is digest-first where possible, bounded by per-query and live-session budgets.
- Completeness anchors detect forged, truncated, or forked peer indexes where the metadata exists.

Remaining improvement: external, multi-peer search performance should still be sampled with real trusted peers after launch traffic exists.

## Naming

The naming layer is ready as an experimental but usable local/social name system:

- URL-bar bare names and `pearname://` resolve through the same typed-name path.
- Local petnames win over registry and curated aliases.
- Registry names are owner-signed, monotonic, and protected against replay, release/reclaim mistakes, and homograph squatting.
- Federated contact claims are accepted only when the contact is verified and the claim owner matches the contact root.
- Provenance is preserved, so a petname, registry record, curated alias, and trusted-contact answer are not falsely equivalent.

Remaining improvement: the UI could make provenance more discoverable in the address bar without adding friction.

## Nostr Bridge

The Nostr bridge is scoped correctly for this release: trusted-contact Nostr, not a public relay client.

- Nostr keys are deterministically derived from the PearBrowser identity seed.
- Binding is dual-signed: the Pear root signs the Nostr key and the Nostr key signs the Pear root.
- Revocation and higher-epoch rebinding are covered.
- Events are verified, deduped, queryable, and partitioned by trust.
- Federated contact feeds only admit events authored by that contact's attested Nostr key.
- Revoked or forged bindings hide/quarantine contact events instead of showing them as trusted.

Remaining improvement: public relay client behavior, relay moderation policy, and large-feed UX are future work.

## Mobile/Native Parity

The native tree is clean and tested:

- TypeScript, backend syntax checks, bridge templates, and native source-contract tests pass.
- Mobile catalogue normalization preserves safe link-only rows and rejects targetless rows.
- iOS and Android bridge constants are mirrored for login, profile, connected apps, trusted origins, and `swarm.v1`.
- Mobile flows cover Home, Browse, Explore, Settings, My Sites, editor, QR scanner, identity backup/restore, and bridge runtime smoke tests.

Remaining improvement: simulator/device smoke should be run before app-store-style distribution, because local Node tests do not prove platform WebView behavior under real OS permissions.

## Release Operations

The release script is in better shape after the recent verify-step fix:

- `scripts/release-prod.sh` stages, releases, pins, and verifies.
- On the publisher box, it avoids false failure from same-NAT/fresh-peer verification by confirming the durable seeder announced the new length and has live remote peers.
- Off the publisher box, `scripts/verify-pin.js --expect <length>` remains the stronger external round trip.
- `scripts/verify-live-catalog.js` fresh-loads the published Hyperbee catalogue and asserts expected app rows from the network.
- `scripts/verify-app-full.js` is available for deeper fresh-peer blob sampling across a drive.

Required external smoke before a public announcement:

- If time allows, run `node scripts/verify-app-full.js --key 1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d --name pearbrowser --samples 12`.
- Launch Peercord and one existing featured Pear app from the catalogue to verify real Pear runtime behavior.

## Evidence

Commands run during this pass:

```sh
npm test
node --test --test-reporter=spec test/*.test.js
node --test test/catalog-manager-safety.test.js test/catalog-bee.test.js test/peercord-catalog.test.js test/resolve-name.test.js test/index-room-client.test.js
git diff --check
npm test # mobile/native
npm run validate # publisher catalogue
node scripts/gen-catalogue-seed.mjs
node scripts/publish-catalog-bee.js catalog-source/pearbrowser-network.catalog.json --storage /Users/localllm/Projects/pear-ecosystem/03-sites/pearbrowser-publishers/catalog
node scripts/check-relays.js
node scripts/verify-pin.js --expect 5440
node scripts/verify-live-catalog.js --expect-app peercord --expect-app hiveworm
```

Key live values:

- Production browser link: `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
- Browser homepage drive: `hyper://1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d/`
- PearBrowser Network catalogue: `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`
- Peercord: `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`

## Residual Risks

- Live GUI launch was not proven inside this local test pass. Automated tests prove the routing contracts and fresh-peer checks prove bytes are reachable; a real Pear window smoke still matters.
- Network replication can vary by relay health and NAT conditions. This pass saw reachable relays, a reachable production drive, and a reachable live catalogue, but a second-network spot check remains useful before a high-visibility announcement.
- Peercord cannot honestly be marketed as headless-in-tab until upstream ships a compatible pear-request worker. PearBrowser does launch it from the featured catalogue without manual download/update.
- Public Nostr relay behavior is not part of this release; the shipped feature is the trusted-contact bridge.
