// Hardening tests for the schema-sheets read path (design Risk #2 — JMESPath
// injection, and Risk #9 — full-scan amplification). Covers the validation
// chokepoint (safeJmesPath) and listApps()'s scan bound + error wrapping using
// a stubbed `sheets` handle, so no relay/swarm/Corestore is needed.
import test from 'node:test'
import assert from 'node:assert/strict'
import sheetsCatalog from '../backend/sheets-catalog.js'

const { SheetsCatalog, safeJmesPath, MAX_QUERY_LEN, MAX_SHEETS_ROWS } = sheetsCatalog

test('safeJmesPath treats empty/absent query as "no filter"', () => {
  assert.equal(safeJmesPath(undefined), undefined)
  assert.equal(safeJmesPath(null), undefined)
  assert.equal(safeJmesPath(''), undefined)
})

test('safeJmesPath rejects non-string queries instead of coercing them', () => {
  assert.throws(() => safeJmesPath(123), /must be a string/)
  assert.throws(() => safeJmesPath({}), /must be a string/)
  assert.throws(() => safeJmesPath(['x']), /must be a string/)
  assert.throws(() => safeJmesPath(true), /must be a string/)
})

test('safeJmesPath caps query length', () => {
  assert.throws(() => safeJmesPath('['.repeat(MAX_QUERY_LEN + 1)), /too long/)
})

test('safeJmesPath rejects backticks and non-whitelisted shapes', () => {
  assert.throws(() => safeJmesPath('[?name==`evil`]'), /Unsupported/)   // raw literal
  assert.throws(() => safeJmesPath('name'), /Unsupported/)               // not a [?…] filter
  assert.throws(() => safeJmesPath('[?to_string(@)]'), /Unsupported/)    // builtin call w/ @ ref
})

test('safeJmesPath accepts a whitelisted filter unchanged', () => {
  const q = "[?type=='standalone']"
  assert.equal(safeJmesPath(q), q)
  assert.equal(safeJmesPath("[?contains(name, 'chat')]"), "[?contains(name, 'chat')]")
})

// --- listApps(): scan bound + evaluation error wrapping --------------------

function makeCatalog (listImpl) {
  const sc = new SheetsCatalog({}, null) // store/swarm unused on the read path
  sc.appsSchemaId = async () => 'apps-schema-1'
  sc.sheets = { list: listImpl }
  return sc
}

test('listApps passes a row-scan limit to sheets.list', async () => {
  let captured
  const sc = makeCatalog(async (sid, opts) => { captured = opts; return [] })
  await sc.listApps()
  assert.equal(captured.limit, MAX_SHEETS_ROWS)
  assert.equal(captured.query, undefined)

  await sc.listApps("[?type=='standalone']")
  assert.equal(captured.limit, MAX_SHEETS_ROWS)
  assert.equal(captured.query, "[?type=='standalone']")
})

test('listApps caps the returned row set at MAX_SHEETS_ROWS', async () => {
  const huge = Array.from({ length: MAX_SHEETS_ROWS + 50 }, (_, i) => ({
    uuid: 'app-' + i,
    json: { name: 'App ' + i, type: 'standalone', link: 'pear://' + i }
  }))
  const sc = makeCatalog(async () => huge)
  const apps = await sc.listApps()
  assert.equal(apps.length, MAX_SHEETS_ROWS)
})

test('listApps wraps a malformed-but-allowed query in a clean error', async () => {
  // Mimics schema-sheets compile() throwing on an expression the whitelist let
  // through (e.g. unbalanced parens) — the raw library stack must not escape.
  const sc = makeCatalog(async () => { throw new Error('Syntax error: unexpected token at 3') })
  await assert.rejects(() => sc.listApps('[?(((]'), /Invalid search query/)
})

test('listApps does NOT mask a genuine (non-query) failure', async () => {
  const sc = makeCatalog(async () => { throw new Error('storage offline') })
  await assert.rejects(() => sc.listApps(), /storage offline/)
})

test('listApps returns [] when the room has no apps schema yet', async () => {
  const sc = new SheetsCatalog({}, null)
  sc.appsSchemaId = async () => null
  sc.sheets = { list: async () => { throw new Error('should not be called') } }
  assert.deepEqual(await sc.listApps("[?type=='standalone']"), [])
})

test('listSchemas exposes sanitized schema names and ids for RPC callers', async () => {
  const sc = new SheetsCatalog({}, null)
  sc.sheets = {
    listSchemas: async () => [
      { name: 'apps', schemaId: 'schema-apps', extra: 'ignored' },
      { name: '', schemaId: 'empty-name' },
      { name: 'missing-id' },
      { name: 'buffer-id', schemaId: Buffer.from([0x12, 0x34]) }
    ]
  }
  assert.deepEqual(await sc.listSchemas(), [
    { name: 'apps', schemaId: 'schema-apps' },
    { name: 'buffer-id', schemaId: '1234' }
  ])
})
