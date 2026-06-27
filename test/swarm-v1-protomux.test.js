import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

import { duplexPair, MockPeer } from './helpers/protomux-pair.js'

const require = createRequire(import.meta.url)
const { SwarmBridge, deriveTierATopic } = require('../backend/swarm-bridge.js')

const DRIVE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const PROTOCOL = 'pear.echo-peer.v1'
const ALT_PROTOCOL = 'pear.echo-peer.alt.v1'

function muxProtocol (protocol) {
  return 'pear.swarm.v1/' + protocol
}

class FakeSwarm extends EventEmitter {
  constructor () {
    super()
    this.connections = new Set()
    this.joins = []
    this.discoveries = []
  }

  join (topic, opts) {
    const topicBuffer = Buffer.from(topic)
    this.joins.push({ topic: topicBuffer, opts: { ...opts } })
    const discovery = {
      destroyed: false,
      flushed: async () => {},
      destroy: async () => { discovery.destroyed = true }
    }
    this.discoveries.push(discovery)
    return discovery
  }

  connectPeer (info = { client: false, server: true }) {
    const [bridgeEnd, peerEnd] = duplexPair()
    this.connections.add(bridgeEnd)
    bridgeEnd.once('close', () => this.connections.delete(bridgeEnd))
    bridgeEnd.once('error', () => this.connections.delete(bridgeEnd))
    // Deliberately omit info.topics: Protomux pairing, not PeerInfo, is the
    // channel membership test.
    this.emit('connection', bridgeEnd, info)
    return new MockPeer(peerEnd)
  }
}

function collectStream () {
  const events = []
  const stream = {
    send (ev) { events.push(ev) },
    close () {},
    onClose () {}
  }
  return { events, stream }
}

function peerIdsOf (events) {
  return events.filter(e => e.type === 'peer').map(e => e.peerId)
}

function messagesFor (events, peerId) {
  return events
    .filter(e => e.type === 'message' && e.peerId === peerId)
    .map(e => Buffer.from(e.data, 'base64').toString())
}

async function waitFor (predicate, label) {
  const start = Date.now()
  while (Date.now() - start < 1500) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error('timed out waiting for ' + label)
}

test('swarm.v1 pairs server-role peers via Protomux and round-trips raw payloads', async (t) => {
  const fakeSwarm = new FakeSwarm()
  const swarmBridge = new SwarmBridge(fakeSwarm, {
    requestConsent: async () => { throw new Error('Tier A must not prompt') }
  })
  t.after(async () => { await swarmBridge.destroy() })

  const joined = await swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'echo-peer',
    subtopic: 'examples/echo-peer/single',
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  })

  const stream = collectStream()
  swarmBridge.attachStream(joined.channelId, stream.stream)

  const remoteReceived = []
  const mockPeer = fakeSwarm.connectPeer({ client: false, server: true })
  const remoteChannel = mockPeer.openChannel({
    protocol: muxProtocol(PROTOCOL),
    id: Buffer.from(joined.topicHex, 'hex'),
    onmessage: (buf) => remoteReceived.push(buf)
  })

  await waitFor(() => peerIdsOf(stream.events).length === 1, 'peer paired')
  const peerId = peerIdsOf(stream.events)[0]

  remoteChannel.send(Buffer.from('from-remote'))
  await waitFor(() => messagesFor(stream.events, peerId).length === 1, 'page received remote payload')
  assert.deepEqual(messagesFor(stream.events, peerId), ['from-remote'])

  swarmBridge.send(joined.channelId, peerId, Buffer.from('from-page').toString('base64'))
  await waitFor(() => remoteReceived.length === 1, 'remote received page payload')
  assert.equal(remoteReceived[0].toString(), 'from-page')

  mockPeer.destroy()
})

