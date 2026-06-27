export const RELEASE_EVIDENCE_LOG = 'docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md'

export const APP_FULL_TARGETS = {
  homepage: {
    key: '1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d',
    name: 'pearbrowser-homepage',
    samples: 12,
    timeout: 90
  },
  peercord: {
    key: 'a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26',
    name: 'peercord',
    samples: 12,
    timeout: 90
  },
  keet: {
    key: '82110be69e2a531e840bc886dc7b9cab16729c587815295f55035109b45e4ddb',
    name: 'keet',
    samples: 12,
    timeout: 90
  }
}

export const PEERCORD_BUNDLE_KEY = APP_FULL_TARGETS.peercord.key

export const BUNDLE_CONTRACT_TARGETS = {
  'peercord-linux': {
    key: PEERCORD_BUNDLE_KEY,
    name: 'peercord-linux',
    appRoot: 'by-arch/linux-x64/app/peercord/resources/app',
    expectType: 'desktop',
    expectMain: 'index.js',
    contains: [{ file: 'index.js', text: 'BrowserWindow' }],
    absent: [{ file: 'index.js', text: 'Pear.worker.pipe' }],
    timeout: 90
  },
  'peercord-windows': {
    key: PEERCORD_BUNDLE_KEY,
    name: 'peercord-windows',
    appRoot: 'by-arch/win32-x64/app/peercord/resources/app',
    expectType: 'desktop',
    expectMain: 'index.js',
    contains: [{ file: 'index.js', text: 'BrowserWindow' }],
    absent: [{ file: 'index.js', text: 'Pear.worker.pipe' }],
    timeout: 90
  }
}

export function normalizeTargetName (value) {
  return String(value || '').trim().toLowerCase()
}

export function appFullCommand (targetName) {
  return ['node', 'scripts/verify-app-full.js', targetName]
}

export function bundleContractCommand (targetName) {
  return ['node', 'scripts/verify-pear-bundle-contract.js', targetName]
}

export function browserStateSyncSmokeCommand () {
  return ['node', 'scripts/browser-state-sync-smoke.js']
}
