import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkManifestSha256 } from '../scripts/check-wdk-network.mjs'

const require = createRequire(import.meta.url)
const manifest = require('../backend/wallet/networks/stable-testnet.cjs')
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('Stable Testnet release manifest freezes the dual-role USD₮0 boundary', () => {
  assert.deepEqual(manifest, {
    manifestVersion: 1,
    evidenceDate: '2026-08-14',
    releasePosture: 'testnet-preview',
    networkId: 'stable-testnet',
    chain: {
      name: 'Stable Testnet',
      caip2: 'eip155:2201',
      idDecimal: 2201,
      idHex: '0x899',
      explorerUrl: 'https://testnet.stablescan.xyz'
    },
    providers: [
      {
        id: 'stable-official',
        operator: 'Stable',
        role: 'broadcast-and-read',
        url: 'https://rpc.testnet.stable.xyz'
      },
      {
        id: 'thirdweb-public',
        operator: 'thirdweb',
        role: 'independent-read',
        url: 'https://2201.rpc.thirdweb.com/'
      }
    ],
    nativeFeeAsset: {
      id: 'stable-testnet-native-usdt0',
      symbol: 'USDT0',
      decimals: 18,
      maxFeeAtomic: '100000000000000000'
    },
    paymentAsset: {
      id: 'stable-testnet-usdt0',
      symbol: 'USD₮0',
      transferMode: 'erc20',
      decimals: 6,
      maxPaymentAtomic: '10000000',
      proxyAddress: '0x78Cf24370174180738C5B8E352B6D14c83a6c9A9',
      implementationAddress: '0x3f9E27457ac494fC729beB50e6af04Ec34e3828E',
      eip1967ImplementationSlot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
      proxyRuntimeCodeBytes: 2667,
      proxyRuntimeCodeKeccak256: '0x63ed5c26f94e91b94fc139f7fdcbb971b27954b8310ec79a3c17b46565fd28d0',
      implementationRuntimeCodeBytes: 17861,
      implementationRuntimeCodeKeccak256: '0x61466328a9d17e782f4a37d32db189f981ce32e45de6a4668c3f7bb1cd8d49ae'
    },
    transferPolicy: {
      accountIndex: 0,
      transactionType: 'eip1559',
      transactionTypeValue: 2,
      transactionTarget: '0x78Cf24370174180738C5B8E352B6D14c83a6c9A9',
      transactionValueAtomic: '0',
      calldataSelector: '0xa9059cbb',
      maxPriorityFeePerGasAtomic: '0'
    },
    finality: {
      model: 'single-slot',
      minimumConfirmations: 1,
      providerQuorum: 2,
      maximumProviderHeadLag: 5,
      maximumBlockAgeSeconds: 120,
      maximumFutureClockSkewSeconds: 30,
      requireReceiptSuccess: true,
      requireTransferEvent: true,
      requireCommonBlockHash: true
    }
  })
  assert.equal(Object.isFrozen(manifest), true)
  assert.equal(Object.isFrozen(manifest.paymentAsset), true)
  assert.equal(Object.isFrozen(manifest.transferPolicy), true)
  const expectedManifestHash = '0xa28e3c1881a8b2f5ca7a87bd3aeeb50eab6106b50ca793c14ca020d7c2895a8a'
  assert.equal(networkManifestSha256(manifest), expectedManifestHash)
  assert.notEqual(networkManifestSha256({
    ...manifest,
    transferPolicy: { ...manifest.transferPolicy, transactionValueAtomic: '1' }
  }), expectedManifestHash)
  assert.doesNotMatch(JSON.stringify(manifest), /rpc\.stable\.xyz|eip155:988/)
})

