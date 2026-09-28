#!/usr/bin/env node

// Check every packaged QVAC addon for this Mac architecture. Release machines
// must not need an operator's Homebrew or other third-party dylib path.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const value = (name) => {
  const at = args.indexOf(name)
  if (at < 0 || !args[at + 1]) throw new Error(`${name} is required`)
  return args[at + 1]
}

const resourcesDir = resolve(value('--resources-dir'))
const arch = value('--arch')
if (!['arm64', 'x64'].includes(arch)) throw new Error('--arch must be arm64 or x64')
if (process.platform !== 'darwin') throw new Error('macOS package link check requires macOS')

const qvacRoot = join(resourcesDir, 'app.asar.unpacked', 'node_modules', '@qvac')
if (!existsSync(qvacRoot)) throw new Error('packaged @qvac dependencies are missing')

const checked = []
const violations = []
for (const packageName of readdirSync(qvacRoot)) {
  const prebuilds = join(qvacRoot, packageName, 'prebuilds', `darwin-${arch}`)
  if (!existsSync(prebuilds)) continue
  for (const name of readdirSync(prebuilds)) {
    if (!name.endsWith('.bare')) continue
    const file = join(prebuilds, name)
    const linked = execFileSync('/usr/bin/otool', ['-L', file], { encoding: 'utf8' })
    checked.push(`${packageName}/${name}`)
    for (const line of linked.split('\n').slice(1)) {
      const dylib = line.trim().split(/\s+/, 1)[0]
      if (dylib.startsWith('/') && !dylib.startsWith('/usr/lib/') && !dylib.startsWith('/System/Library/')) {
        violations.push(`${packageName}/${name} -> ${dylib}`)
      }
    }
  }
}
for (const required of ['llm-llamacpp/', 'fabric/']) {
  if (!checked.some((entry) => entry.startsWith(required))) {
    throw new Error(`missing darwin-${arch} packaged QVAC ${required.slice(0, -1)} addon`)
  }
}
if (violations.length) {
  console.error(`macOS QVAC native link check FAIL (${violations.length} external absolute dylib paths):`)
  for (const violation of violations) console.error(`  ${violation}`)
  process.exitCode = 1
} else {
  console.log(`macOS QVAC native link check PASS (${arch}, ${checked.length} addons)`)
}
