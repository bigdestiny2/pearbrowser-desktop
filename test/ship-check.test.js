import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  buildAppShipCheck,
  buildSiteShipCheck,
  MAX_ICON_DATA_URI_BYTES
} = require('../backend/ship-check.cjs')

const A = 'a'.repeat(64)

function byId (report, id) {
  return report.checks.find((check) => check.id === id)
}

test('app ship check blocks missing manifest name and link', () => {
  const report = buildAppShipCheck({}, { relayStatus: {} })

  assert.equal(report.kind, 'app')
  assert.equal(report.status, 'blocked')
  assert.equal(byId(report, 'manifest:name').status, 'fail')
  assert.equal(byId(report, 'manifest:link').status, 'fail')
  assert.equal(byId(report, 'icon:missing').status, 'warn')
})

test('app ship check reports launch mismatch, large bundle, and accepted pin evidence', () => {
  const report = buildAppShipCheck({
    name: 'Big Pear App',
    description: 'A large standalone app.',
    link: 'pear://example',
    type: 'hypersite',
    author: 'Publisher',
    iconData: 'data:image/png;base64,AAAA'
  }, {
    normalizeKey: () => A,
    driveInfo: {
      byteLength: 64 * 1024 * 1024,
      relay: { available: true, connectedRelays: 2, seedAcceptances: 2 }
    },
    relayStatus: { connectedRelays: 2, gatewayRelays: ['https://relay.example'] }
  })

  assert.equal(report.status, 'review')
  assert.equal(report.target.driveKey, A)
  assert.equal(report.target.launchMode, 'standalone')
  assert.equal(byId(report, 'launch-mode:mismatch').status, 'warn')
  assert.equal(byId(report, 'bundle:size-large').status, 'warn')
  assert.equal(byId(report, 'relay:connected').status, 'pass')
  assert.equal(byId(report, 'pin:accepted').status, 'warn')
})

test('app ship check warns when inline icon would exceed submission limit', () => {
  const report = buildAppShipCheck({
    name: 'Icon Heavy',
    description: 'Has an oversized icon.',
    link: 'hyper://' + A + '/',
    iconData: 'data:image/png;base64,' + 'A'.repeat(MAX_ICON_DATA_URI_BYTES + 1)
  }, {
    normalizeKey: (value) => value,
    relayStatus: { connectedRelays: 1 }
  })

  assert.equal(report.status, 'review')
  assert.equal(byId(report, 'icon:data-size').status, 'warn')
})

test('app ship check accepts pear-request worker evidence for pear hypersites', () => {
  const report = buildAppShipCheck({
    name: 'Headless Tool',
    description: 'Runs in a browser tab.',
    link: 'pear://headless',
    type: 'hypersite',
    author: 'Publisher',
    icon: '/icon.svg',
    compatibility: {
      pearJson: { type: 'terminal', main: 'index.js' },
      pearJsonPath: 'pear.json',
      mainPath: 'index.js',
      mainText: 'const pipe = Pear.worker.pipe // pear-request router'
    }
  }, {
    normalizeKey: () => A,
    driveInfo: { byteLength: 1024 },
    relayStatus: { connectedRelays: 1 }
  })

  assert.equal(byId(report, 'launch-mode:hypersite').status, 'pass')
  assert.equal(byId(report, 'compat:pear-request-worker').status, 'pass')
  assert.equal(byId(report, 'launch-mode:mismatch'), undefined)
})

test('app ship check warns when a pear app is marked hypersite without worker evidence', () => {
  const report = buildAppShipCheck({
    name: 'Window App',
    description: 'Looks like a window app.',
    link: 'pear://window-app',
    type: 'hypersite',
    author: 'Publisher',
    icon: '/icon.svg',
    compatibility: {
      pearJson: { type: 'desktop', main: 'index.js' },
      main: 'index.js',
      mainPath: 'index.js',
      mainText: 'const { BrowserWindow } = require("electron")'
    }
  }, {
    normalizeKey: () => A,
    driveInfo: { byteLength: 1024 },
    relayStatus: { connectedRelays: 1 }
  })

  assert.equal(report.status, 'review')
  assert.equal(byId(report, 'launch-mode:mismatch').status, 'warn')
  assert.equal(byId(report, 'compat:pear-request-missing').status, 'warn')
})

