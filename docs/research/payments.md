# Design Doc — P2P-Native Payments & Point-of-Sale

*Upgrading `pear-pos` / `pear-exchange` onto PearBrowser's Holepunch/Pear primitives.*

**Status:** Design / proposal. **Date:** 2026-06-17. **Author:** Lead designer (payments).
**Audience:** PearBrowser, pear-pos, pear-exchange engineers.
**Companion docs:** `docs/AUTOBEE-RESEARCH.md` (append-log + deterministic-reducer pattern, shipped),
`docs/HIVERELAY-BACKBONE-HANDOVER.md` / `docs/HIVERELAY-SCHEMA-SHEETS-DESIGN.md` (relay durability, "index not authority"),
`docs/P2P-SEARCH-RESEARCH.md` (independent confirmation of the identity-binding gap).

---

## 1. Executive summary

PearBrowser ships a custodial-card-plus-unverified-crypto point-of-sale (`pear-pos`) and a genuinely
non-custodial escrow exchange (`pear-exchange`) — but the two never meet. The POS live payment path settles
real money into third-party PSP accounts (Stripe/Adyen) for card/wallet/tap, and for crypto it shows a QR and
sets `status: 'pending'` with **no settlement verification whatsoever** (code-verified: a `grep` for
`confirmation|blockchain|monitorAddress|mempool|webhook|markPaid|checkStatus|poll` across
`pear-pos/app/backend/payments.js` and `api.js` returns **zero hits**). Meanwhile `pear-exchange` already
implements Bitcoin 2-of-3 P2WSH multisig escrow, Cashu NUT-11 P2PK ecash, on-chain monitoring
(`monitorAddress`/`monitorConfirmations`), multi-source median price feeds, and Ed25519 sign **and verify**
primitives. This doc proposes a P2P-native payments layer that (a) wires real settlement confirmation into the
POS crypto path, (b) imports `pear-exchange`'s non-custodial escrow/crypto/price modules behind POS's existing
`PaymentProcessorAdapter`/`registry` seam, (c) replaces unsigned point-to-point receipts with Ed25519-signed,
Autobee-logged, buyer-verifiable receipts derived from PearBrowser's per-app subkey identity, and (d) adds the
one missing foundational primitive everything depends on — a signature **verifier** in
`backend/identity.js` plus a self-certifying merchant-identity binding record modeled on the relay's
already-shipped `dht.mutableGet` self-certifying pattern. The work is mostly **integration**, not greenfield;
the hardest genuinely-unsolved pieces (offline double-spend *prevention*, fair trustless dispute adjudication)
are scoped honestly as bounded-risk, not solved.

---

## 2. Problem & why it matters for the Pear/PearBrowser ecosystem

Pear's thesis is local-first, serverless, peer-to-peer software with no always-on central party. Payments are
the one place where the current stack most badly violates that thesis:

1. **The money path is custodial.** `pear-pos` routes `card`, `wallet` (Apple/Google Pay), and `tap` (Tap to
   Pay) through Stripe / Stripe Terminal / Adyen — real funds settle to a PSP account, not to merchant-held
   keys. That is a central processor with custody, censorship power, chargeback authority, and a KYC/MSB
   surface. It is the opposite of P2P-native.

2. **The crypto path is non-custodial but unverified — "show a QR and hope."** `crypto_btc` / `crypto_usdc`
   build a `bitcoin:`/`ethereum:` URI against the merchant's static address, create the transaction with
   `status: 'pending'`, and **never confirm receipt**. A merchant marks it paid out-of-band. There is no
   mempool/Esplora/Electrum client, no webhook, no polling in the sale path (`pear-pos/app/backend/payments.js`
   lines ~496–554). This is the single highest-priority correctness gap.

3. **Receipts are unsigned, point-to-point, and unverifiable.** `receipt-delivery.js` prints (ESC/POS over TCP
   9100 / USB), emails (hand-rolled SMTP), or SMSes (Twilio / self-hosted gateway) plain text/HTML. There is no
   cryptographic receipt, no append-log record, no buyer-verifiable proof of payment.

4. **The non-custodial machinery already exists — in the wrong app.** `pear-exchange` has real 2-of-3 BTC
   multisig, Cashu P2PK ecash, on-chain monitoring, multi-source price medians, and Ed25519 sign+verify. POS
   can't use any of it because the two apps are separate Corestores with no bridge.

Why it matters: a P2P-native payments layer is what lets a Pear merchant accept value **without a processor,
without custody, and without an always-on server** — settling to keys they control, issuing receipts a buyer
can verify offline, and (for marketplace flows) holding funds in escrow with non-custodial dispute resolution.
It is also strategically aligned with the ecosystem's own direction: Tether/Holepunch have publicly stated
Keet (the first Holepunch app) will carry Lightning + USDt micropayments in-chat [24][25], and Tether shipped
USDt on Lightning via Taproot Assets in Jan 2025 [24].

---

## 3. Current state in our codebase (grounded)

Every path below was read for this doc; line numbers are approximate to current `main`/feature branches.

### 3.1 `pear-pos` — payment architecture
- **Single dispatch entry:** `createPayment(db, config, body)` in `pear-pos/app/backend/payments.js`
  (~256–598) switches on `payment_method`:
  | method | custody | what happens |
  |---|---|---|
  | `card` / `wallet` / `tap` | **custodial (Stripe/Adyen)** | `createPaymentIntent` → `api.stripe.com/v1/payment_intents`; funds settle to merchant's PSP account |
  | `crypto_btc` | **non-custodial, UNVERIFIED** | `getMerchantBtcAddress(config)` (static `config.btcAddress`), `usdToBtc()` prices via CoinGecko, builds `bitcoin:{addr}?amount=` QR, `status:'pending'`, never confirmed |
  | `crypto_usdc` | **non-custodial, UNVERIFIED** | same with `config.ethAddress`, `ethereum:{addr}?value=` |
  | `cash` / `split` | n/a / mixed | `createSplitPayment` processes tap→card→crypto→cash in order |
- **Processor abstraction (the clean seam):** `pear-pos/app/backend/processors/`
  - `interface.js` — `PaymentProcessorAdapter extends EventEmitter`; lifecycle
    `initialize → discoverReaders → connectReader → createTransaction → collectPaymentMethod → confirmPayment →
    capturePayment`; `TX_STATUS`, `PROCESSOR_TYPES = {STRIPE, ADYEN, BTCPAY}`, `READER_TYPES` (incl.
    `VIRTUAL` for crypto QR); documented events incl. `invoice:created`, `invoice:confirmations`,
    `transaction:completed`.
  - `registry.js` — singleton `ProcessorRegistry` with **one card slot** (`stripe`|`adyen`) and **one crypto
    slot** (`btcpay`). `METHOD_TO_PROCESSOR = { tap:'card', card:'card', crypto_btc:'crypto',
    crypto_usdc:'crypto', cash:null }`. `getProcessorForMethod()`, `getActiveCryptoProcessor()`. Adapters are
    lazy-`require`d in `_requireAdapter`.
  - `btcpay.js` — **the only adapter with real settlement detection:** `confirmPayment` polls the BTCPay
    Greenfield invoice API every `POLL_INTERVAL_MS = 3000`ms, maps `Settled → TX_STATUS.CAPTURED`. **But the
    happy-path crypto sale never invokes it** — it's wired only into `refundTransaction` via
    `registry.getActiveCryptoProcessor()`.
- **RPC seam:** backend is a Bare worker (`worker.js`). IPC shape `{ id, action, params[] }` over
  `Pear.worker.pipe()`; `action` uses **dot notation** (`"processors.list"`, `"sync.start"`); dispatcher walks
  `action.split('.')` into the `api` object.
- **Facade:** `api.js` — `createPayment` (~1043), `createSplitPayment` (~1085), `refundTransaction` (~1028),
  `captureTerminalPayment` (~1162), each a thin wrapper with a **dead-letter queue** fallback
  (`db.failedPayments`) on error. `processors` namespace (~1208–1235): `register/unregister/list/getForMethod`
  — **the runtime registration point for a new adapter.** `getPaymentCapabilities` (~1350).
- **Config seam:** `config.js` `DEFAULT_CONFIG` (line 16) holds `stripeSecretKey`, `btcAddress` (24),
  `ethAddress` (25), `btcpayUrl/ApiKey/StoreId`, `twilio*`. `SENSITIVE_FIELDS` (line 75) are AES-256-encrypted
  at rest (`crypto.createCipheriv`).
