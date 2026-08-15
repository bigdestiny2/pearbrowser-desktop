import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js'
import b4a from 'b4a'
import vault from '../backend/wallet/wallet-vault.cjs'
import manifest from '../backend/wallet/networks/stable-testnet.cjs'
import secretEnvelope from '../backend/wallet/wdk-secret-envelope.cjs'

const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const EXPECTED_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const TRANSFER_DATA = '0xa9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0'
const EXPECTED_SIGNED_TRANSACTION = '0x02f8ad8208998080843b9aca0082fde89478cf24370174180738c5b8e352b6d14c83a6c9a980b844a9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000001312d0c080a0a5102dbe9392367560b6b873e1908cc7370615a6d035f3a82488fef4643c7106a04ccd5d7c8ded46abf7d66cce51ccb11879a6d8e9b9c10744f741981d6ef26d9a'
const EXPECTED_TRANSACTION_HASH = '0x31a5f71196b5efc0640e06375a3db03b62daa0d2b4e8a53f5e7d764d8ecb0777'

let wdk
try {
  const primaryProvider = manifest.providers.find(provider => provider.role === 'broadcast-and-read')
  if (!primaryProvider) throw new Error('Stable Testnet primary provider is missing')
  if (!TRANSFER_DATA.startsWith(manifest.transferPolicy.calldataSelector)) {
    throw new Error('signed vector calldata does not use the compiled transfer selector')
  }
  wdk = new WDK(TEST_MNEMONIC).registerWallet(manifest.networkId, WalletManagerEvm, {
    provider: primaryProvider.url
  })
  const account = await wdk.getAccount(manifest.networkId, manifest.transferPolicy.accountIndex)
  if (account.address !== EXPECTED_ADDRESS) {
    throw new Error(`WDK derivation mismatch: expected ${EXPECTED_ADDRESS}, got ${account.address}`)
  }
  const signedTransaction = await account.signTransaction({
    type: manifest.transferPolicy.transactionTypeValue,
    chainId: manifest.chain.idDecimal,
    nonce: 0,
    to: manifest.transferPolicy.transactionTarget,
    value: BigInt(manifest.transferPolicy.transactionValueAtomic),
    data: TRANSFER_DATA,
    gasLimit: 65000n,
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: BigInt(manifest.transferPolicy.maxPriorityFeePerGasAtomic)
  })
  if (signedTransaction !== EXPECTED_SIGNED_TRANSACTION) throw new Error('WDK signed transaction vector mismatch')
  const transactionHash = '0x' + b4a.toString(keccak256(b4a.from(signedTransaction.slice(2), 'hex')), 'hex')
  if (transactionHash !== EXPECTED_TRANSACTION_HASH) throw new Error('WDK transaction hash vector mismatch')
  const wrappingKey = b4a.alloc(32, 0x5a)
  const serializedVault = vault.wrapKey(wrappingKey, 'correct horse battery staple')
  const openedKey = vault.unwrapKey(serializedVault, 'correct horse battery staple')
  if (!b4a.equals(openedKey, wrappingKey)) throw new Error('WDK wallet vault round-trip mismatch')
  const seedCanary = b4a.alloc(64, 0x6b)
  const entropyCanary = b4a.alloc(32, 0x7c)
  const sealedSeed = secretEnvelope.sealSecret('seed', seedCanary, wrappingKey, 'wdk-v1', {
    nonce: b4a.alloc(24, 0x8d)
  })
  const sealedEntropy = secretEnvelope.sealSecret('entropy', entropyCanary, wrappingKey, 'wdk-v1', {
    nonce: b4a.alloc(24, 0x9e)
  })
  const openedSeed = secretEnvelope.openSecret('seed', sealedSeed, wrappingKey)
  const openedEntropy = secretEnvelope.openSecret('entropy', sealedEntropy, wrappingKey)
  if (!b4a.equals(openedSeed, seedCanary) || !b4a.equals(openedEntropy, entropyCanary)) {
    throw new Error('WDK secret-envelope round-trip mismatch')
  }
  wrappingKey.fill(0)
  openedKey.fill(0)
  seedCanary.fill(0)
  entropyCanary.fill(0)
  sealedSeed.fill(0)
  sealedEntropy.fill(0)
  openedSeed.fill(0)
  openedEntropy.fill(0)
  console.log(JSON.stringify({
    ok: true,
    address: account.address,
    signedTransactionHash: EXPECTED_TRANSACTION_HASH,
    vaultProfile: vault.PROFILE.profileId,
    secretEnvelopeProfile: secretEnvelope.PROFILE.format
  }))
} finally {
  if (wdk) wdk.dispose()
}
