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
      path.join(root, 'scripts/wdk-isolate-smoke.mjs')
    ], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Bare WDK isolate smoke timed out'))
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
        reject(new Error(`Bare WDK isolate smoke exited ${code}: ${stderr || stdout}`))
        return
      }
      resolve(stdout)
    })
  })
}

test('WDK runs behind a typed Bare isolate and terminates after graceful or hung disposal', async () => {
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
  assert.deepEqual(result.graceful.rejectedGenericOperations, [
    'callMethod',
    'constructor',
    'toString',
    '__proto__'
  ])
  assert.equal(result.graceful.unimplementedCode, 'operation-failed')
  assert.equal(result.graceful.hostBuffersZeroed, true)
  assert.equal(result.graceful.workerSeedZeroed, true)
  assert.equal(result.graceful.disposeOutcome, 'ok')
  assert.equal(result.graceful.exitCode, 0)
  assert.equal(result.graceful.exitEvents, 1)
  assert.equal(result.forced.disposeOutcome, 'worklet-dispose-timeout')
  assert.equal(result.forced.exitCode, 0)
  assert.equal(result.forced.exitEvents, 1)
  assert.equal(result.forced.adapterState, 'locked')
})
