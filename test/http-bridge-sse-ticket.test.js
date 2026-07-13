import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

const { HttpBridge } = (await import('../backend/http-bridge.js')).default

const driveKey = 'a'.repeat(64)
const channelId = 'ch-test'

function makeReq (method, path, { headers = {}, body } = {}) {
  const req = new EventEmitter()
  req.method = method
  req.headers = headers
  req.socket = { remoteAddress: '127.0.0.1' }
  req.destroy = () => { req.destroyed = true }
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return req
}

function makeRes () {
  const res = new EventEmitter()
  res.statusCode = 200
  res.headers = {}
  res.chunks = []
  res.ended = false
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value }
  res.write = (chunk) => {
    if (chunk) res.chunks.push(Buffer.from(chunk))
    return true
  }
  res.end = (chunk) => {
    if (chunk) res.chunks.push(Buffer.from(chunk))
    res.ended = true
    res.body = Buffer.concat(res.chunks).toString('utf8')
    try {
      res.json = res.body ? JSON.parse(res.body) : null
    } catch {
      res.json = null
    }
  }
  return res
}

async function request (bridge, method, path, opts = {}) {
  const req = makeReq(method, path, opts)
  const res = makeRes()
  const url = new URL(path, 'http://127.0.0.1')
  const handled = await bridge.handle(req, res, url)
  return { handled, req, res }
}

function makeBridge () {
  const attached = []
  const swarmBridge = {
    attachStream (id, stream) {
      attached.push({ channelId: id, stream })
      return true
    },
    join () { throw new Error('not used') },
    send () { throw new Error('not used') },
    leave () { throw new Error('not used') }
  }
  const http = new HttpBridge({}, null, null, {
    validateToken: (token) => token === 'good' ? driveKey : null,
    swarmBridge,
    sseTicketTtlMs: 30000
  })
  return { http, attached }
}

async function issueTicket (http, id = channelId) {
  const minted = await request(http, 'POST', '/api/swarm/ticket', {
    headers: { 'x-pear-token': 'good' },
    body: { channelId: id }
  })
  assert.equal(minted.res.statusCode, 200)
  assert.match(minted.res.json.ticket, /^[0-9a-f]{64}$/)
  assert.equal(minted.res.json.expiresInMs, 30000)
  return minted.res.json.ticket
}

test('HttpBridge swarm events use one-time SSE tickets, not bearer query tokens', async () => {
  const { http, attached } = makeBridge()

  const queryBearer = await request(http, 'GET', `/api/swarm/events?channelId=${channelId}&token=good`)
  assert.equal(queryBearer.handled, true)
  assert.equal(queryBearer.res.statusCode, 401)
  assert.equal(queryBearer.res.json.error, 'SSE ticket required')

  const queryOnlyTicketMint = await request(http, 'POST', '/api/swarm/ticket?token=good', {
    body: { channelId }
  })
  assert.equal(queryOnlyTicketMint.res.statusCode, 401)
  assert.equal(queryOnlyTicketMint.res.json.error, 'Unauthorized')

  const wrongChannelTicket = await issueTicket(http, 'other-channel')
  const wrongChannel = await request(http, 'GET', `/api/swarm/events?channelId=${channelId}&ticket=${wrongChannelTicket}`)
  assert.equal(wrongChannel.res.statusCode, 403)
  assert.equal(wrongChannel.res.json.error, 'SSE ticket channel mismatch')

  const ticket = await issueTicket(http)
  const accepted = await request(http, 'GET', `/api/swarm/events?channelId=${channelId}&ticket=${ticket}`)
  assert.equal(accepted.res.statusCode, 200)
  assert.match(accepted.res.headers['content-type'], /^text\/event-stream\b/)
  assert.equal(Buffer.concat(accepted.res.chunks).toString('utf8'), ': pear.swarm.v1 stream\n\n')
  assert.deepEqual(attached.map(entry => entry.channelId), [channelId])

  const reused = await request(http, 'GET', `/api/swarm/events?channelId=${channelId}&ticket=${ticket}`)
  assert.equal(reused.res.statusCode, 401)
  assert.equal(reused.res.json.error, 'Invalid SSE ticket')
})
