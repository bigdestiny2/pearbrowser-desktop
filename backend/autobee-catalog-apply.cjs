// Deterministic reducer for the Autobee collaborative catalog (PURE).
//
// CommonJS (.cjs): loadable under Bare and Node. Folds an ORDERED op log
// into the materialized catalog view, then projects it into the same `data`
// DTO the browser already consumes for Hyperdrive / Hyperbee catalogs.
//
// Determinism (docs/AUTOBEE-RESEARCH.md): no wall-clock anywhere. Order comes
// from Autobase linearization, modeled here by a node tag (writer + seq).
// Conflict rules: name last-wins; upsert/remove later-in-order wins; whole-
// record replacement; app id/driveKey are stable identity; unknown ops are
// retained in the log but ignored in the view.

const { OP_RENAME, OP_UPSERT, OP_REMOVE, validateOp, sanitizeApp } = require('./autobee-catalog-ops.cjs')
const { normalizeCatalogApp } = require('./catalog-safety.cjs')

const DEFAULT_NAME = 'Collaborative Catalog'

function cmp (a, b) { return a < b ? -1 : a > b ? 1 : 0 }

function stableStringify (op) {
  try { return JSON.stringify(op, Object.keys(op).sort()) } catch { return String(op) }
}

// Total order over Autobase-style tagged nodes — { writer, seq, op } — with
// NO wall-clock input. Both replicas see the same (writer, seq) tags, so both
// compute the same order.
function linearize (tagged) {
  return [...tagged].sort((a, b) =>
    (a.seq - b.seq) ||
    cmp(String(a.writer), String(b.writer)) ||
    cmp(stableStringify(a.op), stableStringify(b.op))
  )
}

// Fold an ordered list of plain ops into a view. Invalid/unknown ops skipped.
function applyView (orderedOps) {
  let name = DEFAULT_NAME
  const version = 1
  const apps = new Map() // id → app record (insertion-ordered)

  for (const op of orderedOps || []) {
    const verdict = validateOp(op)
    if (!verdict.ok) continue

    if (op.type === OP_RENAME) {
      name = op.name
    } else if (op.type === OP_UPSERT) {
      const clean = sanitizeApp(op.app)
      clean.id = op.id
      const prior = apps.get(op.id)
      if (prior) {
        clean.id = prior.id
        clean.driveKey = prior.driveKey || clean.driveKey
      }
      apps.set(op.id, clean)
    } else if (op.type === OP_REMOVE) {
      apps.delete(op.id)
    }
  }

  return { name, version, apps: [...apps.values()] }
}

function applyTagged (tagged) {
  return applyView(linearize(tagged).map((t) => t.op))
}

function toCatalogData (view, keyHex = '', writable = false) {
  const apps = Array.isArray(view && view.apps) ? view.apps : []
  const normalizedApps = apps
    .map((app) => normalizeCatalogApp(app, { source: 'autobee' }))
    .filter(Boolean)
  return {
    version: (view && view.version) != null ? view.version : 1,
    name: (view && view.name) || DEFAULT_NAME,
    source: 'autobee',
    sourceKey: keyHex,
    writable: !!writable,
    apps: normalizedApps,
    count: { total: normalizedApps.length, apps: normalizedApps.length }
  }
}

module.exports = { linearize, applyView, applyTagged, toCatalogData }
