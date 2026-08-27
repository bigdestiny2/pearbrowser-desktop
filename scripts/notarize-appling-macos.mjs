#!/usr/bin/env node

import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = parseArgs(process.argv.slice(2))
const buildDir = resolve(root, args.buildDir || 'dist/electron')
const appName = args.appName || 'PearBrowser'
const appleId = process.env.PEARBROWSER_MACOS_NOTARY_APPLE_ID || ''
const password = process.env.PEARBROWSER_MACOS_NOTARY_PASSWORD || ''
const teamId = process.env.PEARBROWSER_MACOS_NOTARY_TEAM_ID || ''

if (!appleId && !password && !teamId) {
  console.log('Skipping macOS notarization; notarization credentials are not configured.')
  process.exit(0)
}

if (!appleId || !password || !teamId) {
  fail('macOS notarization requires PEARBROWSER_MACOS_NOTARY_APPLE_ID, PEARBROWSER_MACOS_NOTARY_PASSWORD, and PEARBROWSER_MACOS_NOTARY_TEAM_ID')
}
if (!existsSync(buildDir)) fail(`Electron build directory does not exist: ${buildDir}`)

const apps = findApps(buildDir)
const preferred = apps.filter((candidate) => basename(candidate) === `${appName}.app`)
if (preferred.length !== 1) {
  fail(`Expected exactly one ${appName}.app under ${buildDir}, found ${preferred.length}: ${apps.join(', ') || '(none)'}`)
}
const app = preferred[0]

const workDir = mkdtempSync(join(tmpdir(), 'pearbrowser-notary-'))
const archive = join(workDir, 'PearBrowser-notary.zip')

try {
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app])
  run('ditto', ['-c', '-k', '--keepParent', app, archive])
  run('xcrun', [
    'notarytool',
    'submit',
    archive,
    '--apple-id',
    appleId,
    '--password',
    password,
    '--team-id',
    teamId,
    '--wait'
  ])
  run('xcrun', ['stapler', 'staple', app])
  run('xcrun', ['stapler', 'validate', app])
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app])

  if (process.env.PEARBROWSER_MACOS_ASSESS_GATEKEEPER === '1') {
    run('spctl', ['--assess', '--type', 'execute', '--verbose=4', app])
  }
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

function parseArgs (argv) {
  const options = new Map([
    ['--build-dir', 'buildDir'],
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
  console.error('usage: node scripts/notarize-appling-macos.mjs [--build-dir dist/electron] [--app-name PearBrowser]')
  process.exit(code)
}

function findApps (dir) {
  const found = []
  walk(dir)
  return found

  function walk (current) {
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory() && entry.name.endsWith('.app')) {
        found.push(path)
        continue
      }
      if (entry.isDirectory()) walk(path)
      else if (entry.isSymbolicLink()) {
        try {
          if (statSync(path).isDirectory()) walk(path)
        } catch {}
      }
    }
  }
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
  console.error(message)
  process.exit(1)
}
