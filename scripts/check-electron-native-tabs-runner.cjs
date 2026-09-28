'use strict'

// Electron cannot reliably remove its own userData directory on Windows while
// Chromium still has profile files open. The parent owns the temporary profile,
// waits for the child process to exit, removes it, then reports the probe PASS.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const electron = require('electron')

const kind = 'pearbrowser-electron-native-hyper-tab-integration'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pear-native-tabs-'))
let child
try {
  child = spawnSync(electron, [path.join(__dirname, 'check-electron-native-tabs.cjs')], {
    env: { ...process.env, PEARBROWSER_NATIVE_TAB_PROFILE: profile },
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true
  })
} catch (error) {
  child = { error, status: null, stdout: '', stderr: '' }
}

const receipts = []
for (const line of String(child.stdout || '').split(/\r?\n/)) {
  if (!line) continue
  let parsed
  try { parsed = JSON.parse(line) } catch {}
  if (parsed?.kind === kind && parsed.status === 'passed') receipts.push(parsed)
  else process.stdout.write(line + '\n')
}
if (child.stderr) process.stderr.write(child.stderr)

let cleanupError
try {
  // After Electron exits, Windows may need a short moment to release helper
  // process locks. Exhaustion remains a failing, visible cleanup error.
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
} catch (error) {
  cleanupError = error
}

if (child.error) process.stderr.write('Electron native tab probe failed: ' + child.error.message + '\n')
if (child.status !== 0) process.stderr.write('Electron native tab probe exited with ' + String(child.status ?? child.signal ?? 'unknown') + '\n')
if (receipts.length !== 1) process.stderr.write('Electron native tab probe produced ' + receipts.length + ' valid PASS receipts; expected one\n')
if (cleanupError) process.stderr.write('Electron native tab profile cleanup failed after child exit: ' + cleanupError.message + '\n')

if (child.error || child.status !== 0 || receipts.length !== 1 || cleanupError) {
  process.exitCode = 1
} else {
  process.stdout.write(JSON.stringify({ ...receipts[0], profileCleanup: 'after-electron-exit' }) + '\n')
}