- **Receipts:** `receipt-delivery.js` — print (ESC/POS TCP 9100 / `/dev/usb/lp0` + subnet `discoverPrinters`),
  email (hand-rolled SMTP over `net.Socket`), SMS (Twilio / Android SMS gateway). Dispatch via
  `deliverReceipt(receiptData, method, destination, config)` (~486). **All plain, unsigned, point-to-point.**
- **P2P transport already present:** `hiverelay-sync.js` (`HiveRelaySyncManager` layering `HiveRelayClient`
  over Hyperswarm for relay discovery/seeding/NAT traversal); data sync is Autobase + Hyperbee
  (`sync.js`, `sync-apply.js`, `conflict-resolver.js`). **The P2P substrate for signed receipts already exists
  in POS.**

### 3.2 `pear-exchange` — the non-custodial reference (real code, not docs)
- **Escrow router:** `pear-exchange/app/backend/escrow.js` — `createEscrowAPI(db, sync, {trades})` exposes
  `fund / release / refund / getStatus`, routes on `trade.escrowType ∈ {'cashu','btc_multisig'}` via
  `getHandler()`. `fund` enforces the state machine (`MATCHED → ESCROW_LOCKED`) and caller identity
  (`sync.getInviteKey() === trade.sellerKey`); `release`/`refund` take a `signatures: [{signature, pubkey}]`
  array and drive `trade:transition` ops through Autobase.
- **BTC 2-of-3 P2WSH multisig:** `escrow-btc.js` (~46 KB). `OP_2 <buyer><seller><arbitrator> OP_3
  OP_CHECKMULTISIG`, BIP67-sorted keys, BIP143 sighash. **Private keys never leave the client; the server only
  combines + broadcasts.** Has the on-chain primitives POS lacks: `fetchUTXOs`, `fetchTransaction`,
  `fetchBlockHeight`, `broadcastTx` against `mempool.space` / Blockstream; `monitorAddress(escrowId, address,
  expectedAmount, onDeposit, network)` (~1157) and `monitorConfirmations(txId, requiredConfs, callback,
  network)` (~1101). Timelocked refund TX = `payment_window + 2h` safety net. Deps: `bitcoinjs-lib`,
  `ecpair`, `tiny-secp256k1`.
- **Cashu NUT-10/NUT-11 P2PK ecash:** `escrow-cashu.js` (~24 KB). 2-of-3 P2PK-locked tokens with `n_sigs` +
  `locktime`/`refund` tags; `verifySignatures()` enforces ≥`requiredSigs` distinct valid sigs before redeem.
  Instant settlement, **mint-custodial at the BTC layer**. Mint URL still a placeholder
  `https://mint.example.com` — not yet wired to a real mint.
- **Signature scheme:** `crypto.js` — **Ed25519 via `sodium-universal` with BOTH `sign` AND `verify`**
  (`crypto_sign_verify_detached`, line ~52). Deterministic, replay-bound messages:
  `pear-exchange:escrow:{operation}:{tradeId}:{tokenId}:{amount}:{timestamp}` (`createEscrowMessage`);
  `pear-exchange:offer:{offerId}:{side}:{crypto}:{fiat}:{minAmount}:{maxAmount}:{createdAt}`
  (`createOfferMessage`). `signEscrowOperation`/`verifyEscrowSignature`, `signOffer`/`verifyOfferSignature`.
  **This verifier exists in the exchange app but NOT in the shared browser identity layer — see §3.3.**
- **Price oracle:** `price-feeds.js` — multi-source (`coingecko`, `kraken`, …) **median with outlier rejection**
  (`rejectOutliers`, threshold 0.05) and a `minSources` floor. Trust-minimized FX that POS does not use.
- **Data model:** Hyperbee `!`-delimited keys (offers/trades/escrow/reputation/disputes/prices/chat) **matching
  POS conventions**; Autobase op list (`offer:create`, `trade:transition`, `escrow:fund/release/refund`,
  `dispute:*`, `reputation:rate`, `price:update`, `chat:message`); deterministic apply switch. Trade FSM:
  `CREATED→MATCHED→ESCROW_LOCKED→FIAT_SENT→FIAT_CONFIRMED→CRYPTO_RELEASED→COMPLETE` + `DISPUTED/REFUNDED/CANCELLED`.

### 3.3 `pearbrowser-desktop` — shared primitives (the glue layer)
- **Identity & per-app subkeys:** `backend/identity.js` — `Identity` class, Bare-compatible (`bare-fs`,
  `bare-crypto`, `sodium-universal`). BIP-39 root (16-byte entropy → 12 words); `seed =
  SHA-512(entropy)[:32]`. **Per-app deterministic subkeys:** `getAppKeypair(driveKeyHex)` →
  `subSeed = SHA-256(rootSeed ‖ "pear-app-v1:" ‖ driveKey)` → Ed25519. `signForApp(driveKeyHex, payload,
  namespace)` adds a domain-separator tag `pear.app.{driveKey}:{namespace}:`. Root key never leaves the
  worklet. **CRITICAL GAP: `identity.js` exposes `sign`, `signForApp`, `getAppKeypair` — and NO `verify`.** The
  one signed-financial-artifact consumer (anonGPT receipt) ships verification stubbed
  (`verify.ok=false, reason:'verifyReceipt-port-pending-phase-1b'`, `backend/anongpt-buyer.js:238-242`).