test('two swarm.v1 channels multiplex over one connection without cross-delivery', async (t) => {
  const fakeSwarm = new FakeSwarm()
  const swarmBridge = new SwarmBridge(fakeSwarm, {
    requestConsent: async () => { throw new Error('Tier A must not prompt') }
  })
  t.after(async () => { await swarmBridge.destroy() })

  const joinA = await swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'mux',
    subtopic: 'examples/echo-peer/mux-a',
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  })
  const joinB = await swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'mux',
    subtopic: 'examples/echo-peer/mux-b',
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  })
  assert.notEqual(joinA.topicHex, joinB.topicHex)

  const a = collectStream()
  const b = collectStream()
  swarmBridge.attachStream(joinA.channelId, a.stream)
  swarmBridge.attachStream(joinB.channelId, b.stream)

  const mockPeer = fakeSwarm.connectPeer({ client: false, server: true })
  assert.equal(fakeSwarm.connections.size, 1)

  const remoteA = mockPeer.openChannel({
    protocol: muxProtocol(PROTOCOL),
    id: Buffer.from(joinA.topicHex, 'hex')
  })
  const remoteB = mockPeer.openChannel({
    protocol: muxProtocol(PROTOCOL),
    id: Buffer.from(joinB.topicHex, 'hex')
  })

  await waitFor(() => peerIdsOf(a.events).length === 1 && peerIdsOf(b.events).length === 1,
    'both channels paired one peer each')
  const peerA = peerIdsOf(a.events)[0]
  const peerB = peerIdsOf(b.events)[0]

  remoteA.send(Buffer.from('only-for-A'))
  remoteB.send(Buffer.from('only-for-B'))
  await waitFor(() => messagesFor(a.events, peerA).length === 1 && messagesFor(b.events, peerB).length === 1,
    'each channel received its own payload')

  assert.deepEqual(messagesFor(a.events, peerA), ['only-for-A'])
  assert.deepEqual(messagesFor(b.events, peerB), ['only-for-B'])
  assert.equal(a.events.filter(e => e.type === 'message').length, 1)
  assert.equal(b.events.filter(e => e.type === 'message').length, 1)

  swarmBridge.send(joinA.channelId, peerA, Buffer.from('to-A').toString('base64'))
  swarmBridge.send(joinB.channelId, peerB, Buffer.from('to-B').toString('base64'))
  await waitFor(() => remoteA.received.length === 1 && remoteB.received.length === 1,
    'remote received namespaced page payloads')
  assert.equal(remoteA.received[0].toString(), 'to-A')
  assert.equal(remoteB.received[0].toString(), 'to-B')

  mockPeer.destroy()
})

test('same-topic swarm.v1 channels are isolated by protocol', async (t) => {
  const fakeSwarm = new FakeSwarm()
  const swarmBridge = new SwarmBridge(fakeSwarm, {
    requestConsent: async () => { throw new Error('Tier A must not prompt') }
  })
  t.after(async () => { await swarmBridge.destroy() })

  const joinA = await swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'same-topic',
    subtopic: 'examples/echo-peer/shared-topic',
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  })
  const joinB = await swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'same-topic',
    subtopic: 'examples/echo-peer/shared-topic',
    protocol: ALT_PROTOCOL,
    version: 1,
    server: true,
    client: true
  })
  assert.equal(joinA.topicHex, joinB.topicHex)

  const a = collectStream()
  const b = collectStream()
  swarmBridge.attachStream(joinA.channelId, a.stream)
  swarmBridge.attachStream(joinB.channelId, b.stream)

  const mockPeer = fakeSwarm.connectPeer({ client: false, server: true })
  const remoteA = mockPeer.openChannel({
    protocol: muxProtocol(PROTOCOL),
    id: Buffer.from(joinA.topicHex, 'hex')
  })
  const remoteB = mockPeer.openChannel({
    protocol: muxProtocol(ALT_PROTOCOL),
    id: Buffer.from(joinB.topicHex, 'hex')
  })

  await waitFor(() => peerIdsOf(a.events).length === 1 && peerIdsOf(b.events).length === 1,
    'same topic paired by protocol')
  const peerA = peerIdsOf(a.events)[0]
  const peerB = peerIdsOf(b.events)[0]

  remoteA.send(Buffer.from('protocol-A'))
  remoteB.send(Buffer.from('protocol-B'))
  await waitFor(() => messagesFor(a.events, peerA).length === 1 && messagesFor(b.events, peerB).length === 1,
    'each protocol received its own payload')

  assert.deepEqual(messagesFor(a.events, peerA), ['protocol-A'])
  assert.deepEqual(messagesFor(b.events, peerB), ['protocol-B'])
  assert.equal(a.events.filter(e => e.type === 'message').length, 1)
  assert.equal(b.events.filter(e => e.type === 'message').length, 1)

  swarmBridge.send(joinA.channelId, peerA, Buffer.from('to-protocol-A').toString('base64'))
  swarmBridge.send(joinB.channelId, peerB, Buffer.from('to-protocol-B').toString('base64'))
  await waitFor(() => remoteA.received.length === 1 && remoteB.received.length === 1,
    'remote received protocol-isolated page payloads')
  assert.equal(remoteA.received[0].toString(), 'to-protocol-A')
  assert.equal(remoteB.received[0].toString(), 'to-protocol-B')

  mockPeer.destroy()
})

