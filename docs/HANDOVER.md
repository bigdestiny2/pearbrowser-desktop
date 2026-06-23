# PearBrowser Desktop — P2P-Infra Handover (master)

**Generated:** 2026-06-19 · **Release-status refreshed:** 2026-06-23 · **Release PR HEAD:** current branch tip · **Branch:** `feat/p2p-infra-naming` · **Version:** `0.4.5`
**Scope:** the **P2P-infra build** (the four-track program in [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md)) **+ the live branch/worktree/stash map.**
**Audience:** whoever picks up the infra program next — a fresh session, a teammate, or an AI agent.
**Canonical handover set:** this file (master) + [`SEARCH-HANDOVER.md`](./SEARCH-HANDOVER.md) (search companion).
The earlier `HANDOVER-v0.4.5.md` snapshot has been folded in here and removed. Since it: **Phase N1 is COMPLETE
on one branch** (n1ui UI half merged — §4) and **device sync is fully committed** (UI `b26e4c3` — §2/§6).

> **Historical note (refreshed 2026-06-23):** this handover still preserves some
> branch-map detail from 2026-06-19, but the product/release state has advanced.
> Search now has a live `QueryPlanner` path behind opt-in federation, naming has
> registry and trusted-contact federation, the trusted-contact Nostr bridge is
> implemented, and the live catalogue/release drives have fresh-peer verification.
> Use
> [`ARCHITECTURE_AND_CAPABILITIES.md`](./ARCHITECTURE_AND_CAPABILITIES.md) and
> [`DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md`](./DEEP_AUDIT_CATALOG_SEARCH_NAMING_NOSTR_2026-06-21.md)
> as the current product/audit baseline.

> ⚠️ **This worktree has multiple Claude sessions running on it at once.** During this handover,
> concurrent sessions committed, stashed, and reset files, and authored other handover docs
> (`SEARCH-HANDOVER.md` appeared mid-merge). Before editing a shared file (`ui/shell.js`,
> `backend/index.js`, `backend/constants.js`, `ui/boot.js`), check for live writers. See §9.

---

## 1. What the P2P-infra program is (60 seconds)

One substrate, four projections. The thesis (overview §0): each track is *a signed assertion bound to
an Ed25519 identity, ingested verify-and-drop, reduced by a deterministic wall-clock-free reducer, made
durable by HiveRelay pinning, and resolved relative to a social trust graph — not a global registrar.*

- **Naming** binds `name → key` · **Payments** binds `sale → receipt` · **Nostr** binds `event → author`
  · **Privacy-routing** wraps the transport the other three ride on.
- They share **5 primitives + the L0 root gate** (`identity.verify`). Built once, the tracks become thin
  schema-and-policy layers. Full sequencing + per-phase exit criteria: [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md).

**Lighthouse reconciliation (load-bearing):** the parallel `search(phase1–5)` work already shipped the
shared substrate, so the tracks **reuse it, not rebuild it**:
- `backend/identity-binding.cjs` = the canonical IdentityBinding + detached `verifyAppSig` (**supersedes the
  old N2** — naming binds its name key here).
- `backend/search-frontier.cjs` `verifyIndexPointer` = the social-graph Sybil gate.
- `backend/search-completeness.cjs` `verifyAnchor`/`verifyFreshness` = omission/eclipse detection.

---

## 2. Program status — per track

