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
const exportsBlock = (constantsSrc.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/) || [, ''])[1]
const backendHandlers = new Set()
for (const m of backendIndexSrc.matchAll(/rpc\.handle\(C\.(CMD_[A-Z0-9_]+)/g)) {
  backendHandlers.add(m[1])
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