test('WDK dependency cohort checker accepts the exact registry-pinned graph', () => {
  const result = spawnSync(process.execPath, [join(root, 'scripts/check-wdk-cohort.mjs')], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  const report = JSON.parse(result.stdout)
  assert.equal(report.ok, true)
  assert.deepEqual(report.hostRuntime, { 'pear-runtime': '1.3.1' })
  assert.deepEqual(report.hostDevelopment, { bare: '1.30.3' })
  assert.deepEqual([...new Set(report.walletBaseEntries.map(entry => entry.version))], ['1.0.0-beta.16'])
  assert.ok(report.familyEntries.length >= 6)
})

test('WDK dependency cohort checker rejects nested skew and registry substitution', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'pear-wdk-cohort-'))
  const checker = join(root, 'scripts/check-wdk-cohort.mjs')
  const packagePath = join(root, 'package.json')
  const originalLock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  try {
    const skewedLock = structuredClone(originalLock)
    skewedLock.packages['node_modules/fixture/node_modules/@tetherto/wdk-wallet'] = {
      ...skewedLock.packages['node_modules/@tetherto/wdk-wallet'],
      version: '1.0.0-beta.13',
      resolved: 'https://registry.npmjs.org/@tetherto/wdk-wallet/-/wdk-wallet-1.0.0-beta.13.tgz'
    }
    const skewedPath = join(fixtureDir, 'skewed-lock.json')
    writeFileSync(skewedPath, JSON.stringify(skewedLock))
    const skewed = spawnSync(process.execPath, [checker, '--package', packagePath, '--lockfile', skewedPath], {
      cwd: root,
      encoding: 'utf8'
    })
    assert.notEqual(skewed.status, 0)
    assert.match(skewed.stderr, /outside the approved WDK cohort/)

    const substitutedLock = structuredClone(originalLock)
    substitutedLock.packages['node_modules/@tetherto/wdk'].resolved =
      'https://packages.example.invalid/@tetherto/wdk/-/wdk-1.0.0-beta.16.tgz'
    const substitutedPath = join(fixtureDir, 'substituted-lock.json')
    writeFileSync(substitutedPath, JSON.stringify(substitutedLock))
    const substituted = spawnSync(process.execPath, [checker, '--package', packagePath, '--lockfile', substitutedPath], {
      cwd: root,
      encoding: 'utf8'
    })
    assert.notEqual(substituted.status, 0)
    assert.match(substituted.stderr, /approved npm registry/)

    const pathSubstitutedLock = structuredClone(originalLock)
    pathSubstitutedLock.packages['node_modules/@tetherto/wdk'].resolved =
      'https://registry.npmjs.org/@attacker/wdk/-/wdk-1.0.0-beta.16.tgz'
    const pathSubstitutedPath = join(fixtureDir, 'path-substituted-lock.json')
    writeFileSync(pathSubstitutedPath, JSON.stringify(pathSubstitutedLock))
    const pathSubstituted = spawnSync(
      process.execPath,
      [checker, '--package', packagePath, '--lockfile', pathSubstitutedPath],
      { cwd: root, encoding: 'utf8' }
    )
    assert.notEqual(pathSubstituted.status, 0)
    assert.match(pathSubstituted.stderr, /exact package and version/)

    const malformedIntegrityLock = structuredClone(originalLock)
    malformedIntegrityLock.packages['node_modules/@tetherto/wdk'].integrity = 'truthy-but-not-sri'
    const malformedIntegrityPath = join(fixtureDir, 'malformed-integrity-lock.json')
    writeFileSync(malformedIntegrityPath, JSON.stringify(malformedIntegrityLock))
    const malformedIntegrity = spawnSync(
      process.execPath,
      [checker, '--package', packagePath, '--lockfile', malformedIntegrityPath],
      { cwd: root, encoding: 'utf8' }
    )
    assert.notEqual(malformedIntegrity.status, 0)
    assert.match(malformedIntegrity.stderr, /canonical sha512 SRI/)

    const driftedPackage = JSON.parse(readFileSync(packagePath, 'utf8'))
    const driftedLock = structuredClone(originalLock)
    driftedPackage.dependencies['pear-runtime'] = '1.3.2'
    driftedLock.packages[''].dependencies['pear-runtime'] = '1.3.2'
    driftedLock.packages['node_modules/pear-runtime'].version = '1.3.2'
    driftedLock.packages['node_modules/pear-runtime'].resolved =
      'https://registry.npmjs.org/pear-runtime/-/pear-runtime-1.3.2.tgz'
    const driftedPackagePath = join(fixtureDir, 'drifted-package.json')
    const driftedLockPath = join(fixtureDir, 'drifted-lock.json')
    writeFileSync(driftedPackagePath, JSON.stringify(driftedPackage))
    writeFileSync(driftedLockPath, JSON.stringify(driftedLock))
    const driftedHost = spawnSync(
      process.execPath,
      [checker, '--package', driftedPackagePath, '--lockfile', driftedLockPath],
      { cwd: root, encoding: 'utf8' }
    )
    assert.notEqual(driftedHost.status, 0)
    assert.match(driftedHost.stderr, /pear-runtime must be exact-pinned/)
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true })
  }
})

for (const [runtime, executable, args] of [
  ['Node', process.execPath, [join(root, 'scripts/wdk-bare-smoke.mjs')]],
  ['Bare', join(root, 'node_modules/bare/bin/bare'), [join(root, 'scripts/wdk-bare-smoke.mjs')]]
]) {
  test(`WDK golden derivation and vault round trip pass under ${runtime}`, () => {
    const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout.trim().split('\n').at(-1))
    assert.equal(report.ok, true)
    assert.equal(report.address, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    assert.equal(report.signedTransactionHash, '0x31a5f71196b5efc0640e06375a3db03b62daa0d2b4e8a53f5e7d764d8ecb0777')
    assert.equal(report.vaultProfile, 'pb-wdk-vault-v1')
    assert.equal(report.secretEnvelopeProfile, 'pb-wdk-secrets-v1')
  })
}
