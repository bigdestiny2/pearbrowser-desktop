#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

const expected = [
  ['p2p-hiverelay', '0.20.0', 'vendor/hiverelay/p2p-hiverelay-0.20.0.tgz', '../../00-core/hiverelay/packages/core/package.json'],
  ['p2p-hiverelay-client', '0.20.0', 'vendor/hiverelay/p2p-hiverelay-client-0.20.0.tgz', '../../00-core/hiverelay/packages/client/package.json'],
  ['p2p-hiverelay-verifier', '0.20.0', 'vendor/hiverelay/p2p-hiverelay-verifier-0.20.0.tgz', '../../00-core/hiverelay/packages/verifier/package.json']
]

const rootPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
const errors = []
const warnings = []

for (const [name, version, vendorRel, localRel] of expected) {
  const expectedSpec = `file:${vendorRel}`
  const actualSpec = rootPackage.dependencies?.[name]
  if (actualSpec !== expectedSpec) {
    errors.push(`package.json dependency ${name} must be ${expectedSpec}, got ${actualSpec || '(missing)'}`)
  }

  const vendorPath = resolve(process.cwd(), vendorRel)
  if (!existsSync(vendorPath)) {
    errors.push(`vendored HiveRelay package missing: ${vendorRel}`)
  } else if (statSync(vendorPath).size === 0) {
    errors.push(`vendored HiveRelay package is empty: ${vendorRel}`)
  } else {
    try {
      const packed = readPackedPackageJson(vendorPath)
      if (packed.name !== name || packed.version !== version) {
        errors.push(`${vendorRel} expected ${name}@${version}, found ${packed.name || '(missing name)'}@${packed.version || '(missing version)'}`)
      }
    } catch (err) {
      errors.push(`${vendorRel} could not be read: ${err.message}`)
    }
  }

  const localPath = resolve(process.cwd(), localRel)
  if (!existsSync(localPath)) {
    warnings.push(`optional local HiveRelay checkout missing: ${localRel}`)
    continue
  }

  try {
    const local = JSON.parse(readFileSync(localPath, 'utf8'))
    if (local.name !== name || local.version !== version) {
      warnings.push(`${localRel} expected ${name}@${version}, found ${local.name || '(missing name)'}@${local.version || '(missing version)'}`)
    }
  } catch (err) {
    warnings.push(`${localRel} could not be read: ${err.message}`)
  }
}

for (const warning of warnings) console.warn(`warning: ${warning}`)

if (errors.length) {
  console.error('PearBrowser desktop HiveRelay dependency check failed.')
  console.error('')
  for (const error of errors) console.error(`- ${error}`)
  console.error('')
  console.error('Expected source-install shape:')
  console.error('  package.json -> file:vendor/hiverelay/*.tgz')
  console.error('  vendor/hiverelay/ -> p2p-hiverelay 0.20.0 package tarballs')
  console.error('')
  console.error('The sibling ../../00-core/hiverelay checkout is optional for development,')
  console.error('but standalone source installs must keep the vendored tarballs present.')
  process.exit(1)
}

function readPackedPackageJson (tgzPath) {
  const buffer = gunzipSync(readFileSync(tgzPath))
  let offset = 0
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512)
    if (isZeroBlock(header)) break

    const name = readTarString(header, 0, 100)
    const prefix = readTarString(header, 345, 155)
    const path = prefix ? `${prefix}/${name}` : name
    const size = parseInt(readTarString(header, 124, 12).trim() || '0', 8)
    const bodyOffset = offset + 512
    const nextOffset = bodyOffset + Math.ceil(size / 512) * 512

    if (path === 'package/package.json') {
      return JSON.parse(buffer.subarray(bodyOffset, bodyOffset + size).toString('utf8'))
    }

    offset = nextOffset
  }
  throw new Error('package/package.json not found in tarball')
}

function readTarString (buffer, start, length) {
  return buffer
    .subarray(start, start + length)
    .toString('utf8')
    .replace(/\0.*$/s, '')
}

function isZeroBlock (buffer) {
  for (const byte of buffer) {
    if (byte !== 0) return false
  }
  return true
}
