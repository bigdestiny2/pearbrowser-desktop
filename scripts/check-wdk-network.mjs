import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { keccak_256 as keccak256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import canonicalJson from '../backend/wallet/canonical-json.cjs'

const require = createRequire(import.meta.url)
const manifest = require('../backend/wallet/networks/stable-testnet.cjs')
const { canonicalizeReleaseData } = canonicalJson

export function networkManifestSha256 (value = manifest) {
  return '0x' + bytesToHex(sha256(new TextEncoder().encode(canonicalizeReleaseData(value))))
}

function codeHash (code) {
  assert.match(code, /^0x[0-9a-f]*$/i, 'runtime bytecode must be hex')
  return '0x' + bytesToHex(keccak256(Uint8Array.from(Buffer.from(code.slice(2), 'hex'))))
}

export function decodeAddressSlot (value) {
  assert.match(value, /^0x0{24}[0-9a-f]{40}$/i, 'implementation slot must be a canonical padded address')
  return '0x' + value.slice(-40).toLowerCase()
}

function decodeUint (value) {
  assert.match(value, /^0x[0-9a-f]{64}$/i, 'ABI uint result must be 32 bytes')
  const decoded = BigInt(value)
  assert.ok(decoded <= BigInt(Number.MAX_SAFE_INTEGER), 'ABI uint result exceeds the safe integer range')
  return Number(decoded)
}

export function decodeString (value) {
  assert.match(value, /^0x(?:[0-9a-f]{2})+$/i, 'ABI string result must be byte-aligned hex')
  const bytes = Buffer.from(value.slice(2), 'hex')
  assert.ok(bytes.length >= 64 && bytes.length % 32 === 0, 'ABI string result has an invalid word layout')
  const offset = BigInt('0x' + bytes.subarray(0, 32).toString('hex'))
  assert.equal(offset, 32n, 'ABI string offset must select the single canonical value')
  const lengthWord = BigInt('0x' + bytes.subarray(32, 64).toString('hex'))
  assert.ok(lengthWord <= 256n, 'ABI string value exceeds the release bound')
  const length = Number(lengthWord)
  const paddedLength = Math.ceil(length / 32) * 32
  assert.equal(bytes.length, 64 + paddedLength, 'ABI string result has trailing or missing words')
  const padding = bytes.subarray(64 + length)
  assert.ok(padding.every(byte => byte === 0), 'ABI string padding must be zero')
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(64, 64 + length))
}

async function rpc (provider, method, params) {
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(12_000)
  })
  assert.equal(response.ok, true, `${provider.id} ${method} returned HTTP ${response.status}`)
  const body = await response.json()
  assert.equal(body.error, undefined, `${provider.id} ${method}: ${JSON.stringify(body.error)}`)
  return body.result
}

export function selectVerificationHeight (heads, finality) {
  assert.ok(Array.isArray(heads) && heads.length > 0, 'provider heads are required')
  assert.ok(Number.isSafeInteger(finality.minimumConfirmations) && finality.minimumConfirmations >= 1)
  assert.ok(Number.isSafeInteger(finality.maximumProviderHeadLag) && finality.maximumProviderHeadLag >= 0)
  const heights = heads.map(head => {
    assert.match(head.blockNumber, /^0x(?:0|[1-9a-f][0-9a-f]*)$/i, 'provider head must be a canonical hex quantity')
    return BigInt(head.blockNumber)
  })
  const minimumHead = heights.reduce((minimum, height) => height < minimum ? height : minimum)
  const maximumHead = heights.reduce((maximum, height) => height > maximum ? height : maximum)
  assert.ok(
    maximumHead - minimumHead <= BigInt(finality.maximumProviderHeadLag),
    'provider heads exceed the compiled maximum lag'
  )
  const confirmationOffset = BigInt(finality.minimumConfirmations - 1)
  assert.ok(minimumHead >= confirmationOffset, 'provider head is below the confirmation depth')
  return minimumHead - confirmationOffset
}

export function selectProviderVerificationHeights (heads, finality) {
  // Validate the cohort (including the maximum skew) before deriving any
  // provider-local height. The common height proves both providers agree on a
  // canonical recent block; the provider-local heights additionally ensure a
  // contract upgrade observed by only the leading provider cannot hide behind
  // that common historical snapshot.
  selectVerificationHeight(heads, finality)
  const confirmationOffset = BigInt(finality.minimumConfirmations - 1)
  return heads.map(head => ({
    providerId: head.provider?.id || head.providerId,
    height: BigInt(head.blockNumber) - confirmationOffset
  }))
}

export function assertCompiledContractState (observation, paymentAsset = manifest.paymentAsset) {
  assert.equal(observation.proxyRuntimeCodeBytes, paymentAsset.proxyRuntimeCodeBytes)
  assert.equal(observation.proxyRuntimeCodeKeccak256, paymentAsset.proxyRuntimeCodeKeccak256)
  assert.equal(observation.implementationRuntimeCodeBytes, paymentAsset.implementationRuntimeCodeBytes)
  assert.equal(observation.implementationRuntimeCodeKeccak256, paymentAsset.implementationRuntimeCodeKeccak256)
  assert.equal(observation.implementationAddress, paymentAsset.implementationAddress.toLowerCase())
  assert.equal(observation.decimals, paymentAsset.decimals)
  assert.equal(observation.symbol, paymentAsset.symbol)
}

