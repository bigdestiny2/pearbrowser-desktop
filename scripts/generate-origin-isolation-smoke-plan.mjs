#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const FEATURE_FLAG = 'PEARBROWSER_PER_DRIVE_ORIGINS=1'
const PROOF_KEY = 'pear-origin-isolation-proof'

const args = parseArgs(process.argv.slice(2))
const appA = parseHyperApp(args.appA, '--app-a')
const appB = parseHyperApp(args.appB, '--app-b')

if (appA.driveKey === appB.driveKey) {
  usage(2, '--app-a and --app-b must use different drive keys')
}

const report = buildPlan({
  appA: { ...appA, label: args.labelA || 'App A' },
  appB: { ...appB, label: args.labelB || 'App B' },
  runtimeCommand: args.runtimeCommand || `${FEATURE_FLAG} npm start`,
  sourcePlan: args.out || ''
})

if (args.out) writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n')
if (args.json) console.log(JSON.stringify(report, null, 2))
else printMarkdown(report)

function parseArgs (argv) {
  const parsed = {
    appA: '',
    appB: '',
    labelA: '',
    labelB: '',
    runtimeCommand: '',
    out: '',
    json: false
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--app-a') parsed.appA = requireValue(argv, ++i, arg)
    else if (arg === '--app-b') parsed.appB = requireValue(argv, ++i, arg)
    else if (arg === '--label-a') parsed.labelA = requireValue(argv, ++i, arg)
    else if (arg === '--label-b') parsed.labelB = requireValue(argv, ++i, arg)
    else if (arg === '--runtime-command') parsed.runtimeCommand = requireValue(argv, ++i, arg)
    else if (arg === '--out') parsed.out = requireValue(argv, ++i, arg)
    else if (arg === '--json') parsed.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }

  if (!parsed.appA) usage(2, '--app-a is required')
  if (!parsed.appB) usage(2, '--app-b is required')
  return parsed
}

function requireValue (argv, index, flag) {
  const value = argv[index] || ''
  if (!value || value.startsWith('--')) usage(2, `${flag} requires a value`)
  return value
}

function usage (code, message = '') {
  if (message) console.error(`error: ${message}`)
  console.error('usage: node scripts/generate-origin-isolation-smoke-plan.mjs --app-a hyper://<64-hex>/ --app-b hyper://<64-hex>/ [--label-a name] [--label-b name] [--runtime-command command] [--out report.json] [--json]')
  process.exit(code)
}

function parseHyperApp (value, label) {
  const url = String(value || '').trim()
  const match = url.match(/^hyper:\/\/([0-9a-f]{64})(?:\/.*)?$/i)
  if (!match) usage(2, `${label} must be a hyper:// URL with a 64-hex drive key`)
  return {
    url,
    driveKey: match[1].toLowerCase()
  }
}

