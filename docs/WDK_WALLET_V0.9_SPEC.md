# PearBrowser v0.9 — Tether WDK Wallet Preview

- **Status:** Implemented in source through Milestones 0–3 (EVM-in-worker
  engine, service layer, settings UI, document-token connection boundary,
  structured payment with browser-chrome consent) and partially through
  Milestone 4: the env-gated live testnet proof (`scripts/wdk-e2e-testnet.mjs`)
  exists and its offline legs pass, but the packaged-target evidence matrix of
  §14.3 has not been run. Page-API bridge (shim, injection gate, document
  tokens, HTTP routes) implemented per §4.4.1 / §4.5.1 / §5.1.
- **Target:** PearBrowser Desktop v0.9.0.
- **Release posture:** Experimental, opt-in, testnet-only, off by default.
- **Last updated:** 2026-08-14.

This document is the release specification for adding a narrowly scoped Tether
WDK payment wallet to PearBrowser. It supersedes the browser-wallet portions of
[`research/payments.md`](./research/payments.md) for v0.9. The older document
remains the design source for the broader Pear POS, signed-receipt, escrow and
settlement program.

## 1. Release decision

PearBrowser v0.9 will prove one thing safely:

> A Hyperdrive app can request one exact testnet USD₮0 payment, PearBrowser can
> show and approve the immutable payment in browser chrome, and an isolated WDK
> engine can submit and reconcile it without exposing wallet secrets or generic
> signing to the page.

The release is intentionally not an Ethereum wallet extension and not a
multi-chain portfolio. It ships a browser-owned wallet UI plus one narrow page
payment capability.

### 1.1 What ships

- Desktop only: macOS, Windows and Linux packaged builds.
- One wallet and EVM account at derivation index `0`.
- One compiled-in test network: Stable Testnet, CAIP-2 `eip155:2201`.
- One compiled-in test asset: test USD₮0 in the exact ERC-20 transfer mode
  defined below. Native-value payments are not part of v0.9.
- Create, restore, backup verification, unlock and lock.
- Browser-chrome address, receive QR, balance and transaction activity.
- A manifest-declared, session-scoped app connection.
- One structured `requestPayment()` operation.
- Browser-owned approval for every payment.
- Durable intent journalling and on-chain reconciliation.
- Backend-enforced `experimentalWalletWdk` feature flag, off by default.

Stable Testnet is the preferred first network because its faucet provides test
USD₮0 and the same asset is used for value and gas, reducing first-run friction.
If the WDK/runtime spike cannot validate Stable Testnet end to end, the release
does not silently substitute another chain. The network choice must be revised
in this document and re-approved.

#### 1.1.1 Frozen Stable Testnet manifest

The v0.9 source manifest hard-codes the following values; none may be supplied
or overridden by a page, environment variable, command line or remote config:

| Field | v0.9 value |
|---|---|
| Network / CAIP-2 | Stable Testnet / `eip155:2201` |
| Numeric / RPC chain ID | `2201` / `0x899` |
| Primary write/read RPC | `https://rpc.testnet.stable.xyz` |
| Independent read RPC | `https://2201.rpc.thirdweb.com/` |
| Asset ID / transfer mode | `stable-testnet-usdt0` / ERC-20 `transfer(address,uint256)` only |
| USD₮0 proxy | `0x78Cf24370174180738C5B8E352B6D14c83a6c9A9` |
| EIP-1967 implementation | `0x3f9E27457ac494fC729beB50e6af04Ec34e3828E` |
| Proxy runtime | `2667` bytes / Keccak-256 `0x63ed5c26f94e91b94fc139f7fdcbb971b27954b8310ec79a3c17b46565fd28d0` |
| Implementation runtime | `17861` bytes / Keccak-256 `0x61466328a9d17e782f4a37d32db189f981ce32e45de6a4668c3f7bb1cd8d49ae` |
| ERC-20 symbol / decimals | `USD₮0` / `6` |
| Native fee ID / symbol / decimals | `stable-testnet-native-usdt0` / `USDT0` / `18` |
| Transaction type | EIP-1559 / typed-envelope byte `0x02` |
| Transaction target / value | the proxy above / `0` |
| Calldata selector | `0xa9059cbb` |
| Priority fee | `0` |
| Finality depth | one included Stable slot, plus the two-provider agreement below |
| Provider-head lag ceiling | `5` blocks |
| Verification-block age / future-skew ceilings | `120 s` / `30 s` |
| Canonical manifest SHA-256 | `0xa28e3c1881a8b2f5ca7a87bd3aeeb50eab6106b50ca793c14ca020d7c2895a8a` |

`backend/wallet/networks/stable-testnet.cjs` now freezes these values. On
2026-08-14, `scripts/check-wdk-network.mjs` queried the Stable and thirdweb
providers at a common height, required the same block hash, and observed the
same chain ID, proxy and implementation bytecode hashes, EIP-1967 implementation
address, symbol and decimals. This closes provider selection and contract
fingerprinting as foundation inputs; it is not evidence that a packaged wallet
has submitted or finalized a payment.

Every release candidate re-runs that checker to bound provider-head skew, apply
the compiled confirmation depth and reject stale/future block timestamps. It
reads `eth_chainId`, proxy bytecode, the EIP-1967 implementation slot,
implementation bytecode, `symbol()` and `decimals()` from both providers at the
selected fresh common block, then repeats every contract and token check at
each provider's own confirmation-adjusted head. That second read prevents a
recent upgrade seen only by the leading provider from hiding behind an older
matching snapshot. Any mismatch blocks the wallet and never updates the
manifest automatically. The payment-specific receipt, event and
canonical-block agreement remains a packaged release gate.

The manifest digest is SHA-256 over the UTF-8 RFC 8785 canonical JSON of the
exact exported frozen object; it is not a hash of CJS source bytes, bundler
output or insertion-order JSON. `backend/wallet/canonical-json.cjs` defines the
shared projection and `scripts/check-wdk-network.mjs` emits the digest used by
release evidence and `networkManifestSha256` in every intent. The checked-in
foundation vector above makes any manifest-field drift an explicit reviewed
change.

Stable v1.2.0 gives USD₮0 two interfaces: it is the native 18-decimal gas asset
and also the 6-decimal ERC-20 at the proxy above. v0.9 deliberately sends only the
ERC-20 form. `amountAtomic` is therefore always six-decimal ERC-20 units (for
example, `1.25 USD₮0` is `1250000`), while gas balance and every `*FeeAtomic`
field are 18-decimal native units. Code must never add those raw integers or use
one interface's decimals for the other. The approval UI formats them separately
before showing the human-denominated transfer, fee and total debit. Wallet UI
also labels ERC-20 spendable balance (`USD₮0`) and native fee balance (`USDT0`)
separately even though both represent the Stable USD₮0 asset.

The adapter may encode only `transfer(address,uint256)` to the compiled proxy.
`approve`, `permit`, `transferFrom`, native-value transfer and all other
calldata remain unreachable.

### 1.2 Explicit non-goals

The following must be unreachable in v0.9, not merely hidden in the UI:

- Mainnet, real funds or a runtime switch that changes the network to mainnet.
- `window.ethereum`, EIP-1193 or wallet-extension compatibility.
- Message signing, `personal_sign`, EIP-712 typed-data signing, arbitrary
  transaction signing or raw signed-transaction export. The single scoped
  exception is the per-app `signAppPayload` attestation of Section 4.6: one
  manifest-gated signature over an app-bound payload hash, never generic
  signing.
- Arbitrary calldata, contract calls, approvals, token addresses, decimals,
  RPC URLs or chain switching supplied by a page.
- Persistent spend authority, background/autonomous spending or spend limits
  that bypass per-payment confirmation.
- BTC, Lightning/Spark, TON, TRON, Solana or additional EVM chains.
- x402, WalletConnect, swaps, bridges, ramps, gasless/paymaster modules or
  account abstraction.
- Wallet seed or financial-permission sync through Corestore, Hypercore,
  Autobase, Hyperswarm or PearBrowser device linking.
- Shared P2P receipt ledgers, merchant identity records, POS settlement,
  refunds, escrow or disputes.
- A page API for wallet address, balance, seed export or transaction history.
- Mobile page injection. Mobile sequencing is defined in Section 13.

## 2. Product principles

1. **The browser owns the payment.** The app proposes an exact payment; the
   browser validates, prepares, presents, approves, submits and reconciles it.
2. **A page token is not a spending grant.** Every value-moving request gets a
   fresh, one-shot browser-chrome approval.
3. **The page never chooses transaction mechanics.** It supplies a recipient
   and atomic amount for a compiled-in chain and asset. PearBrowser owns the
   provider, contract, decimals, calldata, nonce and fee policy.
4. **Payment keys are not identity keys.** WDK gets an independent BIP-39 seed.
   Existing `window.pear.identity.sign()` remains an identity/content-signing
   facility and is never used to move money.
5. **Submitted is not paid.** A transaction hash means `submitted`; only a
   verified successful on-chain receipt can advance it to `included` and then
   `final`.
6. **Ambiguity never creates a new spend.** After signing, recovery may query or
   rebroadcast the same signed bytes; it must never create a replacement spend
   automatically.
7. **P2P state is not settlement authority.** Hypercore can retain records but
   cannot prove chain finality. v0.9 uses the chain and independently configured
   RPC reads for transaction truth.

## 3. User journeys

### 3.1 Enable and create

1. The user enables **WDK wallet preview** in Settings → Experimental.
2. PearBrowser permanently labels the feature **TESTNET · NO REAL FUNDS**.
3. The user opens Settings → Wallet and chooses Create or Restore.
4. Create generates a new wallet seed inside the WDK worklet. Restore accepts a
   BIP-39 phrase only in browser chrome.
5. The user sets a wallet passphrase.
6. During the explicit backup ceremony, browser chrome displays the mnemonic
   and verifies randomly selected words before marking backup complete.
7. The wallet opens on Stable Testnet and displays its address and test USD₮0
   balance.

The mnemonic may exist in the trusted browser renderer only during an explicit
create, restore or backup ceremony because it must be displayed or entered.
Across the backend/worklet boundary it is a mutable UTF-8 byte buffer containing
exactly 24 lower-case English BIP-39 words. Restore input is transferred as a
mutable buffer and the adapter overwrites the caller's buffer before
`beginMnemonicCeremony()` settles. The generated worklet must separately prove
that all of its mutable mnemonic and seed copies are destroyed.

Rendering or entering words through the DOM necessarily creates managed
JavaScript/DOM strings that cannot be proven overwritten. v0.9 explicitly
accepts those copies only as a testnet-preview limitation inside a dedicated
trusted ceremony context. That context disables autocomplete, autocorrect,
spellcheck, form persistence and automatic clipboard writes; clears DOM and
application state on completion, cancellation, backgrounding or error; and is
destroyed rather than reused. No code may claim that those managed strings were
zeroed. A smaller native/isolated ceremony with stronger copy control remains a
hard mainnet gate.

