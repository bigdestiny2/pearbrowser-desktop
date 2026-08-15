// Env-gated end-to-end Stable-Testnet proof for the production WDK wallet
// stack (docs/WDK_WALLET_V0.9_SPEC.md, milestone M4). Never runs in unit
// tests: without WDK_E2E_MNEMONIC it prints a skip report and exits 0.
//
// Everything below runs on the REAL production modules, under Bare:
//   - WdkEngineAdapter with its default Bare spawners (wdk-bare-transport +
//     wdk-worker.mjs for the operational wallet, wdk-ceremony-worker.mjs for
//     the one-shot mnemonic ceremonies; seeds/mnemonics only ever live inside
//     worker threads)
//   - WalletService / WalletPolicy / WalletConnections / WalletJournal
//   - WalletDocuments (per-document tokens, spec §4.5) and the manifest
//     validator against examples/wallet-e2e/manifest.json
//   - WalletConsentBroker driven by a programmatic auto-approver that plays
//     the role of the chrome consent modal
//
// Genesis uses the real production path: WalletService.restoreWallet() runs
// the engine's restore ceremony (dedicated one-shot ceremony worklet) and
// persists the returned vault material; a backup ceremony round-trip runs at
// the end against the locked wallet.
//
// Env:
//   WDK_E2E_MNEMONIC            24-word BIP-39 mnemonic, funded on Stable
//                               Testnet (USD₮0 for the payment, native token
//                               for fees). Required; missing ⇒ skip, exit 0.
//   WDK_E2E_RECIPIENT           payment recipient (default: the wallet itself)
//   WDK_E2E_AMOUNT_ATOMIC       payment amount in USD₮0 atomic units
//                               (default 1000 = 0.001 USD₮0; hard-capped at
//                               1000000 = 1 USD₮0)
//   WDK_E2E_FINALITY_TIMEOUT_MS finality poll budget (default 180000 ≈ 3 min)
//   WDK_E2E_SKIP_PAYMENT=1      run every offline-capable leg and stop before
//                               the payment (used to verify the script on
//                               unfunded mnemonics / offline machines)

// Runs under Bare (npm run smoke:wdk:e2e); import the bare equivalents of
// the Node builtins — `node:*` specifiers are not resolvable at top level.
import fs from 'bare-fs'
import os from 'bare-os'
import path from 'bare-path'
import process from 'bare-process'
import { fileURLToPath } from 'bare-url'
import crypto from 'bare-crypto'
import b4a from 'b4a'
import Corestore from 'corestore'
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js'
import { Point, recoverPublicKey } from '@noble/secp256k1'
import { validateMnemonic } from 'bip39' with { imports: 'bare-node-runtime/imports' }
import engine from '../backend/wallet/wdk-engine.cjs'
import STABLE_TESTNET from '../backend/wallet/networks/stable-testnet.cjs'
import { WalletService } from '../backend/wallet/wallet-service.cjs'
import { WalletJournal } from '../backend/wallet/wallet-journal.cjs'
import { WalletDocuments, tabKeyForDrive } from '../backend/wallet/wallet-documents.cjs'
import { WalletConsentBroker } from '../backend/wallet/wallet-consent.cjs'
import { validateWalletManifest } from '../backend/wallet/wallet-manifest.cjs'
import C from '../backend/constants.js'

// wallet-service.cjs references the process global (tmp-file naming); plain
// Bare does not provide one (same shim as backend/ai/qvac-runtime.mjs).
if (!globalThis.process) globalThis.process = process

const { WdkEngineAdapter } = engine

const MANIFEST_PATH = fileURLToPath(new URL('../examples/wallet-e2e/manifest.json', import.meta.url))
const MAX_E2E_AMOUNT_ATOMIC = 1000000n // 1 USD₮0 (6 decimals) — hard cap
const DEFAULT_AMOUNT_ATOMIC = '1000' // 0.001 USD₮0
const DEFAULT_FINALITY_TIMEOUT_MS = 180000
const FINALITY_POLL_INTERVAL_MS = 5000

function invariant (condition, message) {
  if (!condition) throw new Error(message)
}

function zero (value) {
  try {
    if (b4a.isBuffer(value) || value instanceof Uint8Array) value.fill(0)
  } catch {}
}

const report = {
  ok: false,
  runtime: 'Bare',
  skipped: false,
  networkId: STABLE_TESTNET.networkId,
  legs: {}
}