function buildPlan ({ appA, appB, runtimeCommand, sourcePlan = '' }) {
  const writeSnippet = storageWriteSnippet(appA.label)
  const readSnippet = storageReadSnippet()
  const verifierArgs = sourcePlan
    ? `--plan ${shellQuote(sourcePlan)}`
    : `--app-a ${shellQuote(appA.url)} --app-b ${shellQuote(appB.url)} --label-a ${shellQuote(appA.label)} --label-b ${shellQuote(appB.label)}`
  const nodeVerifierCommand = `node scripts/generate-origin-isolation-smoke-evidence.mjs ${verifierArgs} --out origin-isolation-smoke-evidence.json --json`
  const npmVerifierCommand = `npm run -s generate:origin-isolation-smoke-evidence -- ${verifierArgs} --out origin-isolation-smoke-evidence.json --json`

  return {
    ok: true,
    schemaVersion: 1,
    kind: 'pearbrowser-origin-isolation-smoke-plan',
    generatedAt: new Date().toISOString(),
    package: {
      name: pkg.name,
      version: pkg.version
    },
    featureFlag: FEATURE_FLAG,
    proofKey: PROOF_KEY,
    apps: [appA, appB],
    commands: [
      {
        id: 'launch-feature-flagged-desktop',
        command: runtimeCommand,
        evidence: `PearBrowser is launched with ${FEATURE_FLAG}.`
      },
      {
        id: 'runtime-readiness',
        command: 'node scripts/runtime-rpc-smoke.mjs --timeout 20000 --max-storage-percent 100 --json',
        evidence: 'Runtime smoke JSON shows backend readiness, proxy port, and relay status.'
      },
      {
        id: 'nonvisual-app-a-navigation',
        command: `node scripts/release-rpc-story-smoke.mjs --homepage-url ${shellQuote(appA.url)} --json`,
        evidence: `${appA.label} navigates through the production RPC/proxy path without approving a third-party trust prompt.`
      },
      {
        id: 'automated-origin-isolation-evidence',
        command: nodeVerifierCommand,
        evidence: 'Automated verifier emits a pearbrowser-origin-isolation-smoke-evidence artifact that passes check:origin-isolation-smoke-evidence.'
      }
    ],
    automatedVerifier: {
      command: npmVerifierCommand,
      validatesWith: 'npm run check:origin-isolation-smoke-evidence -- --file origin-isolation-smoke-evidence.json --json',
      notes: [
        'Runs a local HyperProxy/HttpBridge harness with per-drive origins enabled.',
        'Uses the plan apps as the two drive identities and exercises origin split, strict-CSP injection, storage isolation, listener release, and bridge routes.'
      ]
    },
    manualSteps: [
      {
        id: 'open-both-apps',
        action: `Open ${appA.label} (${appA.url}) and ${appB.label} (${appB.url}) in separate PearBrowser tabs while the feature flag is enabled.`,
        evidence: 'Screenshots or console output show both tabs loaded.'
      },
      {
        id: 'origin-split',
        action: 'In each tab, record `location.origin` from DevTools.',
        evidence: 'The two origins are different loopback origins, normally different `127.0.0.1:<port>` values.'
      },
      {
        id: 'storage-write-a',
        action: `Run the write snippet in ${appA.label}.`,
        evidence: `${appA.label} reports its origin and writes localStorage, cookie, and IndexedDB proof values.`
      },
      {
        id: 'storage-read-b',
        action: `Run the read snippet in ${appB.label}.`,
        evidence: `${appB.label} reports a different origin and reads no ${PROOF_KEY} value from localStorage, cookie, or IndexedDB.`
      },
      {
        id: 'strict-csp-real-app',
        action: 'Load at least one strict-CSP real app under the feature flag.',
        evidence: 'The app loads its assets and Pear bridge without CSP console failures caused by per-drive origin mode.'
      },
      {
        id: 'tab-lifecycle',
        action: `Close ${appA.label}, or navigate its tab to ${appB.label}, then keep ${appB.label} open.`,
        evidence: 'PearBrowser stays responsive and subsequent app navigation still works, confirming the release path did not break tab-origin lifecycle behavior.'
      },
      {
        id: 'real-app-bridge',
        action: 'Run a real app bridge flow such as Peerit identity/sync under the feature flag.',
        evidence: '`/api/identity`, `/api/sync/*`, `/api/swarm/ticket`, and `/api/swarm/events?ticket=` continue to work from the per-drive origin.'
      }
    ],
    snippets: {
      writeStorageInAppA: writeSnippet,
      readStorageInAppB: readSnippet
    },
    evidenceTemplate: buildEvidenceTemplate({ appA, appB, automatedVerifierCommand: npmVerifierCommand }),
    acceptance: [
      'Feature flag is enabled for the launched desktop process.',
      'Two app tabs report different `location.origin` values.',
      'Data written in App A localStorage, cookie, and IndexedDB is not visible in App B.',
      'Strict-CSP real app compatibility is recorded.',
      'Tab close/navigation-away does not leave the browser in a broken listener state.',
      'At least one real app bridge flow still passes under the feature flag.'
    ],
    remainingIfPassed: [
      'Decide LRU/default-on listener policy.',
      'Record the smoke evidence in the release evidence log before flipping the feature flag default-on.'
    ]
  }
}

function buildEvidenceTemplate ({ appA, appB, automatedVerifierCommand }) {
  return {
    schemaVersion: 1,
    kind: 'pearbrowser-origin-isolation-smoke-evidence',
    featureFlag: FEATURE_FLAG,
    proofKey: PROOF_KEY,
    apps: [
      {
        label: appA.label,
        url: appA.url,
        driveKey: appA.driveKey,
        origin: '<record location.origin from app A>'
      },
      {
        label: appB.label,
        url: appB.url,
        driveKey: appB.driveKey,
        origin: '<record location.origin from app B>'
      }
    ],
    storage: {
      proofKey: PROOF_KEY,
      writtenValue: '<value returned by the app A write snippet>',
      appA: {
        localStorage: '<app A localStorage value>',
        cookie: '<app A document.cookie>',
        indexedDB: '<app A IndexedDB value>'
      },
      appB: {
        localStorage: null,
        cookie: '<app B document.cookie>',
        indexedDB: null
      }
    },
    strictCsp: {
      status: '<PASS>',
      evidence: '<screenshot/log path>'
    },
    tabLifecycle: {
      status: '<PASS>',
      evidence: '<screenshot/log path>'
    },
    realAppBridge: {
      status: '<PASS>',
      evidence: '<Peerit or real-app bridge log path>',
      routes: {
        identity: true,
        sync: true,
        swarmTicket: true,
        swarmEvents: true
      }
    },
    artifacts: [
      '<screenshot-or-log-path>'
    ],
    automatedVerifier: {
      command: automatedVerifierCommand,
      validatesWith: 'npm run check:origin-isolation-smoke-evidence -- --file origin-isolation-smoke-evidence.json --json'
    }
  }
}

