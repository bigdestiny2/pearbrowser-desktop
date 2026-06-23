// Deterministic reducer for synced browser state (bookmarks) — PURE.
//
// Folds an ORDERED op log into the materialized bookmark set. No wall-clock:
// order comes from Autobase linearization, modeled in tests by a node tag
// (writer + seq). Conflict rules:
//   · add vs remove → later op in order wins (keyed by url)
//   · bookmark record → whole-record replacement (no field merge)
//   · url is stable identity
//   · unknown op types/versions → retained in the log, ignored in the view

const { OP_ADD, OP_REMOVE, validateOp, sanitizeBookmark } = require('./browser-state-ops.cjs')

function cmp (a, b) { return a < b ? -1 : a > b ? 1 : 0 }
function stableStringify (op) {
  try { return JSON.stringify(op, Object.keys(op).sort()) } catch { return String(op) }
}

// Total order over Autobase-style tagged nodes — { writer, seq, op } — with
// NO wall-clock input. Both replicas see the same tags, so both agree.
function linearize (tagged) {
  return [...tagged].sort((a, b) =>
    (a.seq - b.seq) ||
    cmp(String(a.writer), String(b.writer)) ||
    cmp(stableStringify(a.op), stableStringify(b.op))
  )
}

function applyView (orderedOps) {
  const bookmarks = new Map() // url → record (insertion-ordered)
  for (const op of orderedOps || []) {
    const verdict = validateOp(op)
    if (!verdict.ok) continue
    if (op.type === OP_ADD) {
      bookmarks.set(op.url, { ...sanitizeBookmark(op.bookmark), url: op.url })
    } else if (op.type === OP_REMOVE) {
      bookmarks.delete(op.url)
    }
  }
  return { bookmarks: [...bookmarks.values()] }
}

function applyTagged (tagged) {
  return applyView(linearize(tagged).map((t) => t.op))
}

function toStateData (view) {
  const bookmarks = Array.isArray(view && view.bookmarks) ? view.bookmarks : []
  return { bookmarks, count: { bookmarks: bookmarks.length } }
}

module.exports = { linearize, applyView, applyTagged, toStateData }
