'use strict'

// Pure helpers for the chrome-owned wallet read commands (CMD_WALLET_ADDRESS /
// BALANCES / TRANSACTIONS in backend/index.js). Factored out of the RPC
// handlers so they are unit-testable without booting the worklet — index.js
// is not loadable under plain node.
//
//   normalizeListLimit      CMD_WALLET_TRANSACTIONS { limit? } validation
//   projectJournalEntry     journal entry → chrome-safe activity record
//   projectJournalEntries   list projection (drops unprojectable entries)
//   balancesUnavailable     engine-offline fallback payload for BALANCES

const DEFAULT_LIST_LIMIT = 50
const MAX_LIST_LIMIT = 200

// listRecent() takes an optional limit; absent means the default, anything
// else must be a safe positive integer bounded so a chrome typo cannot scan
// the whole journal. Returns null for invalid input (handler throws
// bad-request).
function normalizeListLimit (limit) {
  if (limit === undefined || limit === null) return DEFAULT_LIST_LIMIT
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) return null
  return limit
}

// Journal entries carry only sanitized lifecycle records (see
// wallet-journal.cjs — secrets are rejected at append time), but the chrome
// activity feed needs even less: project each entry down to the display
// fields so new journal fields never leak to the renderer by accident.
function projectJournalEntry (entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
  if (typeof entry.type !== 'string') return null
  const out = { type: entry.type, ts: Number.isSafeInteger(entry.ts) ? entry.ts : null }
  if (typeof entry.intentId === 'string') out.intentId = entry.intentId
  if (typeof entry.driveKey === 'string') out.driveKey = entry.driveKey
  if (typeof entry.intentType === 'string') out.intentType = entry.intentType
  if (typeof entry.transactionHash === 'string') out.transactionHash = entry.transactionHash
  if (typeof entry.state === 'string') out.state = entry.state
  // Payment intents: surface the amount/recipient the user approved — the
  // only intent fields the activity list displays.
  if (entry.type === 'intent' && entry.intentType === 'payment' && entry.intent && typeof entry.intent === 'object') {
    if (typeof entry.intent.amountAtomic === 'string') out.amountAtomic = entry.intent.amountAtomic
    if (typeof entry.intent.recipient === 'string') out.recipient = entry.intent.recipient
  }
  return out
}

function projectJournalEntries (entries) {
  if (!Array.isArray(entries)) return []
  const out = []
  for (const entry of entries) {
    const projected = projectJournalEntry(entry)
    if (projected) out.push(projected)
  }
  return out
}

// Balance reads hit the live chain RPC through the EVM worklet; when the
// network is down the read must degrade, not fail the settings screen.
// Follows the service's outcome-code convention: keep the engine's coded
// error, fall back to operation-failed.
function balancesUnavailable (err) {
  const code = typeof err?.code === 'string' ? err.code : 'operation-failed'
  return { unavailable: true, code }
}

module.exports = {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  normalizeListLimit,
  projectJournalEntry,
  projectJournalEntries,
  balancesUnavailable
}