function storageWriteSnippet (label) {
  const value = `${safeIdentifier(label)}-${Date.now()}`
  return [
    '(async () => {',
    `  const key = ${JSON.stringify(PROOF_KEY)}`,
    `  const value = ${JSON.stringify(value)}`,
    '  localStorage.setItem(key, value)',
    "  document.cookie = key + '=' + value + '; SameSite=Lax'",
    '  await new Promise((resolve, reject) => {',
    '    const request = indexedDB.open(key, 1)',
    "    request.onupgradeneeded = () => request.result.createObjectStore('proof')",
    '    request.onerror = () => reject(request.error)',
    '    request.onsuccess = () => {',
    '      const db = request.result',
    "      const tx = db.transaction('proof', 'readwrite')",
    "      tx.objectStore('proof').put(value, 'value')",
    '      tx.oncomplete = () => { db.close(); resolve() }',
    '      tx.onerror = () => reject(tx.error)',
    '    }',
    '  })',
    '  return { origin: location.origin, value, localStorage: localStorage.getItem(key), cookie: document.cookie }',
    '})()'
  ].join('\n')
}

function storageReadSnippet () {
  return [
    '(async () => {',
    `  const key = ${JSON.stringify(PROOF_KEY)}`,
    '  const indexedValue = await new Promise((resolve) => {',
    '    const request = indexedDB.open(key)',
    '    request.onerror = () => resolve(null)',
    '    request.onupgradeneeded = () => { request.transaction.abort(); resolve(null) }',
    '    request.onsuccess = () => {',
    '      const db = request.result',
    "      if (!db.objectStoreNames.contains('proof')) { db.close(); resolve(null); return }",
    "      const tx = db.transaction('proof', 'readonly')",
    "      const get = tx.objectStore('proof').get('value')",
    '      get.onsuccess = () => { db.close(); resolve(get.result || null) }',
    '      get.onerror = () => { db.close(); resolve(null) }',
    '    }',
    '  })',
    '  return { origin: location.origin, localStorage: localStorage.getItem(key), cookie: document.cookie, indexedDB: indexedValue }',
    '})()'
  ].join('\n')
}

function safeIdentifier (value) {
  return String(value || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app'
}

function shellQuote (value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`
}

function printMarkdown (report) {
  console.log('# PearBrowser Origin Isolation Smoke Plan\n')
  console.log(`Package: \`${report.package.name}@${report.package.version}\``)
  console.log(`Feature flag: \`${report.featureFlag}\`\n`)

  console.log('## Apps\n')
  for (const app of report.apps) {
    console.log(`- ${app.label}: \`${app.url}\` (${app.driveKey})`)
  }

  console.log('\n## Commands\n')
  for (const item of report.commands) {
    console.log(`### ${item.id}`)
    console.log('```sh')
    console.log(item.command)
    console.log('```')
    console.log(`${item.evidence}\n`)
  }

  console.log('## Manual Steps\n')
  for (const step of report.manualSteps) {
    console.log(`- ${step.id}: ${step.action} Evidence: ${step.evidence}`)
  }

  console.log('\n## App A Write Snippet\n')
  console.log('```js')
  console.log(report.snippets.writeStorageInAppA)
  console.log('```')

  console.log('\n## App B Read Snippet\n')
  console.log('```js')
  console.log(report.snippets.readStorageInAppB)
  console.log('```')

  console.log('\n## Evidence Template\n')
  console.log('```json')
  console.log(JSON.stringify(report.evidenceTemplate, null, 2))
  console.log('```')

  console.log('\n## Acceptance\n')
  for (const item of report.acceptance) console.log(`- ${item}`)
}
