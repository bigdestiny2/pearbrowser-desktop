import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APP_FULL_TARGETS,
  BUNDLE_CONTRACT_TARGETS,
  appFullCommand,
  browserStateSyncSmokeCommand,
  bundleContractCommand
} from '../scripts/lib/release-evidence-targets.mjs'
import {
  ciEvidenceFromEnv,
  desktopReleaseEvidenceGates,
  parseResultLine,
  updateMarkdownGateRows
} from '../scripts/collect-desktop-release-evidence.mjs'

test('release evidence target presets cover the live desktop app and contract gates', () => {
  assert.equal(APP_FULL_TARGETS.homepage.key, '1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d')
  assert.equal(APP_FULL_TARGETS.peercord.key, 'a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26')
  assert.equal(APP_FULL_TARGETS.keet.key, '82110be69e2a531e840bc886dc7b9cab16729c587815295f55035109b45e4ddb')
  assert.equal(BUNDLE_CONTRACT_TARGETS['peercord-linux'].appRoot, 'by-arch/linux-x64/app/peercord/resources/app')
  assert.equal(BUNDLE_CONTRACT_TARGETS['peercord-windows'].appRoot, 'by-arch/win32-x64/app/peercord/resources/app')
  assert.deepEqual(BUNDLE_CONTRACT_TARGETS['peercord-linux'].contains, [{ file: 'index.js', text: 'BrowserWindow' }])
  assert.deepEqual(BUNDLE_CONTRACT_TARGETS['peercord-windows'].absent, [{ file: 'index.js', text: 'Pear.worker.pipe' }])
})

test('desktop evidence collector runs named presets instead of raw key copies', () => {
  const gates = desktopReleaseEvidenceGates()
  assert.deepEqual(appFullCommand('homepage'), ['node', 'scripts/verify-app-full.js', 'homepage'])
  assert.deepEqual(browserStateSyncSmokeCommand(), ['node', 'scripts/browser-state-sync-smoke.js'])
  assert.deepEqual(bundleContractCommand('peercord-linux'), ['node', 'scripts/verify-pear-bundle-contract.js', 'peercord-linux'])
  assert.ok(gates.some((gate) => gate.gate === 'Desktop CI' && gate.kind === 'ci'))
  assert.ok(gates.some((gate) => gate.command?.join(' ') === 'node scripts/browser-state-sync-smoke.js'))
  assert.ok(gates.some((gate) => gate.command?.join(' ') === 'node scripts/check-relays.js --require-relay --json'))
  assert.ok(gates.some((gate) => gate.command?.join(' ') === 'node scripts/verify-app-full.js peercord'))
  assert.ok(gates.some((gate) => gate.command?.join(' ') === 'node scripts/verify-pear-bundle-contract.js peercord-windows'))
  const syncGate = gates.find((gate) => gate.command?.join(' ') === 'node scripts/browser-state-sync-smoke.js')
  assert.match(syncGate.summarize({
    devices: 3,
    bookmarks: 2,
    keylessReaderBlocked: true,
    restartDeterministic: true,
    storageAuditOk: true,
    retentionAuditOk: true,
    compactedOps: 4,
    retainedOps: 1
  }), /retention compacted \(4 ops checkpointed, 1 retained\)/)
})

test('release evidence markdown updater fills normalized gate rows', () => {
  const log = `
| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Desktop CI | install/test/audit success |  |  |
| \`node scripts/verify-app-full.js\` Peercord | sampled blobs present |  |  |
`
  const updated = updateMarkdownGateRows(log, [
    { gate: 'Desktop CI', result: 'PASS', evidence: 'GitHub Actions run https://example.test/actions/runs/1' },
    { gate: 'node scripts/verify-app-full.js Peercord', result: 'PASS', evidence: 'peers 1 | sampled 12/12' }
  ])

  assert.equal(updated.changed, 2)
  assert.match(updated.markdown, /Desktop CI \| install\/test\/audit success \| PASS \| GitHub Actions run/)
  assert.match(updated.markdown, /node scripts\/verify-app-full\.js`\s+Peercord \| sampled blobs present \| PASS \| peers 1 \/ sampled 12\/12/)
})

test('CI evidence can be emitted from GitHub Actions environment without API calls', () => {
  const record = ciEvidenceFromEnv({
    GITHUB_ACTIONS: 'true',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_REPOSITORY: 'bigdestiny2/pearbrowser-desktop',
    GITHUB_RUN_ID: '12345',
    GITHUB_SHA: 'abcdef1234567890',
    GITHUB_WORKFLOW: 'Desktop CI',
    GITHUB_JOB: 'desktop',
    GITHUB_REF_NAME: 'main'
  })

  assert.equal(record.result, 'PASS')
  assert.match(record.evidence, /npm ci, npm test, and npm audit --audit-level=high/)
  assert.match(record.evidence, /https:\/\/github\.com\/bigdestiny2\/pearbrowser-desktop\/actions\/runs\/12345/)
  assert.match(record.evidence, /abcdef123456/)
})

test('RESULT line parser reads the last machine-readable payload', () => {
  const parsed = parseResultLine('hello\nRESULT: {"ok":false}\nnoise\nRESULT: {"ok":true,"peers":2}\n')
  assert.deepEqual(parsed, { ok: true, peers: 2 })
})