- **Subkeys don't bind to root or drive ownership.** `getAppKeypair`'s output pubkey has *zero* cryptographic
  relationship to the user's root pubkey or to the Hyperdrive signing key. A merchant pubkey on a receipt
  cannot today be tied to "the merchant who owns this storefront drive" without a new explicit binding record
  (independently confirmed in `docs/P2P-SEARCH-RESEARCH.md` finding #3).
- **Closest existing P2P-payment pattern:** `backend/anongpt-buyer.js` — `AnongptBuyer.infer(req)` dials a
  seller directly over a per-call Hyperswarm by transport pubkey, opens a `ServiceProtocol` channel, calls
  `ai.infer`, carries a `rateCard {perCall, perInputToken, perOutputToken}`, returns the seller's **signed
  receipt**, **fail-closed** (`verify.ok=false` until local verification ships). The prototype for P2P-native
  receipts + micropayment metering.
- **Autobee append-log + reducer (shipped):** `backend/autobee-catalog-{ops,apply,manager}.cjs`. The ops
  module (`autobee-catalog-ops.cjs`) is the exact template for a payment/receipt op module: `SCHEMA_VERSION`,
  `MAX_OP_BYTES`, `validateOp(op)` returning `{ok:true}` | `{ok:false, retain:true, …}` (forward-compat) |
  `{ok:false, retain:false, …}` (reject before append), prototype-pollution scan (`hasUnsafeKey`), size clamps,
  **no wall-clock** (Autobase owns ordering; `apply()` receives nodes in the linearized order; for unit tests a
  total order is modeled by sorting on `(seq, writerKey, stableHash)`).
- **Self-certifying DHT records (the pattern to copy for merchant binding):** `backend/relay-record.js` —
  a relay publishes `pubkey → {gatewayUrl, indexRoom}` as a **hyperdht MUTABLE record** keyed by its identity
  key; `dht.mutableGet(pubkey)` **verifies the Ed25519 signature against that key**, so a resolved record is
  self-certifying — a malicious DHT node can only serve stale data, never forge.
- **Re-verify-don't-trust directory:** `backend/relay-client.js` `listRelays()` — relay-directory rows carry a
  full signed capability `doc` + `capabilitySig`; with a `verify(doc)` fn supplied, **only rows that verify are
  adopted** ("the room is an index, not an authority"). The exact trust posture a merchant-identity directory
  must use.
- **Relay durability anchor:** `docs/HIVERELAY-*` — Autobase state **vanishes when all writers go offline**;
  the relay pins rooms (`hiveRelay.seed(keyHex, {replicas:3, discoveryKey})`) precisely to fix this. A two-party
  payment ledger held only between buyer and merchant cores is **not durable** unless an always-on indexer pins
  it. `seedState ∈ {pending, accepted, anchored, unseeded, rejected}` is the relay's own pin-state enum — a
  good model for a payment finality enum.
- **Consent-gated swarm:** `backend/swarm-grants.js` — per-`(driveKey, topic)` consent grants; the boundary to
  rate-limit/gate payment-channel joins.
- **Command numbering:** `backend/constants.js` — numeric RPC IDs grouped by feature with gaps; mirrored into
  `ui/boot.js`. Free ranges exist for a payments namespace (e.g. **210–249**; the 200s currently hold only
  `CMD_BRIDGE=200`, `CMD_RUN_APP_IN_TAB=201`).

---

## 4. Requirements & constraints

### 4.1 Functional requirements
- **R1 — Verified crypto settlement in POS.** A `crypto_btc`/`crypto_usdc` sale must not show "paid" until a
  chosen finality condition is met (N on-chain confirmations, or ecash redemption, or escrow lock). Replace
  "QR and hope."
- **R2 — Non-custodial settlement to merchant-controlled keys.** No platform custody; funds reach keys the
  merchant holds (on-chain address, ecash wallet, or 2-of-3 escrow where the operator is *not* the third key).
- **R3 — Signed, verifiable receipts.** Every completed sale emits an Ed25519-signed receipt the buyer (and a
  third party) can verify locally, recorded in an append-only log.
- **R4 — Escrow for held-funds / disputed flows.** Reuse `pear-exchange`'s 2-of-3 multisig + Cashu P2PK behind
  a POS-facing API for marketplace-style or dispute-windowed sales.
- **R5 — Trust-minimized FX.** Replace the single-source CoinGecko price with multi-source median.
- **R6 — Merchant identity binding.** A receipt's merchant pubkey must be bindable to a storefront/root identity
  via a self-certifying, re-verifiable record.

### 4.2 Constraints — Bare / Hyperswarm / Hypercore realities
- **C1 — Bare runtime, CommonJS.** No libuv, no Node native-addon ABI, non-standard module system. New shared
  modules ship as `.cjs` (loadable under Bare via `require`, default-importable under Node for tests — the
  Autobee precedent). Heavy Rust-FFI SDKs (LDK, Breez-Liquid native) cannot bind into Bare; the only realistic
  embedding paths are **(1) WASM, (2) a JS-only protocol over a transport we already have, (3) IPC to an
  external daemon.** Any Lightning ambition is gated on a WASM-under-Bare spike (see §10, §11 [23]).
- **C2 — No always-on central server (the Pear ethos).** BTCPay-behind-a-host and custodial PSPs violate it.
  Prefer in-process JS rails (Cashu tokens, on-chain monitoring against public Esplora/mempool endpoints) and
  HiveRelay only as an *index/durability anchor, never an authority*.
- **C3 — Offline-first.** Only ecash/Fedimint tokens are truly transferable offline as bearer bytes; everything
  Lightning/on-chain needs the receiver (or its node/relay) reachable to settle. Offline acceptance is a
  bounded **credit-risk** decision, not a solved double-spend problem (§8 T2, §10).
- **C4 — Deterministic, schema-versioned, wall-clock-free op-logs.** Per `AUTOBEE-RESEARCH.md` design
  constraints: every op carries `v`; oversized/pollution ops rejected before append; conflict resolution never
  reads local time (Autobase linearization is the only ordering authority).
- **C5 — Durability requires pinning.** A pairwise Autobase ledger is ephemeral unless HiveRelay pins it
  (`replicas:3`), which re-introduces a soft central party at the metadata layer (§8 T4, T10).
- **C6 — Keys stay in the worklet.** Root seed never leaves; pages see only per-app subkeys; the seed is
  **currently unencrypted at rest** (`identity.js` header note — "future improvement is OS keystore").
- **C7 — Sybil/abuse pressure.** Relay directories, merchant directories, and shared ledgers are all writable
  surfaces. Membership gates *who* writes, **not truthfulness** — clients must re-verify every claim
  (`relay-client.js` pattern). Op-logs need size limits + writer-membership gating + swarm-grant rate limits.

### 4.3 Non-goals (this iteration)
- Replacing the custodial card rail (Stripe/Adyen stays as an opt-in legacy slot; we add P2P rails *alongside*).
- A fully decentralized arbitrator pool with bonding/slashing (MVP uses a pre-agreed arbiter key; §10).
- Building a Lightning node in Bare (gated on a WASM spike; track, don't build).
- Shipping a real Cashu mint (we integrate a *client* against an external mint; running a mint is a regulated
  act, §8 T9).

---

## 5. Prior-art survey

Sources are primary where possible (BOLTs, NIPs, BIPs, project docs). Bare/Pear integration reality: heavy
Rust-FFI SDKs need a **WASM** build to run inside Bare; pure-JS protocols over Hyperswarm/HTTP are the cleanest
fit.

| System | Approach | Pros | Cons | Relevance to us | Src |
|---|---|---|---|---|---|
| **Lightning BOLT11 invoices** | Receiver-generated single-use invoice (amount, payment hash, expiry); payer pays an HTLC | Universal wallet support; instant; small fees; non-custodial if you run the node | Single-use; receiver must be online; you must run/access an LN node; large QR | A POS naturally mints an invoice per sale — fits BOLT11. But needs a node (Greenlight/Breez/BTCPay); no native Bare LN node exists | [2][6] |
| **Lightning BOLT12 offers** | Reusable "offer"; payer sends `invoice_request` over the LN onion, receiver replies with a fresh invoice; blinded paths | One static QR = many payments (printed storefront code); amount-less offers; recurring; receiver privacy | Newer, uneven wallet support; needs a BOLT12 node (CLN/LDK); interactive | Strong fit for a fixed-merchant POS QR; same node dependency | [1][4][6] |
| **Cashu (Chaumian ecash)** | Blind-signed bearer tokens (BDHKE), NUT-numbered; mint holds BTC, user holds unlinkable tokens | Token transfer **offline & instant** — hand `(x,C)` to anyone over Hyperswarm/chat; mint can't see balances/graph; trivial pure-JS client | **Custodial at the BTC layer** (mint can rug/seize); per-mint trust; no built-in dispute layer | **Very high.** `escrow-cashu.js` already implements NUT-11 P2PK; tokens are bytes → send P2P over a Hypercore channel. Best fit for chat/micro POS | [7][8][9] |
| **Fedimint (federated ecash)** | Cashu-style ecash, BTC held by a threshold quorum of guardians (e.g. 3-of-4) | Spreads custody/trust; blind-sig privacy; LN gateway in/out | Still custodial IOUs (guardians can collude); client is Rust (needs WASM); heavier to run | Medium — better trust profile than single mint; same token transport could apply | [10][11] |
| **L402 (Lightning HTTP 402)** | Server returns `402` + `WWW-Authenticate` with macaroon + BOLT11; client pays, attaches preimage; macaroon = reusable paid credential | Clean metered paywall; no login; fine-grained macaroon caveats; great for paid API / AI-agent access | Needs an LN payment source; HTTP-centric (Aperture proxy); not person-to-person | Medium — fits charging for a Pear app's backend/AI endpoints (cf. `anongpt-buyer`), less so consumer POS | [12][13] |
| **Nostr Wallet Connect (NIP-47)** | App ↔ remote wallet over Nostr relays via NIP-44-encrypted JSON-RPC; `pay_invoice`, `make_invoice`, `get_balance` | **App holds zero keys/funds** — user pairs any NWC wallet via a URI; per-connection keys | Adds a Nostr-relay dependency parallel to Pear's swarm; wallet must be always-on | High *as a controller* — POS becomes a thin client asking the user's own wallet to pay/invoice; pure JS | [14] |
| **Nostr Zaps (NIP-57)** | Signed `9734` zap request → LNURL callback → invoice → pay → relay publishes `9735` zap receipt | Public, social, verifiable tips; identity+payment integrated | Needs LNURL + LN wallet + Nostr identity; really a tipping primitive | Low–medium — only if pear-exchange wants social tipping | [15] |
| **On-chain 2-of-3 multisig escrow** | Buyer/seller/arbiter keys; 2 sigs release; arbiter holds only 1 key (can't steal alone). Bisq/RoboSats/Hodl Hodl/Peach | **Non-custodial dispute resolution** — exactly the marketplace pattern; no platform custody; on-chain finality | On-chain fees/latency; arbiter selection/trust; PSBT-coordination UX; not instant | **High.** Already built in `escrow-btc.js`; pair coordination maps onto Hyperswarm channels | [18] |
| **DLCs (Discreet Log Contracts)** | Oracle-attested conditional payouts; on-chain looks like plain multisig — terms never hit chain | Strong privacy (indistinguishable txs); rich conditional escrow via oracles | Needs an oracle (trust/availability); complex; immature tooling; no JS-native turnkey lib | Medium-low — powerful for conditional escrow but heavy; track | [16][17] |
| **PTLCs** | Taproot-era HTLC replacement using adaptor sigs / payment points | Better privacy (no shared hash across hops); efficient DLCs-on-LN | Not broadly deployed; depends on node support; protocol-level not an app API | Low today — a future LN substrate; track, don't build on | [16][17] |
| **PayJoin (BIP78 / BIP77 v2)** | Sender + receiver both add inputs to one tx, breaking common-input heuristic; v2 adds async serverless receive via untrusted relay + OHTTP | On-chain privacy; steganographic; BIP77 async receive suits non-always-on receivers | On-chain only; needs PayJoin-aware wallets; relay infra for v2 | Medium — BIP77's async relay is conceptually like HiveRelay; could ride our own relay; JS tooling thin | [19][20] |
| **BTCPay Server** | Self-hosted, 0-fee, open-source BTC+LN processor; invoice/store/POS REST API | No fees, no third party; mature POS + invoice API; on-chain + LN | **You run a server** (Docker/VPS/full node); HTTP/centralized; ops burden | Medium as a *backend* (POS already has a `btcpay.js` adapter), but contradicts the no-always-on-server ethos | [21] |
| **Breez SDK — Greenlight (deprecated)** | Cloud LN node (Blockstream Greenlight) with on-device remote signer (VLS) — non-custodial keys | Self-custodial keys; full LN without running infra; LSP + on-chain + ramps | **Deprecated / unmaintained**; node lives on Blockstream infra; Rust SDK | Low — don't build new on it; its split-node + on-device-signer architecture is a useful reference | [3][22][26] |
| **Breez SDK — Nodeless (Liquid)** | Non-custodial, channel-less; (reverse) submarine swaps between LN and the Liquid sidechain; "keys held only by users" | No channels/LSP/setup fees; self-custodial; one SDK = LN + on-chain + Liquid **USDt**; **has a WASM/JS build** | Relies on Liquid (federated sidechain) + swap providers; swap fees; Rust core; Liquid trust | **Highest practical LN fit** — WASM/JS is the realistic way to get self-custodial LN + USDt into Bare. **Verify the WASM build runs under Bare specifically** (§10) | [3][22][23] |
| **Tether/Holepunch direction (USDt-on-LN, USDT0, Keet payments)** | USDt on LN via Taproot Assets (Jan 2025); USDT0 omnichain (LayerZero OFT); Keet integrating LN + USDt micropayments in-chat | Same stack, same backers; stablecoin removes BTC volatility for POS; in-chat P2P payments a stated Keet goal | USDt-on-LN custody model **unspecified**; USDT0 is a lock-mint bridge; **no public Keet payments SDK found** | **Strategically highest** — watch for a Holepunch/Keet payments SDK; Breez-Liquid ships USDt-on-Liquid today as a usable proxy | [24][25] |
| **iroh (QUIC P2P networking — *relay/transport subsystem only*)** | QUIC-based direct connections with NAT holepunching; falls back through **relay servers discovered by node pubkey**; blob/doc sync (`iroh-blobs`, `iroh-gossip`) | Clean relay-by-pubkey bootstrap + holepunch model; mature transport; the conceptual ancestor of our DHT-resolved relay backbone | **No payment, ledger, token, or settlement primitive exists in iroh** — it is networking only; Rust (would need WASM/FFI to embed) | **Transport-layer only.** PearBrowser's `relay-client.js`/`relay-record.js` (`dht.mutableGet` resolve-relay-by-pubkey, §3.3) are explicitly **"iroh-inspired"** — same move, built on HyperDHT instead of iroh's relays. We adopt the *availability/bootstrap pattern*; we invent **no** payment layer from iroh because it has none | [28][29] |

**Cross-cutting findings.** Two product needs → two rails: a *retail POS* wants instant final settlement
(**Cashu over our Hyperswarm**, offline/JS-native; or **LN via Breez-Liquid WASM**, self-custodial, USDt);
a *marketplace with disputes* wants **2-of-3 multisig escrow** (the only rail here with native non-custodial
dispute/refund). Custody spectrum (most → least app-side risk): single-mint Cashu ≈ BTCPay-behind-a-host <
Fedimint < NWC/Zaps ≈ multisig escrow ≈ Breez-Liquid/Greenlight (keys on device). Offline-transferable: only
ecash. Native dispute/refund: only multisig escrow and DLCs.

---

## 6. Candidate approaches

### Candidate A — "Wire the existing BTCPay adapter into the sale path" (minimal)
Route `crypto_btc`/`crypto_usdc` in `payments.js` through the already-present `btcpay.js` adapter's
`collectPaymentMethod`/`confirmPayment` instead of skipping it.

- **Pros:** smallest diff; real settlement detection today (BTCPay polls `Settled → CAPTURED`); reuses a tested
  adapter.
- **Cons:** **violates the no-always-on-server ethos (C2)** — requires a hosted BTCPay (Docker/VPS/full node);
  still merchant-custodial-via-their-own-server but centralizing; doesn't touch receipts, escrow, FX, or
  identity binding. A point fix, not a P2P-native upgrade.
- **Verdict:** ship as an *opt-in* path for merchants who already run BTCPay, but it is not the strategic answer.

### Candidate B — "Import pear-exchange's non-custodial stack behind the POS processor seam" (recommended core)
Add two new `PaymentProcessorAdapter` subclasses to POS — a **direct-onchain** adapter (reusing
`escrow-btc.js`'s `monitorAddress`/`monitorConfirmations`/`broadcastTx`) and a **Cashu** adapter (reusing
`escrow-cashu.js`) — register them in the crypto slot of `registry.js`, and route the `crypto_*` branches
through them. Add an **escrow** adapter for held-funds/dispute flows via `createEscrowAPI`. Adopt
`price-feeds.js` for FX.

- **Pros:** genuinely non-custodial; reuses real, tested code; no hosted server (monitors public Esplora/mempool
  endpoints in-process); slots cleanly into the existing adapter/registry abstraction; brings escrow + multi-source
  FX for free.
- **Cons:** the two apps are separate Corestores — needs a shared module strategy (vendored `.cjs` or a
  cross-app RPC bridge, §7.7); Cashu needs a real mint URL (currently placeholder); on-chain confirmation is not
  instant (latency UX); doesn't by itself fix unsigned receipts or identity binding.
- **Verdict:** the right backbone. Pair with C and D.

### Candidate C — "Signed, Autobee-logged receipts" (recommended, foundational)
Ship the missing **`verify()` in `identity.js`**, define a signed-receipt schema, and record receipts as ops in
an Autobee ledger (the `autobee-catalog-*` op-log + reducer pattern) pinned by HiveRelay for durability. Bind
merchant identity with a self-certifying record (the `relay-record.js` `dht.mutableGet` pattern).

- **Pros:** buyer-verifiable proof of payment; tamper-evident, deterministically-ordered ledger; finishes the
  `anongpt-buyer` fail-closed receipt story; the identity binding fixes merchant spoofing (T8). Independent of
  which settlement rail is used.
- **Cons:** net-new cryptographic code (verifier + binding records + selective-disclosure boundary); the
  accountability↔privacy collision (T4 vs T8) must be navigated carefully; durability still leans on the relay
  (C5).
- **Verdict:** the foundational layer everything else trusts. Must ship early (it's a hard dependency of B and D).

### Candidate D — "NWC / bring-your-own-wallet controller" (complementary, optional)
Make POS a thin NIP-47 client: the merchant (or buyer) pairs an existing NWC wallet; POS calls `make_invoice` /
`pay_invoice` and holds zero funds/keys.

- **Pros:** zero custody, zero key management in our app; instant LN without a node in Bare; pure JS.
- **Cons:** adds a **Nostr-relay dependency parallel to Hyperswarm**; wallet must be always-on; no dispute layer;
  off-thesis to add a second relay network.
- **Verdict:** a good optional rail for LN-native merchants; defer behind B/C; revisit when a Keet/Holepunch
  payments SDK or Breez-Liquid-under-Bare lands.

**Chosen:** **B + C as the core, with A as an opt-in legacy path and D as a later optional rail.**

---

## 7. Recommended design (mapped onto our primitives)

The design has four layers: **(7.1) the verifier + identity binding** (foundation), **(7.2) the signed-receipt
op-log**, **(7.3) the non-custodial settlement adapters**, **(7.4) escrow**, plus FX, RPC, and module-sharing
glue. Everything reuses primitives we already ship.

### 7.1 Foundation — Ed25519 verifier + self-certifying merchant binding

**(a) Add `verify()` to `backend/identity.js`.** Mirror `pear-exchange/app/backend/crypto.js:verify` exactly —
`sodium.crypto_sign_verify_detached(signature, message, publicKey)` wrapped to return a boolean. Add a
domain-separated `verifyForApp(driveKeyHex, payload, namespace, {signature, publicKey})` that reconstructs the
`pear.app.{driveKey}:{namespace}:` tag (matching `signForApp`) before verifying, so a signature from one app
context can't be replayed in another.

```
// identity.js (new)
verify(payload, signatureHex, publicKeyHex) -> boolean      // raw detached verify
verifyForApp(driveKeyHex, payload, namespace, sig) -> boolean // tag-reconstructing verify
```

This single addition un-stubs `anongpt-buyer.js` (its `verify.ok` can become true) and is the hard dependency of
every receipt below. New RPC: **`CMD_IDENTITY_VERIFY = 75`** (next to `CMD_IDENTITY_SIGN = 74`).

**(b) Self-certifying merchant-identity binding.** A merchant publishes a binding that ties
`{ merchantRootPubkey, posSubPubkey, storefrontDriveKey }` together, signed by the **root** key, into a
hyperdht MUTABLE record keyed by `merchantRootPubkey` — exactly the `relay-record.js` shape, so
`dht.mutableGet(merchantRootPubkey)` self-certifies it. A buyer resolving a receipt re-verifies the binding the
same way `relay-client.listRelays` re-verifies directory rows (`capabilitySig`, "index not authority"). New
module `backend/merchant-record.js` (clone `relay-record.js`):

```jsonc
// merchant binding doc (signed by ROOT key, published at dht.mutablePut(rootPubkey))
{
  "v": 1,
  "merchantRootPubkey": "<64-hex>",      // == the DHT mutable key
  "posSubPubkey":       "<64-hex>",      // getAppKeypair(storefrontDriveKey).publicKey
  "storefrontDriveKey": "<64-hex>",      // the Hyperdrive the storefront serves from
  "displayName":        "Acme Coffee",
  "issuedAt":           "<ISO-8601>"
  // signature is carried by the DHT mutable record itself (root key signs)
}
```

**Selective disclosure (resolves the T4↔T8 collision):** the *merchant* is publicly bound (accountability);
*customers* are never bound — each invoice derives an **ephemeral per-invoice subkey** the buyer never publishes.
Merchant accountability and customer unlinkability live on opposite sides of one boundary; getting it wrong leaks
the whole customer graph (§8 T4).

### 7.2 Signed-receipt op-log (the Autobee pattern, applied to money)

Reuse the shipped `autobee-catalog-{ops,apply,manager}.cjs` architecture verbatim — new files
`backend/payment-receipt-{ops,apply}.cjs` (Bare+Node `.cjs`, single source of truth, unit-testable with no
Autobase import).

**Op schema** (`payment-receipt-ops.cjs`, modeled on `autobee-catalog-ops.cjs`): `SCHEMA_VERSION = 1`,
`MAX_OP_BYTES = 16*1024`, `validateOp(op)` returning the same tri-state (`{ok:true}` / retain-but-ignore /
reject-before-append), `hasUnsafeKey` prototype-pollution scan, size clamps, **no wall-clock** (Autobase
linearization is the only ordering authority; for unit tests, sort on `(seq, writerKey, stableHash)`).

```jsonc
// op type: "receipt.issue"  (one per completed sale)
{
  "v": 1,
  "type": "receipt.issue",
  "id": "<receiptId = sha256(merchantSub‖saleNonce)>",   // stable identity
  "receipt": {
    "saleId":        "<uuid>",
    "merchantSub":   "<64-hex posSubPubkey>",
    "buyerEphemeral":"<64-hex per-invoice subkey>",       // unlinkable
    "rail":          "onchain_btc | cashu | escrow_btc | btcpay",
    "amount":        { "fiat": "USD", "fiatCents": 1299, "asset": "BTC", "assetAmount": "0.00031" },
    "settlement":    { "kind": "txid|tokenId|invoiceId", "ref": "<...>", "confs": 2, "requiredConfs": 1 },
    "finality":      "pending | settling | final",        // mirrors relay seedState enum
    "lineItemsHash": "<sha256 of canonical line items>",  // commit hash, not cleartext, to shared room
    "fxQuote":       { "median": 41934.10, "sources": 3, "at": "<ISO>" },
    "issuedAt":      "<ISO-8601>"
  },
  "sig": { "signature": "<hex>", "publicKey": "<merchantSub hex>", "algorithm": "ed25519",
           "tag": "pear.app.<storefrontDriveKey>:receipt:" }   // from identity.signForApp(...,'receipt')
}
```

Companion ops: `receipt.finalize` (flips `finality` when confs reached / token redeemed),
`receipt.refund` (signed refund voucher — a merchant-signed obligation redeemable like an inbound payment),
`dispute.open` / `dispute.evidence` (signed, append-only evidence rows; §7.4).

**`payment-receipt-apply.cjs`** — pure deterministic reducer materializing a Hyperbee view keyed
`!`-delimited to match POS/exchange conventions:
```
receipt!<receiptId>            -> latest receipt record
receipt-by-sale!<saleId>       -> receiptId (lookup)
finality!<receiptId>           -> 'pending'|'settling'|'final'
voucher!<refundId>             -> signed refund voucher
dispute!<receiptId>!<seq>      -> evidence row (append-only, never overwritten)
op!<index>                     -> raw op (audit, apply-order)
```
Conflict rules (deterministic, no wall-clock): `finality` is **monotonic** (`pending < settling < final`; a
later-in-order regression is ignored); `receipt.issue` is whole-record, identity = `receiptId`; the apply fn
**re-verifies `sig`** against `merchantSub` before materializing (`identity.verifyForApp`) — an unverifiable op
is retained in the log but excluded from the view (so a malicious writer can't inject a forged receipt).

**Manager** `backend/payment-receipt-manager.cjs` (mirror `autobee-catalog-manager.cjs`): one encrypted Autobase
per merchant ledger (`encryptionKey` so only counterparties read — §8 T3), writer membership gated to
counterparties, lazily required behind a feature flag. **Durability:** the merchant's receipt room is pinned by
HiveRelay (`hiveRelay.seed(keyHex, {replicas:3, discoveryKey})`, the schema-sheets precedent) so receipts
survive both parties going offline (C5). The relay stays an **index, not an authority** — it pins bytes, it does
not validate or sign receipts.

### 7.3 Non-custodial settlement adapters (behind the POS processor seam)

Add two `PaymentProcessorAdapter` subclasses (`interface.js`) and register them in `registry.js`'s crypto slot.
`btcpay.js` is the closest template (it already has `confirmPayment` polling).

**(a) `processors/onchain.js` — `OnchainAdapter` (BTC, later ETH/USDC).** Reuses `escrow-btc.js`'s on-chain
client (`fetchUTXOs`, `fetchTransaction`, `fetchBlockHeight`, `monitorAddress`, `monitorConfirmations` against
mempool.space/Blockstream — already non-custodial, server only watches):
- `createTransaction({amountCents, currency, reference})` — derive a **per-sale receive address** (HD or a
  fresh key per invoice for T4 unlinkability), price via the new median FX, emit `invoice:created`
  `{address, qrData: 'bitcoin:{addr}?amount=', amount}`.
- `collectPaymentMethod(tx)` — start `monitorAddress(saleId, address, expectedAmount, onDeposit)`; emit
  `transaction:waiting` (`inputType:'qr'`).
- `confirmPayment(tx)` — on deposit, `monitorConfirmations(txid, requiredConfs, …)`; emit
  `invoice:confirmations {count, required}` each block; resolve `CAPTURED` at `requiredConfs`. **This is the
  exact code path the `crypto_*` branches skip today** (§3.1) — wiring it closes the highest-priority gap.

**(b) `processors/cashu.js` — `CashuAdapter`.** Reuses `escrow-cashu.js` (NUT-10/11 P2PK); for plain POS, a
straight redeem (no escrow):
- `createTransaction` — build a Cashu request token / amount against a configured mint.
- `collectPaymentMethod` — receive the buyer's token bytes **over the existing Hyperswarm channel** (no online
  settlement round-trip needed for the *transfer*; the buyer can even hand tokens offline).
- `confirmPayment` — **redeem at the mint** (the mint's nullifier set is the one mechanism that actually
  *prevents* double-spend, §8 T2); resolve `CAPTURED` on successful redeem. Custody caveat: the mint holds BTC
  (T1/T9) — surface this to the merchant.

**Registry wiring** (`registry.js`): extend `PROCESSOR_TYPES` with `ONCHAIN:'onchain'`, `CASHU:'cashu'`; the
crypto slot accepts any of `{btcpay, onchain, cashu}`; `_requireAdapter` lazy-loads them.
**`payments.js` change (the load-bearing fix):** the `crypto_btc`/`crypto_usdc` branches stop returning a bare
`status:'pending'` and instead route through `registry.getActiveCryptoProcessor().createTransaction →
collectPaymentMethod → confirmPayment`, only marking the sale paid on `CAPTURED`, and emitting a
`receipt.issue` op (§7.2) signed via `identity.signForApp(storefrontDriveKey, canonicalReceipt, 'receipt')`.

### 7.4 Escrow & disputes (held-funds / marketplace flows)

For sales that need a dispute window or held funds, import `pear-exchange`'s `createEscrowAPI(db, sync,
{trades})` behind a POS-facing **`processors/escrow.js`** adapter:
- 2-of-3 P2WSH multisig (`escrow-btc.js`): buyer + merchant + **a third arbiter key that is NOT the POS
  operator** (T9 — keeps the operator out of custody/MSB scope). `fund`/`release`/`refund` take
  `signatures:[{signature, pubkey}]`; private keys never leave clients.
- Dispute evidence is an **encrypted append-only log** (`dispute.open`/`dispute.evidence` ops, §7.2) —
  Autobase-linearized so neither side can rewrite history. **Resolution** is escrow-timeout rules *or* a
  pre-agreed arbiter key (there is no cryptographic *fair* verdict primitive — §8 T5, §10).
- Finality state machine surfaced in UI mirroring the relay's `seedState` enum:
  `pending → escrowed → settling → final` (never show "paid" before the chosen finality condition, §8 T6).

### 7.5 Trust-minimized FX
Replace `payments.js:usdToBtc()` (single CoinGecko source, 60 s cache) with `pear-exchange/price-feeds.js`'s
multi-source median + outlier rejection (`rejectOutliers`, `minSources`). Stamp the `fxQuote {median, sources,
at}` into the receipt (§7.2) so the buyer sees which/how-many sources priced the sale.

### 7.6 RPC commands & constants (mirror `constants.js` ↔ `ui/boot.js`)
New payments namespace in the free **210–229** range (POS keeps its own dot-notation RPC; these are the
PearBrowser-side identity/receipt/verify commands the shared layer needs):
```
CMD_IDENTITY_VERIFY        = 75    // un-stub receipt verification
CMD_MERCHANT_BIND_PUBLISH  = 210   // publish self-certifying merchant binding (dht.mutablePut)
CMD_MERCHANT_BIND_RESOLVE  = 211   // resolve + re-verify a merchant binding (dht.mutableGet)
CMD_RECEIPT_ISSUE          = 212   // append receipt.issue op + sign
CMD_RECEIPT_VERIFY         = 213   // verify a receipt against merchant binding (buyer side)
CMD_RECEIPT_LIST           = 214   // range-scan the receipt ledger
CMD_RECEIPT_FINALIZE       = 215   // flip finality on confirmation/redeem
CMD_REFUND_VOUCHER_ISSUE   = 216   // merchant-signed refund obligation
CMD_ESCROW_FUND            = 220   // POS-side escrow fund (routes to createEscrowAPI)
CMD_ESCROW_RELEASE         = 221
CMD_ESCROW_REFUND          = 222
CMD_DISPUTE_OPEN           = 223
CMD_DISPUTE_EVIDENCE       = 224
```
On the POS side these map to new `api.js` methods (dot-notation, e.g. `payments.confirmCrypto`,
`receipts.issue`, `escrow.fund`) reachable via `worker.js`. Rail credentials (mint URL, Esplora endpoint,
arbiter pubkey, required confs) go in `config.js` `DEFAULT_CONFIG` and `SENSITIVE_FIELDS` (AES-256 at rest).

### 7.7 Module-sharing strategy (POS ↔ exchange ↔ browser)
The non-custodial code lives in `pear-exchange`; POS and the browser need it. Two options (briefing gap #10):
- **Vendored `.cjs` (recommended first):** extract `crypto.js`, `escrow-btc.js`, `escrow-cashu.js`,
  `price-feeds.js` into a shared `.cjs` package (Bare-`require` + Node default-import, the Autobee precedent),
  pinned/vendored, consumed by all three apps. No cross-app runtime coupling.
- **Cross-app RPC bridge (later):** a Hyperswarm/`ServiceProtocol` channel (the `anongpt-buyer` dial pattern)
  if a shared **Corestore** is undesirable. Defer; start with vendoring.

### 7.8 End-to-end flow (on-chain BTC sale, signed receipt)
```
1. Cashier rings sale → payments.createPayment({payment_method:'crypto_btc', ...})
2. registry.getActiveCryptoProcessor() = OnchainAdapter
3. adapter.createTransaction(): derive per-sale address, FX-median price, emit invoice:created (QR)
4. adapter.collectPaymentMethod(): monitorAddress(saleId, addr, expected, onDeposit) over public Esplora
5. Buyer scans QR, pays from their own wallet (non-custodial, merchant-controlled addr)
6. onDeposit fires → adapter.confirmPayment(): monitorConfirmations → emit invoice:confirmations each block
7. At requiredConfs → CAPTURED. payments.js marks sale paid (NOT before — fixes the gap).
8. Build canonical receipt; identity.signForApp(storefrontDriveKey, receipt, 'receipt')
9. Append receipt.issue op to the encrypted Autobee receipt ledger; HiveRelay pins it (replicas:3)
10. Deliver receipt (print/email/SMS as today) PLUS a verifiable receipt token; buyer can later:
    - resolve merchant binding via dht.mutableGet(merchantRootPubkey) (self-certifying)
    - identity.verifyForApp(...) the signature → verify.ok = true (no longer stubbed)
```

---

## 8. Threat model & failure modes

Grounded in the live stack. "Strong primitives we have": Ed25519 detached sign (and, after §7.1, verify);
self-certifying DHT mutable records (`dht.mutableGet` verifies the sig — `relay-record.js`); Hyperbee
inverted-timestamp range scans; Autobase deterministic linearization (no wall-clock); consent-gated swarm
grants.

**The one structural fact that drives every mitigation below:** the P2P substrate can *order, sign, verify,
encrypt, replicate, and pin* — but it **cannot be an authority on a spend or a verdict**. Membership gates *who
writes, not whether what they wrote is true*; every claim is re-verified client-side ("index, not authority").
This is precisely why escrow, multisig, and ecash exist as distinct tools: each imports an *external* authority
on the spend (the chain, the mint, the arbiter key) that the serverless substrate structurally lacks — and that
external authority is itself an attack surface (T2, T13).

| # | Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| T1 | **Custody risk** — operator hot wallet/seed holds customer funds; theft/loss/rug | High | Critical | **Don't custody.** Settlement asset = external chain or ecash mint, never a balance in our Autobase. 2-of-3 multisig escrow for held funds; per-app subkeys isolate the POS signing key from root. |
| T2 | **Offline double-spend** — same ecash token / UTXO spent at two offline terminals before sync | High (offline) | Critical | Autobase linearizes but **can't prevent equivocation across partitions**. Prevention needs an authority *on the spend*: ecash mint nullifier set, or the chain. P2P-native layer only **detects** (publish spend nullifier to the relay-pinned index; conflicting nullifier = provable fraud). Treat offline acceptance as bounded credit-risk with value caps — **we do not claim "prevents double-spend" offline.** (§10) |
| T3 | **Payment privacy — amount/recipient leakage** | High | High | Autobase rows are plaintext to every replica. Use **encrypted Autobee** (`encryptionKey`) so only counterparties read; commit only **salted `lineItemsHash`** to any shared room; use **ecash** to break payer↔payee linkage at the mint. |
| T4 | **Transaction-graph correlation** | Med–High | High | Stable merchant pubkey + DHT topic + pin pattern clusters a merchant's customers. **Per-invoice ephemeral buyer subkeys** (never reuse across customers); ecash; rotate swarm topics per session. Caveat: per-invoice keys are easy to mint but we can't prove two invoices share a merchant without a published binding — the **selective-disclosure boundary** (§7.1b) is exactly this trade. |
| T5 | **Refund/dispute with no central arbiter** | High | High | Escrow/2-of-3 multisig holds funds during the window (release = buyer+merchant OR arbiter+one); **signed refund vouchers** redeemable like inbound payments; disputes in an encrypted append-only evidence log. Resolution still needs a pre-agreed arbiter key *or* timeout rules — partly unsolved (§10). |
| T6 | **Chargeback / finality ambiguity** | High | High | P2P settlement is **final** (no issuer to reverse). Make finality explicit + chosen: surface `pending → settling → final` (escrow adds `escrowed`), mirroring the relay's `seedState` enum. **Never show "paid" before the chosen finality condition.** |
| T7 | **Receipt forgery / unverifiable proof** | High *today* | Critical | **Live gap:** signing exists, **no verifier**; the one receipt path ships fail-closed-untrusted (`anongpt-buyer.js:238`). Ship `identity.verify`/`verifyForApp` (§7.1a); the apply fn re-verifies every `receipt.issue` op before materializing. Until then, fail closed (exactly what anonGPT does). |
| T8 | **Merchant/identity spoofing** | Medium | High | Subkeys don't bind to drive ownership. Publish a **root-signed binding record** `{merchantRootPubkey, posSubPubkey, storefrontDriveKey}` into a self-certifying DHT mutable record (§7.1b); clients **re-verify** (the `relay-client` "index not authority" pattern). Resolve identity relative to a Contacts trust graph, never a global registrar. |
| T9 | **Regulatory / KYC exposure for the operator** | Medium | Critical (legal) | Non-custodial settlement keeps the operator out of money-transmitter scope *only if it never holds customer funds*. Escrow-where-the-operator-holds-a-key, or running a mint, can pull them into MSB/VASP/MiCA. **Legal-design constraint, not a code fix:** prefer non-custodial; if escrow, the arbiter/mint must be a **separate party**. Flag for counsel. |
| T10 | **Processor / relay centralization** | Medium | High | One relay pinning all ledgers = soft central processor (censorship + metadata choke point, T4). DHT-resolvable relay directory (`relay-record.js`) removes the hardcoded relay; require **multi-relay pinning** (`replicas:3`); let merchants pin their own. The relay stays an **index, not an authority**. |
| T11 | **Key / seed compromise** | Medium | Critical | Root seed = total loss and is **unencrypted at rest** (`identity.js` header). Move to **OS keystore**; keep root sealed in the worklet (already the model); use **multisig** so one compromised key can't move escrowed funds; `identity.rotate()` exists but **orphans prior state** — needs a migration/recovery story before it's usable for money. |
| T12 | **Storage-growth / replay DoS on the ledger** | Medium | Medium | Size-limit + version every op (`payment-receipt-ops.cjs`, the catalog precedent); gate writer membership to counterparties; rate-limit at the **swarm-grant boundary** (`swarm-grants.js`). |
| T13 | **Settlement-oracle / confirmation-source manipulation** — a poisoned or single-source Esplora/mempool endpoint reports a false confirmation; a single-source FX feed misprices the sale | Medium | High | **The confirmation source is itself an attack surface.** Don't trust one endpoint: confirm against **multiple Esplora/mempool endpoints** (`escrow-btc.js` already falls back Blockstream→mempool.space — make it a quorum, not just a fallback) and require **N confirmations** before `final`. Replace single-CoinGecko FX with `price-feeds.js` **multi-source median + outlier rejection** (`rejectOutliers`, `minSources`), and **stamp `fxQuote {median, sources, at}` into the signed receipt** (§7.2/§7.5) so the buyer can audit the basis. Generalizes T2: an authority *on the spend* is only as trustworthy as the source you query for it. |

---

## 9. Phased rollout plan

Each phase is independently shippable and feature-flagged where risky, following the `AUTOBEE-RESEARCH.md`
cadence (flag server-side, fail closed, lazily require).

- **Phase 0 — Foundation: the verifier (no flag; pure addition).**
  Add `verify()` + `verifyForApp()` to `backend/identity.js` (mirror `pear-exchange/crypto.js`), unit tests,
  `CMD_IDENTITY_VERIFY = 75`. Un-stub `anongpt-buyer.js` (`verify.ok` becomes computable). *Independently
  valuable; unblocks everything.*

- **Phase 1 — Receipt op-log (flagged `experimentalSignedReceipts`, off by default).**
  `backend/payment-receipt-{ops,apply}.cjs` + manager (clone the Autobee catalog trio); unit tests for the pure
  reducer (concurrent issue/finalize, restart determinism, forged-sig rejection); a two-writer smoke script
  proving convergence + that a non-counterparty replicates bytes but reads nothing (encryption). No UI, no
  settlement wiring yet.

- **Phase 2 — Wire real on-chain confirmation into POS (flagged `experimentalOnchainConfirm`).**
  Vendor `escrow-btc.js`'s on-chain client as a shared `.cjs`; add `processors/onchain.js`; register in the
  crypto slot; route `crypto_btc` through `createTransaction → collectPaymentMethod → confirmPayment`; mark paid
  only on `CAPTURED`; emit a `receipt.issue` op. **Closes the highest-priority gap.** Ship on testnet first
  (`config.network`).

- **Phase 3 — Merchant identity binding (flagged).**
  `backend/merchant-record.js` (clone `relay-record.js`); `CMD_MERCHANT_BIND_PUBLISH/RESOLVE`; buyer-side
  receipt verification (`CMD_RECEIPT_VERIFY`) that resolves the binding and `verifyForApp`s the receipt →
  `verify.ok = true`. Selective-disclosure boundary: merchant bound, buyer ephemeral.

- **Phase 4 — Trust-minimized FX + Cashu rail (flagged).**
  Adopt `price-feeds.js` median FX (stamp `fxQuote` into receipts). Add `processors/cashu.js` against a **real
  configured mint** (replace the `mint.example.com` placeholder); redeem-at-mint confirmation (nullifier =
  double-spend prevention). Surface the mint-custody caveat in UI.

- **Phase 5 — Escrow + disputes in POS (flagged, experimental).**
  Import `createEscrowAPI` behind `processors/escrow.js`; 2-of-3 multisig with a **third-party** arbiter key;
  `CMD_ESCROW_*`, `CMD_DISPUTE_*`; encrypted append-only evidence log; `pending→escrowed→settling→final` UI
  state machine. MVP = single pre-agreed arbiter (decentralized pool is future).

- **Phase 6 — Durability + multi-relay pinning hardening.**
  Pin receipt/escrow rooms via `hiveRelay.seed(…, {replicas:3})`; let merchants run/pin their own relay;
  verify the relay stays index-not-authority; key-at-rest → OS keystore (T11).

- **Phase N (track, don't build) — Lightning.**
  Spike Breez-Liquid **WASM under Bare** [23]; evaluate NWC (NIP-47) bring-your-own-wallet; watch for a
  Holepunch/Keet payments SDK [24][25]. Gate on the spike result.

---

## 10. Open questions

1. **Offline double-spend (hardest).** Can we offer *anything* beyond bounded credit-risk + after-the-fact
   fraud proof for genuinely offline POS acceptance? No Hypercore/Autobase/HyperDHT primitive resolves
   "which spend was first" without a global authority on the spend. What value caps / risk-appetite knobs do
   merchants need, and where do we surface "this was accepted offline and is not yet final"?
2. **Fair dispute adjudication.** Every honest design here is *escrow-with-an-arbiter-option*, not trustless
   arbitration — there is no cryptographic primitive that produces a *fair* verdict over off-ledger facts
   ("goods never arrived"). Is a pre-agreed arbiter key acceptable for MVP, and what's the path to a
   bonded/slashed arbiter pool (pear-exchange `RESEARCH.md`/`PLAN.md` sketch one)?
3. **Module sharing.** Vendored `.cjs` package vs. shared Corestore vs. cross-app RPC bridge — which becomes the
   long-term home for `escrow-*`/`crypto`/`price-feeds`? (§7.7)
4. **Breez-Liquid WASM under Bare.** The repo ships a WASM/JS binding [23] but I could not verify it runs under
   **Bare** specifically (vs. browser/Node). A spike is required before committing to any LN/USDt rail.
5. **Cashu mint selection.** Which mint(s) do we ship against, and how do we surface per-mint custody/trust to
   merchants? Is there a path to a federated (Fedimint) trust profile [10][11]?
6. **Seed-at-rest + rotation-for-money.** `identity.rotate()` orphans prior state — unacceptable for funds. What
   migration/recovery story (and OS-keystore move, T11) must land before money depends on these keys?
7. **Holepunch/Keet payments SDK.** Sources confirm *intent* (LN + USDt micropayments in Keet) but **no public
   developer-facing payments SDK** was found [24][25]. Verify directly with Holepunch before assuming a turnkey
   Pear payments API exists.
8. **USDt-on-Lightning custody.** Tether's announcement [24] describes Taproot Assets but does **not** state
   whether end-user USDt-on-LN is self-custodial. Treat "self-custodial USDt on LN" as unconfirmed.

---

## 11. Sources

External (web) sources — every external claim above is cited by number:

1. Bitcoin Optech — Offers (BOLT12). <https://bitcoinops.org/en/topics/offers/>
2. BOLT 11 Invoicing (overview). <https://medium.com/coinmonks/bolt-11-invoicing-cfe178abb17c>
3. Breez SDK — Nodeless (Liquid) official docs. <https://sdk-doc-liquid.breez.technology/>
4. LDK — "BOLT12 Has Arrived." <https://lightningdevkit.org/blog/bolt12-has-arrived/>
5. Breez SDK — Greenlight official docs. <https://sdk-doc-greenlight.breez.technology/>
6. Knowing Bitcoin — BOLT11 vs BOLT12. <https://knowingbitcoin.com/lightning-invoices-bolt11-bolt12/>
7. OpenSats — Advancements in Ecash. <https://opensats.org/blog/advancements-in-ecash>
8. Cashu — The Cashu Protocol (BDHKE). <https://docs.cashu.space/protocol>
9. Bitfinex — Cashu: Chaumian E-Cash & Mints Over Lightning. <https://blog.bitfinex.com/education/cashu-chaumian-e-cash-mints-over-lightning/>
10. Fedi Docs — Setting up a Fedimint. <https://fedibtc.github.io/fedi-docs/docs/fedimint/intro/>
11. Bitcoin Design Guide — Fedimint. <https://bitcoin.design/guide/how-it-works/ecash/fedimint/>
12. Lightning Labs — L402: Lightning HTTP 402 Protocol. <https://docs.lightning.engineering/the-lightning-network/l402>
13. Lightning Labs — Aperture (L402 reverse proxy). <https://github.com/lightninglabs/aperture>
14. NIP-47 — Nostr Wallet Connect. <https://github.com/nostr-protocol/nips/blob/master/47.md>
15. NIP-57 — Lightning Zaps. <https://github.com/nostr-protocol/nips/blob/master/57.md>
16. Bitcoin Optech — Discreet Log Contracts (DLCs). <https://bitcoinops.org/en/topics/discreet-log-contracts/>
17. dlcspecs — Introduction. <https://github.com/discreetlogcontracts/dlcspecs/blob/master/Introduction.md>
18. Unchained — What is bitcoin multisig escrow and how does it work? <https://www.unchained.com/blog/bitcoin-multisig-escrow>
19. BIP78 — A Simple Payjoin Proposal. <https://bips.xyz/78>
20. Bull Bitcoin — serverless async Payjoin (BIP77). <https://www.bullbitcoin.com/blog/bull-bitcoin-wallet-payjoin>
21. BTCPay Server — official site & repo. <https://btcpayserver.org/> , <https://github.com/btcpayserver/btcpayserver>
22. Breez SDK — Greenlight README (deprecation + Greenlight model). <https://github.com/breez/breez-sdk-greenlight/blob/main/README.md>
23. Breez SDK — Liquid repo (bindings incl. WASM/JS). <https://github.com/breez/breez-sdk-liquid>
24. Tether — "Tether Brings USDt to Bitcoin's Lightning Network" (Taproot Assets, Jan 2025). <https://tether.io/news/tether-brings-usdt-to-bitcoins-lightning-network-ushering-in-a-new-era-of-unstoppable-technology/>
25. The Block — Bitfinex & Tether launch Keet on Holepunch/Hypercore. <https://www.theblock.co/post/159423/bitfinex-tether-video-calling-app-keet-holepunch-hypercore>
26. Blockstream — Greenlight non-custodial Lightning (remote signer / VLS). <https://blog.blockstream.com/greenlight-by-blockstream-scalable-non-custodial-lightning-infrastructure-now-open-to-developers/>
27. eco.com — USDT vs OpenUSDT vs USDT0. <https://eco.com/support/en/articles/11779142-what-s-the-difference-between-tether-openusdt-and-usdt0>
28. iroh — Using QUIC / relay & holepunch model (no payment layer). <https://docs.iroh.computer/protocols/using-quic>
29. iroh — project repo (n0-computer/iroh). <https://github.com/n0-computer/iroh>

Internal source files read for this doc (all absolute):
- `/Users/localllm/Desktop/pear-pos/app/backend/payments.js` (crypto sale path, `status:'pending'`, no confirmation — verified by zero-hit grep)
- `/Users/localllm/Desktop/pear-pos/app/backend/processors/{interface,registry,btcpay}.js` (adapter seam; btcpay `POLL_INTERVAL_MS=3000`, `Settled→CAPTURED`)
- `/Users/localllm/Desktop/pear-pos/app/backend/config.js` (`DEFAULT_CONFIG`, `SENSITIVE_FIELDS` AES-256)
- `/Users/localllm/Desktop/pear-pos/app/backend/receipt-delivery.js` (unsigned print/email/SMS)
- `/Users/localllm/Desktop/pear-exchange/app/backend/escrow.js` (`createEscrowAPI`, fund/release/refund, signatures[])
- `/Users/localllm/Desktop/pear-exchange/app/backend/escrow-btc.js` (`monitorAddress`/`monitorConfirmations`/`broadcastTx`, mempool.space/Blockstream, 2-of-3 P2WSH)
- `/Users/localllm/Desktop/pear-exchange/app/backend/escrow-cashu.js` (NUT-11 P2PK, `verifySignatures`, placeholder mint URL)
- `/Users/localllm/Desktop/pear-exchange/app/backend/crypto.js` (Ed25519 sign **and** verify; deterministic replay-bound messages)
- `/Users/localllm/Desktop/pear-exchange/app/backend/price-feeds.js` (multi-source median + `rejectOutliers`)
- `/Users/localllm/Desktop/pearbrowser-desktop/backend/identity.js` (sign/signForApp/getAppKeypair; **no verify**; seed unencrypted at rest)
- `/Users/localllm/Desktop/pearbrowser-desktop/backend/anongpt-buyer.js` (signed-receipt dial pattern; verify stubbed fail-closed)
- `/Users/localllm/Desktop/pearbrowser-desktop/backend/autobee-catalog-ops.cjs` (op schema + `validateOp` tri-state template)
- `/Users/localllm/Desktop/pearbrowser-desktop/backend/relay-record.js` (self-certifying `dht.mutableGet` pattern for merchant binding)
- `/Users/localllm/Desktop/pearbrowser-desktop/backend/relay-client.js` (`listRelays` re-verify-don't-trust, "index not authority")
- `/Users/localllm/Desktop/pearbrowser-desktop/backend/constants.js` (RPC numbering convention; free 210–229 range)
- `/Users/localllm/Desktop/pearbrowser-desktop/docs/AUTOBEE-RESEARCH.md`, `docs/HIVERELAY-BACKBONE-HANDOVER.md`, `docs/HIVERELAY-SCHEMA-SHEETS-DESIGN.md`, `docs/P2P-SEARCH-RESEARCH.md`
