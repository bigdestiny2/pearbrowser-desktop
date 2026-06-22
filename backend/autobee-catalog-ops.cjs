// Autobee collaborative-catalog operation schema + validation (PURE).
//
// CommonJS (.cjs) so it loads under Bare (the backend runtime) via require()
// AND under Node for the test suite (default-import). Single source of truth
// for the op schema — no autobase import, so it stays unit-testable in
// isolation. See docs/AUTOBEE-RESEARCH.md.
//
// Constraints honored ("Design Constraints"):
//   - schema-versioned (every op carries `v`)
//   - no wall-clock anywhere (ordering is Autobase's job, not ours)
//   - malicious inputs rejected BEFORE append (size + prototype pollution)
//   - app `id`/`driveKey` are stable identity, not editable metadata

const SCHEMA_VERSION = 1
const OP_RENAME = 'catalog.rename'
const OP_UPSERT = 'app.upsert'
const OP_REMOVE = 'app.remove'
const OP_ADD_WRITER = 'writer.add'

// A catalog op is tiny metadata; anything larger is almost certainly abuse.
const MAX_OP_BYTES = 16 * 1024
const MAX_STR = 4096
const MAX_CATEGORIES = 32
const HEX64_RE = /^[0-9a-f]{64}$/i
const APP_LINK_RE = /^(?:pear|file):\/\/.+/i

const APP_STRING_FIELDS = ['id', 'name', 'description', 'driveKey', 'link', 'version', 'author']
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function clampStr (value, max = MAX_STR) {
  if (typeof value !== 'string') return ''
  return value.length > max ? value.slice(0, max) : value
}

// Recursively scan a parsed object for prototype-pollution keys.
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

// Whitelist + clamp an app record. Drops unknown keys (incl. pollution keys),
// coerces types, and bounds sizes.
function sanitizeApp (app) {
  const out = {}
  const src = (app && typeof app === 'object') ? app : {}
  for (const field of APP_STRING_FIELDS) {
    if (field === 'driveKey') {
      const key = clampStr(src[field], 64).trim()
      out[field] = HEX64_RE.test(key) ? key.toLowerCase() : ''
    } else if (field === 'link') {
      const link = clampStr(src[field]).trim()
      out[field] = APP_LINK_RE.test(link) ? link : ''
    } else {
      out[field] = clampStr(src[field])
    }
  }
  const cats = Array.isArray(src.categories) ? src.categories : []
  out.categories = cats.filter((c) => typeof c === 'string').slice(0, MAX_CATEGORIES).map((c) => clampStr(c, 128))
  return out
}

function appIdOf (app) {
  return (app && (app.id || app.driveKey || app.link) ? String(app.id || app.driveKey || app.link) : '').trim()
}

// --- Op constructors ------------------------------------------------------

function renameOp (name) {
  return { v: SCHEMA_VERSION, type: OP_RENAME, name: clampStr(String(name || '')) }
}

function upsertOp (app) {
  const clean = sanitizeApp(app)
  const id = appIdOf(clean)
  return { v: SCHEMA_VERSION, type: OP_UPSERT, id, app: { ...clean, id } }
}

function removeOp (id) {
  return { v: SCHEMA_VERSION, type: OP_REMOVE, id: clampStr(String(id || '')) }
}

function addWriterOp (keyHex) {
  return { v: SCHEMA_VERSION, type: OP_ADD_WRITER, key: clampStr(String(keyHex || ''), 64) }
}

// --- Validation -----------------------------------------------------------
//
// Returns one of:
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
    case OP_RENAME:
      if (typeof op.name !== 'string') return { ok: false, retain: false, reason: 'rename-needs-name' }
      return { ok: true }
    case OP_UPSERT: {
      if (!op.app || typeof op.app !== 'object') return { ok: false, retain: false, reason: 'upsert-needs-app' }
      const id = String(op.id || '').trim()
      if (!id) return { ok: false, retain: false, reason: 'upsert-needs-id' }
      if (String(op.app.id || '').trim() !== id) return { ok: false, retain: false, reason: 'id-mismatch' }
      const driveKey = String(op.app.driveKey || '').trim()
      const link = String(op.app.link || '').trim()
      if (driveKey && !HEX64_RE.test(driveKey)) return { ok: false, retain: false, reason: 'bad-drivekey' }
      if (link && !APP_LINK_RE.test(link)) return { ok: false, retain: false, reason: 'bad-link' }
      if (!driveKey && !link) {
        return { ok: false, retain: false, reason: 'missing-app-target' }
      }
      return { ok: true }
    }
    case OP_REMOVE:
      if (!String(op.id || '').trim()) return { ok: false, retain: false, reason: 'remove-needs-id' }
      return { ok: true }
    case OP_ADD_WRITER:
      if (!/^[0-9a-f]{64}$/i.test(String(op.key || ''))) return { ok: false, retain: false, reason: 'bad-writer-key' }
      return { ok: true }
    default:
      return { ok: false, retain: true, reason: 'unknown-type' }
  }
}

module.exports = {
  SCHEMA_VERSION, OP_RENAME, OP_UPSERT, OP_REMOVE, OP_ADD_WRITER, MAX_OP_BYTES,
  clampStr, hasUnsafeKey, opByteLength, sanitizeApp,
  renameOp, upsertOp, removeOp, addWriterOp, validateOp
}
