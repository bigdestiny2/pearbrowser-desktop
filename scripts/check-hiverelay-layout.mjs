#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The HiveRelay release line this checkout is contracted to.
//
// This is the version the guard expects to see (a) pinned in package-lock.json
// for npm registry installs and (b) checked out under ../../00-core/hiverelay
// for file: co-development installs. It is a single named constant so that
// moving the release line is a one-line edit here — it must be changed
// together with the matching `ref: v<version>` HiveRelay checkout in
// .github/workflows/desktop-ci.yml.
//
// This is NOT the dependency *spec* in package.json. The spec is allowed to be
// the npm `latest` dist-tag, an explicit semver range, or a file: workspace
// spec — see isRegistrySpec below.
const EXPECTED_HIVERELAY_VERSION = '0.20.2'

// PearBrowser desktop defaults HiveRelay packages to npm latest for normal
// source checkouts. A sibling ../../00-core/hiverelay checkout is only for
// explicit file: based co-development.
const expected = [
  ['p2p-hiverelay', EXPECTED_HIVERELAY_VERSION, '../../00-core/hiverelay/packages/core/package.json'],
  ['p2p-hiverelay-client', EXPECTED_HIVERELAY_VERSION, '../../00-core/hiverelay/packages/client/package.json'],
  ['p2p-hiverelay-verifier', EXPECTED_HIVERELAY_VERSION, '../../00-core/hiverelay/packages/verifier/package.json']
]

// Semver range grammar, inlined on purpose.
//
// This script runs as npm's `preinstall` hook, so it must work with an empty or
// absent node_modules on a fresh clone. The `semver` package cannot be used: it
// is only a transitive dependency here (via @electron/get and @qvac/bare-sdk),
// and nothing is installed yet when this runs.
//
// Accepted grammar (a deliberately strict subset of node-semver ranges):
//   range      := set ( '||' set )*
//   set        := hyphen | comparator ( <space> comparator )*
//   hyphen     := partial ' - ' partial
//   comparator := op? partial
//   op         := '^' | '~' | '~>' | '>' | '>=' | '<' | '<=' | '=' | 'v'
//   partial    := major ( '.' minor ( '.' patch )? )? prerelease? build?
//   major      := 0 | [1-9][0-9]*   -- numeric only
//   minor,patch:= major | 'x' | 'X' | '*'
//
// Requiring a numeric major means the wildcard-only ranges ('*', 'x', '') are
// rejected: they express no release contract at all. Everything that is not a
// range is likewise rejected — other dist-tags ('next', 'beta'), npm aliases
// ('npm:pkg@1'), git/github shorthands, and http(s) tarball URLs.
const NUMERIC = '(?:0|[1-9]\\d{0,9})'
const WILDCARD = `(?:${NUMERIC}|[xX*])`
const PRERELEASE = '(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?'
const BUILD = '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?'
const PARTIAL = `${NUMERIC}(?:\\.${WILDCARD}(?:\\.${WILDCARD})?)?${PRERELEASE}${BUILD}`
const COMPARATOR = `(?:\\^|~>?|>=?|<=?|=|v)?\\s*${PARTIAL}`
const HYPHEN_RANGE = `${PARTIAL}\\s+-\\s+${PARTIAL}`
const COMPARATOR_SET = `(?:${HYPHEN_RANGE}|${COMPARATOR}(?:\\s+${COMPARATOR})*)`
const SEMVER_RANGE = new RegExp(`^${COMPARATOR_SET}(?:\\s*\\|\\|\\s*${COMPARATOR_SET})*$`)

function isSemverRange (spec) {
  return typeof spec === 'string' && SEMVER_RANGE.test(spec)
}

// A registry spec is one npm resolves from the npm registry: either the
// `latest` dist-tag (this repo's historical default) or an explicit semver
// range. Anything else is refused so the release line stays auditable.
function isRegistrySpec (spec) {
  return spec === 'latest' || isSemverRange(spec)
}

const rootPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
const specs = expected.map(([name]) => {
  const spec = rootPackage.dependencies?.[name]
  return { name, spec, isFile: typeof spec === 'string' && spec.startsWith('file:') }
})

function usesNpmRegistrySpecs () {
  return specs.every(({ spec }) => isRegistrySpec(spec))
}

const fileSpecCount = specs.filter(({ isFile }) => isFile).length
const dependencyDrift = []
for (const { name, spec, isFile } of specs) {
  // file: specs are validated by the workspace layout check further down.
  if (isFile) continue
  if (isRegistrySpec(spec)) continue
  dependencyDrift.push(`${name} expected latest or a semver range, found ${spec || '(missing)'}`)
}

if (fileSpecCount > 0 && fileSpecCount !== expected.length) {
  dependencyDrift.push('HiveRelay packages must use either all npm registry specs or all file: workspace specs')
}

if (dependencyDrift.length) {
  console.error('PearBrowser desktop expects HiveRelay npm packages to resolve from the npm registry.')
  console.error('')
  for (const msg of dependencyDrift) console.error(`  - ${msg}`)
  console.error('')
  console.error('Use latest or an explicit semver range (for example ^0.26.0) for standalone installs. Use file: specs only when intentionally co-developing all three HiveRelay packages from ../../00-core/hiverelay.')
  process.exit(1)
}

const usesNpmRegistryDefaults = usesNpmRegistrySpecs()

if (usesNpmRegistryDefaults) {
  // This guard is intentionally local and side-effect-free. CI can separately
  // verify the npm dist-tag resolves to EXPECTED_HIVERELAY_VERSION before app
  // lockfile refresh.
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
      console.error(`PearBrowser desktop release installs must lock HiveRelay to npm ${EXPECTED_HIVERELAY_VERSION} packages.`)
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
  write(`  ../../00-core/hiverelay/ -> matching HiveRelay ${EXPECTED_HIVERELAY_VERSION} package checkout`)
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
