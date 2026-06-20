# Infra Gating Spikes — go/no-go specs

Each spike is a small, time-boxed experiment that answers ONE go/no-go question
before a track bets on it. Verified against the repo: `identity-binding.cjs` is
still at `BINDING_TAG` v2 (`{r,s,v}`, no `purpose`); `identity.js` persisted raw
entropy plaintext (now SEC0-wrapped — see below); `encrypted-autobase-helper.cjs`
+ `relay-record.js` exist as templates; `@noble/secp256k1` is only a transitive
dep. All gates below are real and unstarted unless noted.

## Run order (by fan-out × risk, not raw effort)

1. **SPIKE-AUTOBEE-DURABILITY** (~1d) — ✅ **GREEN / RESOLVED** (`test/spike-autobee-durability.test.js`). A fresh never-writer node re-serves the converged view byte-identical after all writers go offline, via a **blind** relay (no encryption key). N5/PAY1/PAY6/NOSTR1 are de-risked. Lesson: re-derive via the Autobase from a replica — do NOT pin the view core standalone.
2. **SPIKE-SCHNORR-BARE** (~1d) — highest fan-out (all 9 Nostr phases + PAY3 + anonGPT receipts); proves the esbuild→CJS→Bare bundling path.
3. **SPIKE-BINDING-COORDINATION** (~1d) — one-time canonical-shape gate for N2/PAY3/NOSTR2/PRIV1; must land before any track publishes bindings (free to cut now — no live bindings).
4. **SEC0 seed-at-rest** (~2d) — gates real-user PAY2/NOSTR2/N2. **Crypto core + identity integration already built this session** (`1f8bf02`); only first-run migration + boot-unlock UX remain.
5. **SPIKE-LN** (~3d) — gates PAY-Lightning + NOSTR8 only; runs after SCHNORR-BARE proves bundling.
6. **PRIV3-ANONYMITY** (~4.5d research) — gates only the optional onion-overlay L2; sequence late.
- **SPIKE-SHARD-LATENCY** (~0.25d) — gates Search Phase 4 only; near-free, run opportunistically **in parallel** with #1.

> Parallelizable up front: **AUTOBEE-DURABILITY + SHARD-LATENCY** (no shared surface).

---

## 1. SPIKE-AUTOBEE-DURABILITY  (~1d, no deps) — ✅ GREEN (resolved 2026-06-20)
**Verdict:** GREEN. `test/spike-autobee-durability.test.js` (4 tests) proves: encrypted multi-writer convergence; a fresh never-writer node re-serves the converged view **byte-identical** after all writers offline; the relay can be **blind** (holds the opaque encrypted cores with NO key); and — the key lesson — the durable artifact is the AUTOBASE re-derived from a replica, NOT the standalone view core (opening it directly with the master key fails; Autobase derives per-core keys). So PAY1/N5/NOSTR1 consumers re-open the manager + replicate from the (blind) relay. No fallback needed.

**Q:** Can an encrypted multi-writer Autobase's *view* be HiveRelay-pinned and re-served to a fresh never-writer node after ALL writers go offline, byte-identical?
**Gates:** N5, PAY1, PAY6, NOSTR1, NOSTR2-mirror — every multi-writer ledger/registry.
**Experiment** (`test/spike-autobee-durability.test.js`, offline, Node-only):
1. Two-writer convergence over a wired Corestore pair (reuse `encrypted-autobase-helper.cjs`); snapshot the converged view as the golden reference.
2. Close ALL writers; open the **view core ONLY** (the single-writer Hyperbee under the Autobase view) and read the same `op!<seq>` rows.
3. Fresh never-writer Corestore: `store.get({key: viewCoreKey})` → Hyperbee → read + `applyView` → assert **byte-identical** (sha256 of sorted-key JSON) to golden.
4. Confirm op-log Hypercores are encrypted (unreadable without key) while the view core is readable (blind-pinnable).
**GREEN:** all 5 assertions pass → the view core IS the durable artifact; N5/PAY1/PAY6/NOSTR1 proceed.
**RED fallback:** pin Hyperdrive-shaped view snapshots (+1–2d/consumer), or defer multi-writer registries to single-writer-only. Program doesn't stall.

