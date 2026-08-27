#!/usr/bin/env node

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const args = parseArgs(process.argv.slice(2))
const version = args.tag ? versionFromTag(args.tag) : (args.version || pkg.version)
const appName = args.appName || 'PearBrowser'
const buildDir = resolve(args.buildDir || 'dist/electron')
const out = resolve(args.out || join(buildDir, `${appName}-${version}.dmg`))
const appleId = process.env.PEARBROWSER_MACOS_NOTARY_APPLE_ID || ''
const password = process.env.PEARBROWSER_MACOS_NOTARY_PASSWORD || ''
const teamId = process.env.PEARBROWSER_MACOS_NOTARY_TEAM_ID || ''

if (version !== pkg.version) {
  fail(`release version ${version} does not match package.json version ${pkg.version}`)
}
if (process.platform !== 'darwin') {
  fail('macOS DMG creation requires macOS and hdiutil')
}
if (!existsSync(buildDir)) {
  fail(`build directory does not exist: ${buildDir}`)
}

const app = findAppBundle(buildDir, `${appName}.app`)
const staging = mkdtempSync(join(tmpdir(), 'pearbrowser-dmg-'))

try {
  run('ditto', [app, join(staging, basename(app))])
  symlinkSync('/Applications', join(staging, 'Applications'))
  rmSync(out, { force: true })
  run('hdiutil', [
    'create',
    '-volname',
    appName,
    '-srcfolder',
    staging,
    '-ov',
    '-format',
    'UDZO',
    out
  ])
  run('hdiutil', ['verify', out])

  if (appleId || password || teamId) {
    if (!appleId || !password || !teamId) {
      fail('DMG notarization requires PEARBROWSER_MACOS_NOTARY_APPLE_ID, PEARBROWSER_MACOS_NOTARY_PASSWORD, and PEARBROWSER_MACOS_NOTARY_TEAM_ID')
    }
    run('xcrun', [
      'notarytool',
      'submit',
      out,
      '--apple-id',
      appleId,
      '--password',
      password,
      '--team-id',
      teamId,
      '--wait'
    ])
    run('xcrun', ['stapler', 'staple', out])
    run('xcrun', ['stapler', 'validate', out])
  } else {
    console.log('Skipping DMG notarization; notarization credentials are not configured.')
  }

  const bytes = statSync(out).size
  if (bytes <= 0) fail(`created DMG is empty: ${out}`)
  console.log(`Created ${out} (${bytes} bytes)`)
} finally {
  rmSync(staging, { recursive: true, force: true })
}

function parseArgs (argv) {
  const options = new Map([
    ['--tag', 'tag'],
    ['--version', 'version'],
    ['--build-dir', 'buildDir'],
    ['--out', 'out'],
    ['--app-name', 'appName']
  ])
  const parsed = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const key = options.get(arg)
    if (!key) usage(2, `unknown argument: ${arg}`)
    const value = argv[++i] || ''
    if (!value || value.startsWith('--')) usage(2, `${arg} requires a value`)
    parsed[key] = value
  }
  return parsed
}

function usage (code, message = '') {
  if (message) console.error(`error: ${message}`)
  console.error('usage: node scripts/create-macos-dmg.mjs [--tag vX.Y.Z] [--build-dir dist/electron] [--out path] [--app-name PearBrowser]')
  process.exit(code)
}

function versionFromTag (tag) {
  const normalized = String(tag || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(normalized)) {
    usage(2, `release tag must be a stable vX.Y.Z tag, got ${tag}`)
  }
  return normalized.slice(1)
}

function findAppBundle (root, preferredName) {
  const matches = []
  walk(root)
  const preferred = matches.filter((path) => basename(path) === preferredName)
  const candidates = preferred.length ? preferred : matches
  if (candidates.length === 0) fail(`no .app bundle found under ${root}`)
  if (candidates.length > 1) fail(`multiple .app bundles found under ${root}: ${candidates.join(', ')}`)
  return candidates[0]

  function walk (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (!entry.isDirectory()) continue
      if (entry.name.endsWith('.app')) {
        matches.push(path)
        continue
      }
      if (shouldSkipDir(entry.name)) continue
      walk(path)
    }
  }
}

function shouldSkipDir (name) {
  return name === 'node_modules' || name === 'app.asar.unpacked'
}

function run (command, args) {
  console.log(`$ ${[command, ...redact(args)].join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) fail(`${command} exited with status ${result.status}`)
}

function redact (args) {
  const redacted = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--password') {
      redacted.push(args[i], '********')
      i += 1
    } else {
      redacted.push(args[i])
    }
  }
  return redacted
}

function fail (message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