The mnemonic must never enter an app iframe, page bridge, log, error, crash
report, clipboard automatically, Corestore or device-sync record. Any managed
copy outside that short-lived trusted ceremony context is a release blocker.

### 3.2 Connect an app

1. A Hyperdrive app whose manifest declares `pear.wallet.v1.pay` calls
   `window.pear.wallet.v1.connect()`.
2. PearBrowser verifies the feature flag, the tab's exclusive wallet loopback
   origin, manifest and manifest SHA-256.
3. Browser chrome shows the app name, full/short drive key, manifest fingerprint,
   network, asset and the fact that every payment will still require approval.
4. Approval creates a device-local, session-scoped connection bound to
   `(browserSessionId, tabId, driveKey, walletTabOrigin, manifestSha256,
   chainId, assetId)`.
5. The connection ends on disconnect, manifest change, tab close, wallet lock,
   feature disable or browser exit.

PearBrowser re-fetches and re-hashes the manifest before every payment request.
A missing, invalid or changed manifest revokes the connection before an intent
is prepared; a cached connection record is never proof of current eligibility.

Connection does not reveal the wallet address or balance in v0.9.

### 3.3 Pay

1. The connected app calls `requestPayment()` with a recipient, atomic amount,
   human-readable reference and idempotency key.
2. PearBrowser rejects malformed or unsupported fields before touching WDK.
3. The wallet service resolves the compiled asset configuration, checks the
   provider chain ID and the compiled contract/proxy fingerprint, quotes the
   transfer, applies fee limits and constructs an immutable canonical intent.
4. Browser chrome makes app content inert and shows:
   - app name and drive identity;
   - **Stable Testnet** and **test USD₮0**;
   - exact human amount and atomic amount;
   - full recipient, with a copy affordance;
   - estimated fee, hard maximum fee and total debit;
   - reference and manifest fingerprint;
   - an unmissable testnet warning.
5. Approval consumes a one-shot record for the exact intent hash.
6. PearBrowser signs, journals and broadcasts the transaction.
7. The page receives `submitted` plus an intent ID and transaction hash. It can
   query the intent until `final`, `failed`, `reorged` or `uncertain`.

Only one wallet prompt may be pending globally. A second request fails with
`wallet-busy`; prompts expire after two minutes.

## 4. Page API

The release exposes an explicit versioned API, not WDK's generic dispatcher and
not a generic EIP-1193-style `request(method)` surface.

```js
const capability = await window.pear.wallet.v1.capabilities()

const connection = await window.pear.wallet.v1.connect({
  chainIds: ['eip155:2201'],
  assetIds: ['stable-testnet-usdt0']
})

const payment = await window.pear.wallet.v1.requestPayment({
  chainId: 'eip155:2201',
  assetId: 'stable-testnet-usdt0',
  recipient: '0x0123...abcd',
  amountAtomic: '1250000',
  reference: 'order-1842',
  idempotencyKey: 'checkout:order-1842:attempt-1'
})

const status = await window.pear.wallet.v1.transaction(payment.intentId)
await window.pear.wallet.v1.disconnect()
```

### 4.1 Method contract

| Method | Purpose | Consent |
|---|---|---|
| `capabilities()` | Returns protocol version, release posture and supported chain/asset IDs. It must not reveal account or balance. | None; shim eligibility already passed. |
| `connect(request)` | Starts a session connection for the requested subset of the compiled-in chain/assets. | Browser-chrome connection prompt. |
| `status()` | Returns whether this app is connected and whether the wallet can accept a request. It must not distinguish absent vs locked in a way useful for fingerprinting. | Active connection. |
| `requestPayment(request)` | Prepares and requests one exact transfer. | Fresh browser-chrome payment prompt every time. |
| `signAppPayload(request)` | Signs one app-scoped payload hash for the connected drive (§4.6). | Fresh browser-chrome signing prompt every time. |
| `transaction(intentId)` | Returns the sanitized state of an intent owned by the same drive and manifest fingerprint, including after reload or restart. | Active connection; current manifest and drive ownership checks. |
| `disconnect()` | Revokes this session connection and cancels its unapproved intents. | None. |

### 4.2 Input rules

- `chainId` and `assetId` must exactly match compiled-in identifiers.
- `recipient` must parse as an EVM address and cannot be the zero address.
  PearBrowser normalizes it to checksum form before display and hashing.
- `amountAtomic` is a base-10 positive integer string. JavaScript numbers,
  signs, decimal points, exponent notation, whitespace and leading-zero
  ambiguity are rejected. It always uses the compiled ERC-20's six decimals;
  native 18-decimal gas units are never accepted in this field.
- The compiled network manifest sets `maxPaymentAtomic`; the initial product
  ceiling is `10000000`, the atomic equivalent of 10 test USD₮0 per request.
- `reference` is optional, UTF-8, display-only, and limited to 140 bytes. It is
  never treated as trusted or executable and is not placed on chain.
- `idempotencyKey` is required, 16–128 characters, and limited to
  `[A-Za-z0-9._:-]`. Its namespace is the requesting drive and manifest hash.
- Recursive prototype-pollution keys and unknown fields are rejected.
- The wallet request body is capped at 16 KiB.
- Preparation is limited to five attempts per minute per drive; submitted
  payments are limited to 20 per hour per wallet in the preview build.

### 4.3 Response and errors

Amounts and fees are always decimal integer strings. A successful approval
returns a submitted transaction, never a claim of payment finality:

```json
{
  "intentId": "wpi_...",
  "state": "submitted",
  "chainId": "eip155:2201",
  "assetId": "stable-testnet-usdt0",
  "transactionHash": "0x...",
  "createdAt": "2026-08-13T12:00:00.000Z",
  "updatedAt": "2026-08-13T12:00:03.000Z"
}
```

Errors use stable codes such as `wallet-unavailable`, `wallet-disabled`,
`wallet-not-connected`, `wallet-locked`, `wallet-busy`, `invalid-request`,
`unsupported-chain`, `unsupported-asset`, `connection-denied`,
`payment-denied`, `quote-expired`, `insufficient-funds`, `fee-too-high`,
`rpc-unavailable` and `transaction-uncertain`. Error messages must not contain
seed material, signed transaction bytes or provider secrets.

### 4.4 HTTP bridge

The page shim is a thin wrapper over token-authenticated same-origin routes:

```text
GET  /api/wallet/v1/capabilities
POST /api/wallet/v1/connect
GET  /api/wallet/v1/status
POST /api/wallet/v1/payment
POST /api/wallet/v1/sign-app
GET  /api/wallet/v1/transaction?id=<intentId>
POST /api/wallet/v1/disconnect
```

Wallet routes have stricter enforcement than general `/api/*` routes:

- exact browser-issued token, tab, drive, exclusive wallet-tab origin and
  `Host`;
- exact `Origin` on every state-changing request, with no originless POST
  fallback; GET routes retain the same token/context/drive checks because
  browsers do not consistently attach `Origin` to same-origin GET requests;
- top-level app-document context token;
- manifest declaration and stored manifest fingerprint;
- per-drive and global rate limits;
- immediate token, connection and unapproved-intent revocation when the bound
  tab closes.

The selected v0.9 architecture gives every wallet-capable tab its own loopback
listener/port and therefore its own origin, keyed server-side by
`(browserSessionId, tabId)`. A second tab showing the same drive gets a different
listener and origin. The listener is bound to the tab and current drive by
trusted browser state; request paths, `Referer`, fetch metadata and page-supplied
identifiers are never used to infer the tab. A listener-allocation failure
removes the wallet surface for that tab with no per-drive or shared-origin
fallback.

This deliberately means two wallet-capable tabs for the same app do not share
origin-scoped cookies, web storage, Cache Storage or service workers. Apps must
use their normal Hyperdrive/Pear data path for deliberate cross-tab state. The
listener and every record bound to it are destroyed on tab close, feature
disable or browser-session shutdown.

This is the selected architecture, not current implementation evidence. The
existing `HyperProxy` per-drive listener and stable
`pageContextToken(driveKey)` remain useful non-wallet foundations but do not
satisfy this boundary. The preview remains gated until the tab-exclusive
listener, lifecycle and adversarial navigation tests in Sections 12, 14 and 15
pass against the packaged candidate.

#### 4.4.1 v0.9 implementation binding (Phase D, implemented)

The per-tab listener fleet above is **not** implemented in v0.9 — the backend
cannot learn which tab a page request belongs to (`CMD_NAVIGATE` carries no
tab identity, in-page navigations bypass it entirely, and per-drive loopback
origins are shared across tabs showing the same drive). Building per-tab
listeners would require tab identity through navigation, per-tab listener
lifecycle on tab close and a listener fleet; that surgery is deferred. The
implemented binding is:

- **Two credentials per wallet call.** The page presents the per-request
  `pear-api-token` (drive- and origin-bound, 10-minute TTL) *and* the wallet
  document token (`pear-wallet-doc`, 128-bit, 30-minute max TTL). Both are
  minted only into HTML responses that pass the §5 gate; both must verify
  against the same `(driveKey, origin)` for connect, payment, sign-app,
  transaction and disconnect.
- **One live wallet document per drive.** Minting a document token revokes
  every prior token for that drive (single epoch). Any reload, navigation or
  second-tab load of the same app invalidates the predecessor document's
  wallet authority; its calls fail with the same sanitized `not-authorized`
  as a cross-drive or cross-origin token.
- **Connection tuple.** Connections are keyed by `(browserSessionId, tabId,
  driveKey)` where `browserSessionId` is a random per-boot id (connections
  die at browser exit) and `tabId` is the per-drive document slot
  (`tabKeyForDrive`) — so a same-drive reload keeps its session connection
  after the new document passes the manifest checks, exactly as §4.5 allows,
  while a second tab cannot hold concurrent authority.
- **Exact `Origin` on every state-changing request** (no originless POST
  fallback), origin-checked tokens, 16 KiB transport body cap and per-drive
  per-route rate limits, enforced in `HttpBridge._handleWallet()`.

**Equivalence argument.** The §4.4 property to preserve is that wallet
authority is exclusive to one live app context and is revoked on navigation —
never that two contexts share it and never that authority is ambiguous. The
implemented mechanism preserves that property: (1) authority requires both
credentials, neither of which ever leaves the document and the in-memory
backend registries; (2) only one document per drive can hold a live document
token at any moment, so two tabs of the same app cannot race prompts or
payments — the most recently committed document wins and the loser fails
closed; (3) any new top-level commit revokes prior authority before the new
document can act, because revocation happens at mint time, before the new
token is served. The residual difference from the selected architecture is
liveness, not safety: a second tab loading the same app *revokes* the first
tab's live authority instead of holding an independent connection. This is
fail-closed (no ambiguous spending) and matches §4.5's revocation rules.

The v0.9 preview ships with this binding; the per-tab listener architecture
above remains the pre-mainnet requirement.

### 4.5 Top-level document token

