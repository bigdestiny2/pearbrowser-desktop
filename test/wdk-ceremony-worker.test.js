import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { acquireBareSmokeLock } from './helpers/bare-smoke-lock.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Generous on purpose: the smoke spawns several one-shot ceremony workers and
// two operational wallet workers inside Bare while the full parallel suite
// competes for CPU.
const BARE_SMOKE_TIMEOUT_MS = 180_000

function runBareSmoke () {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(root, 'node_modules/bare/bin/bare'),
      path.join(root, 'scripts/wdk-ceremony-smoke.mjs')
    ], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Bare WDK ceremony smoke timed out'))
    }, BARE_SMOKE_TIMEOUT_MS)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(`Bare WDK ceremony smoke exited ${code}: ${stderr || stdout}`))
        return
      }
      resolve(stdout)
    })
  })
}

test('WDK one-shot ceremony worker runs create/restore/backup end to end inside Bare', async () => {
  const releaseLock = await acquireBareSmokeLock()
  let stdout
  try {
    stdout = await runBareSmoke()
  } finally {
    await releaseLock()
  }
  const lines = stdout.trim().split('\n')
  const result = JSON.parse(lines.at(-1))

  assert.equal(result.ok, true)
  assert.equal(result.runtime, 'Bare')

  // create: 24 words, envelopes self-consistent with the mnemonic, engine
  // zeroed its copies, and the material unlocks the operational worker.
  assert.equal(result.legs.create.words, 24)
  assert.equal(result.legs.create.selfConsistent, true)
  assert.equal(result.legs.create.hostZeroed, true)
  assert.match(result.legs.create.address, /^0x[0-9a-fA-F]{40}$/)

  // restore: fixed 24-word vector derives its pinned deterministic address.
  assert.equal(result.legs.restore.address.toLowerCase(), '0xf278cf59f82edcf871d630f28ecc8056f25c1cdb')
  assert.equal(result.legs.restore.deterministic, true)

  // backup: unseals the persisted entropy envelope back to the same mnemonic.
  assert.equal(result.legs.backup.words, 24)
  assert.equal(result.legs.backup.roundTrip, true)

  // tampered entropy envelope fails closed; cancel releases no vault material.
  assert.equal(result.legs.tampered.rejected, 'ceremony-failed')
  assert.equal(result.legs.cancel.releasedNothing, true)

  // golden 12-word vector: rejected below the engine (24-word contract), and
  // the worker's BIP-39 layer reproduces the exact golden seed; the same
  // envelope + initialize path derives the golden address. Endpoint one-shot
  // semantics enforced (ceremony-active, mismatch, concluded).
  assert.equal(result.legs.golden.seedMatches, true)
  assert.equal(result.legs.golden.address, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
  assert.equal(result.legs.endpoint.twelveWordRejected, 'bad-request')
  assert.equal(result.legs.endpoint.oneShotEnforced, true)
  assert.equal(result.legs.endpoint.seedMatchesFixedVector, true)

  // WalletService integration: create → unlock → backup → restore round trip
  // against the real ceremony path.
  assert.equal(result.legs.service.createUnlockBackupRestore, true)
  assert.match(result.legs.service.address, /^0x[0-9a-fA-F]{40}$/)
})
