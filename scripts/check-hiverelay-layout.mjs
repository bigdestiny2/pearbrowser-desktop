#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// PearBrowser desktop defaults HiveRelay packages to npm latest for normal
// source checkouts. A sibling ../../00-core/hiverelay checkout is only for
// explicit file: based co-development.
const expected = [
  ['p2p-hiverelay', '0.20.2', '../../00-core/hiverelay/packages/core/package.json'],
  ['p2p-hiverelay-client', '0.20.2', '../../00-core/hiverelay/packages/client/package.json'],
  ['p2p-hiverelay-verifier', '0.20.2', '../../00-core/hiverelay/packages/verifier/package.json']
]

const rootPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
const specs = expected.map(([name]) => {
  const spec = rootPackage.dependencies?.[name]
  return { name, spec, isFile: typeof spec === 'string' && spec.startsWith('file:') }
})

function usesNpmLatestDefaults () {
  return specs.every(({ spec }) => spec === 'latest')
}

const fileSpecCount = specs.filter(({ isFile }) => isFile).length
const dependencyDrift = []
for (const { name, spec, isFile } of specs) {
  if (fileSpecCount > 0 && isFile) continue
  if (fileSpecCount === expected.length && isFile) continue
  if (spec === 'latest') continue
  dependencyDrift.push(`${name} expected latest, found ${spec || '(missing)'}`)
}

if (fileSpecCount > 0 && fileSpecCount !== expected.length) {
  dependencyDrift.push('HiveRelay packages must use either all npm registry specs or all file: workspace specs')
}

if (dependencyDrift.length) {
  console.error('PearBrowser desktop expects HiveRelay npm packages to default to npm latest.')
  console.error('')
  for (const msg of dependencyDrift) console.error(`  - ${msg}`)
  console.error('')
  console.error('Use latest for standalone installs. Use file: specs only when intentionally co-developing all three HiveRelay packages from ../../00-core/hiverelay.')
  process.exit(1)
}

const usesNpmRegistryDefaults = usesNpmLatestDefaults()

if (usesNpmRegistryDefaults) {
  // This guard is intentionally local and side-effect-free. CI can separately
  // verify npm latest resolves to HiveRelay 0.20.2 before app lockfile refresh.
  const lockPath = resolve(process.cwd(), 'package-lock.json')
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    const lockDrift = []
    for (const [name, version] of expected) {
      const entry = lock.packages?.[`node_modules/${name}`]
      if (!entry) {
        lockDrift.push(`${name} is missing from package-lock.json`)
        continue
      }
      if (entry.version !== version) {
        lockDrift.push(`${name} expected lockfile version ${version}, found ${entry.version || '(missing)'}`)
      }
      if (!String(entry.resolved || '').startsWith(`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`)) {
        lockDrift.push(`${name}@${entry.version || version} is not locked to the npm registry tarball`)
      }
    }

    if (lockDrift.length) {
      console.error('PearBrowser desktop release installs must lock HiveRelay to npm 0.20.2 packages.')
      console.error('')
      for (const msg of lockDrift) console.error(`  - ${msg}`)
      process.exit(1)
    }
  }

  process.exit(0)
}

const missing = []
const mismatched = []

for (const [name, version, rel] of expected) {
  const path = resolve(process.cwd(), rel)
  if (!existsSync(path)) {
    missing.push(rel)
    continue
  }

  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'))
    if (pkg.name !== name || pkg.version !== version) {
      mismatched.push(`${rel} expected ${name}@${version}, found ${pkg.name || '(missing name)'}@${pkg.version || '(missing version)'}`)
    }
  } catch (err) {
    mismatched.push(`${rel} could not be read: ${err.message}`)
  }
}

if (missing.length || mismatched.length) {
  const write = console.error
  write('PearBrowser desktop is using file: HiveRelay dependencies, so the local workspace must match the release line.')
  write('')
  write('Expected local workspace shape:')
  write('  package.json -> file: specs for all HiveRelay packages')
  write('  ../../00-core/hiverelay/ -> matching HiveRelay 0.20.2 package checkout')
  write('')
  if (missing.length) {
    write('Missing local packages:')
    for (const rel of missing) write(`  - ${rel}`)
  }
  if (mismatched.length) {
    write('Mismatched local packages:')
    for (const msg of mismatched) write(`  - ${msg}`)
  }
  process.exit(1)
}