Wallet routes require a wallet-specific document token in addition to the
general page token. This is a new primitive; the existing stable
`HyperProxy.pageContextToken(driveKey)` is not sufficient and must not be used
as the wallet document token.

- Before serving any navigation-mode HTML on a wallet-tab listener, the backend
  revokes that tab's prior document token, pending prompt and unconsumed
  approval. This applies even when a relative link, form submission, script,
  meta refresh, redirect, reload or history restore bypasses `CMD_NAVIGATE`.
  If the proxy cannot distinguish a nested-frame HTML request from a root
  navigation, it revokes conservatively and withholds a replacement token until
  the browser-owned tab controller confirms a new top-level commit.
- After a top-level app document commits, and only after the exclusive
  wallet-tab-origin, manifest and CSP injection gates pass, the backend
  generates a fresh 32-byte CSPRNG token. It binds the server-side record to
  `(browserSessionId, tabId, walletDocumentId, navigationEpoch, driveKey,
  walletTabOrigin)`.
- `walletDocumentId` identifies the root app document for one tab. Child frames,
  another tab showing the same drive, a duplicated tab and a popup never share
  it. The token is held only inside the injected shim closure and backend token
  store; it is never written to the DOM, URL, cookie, web storage, Corestore,
  logs or crash metadata.
- Every full navigation, reload, redirect that commits a new document,
  renderer/frame replacement and back/forward-cache restore revokes the old
  token before a new token can be minted. Same-document `pushState`,
  `replaceState` and fragment changes retain the current document token. A
  wallet-eligible document may instead be excluded from back/forward cache, but
  reusing its pre-suspension token after restore is forbidden.
- Token revocation cancels any prompt and unconsumed approval opened by that
  document. The backend rechecks the exact live `(tabId, walletDocumentId,
  navigationEpoch)` both when resolving the chrome prompt and immediately
  before signing, so a navigation/approval race fails closed.
- A same-drive reload may continue using the browser-session connection after
  the new document passes the manifest checks and receives a new token. It may
  query an intent already owned by the same `(driveKey, manifestSha256)`, but
  cannot inherit a pending prompt or approval. Navigating away or closing the
  tab destroys that tab's listener, connection and document state; when the
  drive's live-document count reaches zero, any residual drive-owned
  unapproved-intent state is also revoked.
- Tokens live only in memory, use constant-time comparison against the current
  server-side record, and expire no later than their document, browser session,
  wallet lock or feature flag. A stale, unknown or cross-tab token returns the
  same sanitized authorization failure.

#### 4.5.1 v0.9 implementation notes (Phase D, implemented)

Implemented in `backend/wallet/wallet-documents.cjs` (`WalletDocuments`),
minted by `HyperProxy._injectHtmlHead()` and verified by both the wallet HTTP
routes and the wallet service, with the following approved deviations:

- **128-bit token, not 32-byte.** The Phase D plan fixes the token at 128
  bits (16 bytes, 32 hex chars), minted per top-level document with a
  30-minute maximum TTL.
- **Delivery via `<meta name="pear-wallet-doc">`, not closure-only.** The
  token reaches the shim through an injected meta tag, the same channel as
  the long-standing `pear-api-token`. The spec's closure-only wording
  protects against *other documents* reading the token; a meta tag is
  readable only by scripts running in this same document, and those scripts
  can already call the injected `window.pear.wallet.v1` surface directly —
  so for the §4.4 threat model (cross-document / cross-context misuse) meta
  delivery is equivalent. The token is still never written to the URL,
  cookies, web storage, Corestore, logs or crash metadata.
- **Single live epoch per drive replaces `(tabId, walletDocumentId)`
  bookkeeping.** See §4.4.1. Revocation happens at mint time (before the new
  token is served), which covers reloads, redirects and history restores
  that bypass `CMD_NAVIGATE`.
- **Nested frames are excluded via fetch metadata.** A `Sec-Fetch-Dest`
  other than `document` withholds both the shim and a fresh token, so a
  same-drive child frame cannot mint a token or revoke its root document's
  authority. Requests without fetch metadata are treated as top-level.

### 4.6 App payload signing (extension)

`signAppPayload(request)` is an approved extension beyond the minimal payment
surface. It lets the connected app obtain a wallet signature over one
app-scoped payload hash — for example to authenticate the wallet account to
the app's own protocol — without ever receiving generic signing or key
material.

```js
const signed = await window.pear.wallet.v1.signAppPayload({
  payloadHash: '<64 lowercase hex chars — SHA-256 of the app payload>'
})
// → { intentId, state: 'signed', signature (hex), address, digest (hex) }
```

Rules:

- The manifest must declare `pear.wallet.v1.sign-app`; the connection stores
  the grant and every call re-checks it against the live connection.
- `payloadHash` is exactly 64 lowercase hex characters. The wallet never
  signs a raw payload and never sees more than the hash; the signed digest
  is derived from the canonical app-sign intent, which binds the drive key
  and manifest fingerprint, so a signature for one app cannot be replayed as
  another app's signature.
- Every call is a fresh browser-chrome signing prompt showing the payload
  hash; the same one-shot approval, single-pending-prompt (`wallet-busy`),
  expiry (`prompt-expired`) and rate-limit rules as payments apply.
- The signature and digest cross the HTTP bridge as hex strings.

## 5. Manifest and injection gate

An eligible Hyperdrive app declares:

```json
{
  "name": "Example test checkout",
  "entry": "/index.html",
  "permissions": [
    "pear.wallet.v1.connect",
    "pear.wallet.v1.pay"
  ]
}
```

The wallet shim is injected only when all of the following are true:

1. `experimentalWalletWdk` is enabled in backend settings.
2. The release build is compiled as `testnet-preview`.
3. The content is a Hyperdrive app, not clearnet or an arbitrary loopback page.
4. The wallet-capable tab received its exclusive listener/origin. Reusing the
   existing per-drive origin or falling back to a shared origin disables the
   wallet entirely for that navigation.
5. `manifest.json` is reachable, valid and declares both permissions.
6. The injected shim hash is added to CSP through the existing hash-authorized
   injection pipeline.

A declaration establishes eligibility only. It does not grant connection or
payment authority. Manifest bytes are fetched and hashed again before every
payment; any manifest change ends the connection and requires a new connection
prompt.

### 5.1 v0.9 gate implementation status (Phase D)

Implemented in `HyperProxy._shouldInjectWalletShim()`:

1. `experimentalWalletWdk` settings flag — **implemented**. Read from the
   user-data settings store and pushed live into the proxy
   (`setWalletEnabled`) on boot and on every settings write. Off by default.
2. `testnet-preview` build posture — **implemented as a compiled-constant
   check, with a deviation**: there is no separate build-flag mechanism in
   this codebase, so the gate checks the release-owned network manifest's
   compiled-in `releasePosture` (`backend/wallet/networks/stable-testnet.cjs`,
   `testnet-preview` in the v0.9 source). Compiling a different posture
   requires a source change to that frozen manifest, which is itself
   release-gated.
3. Hyperdrive app/page origin — **implemented structurally**: the injection
   path (`_injectHtmlHead`) only ever runs for `/hyper/*` and `/app/*` HTML;
   clearnet content is served by a separate pipeline that never injects it.
4. Per-tab exclusive listener/origin — **NOT implemented**; replaced by the
   §4.4.1 document-token binding. The existing per-drive origin is reused.
5. Manifest declaring permissions — **implemented with a narrowing**: the
   injection gate requires at least `pear.wallet.v1.connect`.
   `pear.wallet.v1.pay` and `pear.wallet.v1.sign-app` are not required at
   injection; they are enforced per-operation by the wallet service from the
   stored manifest fingerprint (a pay-only call on a connect-only manifest
   fails before any prompt).
6. CSP hash — **implemented**: the shim body hash joins
   `hashesToAuthorize`; CSP stays hash-only.

## 6. Architecture and trust boundaries

```text
Hyperdrive app iframe in an exclusive wallet-tab origin
  window.pear.wallet.v1 (no keys, no generic signing)
        │ tab-bound origin + page token + document token
        ▼
HttpBridge wallet routes
        │ validated, origin/drive/manifest-bound request
        ▼
WalletService in PearBrowser's trusted Bare backend
  ├── WalletPolicy       compiled network/asset/fee rules
  ├── WalletConnections session grants and revocation
  ├── WalletJournal      encrypted intents and recovery state
  ├── WalletVault        passphrase-wrapped WDK encryption key
  └── WdkEngineAdapter   narrow typed interface
             │ typed HRPC only
             ▼
Dedicated WDK Bare worklet
  seed material + WDK account + signing + disposal
             │ fixed RPC providers
             ▼
Stable Testnet
```

### 6.1 Required isolation