test('denied arbitrary-topic joins do not consume channel or join budgets', async (t) => {
  const fakeSwarm = new FakeSwarm()
  let prompts = 0
  const swarmBridge = new SwarmBridge(fakeSwarm, {
    requestConsent: async () => { prompts++; return false }
  }, {
    limits: {
      maxChannelsPerApp: 1,
      maxJoinsPerMinute: 1,
      maxBytesPerSecondPerPeer: 1024 * 1024,
      maxPeersPerChannel: 64,
      maxPendingConsents: 1
    }
  })
  t.after(async () => { await swarmBridge.destroy() })

  await assert.rejects(() => swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'denied',
    topicHex: 'f'.repeat(64),
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  }), /consent-denied/)

  assert.equal(prompts, 1)
  assert.equal(swarmBridge.channels.size, 0)

  const ok = await swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'allowed-after-denial',
    subtopic: 'examples/echo-peer/budget-after-denial',
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  })
  assert.equal(ok.topicHex, deriveTierATopic(DRIVE_KEY, 'examples/echo-peer/budget-after-denial'))
})

test('failed post-discovery joins clean up discovery handles and budgets', async (t) => {
  const fakeSwarm = new FakeSwarm()
  const swarmBridge = new SwarmBridge(fakeSwarm, {
    requestConsent: async () => { throw new Error('Tier A must not prompt') }
  }, {
    limits: {
      maxChannelsPerApp: 1,
      maxJoinsPerMinute: 1,
      maxBytesPerSecondPerPeer: 1024 * 1024,
      maxPeersPerChannel: 64,
      maxPendingConsents: 1
    }
  })
  t.after(async () => { await swarmBridge.destroy() })

  const badConn = { destroyed: false }
  swarmBridge._conns.set(badConn, {
    conn: badConn,
    info: { client: true, server: true },
    mux: {
      createChannel: () => { throw new Error('mux exploded') }
    }
  })

  await assert.rejects(() => swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'join-failure',
    subtopic: 'examples/echo-peer/join-failure',
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  }), /mux exploded/)

  assert.equal(fakeSwarm.discoveries.length, 1)
  assert.equal(fakeSwarm.discoveries[0].destroyed, true)
  assert.equal(swarmBridge.channels.size, 0)
  assert.equal(swarmBridge.topicRefs.size, 0)
  assert.equal(swarmBridge._appStateFor(DRIVE_KEY).channelCount, 0)
  assert.equal(swarmBridge._appStateFor(DRIVE_KEY).joinsInWindow, 0)

  swarmBridge._conns.delete(badConn)
  const ok = await swarmBridge.join({
    driveKeyHex: DRIVE_KEY,
    appName: 'allowed-after-failure',
    subtopic: 'examples/echo-peer/budget-after-failure',
    protocol: PROTOCOL,
    version: 1,
    server: true,
    client: true
  })
  assert.equal(ok.topicHex, deriveTierATopic(DRIVE_KEY, 'examples/echo-peer/budget-after-failure'))
})
