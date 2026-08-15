'use strict'

// Append-only wallet intent/recovery journal on a single Hyperbee, mirroring
// the swarm-grants storage pattern. The journal NEVER stores secrets: no
// seeds, mnemonics, passphrases, encryption keys, raw signatures or signed
// transaction bytes — only sanitized lifecycle records and transaction hashes.
//
// Storage layout (single Hyperbee under the wallet Corestore namespace):
//   e!<seq:020d>            → full entry ({ seq, ts, type, ...safeFields })
//   d!<driveKey>!<seq:020d> → seq (per-drive index)
//   i!<intentId>!<seq:020d> → seq (per-intent index)
//   t!<txHash>!<seq:020d>   → seq (per-transaction index)
//   k!<driveKey>!<manifestSha256>!<idempotencyKey>
//                           → { intentId, intentDigest } (payment reservation)
//   meta!seq                → { seq } (append counter)

const Hyperbee = require('hyperbee')

const ENTRY_PREFIX = 'e!'
const DRIVE_PREFIX = 'd!'
const INTENT_PREFIX = 'i!'
const TX_PREFIX = 't!'
const IDEMPOTENCY_PREFIX = 'k!'
const META_SEQ_KEY = 'meta!seq'
const ENTRY_MAX_BYTES = 16 * 1024
const HEX64_RE = /^[0-9a-f]{64}$/
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/

const ENTRY_TYPES = Object.freeze([
  'intent',
  'prompt',
  'approval',
  'rejection',
  'broadcast',
  'outcome',
  'connect',
  'disconnect',
  'sign-app'
])

// Key names that must never appear anywhere in a journal entry, at any depth.
const FORBIDDEN_KEYS = Object.freeze([
  'mnemonic',
  'seed',
  'encryptedSeed',
  'entropy',
  'encryptedEntropy',
  'passphrase',
  'encryptionKey',
  'privateKey',
  'secret',
  'signature',
  'signedTransaction'
])

function journalError (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function padSeq (seq) {
  return String(seq).padStart(20, '0')
}

// Key segments ride between '!' separators, so they must never contain one
// (or '~', the index scan sentinel).
function requireKeyPart (value, label) {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 128 ||
    value.includes('!') ||
    value.includes('~')
  ) {
    throw journalError('bad-request', `${label} is invalid`)
  }
  return value
}

function idempotencyKeyOf ({ driveKey, manifestSha256, idempotencyKey }) {
  return IDEMPOTENCY_PREFIX + driveKey + '!' + manifestSha256 + '!' + idempotencyKey
}

function scanForbidden (value) {
  if (!value || typeof value !== 'object') return
  if (value instanceof Uint8Array) throw journalError('bad-request', 'journal entries must not contain binary values')
  if (Array.isArray(value)) {
    for (const item of value) scanForbidden(item)
    return
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) {
    throw journalError('bad-request', 'journal entries must be plain records')
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw journalError('bad-request', 'journal entries have unsupported keys')
    if (FORBIDDEN_KEYS.includes(key)) {
      throw journalError('bad-request', `journal entries must not contain ${key}`)
    }
    scanForbidden(value[key])
  }
}

class WalletJournal {
  /**
   * @param {object} opts
   * @param {Hyperbee} [opts.bee]   — ready-made Hyperbee (keyEncoding utf-8, valueEncoding json)
   * @param {Corestore} [opts.store] — a core named 'pearbrowser-wallet-journal' is opened
   * @param {Function} [opts.now]
   */
  constructor (opts = {}) {
    if (opts.bee) {
      this._bee = opts.bee
    } else if (opts.store) {
      const core = opts.store.get({ name: 'pearbrowser-wallet-journal' })
      this._bee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' })
    } else {
      throw new Error('WalletJournal requires a Hyperbee or a Corestore')
    }
    if (opts.now !== undefined && typeof opts.now !== 'function') throw new Error('now must be a function')
    this._now = typeof opts.now === 'function' ? opts.now : Date.now
    this._seq = null
    // Appends are serialized through this promise chain: seq assignment and
    // the entry/index/meta puts of one append fully settle before the next
    // append starts, so interleaved callers can never write meta!seq out of
    // order. The journal is single-writer.
    this._tail = Promise.resolve()
  }

