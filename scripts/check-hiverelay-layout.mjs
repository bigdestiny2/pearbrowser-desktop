#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// PearBrowser desktop installs HiveRelay from the npm registry. A standalone
// clone resolves these from npm; an optional sibling ../../00-core/hiverelay
// checkout is dev-only. With registry deps the guard only WARNS (never fails a
// standalone install) when the optional local packages are absent/mismatched.
const expected = [
  ['p2p-hiverelay', '0.20.2', '../../00-core/hiverelay/packages/core/package.json'],
  ['p2p-hiverelay-client', '0.20.2', '../../00-core/hiverelay/packages/client/package.json'],
  ['p2p-hiverelay-verifier', '0.20.2', '../../00-core/hiverelay/packages/verifier/package.json']
]

const rootPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
// Any non-`file:` spec (`^0.20.2`, `latest`, an exact version, …) means a
// standalone install pulls HiveRelay from the registry and the sibling is optional.
const usesNpmRegistryDefaults = expected.every(([name]) => {
  const spec = rootPackage.dependencies?.[name]
  return typeof spec === 'string' && spec.length > 0 && !spec.startsWith('file:')
})

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
  const write = usesNpmRegistryDefaults ? console.warn : console.error
  write('PearBrowser desktop installs HiveRelay packages from the npm registry.')
  write('')
  write('Expected source-install shape:')
  write('  package.json -> ^0.20.2 (npm registry)')
  write('  ../../00-core/hiverelay/ -> optional sibling checkout for HiveRelay co-development')
  write('')
  if (missing.length) {
    write('Missing optional local packages:')
    for (const rel of missing) write(`  - ${rel}`)
  }
  if (mismatched.length) {
    write('Mismatched optional local packages:')
    for (const msg of mismatched) write(`  - ${msg}`)
  }
  write('')
  write('Release gate: confirm the npm registry resolves HiveRelay to 0.20.2 (or newer 0.20.x) before shipping standalone builds.')
  if (usesNpmRegistryDefaults) process.exit(0)
  process.exit(1)
}
