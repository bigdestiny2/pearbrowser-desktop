#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const FEATURE_FLAG = 'PEARBROWSER_PER_DRIVE_ORIGINS=1'
export const PROOF_KEY = 'pear-origin-isolation-proof'

export function analyzeOriginIsolationSmokeEvidence (evidence) {
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
  const driveA = normalizeDriveKey(appA.driveKey || driveKeyFromHyperUrl(appA.url))
  const driveB = normalizeDriveKey(appB.driveKey || driveKeyFromHyperUrl(appB.url))
  add('drive-a', !!driveA, 'app A must include a 64-hex drive key or hyper:// URL')
  add('drive-b', !!driveB, 'app B must include a 64-hex drive key or hyper:// URL')
  add('distinct-drives', !!driveA && !!driveB && driveA !== driveB, 'app A and app B must use different drive keys')

  const originA = normalizeLoopbackOrigin(appA.origin || evidence?.originSplit?.appAOrigin)
  const originB = normalizeLoopbackOrigin(appB.origin || evidence?.originSplit?.appBOrigin)
  add('origin-a', !!originA, 'app A origin must be a loopback http origin')
  add('origin-b', !!originB, 'app B origin must be a loopback http origin')
  add('origin-split', !!originA && !!originB && originA !== originB, 'app A and app B must report different loopback origins')

  const storage = evidence?.storage || {}
  const proofKey = String(storage.proofKey || evidence?.proofKey || '').trim()
  const writtenValue = String(storage.writtenValue || '').trim()
  const storageA = storage.appA || appA.storage || {}
  const storageB = storage.appB || appB.storage || {}

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
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') return ''
    if (!parsed.port) return ''
    return parsed.origin
  } catch {
    return ''
  }
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

async function main () {
  const args = parseArgs(process.argv.slice(2))
  const evidence = loadJsonFile(args.file)
  const result = analyzeOriginIsolationSmokeEvidence(evidence)
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