function finish (code) {
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = code
}

// ---------------------------------------------------------------- env gate

const mnemonicEnv = typeof process.env.WDK_E2E_MNEMONIC === 'string'
  ? process.env.WDK_E2E_MNEMONIC.trim()
  : ''
// Best-effort scrub of the process environment copy; bare-process env is a
// proxy that may refuse delete, so fall back to overwriting.
try { delete process.env.WDK_E2E_MNEMONIC } catch { try { process.env.WDK_E2E_MNEMONIC = '' } catch {} }

if (mnemonicEnv.length === 0) {
  report.skipped = true
  report.ok = true
  report.reason = 'WDK_E2E_MNEMONIC is not set — live testnet proof skipped'
  finish(0)
} else {
  try {
    await main(mnemonicEnv)
    report.ok = true
    finish(0)
  } catch (error) {
    report.error = { code: error?.code || null, message: String(error?.message || error) }
    finish(1)
  }
}

async function main (mnemonicEnv) {
  const normalizedMnemonic = mnemonicEnv.normalize('NFKC')
  const mnemonic = b4a.from(normalizedMnemonic, 'utf8')
  try {
    const words = normalizedMnemonic.trim().split(/\s+/)
    invariant(words.length === 24, 'WDK_E2E_MNEMONIC must contain exactly 24 words')
    invariant(validateMnemonic(normalizedMnemonic), 'WDK_E2E_MNEMONIC is not a valid BIP-39 mnemonic')

    const recipientEnv = typeof process.env.WDK_E2E_RECIPIENT === 'string' ? process.env.WDK_E2E_RECIPIENT : ''
    invariant(recipientEnv === '' || /^0x[0-9a-fA-F]{40}$/.test(recipientEnv), 'WDK_E2E_RECIPIENT is invalid')

    const amountAtomic = process.env.WDK_E2E_AMOUNT_ATOMIC || DEFAULT_AMOUNT_ATOMIC
    invariant(/^(0|[1-9][0-9]*)$/.test(amountAtomic), 'WDK_E2E_AMOUNT_ATOMIC is invalid')
    invariant(BigInt(amountAtomic) > 0n && BigInt(amountAtomic) <= MAX_E2E_AMOUNT_ATOMIC,
      'WDK_E2E_AMOUNT_ATOMIC must be within (0, 1000000] — the e2e never moves more than 1 USD₮0')
    invariant(BigInt(amountAtomic) <= BigInt(STABLE_TESTNET.paymentAsset.maxPaymentAtomic),
      'WDK_E2E_AMOUNT_ATOMIC exceeds the compiled payment ceiling')

    const finalityTimeoutMs = Number(process.env.WDK_E2E_FINALITY_TIMEOUT_MS || DEFAULT_FINALITY_TIMEOUT_MS)
    invariant(Number.isSafeInteger(finalityTimeoutMs) && finalityTimeoutMs >= 10000, 'WDK_E2E_FINALITY_TIMEOUT_MS is invalid')
    const skipPayment = process.env.WDK_E2E_SKIP_PAYMENT === '1'

    const storage = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pearbrowser-wdk-e2e-'))
    const store = new Corestore(path.join(storage, 'corestore'))
    let service = null
    try {
      // --------------------------------------------------- production stack
      const wdkEngine = new WdkEngineAdapter({ initializeTimeoutMs: 30000, terminateTimeoutMs: 15000 })
      const journal = new WalletJournal({ store })
      await journal.ready()
      const documents = new WalletDocuments()
      service = new WalletService({
        storage,
        engine: wdkEngine,
        journal,
        verifyDocumentToken: args => documents.verify(args)
      })

      // --------------------------------------------- genesis (real ceremony)
      // Production restore: the engine spawns a one-shot ceremony worklet,
      // which validates the mnemonic, derives and seals the vault material
      // and hands it back as mutable buffers; WalletService persists it.
      const passphrase = 'e2e-' + b4a.toString(crypto.randomBytes(16), 'hex')
      const restored = await service.restoreWallet(passphrase, mnemonic)
      invariant(restored.restored === true && restored.state === 'locked', 'restore ceremony did not persist the vault')
      invariant(mnemonic.every(byte => byte === 0), 'restore did not consume the mnemonic buffer')
      report.legs.genesis = { restored: true, ceremony: 'restore' }
      console.error('[wdk-e2e] vault restored under', storage)

      // Programmatic auto-approver: plays the chrome consent modal. Every
      // parked prompt is approved on the next tick through the broker's real
      // resolve path (server-side expiry re-check included).
      const consentLog = []
      const broker = new WalletConsentBroker({
        walletService: service,
        events: {
          connect: C.EVT_WALLET_CONNECT_REQUEST,
          payment: C.EVT_WALLET_PAYMENT_REQUEST,
          txUpdate: C.EVT_WALLET_TX_UPDATE
        },
        emit: (evt, payload) => {
          consentLog.push({ evt, payload })
          if (
            (evt === C.EVT_WALLET_CONNECT_REQUEST || evt === C.EVT_WALLET_PAYMENT_REQUEST) &&
            payload && typeof payload.intentId === 'string'
          ) {
            setImmediate(() => { broker.resolve(payload.intentId, true).catch(() => {}) })
          }
        }
      })

      // ------------------------------------------------------------- unlock
      const status = await service.unlock(passphrase)
      invariant(status.state === 'unlocked' && typeof status.address === 'string', 'wallet did not unlock')
      const address = status.address
      report.legs.unlock = { state: status.state, address }
      console.error('[wdk-e2e] unlocked', address)

      // ------------------------------------------- page-side simulation
      const driveKey = b4a.toString(crypto.randomBytes(32), 'hex')
      const origin = 'http://127.0.0.1'
      const tabKey = tabKeyForDrive(driveKey)
      const { token } = documents.issue({ driveKeyHex: driveKey, origin, tabKey })
      const tuple = { browserSessionId: 'wdk-e2e-session', tabId: tabKey, driveKey, walletTabOrigin: origin }

      const manifest = JSON.parse(await fs.promises.readFile(MANIFEST_PATH, 'utf8'))
      const grants = validateWalletManifest(manifest)
      invariant(grants.connect && grants.pay && grants.signApp, 'fixture manifest does not declare all three wallet permissions')
      report.legs.manifest = { manifestSha256: grants.manifestSha256, connect: true, pay: true, signApp: true }

      // Connect through the consent broker, exactly like the HTTP bridge.
      const caps = service.capabilities()
      const connectPrompt = {
        type: 'connect',
        intentId: newIntentId(),
        intent: {
          driveKey,
          manifestSha256: grants.manifestSha256,
          chainId: caps.chainIds[0],
          assetId: caps.assetIds[0],
          appName: typeof manifest.name === 'string' ? manifest.name : undefined
        },
        expiresAt: Date.now() + service.promptTtlMs,
        token,
        manifest
      }
      const connection = await broker.request(connectPrompt, tuple)
      invariant(connection.connected === true, 'connect was not approved')
      report.legs.connect = { connected: true, manifestSha256: connection.manifestSha256 }
      console.error('[wdk-e2e] connected')

      // ----------------------------------- signAppPayload round-trip (M4)
      const payloadHash = 'ef'.repeat(32)
      const signPrompt = await service.signAppPayload(tuple, token, { payloadHash })
      const signed = await broker.request(signPrompt, tuple)
      invariant(signed.state === 'signed', 'sign-app prompt did not settle as signed')
      const recoveredAddress = recoverAppPayloadSigner(signed.digest, signed.signature)
      invariant(recoveredAddress === address.toLowerCase(),
        `recovered app-payload signer ${recoveredAddress} != wallet address ${address.toLowerCase()}`)
      report.legs.signAppPayload = {
        state: signed.state,
        address: signed.address,
        recoveredSignerMatches: true,
        digest: '0x' + b4a.toString(signed.digest, 'hex')
      }
      console.error('[wdk-e2e] signAppPayload round-trip ok')

      // -------------------------------------------------- payment leg (live)
      if (skipPayment) {
        report.legs.payment = { skipped: true, reason: 'WDK_E2E_SKIP_PAYMENT=1' }
      } else {
        const recipient = recipientEnv || address
        const paymentPrompt = await service.requestPayment(tuple, token, {
          chainId: STABLE_TESTNET.chain.caip2,
          assetId: STABLE_TESTNET.paymentAsset.id,
          recipient,
          amountAtomic,
          idempotencyKey: 'e2e:' + b4a.toString(crypto.randomBytes(16), 'hex'),
          reference: 'pearbrowser wdk e2e'
        })
        const settled = await broker.request(paymentPrompt, tuple)
        invariant(settled.state === 'submitted' && typeof settled.transactionHash === 'string',
          'payment did not settle as submitted')
        console.error('[wdk-e2e] payment submitted', settled.transactionHash)

        const finalTx = await pollFinality(service, tuple, token, settled.intentId, finalityTimeoutMs)
        report.legs.payment = {
          state: finalTx.state,
          transactionHash: settled.transactionHash,
          confirmations: finalTx.confirmations,
          blockNumber: finalTx.blockNumber,
          recipient,
          amountAtomic
        }

        const entries = await journal.getByIntentId(settled.intentId)
        const types = new Set(entries.map(entry => entry.type))
        for (const required of ['intent', 'prompt', 'approval', 'broadcast', 'outcome']) {
          invariant(types.has(required), `journal is missing the ${required} entry for the payment intent`)
        }
        const broadcast = entries.find(entry => entry.type === 'broadcast')
        invariant(broadcast.transactionHash === settled.transactionHash, 'journal broadcast hash mismatch')
        report.legs.journal = { intentId: settled.intentId, entryTypes: [...types], entries: entries.length }
        console.error('[wdk-e2e] payment final:', finalTx.state, 'confirmations', finalTx.confirmations)
      }

      // ------------------------------------------------------------- lock
      const locked = await service.lock()
      invariant(locked.locked === true, 'wallet did not lock')
      report.legs.lock = { locked: true, disposeOutcome: locked.disposeOutcome }

      // -------------------------------- backup ceremony against the lock
      // Real production backup path: unwraps the vault key, hands the
      // persisted entropy envelope to a fresh one-shot ceremony worklet and
      // re-derives the mnemonic — it must match the restored one exactly.
      const backup = await service.backupWallet(passphrase)
      const backupText = b4a.toString(backup.mnemonic, 'utf8')
      invariant(backupText === normalizedMnemonic, 'backup mnemonic does not match the restored mnemonic')
      await service.finishBackup({ ceremonyId: backup.ceremonyId, outcome: 'complete' })
      invariant(backup.mnemonic.every(byte => byte === 0), 'backup mnemonic was not zeroed')
      report.legs.backup = { words: backupText.split(' ').length, matchesRestored: true }
      console.error('[wdk-e2e] backup ceremony round-trip ok')

      report.consentEvents = consentLog.length
    } finally {
      if (service) await service.lock().catch(() => {})
      await store.close().catch(() => {})
      await fs.promises.rm(storage, { recursive: true, force: true }).catch(() => {})
    }
  } finally {
    zero(mnemonic)
  }
}

