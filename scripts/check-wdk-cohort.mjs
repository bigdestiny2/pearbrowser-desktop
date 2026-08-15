import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function option (name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : resolve(process.argv[index + 1])
}

const packagePath = option('--package', join(root, 'package.json'))
const lockfilePath = option('--lockfile', join(root, 'package-lock.json'))
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
const lock = JSON.parse(readFileSync(lockfilePath, 'utf8'))

const expectedRuntime = {
  '@tetherto/pear-wrk-wdk': '1.0.0-beta.11',
  '@tetherto/wdk': '1.0.0-beta.16',
  '@tetherto/wdk-wallet-evm': '1.0.0-beta.16',
  'sodium-universal': '5.0.1'
}
const expectedDevelopment = {
  '@tetherto/wdk-worklet-bundler': '1.0.0-beta.9'
}
const expectedHostRuntime = {
  'pear-runtime': '1.3.1'
}
const expectedHostDevelopment = {
  bare: '1.30.3'
}
const expectedWdkFamily = {
  '@tetherto/pear-wrk-wdk': '1.0.0-beta.11',
  '@tetherto/wdk': '1.0.0-beta.16',
  '@tetherto/wdk-failover-provider': '1.0.0-beta.2',
  '@tetherto/wdk-wallet': '1.0.0-beta.16',
  '@tetherto/wdk-wallet-evm': '1.0.0-beta.16',
  '@tetherto/wdk-worklet-bundler': '1.0.0-beta.9'
}
const expectedWalletBase = '1.0.0-beta.16'

function packageNameFromLockPath (path) {
  return path.split('node_modules/').at(-1)
}

function assertRegistryEntry (name, entry, label) {
  assert.equal(typeof entry?.integrity, 'string', `${label} must have lockfile integrity`)
  assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/, `${label} must use one canonical sha512 SRI digest`)
  const encodedDigest = entry.integrity.slice('sha512-'.length)
  const digest = Buffer.from(encodedDigest, 'base64')
  assert.equal(digest.byteLength, 64, `${label} sha512 SRI digest must be 64 bytes`)
  assert.equal(digest.toString('base64'), encodedDigest, `${label} sha512 SRI digest must be canonical base64`)
  assert.equal(typeof entry?.resolved, 'string', `${label} must have a resolved registry URL`)
  const resolved = new URL(entry.resolved)
  assert.equal(resolved.origin, 'https://registry.npmjs.org', `${label} must resolve from the approved npm registry`)
  assert.equal(resolved.username, '', `${label} registry URL must not contain credentials`)
  assert.equal(resolved.password, '', `${label} registry URL must not contain credentials`)
  assert.equal(resolved.search, '', `${label} registry URL must not contain a query`)
  assert.equal(resolved.hash, '', `${label} registry URL must not contain a fragment`)
  const leaf = name.split('/').at(-1)
  const expectedPath = `/${name}/-/${leaf}-${entry.version}.tgz`
  assert.equal(resolved.pathname, expectedPath, `${label} resolved tarball must match its exact package and version`)
}

for (const [name, version] of Object.entries(expectedRuntime)) {
  assert.equal(pkg.dependencies?.[name], version, `${name} must be exact-pinned`)
  assert.equal(lock.packages?.['']?.dependencies?.[name], version, `${name} lockfile root must match package.json`)
  const entry = lock.packages?.[`node_modules/${name}`]
  assert.equal(entry?.version, version, `${name} resolved version must match the release cohort`)
  assertRegistryEntry(name, entry, name)
}

for (const [name, version] of Object.entries(expectedDevelopment)) {
  assert.equal(pkg.devDependencies?.[name], version, `${name} must be exact-pinned`)
  assert.equal(lock.packages?.['']?.devDependencies?.[name], version, `${name} lockfile root must match package.json`)
  const entry = lock.packages?.[`node_modules/${name}`]
  assert.equal(entry?.version, version, `${name} resolved version must match the release cohort`)
  assertRegistryEntry(name, entry, name)
}

for (const [name, version] of Object.entries(expectedHostRuntime)) {
  assert.equal(pkg.dependencies?.[name], version, `${name} must be exact-pinned`)
  assert.equal(lock.packages?.['']?.dependencies?.[name], version, `${name} lockfile root must match package.json`)
  const entry = lock.packages?.[`node_modules/${name}`]
  assert.equal(entry?.version, version, `${name} resolved version must match the host-runtime cohort`)
  assertRegistryEntry(name, entry, name)
}

for (const [name, version] of Object.entries(expectedHostDevelopment)) {
  assert.equal(pkg.devDependencies?.[name], version, `${name} must be exact-pinned`)
  assert.equal(lock.packages?.['']?.devDependencies?.[name], version, `${name} lockfile root must match package.json`)
  const entry = lock.packages?.[`node_modules/${name}`]
  assert.equal(entry?.version, version, `${name} resolved version must match the host-runtime cohort`)
  assertRegistryEntry(name, entry, name)
}

assert.equal(
  pkg.overrides?.['@tetherto/wdk-wallet'],
  expectedWalletBase,
  'the WDK wallet base override must prevent the EVM beta.13 dependency split'
)

const familyEntries = []
for (const [path, entry] of Object.entries(lock.packages || {})) {
  const name = packageNameFromLockPath(path)
  if (name !== '@tetherto/pear-wrk-wdk' && !name?.startsWith('@tetherto/wdk')) continue
  assert.ok(name in expectedWdkFamily, `unapproved WDK-family package in lockfile: ${name}`)
  assert.equal(entry.version, expectedWdkFamily[name], `${path} is outside the approved WDK cohort`)
  assertRegistryEntry(name, entry, path)
  familyEntries.push({ path, name, version: entry.version })
}

for (const [name, version] of Object.entries(expectedWdkFamily)) {
  const entries = familyEntries.filter(entry => entry.name === name)
  assert.ok(entries.length > 0, `approved WDK-family package is missing: ${name}`)
  assert.deepEqual([...new Set(entries.map(entry => entry.version))], [version], `${name} has multiple resolved versions`)
}

const walletBaseEntries = familyEntries.filter(entry => entry.name === '@tetherto/wdk-wallet')

console.log(JSON.stringify({
  ok: true,
  runtime: expectedRuntime,
  development: expectedDevelopment,
  hostRuntime: expectedHostRuntime,
  hostDevelopment: expectedHostDevelopment,
  familyEntries,
  walletBaseEntries
}, null, 2))
