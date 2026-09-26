import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  analyzeOriginIsolationSmokeEvidence,
  FEATURE_FLAG,
  PROOF_KEY
} from '../scripts/check-origin-isolation-smoke-evidence.mjs'

const checkerPath = fileURLToPath(new URL('../scripts/check-origin-isolation-smoke-evidence.mjs', import.meta.url))
const generatorPath = fileURLToPath(new URL('../scripts/generate-origin-isolation-smoke-evidence.mjs', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

function validEvidence () {
  return {
    schemaVersion: 1,
    kind: 'pearbrowser-origin-isolation-smoke-evidence',
    featureFlag: FEATURE_FLAG,
    proofKey: PROOF_KEY,
    apps: [
      {
        label: 'Peerit',
        url: `hyper://${'a'.repeat(64)}/`,
        origin: 'http://127.0.0.1:61001'
      },
      {
        label: 'Poked',
        url: `hyper://${'b'.repeat(64)}/`,
        origin: 'http://localhost:61002'
      }
    ],
    storage: {
      capture: { kind: 'electron-webcontents', artifact: 'electron-cookie-storage-trace.json' },
      proofKey: PROOF_KEY,
      writtenValue: 'peerit-proof-value',
      appA: {
        localStorage: 'peerit-proof-value',
        cookie: `${PROOF_KEY}=peerit-proof-value; other=1`,
        indexedDB: 'peerit-proof-value'
      },
      appB: {
        localStorage: null,
        cookie: 'other=1',
        indexedDB: null
      }
    },
    strictCsp: {
      status: 'PASS',
      evidence: 'screenshot: strict-csp-app-loaded.png'
    },
    tabLifecycle: {
      status: 'PASS',
      evidence: 'screen recording: close app A then navigate app B'
    },
    realAppBridge: {
      status: 'PASS',
      evidence: 'Peerit identity/sync smoke log',
      routes: {
        identity: true,
        sync: true,
        swarmTicket: true,
        swarmEvents: true
      }
    },
    artifacts: [
      'origin-split-screenshot.png',
      'peerit-bridge-smoke.json'
    ]
  }
}

function captureFor (evidence) {
  return {
    kind: 'pearbrowser-electron-webcontents-storage-capture',
    runtime: { name: 'Electron', version: '43.2.0' },
    capturedAt: '2026-09-26T00:00:00Z',
    apps: evidence.apps.map((app, index) => ({
      webContentsId: index + 1,
      url: app.url,
      origin: app.origin,
      storage: { ...evidence.storage[index === 0 ? 'appA' : 'appB'] }
    }))
  }
}

function analyzeWithCapture (evidence) {
  const browserCapture = captureFor(evidence)
  const browserCaptureHash = createHash('sha256').update(JSON.stringify(browserCapture)).digest('hex')
  evidence.storage.capture.sha256 = browserCaptureHash
  return analyzeOriginIsolationSmokeEvidence(evidence, { browserCapture, browserCaptureHash })
}

test('operator artifact format remains blocked without trusted Electron provenance', () => {
  const result = analyzeWithCapture(validEvidence())
  assert.equal(result.ok, false)
  assert.equal(result.status, 'blocked')
  assert.ok(result.failures.some((failure) => failure.id === 'trusted-electron-capture'))
  assert.ok(result.checks.some((check) => check.id === 'browser-storage-capture-hash' && check.ok))
  assert.ok(result.checks.some((check) => check.id === 'app-b-indexeddb-isolated' && check.ok))
})

test('historical fixture cannot be relabeled into passing Electron proof', () => {
  const artifact = JSON.parse(readFileSync(new URL('../docs/origin-isolation-smoke-evidence-peerit-pearfeed-2026-07-04.json', import.meta.url), 'utf8'))
  artifact.storage.capture = { kind: 'electron-webcontents', artifact: '/nonexistent/proof.json' }
  const result = analyzeOriginIsolationSmokeEvidence(artifact)
  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.id === 'cookie-host-split'))
  assert.ok(result.failures.some((failure) => failure.id === 'browser-runtime-source'))
})

