// Autobee collaborative-catalog operation schema + validation (PURE).
//
// Rollout Phase 1 (docs/AUTOBEE-RESEARCH.md): local-only, no UI, behind a
// flag. This module is the PearBrowser-owned wrapper around the op log — it
// never imports autobase, so the schema and its guards are unit-testable in
// isolation. The manager (autobee-catalog-manager.js) feeds validated ops
// into Autobase; the reducer (autobee-catalog-apply.js) folds them.
//
// Constraints honored (see doc "Design Constraints"):
//   - schema-versioned (every op carries `v`)
//   - no wall-clock anywhere (ordering is Autobase's job, not ours)
//   - malicious inputs rejected BEFORE append (size + prototype pollution)
//   - app `id`/`driveKey` are stable identity, not editable metadata

export const SCHEMA_VERSION = 1
export const OP_RENAME = 'catalog.rename'
export const OP_UPSERT = 'app.upsert'
export const OP_REMOVE = 'app.remove'
export const OP_ADD_WRITER = 'writer.add'

// A catalog op is tiny metadata; anything larger is almost certainly abuse.
export const MAX_OP_BYTES = 16 * 1024
const MAX_STR = 4096
const MAX_CATEGORIES = 32

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

export function opByteLength (op) {
  try { return Buffer.byteLength(JSON.stringify(op)) } catch { return Infinity }
}

// Whitelist + clamp an app record. Drops unknown keys (incl. pollution keys),
// coerces types, and bounds sizes. Returns a fresh null-proto-free object.
export function sanitizeApp (app) {
  const out = {}
  const src = (app && typeof app === 'object') ? app : {}
  for (const field of APP_STRING_FIELDS) out[field] = clampStr(src[field])
  const cats = Array.isArray(src.categories) ? src.categories : []
  out.categories = cats.filter((c) => typeof c === 'string').slice(0, MAX_CATEGORIES).map((c) => clampStr(c, 128))
  return out
}

function appIdOf (app) {
  return (app && (app.id || app.driveKey || app.link) ? String(app.id || app.driveKey || app.link) : '').trim()
}

// --- Op constructors ------------------------------------------------------

export function renameOp (name) {
  return { v: SCHEMA_VERSION, type: OP_RENAME, name: clampStr(String(name || '')) }
}

export function upsertOp (app) {
  const clean = sanitizeApp(app)
  const id = appIdOf(clean)
  return { v: SCHEMA_VERSION, type: OP_UPSERT, id, app: { ...clean, id } }
}

export function removeOp (id) {
  return { v: SCHEMA_VERSION, type: OP_REMOVE, id: clampStr(String(id || '')) }
}

export function addWriterOp (keyHex) {
  return { v: SCHEMA_VERSION, type: OP_ADD_WRITER, key: clampStr(String(keyHex || ''), 64) }
}

// --- Validation -----------------------------------------------------------
//
// Returns one of:
//   { ok: true }                      → apply it
//   { ok: false, retain: true, ... }  → keep in log, ignore in view
//                                        (unknown version/type — forward-compat)
//   { ok: false, retain: false, ... } → reject before append (abuse/malformed)

export function validateOp (op) {
  if (!op || typeof op !== 'object' || Array.isArray(op)) {
    return { ok: false, retain: false, reason: 'not-an-object' }
  }
  if (hasUnsafeKey(op)) return { ok: false, retain: false, reason: 'prototype-pollution' }
  if (opByteLength(op) > MAX_OP_BYTES) return { ok: false, retain: false, reason: 'oversized' }

  // Forward-compat: unknown schema versions are retained but not applied.
  if (op.v !== SCHEMA_VERSION) return { ok: false, retain: true, reason: 'unknown-version' }

  switch (op.type) {
    case OP_RENAME:
      if (typeof op.name !== 'string') return { ok: false, retain: false, reason: 'rename-needs-name' }
      return { ok: true }
    case OP_UPSERT: {
      if (!op.app || typeof op.app !== 'object') return { ok: false, retain: false, reason: 'upsert-needs-app' }
      const id = String(op.id || '').trim()
      if (!id) return { ok: false, retain: false, reason: 'upsert-needs-id' }
      // Identity must be self-consistent and present.
      if (String(op.app.id || '').trim() !== id) return { ok: false, retain: false, reason: 'id-mismatch' }
      if (!String(op.app.driveKey || '').trim() && !String(op.app.link || '').trim()) {
        return { ok: false, retain: false, reason: 'missing-drivekey' }
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
