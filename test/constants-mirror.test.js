// Constant-drift guard (IMPLEMENTATION-PLAN §6 risk: "constants.js vs boot.js
// drift → silent RPC breakage"). Every CMD_/EVT_ the UI declares in ui/boot.js
// MUST agree with backend/constants.js. The UI map is intentionally a SUBSET
// (the backend has handlers the UI never calls), so we assert:
//   1. every CMD_/EVT_ key in boot.js exists in constants.js with the SAME id
//   2. boot.js declares no CMD_/EVT_ that is absent from constants.js
//   3. each mirrored CMD_ is actually EXPORTED from constants.js (the
//      defined-but-unexported bug class the plan flagged for MAX_SHEETS_ROWS)
// Both files are read as TEXT, never imported: constants.js uses module.exports
// under a "type":"module" package (loads only under Bare) and boot.js executes
// browser-only code at module load — neither is importable from a Node test.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const constantsSrc = readFileSync(new URL('../backend/constants.js', import.meta.url), 'utf8')
const bootSrc = readFileSync(new URL('../ui/boot.js', import.meta.url), 'utf8')
const backendIndexSrc = readFileSync(new URL('../backend/index.js', import.meta.url), 'utf8')
const paymentsResearchSrc = readFileSync(new URL('../docs/research/payments.md', import.meta.url), 'utf8')
const wdkSpecSrc = readFileSync(new URL('../docs/WDK_WALLET_V0.9_SPEC.md', import.meta.url), 'utf8')

// `const CMD_X = 250` / `const EVT_X = 100` definitions in constants.js.
const backendIds = {}
for (const m of constantsSrc.matchAll(/\bconst\s+(CMD_[A-Z0-9_]+|EVT_[A-Z0-9_]+)\s*=\s*(\d+)/g)) {
  backendIds[m[1]] = Number(m[2])
}

// `CMD_X: 250` pairs in boot.js's C map (these identifiers appear nowhere else).
const bootIds = {}
for (const m of bootSrc.matchAll(/\b(CMD_[A-Z0-9_]+|EVT_[A-Z0-9_]+)\s*:\s*(\d+)/g)) {
  bootIds[m[1]] = Number(m[2])
}