test('declared drive keys cannot override identical app URLs', () => {
  const evidence = validEvidence()
  evidence.apps[0].driveKey = 'a'.repeat(64)
  evidence.apps[1].url = evidence.apps[0].url
  evidence.apps[1].driveKey = 'b'.repeat(64)
  const result = analyzeWithCapture(evidence)
  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.id === 'drive-b-key-match'))
  assert.ok(result.failures.some((failure) => failure.id === 'distinct-drives'))
})

test('fixture simulation cannot certify browser storage isolation', () => {
  const evidence = validEvidence()
  evidence.storage.capture = { kind: 'fixture-simulation', artifact: '' }
  const result = analyzeOriginIsolationSmokeEvidence(evidence)
  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.id === 'browser-storage-capture'))
})

test('origin isolation smoke evidence fails same-origin and storage-leak artifacts', () => {
  const evidence = validEvidence()
  evidence.apps[1].origin = evidence.apps[0].origin
  evidence.storage.appB.localStorage = evidence.storage.writtenValue
  evidence.realAppBridge.routes.swarmEvents = false
  const result = analyzeOriginIsolationSmokeEvidence(evidence)

  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.id === 'origin-split'))
  assert.ok(result.failures.some((failure) => failure.id === 'app-b-localstorage-isolated'))
  assert.ok(result.failures.some((failure) => failure.id === 'bridge-swarmEvents'))
})

test('origin isolation smoke evidence validates automated verifier checks when present', () => {
  const evidence = validEvidence()
  evidence.automatedVerifier = {
    kind: 'pearbrowser-origin-isolation-automated-verifier',
    checks: [
      { id: 'origin-split', ok: true },
      { id: 'tab-lifecycle-release', ok: false }
    ]
  }
  const result = analyzeWithCapture(evidence)

  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.id === 'automated-verifier-checks'))
})

test('passing automated verifier checks still require trusted browser provenance', () => {
  const evidence = validEvidence()
  evidence.automatedVerifier = {
    kind: 'pearbrowser-origin-isolation-automated-verifier',
    checks: [
      { id: 'origin-split', ok: true },
      { id: 'tab-lifecycle-release', ok: true }
    ]
  }
  const result = analyzeWithCapture(evidence)

  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.id === 'trusted-electron-capture'))
  assert.ok(result.checks.some((check) => check.id === 'automated-verifier-kind' && check.ok))
  assert.ok(result.checks.some((check) => check.id === 'automated-verifier-checks' && check.ok))
})