## 2. SPIKE-SCHNORR-BARE  (~1d)
**Q:** Can a vendored CJS bundle exposing BIP-340 Schnorr sign/verify LOAD + run under Bare (dynamic `import()` is broken there)?
**Gates:** ALL of Nostr (NOSTR0–8) + PAY3 + anonGPT Phase 1b receipt verification.
**Experiment:** promote `@noble/secp256k1` + `@noble/hashes` from transitive → declared deps; build `backend/secp256k1-bundle.cjs` via esbuild→CJS wrapper (the `sheets-bundle.cjs` pattern); `test/nostr-events-ops.test.js` = BIP-340 known-answer vectors (≥10) + NIP-01 `id` serialization round-trip, under `node --test` AND a Bare-load check.
**GREEN:** bundle loads under `require()`, all vectors pass, NIP-01 ids byte-exact.
**RED fallback (2–3d):** diagnose bundler vs runtime; vendor a minimal audited BIP-340 impl under security review — never ship Schnorr without a correctness proof.

## 3. SPIKE-BINDING-COORDINATION  (~1d)
**Q:** Add a `purpose` field to IdentityBinding so search/name/merchant/nostr/routing bindings are cryptographically isolated (no cross-purpose replay)?
**Gates:** the federation phases of N2/PAY3/NOSTR2/PRIV1.
**Experiment:** bump `BINDING_TAG` v2→v3; include `purpose` in `canonBinding`/`canonRevoke` bytes; `makeBinding`/`verifyBinding` take + check it (different purpose → different sig → fail-closed). Coordinate the schema cut across tracks NOW (no live bindings = free migration).
**GREEN:** a search binding can't verify as a payment binding; round-trips per purpose; existing tests updated.
**RED fallback:** runtime-validate a `purpose` in the record wrapper without changing canonical bytes (weaker, but unblocks).

## 4. SEC0 — seed-at-rest encryption  (~2d) — **core already built (`1f8bf02`)**
**Q:** Encrypt the BIP-39 seed at rest under Bare with `sodium.crypto_pwhash` (argon2id) + `crypto_secretbox`, with migration + fail-closed unlock?
**Gates:** real-user (mainnet) enablement of PAY2 / NOSTR2 / N2. Threat T11 (Critical) — stolen plaintext seed = total loss.
**Status — DONE this session:** `backend/seed-vault.cjs` (argon2id+secretbox, fail-closed, 7 tests); `identity.js` boots LOCKED on a vault, `unlock()`/`encryptSeedAtRest()`/`isLocked()`. Resolved the de-ambiguation: **no keytar, no scrypt — sodium argon2id**, no new deps.
**Remaining:** first-run plaintext→vault migration prompt, and the boot-flow passphrase UX (RPC `CMD_IDENTITY_UNLOCK` + Settings "encrypt my seed" + unlock-on-launch). Keep PAY2/NOSTR2/N2 behind dev kill-switches until this lands.

## 5. SPIKE-LN — Lightning under Bare  (~3d)
**Q:** Can Breez-Liquid WASM load + sign invoices under Bare, or must we default to NWC (NIP-47) bring-your-own-wallet, zero-custody?
**Gates:** PAY-Lightning + NOSTR8 zaps (shared — don't build two rails).
**Experiment:** prebuild `backend/breez-bundle.cjs` (esbuild + CJS wrapper); load in Node under the Bare-equivalent env; sign a test invoice.
**GREEN:** bundle loads + signs. **RED fallback:** ship NWC pure-JS first (app holds zero keys); revisit native LN later.

## 6. PRIV3-ANONYMITY — onion overlay viability  (~4.5d research)
**Q:** Are anonymity-set size, relay-incentive, and opt-in-confirmation answerable well enough to justify a Sphinx/onion overlay over Hyperswarm (L2)?
**Gates:** only PRIV3/PRIV4 (optional). PRIV0–PRIV2 ship the bulk of privacy value unconditionally (P2P-first race + ephemeral keys already shipped).
**Experiment:** anonymity-set simulation + relay-incentive model + UX confirmation study (`backend/priv3-anon-set-simulation.cjs` etc.).
**GREEN:** all three provisionally yes (median anonymity set S ≥ 50). **RED:** ship PRIV0–PRIV2 only; skip the onion tier.

## (parallel) SPIKE-SHARD-LATENCY  (~0.25d)
**Q:** Does multi-keyword AND stay interactive (<100ms, top-K bounded) with the shard router vs naive scatter-gather (~1148ms)?
**Gates:** Search Phase 4 (full-text shard tier) ONLY.
**Experiment:** run `docs/research/bench-shard-and.mjs` at contact scale; gate `ShardRouter` on the result.
**GREEN:** top-K=500 hot×hot median ≤ ~8.8ms. **RED:** cap full-text to hop-0/hop-1 per-peer; revert shard tier to research.