// The `module.exports = { ... }` block, to confirm a const is actually surfaced.
const exportsBlock = constantsSrc.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/)?.[1] || ''
const backendHandlers = new Set()
for (const m of backendIndexSrc.matchAll(/rpc\.handle\(C\.(CMD_[A-Z0-9_]+)/g)) {
  backendHandlers.add(m[1])
}

const paymentsRpcBlock = paymentsResearchSrc.match(/### 7\.6 RPC commands[\s\S]*?```([\s\S]*?)```/)?.[1] || ''
const proposedPaymentIds = {}
const proposedPaymentEntries = []
for (const m of paymentsRpcBlock.matchAll(/\b(CMD_[A-Z0-9_]+)\s*=\s*(\d+)/g)) {
  proposedPaymentIds[m[1]] = Number(m[2])
  proposedPaymentEntries.push([m[1], Number(m[2])])
}

const wdkRpcBlock = wdkSpecSrc.match(/Proposed RPC allocation[\s\S]*?```text([\s\S]*?)```/)?.[1] || ''
const proposedWdkIds = {}
const proposedWdkEntries = []
for (const m of wdkRpcBlock.matchAll(/^\s*(\d+)\s+(CMD_[A-Z0-9_]+|EVT_[A-Z0-9_]+)\s*$/gm)) {
  proposedWdkIds[m[2]] = Number(m[1])
  proposedWdkEntries.push([m[2], Number(m[1])])
}

function reservationConflicts (proposed) {
  const liveNameByNamespaceAndId = new Map(Object.entries(backendIds)
    .map(([name, id]) => [`${name.slice(0, 3)}:${id}`, name]))
  const conflicts = []
  for (const [name, id] of Object.entries(proposed)) {
    const liveName = liveNameByNamespaceAndId.get(`${name.slice(0, 3)}:${id}`)
    if (liveName !== undefined && liveName !== name) conflicts.push(`${name}=${id} conflicts with ${liveName}`)
  }
  return conflicts
}

function reservationDuplicates (entries) {
  const names = new Set()
  const nameByNamespaceAndId = new Map()
  const duplicates = []
  for (const [name, id] of entries) {
    if (names.has(name)) duplicates.push(`${name} is declared more than once`)
    names.add(name)
    const key = `${name.slice(0, 3)}:${id}`
    const previous = nameByNamespaceAndId.get(key)
    if (previous !== undefined) duplicates.push(`${previous} and ${name} both reserve ${id}`)
    else nameByNamespaceAndId.set(key, name)
  }
  return duplicates
}

test('both maps parsed (regexes actually matched)', () => {
  assert.ok(Object.keys(backendIds).length > 30, 'expected constants.js to define many CMD_/EVT_')
  assert.ok(Object.keys(bootIds).length > 20, 'expected boot.js C map to parse')
})

test('every boot.js CMD_/EVT_ agrees with backend/constants.js', () => {
  const mismatches = []
  const orphans = []
  for (const [k, v] of Object.entries(bootIds)) {
    if (!(k in backendIds)) orphans.push(k)
    else if (backendIds[k] !== v) mismatches.push(`${k}: boot=${v} backend=${backendIds[k]}`)
  }
  assert.deepEqual(mismatches, [], `id mismatch (silent RPC breakage): ${mismatches.join(', ')}`)
  assert.deepEqual(orphans, [], `boot.js declares constants absent from backend: ${orphans.join(', ')}`)
})

test('no two CMD_ (or two EVT_) share an id within constants.js', () => {
  const seen = new Map()
  const dupes = []
  for (const [k, v] of Object.entries(backendIds)) {
    const bucket = k.slice(0, 3) + ':' + v // CMD: / EVT: bucket
    if (seen.has(bucket)) dupes.push(`${seen.get(bucket)} & ${k} both = ${v}`)
    else seen.set(bucket, k)
  }
  assert.deepEqual(dupes, [], `duplicate ids: ${dupes.join(', ')}`)
})

test('N1 naming commands: mirrored in both maps AND exported', () => {
  for (const [k, v] of [
    ['CMD_NAME_RESOLVE', 250],
    ['CMD_NAME_PETNAME_LIST', 251],
    ['CMD_NAME_PETNAME_SET', 252],
    ['CMD_NAME_PETNAME_REMOVE', 253]
  ]) {
    assert.equal(backendIds[k], v, `${k} should be ${v} in constants.js`)
    assert.equal(bootIds[k], v, `${k} should be mirrored as ${v} in boot.js`)
    assert.match(exportsBlock, new RegExp('\\b' + k + '\\b'), `${k} must be in module.exports`)
  }
})

test('every renderer command mirrored in boot.js has a backend handler', () => {
  const missing = Object.keys(bootIds)
    .filter((k) => k.startsWith('CMD_'))
    .filter((k) => !backendHandlers.has(k))
  assert.deepEqual(missing, [], `renderer commands without backend handlers: ${missing.join(', ')}`)
})

test('reserved payments proposal IDs do not collide with live commands', () => {
  assert.ok(proposedPaymentEntries.length > 10, 'expected to parse the payments RPC proposal')
  assert.deepEqual(reservationDuplicates(proposedPaymentEntries), [], 'payments proposal contains duplicate reservations')
  const conflicts = reservationConflicts(proposedPaymentIds)
  assert.deepEqual(conflicts, [], `payments RPC reservation conflicts: ${conflicts.join(', ')}`)
})

test('WDK wallet RPC and event IDs are mirrored exactly (spec §10)', () => {
  assert.equal(proposedWdkEntries.length, 17, 'expected to parse 14 WDK commands and 3 events')
  assert.deepEqual(reservationDuplicates(proposedWdkEntries), [], 'WDK proposal contains duplicate reservations')
  // Historical-collision guard: no *other* live constant may occupy a WDK id.
  const conflicts = reservationConflicts(proposedWdkIds)
  assert.deepEqual(conflicts, [], `WDK RPC reservation conflicts: ${conflicts.join(', ')}`)
  const mismatches = []
  for (const [name, id] of proposedWdkEntries) {
    if (backendIds[name] !== id) mismatches.push(`${name}: constants.js=${backendIds[name]} spec=${id}`)
    if (bootIds[name] !== id) mismatches.push(`${name}: boot.js=${bootIds[name]} spec=${id}`)
    if (!new RegExp('\\b' + name + '\\b').test(exportsBlock)) mismatches.push(`${name} missing from module.exports`)
  }
  assert.deepEqual(mismatches, [], `WDK wallet mirror drift: ${mismatches.join(', ')}`)
})

test('WDK and broader-payments proposal namespaces do not overlap each other', () => {
  assert.deepEqual(
    reservationDuplicates([...proposedPaymentEntries, ...proposedWdkEntries]),
    [],
    'WDK and broader-payments proposals contain overlapping reservations'
  )
})
