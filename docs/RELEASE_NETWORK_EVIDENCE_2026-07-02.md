# PearBrowser Release And Network Evidence - 2026-07-02

## Decision
PearBrowser Desktop is source-green in the current checkout, but it is not announcement-ready. The remaining release work is operator evidence: desktop GUI and real-network rows, Peercord human trust approval, mobile real-device and production signing/store rows, and the final announcement decision.

## Checkout
- Root: `~/pear-ecosystem/01-browser/pearbrowser-desktop`
- Branch: `fix/native-packaging-linux-deps`
- Head: `bb3bb68`
- Package version: `pearbrowser-desktop@0.5.2`

## Fresh Local Evidence
| Command | Result | Notes |
|---|---|---|
| `npm test` | Pass | Re-run on 2026-07-02 after the origin-isolation smoke evidence checker tests were added: `512/512` tests passed. |
| `node --test test/release-evidence.test.js test/release-packaging.test.js test/mobile-source-contract.test.js test/relay-client-http.test.js` | Pass | Re-run on 2026-07-02 after the origin-isolation smoke-plan generator landed: `77/77` focused release, mobile-contract, and relay-client tests passed. |
| `node --test test/http-bridge-sse-ticket.test.js test/http-bridge-sync.test.js` | Pass | Added on 2026-07-02 after the desktop SSE correction: `3/3` focused bridge tests passed. |
| `node --test test/origin-isolation.test.js test/http-bridge-sse-ticket.test.js test/http-bridge-sync.test.js test/anongpt-gate.test.js` | Pass | Re-run on 2026-07-02 after the feature-flagged origin-isolation listener-release proof: `13/13` focused origin, bridge, SSE, sync, and anonGPT tests passed. |
| `node --test test/origin-isolation.test.js test/tabs.test.js test/constants-mirror.test.js` | Pass | Re-run on 2026-07-02 after `CMD_RELEASE_ORIGIN` and tab drive-key helpers landed: `24/24` focused origin lifecycle, tab, and constant-mirror tests passed. |
| `node --test test/origin-isolation-smoke-evidence.test.js test/release-packaging.test.js` | Pass | Re-run on 2026-07-02 after the Peerit/Pearfeed origin-isolation operator plan was generated and attached to the release evidence row: `59/59` focused origin-evidence and release-packaging tests passed. |
| `node --test test/origin-isolation-smoke-evidence.test.js test/release-packaging.test.js` | Pass | Re-run on 2026-07-04 after the automated origin-isolation evidence generator landed: `62/62` focused origin-evidence and release-packaging tests passed. |
| `npm run check:origin-isolation-smoke-evidence -- --file docs/origin-isolation-smoke-evidence-peerit-pearfeed-2026-07-04.json --json` | Pass | 2026-07-04 generated Peerit/Pearfeed evidence artifact passed with `ok:true`, `status:"verified"`, `26/26` checks, and no warnings. |
| `npm audit --audit-level=high` | Pass | Re-run on 2026-07-02: `found 0 vulnerabilities`. |
| `git diff --check` | Pass | Re-run on 2026-07-02: no whitespace or conflict-marker errors in the current diff. |
| `npm run check:release-evidence -- --json` | Expected fail | Re-run on 2026-07-04 after attaching the automated Peerit/Pearfeed origin-isolation evidence artifact: `44` passed rows, `3` deferred rows, `28` incomplete rows, `0` failures. The command still exits 1 because unrelated manual/announcement rows remain blank. |

## Proven Locally
- Desktop source tests are green in the current checkout.
- High-severity dependency audit is green.
- Release-evidence parser and handoff logic are covered by focused tests.
- Native packaging/public-trust release script contracts are covered by focused tests.
- Mobile source-contract tests still prove the desktop repo tracks the sibling mobile release contract shape.
- Relay client tests preserve scheme-aware HTTP/HTTPS gateway behavior, oversized-body rejection, and timeout teardown.
- Desktop `swarm.v1` EventSource streams now use short-lived one-time tickets from header-authenticated `POST /api/swarm/ticket`; old bearer `?token=` stream URLs reject.
- Feature-flagged per-drive origin core is implemented behind `PEARBROWSER_PER_DRIVE_ORIGINS=1`: drive-scoped local URL generation, per-drive loopback listener registry, bound-drive rejection, HTML `<base>` origin injection, origin-bound bridge tokens, origin-bound SSE tickets, single-port fallback, and explicit idle-listener release have focused unit proof.
- `npm run -s generate:origin-isolation-smoke-plan -- --app-a hyper://<app-a-drive>/ --app-b hyper://<app-b-drive>/ --json --out origin-isolation-smoke-plan.json` now emits the feature-flagged origin/storage/CSP/tab-navigation/bridge proof checklist plus an automated verifier command.
- The current plan uses Peerit plus Pearfeed drive identities and is saved at `docs/origin-isolation-smoke-plan-peerit-pearfeed-2026-07-02.json`.
- `npm run -s generate:origin-isolation-smoke-evidence -- --plan docs/origin-isolation-smoke-plan-peerit-pearfeed-2026-07-02.json --out docs/origin-isolation-smoke-evidence-peerit-pearfeed-2026-07-04.json --json` now produces the release evidence artifact from the plan.
- `npm run -s check:origin-isolation-smoke-evidence -- --file docs/origin-isolation-smoke-evidence-peerit-pearfeed-2026-07-04.json --json` verifies that artifact before it is used as release proof.

## Not Proven By This Slice
- Desktop production GUI smoke was not rerun with a launched PearBrowser process.
- Real-DHT/fresh-peer checks were not rerun in this slice.
- Peercord trust prompt approval was not automated and remains a human/operator gate.
- Mobile real-device smoke was not rerun.
- Android/iOS production signing and store validation remain blank in the evidence log.
- Browser-level per-app origin isolation remains feature-flagged; default-on listener policy and any broader production rollout decision are still separate from the completed release evidence artifact.

## Current Release Evidence Blockers
`npm run check:release-evidence -- --json` still blocks announcement on blank operator rows:

- Desktop GUI/user-story rows: browse, fresh launch, catalogue, latest-app, featured-app regression, Nostr trusted-contact, and library/session stories.
- Peercord trust gate: prompt review, intentional approval, standalone launch, and launch-mode check.
- Mobile manual/distribution rows: iOS and Android real-device smoke, Android share, mobile catalogue, mobile direct P2P API, Android/iOS production signing, store validation, and strict mobile preflight.
- Announcement decision rows: desktop automated, desktop GUI, Peercord trust, mobile automated, mobile production scope, residual-risk note, and final `GO` / `NO-GO` / `GO desktop only` decision.

## Next Compounding Loop
Do not reopen the SSE ticket slice unless a regression appears. The next useful PearBrowser work is one of:

1. Run the desktop GUI and real-network verifier rows from `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`, then fill `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md`.
2. Run mobile real-device and production signing/store proof, then fill the mobile manual/distribution rows.
3. Complete the selected browser-level per-app origin isolation migration by running the feature-flagged GUI/storage/CSP/tab-navigation/real-app proof matrix from `docs/ORIGIN_ISOLATION_MIGRATION_2026-07-02.md`.

## Related
- `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md`
- `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`
- `docs/ORIGIN_ISOLATION_MIGRATION_2026-07-02.md`
- `docs/SECURITY-BOUNDARY-ALIGNMENT-2026-06-23.md`
- `docs/TEST-COMMAND-MATRIX-2026-06-23.md`