  async ready () {
    if (this._seq !== null) return
    await this._bee.ready()
    const meta = await this._bee.get(META_SEQ_KEY)
    let seq = meta && meta.value && Number.isSafeInteger(meta.value.seq) ? meta.value.seq : 0
    // A crash mid-append may leave an entry (and its indexes) ahead of the
    // persisted counter; recover from the actual contents so a live seq is
    // never reused.
    for await (const node of this._bee.createReadStream({
      gte: ENTRY_PREFIX,
      lt: ENTRY_PREFIX + '~',
      reverse: true,
      limit: 1
    })) {
      if (node.value && Number.isSafeInteger(node.value.seq) && node.value.seq > seq) {
        seq = node.value.seq
      }
    }
    this._seq = seq
  }

  _requireReady () {
    if (this._seq === null) throw new Error('WalletJournal not ready — call ready() first')
  }

  _validateEntry (entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw journalError('bad-request', 'journal entry must be a record')
    }
    if (!ENTRY_TYPES.includes(entry.type)) throw journalError('bad-request', 'journal entry type is invalid')
    if ('seq' in entry || 'ts' in entry) throw journalError('bad-request', 'journal entry seq/ts are assigned by the journal')
    scanForbidden(entry)
    const size = JSON.stringify(entry).length
    if (size > ENTRY_MAX_BYTES) throw journalError('bad-request', 'journal entry exceeds its size limit')
  }

  _validateIdempotency (value, entry) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw journalError('bad-request', 'idempotency reservation must be a record')
    }
    if (entry.type !== 'intent') {
      throw journalError('bad-request', 'idempotency reservations attach to intent entries')
    }
    const { driveKey, manifestSha256, idempotencyKey, intentId, intentDigest } = value
    if (typeof driveKey !== 'string' || !HEX64_RE.test(driveKey)) {
      throw journalError('bad-request', 'idempotency driveKey is invalid')
    }
    if (typeof manifestSha256 !== 'string' || !HEX64_RE.test(manifestSha256)) {
      throw journalError('bad-request', 'idempotency manifestSha256 is invalid')
    }
    requireKeyPart(idempotencyKey, 'idempotencyKey')
    if (intentId !== entry.intentId) {
      throw journalError('bad-request', 'idempotency intentId must match the entry')
    }
    if (typeof intentDigest !== 'string' || !HEX64_RE.test(intentDigest)) {
      throw journalError('bad-request', 'idempotency intentDigest is invalid')
    }
    return Object.freeze({ driveKey, manifestSha256, idempotencyKey, intentId, intentDigest })
  }

  async append (entry, opts = {}) {
    this._requireReady()
    this._validateEntry(entry)
    const idempotency = opts.idempotency === undefined
      ? null
      : this._validateIdempotency(opts.idempotency, entry)
    const run = this._tail.then(() => this._appendNow(entry, idempotency))
    this._tail = run.catch(() => {})
    return run
  }

  async _appendNow (entry, idempotency) {
    const seq = ++this._seq
    const full = { ...entry, seq, ts: this._now() }
    let reservationKey = null
    if (idempotency) {
      // Atomic reservation, inside the serialized append: the first writer
      // of (driveKey, manifestSha256, idempotencyKey) wins; a concurrent
      // append for the same key fails before writing anything.
      reservationKey = idempotencyKeyOf(idempotency)
      const existing = await this._bee.get(reservationKey)
      if (existing && existing.value) {
        const err = journalError('idempotency-conflict', 'idempotency key is already reserved')
        err.existing = Object.freeze({ ...existing.value })
        throw err
      }
    }
    await this._bee.put(ENTRY_PREFIX + padSeq(seq), full)
    if (typeof entry.driveKey === 'string' && HEX64_RE.test(entry.driveKey)) {
      await this._bee.put(DRIVE_PREFIX + entry.driveKey + '!' + padSeq(seq), { seq })
    }
    if (typeof entry.intentId === 'string') {
      await this._bee.put(INTENT_PREFIX + entry.intentId + '!' + padSeq(seq), { seq })
    }
    if (typeof entry.transactionHash === 'string' && TX_HASH_RE.test(entry.transactionHash)) {
      await this._bee.put(TX_PREFIX + entry.transactionHash.toLowerCase() + '!' + padSeq(seq), { seq })
    }
    if (reservationKey) {
      await this._bee.put(reservationKey, {
        intentId: idempotency.intentId,
        intentDigest: idempotency.intentDigest
      })
    }
    await this._bee.put(META_SEQ_KEY, { seq })
    return Object.freeze({ ...full })
  }

  // Current reservation for (driveKey, manifestSha256, idempotencyKey), or
  // null. Written atomically with the intent append, so it survives restarts.
  async lookupIdempotency (driveKey, manifestSha256, idempotencyKey) {
    this._requireReady()
    if (typeof driveKey !== 'string' || !HEX64_RE.test(driveKey)) {
      throw journalError('bad-request', 'driveKey is invalid')
    }
    if (typeof manifestSha256 !== 'string' || !HEX64_RE.test(manifestSha256)) {
      throw journalError('bad-request', 'manifestSha256 is invalid')
    }
    requireKeyPart(idempotencyKey, 'idempotencyKey')
    const node = await this._bee.get(idempotencyKeyOf({ driveKey, manifestSha256, idempotencyKey }))
    if (!node || !node.value) return null
    return Object.freeze({
      intentId: node.value.intentId,
      intentDigest: node.value.intentDigest
    })
  }

  async _entryAt (seq) {
    const node = await this._bee.get(ENTRY_PREFIX + padSeq(seq))
    return node && node.value ? Object.freeze({ ...node.value }) : null
  }

  async _resolveIndex (prefix) {
    const seqs = []
    for await (const node of this._bee.createReadStream({ gte: prefix, lt: prefix + '~' })) {
      if (node.value && Number.isSafeInteger(node.value.seq)) seqs.push(node.value.seq)
    }
    seqs.sort((a, b) => a - b)
    const entries = []
    for (const seq of seqs) {
      const entry = await this._entryAt(seq)
      if (entry) entries.push(entry)
    }
    return Object.freeze(entries)
  }

  async listByDrive (driveKey) {
    this._requireReady()
    if (typeof driveKey !== 'string' || !HEX64_RE.test(driveKey)) {
      throw journalError('bad-request', 'driveKey is invalid')
    }
    return this._resolveIndex(DRIVE_PREFIX + driveKey + '!')
  }

  async getByIntentId (intentId) {
    this._requireReady()
    if (typeof intentId !== 'string' || intentId.length === 0 || intentId.length > 128) {
      throw journalError('bad-request', 'intentId is invalid')
    }
    return this._resolveIndex(INTENT_PREFIX + intentId + '!')
  }

  async getByTxHash (transactionHash) {
    this._requireReady()
    if (typeof transactionHash !== 'string' || !TX_HASH_RE.test(transactionHash)) {
      throw journalError('bad-request', 'transactionHash is invalid')
    }
    return this._resolveIndex(TX_PREFIX + transactionHash.toLowerCase() + '!')
  }

  async listRecent (limit = 50) {
    this._requireReady()
    if (!Number.isSafeInteger(limit) || limit < 1) throw journalError('bad-request', 'limit is invalid')
    const entries = []
    for await (const node of this._bee.createReadStream({
      gte: ENTRY_PREFIX,
      lt: ENTRY_PREFIX + '~',
      reverse: true,
      limit
    })) {
      if (node.value) entries.push(Object.freeze({ ...node.value }))
    }
    return Object.freeze(entries)
  }
}

module.exports = {
  ENTRY_TYPES,
  FORBIDDEN_KEYS,
  WalletJournal
}
