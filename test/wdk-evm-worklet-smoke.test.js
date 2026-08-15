import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { acquireBareSmokeLock } from './helpers/bare-smoke-lock.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Generous on purpose: under full-suite parallel load the bare binary, the
// worker thread, and golden-vector signing all compete for CPU with every
// other test process.
const BARE_SMOKE_TIMEOUT_MS = 180_000

function runBareSmoke () {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(root, 'node_modules/bare/bin/bare'),
      path.join(root, 'scripts/wdk-evm-worklet-smoke.mjs')
    ], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Bare WDK EVM worklet smoke timed out'))
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
        reject(new Error(`Bare WDK EVM worklet smoke exited ${code}: ${stderr || stdout}`))
        return
      }
      resolve(stdout)
    })
  })
}

test('WDK EVM worker derives the golden account and reproduces the golden signature inside Bare', async () => {
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
  assert.equal(result.address, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
  assert.equal(result.signedTransactionHash, '0x31a5f71196b5efc0640e06375a3db03b62daa0d2b4e8a53f5e7d764d8ecb0777')
  assert.equal(result.appPayloadAddress, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
  assert.equal(result.disposeOutcome, 'ok')
  assert.equal(result.adapterState, 'locked')
})
