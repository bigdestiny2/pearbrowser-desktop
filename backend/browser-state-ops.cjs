// Browser-state (multi-device sync) operation schema + validation (PURE).
//
// Rollout Phase 4 (docs/AUTOBEE-RESEARCH.md): sync the user's OWN browser
// state across their devices over an ENCRYPTED Autobee. This first slice
// covers bookmarks (history is deferred — privacy/retention). CommonJS so
// Bare can require() it and Node can default-import it for tests.
//
// Constraints honored ("Design Constraints"):
//   - schema-versioned (every op carries `v`)
//   - no wall-clock used for conflict resolution (Autobase linearization is
//     the order; `addedAt` is informational metadata only)
//   - malicious inputs rejected BEFORE append (size + prototype pollution)
//   - private data → the transport is encrypted (see browser-state-sync.cjs)

const SCHEMA_VERSION = 1
const OP_ADD = 'bookmark.add'
const OP_REMOVE = 'bookmark.remove'
const OP_ADD_WRITER = 'writer.add'

const MAX_OP_BYTES = 8 * 1024
const MAX_URL = 2048
const MAX_TITLE = 1024

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function clampStr (value, max) {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

function hasUnsafeKey (value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return false
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) return true
    if (hasUnsafeKey(value[key], depth + 1)) return true
  }
  return false
}

function opByteLength (op) {
  try { return Buffer.byteLength(JSON.stringify(op)) } catch { return Infinity }
}

// Whitelist + clamp a bookmark record. `addedAt` is kept only if a finite
// number (informational; never used to resolve conflicts).
function sanitizeBookmark (bm) {
  const src = (bm && typeof bm === 'object') ? bm : {}
  const out = { url: clampStr(src.url, MAX_URL).trim(), title: clampStr(src.title, MAX_TITLE) }
  if (Number.isFinite(src.addedAt)) out.addedAt = src.addedAt
  return out
}

// --- Op constructors ------------------------------------------------------

function addBookmarkOp (bm) {
  const clean = sanitizeBookmark(bm)
  return { v: SCHEMA_VERSION, type: OP_ADD, url: clean.url, bookmark: clean }
}

function removeBookmarkOp (url) {
  return { v: SCHEMA_VERSION, type: OP_REMOVE, url: clampStr(String(url || ''), MAX_URL).trim() }
}

function addWriterOp (keyHex) {
  return { v: SCHEMA_VERSION, type: OP_ADD_WRITER, key: clampStr(String(keyHex || ''), 64) }
}

// --- Validation -----------------------------------------------------------
//
//   { ok: true }                      → apply it
//   { ok: false, retain: true, ... }  → keep in log, ignore in view (fwd-compat)
//   { ok: false, retain: false, ... } → reject before append (abuse/malformed)

function validateOp (op) {
  if (!op || typeof op !== 'object' || Array.isArray(op)) {
    return { ok: false, retain: false, reason: 'not-an-object' }
  }
  if (hasUnsafeKey(op)) return { ok: false, retain: false, reason: 'prototype-pollution' }
  if (opByteLength(op) > MAX_OP_BYTES) return { ok: false, retain: false, reason: 'oversized' }
  if (op.v !== SCHEMA_VERSION) return { ok: false, retain: true, reason: 'unknown-version' }

  switch (op.type) {
    case OP_ADD: {
      if (!op.bookmark || typeof op.bookmark !== 'object') return { ok: false, retain: false, reason: 'add-needs-bookmark' }
      const url = String(op.url || '').trim()
      if (!url) return { ok: false, retain: false, reason: 'add-needs-url' }
      if (String(op.bookmark.url || '').trim() !== url) return { ok: false, retain: false, reason: 'url-mismatch' }
      return { ok: true }
    }
    case OP_REMOVE:
      if (!String(op.url || '').trim()) return { ok: false, retain: false, reason: 'remove-needs-url' }
      return { ok: true }
    case OP_ADD_WRITER:
      if (!/^[0-9a-f]{64}$/i.test(String(op.key || ''))) return { ok: false, retain: false, reason: 'bad-writer-key' }
      return { ok: true }
    default:
      return { ok: false, retain: true, reason: 'unknown-type' }
  }
}

module.exports = {
  SCHEMA_VERSION, OP_ADD, OP_REMOVE, OP_ADD_WRITER, MAX_OP_BYTES,
  clampStr, hasUnsafeKey, opByteLength, sanitizeBookmark,
  addBookmarkOp, removeBookmarkOp, addWriterOp, validateOp
}