test('app ship check accepts fresh-peer verifier evidence', () => {
  const report = buildAppShipCheck({
    name: 'Verified App',
    description: 'Has clean-peer availability proof.',
    link: 'hyper://' + A + '/',
    author: 'Publisher',
    icon: '/icon.svg',
    freshPeer: {
      ok: true,
      peers: 2,
      entries: 10,
      sampled: 4,
      blobsPresent: 4,
      blobsMissing: 0,
      bytes: 1234,
      target: 'verified'
    }
  }, {
    normalizeKey: (value) => value,
    driveInfo: { byteLength: 8192, relay: { durable: true, activePeers: 1 } },
    relayStatus: { connectedRelays: 1 }
  })

  const freshPeer = byId(report, 'fresh-peer:verified')
  assert.equal(report.status, 'ready')
  assert.equal(freshPeer.status, 'pass')
  assert.match(freshPeer.message, /4\/4/)
  assert.equal(freshPeer.evidence.peers, 2)
  assert.equal(freshPeer.evidence.blobsMissing, 0)
})

test('app ship check warns when fresh-peer verifier evidence is incomplete', () => {
  const report = buildAppShipCheck({
    name: 'Patchy App',
    description: 'Has incomplete clean-peer proof.',
    link: 'hyper://' + A + '/',
    author: 'Publisher',
    icon: '/icon.svg',
    freshPeerVerification: {
      ok: false,
      peers: 1,
      entries: 10,
      sampled: 4,
      blobsPresent: 2,
      blobsMissing: 2
    }
  }, {
    normalizeKey: (value) => value,
    driveInfo: { byteLength: 8192, relay: { durable: true, activePeers: 1 } },
    relayStatus: { connectedRelays: 1 }
  })

  const freshPeer = byId(report, 'fresh-peer:failed')
  assert.equal(report.status, 'review')
  assert.equal(freshPeer.status, 'warn')
  assert.match(freshPeer.message, /2\/4/)
  assert.equal(freshPeer.evidence.blobsMissing, 2)
})

test('site ship check is ready when required files, icon, size, relay, and pin pass', () => {
  const report = buildSiteShipCheck({
    siteId: 'site1',
    name: 'Docs',
    keyHex: A,
    blocks: [{ type: 'heading', text: 'Hello' }],
    iconPath: '/icon.svg',
    published: true,
    pin: { durable: true, replicatedPeers: 1 }
  }, {
    driveInfo: { byteLength: 8192, relay: { durable: true, activePeers: 1 } },
    relayStatus: { connectedRelays: 1 }
  })

  assert.equal(report.kind, 'site')
  assert.equal(report.status, 'ready')
  assert.equal(byId(report, 'site:index').status, 'pass')
  assert.equal(byId(report, 'pin:durable').status, 'pass')
})

test('site ship check suggests a fresh-peer verifier command when evidence is missing', () => {
  const report = buildSiteShipCheck({
    siteId: 'site1',
    name: 'Docs Site',
    keyHex: A,
    blocks: [{ type: 'heading', text: 'Hello' }],
    iconPath: '/icon.svg',
    published: true,
    pin: { durable: true, replicatedPeers: 1 }
  }, {
    driveInfo: { byteLength: 8192, relay: { durable: true, activePeers: 1 } },
    relayStatus: { connectedRelays: 1 }
  })

  const freshPeer = byId(report, 'fresh-peer:missing')
  assert.equal(report.status, 'ready')
  assert.equal(freshPeer.status, 'info')
  assert.match(freshPeer.evidence.command, /scripts\/verify-app-full\.js --key/)
  assert.match(freshPeer.evidence.command, /--name Docs-Site/)
  assert.equal(freshPeer.evidence.driveKey, A)
})

test('ship check does not treat active relay peers as durable without full bytes', () => {
  const report = buildAppShipCheck({
    name: 'Partially Mirrored',
    description: 'Has relay peers but incomplete blob replication.',
    link: 'hyper://' + A + '/',
    icon: '/icon.svg',
    pin: { activePeers: 2, blobLocalLen: 144, blobRemoteMax: 112 }
  }, {
    normalizeKey: (value) => value,
    driveInfo: { byteLength: 8192, relay: { connectedRelays: 2 } },
    relayStatus: { connectedRelays: 2 }
  })

  assert.equal(report.status, 'review')
  assert.equal(byId(report, 'pin:accepted').status, 'warn')
})

test('site ship check surfaces raw script warnings for review', () => {
  const report = buildSiteShipCheck({
    siteId: 'site2',
    name: 'Scripted Site',
    keyHex: A,
    blocks: [{ type: 'html', text: '<script>window.x = 1</script>' }],
    iconPath: '/icon.png',
    published: false
  }, {
    driveInfo: { byteLength: 2048 },
    relayStatus: { connectedRelays: 1 }
  })

  assert.equal(report.status, 'review')
  assert.equal(byId(report, 'site:raw-script').status, 'warn')
  assert.equal(byId(report, 'pin:draft').status, 'info')
})
