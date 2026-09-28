#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import driveOrigin from '../backend/drive-origin.cjs'

const { driveHostnameForKey, isDriveOriginHostname } = driveOrigin

export const FEATURE_FLAG = 'PEARBROWSER_PER_DRIVE_ORIGINS=1'
export const PROOF_KEY = 'pear-origin-isolation-proof'

export function analyzeOriginIsolationSmokeEvidence (evidence, { browserCapture = null, browserCaptureHash = '' } = {}) {
  const failures = []
  const warnings = []
  const checks = []

  const add = (id, ok, detail) => {
    checks.push({ id, ok, detail })
    if (!ok) failures.push({ id, detail })
  }

  add('kind', evidence?.kind === 'pearbrowser-origin-isolation-smoke-evidence', 'kind must be pearbrowser-origin-isolation-smoke-evidence')
  add('feature-flag', evidence?.featureFlag === FEATURE_FLAG, `featureFlag must be ${FEATURE_FLAG}`)

  const apps = Array.isArray(evidence?.apps) ? evidence.apps : []
  add('apps-count', apps.length === 2, 'evidence must include exactly two apps')

  const [appA = {}, appB = {}] = apps
  const driveA = driveKeyFromHyperUrl(appA.url)
  const driveB = driveKeyFromHyperUrl(appB.url)
  add('drive-a', !!driveA, 'app A URL must be hyper://<64-hex-drive-key>/...')
  add('drive-b', !!driveB, 'app B URL must be hyper://<64-hex-drive-key>/...')
  add('drive-a-key-match', !appA.driveKey || normalizeDriveKey(appA.driveKey) === driveA, 'app A declared driveKey must match its hyper:// URL')
  add('drive-b-key-match', !appB.driveKey || normalizeDriveKey(appB.driveKey) === driveB, 'app B declared driveKey must match its hyper:// URL')
  add('distinct-drives', !!driveA && !!driveB && driveA !== driveB, 'app A and app B URLs must contain different drive keys')

  const originA = normalizeLoopbackOrigin(appA.origin || evidence?.originSplit?.appAOrigin)
  const originB = normalizeLoopbackOrigin(appB.origin || evidence?.originSplit?.appBOrigin)
  add('origin-a', !!originA, 'app A origin must be a loopback http origin')
  add('origin-b', !!originB, 'app B origin must be a loopback http origin')
  add('origin-split', !!originA && !!originB && originA !== originB, 'app A and app B must report different loopback origins')
  add('drive-host-a', originMatchesDrive(originA, driveA), 'app A origin host must encode its exact drive key')
  add('drive-host-b', originMatchesDrive(originB, driveB), 'app B origin host must encode its exact drive key')
  // In the current single Electron session, ports do not partition cookies.
  // A future partitioned-session design needs a separately reviewed gate.
  add('cookie-host-split', !!originA && !!originB && new URL(originA).hostname !== new URL(originB).hostname, 'different ports on one loopback host share cookies; distinct cookie hosts are required')
  add('browser-runtime-source', evidence?.automatedVerifier?.mode !== 'local-hyperproxy-httpbridge-fixture', 'local HyperProxy/HttpBridge fixtures cannot certify Chromium storage')

  const storage = evidence?.storage || {}
  const capture = storage.capture || {}
  add('browser-storage-capture', capture.kind === 'electron-webcontents' && String(capture.artifact || '').trim().length > 0 && browserCapture?.kind === 'pearbrowser-electron-webcontents-storage-capture', 'storage isolation requires a readable Electron WebContents capture JSON; fixture simulations and a path alone are not browser proof')
  add('browser-storage-capture-hash', /^[0-9a-f]{64}$/.test(String(capture.sha256 || '')) && capture.sha256 === browserCaptureHash, 'storage.capture.sha256 must match the capture file bytes')
  add('browser-storage-capture-runtime', browserCapture?.runtime?.name === 'Electron' && /^\d+\./.test(String(browserCapture?.runtime?.version || '')) && !!browserCapture?.capturedAt, 'capture must record the Electron runtime version and capture time')
  // The JSON and digest are operator supplied. Neither proves that Electron produced them.
  // Keep release acceptance blocked until a trusted runtime capture/review flow exists.
  add('trusted-electron-capture', false, 'capture provenance cannot be verified by this checker; capture from the exact signed public-trust package and independent reviewer attestation are required')
  const proofKey = String(storage.proofKey || evidence?.proofKey || '').trim()
  const writtenValue = String(storage.writtenValue || '').trim()
  const storageA = storage.appA || appA.storage || {}
  const storageB = storage.appB || appB.storage || {}
  const capturedApps = Array.isArray(browserCapture?.apps) ? browserCapture.apps : []
  add('browser-storage-capture-app-a', captureMatchesApp(capturedApps[0], appA, originA, storageA), 'capture app A frame URL, origin, and measured storage must match the evidence')
  add('browser-storage-capture-app-b', captureMatchesApp(capturedApps[1], appB, originB, storageB), 'capture app B frame URL, origin, and measured storage must match the evidence')
  add('browser-storage-capture-distinct-frames', capturedApps.length === 2 && validFrameId(capturedApps[0]?.frameId) && validFrameId(capturedApps[1]?.frameId) && capturedApps[0].frameId !== capturedApps[1].frameId, 'the two app pages must be captured from distinct iframe IDs; both may share one Electron WebContents')

  add('proof-key', proofKey === PROOF_KEY, `storage.proofKey must be ${PROOF_KEY}`)
  add('written-value', writtenValue.length > 0, 'storage.writtenValue must be present')
  add('app-a-localstorage', writtenValue.length > 0 && storageValue(storageA.localStorage) === writtenValue, 'app A localStorage must contain the written proof value')
  add('app-a-indexeddb', writtenValue.length > 0 && storageValue(storageA.indexedDB) === writtenValue, 'app A IndexedDB must contain the written proof value')
  add('app-a-cookie', writtenValue.length > 0 && cookieContains(storageA.cookie, proofKey, writtenValue), 'app A cookie must contain the written proof value')
  add('app-b-localstorage-isolated', !storageEquals(storageB.localStorage, writtenValue), 'app B localStorage must not contain the app A proof value')
  add('app-b-indexeddb-isolated', !storageEquals(storageB.indexedDB, writtenValue), 'app B IndexedDB must not contain the app A proof value')
  add('app-b-cookie-isolated', !cookieContains(storageB.cookie, proofKey, writtenValue), 'app B cookie must not contain the app A proof value')

  addEvidenceStatus(add, 'strict-csp', evidence?.strictCsp, 'strict-CSP real-app compatibility must be PASS with evidence')
  addEvidenceStatus(add, 'tab-lifecycle', evidence?.tabLifecycle, 'tab close/navigation lifecycle must be PASS with evidence')

  const bridge = evidence?.realAppBridge || {}
  addEvidenceStatus(add, 'real-app-bridge', bridge, 'real app bridge proof must be PASS with evidence')
  const routes = bridge.routes || {}
  for (const route of ['identity', 'sync', 'swarmTicket', 'swarmEvents']) {
    add(`bridge-${route}`, routes[route] === true, `realAppBridge.routes.${route} must be true`)
  }

  if (!Array.isArray(evidence?.artifacts) || evidence.artifacts.length === 0) {
    warnings.push({
      id: 'artifacts',
      detail: 'evidence.artifacts is empty; include screenshot/log paths before using this as release evidence'
    })
  }

  if (evidence?.automatedVerifier !== undefined) {
    const verifier = evidence.automatedVerifier || {}
    const verifierChecks = Array.isArray(verifier.checks) ? verifier.checks : []
    add('automated-verifier-kind', verifier.kind === 'pearbrowser-origin-isolation-automated-verifier', 'automatedVerifier.kind must be pearbrowser-origin-isolation-automated-verifier')
    add('automated-verifier-checks', verifierChecks.length > 0 && verifierChecks.every((check) => check?.ok === true), 'automatedVerifier.checks must be present and all ok')
  }

  return {
    ok: failures.length === 0,
    status: failures.length === 0 ? 'verified' : 'blocked',
    checks,
    failures,
    warnings
  }
}

