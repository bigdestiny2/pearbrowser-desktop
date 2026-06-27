'use strict'

const HEX64 = /^[0-9a-f]{64}$/i

function positiveInt (value, fallback, max = 500) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(max, Math.floor(n))
}

function cleanName (value) {
  return String(value || 'app').trim().slice(0, 160) || 'app'
}

function makeStoragePath (root, key) {
  const safeRoot = String(root || './pearbrowser-storage/fresh-peer-verifier').replace(/[\\/]+$/, '')
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${safeRoot}/verify-${String(key || '').slice(0, 12)}-${nonce}`
}

function spreadSample (entries, samples) {
  const rows = Array.isArray(entries) ? entries : []
  const n = Math.min(samples, rows.length)
  const picks = new Set()
  for (let i = 0; i < n; i++) picks.add(Math.floor((i * (rows.length - 1)) / Math.max(1, n - 1)))
  return [...picks].map((i) => rows[i])
}

function waitForEvent (emitter, event) {
  return new Promise((resolve) => emitter.once(event, resolve))
}

function withTimeout (promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
  ])
}

function normalizeFreshPeerInput (input = {}, opts = {}) {
  const normalizeKey = typeof opts.normalizeKey === 'function' ? opts.normalizeKey : (value) => value
  let key = String(input.key || input.keyHex || input.driveKey || '').trim()
  if (!key && typeof input.link === 'string') {
    const raw = input.link.replace(/^(?:pear|hyper):\/\//i, '').split(/[/?#]/)[0].split('.').pop()
    key = raw
  }
  key = String(normalizeKey(key) || key).toLowerCase()
  return {
    key,
    name: cleanName(input.name),
    samples: positiveInt(input.samples, 12, 100),
    timeout: positiveInt(input.timeout, 90, 600)
  }
}

async function verifyFreshPeer (input = {}, opts = {}) {
  const args = normalizeFreshPeerInput(input, opts)
  const result = {
    target: input.target || null,
    name: args.name,
    key: args.key,
    peers: 0,
    metaLength: 0,
    entries: 0,
    sampled: 0,
    blobsPresent: 0,
    blobsMissing: 0,
    bytes: 0,
    ok: false,
    error: null,
    source: 'in-app-fresh-peer',
    isolated: true
  }
  if (!HEX64.test(args.key)) {
    result.error = 'key must be 64-char hex'
    return result
  }

  const Hyperswarm = opts.Hyperswarm || require('hyperswarm')
  const Corestore = opts.Corestore || require('corestore')
  const Hyperdrive = opts.Hyperdrive || require('hyperdrive')
  const b4a = opts.b4a || require('b4a')
  const fs = opts.fs || require('bare-fs')

  const storage = opts.storagePath || makeStoragePath(opts.storageRoot, args.key)
  let store = null
  let swarm = null
  try {
    try { fs.mkdirSync(storage, { recursive: true }) } catch {}
    store = new Corestore(storage)
    swarm = new Hyperswarm()
    const drive = new Hyperdrive(store, b4a.from(args.key, 'hex'))
    swarm.on('connection', (conn) => {
      result.peers++
      try { store.replicate(conn) } catch {}
    })

    await drive.ready()
    swarm.join(drive.discoveryKey, { server: false, client: true })
    await withTimeout(waitForEvent(swarm, 'connection'), 30_000, 'peer discovery')
    await withTimeout(drive.core.update({ wait: true }), 20_000, 'metadata update')
    result.metaLength = drive.core.length

    const entries = []
    for await (const entry of drive.list('/', { recursive: true })) {
      if (entry?.value?.blob?.byteLength > 0) entries.push(entry)
    }
    result.entries = entries.length
    if (entries.length === 0) throw new Error('drive has no file entries')

    const sample = spreadSample(entries, args.samples)
    result.sampled = sample.length
    for (const entry of sample) {
      try {
        const buf = await withTimeout(drive.get(entry.key), 20_000, 'blob ' + entry.key)
        if (buf && buf.length > 0) {
          result.blobsPresent++
          result.bytes += buf.length
        } else {
          result.blobsMissing++
        }
      } catch {
        result.blobsMissing++
      }
    }
    result.ok = result.peers > 0 && result.entries > 0 && result.blobsMissing === 0 && result.blobsPresent > 0
  } catch (err) {
    result.error = err && err.message ? err.message : String(err)
  } finally {
    try { await swarm?.destroy?.() } catch {}
    try { await store?.close?.() } catch {}
    try { fs.rmSync(storage, { recursive: true, force: true }) } catch {}
  }
  return result
}

module.exports = {
  normalizeFreshPeerInput,
  spreadSample,
  verifyFreshPeer
}
