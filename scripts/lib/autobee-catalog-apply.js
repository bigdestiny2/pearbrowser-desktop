// Deterministic reducer for the Autobee collaborative catalog (PURE).
//
// Folds an ORDERED op log into the materialized catalog view, then projects
// it into the same `data` DTO the browser already consumes for Hyperdrive /
// Hyperbee catalogs (so ExploreScreen needs no special-casing).
//
// Determinism (docs/AUTOBEE-RESEARCH.md "Design Constraints"):
//   - No wall-clock anywhere. Order comes from Autobase's linearization,
//     modeled here by a node tag (writer key + per-writer seq). Identical
//     op sets in identical order ⇒ identical view, on every device and after
//     every restart.
//   - Conflict rules ("Conflict rules for first spike"):
//       · catalog name      → last applied op in order wins
//       · upsert vs remove  → later op in order wins
//       · app metadata      → whole-record replacement (no field merge)
//       · app id/driveKey   → stable identity; metadata edits cannot change it
//       · unknown op types  → retained in the log, ignored in the view

import {
  OP_RENAME, OP_UPSERT, OP_REMOVE,
  validateOp, sanitizeApp
} from './autobee-catalog-ops.js'

const DEFAULT_NAME = 'Collaborative Catalog'

function cmp (a, b) { return a < b ? -1 : a > b ? 1 : 0 }

function stableStringify (op) {
  try { return JSON.stringify(op, Object.keys(op).sort()) } catch { return String(op) }
}

/**
 * Total order over Autobase-style tagged nodes — { writer, seq, op } — with
 * NO wall-clock input. Lower seq first; ties broken by writer key, then by a
 * stable serialization of the op. This is the spike's answer to "define
 * deterministic op order without local timestamps": both devices see the
 * same (writer, seq) tags from Autobase, so both compute the same order.
 */
export function linearize (tagged) {
  return [...tagged].sort((a, b) =>
    (a.seq - b.seq) ||
    cmp(String(a.writer), String(b.writer)) ||
    cmp(stableStringify(a.op), stableStringify(b.op))
  )
}

/**
 * Fold an ordered list of plain ops into a view. Invalid/unknown ops are
 * skipped (but the caller keeps them in the log). Returns
 * { name, version, apps: [...] } with apps in stable insertion order.
 */
export function applyView (orderedOps) {
  let name = DEFAULT_NAME
  const version = 1
  const apps = new Map() // id → app record (insertion-ordered)

  for (const op of orderedOps || []) {
    const verdict = validateOp(op)
    if (!verdict.ok) continue

    if (op.type === OP_RENAME) {
      name = op.name // last-in-order wins
    } else if (op.type === OP_UPSERT) {
      const clean = sanitizeApp(op.app)
      clean.id = op.id
      const prior = apps.get(op.id)
      if (prior) {
        // Stable identity: id + driveKey are fixed once established.
        clean.id = prior.id
        clean.driveKey = prior.driveKey || clean.driveKey
      }
      apps.set(op.id, clean)
    } else if (op.type === OP_REMOVE) {
      apps.delete(op.id) // later remove wins; a later upsert would re-add
    }
    // OP_ADD_WRITER and unknown types: no effect on the catalog view.
  }

  return { name, version, apps: [...apps.values()] }
}

/** Linearize tagged nodes then fold — the full path Autobase.apply mirrors. */
export function applyTagged (tagged) {
  return applyView(linearize(tagged).map((t) => t.op))
}

/**
 * Project a view into the Apps DTO shape (matches loadCatalogBee's `data`),
 * with explicit writable/read-only semantics per the design constraints.
 */
export function toCatalogData (view, keyHex = '', writable = false) {
  const apps = Array.isArray(view?.apps) ? view.apps : []
  return {
    version: view?.version ?? 1,
    name: view?.name ?? DEFAULT_NAME,
    source: 'autobee',
    sourceKey: keyHex,
    writable: !!writable,
    apps,
    count: { total: apps.length, apps: apps.length }
  }
}
