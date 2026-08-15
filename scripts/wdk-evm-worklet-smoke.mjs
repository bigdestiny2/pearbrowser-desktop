// Golden-vector smoke for the production WDK worker: inside a real Bare
// worklet, derive the golden account from the golden mnemonic and reproduce
// the exact frozen EIP-1559 signature bytes — fully offline (no RPC calls).
// Exercises the engine's default Bare spawner, the production worker, and the
// scoped signAppPayload attestation op end to end.

import crypto from 'bare-crypto'
import b4a from 'b4a'
import { mnemonicToSeedSync } from 'bip39' with { imports: 'bare-node-runtime/imports' }
import engine from '../backend/wallet/wdk-engine.cjs'
import STABLE_TESTNET from '../backend/wallet/networks/stable-testnet.cjs'
import secretEnvelope from '../backend/wallet/wdk-secret-envelope.cjs'

const { WdkEngineAdapter } = engine

const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const EXPECTED_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const EXPECTED_SIGNED_TRANSACTION = '0x02f8ad8208998080843b9aca0082fde89478cf24370174180738c5b8e352b6d14c83a6c9a980b844a9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0c080a0a5102dbe9392367560b6b873e1908cc7370615a6d035f3a82488fef4643c7106a04ccd5d7c8ded46abf7d66cce51ccb11879a6d8e9b9c10744f741981d6ef26d9a'
const EXPECTED_TRANSACTION_HASH = '0x31a5f71196b5efc0640e06375a3db03b62daa0d2b4e8a53f5e7d764d8ecb0777'

// The fixed pre-approved unsigned envelope from scripts/wdk-bare-smoke.mjs,
// expressed as a prepared intent exactly as prepareTransfer would emit it.
const GOLDEN_INTENT = Object.freeze({
  preparedIntentId: 'wpi_0123456789abcdef',
  from: EXPECTED_ADDRESS,
  recipient: '0x1111111111111111111111111111111111111111',
  amountAtomic: '1250000',
  assetId: STABLE_TESTNET.paymentAsset.id,
  feeAssetId: STABLE_TESTNET.nativeFeeAsset.id,
  transactionType: STABLE_TESTNET.transferPolicy.transactionType,
  chainId: STABLE_TESTNET.chain.idDecimal,
  transactionTarget: STABLE_TESTNET.transferPolicy.transactionTarget,
  transactionValueAtomic: STABLE_TESTNET.transferPolicy.transactionValueAtomic,
  calldata: '0xa9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0',
  calldataHash: '0x3ed826c3bd3348d322fd992acd6d6d3a7adf60d17ea60d8b230921985b99ad12',
  nonce: '0',
  gasLimit: '65000',
  maxFeePerGasAtomic: '1000000000',
  maxPriorityFeePerGasAtomic: STABLE_TESTNET.transferPolicy.maxPriorityFeePerGasAtomic,
  accessList: Object.freeze([]),
  estimatedFeeAtomic: '65000000000000',
  maxFeeAtomic: '65000000000000',
  unsignedTransactionHash: '0x2911bf94d64883881b9f12115b2302f41eda09ed91a1b8079da6d72f6f70501d',
  expiresAt: 1800000000000
})

const APP_PAYLOAD_INPUT = Object.freeze({
  driveKey: 'ab'.repeat(32),
  manifestSha256: 'cd'.repeat(32),
  payloadHash: 'ef'.repeat(32)
})

function invariant (condition, message) {
  if (!condition) throw new Error(message)
}

const seed = mnemonicToSeedSync(TEST_MNEMONIC)
invariant(seed.byteLength === 64, 'golden mnemonic did not derive a 64-byte seed')
const encryptionKey = crypto.randomBytes(32)
const encryptedSeed = secretEnvelope.sealSecret('seed', seed, encryptionKey)
seed.fill(0)

// Default spawner: the engine itself spawns backend/wallet/wdk-worker.mjs in a
// dedicated Bare worker thread. The lifecycle timeouts are load-tolerant so the
// smoke stays stable while the full test suite runs in parallel.
const adapter = new WdkEngineAdapter({ initializeTimeoutMs: 30000, terminateTimeoutMs: 15000 })
await adapter.initialize({ encryptedSeed, encryptionKey, compiledConfig: STABLE_TESTNET })
invariant(encryptedSeed.every(byte => byte === 0), 'host encrypted seed was not zeroed')
invariant(encryptionKey.every(byte => byte === 0), 'host encryption key was not zeroed')

const { address } = await adapter.getAddress()
invariant(address === EXPECTED_ADDRESS, `worker derived ${address}, expected ${EXPECTED_ADDRESS}`)

const signed = await adapter.signPrepared(GOLDEN_INTENT)
const signedHex = '0x' + b4a.toString(signed.signedTransaction, 'hex')
invariant(signedHex === EXPECTED_SIGNED_TRANSACTION, 'worker signed transaction bytes mismatch')
invariant(signed.transactionHash === EXPECTED_TRANSACTION_HASH, 'worker transaction hash mismatch')

// Engine-side validation already recovered and compared the signer; assert the
// surfaced shape here.
const attestation = await adapter.signAppPayload(APP_PAYLOAD_INPUT)
invariant(attestation.address === EXPECTED_ADDRESS, 'app payload attestation address mismatch')
invariant(attestation.signature.byteLength === 65, 'app payload signature must be 65 bytes')
invariant(attestation.digest.byteLength === 32, 'app payload digest must be 32 bytes')

const lockResult = await adapter.lock()
invariant(lockResult.disposeOutcome === 'ok', 'worker disposal was not confirmed')
invariant(adapter.state === 'locked', 'adapter did not return to locked state')

console.log(JSON.stringify({
  ok: true,
  runtime: 'Bare',
  address,
  signedTransactionHash: signed.transactionHash,
  appPayloadAddress: attestation.address,
  disposeOutcome: lockResult.disposeOutcome,
  adapterState: adapter.state
}))