export function assertFreshBlocks (observations, finality, nowSeconds = Math.floor(Date.now() / 1000)) {
  assert.ok(Number.isSafeInteger(finality.maximumBlockAgeSeconds) && finality.maximumBlockAgeSeconds > 0)
  assert.ok(
    Number.isSafeInteger(finality.maximumFutureClockSkewSeconds) &&
    finality.maximumFutureClockSkewSeconds >= 0
  )
  const now = BigInt(nowSeconds)
  for (const observation of observations) {
    assert.match(observation.blockTimestamp, /^0x[0-9a-f]+$/i, 'verification block timestamp must be hex')
    const timestamp = BigInt(observation.blockTimestamp)
    assert.ok(
      timestamp <= now + BigInt(finality.maximumFutureClockSkewSeconds),
      `${observation.providerId} verification block is too far in the future`
    )
    assert.ok(
      now - timestamp <= BigInt(finality.maximumBlockAgeSeconds),
      `${observation.providerId} verification block is older than the compiled maximum age`
    )
  }
}

async function main () {
  assert.equal(manifest.releasePosture, 'testnet-preview')
  assert.equal(manifest.providers.length, manifest.finality.providerQuorum)
  assert.equal(new Set(manifest.providers.map(provider => provider.operator)).size, manifest.providers.length)

  const heads = await Promise.all(manifest.providers.map(async provider => ({
    provider,
    chainId: await rpc(provider, 'eth_chainId', []),
    blockNumber: await rpc(provider, 'eth_blockNumber', [])
  })))

  for (const head of heads) assert.equal(head.chainId.toLowerCase(), manifest.chain.idHex)
  const verificationHeight = selectVerificationHeight(heads, manifest.finality)
  const providerVerificationHeights = selectProviderVerificationHeights(heads, manifest.finality)
  assert.ok(verificationHeight <= BigInt(Number.MAX_SAFE_INTEGER), 'verification height exceeds safe report range')
  const commonHeight = Number(verificationHeight)
  const commonBlockTag = '0x' + verificationHeight.toString(16)

  async function observeContractState (provider, blockTag) {
    const [block, proxyCode, implementationCode, implementationSlot, decimals, symbol] = await Promise.all([
      rpc(provider, 'eth_getBlockByNumber', [blockTag, false]),
      rpc(provider, 'eth_getCode', [manifest.paymentAsset.proxyAddress, blockTag]),
      rpc(provider, 'eth_getCode', [manifest.paymentAsset.implementationAddress, blockTag]),
      rpc(provider, 'eth_getStorageAt', [
        manifest.paymentAsset.proxyAddress,
        manifest.paymentAsset.eip1967ImplementationSlot,
        blockTag
      ]),
      rpc(provider, 'eth_call', [{ to: manifest.paymentAsset.proxyAddress, data: '0x313ce567' }, blockTag]),
      rpc(provider, 'eth_call', [{ to: manifest.paymentAsset.proxyAddress, data: '0x95d89b41' }, blockTag])
    ])

    const observation = {
      providerId: provider.id,
      operator: provider.operator,
      blockNumber: block?.number,
      blockHash: block?.hash,
      blockTimestamp: block?.timestamp,
      proxyRuntimeCodeBytes: (proxyCode.length - 2) / 2,
      proxyRuntimeCodeKeccak256: codeHash(proxyCode),
      implementationRuntimeCodeBytes: (implementationCode.length - 2) / 2,
      implementationRuntimeCodeKeccak256: codeHash(implementationCode),
      implementationAddress: decodeAddressSlot(implementationSlot),
      decimals: decodeUint(decimals),
      symbol: decodeString(symbol)
    }

    assert.equal(observation.blockNumber, blockTag)
    assert.match(observation.blockHash || '', /^0x[0-9a-f]{64}$/i)
    assertCompiledContractState(observation)
    return observation
  }

  const commonObservations = await Promise.all(manifest.providers.map(
    provider => observeContractState(provider, commonBlockTag)
  ))

  const currentObservations = await Promise.all(manifest.providers.map((provider, index) => {
    const providerHeight = providerVerificationHeights[index]
    assert.equal(providerHeight.providerId, provider.id)
    return observeContractState(provider, '0x' + providerHeight.height.toString(16))
  }))

  assert.equal(
    new Set(commonObservations.map(observation => observation.blockHash.toLowerCase())).size,
    1,
    'independent providers must agree on the common finalized block hash'
  )
  assertFreshBlocks([...commonObservations, ...currentObservations], manifest.finality)

  console.log(JSON.stringify({
    ok: true,
    verifiedAt: new Date().toISOString(),
    networkId: manifest.networkId,
    networkManifestSha256: networkManifestSha256(),
    commonHeight,
    commonObservations,
    currentObservations
  }, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
