// Cross-process mutex for tests that spawn real `bare` binaries.
// `node --test` runs every test file in its own child process, so an
// in-process queue cannot serialize the Bare smoke tests — only a lock on the
// shared filesystem can. mkdir(2) is atomic on POSIX, which gives us an
// exclusive lock with no extra dependencies.
//
// The lock serializes the heavy Bare spawns so the full parallel suite never
// runs two Bare runtimes (plus their worker threads) at once, which is what
// pushed the smoke scripts past their readiness timeouts under load.

import { mkdir, rmdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const LOCK_DIR = join(tmpdir(), 'pearbrowser-wdk-bare-smoke.lock')
const ACQUIRE_TIMEOUT_MS = 240_000
const STALE_AFTER_MS = 300_000
const RETRY_INTERVAL_MS = 100

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function acquireBareSmokeLock ({ timeoutMs = ACQUIRE_TIMEOUT_MS } = {}) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      await mkdir(LOCK_DIR)
      return async function releaseBareSmokeLock () {
        await rmdir(LOCK_DIR).catch(() => {})
      }
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
    }

    // Steal locks abandoned by a crashed test process so one flake cannot
    // wedge every later run.
    try {
      const info = await stat(LOCK_DIR)
      if (Date.now() - info.mtimeMs > STALE_AFTER_MS) await rmdir(LOCK_DIR).catch(() => {})
    } catch {}

    if (Date.now() > deadline) throw new Error('timed out acquiring the Bare smoke lock')
    await sleep(RETRY_INTERVAL_MS)
  }
}