function addEvidenceStatus (add, id, value, detail) {
  const status = normalizeStatus(value?.status)
  const evidence = String(value?.evidence || '').trim()
  add(id, status === 'PASS' && evidence.length > 0, detail)
}

function normalizeDriveKey (value) {
  const key = String(value || '').trim().toLowerCase()
  return /^[0-9a-f]{64}$/.test(key) ? key : ''
}

function driveKeyFromHyperUrl (value) {
  const match = String(value || '').trim().match(/^hyper:\/\/([0-9a-f]{64})(?:\/|$)/i)
  return match ? match[1].toLowerCase() : ''
}

function normalizeLoopbackOrigin (value) {
  try {
    const parsed = new URL(String(value || '').trim())
    if (parsed.protocol !== 'http:') return ''
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost' && !isDriveOriginHostname(parsed.hostname)) return ''
    if (!parsed.port) return ''
    return parsed.origin
  } catch {
    return ''
  }
}

function originMatchesDrive (origin, key) {
  return !!origin && !!key && new URL(origin).hostname === driveHostnameForKey(key)
}

function normalizeStatus (value) {
  return String(value || '').trim().toUpperCase()
}

function storageValue (value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function storageEquals (value, expected) {
  return storageValue(value) === String(expected || '')
}

function cookieContains (cookie, key, value) {
  const haystack = String(cookie || '')
  if (!key || !value) return false
  return haystack.split(/;\s*/).some((part) => part === `${key}=${value}`)
}

function validFrameId (value) {
  return typeof value === 'string' && value.trim().length > 0
}

function frameUrlMatchesApp (frameUrl, app, origin) {
  const key = driveKeyFromHyperUrl(app?.url)
  if (!key || !origin) return false
  try {
    const parsed = new URL(String(frameUrl || ''))
    return parsed.origin === origin &&
      !parsed.username && !parsed.password &&
      new RegExp(`^/(?:hyper|app)/${key}(?:/|$)`, 'i').test(parsed.pathname)
  } catch {
    return false
  }
}

function captureMatchesApp (captured, app, origin, storage) {
  if (!captured || !app || !origin || !storage) return false
  if (!Number.isInteger(captured.webContentsId) || captured.webContentsId < 1) return false
  if (!validFrameId(captured.frameId) || !frameUrlMatchesApp(captured.frameUrl, app, origin)) return false
  if (captured.url !== app.url || normalizeLoopbackOrigin(captured.origin) !== origin) return false
  if (!captured.storage || !Object.hasOwn(captured.storage, 'localStorage') || !Object.hasOwn(captured.storage, 'indexedDB') || !Object.hasOwn(captured.storage, 'cookie')) return false
  return ['localStorage', 'indexedDB', 'cookie'].every((key) => captured.storage[key] === storage[key])
}

function parseArgs (argv) {
  const args = { file: '', json: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--file') args.file = requireValue(argv, ++i, arg)
    else if (arg === '--json') args.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }
  if (!args.file) usage(2, '--file is required')
  return args
}

function requireValue (argv, index, flag) {
  const value = argv[index] || ''
  if (!value || value.startsWith('--')) usage(2, `${flag} requires a value`)
  return value
}

function usage (code, message = '') {
  if (message) console.error(`error: ${message}`)
  console.error('usage: node scripts/check-origin-isolation-smoke-evidence.mjs --file origin-isolation-smoke-evidence.json [--json]')
  process.exit(code)
}

function printReport (result, file) {
  console.log(`Origin isolation smoke evidence: ${file}`)
  console.log(`Status: ${result.status}`)
  console.log(`Checks: ${result.checks.filter((check) => check.ok).length}/${result.checks.length}`)
  if (result.failures.length) {
    console.log()
    console.log('Failures')
    for (const failure of result.failures) console.log(`  - ${failure.id}: ${failure.detail}`)
  }
  if (result.warnings.length) {
    console.log()
    console.log('Warnings')
    for (const warning of result.warnings) console.log(`  - ${warning.id}: ${warning.detail}`)
  }
}

function loadJsonFile (file) {
  const url = new URL(file, pathToFileURL(process.cwd() + '/'))
  return JSON.parse(readFileSync(url, 'utf8'))
}

function loadBrowserCapture (evidence, evidenceFile) {
  const artifact = evidence?.storage?.capture?.artifact
  if (typeof artifact !== 'string' || !artifact.trim()) return {}
  try {
    const evidenceUrl = new URL(evidenceFile, pathToFileURL(process.cwd() + '/'))
    const artifactUrl = new URL(artifact, evidenceUrl)
    if (artifactUrl.protocol !== 'file:') return {}
    const bytes = readFileSync(artifactUrl)
    return {
      browserCapture: JSON.parse(bytes.toString('utf8')),
      browserCaptureHash: createHash('sha256').update(bytes).digest('hex')
    }
  } catch {
    return {}
  }
}

export function checkOriginIsolationEvidenceFile (file) {
  const evidence = loadJsonFile(file)
  return analyzeOriginIsolationSmokeEvidence(evidence, loadBrowserCapture(evidence, file))
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  const result = checkOriginIsolationEvidenceFile(args.file)
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else printReport(result, args.file)
  if (!result.ok) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : String(err))
    process.exit(1)
  })
}