test('origin isolation smoke evidence CLI exits non-zero until the proof is complete', () => {
  assert.equal(pkg.scripts?.['check:origin-isolation-smoke-evidence'], 'node scripts/check-origin-isolation-smoke-evidence.mjs')

  const fixture = mkdtempSync(join(tmpdir(), 'pear-origin-smoke-evidence-'))
  try {
    const goodPath = join(fixture, 'good.json')
    const badPath = join(fixture, 'bad.json')
    const goodEvidence = validEvidence()
    const captureJson = JSON.stringify(captureFor(goodEvidence), null, 2)
    writeFileSync(join(fixture, 'electron-cookie-storage-trace.json'), captureJson)
    goodEvidence.storage.capture.sha256 = createHash('sha256').update(captureJson).digest('hex')
    writeFileSync(goodPath, JSON.stringify(goodEvidence, null, 2))
    const bad = structuredClone(goodEvidence)
    bad.strictCsp.evidence = ''
    writeFileSync(badPath, JSON.stringify(bad, null, 2))

    const good = spawnSync(process.execPath, [checkerPath, '--file', goodPath, '--json'], {
      encoding: 'utf8'
    })
    assert.equal(good.status, 1, good.stderr || good.stdout)
    const goodReport = JSON.parse(good.stdout)
    assert.equal(goodReport.status, 'blocked')
    assert.ok(goodReport.failures.some((failure) => failure.id === 'trusted-electron-capture'))
    assert.ok(goodReport.checks.some((check) => check.id === 'browser-storage-capture-app-b' && check.ok))

    const missingCapture = structuredClone(goodEvidence)
    missingCapture.storage.capture.artifact = 'missing-trace.json'
    writeFileSync(join(fixture, 'missing.json'), JSON.stringify(missingCapture))
    const missing = spawnSync(process.execPath, [checkerPath, '--file', join(fixture, 'missing.json'), '--json'], { encoding: 'utf8' })
    assert.equal(missing.status, 1)
    assert.ok(JSON.parse(missing.stdout).failures.some((failure) => failure.id === 'browser-storage-capture'))

    const mismatchedCapture = structuredClone(goodEvidence)
    mismatchedCapture.storage.appB.cookie = `${PROOF_KEY}=peerit-proof-value`
    writeFileSync(join(fixture, 'mismatched.json'), JSON.stringify(mismatchedCapture))
    const mismatched = spawnSync(process.execPath, [checkerPath, '--file', join(fixture, 'mismatched.json'), '--json'], { encoding: 'utf8' })
    assert.equal(mismatched.status, 1)
    assert.ok(JSON.parse(mismatched.stdout).failures.some((failure) => failure.id === 'browser-storage-capture-app-b'))

    const blocked = spawnSync(process.execPath, [checkerPath, '--file', badPath, '--json'], {
      encoding: 'utf8'
    })
    assert.equal(blocked.status, 1)
    const report = JSON.parse(blocked.stdout)
    assert.equal(report.status, 'blocked')
    assert.ok(report.failures.some((failure) => failure.id === 'strict-csp'))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('origin isolation automated verifier emits checker-compatible evidence from a plan', () => {
  assert.equal(pkg.scripts?.['generate:origin-isolation-smoke-evidence'], 'node scripts/generate-origin-isolation-smoke-evidence.mjs')

  const fixture = mkdtempSync(join(tmpdir(), 'pear-origin-smoke-verifier-'))
  try {
    const planPath = join(fixture, 'plan.json')
    const outPath = join(fixture, 'evidence.json')
    writeFileSync(planPath, JSON.stringify({
      kind: 'pearbrowser-origin-isolation-smoke-plan',
      apps: [
        {
          label: 'Peerit',
          url: `hyper://${'a'.repeat(64)}/`,
          driveKey: 'a'.repeat(64)
        },
        {
          label: 'Pearfeed',
          url: `hyper://${'b'.repeat(64)}/`,
          driveKey: 'b'.repeat(64)
        }
      ]
    }, null, 2))

    const generated = spawnSync(process.execPath, [
      generatorPath,
      '--plan',
      planPath,
      '--proof-value',
      'automated-origin-proof',
      '--out',
      outPath,
      '--json'
    ], {
      encoding: 'utf8'
    })
    assert.equal(generated.status, 1, generated.stderr || generated.stdout)
    const evidence = JSON.parse(readFileSync(outPath, 'utf8'))
    const stdoutEvidence = JSON.parse(generated.stdout)
    assert.equal(evidence.kind, 'pearbrowser-origin-isolation-smoke-evidence')
    assert.equal(stdoutEvidence.storage.writtenValue, 'automated-origin-proof')
    assert.notEqual(evidence.apps[0].origin, evidence.apps[1].origin)
    assert.equal(evidence.storage.appA.localStorage, 'automated-origin-proof')
    assert.equal(evidence.storage.appB.localStorage, null)
    assert.match(evidence.storage.appB.cookie, /pear-origin-isolation-proof=automated-origin-proof/)
    assert.equal(evidence.storage.capture.kind, 'fixture-simulation')
    assert.equal(evidence.realAppBridge.routes.swarmEvents, true)
    assert.equal(evidence.automatedVerifier.mode, 'local-hyperproxy-httpbridge-fixture')
    assert.ok(evidence.automatedVerifier.checks.some((check) => check.id === 'tab-lifecycle-release' && check.ok))

    const analyzed = analyzeOriginIsolationSmokeEvidence(evidence)
    assert.equal(analyzed.ok, false)
    assert.ok(analyzed.failures.some((failure) => failure.id === 'browser-storage-capture'))

    const checked = spawnSync(process.execPath, [checkerPath, '--file', outPath, '--json'], {
      encoding: 'utf8'
    })
    assert.equal(checked.status, 1, checked.stderr || checked.stdout)
    assert.equal(JSON.parse(checked.stdout).status, 'blocked')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
