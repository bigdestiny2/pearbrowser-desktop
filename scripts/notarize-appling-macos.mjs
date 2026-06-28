#!/usr/bin/env node

import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))
const buildDir = join(root, 'appling', 'build')
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

const apps = findApps(buildDir)
const app = apps.find((candidate) => basename(candidate) === 'PearBrowser.app') || apps[0]
if (!app) fail(`No .app bundle found under ${buildDir}`)
if (apps.length > 1) console.log(`Found ${apps.length} .app bundles; notarizing ${app}`)

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