function newIntentId () {
  return 'wpi_' + b4a.toString(crypto.randomBytes(12), 'hex')
}

// Independent host-side recovery of the EIP-191 app-payload signer — the
// engine already verifies this internally; the e2e re-proves it from the
// returned bytes alone.
function recoverAppPayloadSigner (digest, signature) {
  invariant(digest.byteLength === 32 && signature.byteLength === 65, 'app-payload result has invalid lengths')
  const compact = signature.subarray(0, 64)
  const version = signature[64]
  const recovery = version >= 27 ? version - 27 : version
  invariant(recovery === 0 || recovery === 1, 'app-payload recovery id is invalid')
  const messageHash = keccak256(b4a.concat([
    b4a.from('\x19Ethereum Signed Message:\n32', 'utf8'),
    digest
  ]))
  const recovered = recoverPublicKey(b4a.concat([b4a.from([recovery]), compact]), messageHash, { prehash: false })
  const uncompressed = Point.fromBytes(recovered).toBytes(false)
  return '0x' + b4a.toString(keccak256(uncompressed.subarray(1)).subarray(12), 'hex')
}

async function pollFinality (service, tuple, token, intentId, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let last = null
  for (;;) {
    last = await service.transaction(tuple, token, intentId)
    if (['final', 'failed', 'replaced', 'reorged'].includes(last.state)) return last
    if (Date.now() > deadline) {
      const error = new Error(`transaction did not reach finality within ${timeoutMs}ms (last state: ${last.state})`)
      error.code = 'finality-timeout'
      throw error
    }
    await new Promise(resolve => setTimeout(resolve, FINALITY_POLL_INTERVAL_MS))
  }
}
