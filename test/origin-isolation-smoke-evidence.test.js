import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
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
        origin: 'http://127.0.0.1:61002'
      }
    ],
    storage: {
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

test('origin isolation smoke evidence accepts a complete operator artifact', () => {
  const result = analyzeOriginIsolationSmokeEvidence(validEvidence())
  assert.equal(result.ok, true)
  assert.equal(result.status, 'verified')
  assert.equal(result.failures.length, 0)
  assert.ok(result.checks.some((check) => check.id === 'origin-split' && check.ok))
  assert.ok(result.checks.some((check) => check.id === 'app-b-indexeddb-isolated' && check.ok))
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
  const result = analyzeOriginIsolationSmokeEvidence(evidence)

  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.id === 'automated-verifier-checks'))
})

test('origin isolation smoke evidence accepts passing automated verifier checks', () => {
  const evidence = validEvidence()
  evidence.automatedVerifier = {
    kind: 'pearbrowser-origin-isolation-automated-verifier',
    checks: [
      { id: 'origin-split', ok: true },
      { id: 'tab-lifecycle-release', ok: true }
    ]
  }
  const result = analyzeOriginIsolationSmokeEvidence(evidence)

  assert.equal(result.ok, true)
  assert.ok(result.checks.some((check) => check.id === 'automated-verifier-kind' && check.ok))
  assert.ok(result.checks.some((check) => check.id === 'automated-verifier-checks' && check.ok))
})

test('origin isolation smoke evidence CLI exits non-zero until the proof is complete', () => {
  assert.equal(pkg.scripts?.['check:origin-isolation-smoke-evidence'], 'node scripts/check-origin-isolation-smoke-evidence.mjs')

  const fixture = mkdtempSync(join(tmpdir(), 'pear-origin-smoke-evidence-'))
  try {
    const goodPath = join(fixture, 'good.json')
    const badPath = join(fixture, 'bad.json')
    writeFileSync(goodPath, JSON.stringify(validEvidence(), null, 2))
    const bad = validEvidence()
    bad.strictCsp.evidence = ''
    writeFileSync(badPath, JSON.stringify(bad, null, 2))

    const good = spawnSync(process.execPath, [checkerPath, '--file', goodPath, '--json'], {
      encoding: 'utf8'
    })
    assert.equal(good.status, 0, good.stderr || good.stdout)
    assert.equal(JSON.parse(good.stdout).status, 'verified')

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
    assert.equal(generated.status, 0, generated.stderr || generated.stdout)
    const evidence = JSON.parse(readFileSync(outPath, 'utf8'))
    const stdoutEvidence = JSON.parse(generated.stdout)
    assert.equal(evidence.kind, 'pearbrowser-origin-isolation-smoke-evidence')
    assert.equal(stdoutEvidence.storage.writtenValue, 'automated-origin-proof')
    assert.notEqual(evidence.apps[0].origin, evidence.apps[1].origin)
    assert.equal(evidence.storage.appA.localStorage, 'automated-origin-proof')
    assert.equal(evidence.storage.appB.localStorage, null)
    assert.equal(evidence.realAppBridge.routes.swarmEvents, true)
    assert.equal(evidence.automatedVerifier.mode, 'local-hyperproxy-httpbridge-fixture')
    assert.ok(evidence.automatedVerifier.checks.some((check) => check.id === 'tab-lifecycle-release' && check.ok))

    const analyzed = analyzeOriginIsolationSmokeEvidence(evidence)
    assert.equal(analyzed.ok, true)

    const checked = spawnSync(process.execPath, [checkerPath, '--file', outPath, '--json'], {
      encoding: 'utf8'
    })
    assert.equal(checked.status, 0, checked.stderr || checked.stdout)
    assert.equal(JSON.parse(checked.stdout).status, 'verified')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