| Track | Status | Evidence | Notes |
|---|---|---|---|
| **Shared substrate** | ✅ **Shipped** (via the search track) | `backend/identity-binding.cjs`, `search-frontier.cjs`, `search-completeness.cjs` | Reuse verbatim. The binding format now carries a signed `purpose` field so search/name/merchant/nostr/routing consumers cannot accidentally accept a binding minted for another purpose. |
| **L0 — Identity `verify()`** | ✅ **Committed** (P0) | `06614f2`; `backend/identity.js`, `CMD_IDENTITY_VERIFY=75`, `test/identity-verify.test.js` | Ed25519 `verify`/`verifyForApp`; un-stubbed `anongpt-buyer`. The root gate for all trust-bearing work. |
| **Naming** | ✅ **Experimental but end-to-end usable** | `backend/name-registry-*`, `federated-name-resolver.cjs`, `resolve-name.cjs`, `ui/lib/keys.js`, name tests | URL-bar bare-word + `pearname://` resolution, petnames, owner registry, trusted-contact federation, curated aliases, homograph guardrails, and provenance all ship. Remaining improvement: clearer provenance/ambiguity UX. |
| **Payments** | ⛔ **Not started** | no `backend/payment*`/`*receipt*` files | First real phase PAY1 (signed receipt op-log) is **gated on `SPIKE-AUTOBEE-DURABILITY`**. PAY2/3 span **pear-pos / pear-exchange** (vendor escrow/onchain `.cjs`). |
| **Nostr** | ✅ **Trusted-contact bridge shipped** | `backend/nostr-*`, `secp256k1-bundle.cjs`, `NostrBindingStore`, `FederatedNostrFeed`, Nostr tests | Deterministic Nostr key, mutual Pear↔Nostr attestation, revoke/rebind, local NIP-01 event store, and trusted-contact feed diagnostics ship. Public `wss://` relay client behavior remains future work. |
| **Privacy-routing** | ⛔ **Not started** | no `backend/routing*` files | PRIV0 (metadata-min defaults) is cheap + default-on and can land early; PRIV1+ build the routing directory + single-hop. |
| **Search** (substrate's origin) | ✅ **Local-first + opt-in federated path shipped** | `PersonalIndex`, `QueryPlanner`, `search-handler.js`, `EVT_SEARCH_FEDERATED`, search tests | Local results paint immediately; trusted-peer federation runs in the background when requested and emits a correlated enriched event. See [`SEARCH-HANDOVER.md`](./SEARCH-HANDOVER.md). |
| **Device sync** (adjacent, not a plan track) | ✅ **Fully committed** (backend + UI) | `3051373` (engine), `366f78e` (invite helpers), `b26e4c3` (UI) | Behind `experimentalDeviceSync`. `DeviceSync` panel + toggle in `ui/shell.js`. |
| **HiveRelay / schema-sheets index** | ✅ Committed through phase5 | `37ad282` + relay-* / `index-room-client.js` | Upstream contract: [`HIVERELAY-BACKBONE-HANDOVER.md`](./HIVERELAY-BACKBONE-HANDOVER.md). |
| **Autobee collaborative catalogs** | ✅ Committed | `CMD_AUTOBEE_*` 160–165 | Behind `experimentalAutobeeCatalogs`. |

**Gating spikes:** `SPIKE-AUTOBEE-DURABILITY` and the Bare-loadable Schnorr bundle are now resolved for the shipped catalogue/name/Nostr/search subset. `SEC0` seed-at-rest, payments, privacy-routing, public Nostr relay interop, and Lightning remain future tracks. See IMPLEMENTATION-PLAN §5 for the older program map, then cross-check against `ARCHITECTURE_AND_CAPABILITIES.md` before starting work.

---

## 3. Branch / PR / worktree map (current release state)

| Location | State | Role now |
|---|---|---|
| `pearbrowser-desktop` | branch `feat/p2p-infra-naming`, PR head is the current branch tip | Release-audit branch carrying catalogue, Peercord, search, naming, Nostr, docs, and readiness updates. GitHub PR #4 is `CLEAN` / `MERGEABLE` against `main` and remains draft for review. |
| `origin/main` | `1577ad5` at the time of the merge-back | Base branch. Its catalogue-discovery work is merged into the release branch. |
| `PearBrowser` mobile repo | `main` | Mobile/native README and audit-gate docs are current; tests passed `124/124`, and the missing `ExpoLinking` native dependency found by simulator launch is fixed in the tracked dependency set. Native simulator/device smoke is still gated by local CocoaPods/BareKit/Xcode generated shell-phase hangs on iOS and a missing Java Runtime for Android Gradle. |
| Legacy `feat/p2p-infra-naming-n1ui` / `feat/p2p-infra-impl` references below | historical only | Kept as reconciliation provenance. Do not treat old tip SHAs in §4-§6 as the current release head. |

---

## 4. ⭐ The reconciliation performed this session (`fc7b620`)

**Problem:** two sessions built N1 in parallel — this branch had the *backend* half (`637ef61`) + the
constants-drift guard; an isolated worktree (`76af6ef`) completed the *Bare/GUI* half. Divergent, unmerged.

**Action:** merged `feat/p2p-infra-naming-n1ui` into the plan's designated infra branch.
- **`backend/index.js`** — took **n1ui's** version (its author flagged "prefer this when reconciling"). It
  carries two robustness fixes: `await whenReady()` in all four `CMD_NAME_*` handlers (a petname typed during
  boot isn't missed), and honest `enabled: !!names` (a failed petname store reads as off while curated aliases
  still resolve store-free).
- **`ui/lib/keys.js`** — auto-merged clean: n1ui placed `looksLikeName()` mid-file *by design* so it wouldn't
  collide with the end-of-file sync-invite helpers. The merge keeps **both** `looksLikeName` and
  `parseSyncInvite`/`formatSyncInvite`.
- **`test/constants-mirror.test.js`** — retained (the fold-in; n1ui lacked it).
- `ui/shell.js`, `styles.css`, `test/name-wire.test.js`, `test/keys.test.js` — n1ui's.

**Verified:** full suite **157/157 green** under `node --test 'test/*.test.js'` (151 pre-merge + n1ui's 6).

**N1 behaviour now:** type a bare word → a `pear://` result launches in its own window (Apps-tab path,
`CMD_LAUNCH_PEAR_LINK`), a `hyper://` result navigates in-tab with a provenance chip; petname (Tier 0) beats
curated (Tier 3). Flag off ⇒ resolver returns null ⇒ navigation unchanged. The real resolved target (not the
friendly name) is what gets bookmarked / copied / put in history.

**Not done (deliberately deferred — irreversible / needs coordination):**
- Dropping the remaining `impl`-branch stashes (`stash@{2}` is 501 lines — see §6). *(The device-sync `stash@{0}` has since been recovered, committed `b26e4c3`, and dropped.)*
- Deleting `feat/p2p-infra-naming-n1ui` (checked out in a live worktree).

---

## 5. Remaining reconciliation decisions (not yet executed)

1. ~~**Land the device-sync UI**~~ ✅ **Done** — recovered from `stash@{0}`, re-merged onto N1, committed `b26e4c3` (159 tests + encrypted smoke pass); stash dropped.
2. **Retire the n1ui worktree/branch** once it's idle: `git worktree remove ../pearbrowser-desktop--n1ui && git branch -d feat/p2p-infra-naming-n1ui`.
3. **Branch hygiene** — `feat/p2p-infra-naming` now carries naming + sync + search + relay work. Consider splitting
   device sync into its own PR rather than bundling it under the naming branch. The current release PR intentionally keeps the broad release audit branch together for review.
4. **Triage untracked docs** (§ below) and the stale `impl`-branch stashes (§6).

---

## 6. Stash inventory — corrected stale/not-stale assessment

> The device-sync `stash@{0}` was recovered + committed (`b26e4c3`) and dropped; the three remaining
> stashes are all on the **old `feat/p2p-infra-impl`** branch and renumbered to `{0,1,2}`. **Not all stale** —
> verify before dropping.

| Stash | Contents | Verdict |
|---|---|---|
| `stash@{0}` On `feat/p2p-infra-impl` | `docs/research/00-overview.md` +7 | Likely stale (doc edits). Verify vs committed overview before drop. |
| `stash@{1}` On `feat/p2p-infra-impl` | `index.js` +15 (root) | Likely stale ("set aside for infra loop"). Verify before drop. |
| `stash@{2}` On `feat/p2p-infra-impl` | **501 lines**: `constants.js`/`index.js`/`boot.js`/`tabs.js`/`shell.js` ("schema-sheets/sync/run-app-in-tab") | **NOT obviously stale.** A large parked changeset — diff against HEAD and confirm full supersession **before** dropping, or you lose real work. |

The device-sync UI that previously lived in a stash is **done** — recovered, re-merged onto the N1 work,
committed `b26e4c3` (159 tests + `scripts/browser-state-sync-smoke.js` green), and the stash dropped.

**Untracked docs (decide: commit vs local-only):** `HIVERELAY-BACKBONE-RESPONSE.md`,
`PEARBROWSER-APP-COMPAT-STANDARD.md`, `research/iroh-comparison.md`. *(The handover docs are now
reconciled: this file + `SEARCH-HANDOVER.md` are the committed canonical set; the pre-reconciliation
`HANDOVER-v0.4.5.md` was removed.)*

---

## 7. Feature flags (all OFF by default; persisted in user-data settings)

| Flag | Unlocks | Server-side gate |
|---|---|---|
| `experimentalNaming` | Petname store + tiered resolver; `CMD_NAME_*` | `requireNaming()` `backend/index.js:1197` (resolve fails **soft**→null; mutations fail **closed**) |
| `experimentalDeviceSync` | Device-sync panel + `CMD_SYNC_*` | `requireSync()` `backend/index.js:781` |
| `experimentalAutobeeCatalogs` | `autobee://` create/load | `requireAutobee()` `backend/index.js:768` |

Toggled in **Settings → Experimental** (`ExperimentalSection` in `ui/shell.js`). The backend enforces every
flag itself; the UI switch is only the user-facing control.

---

## 8. RPC command map (`backend/constants.js` ⇄ `ui/boot.js`)

```
1–3      core: navigate/status/drive-info       80–86    profile + login grants
10–19    catalogs (incl. autobee)               90–94    contacts
20–30    sites + reset/cache                     120–123  swarm grants
31,70–75 identity (verify=75)                    132      federated search
40–42    relays                                  133–137  Nostr
50–60    user-data                               150–155  my-catalog
160–165  autobee collaborative catalogs          177–178  search
180–187  device sync                             200–201  pear bridge / run-app-in-tab
250–253  naming (254 reserved → directory)       264–270  name registry
```
**Rule (enforced by `test/constants-mirror.test.js`):** every `CMD_/EVT_` in `constants.js` must be mirrored
in `ui/boot.js`'s `C` object, or the renderer call resolves to `undefined` and silently never matches —
breaking the feature with no error. The drift guard fails CI if they disagree.

---

## 9. How to run & test · concurrent-session hazard

```bash
npm start          # pear run --dev .   (dev shell)
npm test           # node --test 'test/*.test.js'   → 402 passing on the release PR branch
node scripts/browser-state-sync-smoke.js   # encrypted two-device bookmark sync (no GUI)
node scripts/autobee-catalog-smoke.js      # collaborative catalog convergence
node scripts/check-relays.js               # relay reachability over the DHT
```
**GUI note:** the Bare in-app runtime + Electron GUI were smoke-tested for PearBrowser during the release pass, but third-party app execution still needs human trust approval. Peercord's bundle is reachable and catalogued; actually launching it requires approving Pear's persistent trust prompt for its `pear://` key.

**Concurrent-session hazard:** multiple Claude sessions edit this one worktree simultaneously; work has been
committed/stashed/reset under active editing. Mitigations: `git status` + `git stash list` + `git reflog`
before assuming anything is lost; avoid parallel edits to `ui/shell.js`/`backend/index.js`/`constants.js`/`boot.js`;
prefer `git stash apply` over `pop`; build risky UI changes in a separate worktree (as the n1ui half was).

---

## 10. Upstream infra dependencies (out of scope here; pointers only)

- **`00-core/hiverelay`** — the pinning/index backbone. Integration contract the desktop consumes:
  [`HIVERELAY-BACKBONE-HANDOVER.md`](./HIVERELAY-BACKBONE-HANDOVER.md) (the one blocking item: a well-known
  bootstrap relay to replace `127.0.0.1:9100`). Full design: [`HIVERELAY-SCHEMA-SHEETS-DESIGN.md`](./HIVERELAY-SCHEMA-SHEETS-DESIGN.md).
- **`00-core/pear-registry`** — registry infra (not documented here).
- **`pear-pos` / `pear-exchange`** — the payments track (PAY2/4/5) vendors non-custodial escrow/onchain/price
  `.cjs` from these; spans repos — coordinate before starting PAY2+.

---

## 11. Doc index

| Doc | What |
|---|---|
| [`research/IMPLEMENTATION-PLAN.md`](./research/IMPLEMENTATION-PLAN.md) | The phased four-track program (P0…PRIV4 + spikes); per-phase exit criteria |
| [`research/00-overview.md`](./research/00-overview.md) | Thesis + L0→L4 dependency graph |
| `research/{naming,payments,nostr-bridge,privacy-routing}.md` | Per-track design corpora |
| [`SEARCH-HANDOVER.md`](./SEARCH-HANDOVER.md) | Search-track handover (the committed search companion to this doc) |
| [`HIVERELAY-BACKBONE-HANDOVER.md`](./HIVERELAY-BACKBONE-HANDOVER.md) | Relay-operator handover (upstream dep) |
| [`P2P-BROWSER-FEATURE-ROADMAP.md`](./P2P-BROWSER-FEATURE-ROADMAP.md) | Product roadmap |
| [`AUTOBEE-RESEARCH.md`](./AUTOBEE-RESEARCH.md) | Autobase/Autobee notes (incl. the durability caveat the spikes test) |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Released version history (current: v0.4.5) |