The preferred and release-gated design runs WDK in a dedicated Bare worklet
using [`@tetherto/pear-wrk-wdk`](https://docs.wdk.tether.io/tools/pear-wrk-wdk/).
That package keeps WDK state and signing off the host thread and provides typed
HRPC lifecycle calls.

PearBrowser must wrap it with `WdkEngineAdapter`. The production bundle must not
register, expose or invoke `pear-wrk-wdk`'s generic `callMethod` dispatcher,
including from inside the adapter. It must not depend on `allowedMethods` being
present, complete or default-deny. PearBrowser owns a purpose-built typed HRPC
dispatcher whose complete operation set is the narrow interface in Section
6.2; an absent or unknown operation is rejected before argument decoding or WDK
invocation. A source/bundle check and a dynamic unknown-method canary enforce
that prohibition.

The WDK bridge's argument/return-value logging is also prohibited. Production
logs may contain only a fixed operation ID, request correlation ID, duration,
sanitized outcome code and lifecycle state. They must never serialize method
arguments, return values, mnemonics, passphrases, seed/key buffers, unsigned or
signed transaction bytes, calldata, provider credentials or authorization
tokens at any log level. Upstream logging that cannot meet this contract must
be disabled or replaced before the package is loaded. Redaction after raw data
has reached a logger is not an accepted control.

If the exact shipped Pear Runtime cannot host and deterministically terminate
this second worklet on every target in the Section 14.3 matrix, Milestone 0
fails. Loading WDK into page or renderer code is never a fallback. A same-worker
developer spike may inform follow-up work but is not releasable under this
specification.

For this testnet preview, the signed Electron main process, PearBrowser chrome
renderer, trusted Bare backend and dedicated WDK worklet are inside the trusted
computing base. Hyperdrive/clearnet content, manifests, RPC providers and all
network responses are untrusted. Because chrome renders the backup and approval
ceremonies, a compromised chrome renderer can subvert them; moving sensitive
ceremonies to a smaller native/isolated surface is part of the mainnet review.

### 6.2 Narrow engine interface

```text
initialize({ encryptedSeed, encryptionKey, compiledConfig: STABLE_TESTNET })
beginMnemonicCeremony({ type: "create" })
beginMnemonicCeremony({ type: "restore", mnemonic })
beginMnemonicCeremony({ type: "backup", encryptedEntropy, encryptionKey })
finishMnemonicCeremony({ ceremonyId, outcome: "complete" | "cancel" })
dispose() -> { disposed: true }
getAddress(accountIndex = 0)
getBalances()
prepareTransfer(recipient, amountAtomic)
signPrepared(exactPreparedIntent)
broadcastSigned({ signedTransaction, transactionHash })
getTransaction(transactionHash)
```

`compiledConfig` is not a runtime configuration surface. The adapter imports
the checked-in `STABLE_TESTNET` object and accepts only that exact object
identity; a separately frozen clone, changed chain ID, provider, contract or fee
value is rejected. `getBalances()` and `prepareTransfer()` resolve the sole
compiled payment asset and fee ceilings inside the trusted boundary. v0.9 fixes
`accountIndex` to integer `0`; no caller can select another account.

Every endpoint return is an exact plain-record schema with data properties only:

| Operation | Exact return shape |
|---|---|
| `initialize` | `{ initialized: true }` |
| `dispose` | `{ disposed: true }` |
| `getAddress` | `{ address }` |
| `getBalances` | `{ paymentAmountAtomic, nativeFeeAmountAtomic }` |
| `prepareTransfer` | `{ preparedIntentId, from, recipient, amountAtomic, assetId, feeAssetId, transactionType, chainId, transactionTarget, transactionValueAtomic, calldata, calldataHash, nonce, gasLimit, maxFeePerGasAtomic, maxPriorityFeePerGasAtomic, accessList: [], estimatedFeeAtomic, maxFeeAtomic, unsignedTransactionHash, expiresAt }` |
| `signPrepared` | `{ signedTransaction, transactionHash }` |
| `broadcastSigned` | `{ transactionHash }` |
| `getTransaction` | `{ transactionHash, state, confirmations, blockNumber }` |
| ceremony begin | create/backup: `{ ceremonyId, mnemonic }`; restore: `{ ceremonyId }` |
| ceremony finish | cancel/backup: `{ completed: true }`; completed create/restore: `{ completed: true, encryptedSeed, encryptedEntropy, encryptionKey }` |

Unknown fields, symbols, accessors, malformed values, result hash mismatches and
generic `raw`, `key` or `account` objects are rejected before they cross the
adapter. `signedTransaction` is the sole explicitly typed raw-byte result; it is
a bounded mutable buffer needed for the encrypted crash-recovery journal and is
subject to the Section 8.3 handling rules. This table is a foundation contract,
not evidence that the generated WDK worklet implements the operations.

`prepareTransfer` validates every field against `STABLE_TESTNET`: EIP-1559 type
`2`, chain `2201`, compiled proxy target, zero native value, empty access list,
zero priority fee, fee ceiling and the exact 68-byte ERC-20
`transfer(address,uint256)` calldata for `recipient` and `amountAtomic`. It
recomputes Keccak-256 of calldata and of the EIP-2718 `0x02 || rlp([chainId,
nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
accessList])` unsigned envelope. Every EVM integer string is bounded to
`uint256`; the account nonce is additionally capped at `2^64 - 1` as required
by EIP-2681. `signPrepared` receives that exact frozen
projection; the adapter decodes the returned signed type-2 envelope, compares
all nine unsigned fields, requires canonical recovery/low-S signature values,
recovers and compares the sender to `from`, and recomputes its transaction hash
before returning it. Before both prepare and sign, the adapter resolves fixed
account index `0`, binds the first address for the unlock lifecycle, rejects an
address change, and requires `prepared.from` to match it. The generated-worklet
test must exercise every one of
those checks before the operation is release evidence.

Completed create/restore is the other deliberately sensitive exception:
`encryptedSeed` and `encryptedEntropy` must be exact `pb-wdk-secrets-v1`
mutable binary envelopes and `encryptionKey` must be a mutable 32-byte buffer
delivered only to the trusted backend vault writer. The writer persists both
envelopes, wraps the key, then overwrites all three buffers. The pinned
`pear-wrk-wdk` convenience helpers currently return
`encryptionKey`, `encryptedSeed` and `entropy` as immutable base64 strings;
those helper results are explicitly forbidden in the production ceremony path.
The custom typed worklet must use a binary-safe generation/import path that
never creates those immutable strings. A string-to-buffer conversion after the
fact is not accepted because the original string cannot be overwritten.

The two ceremony methods are an all-or-nothing optional endpoint capability in
the current adapter foundation. Create, restore and backup each use a dedicated
one-shot ceremony worklet while the operational wallet is locked. For backup,
the trusted wallet service reads the persisted encrypted-entropy envelope,
unwraps the key and supplies both directly to the one-shot worklet; neither is
page- or renderer-controlled.
Only one ceremony may exist at a time. `finishMnemonicCeremony()` consumes its
ID before invoking the endpoint, so mismatch, concurrency and replay fail
closed; lock cancels it and overwrites exposed buffers. Begin and finish retain
their underlying invocation promises so any mnemonic, encrypted seed, encrypted
entropy or encryption key that resolves after timeout/cancellation is also
overwritten. A dedicated ceremony
worklet is terminated after either outcome. The production ceremony worklet
(`wdk-ceremony-worker.mjs`) implements this protocol with real mnemonic
generation/import and binary envelope handoff; absence of the
capability is not a fallback to WDK `callMethod` or mnemonic export APIs.

The custom typed `dispose` is request/response and must acknowledge exactly
`{ disposed: true }` within two seconds. Upstream's current one-way dispose is
not sufficient. Missing, malformed or late acknowledgement records a disposal
failure, but never prevents the mandatory subsequent worklet termination.

The adapter does not expose WDK account objects, keys, signers, generic method
names or page-controlled configuration. WDK transaction policies should apply a
default-deny allowlist and fee ceiling as defense in depth; PearBrowser policy
validation remains authoritative at the adapter boundary.

## 7. Custody and key lifecycle

### 7.1 Separate wallet domain

- Generate an independent 24-word BIP-39 WDK mnemonic.
- Never derive it from Pear identity, a drive key or a synced Corestore seed.
- Store wallet files under a distinct versioned directory such as
  `<storagePath>/wallet/wdk-v1/`.
- Never add that directory to PearBrowser reset/import/device-sync payloads
  without an explicit wallet-specific ceremony.
- General Browser Reset must warn that it deletes the wallet and require a
  verified backup before proceeding.

### 7.2 Desktop preview vault

For the testnet preview, WDK's encrypted seed remains encrypted with its random
encryption key. PearBrowser wraps that encryption key under a wallet-specific
Argon2id + authenticated-encryption vault, using a new domain and file format
rather than reusing `identity.json`.

On unlock, browser chrome passes the passphrase to the trusted backend over the
existing private host boundary. The backend unwraps the random WDK encryption
key, initializes the worklet, and then zeroes its mutable copy of that key.
Neither the page bridge nor browser chrome receives the unwrapped key or binary
seed; browser chrome sees the mnemonic only during the explicit ceremony in
Section 3.1.

At rest, the wallet directory may contain only:

- WDK encrypted seed/entropy;
- salt, KDF parameters, nonce and wrapped encryption key;
- encrypted device-local intent journal;
- non-secret schema/version metadata.

It must not contain a plaintext mnemonic, seed, encryption key, passphrase or
private key. Files use restrictive permissions and atomic replace semantics.

This passphrase-backed design is acceptable only because v0.9 is testnet-only.
OS-keystore-backed wrapping, secure native backup UX and a completed recovery
review are hard mainnet gates.

#### 7.2.1 Frozen `pb-wdk-secrets-v1` binary envelopes

Create and restore derive a 64-byte BIP-39 seed and retain the 32-byte entropy
needed to reconstruct the 24-word mnemonic. They are encrypted separately under
one fresh random 32-byte WDK encryption key using XChaCha20-Poly1305-IETF and a
fresh 24-byte nonce per envelope. The exact binary layout is:

```text
4 bytes  ASCII "PBWS"
1 byte   version = 1
1 byte   kind: 1 = seed, 2 = entropy
24 bytes nonce
N bytes  ciphertext || 16-byte tag
```

Seed plaintext is exactly 64 bytes and its envelope is exactly 110 bytes.
Entropy plaintext is exactly 32 bytes and its envelope is exactly 78 bytes.
The AEAD additional authenticated data is RFC 8785 canonical JSON with exactly
`aead`, `domain`, `format`, `kind`, `plaintextBytes`, `version` and `walletId`:
`aead="xchacha20poly1305-ietf"`,
`domain="pearbrowser:wdk-secret-envelope"`,
`format="pb-wdk-secrets-v1"`, `version=1` and `walletId="wdk-v1"`.
Magic, version, kind, lengths and wallet binding are checked before use;
authentication failure is sanitized. `backend/wallet/wdk-secret-envelope.cjs`
is the source foundation and fixed vectors run under Node and repository Bare.
The generated worklet must use this binary format directly and prove
create/restore/reopen/backup on every packaged target; converting upstream
immutable base64 helper output is forbidden.

#### 7.2.2 Frozen `pb-wdk-vault-v1` crypto profile

v0.9 writes and accepts one vault profile. Implementations may use a reviewed
library for these primitives but may not substitute algorithms or tune KDF
costs per device:

| Field | Required v1 value |
|---|---|
| File magic / schema | `PBWV` / integer `1` |
| Profile ID | `pb-wdk-vault-v1` |
| Passphrase encoding | Unicode NFC, then UTF-8; 12 Unicode scalar values minimum and 256 UTF-8 bytes maximum |
| KDF | Argon2id, version `0x13`, output 32 bytes |
| Argon2id parameters | `m=65536 KiB`, `t=3`, `p=1` |
| Salt | 16 fresh CSPRNG bytes for every wrap or rewrap |
| AEAD | XChaCha20-Poly1305-IETF with a 32-byte key |
| Nonce / tag | 24 fresh CSPRNG bytes / 16 bytes |
| Plaintext | Exactly the 32-byte random WDK encryption key |

The AEAD additional authenticated data is the RFC 8785 canonical JSON encoding
of the clear header containing exactly `magic`, `schemaVersion`, `profileId`,
`walletId`, `kdf`, `kdfVersion`, `memoryKiB`, `iterations`, `parallelism`,
`salt`, `aead`, `nonce` and `minReaderVersion`. Binary fields use canonical
unpadded base64url. Authentication is verified before the plaintext is used or
any migration/write is attempted. Unknown, duplicate, missing or non-canonical
fields fail closed.

The parser applies ceilings before KDF allocation or base64 decoding: the vault
file is at most 64 KiB; Argon2 memory is at most 262144 KiB, iterations at most
6 and parallelism at most 4; decoded salt is at most 32 bytes, nonce at most 24
bytes and sealed key at most 48 bytes. The v1 reader then requires the exact v1
values above, so tampered-but-in-range parameters cannot weaken or amplify the
unlock operation. Only one Argon2 unlock may run globally at a time. Milestone 0
records unlock latency and peak resident memory on every packaged target; a
slow target blocks release or requires a reviewed profile-version change, never
an adaptive KDF downgrade.

`schemaVersion`, `profileId` and `minReaderVersion` are authenticated downgrade
boundaries. v0.9 rejects pre-spec/development vault formats and unknown or lower
profiles; recovery is restore-from-mnemonic, not a silent legacy fallback. A
future migration must first authenticate and unlock the old profile, write a
new-version temporary vault with a fresh salt and nonce, verify it by reopening
and authenticating it, and atomically replace the old file while retaining a
recoverable encrypted backup until the next successful unlock. Failed unlocks
and unauthenticated files are never rewritten. An older binary that does not
understand `minReaderVersion` must leave the vault untouched.

### 7.3 Locking and disposal

The wallet locks on:

- explicit Lock;
- five minutes without wallet activity;
- browser background/suspend or OS screen lock where observable;
- WDK worklet/service restart;
- feature disable;
- wallet, vault or secure-storage error;
- browser shutdown.

Locking is a deterministic teardown protocol:

1. Atomically enter `locking`, reject new engine requests and revoke document
   tokens, connections, pending prompts and unconsumed approvals.
2. Allow at most `2000 ms` for the adapter to cancel reads, call WDK `dispose()`
   and acknowledge disposal. Disposal errors are recorded only as sanitized
   lifecycle codes and do not stop teardown.
3. Overwrite every PearBrowser-owned mutable passphrase, WDK encryption-key and
   seed-input buffer, then terminate the dedicated worklet. Wait at most another
   `3000 ms` for confirmed worklet exit; a timeout is a lock failure that blocks
   further unlocks until the host has force-terminated/restarted the wallet
   service. A disposed worklet is never pooled or reused.
4. Drop all ports, closures and adapter handles, then enter `locked`. A later
   unlock always creates a new worklet, HRPC session and lifecycle nonce.

WDK's current `dispose()` behavior is not accepted as root-seed clearing: it can
dispose wallets while retaining its root seed. For v0.9, confirmed destruction
of the worklet isolate is the required control that makes that retained object
unreachable. Before release, Milestone 0 must either prove that the shipped Bare
termination primitive destroys the isolate and releases all reachable WDK
state, or PearBrowser must carry a reviewed WDK patch that explicitly overwrites
and clears the root seed before exit. If neither can be proven on every packaged
target, the wallet does not ship.

Tests inject canary seed/key buffers and prove that PearBrowser-owned buffers are
overwritten, `dispose()` failure and a hung request still lead to confirmed
termination, all old HRPC calls fail after lock, and the next unlock has a new
worklet/lifecycle nonce. Packaged tests repeat at least 100 unlock/lock cycles,
scan lifecycle logs and crash artifacts for canaries, and verify that no prior
worklet remains live. Seed phrases held as JavaScript strings cannot be reliably
zeroed, which is why mnemonic display is confined to the explicit ceremony and
is a documented testnet-preview limitation.

Only browser-chrome wallet interaction or a freshly approved payment refreshes
the idle timer. Page calls such as `status()`, `capabilities()` and
`transaction()` cannot keep an unlocked wallet alive.

## 8. Canonical intent, approval and idempotency

### 8.1 Canonical intent

Before prompting, the backend constructs and hashes a canonical record covering:

```jsonc
{
  "v": 1,
  "intentId": "wpi_...",
  "driveKey": "<64-hex>",
  "origin": "<dedicated loopback origin>",
  "manifestSha256": "<64-hex>",
  "walletId": "wdk-v1",
  "accountIndex": 0,
  "from": "<checksummed address>",
  "chainId": "eip155:2201",
  "observedChainId": "0x899",
  "networkManifestSha256": "<checked-in manifest hash>",
  "assetId": "stable-testnet-usdt0",
  "assetContract": "0x78Cf24370174180738C5B8E352B6D14c83a6c9A9",
  "assetImplementation": "0x3f9E27457ac494fC729beB50e6af04Ec34e3828E",
  "assetProxyCodeHash": "0x63ed5c26f94e91b94fc139f7fdcbb971b27954b8310ec79a3c17b46565fd28d0",
  "assetImplementationCodeHash": "0x61466328a9d17e782f4a37d32db189f981ce32e45de6a4668c3f7bb1cd8d49ae",
  "assetSymbol": "USD₮0",
  "assetDecimals": 6,
  "recipient": "<checksummed address>",
  "amountAtomic": "<positive integer string>",
  "transactionType": "eip1559",
  "transactionTo": "0x78Cf24370174180738C5B8E352B6D14c83a6c9A9",
  "transactionValueAtomic": "0",
  "calldataSelector": "0xa9059cbb",
  "calldataHash": "<hash of browser-produced transfer calldata>",
  "nonce": "<integer string>",
  "gasLimit": "<integer string>",
  "feeAssetId": "stable-testnet-native-usdt0",
  "feeAssetSymbol": "USDT0",
  "feeAssetDecimals": 18,
  "maxFeePerGasAtomic": "<integer string>",
  "maxPriorityFeePerGasAtomic": "0",
  "estimatedFeeAtomic": "<integer string>",
  "maxFeeAtomic": "<integer string>",
  "unsignedTransactionHash": "<canonical unsigned transaction hash>",
  "idempotencyKey": "<drive-scoped key>",
  "reference": "<bounded display string>",
  "expiresAt": "<ISO-8601>"
}
```

The record contains exactly the fields above and no transport/UI-only fields.
Before construction, addresses use the one deterministic EIP-55 checksum form;
decimal integers have the grammar in Section 4.2; `reference` is NFC-normalized
UTF-8 with C0/C1 controls rejected; and `expiresAt` is UTC ISO 8601 with exactly
millisecond precision (`YYYY-MM-DDTHH:mm:ss.sssZ`). The canonical bytes are the
UTF-8 RFC 8785 JSON encoding of that exact projection. The approval hash is:

```text
SHA-256(UTF8("pearbrowser:wallet-intent:v1\0") || canonicalIntentBytes)
```

`calldataHash` is Keccak-256 over the decoded calldata bytes. The unsigned
transaction hash is Keccak-256 over the exact EIP-2718 type-2 unsigned bytes:
`0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to,
value, data, accessList])`, with canonical minimal RLP integers and an empty
access list. `networkManifestSha256` uses the separate canonical manifest rule
in Section 1.1.1. Object insertion order, localized display strings and the
renderer projection are never hash inputs. The renderer receives a display
projection plus `requestId`, not an editable transaction object. Fixed vectors
and one-field mutation tests cover every field and domain prefix.

### 8.2 One-shot approval

The renderer resolves only `{requestId, approved}`. At prompt resolution the
backend re-reads the current manifest bytes from the bound drive, recomputes its
hash and rechecks the document/navigation epoch; any change cancels the prompt.
The backend then atomically consumes an approval for the exact canonical hash.
Expired, reused or mutated intents require a fresh quote and prompt.

App content cannot overlay the browser-chrome sheet. The sheet traps focus,
marks app content inert, supports keyboard navigation and does not make Approve
the default focused/destructive action.

### 8.3 Crash-safe send sequence

1. Validate and prepare the transfer.
2. Persist `prepared` intent.
3. Obtain and consume exact approval after the prompt-resolution manifest and
   document checks in Section 8.2.
4. Persist `approved`.
5. Immediately before signing, re-read and hash the bound app manifest again;
   revalidate quote expiry, runtime chain ID and both providers' fresh-head
   proxy code, implementation slot/code, symbol and decimals against the
   approved intent. Any drift consumes/cancels the approval and requires a new
   quote and prompt. Then sign once; decode the signed transaction and verify
   its sender, chain, nonce,
   target, value, calldata and gas fields against the approved intent. Calculate
   its transaction hash locally and persist the encrypted signed bytes plus
   `signed` state **before** broadcast.
6. Broadcast and persist `submitted`.
7. Reconcile receipt, success status, transfer event and block finality.

Requests are serialized per `(chainId, accountIndex)`. Before provider reads or
preparation, the backend constructs a normalized client-request projection with
exactly `{ v: 1, driveKey, manifestSha256, chainId, assetId, recipient,
amountAtomic, reference }`, using the Section 8.1 normalization rules, and
computes:

```text
SHA-256(UTF8("pearbrowser:wallet-request:v1\0") || RFC8785(requestProjection))
```

It atomically reserves `(driveKey, manifestSha256, idempotencyKey)` with that
fingerprint before preparing an intent. Concurrent/restarted requests with the
same fingerprint return the already-reserved intent and its current state,
regardless of transient origin, tab, nonce, quote, fee or expiry fields. A
different fingerprint under the same key is rejected. Denied, expired, failed
and uncertain pre-sign reservations remain immutable and return their terminal
state; a deliberate new attempt needs a new idempotency key. This prevents a
crash or retry from silently creating another quote or spend.

The intent remains owned by that drive and manifest fingerprint across tab,
backend and browser restarts; a newly approved active connection for the same
pair may query it, but never adopt or mutate another pair's intent.

**v0.9 implementation note (2026-08-15).** The reservation lives in the
wallet journal (`k!<driveKey>!<manifestSha256>!<idempotencyKey>` →
`{ intentId, intentDigest }`), written atomically with the serialized intent
append, so it is reserved before any engine work and survives restarts. A
retry with the same fingerprint returns the reserved intent's current state:
the live prompt record while it is still open (the consent broker refuses
the duplicate park with `wallet-busy`, so a retried request never raises a
second consent modal and the in-flight one keeps sole ownership), or the
recorded outcome otherwise. A reservation left unsettled by a restart closes
out as `expired`; an approved-but-never-broadcast reservation reports
`uncertain` until reconcile ships. The same key with a different fingerprint
fails with `idempotency-conflict`.

After a crash between signing and broadcast, PearBrowser queries the locally
derived transaction hash. If absent, it may rebroadcast the same signed bytes.
It must not fetch a new nonce or sign a new transfer automatically.

## 9. Transaction states and settlement checks

The journal supports:

```text
prepared → awaiting_approval → approved → signed → submitted
                                              └→ uncertain
submitted → included → final
          ├→ failed
          ├→ replaced
          ├→ reorged → included → final
          └→ uncertain
awaiting_approval → denied | expired | cancelled
```

To mark an ERC-20 payment `included`, reconciliation verifies:

- RPC chain ID equals the compiled chain;
- transaction hash matches the journalled signed transaction;
- receipt exists and has success status;
- transaction target is the compiled asset contract;
- the network-manifest, proxy code, EIP-1967 implementation address and
  implementation code still match the intent at the receipt's block;
- the decoded transfer event matches `from`, recipient and atomic amount;
- receipt block hash remains canonical.

`final` additionally requires the compiled confirmation/finality policy and a
cross-check through the configured secondary read provider. RPC disagreement,
timeout or incomplete evidence yields `uncertain`, never `final`.

The v0.9 finality depth is one included Stable slot, but depth alone is never
sufficient. At that slot, the primary and independently operated secondary
provider must return the same successful receipt, transaction fields, block
number and block hash, and each provider must still identify that block hash as
canonical. Any disagreement or disappearance returns the intent to `reorged` or
`uncertain`; it is never presented as final from the primary response alone.

Public RPC providers learn wallet addresses and network metadata. The preview
must disclose this in Wallet settings and must not claim payment-network
privacy.

## 10. Internal modules and integration map

Foundation files already present:

```text
package.json
package-lock.json
backend/rpc.js
backend/wallet/canonical-json.cjs
backend/wallet/networks/stable-testnet.cjs
backend/wallet/wallet-vault.cjs
backend/wallet/wdk-engine.cjs
backend/wallet/wdk-secret-envelope.cjs
scripts/check-wdk-cohort.mjs
scripts/check-wdk-network.mjs
scripts/wdk-bare-smoke.mjs
scripts/wdk-isolate-worker.mjs
scripts/wdk-isolate-smoke.mjs
test/wdk-foundation.test.js
test/wallet-vault.test.js
test/wdk-engine.test.js
test/wdk-isolate-smoke.test.js
test/wdk-network-policy.test.js
test/wdk-secret-envelope.test.js
test/worklet-rpc.test.js
test/origin-isolation.test.js
```

Modules implemented since the foundation (Milestones 0–4, all present in
source):

```text
backend/wallet/app-payload.cjs
backend/wallet/canonical-intent.cjs
backend/wallet/evm-envelope.cjs
backend/wallet/wallet-chrome-reads.cjs
backend/wallet/wallet-connections.cjs
backend/wallet/wallet-consent.cjs
backend/wallet/wallet-documents.cjs
backend/wallet/wallet-journal.cjs
backend/wallet/wallet-manifest.cjs
backend/wallet/wallet-policy.cjs
backend/wallet/wallet-service.cjs
backend/wallet/wdk-bare-imports.json
backend/wallet/wdk-bare-transport.cjs
backend/wallet/wdk-ceremony-ops.mjs
backend/wallet/wdk-ceremony-worker.mjs
backend/wallet/wdk-worker.mjs
backend/wallet/wdk-worker-ops.mjs
ui/lib/wallet.js
examples/wallet-e2e/manifest.json
scripts/wdk-ceremony-smoke.mjs
scripts/wdk-evm-worklet-smoke.mjs
scripts/wdk-e2e-testnet.mjs
test/canonical-intent.test.js
test/http-bridge-wallet.test.js
test/wallet-chrome-reads.test.js
test/wallet-connections.test.js
test/wallet-consent.test.js
test/wallet-documents.test.js
test/wallet-journal.test.js
test/wallet-lib.test.js
test/wallet-manifest.test.js
test/wallet-policy.test.js
test/wallet-service.test.js
test/wallet-shim.test.js
test/wdk-ceremony-worker.test.js
test/wdk-evm-worklet-smoke.test.js
test/wdk-worker-ops.test.js
```

Existing integration points:

- `index.js`: statically load any ESM-only WDK host factory required by Bare.
- `backend/index.js`: wallet lifecycle, pending prompts, browser-only commands,
  events and shutdown disposal — **wired** (`WalletService` +
  `WalletConsentBroker` around the engine's default Bare spawner).
- `backend/constants.js` and `ui/boot.js`: mirrored RPC IDs — **wired**
  (`CMD_WALLET_*` 300–313, `EVT_WALLET_*` 112–114).
- `backend/http-bridge.js`: wallet page routes and strict financial-origin
  checks — **wired** (`/api/wallet/v1/*`, spec §4.4).
- `backend/hyper-proxy.js`: manifest gate, CSP hash injection and document-token
  minting/revocation — **wired** per §5.1; the per-tab exclusive listener is
  replaced by the §4.4.1 document-token binding (per-drive document slot).
- `backend/pear-bridge.js`: `PEAR_WALLET_V1_SHIM` — **wired**.
- `ui/shell.js`: Wallet settings, consent modal and wallet connections —
  **wired** (create/unlock/lock, address/balance/activity, connection list with
  revoke, and the approval modal, all inside the Wallet settings section).
- `styles.css`: wallet and approval UI.
- `package.json` and lockfile: exact WDK dependency cohort — enforced by
  `scripts/check-wdk-cohort.mjs`.
- `pear.stage.entrypoints`: include the generated wallet worklet artifact —
  **not applicable**: the worker runs from source through the engine's default
  Bare spawner; no generated worklet artifact is staged.

Proposed RPC allocation avoids the currently occupied and historically reserved
200 ranges:

```text
300 CMD_WALLET_STATUS
301 CMD_WALLET_CREATE
302 CMD_WALLET_IMPORT
303 CMD_WALLET_BACKUP
304 CMD_WALLET_UNLOCK
305 CMD_WALLET_LOCK
306 CMD_WALLET_ADDRESS
307 CMD_WALLET_BALANCES
308 CMD_WALLET_TRANSACTIONS
309 CMD_WALLET_CONNECTIONS_LIST
310 CMD_WALLET_CONNECTION_REVOKE
311 CMD_WALLET_CONNECT_RESOLVE
312 CMD_WALLET_PAYMENT_RESOLVE
313 CMD_WALLET_RECONCILE

112 EVT_WALLET_CONNECT_REQUEST
113 EVT_WALLET_PAYMENT_REQUEST
114 EVT_WALLET_TX_UPDATE
```

These commands are browser-chrome/internal RPC. Hyperdrive pages use only the
HTTP bridge contract in Section 4.

## 11. Dependency policy

### 11.1 Foundation cohort evidence

The current exact-pinned foundation cohort as of 2026-08-14 is:

- `@tetherto/wdk` `1.0.0-beta.16`;
- `@tetherto/wdk-wallet-evm` `1.0.0-beta.16`;
- `@tetherto/pear-wrk-wdk` `1.0.0-beta.11`;
- `@tetherto/wdk-worklet-bundler` `1.0.0-beta.9` as a development dependency;
- direct runtime `sodium-universal` `5.0.1` for the wallet vault;
- an explicit `@tetherto/wdk-wallet` `1.0.0-beta.16` override;
- PearBrowser's existing Bare `1.30.3` and Pear Runtime `1.3.1`.

`@tetherto/wdk-wallet-evm` declares `@tetherto/wdk-wallet`
`1.0.0-beta.13`, so PearBrowser now makes the compatibility choice explicit in
`package.json`: the override resolves the whole lockfile to one
`@tetherto/wdk-wallet` `1.0.0-beta.16` entry. The current
`scripts/check-wdk-cohort.mjs` gate verifies every exact WDK, sodium, Bare and
Pear Runtime pin; matching root lockfile declarations; one canonical SHA-512
SRI digest; the exact canonical npm-registry package/version path; the declared
override; and the complete approved WDK-family graph including transitive
versions. Negative fixtures prove that nested version skew, coordinated host
runtime drift, alternate registry hosts, same-host package-path substitution
and malformed integrity fail the gate.

The same golden derivation in `scripts/wdk-bare-smoke.mjs` produced
`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` from the fixed test mnemonic
under both repository Node and Bare `1.30.3`. Both runtimes also produce the
exact frozen type-2 Stable Testnet ERC-20 signed-transaction bytes and hash
`0x31a5f71196b5efc0640e06375a3db03b62daa0d2b4e8a53f5e7d764d8ecb0777`.
Together, those results establish a single-version foundation graph, basic
account compatibility and a deterministic offline signing vector. They do not
prove online preparation/broadcast, the generated `pear-wrk-wdk` worklet
bridge, or any packaged target.
The override is therefore accepted for the spike foundation but remains
conditional on every worklet, transaction-vector and Section 14.3 gate. A
failure there requires a compatible published cohort or a reviewed source-pinned
fork; it must not be waived because the address vector passed.

### 11.2 Release cohort policy

The authoritative cohort inputs are `package.json`, `package-lock.json` and
`scripts/check-wdk-cohort.mjs`. Release evidence captures their SHA-256 values,
the checker's machine-readable output, Bare and Pear Runtime versions, the
network-manifest SHA-256 and generated worklet SHA-256. All WDK packages remain
pre-stable. The release must:

- use exact versions, never `^`, `~`, `latest`, a moving tag or multiple
  versions of the same WDK package; beta/RC boundaries must match the recorded
  tested cohort;
- keep the explicit wallet-base override and lockfile integrity under the
  cohort checker;
- reject invalid, extraneous or unmet WDK dependencies from `npm ls --all`;
- record the exact tested cohort and checker output in release evidence;
- record the generated WDK worklet SHA-256;
- review package provenance, licenses, changelogs and transitive audit output;
- run golden derivation, intent serialization and signing vectors after every
  dependency change;
- run those vectors against the actual packaged worklet, not only Node/Bare
  source tests;
- make WDK upgrades dedicated pull requests with packaged Bare smoke and
  rollback proof.

The official WDK EVM module supports EVM transactions and ERC-20 transfers, but
its breadth is not a reason to expose those capabilities. The adapter allowlist
in this specification remains the product boundary.

## 12. Milestones

### Milestone 0 — Runtime and network spike

**Status (2026-08-14): source-complete; packaged-target evidence open.** The
EVM-in-worker gap called out below is closed: `backend/wallet/wdk-worker.mjs`
links the full EVM graph inside a real Bare worker thread (the
`wdk-bare-imports.json` import-attribute remap stubs ws's absent optional
native peers), and `scripts/wdk-evm-worklet-smoke.mjs` derives the golden
account and reproduces the exact frozen EIP-1559 signature bytes inside that
worker through the engine's default Bare spawner (`smoke:wdk:evm`). The
end-to-end script additionally exposed a Bare runtime SIGSEGV — terminating a
worker thread after `bare-https` had seen TLS traffic crashed the whole
process; the worker now routes ethers' HTTP(S) through `bare-fetch`
(`FetchRequest.registerGetUrl` in `wdk-worker.mjs`), and network-plus-terminate
exits cleanly. The packaged-target deliverables below (four targets, three
operating systems, §14.3) are NOT done and remain the milestone exit.

The current source foundation has already passed four inputs to this spike:

- `scripts/check-wdk-cohort.mjs` proves one exact resolved wallet-base version;
- `scripts/wdk-bare-smoke.mjs` derives the golden account and reproduces the
  exact signed transaction vector under Node and Bare `1.30.3`;
- `scripts/wdk-isolate-smoke.mjs` runs WDK core behind the typed adapter in a
  real Bare worker, rejects generic/inherited operations, overwrites its root
  seed, and confirms termination after graceful and hung disposal; and
- `scripts/check-wdk-network.mjs` proves two-provider agreement on the frozen
  network, contract metadata and runtime bytecode fingerprints.

These checks select the cohort and network inputs. They do not exercise any
packaged OS target and therefore do not satisfy the milestone exit. The
formerly open worker-graph gap (EVM kept outside the isolate because
`bare-worker` eager preparation reached ws's absent optional `bufferutil`
peer) is resolved as described above; the isolate smoke keeps its WDK-core
scope by design while `wdk-evm-worklet-smoke.mjs` proves the EVM graph in the
production worker. Remaining deliverables:

- Launch and dispose a dedicated WDK worklet from the exact v0.9 desktop host.
- Prove the typed PearBrowser dispatcher across every packaged target in
  Section 14.3, with generic `callMethod` absent, unknown operations rejected
  and canary arguments absent from every log sink.
- Prove the deterministic lock protocol: owned-buffer overwrite, disposal,
  confirmed worklet termination and a fresh isolate on the next unlock,
  including dispose-error and hung-request cases.
- Prove create/restore through the custom binary ceremony dispatcher: no
  upstream base64 `entropy`, `encryptedSeed` or `encryptionKey` string is
  created, every mutable mnemonic/key/seed copy is overwritten, and packaged
  log/crash-report scans contain none of the canary material.
- Repeat the golden mnemonic/address vector through the generated worklet in
  every packaged target; the Node/Bare host result alone does not count.
- Re-run the two-provider manifest checker for the release candidate, then prove
  balance, quote, transfer, receipt/event decoding and finality through the
  actual worklet and packaged wallet path.
- Prove WDK can sign the exact pre-approved unsigned transaction without
  silently re-fetching or changing its nonce, target, value, calldata or gas
  fields; otherwise Milestone 0 fails.
- Measure package-size, startup-time and memory deltas.
- Re-run the exact lockfile/cohort gate in Section 11 and capture its output,
  package/lock hashes and generated worklet checksum in release evidence.
- Benchmark the frozen vault KDF's unlock latency and peak memory without
  lowering its parameters on any target.

Exit: all four packaged targets across the three desktop operating systems pass.
Otherwise the wallet does not enter the release.

### Milestone 1 — Browser-owned wallet

**Status (2026-08-14): done in source.**
`wallet-service.cjs` + vault/policy/connections/journal, the Wallet settings
section (create/import/backup flows, unlock/lock, address, balance, activity,
auto-lock) and the RPC command surface are implemented and covered by unit
tests. Create/restore/backup run through the production ceremony path: the
engine's default `spawnCeremonyWorklet` spawns the dedicated one-shot Bare
ceremony worker (`wdk-ceremony-worker.mjs` + `wdk-ceremony-ops.mjs`, protocol
`pear-browser-wdk-ceremony-v1`), which generates/validates the mnemonic with
`bip39-mnemonic`, derives the 64-byte seed, seals seed + entropy into
`pb-wdk-secrets-v1` envelopes behind a fresh random 32-byte key and hands all
vault material back as mutable buffers — the upstream immutable base64 helper
strings are never created. `test/wdk-ceremony-worker.test.js` runs the real
worker under Bare through create/restore/backup, tamper rejection, one-shot
semantics and a full WalletService create → unlock → backup → restore loop,
and `scripts/wdk-e2e-testnet.mjs` uses the real `restoreWallet`/`backupWallet`
genesis path end to end.

Deliverables:

- Wallet vault, journal, policy and narrow WDK adapter.
- Create, restore, backup challenge, unlock, lock and disposal.
- Wallet Settings UI with permanent testnet treatment.
- Browser-only address, receive QR, balance and activity.
- Auto-lock and crash/restart recovery.

Exit: no page-facing wallet API exists yet; custody and recovery tests pass.

### Milestone 2 — Read-only connection boundary

**Status (2026-08-14): done in source under the §4.4.1 binding.** Manifest
parser/fingerprinting (`wallet-manifest.cjs`), per-document tokens
(`wallet-documents.cjs`) with single-live-epoch-per-drive revocation, the
injection gate (§5.1), the `/api/wallet/v1/*` routes, session connection
prompt/status/disconnect and the settings-side connection list with revoke are
implemented. The exclusive per-wallet-tab listener was deliberately replaced
by the §4.4.1 document-token equivalence; the fixture-drive/two-tab isolation
exit is covered by unit tests (`wallet-documents`, `http-bridge-wallet`,
`wallet-connections`) rather than by two physical fixture drives. One
integration defect was found by the end-to-end script and fixed: the service
stripped `walletTabOrigin` before token verification, which would have failed
every page call closed against the real registry; a regression test now pins
the full-tuple binding.

Deliverables:

- Manifest parser and fingerprinting.
- Exclusive per-wallet-tab listener/origin and fail-closed wallet shim
  injection; no reuse of the existing per-drive origin.
- Session connection prompt, status, disconnect and Permission Center listing.
- Pre-HTML navigation rotation plus tab-close and manifest-change revocation.

Exit: two fixture drives, and two tabs showing the same fixture drive, cannot
observe or reuse one another's origin, document token or connection.

### Milestone 3 — Structured payment

**Status (2026-08-14): done in source.** Canonical intent + hashing
(`canonical-intent.cjs`), the strict validators in the engine, policy
ceilings and rate limits, the single in-flight prompt with one-shot consume,
browser-chrome consent via `WalletConsentBroker`, the sign-once journal
(`wallet-journal.cjs`) and the crash-safe prepare → sign → broadcast sequence
are implemented and unit-tested, including denial, mutation, replay and
engine-failure paths. The §8.3 idempotency reservation is enforced in source
since 2026-08-15 (journal-backed atomic reservation; see the §8.3 v0.9
implementation note), the prepared fee is checked against the compiled
ceiling before signing, and journal appends are serialized with
crash-robust sequence recovery. Live-chain settlement (prepare, sign,
broadcast, finality polling) is exercised by `scripts/wdk-e2e-testnet.mjs`;
see M4 for the funded-payment evidence status.

Deliverables:

- Strict request validator and canonical intent hashing.
- Quote, fee ceiling, immutable browser-chrome approval and one-shot consume.
- Sign-once journal, idempotent broadcast and sanitized page response.
- Transaction reconciliation through finality/reorg/uncertain states.

Exit: an approved fixture payment broadcasts exactly once; denial, mutation,
replay and ambiguity never create a spend.

### Milestone 4 — Release proof

**Status (2026-08-14): partial.** Done: the §14 unit/contract suite (921
tests), the Bare smokes (`smoke:wdk:node/bare/isolate/evm`), the cohort and
live-network gates, and `scripts/wdk-e2e-testnet.mjs`
(`smoke:wdk:e2e`) — an env-gated live proof that runs the real production
stack (engine default Bare spawner, service layer, consent broker with a
programmatic auto-approver, document registry) through vault unlock,
manifest/doc-token connect, a `signAppPayload` round-trip with independent
signer recovery, and — given a funded mnemonic via `WDK_E2E_MNEMONIC` — a
≤ 1 USD₮0 payment with broadcast, finality polling and journal assertions.
NOT done: the packaged macOS/Windows/Linux smoke matrix (§14.3), an
explorer-confirmed funded fixture payment (no funded testnet mnemonic has
been available to the build environment; the script's skip, offline and
unfunded paths are verified instead), and the manual accessibility/chrome
approval evidence.

Deliverables:

- Automated tests in Section 14.
- Packaged macOS, Windows and Linux WDK smokes.
- One explorer-confirmed test USD₮0 payment from a declared fixture app.
- Manual accessibility and browser-chrome approval evidence.
- Release notes that say experimental, desktop-only and testnet-only.

Exit: all v0.9 gates in Section 15 pass with the feature still off by default.

### Milestone 5 — Mainnet decision, not part of v0.9

Mainnet requires a separate specification and approval. At minimum: independent
security review, stable or explicitly accepted WDK maturity, OS-keystore-backed
custody, recovery drill, provider/privacy policy, dependency/SBOM review, legal
review, limited-value beta, incident response and a mainnet-specific release
gate that cannot be enabled by replacing an RPC URL.

## 13. Mobile sequencing

Mobile does not expose `window.pear.wallet` in the v0.9 release train.

Reasons:

- mobile Hyperdrive apps still share a loopback origin;
- trusted HTTPS origins default to `all` rather than fail-closed allowlist;
- the existing `pay` label is not an enforced financial permission;
- current WDK React Native packages require a newer Bare Kit/Expo cohort than
  the repository currently pins;
- OS Keychain/Keystore custody adapters and physical-device evidence are not
  complete across the RN, SwiftUI and Compose hosts.

The parallel mobile task for this release is a compatibility spike only:

1. Prove the pinned WDK worklet on physical iOS and Android devices.
2. Measure the iOS 64 MiB worklet limit and Android process footprint.
3. Design Keychain `WhenUnlockedThisDeviceOnly` + user-presence storage and
   hardware-backed Android Keystore + biometric/device-credential storage.
4. Change trusted-origin posture and add per-app origin isolation before any
   page bridge.
5. Add backup exclusion and secure-storage checks to mobile release preflight.

A later release may first ship a browser-owned mobile Wallet screen with no
WebView access. Page payments follow only after mobile origin isolation and
financial consent parity are proven.

## 14. Verification plan

### 14.1 Unit and contract tests

Foundation coverage already present:

- `test/wdk-foundation.test.js`: pins every dual-role Stable Testnet manifest
  field and canonical digest, executes the dependency/host-runtime cohort gate
  and runs the Node/Bare vectors;
- `scripts/check-wdk-cohort.mjs`: verifies exact WDK, sodium, Bare and Pear
  Runtime pins, canonical npm package paths and SHA-512 SRI, the explicit
  wallet-base override and the complete single-version WDK family;
- `scripts/check-wdk-network.mjs`: re-reads the manifest through both providers
  at one fresh, confirmation-adjusted common block and each provider's own
  confirmed head, and verifies head lag, timestamp, block, contract,
  implementation, symbol and decimal agreement;
- `test/wdk-network-policy.test.js`: deterministically rejects stale provider
  heads, post-common-height upgrades, stale/future blocks and non-canonical ABI
  address/string results while checking confirmation-depth selection offline;
- `scripts/wdk-bare-smoke.mjs`: runs the same golden derivation, key vault and
  seed/entropy envelope round trips, and exact offline Stable transaction vector
  under Node and repository Bare `1.30.3`;
- `test/wdk-isolate-smoke.test.js`: runs WDK core through a typed Bare worker,
  rejects generic operations, verifies owned/root-seed overwrite and confirms
  forced worker exit after a hung disposal; it is not the generated EVM
  worklet or packaged-target evidence;
- `test/wallet-vault.test.js`: exercises the frozen vault-profile foundation,
  round trip, NFC normalization, tamper/wrong-passphrase rejection, resource
  ceilings and cross-wallet binding;
- `test/wdk-secret-envelope.test.js`: pins the exact seed-envelope bytes and
  rejects tamper, wallet substitution and seed/entropy kind confusion;
- `test/wdk-engine.test.js`: exercises the typed adapter foundation, exact
  Stable Testnet object identity, caller asset/fee rejection, strict result
  schemas, exact prepared/signed EIP-1559 field and hash checks, acknowledged
  disposal, account-0 binding, generic endpoint rejection, one-shot
  create/restore/backup ceremony lifecycle, late-result and mnemonic overwrite,
  sanitized failures, concurrent-initialize and lifecycle race invalidation,
  owned-buffer overwrite and bounded initialize/dispose/terminate
  behavior with a mock endpoint, not real mnemonic generation or the generated
  EVM worklet;
- `test/wdk-ceremony-worker.test.js`: runs the real one-shot ceremony worker
  under Bare through the engine's default ceremony spawner — create (24 words,
  self-consistent envelopes, host zeroing), deterministic restore of a fixed
  24-word vector, backup round-trip from the persisted entropy envelope,
  tampered-envelope rejection, one-shot semantics (concurrent begin,
  mismatch, concluded), golden BIP-39 seed/address pinning and a full
  WalletService create → unlock → backup → restore loop;
- `test/origin-isolation.test.js`: proves distinct feature-flagged per-drive
  listeners and origin-bound API tokens only; it does not yet prove the selected
  per-wallet-tab listener or document-token lifecycle; and
- `test/worklet-rpc.test.js`: rejects duplicate internal RPC handler
  registration without replacing the original handler.

These are source/foundation tests. The additional suites listed below are now
also present in source (900 tests total at the time of writing), except where
marked open:

- `test/wallet-policy.test.js`: six-decimal ERC-20 amount grammar, separate
  18-decimal native fee accounting, zero address, unknown chain/asset,
  page-supplied contract/RPC/calldata, non-`transfer` selectors, fee ceilings
  and expiry.
- extend `test/wallet-vault.test.js` with fixed Argon2id/XChaCha vectors,
  restart, migration and format-domain-separation coverage — **open**;
- extend `test/wdk-engine.test.js` against the packaged worklet with the golden
  mnemonic/address, prepare/sign/broadcast sequence, unknown-operation rejection
  before decode, argument/return log canaries and lifecycle checks — **open**
  (the source-level equivalent runs in `test/wdk-evm-worklet-smoke.test.js`);
- `test/canonical-intent.test.js`: stable serialization and mutation coverage
  for every approved field.
- `test/wallet-service.test.js`: lifecycle, prompt denial/timeout, one pending
  request, nonce serialization, exact approval, idempotency and crash recovery.
- `test/wallet-connections.test.js`: drive/origin/manifest binding, expiry,
  tab-close cleanup and non-replication.
- `test/http-bridge-wallet.test.js`: missing, originless, stolen and cross-drive
  tokens; cross-tab/document/reload token reuse; navigation-at-approval races;
  exclusive wallet-tab-origin gate; body limits; locked wallet; sanitized
  errors.
- `test/wallet-shim.test.js`: flag + manifest + wallet-tab-origin injection,
  exact CSP hash and absence of `window.ethereum`.
- `test/wallet-ui-contract.test.js`: complete immutable display, focus behavior
  and renderer inability to edit backend intent fields — **open**.
- the existing constants-mirror and reset/packaging suites, plus wallet-specific
  origin-isolation tests proving different origins for same-drive sibling tabs,
  pre-HTML revocation for link/form/script/meta-refresh/redirect/reload/history
  navigation, conservative nested-frame handling, tab-close cleanup and refusal
  to reuse either the per-drive or shared origin — **partially open**: the
  wallet-specific origin-isolation suite is superseded in part by the §4.4.1
  per-drive document-slot binding (see `test/wallet-documents.test.js`).

### 14.2 Fault and adversarial tests

- Wrong chain ID from either provider.
- Wrong/mutated token metadata or contract code.
- Insufficient asset balance and insufficient gas/value balance.
- Provider outage, disagreement, timeout and malformed response.
- Quote expiry between prompt and approval.
- App navigation, reload, manifest update or tab close during a prompt.
- Approval replay and changed recipient/amount/fee/calldata after approval.
- Duplicate idempotency keys with matching and conflicting inputs.
- Crash before signing, after signing, during broadcast and after broadcast.
- Replaced transaction, failed receipt, reorg and secondary-provider lag.
- Feature disable and wallet lock while requests are in flight.
- Seed/token/transaction-byte scans across logs, errors, Corestore, sync state,
  crash artifacts and staged release contents.

### 14.3 Packaged and manual evidence

The wallet gate covers the repository's complete native release matrix:

| Target | Candidate artifact |
|---|---|
| `darwin-arm64` | macOS Apple Silicon application from the v0.9 package |
| `darwin-x64` | macOS Intel application from the v0.9 package |
| `win32-x64` | Windows x64 MSIX application from the v0.9 package |
| `linux-x64` | Linux x64 AppImage from the v0.9 package |

Each row runs on a clean native host/VM of that target after packaging. A source
test, cross-compiled build, emulated target or unpackaged worklet does not count.
All four rows must use the same source commit, `package.json`,
`package-lock.json`, captured `scripts/check-wdk-cohort.mjs` report, network
manifest and worklet digest. Evidence records the runner OS/version, CPU
architecture, artifact filename and SHA-256, app/runtime/Bare versions, package
and lockfile hashes, cohort report, network-manifest digest, worklet digest,
start/end time, command and machine-readable result. A change to any recorded
input invalidates all affected rows; historical evidence from another candidate
cannot be combined.

Every target must prove:

- clean install, upgrade from v0.8, rollback and vault-continuity behavior;
- packaged worklet checksum, load, typed HRPC, unknown-method rejection and
  sensitive-log canaries;
- golden create/restore, exact derived address and the frozen vault profile;
- 100 unlock/lock cycles with confirmed isolate exit and no old live worklet;
- prepared unsigned bytes and hash matching the canonical vector, plus decoded
  signed sender/chain/nonce/target/value/calldata/gas fields matching exactly;
- denied/timed-out prompts and navigation/reload/tab-close prompt races; and
- one explorer-confirmed fixture payment and reconciliation to configured
  finality using the compiled Stable Testnet manifest.

Candidate-wide manual evidence also covers undeclared and manifest-changed
fixture apps, cross-drive tokens, same-drive sibling-tab isolation, refusal of
per-drive/shared-origin fallback, and keyboard-only and screen-reader approval
flows. Failure or missing evidence in any matrix row or candidate-wide check
blocks the WDK preview for v0.9; there is no platform waiver or developer-mode
fallback.

## 15. Release gates

v0.9 can ship the preview only when all of these are true:

- Milestone 0 and every row of the exact four-target Section 14.3 matrix pass
  against one release candidate.
- The production artifact contains only the approved testnet network manifest;
  no mainnet RPC, contract or runtime override is reachable.
- `scripts/check-wdk-network.mjs` passes for the candidate through both recorded
  providers, and runtime chain ID, common block hash, plus token metadata,
  EIP-1967 implementation and both code hashes at the common block and each
  provider's own confirmed head match the manifest before preparing a payment.
- WDK dependencies form one coherent, exact-pinned graph; package/lock hashes,
  `scripts/check-wdk-cohort.mjs` output and the generated worklet checksum all
  match release evidence. The explicit beta.16 wallet-base override must still
  resolve one version; mixed lockfile versions are a release blocker.
- The production worklet contains no generic `callMethod` dispatcher, rejects
  unknown operations before argument decode and never logs sensitive arguments
  or return values.
- No plaintext mnemonic, seed, encryption key or signed raw transaction appears
  outside its explicitly allowed trusted-memory/encrypted-journal boundary.
- Lock confirms worklet termination and root-seed-state destruction on every
  target; `dispose()` alone is not accepted as evidence.
- Every vault uses the frozen `pb-wdk-vault-v1` profile and its authenticated
  version, downgrade, migration and pre-allocation resource rules.
- Exclusive wallet-tab listener allocation failure removes the wallet surface;
  neither the existing per-drive listener nor a shared origin is a fallback.
- Manifest declaration, fingerprint, token, origin, browser session, tab, drive,
  live top-level document/navigation epoch and active connection are all
  enforced backend-side.
- Every payment requires one exact browser-owned confirmation.
- Approval replay, transaction mutation and ambiguous retry tests pass.
- Decoding every signed transaction proves an exact match to its approved
  canonical intent before broadcast.
- A transaction is never described as final without verified successful receipt
  and configured finality evidence.
- The full pre-existing desktop suite plus every wallet test is green.
- High-severity dependency audit remains green or has a documented release
  block; beta status is not waived silently.
- Manual browser-chrome UX/accessibility and all four packaged target rows pass.
- The feature is off by default and visibly testnet-only everywhere it appears.
- Release notes make no `production wallet`, `mainnet-ready`, `private payments`
  or generic dapp-wallet claim.

## 16. Reuse boundaries

Pear POS and Agent Harbour contain useful patterns but are not dependencies of
the browser wallet.

Reuse conceptually:

- Pear POS's WDK address golden tests and processor lifecycle vocabulary.
- Agent Harbour's exact-action approval hashes, atomic one-shot consumption,
  pre-effect journal and dispose-on-lock discipline.
- PearBrowser's existing manifest-gated AI shim, CSP hash injection,
  origin-bound page tokens, parked consent promises and Permission Center UX.

Do not copy:

- Pear POS's adjacent-file encryption key, in-memory derivation index/invoice
  state, zero-on-RPC-failure baseline or balance-only settlement detection.
- Agent Harbour's generic transfer/token inputs or its current x402 flow, where
  the final payment amount is learned after the wrapped request executes.
- Hyper-Wallet's seed-sharing pairing protocol, localhost bearer API or generic
  daemon boundary.

Longer term, PearBrowser, Pear POS and Agent Harbour should converge on a shared
versioned wallet-host protocol and tested dependency cohort. v0.9 first proves
the browser security contract without silently merging their seeds, custody or
application runtimes.

## 17. Primary references

- [WDK Pear Worklet bridge](https://docs.wdk.tether.io/tools/pear-wrk-wdk/)
- [WDK Pear Worklet API](https://docs.wdk.tether.io/tools/pear-wrk-wdk/api-reference/)
- [WDK EVM wallet](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-evm/)
- [WDK wallet modules](https://docs.wdk.tether.io/sdk/wallet-modules/)
- [WDK transaction policies](https://docs.wdk.tether.io/sdk/core-module/guides/transaction-policies/)
- [WDK secret manager](https://docs.wdk.tether.io/tools/secret-manager/)
- [WDK seed/key lifecycle concepts](https://docs.wdk.tether.io/resources/concepts/)
- [Stable Testnet information](https://docs.stable.xyz/en/developers/testnet/testnet-information)
- [Stable Testnet funding](https://docs.stable.xyz/en/developers/testnet/funding-guide)
- [Stable Testnet USDT0 addresses](https://docs.stable.xyz/en/developers/testnet/ecosystem)
- [Stable USDT0 gas and transfer semantics](https://docs.stable.xyz/en/architecture/usdt-specific-features/usdt-as-gas-token)
- [`ARCHITECTURE_AND_CAPABILITIES.md`](./ARCHITECTURE_AND_CAPABILITIES.md)
- [`ORIGIN_ISOLATION_MIGRATION_2026-07-02.md`](./ORIGIN_ISOLATION_MIGRATION_2026-07-02.md)
- [`research/payments.md`](./research/payments.md)
