#!/usr/bin/env node
/**
 * Runtime smoke for a launched PearBrowser process.
 *
 * Start PearBrowser first, then run:
 *
 *   node scripts/runtime-rpc-smoke.mjs
 *
 * The app exposes a diagnostic WebSocket path at /status-smoke that mirrors the
 * normal renderer RPC stream without becoming the renderer or triggering app
 * shutdown. This script asks CMD_GET_STATUS until the backend is ready.
 */

import { EventEmitter } from 'node:events'
import net from 'node:net'
import { randomBytes } from 'node:crypto'

const CMD_GET_STATUS = 2
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT_BASE = 9876
const DEFAULT_PORT_COUNT = 5
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_CONNECT_MS = 1_500
const DEFAULT_REQUEST_MS = 3_000

function parseArgs (argv) {
  const args = {
    host: DEFAULT_HOST,
    portBase: DEFAULT_PORT_BASE,
    portCount: DEFAULT_PORT_COUNT,
    timeout: DEFAULT_TIMEOUT_MS,
    connectTimeout: DEFAULT_CONNECT_MS,
    requestTimeout: DEFAULT_REQUEST_MS,
    minHiveRelays: 1,
    json: false
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--host') args.host = argv[++i] || args.host
    else if (arg === '--port-base') args.portBase = parsePositiveInt(argv[++i], '--port-base')
    else if (arg === '--port-count') args.portCount = parsePositiveInt(argv[++i], '--port-count')
    else if (arg === '--timeout') args.timeout = parseDuration(argv[++i], '--timeout')
    else if (arg === '--connect-timeout') args.connectTimeout = parseDuration(argv[++i], '--connect-timeout')
    else if (arg === '--request-timeout') args.requestTimeout = parseDuration(argv[++i], '--request-timeout')
    else if (arg === '--min-hive-relays') args.minHiveRelays = parseNonNegativeInt(argv[++i], '--min-hive-relays')
    else if (arg === '--json') args.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }

  return args
}

function usage (code, msg = '') {
  if (msg) console.error('error:', msg)
  console.error('usage: node scripts/runtime-rpc-smoke.mjs [--timeout 15000] [--port-base 9876] [--port-count 5] [--min-hive-relays 1] [--json]')
  process.exit(code)
}

function parseDuration (value, label) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) usage(2, `${label} must be a positive number of milliseconds`)
  return Math.floor(n)
}

function parsePositiveInt (value, label) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) usage(2, `${label} must be a positive integer`)
  return n
}

function parseNonNegativeInt (value, label) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) usage(2, `${label} must be a non-negative integer`)
  return n
}

function frame (msg) {
  const json = JSON.stringify(msg)
  return json.length.toString(16).padStart(8, '0') + json
}

function parseFrames (state, data) {
  state.buffer += Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
  const out = []
  while (state.buffer.length >= 8) {
    const len = parseInt(state.buffer.slice(0, 8), 16)
    if (!Number.isFinite(len) || len <= 0 || len > 10_000_000) {
      throw new Error(`invalid RPC frame length: ${state.buffer.slice(0, 8)}`)
    }
    if (state.buffer.length < 8 + len) break
    const json = state.buffer.slice(8, 8 + len)
    state.buffer = state.buffer.slice(8 + len)
    out.push(JSON.parse(json))
  }
  return out
}

class RawWebSocket extends EventEmitter {
  constructor (socket, initial = Buffer.alloc(0)) {
    super()
    this.socket = socket
    this.buffer = initial
    this.closed = false

    socket.on('data', (chunk) => this._onData(chunk))
    socket.on('close', () => {
      if (this.closed) return
      this.closed = true
      this.emit('close')
    })
    socket.on('error', (err) => this.emit('error', err))
    if (initial.length) queueMicrotask(() => this._drain())
  }

  send (text) {
    if (this.closed) return
    const payload = Buffer.from(String(text))
    const mask = randomBytes(4)
    let header
    if (payload.length < 126) {
      header = Buffer.alloc(2)
      header[0] = 0x81
      header[1] = 0x80 | payload.length
    } else if (payload.length <= 0xffff) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 0x80 | 126
      header.writeUInt16BE(payload.length, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 0x80 | 127
      header.writeBigUInt64BE(BigInt(payload.length), 2)
    }

    const masked = Buffer.alloc(payload.length)
    for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4]
    this.socket.write(Buffer.concat([header, mask, masked]))
  }

  close () {
    this.closed = true
    try { this.socket.end() } catch {}
  }

  _onData (chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    this._drain()
  }

  _drain () {
    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0]
      const b1 = this.buffer[1]
      const opcode = b0 & 0x0f
      const masked = (b1 & 0x80) !== 0
      let len = b1 & 0x7f
      let offset = 2

      if (len === 126) {
        if (this.buffer.length < offset + 2) return
        len = this.buffer.readUInt16BE(offset)
        offset += 2
      } else if (len === 127) {
        if (this.buffer.length < offset + 8) return
        len = Number(this.buffer.readBigUInt64BE(offset))
        offset += 8
      }

      const maskOffset = offset
      if (masked) offset += 4
      if (this.buffer.length < offset + len) return

      let payload = this.buffer.subarray(offset, offset + len)
      if (masked) {
        const mask = this.buffer.subarray(maskOffset, maskOffset + 4)
        const unmasked = Buffer.alloc(payload.length)
        for (let i = 0; i < payload.length; i++) unmasked[i] = payload[i] ^ mask[i % 4]
        payload = unmasked
      }
      this.buffer = this.buffer.subarray(offset + len)

      if (opcode === 0x8) {
        this.close()
        this.emit('close')
        return
      }
      if (opcode === 0x1 || opcode === 0x2) this.emit('message', payload)
    }
  }
}

async function connect (url, timeout) {
  return await new Promise((resolve, reject) => {
    const u = new URL(url)
    const socket = net.createConnection({ host: u.hostname, port: Number(u.port) })
    const key = randomBytes(16).toString('base64')
    let settled = false
    let buffer = Buffer.alloc(0)
    const timer = setTimeout(() => done(new Error(`connect timeout: ${url}`)), timeout)

    function done (err, ws = null) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.removeListener('connect', onConnect)
      socket.removeListener('data', onData)
      socket.removeListener('error', onError)
      socket.removeListener('close', onClose)
      if (err) {
        try { socket.destroy() } catch {}
        reject(err)
      } else {
        resolve(ws)
      }
    }

    function onConnect () {
      const path = (u.pathname || '/') + (u.search || '')
      socket.write([
        `GET ${path} HTTP/1.1`,
        `Host: ${u.hostname}:${u.port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        ''
      ].join('\r\n'))
    }

    function onData (chunk) {
      buffer = Buffer.concat([buffer, chunk])
      const end = buffer.indexOf('\r\n\r\n')
      if (end === -1) return

      const head = buffer.subarray(0, end).toString('latin1')
      const rest = buffer.subarray(end + 4)
      if (!/^HTTP\/1\.1 101\b/i.test(head)) {
        done(new Error(`websocket handshake rejected: ${head.split('\r\n')[0] || 'no status'}`))
        return
      }
      done(null, new RawWebSocket(socket, rest))
    }

    function onError () { done(new Error(`connect failed: ${url}`)) }
    function onClose () { done(new Error(`socket closed before handshake: ${url}`)) }

    socket.once('connect', onConnect)
    socket.on('data', onData)
    socket.once('error', onError)
    socket.once('close', onClose)
  })
}

async function requestStatus (ws, timeout) {
  const id = 900_000_000 + Math.floor(Math.random() * 10_000_000)
  const state = { buffer: '' }

  return await new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => done(new Error(`RPC timeout: cmd ${CMD_GET_STATUS}`)), timeout)

    function done (err, value) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ws.off('message', onMessage)
      ws.off('close', onClose)
      ws.off('error', onError)
      err ? reject(err) : resolve(value)
    }

    function onClose () {
      done(new Error('diagnostic socket closed before status reply'))
    }

    function onError () {
      done(new Error('diagnostic socket error before status reply'))
    }

    function onMessage (data) {
      let messages
      try {
        messages = parseFrames(state, data)
      } catch (err) {
        done(err)
        return
      }

      for (const msg of messages) {
        if (msg?.event === 'backend-boot-failed') {
          done(new Error(`backend boot failed: ${msg.data?.message || 'unknown error'}`))
          return
        }
        if (msg?.id !== id) continue
        if (msg.error) done(new Error(msg.error))
        else done(null, msg.result)
        return
      }
    }

    ws.on('message', onMessage)
    ws.on('close', onClose)
    ws.on('error', onError)
    ws.send(frame({ id, cmd: CMD_GET_STATUS, data: {} }))
  })
}

function validateStatus (status, args) {
  const errors = []
  if (!status || typeof status !== 'object') {
    return ['status reply is not an object']
  }

  if (status.dhtConnected !== true) errors.push('DHT is not connected')
  if (!Number.isInteger(status.proxyPort) || status.proxyPort <= 0) errors.push('HTTP proxy is not ready')
  if (!Number.isInteger(status.peerCount) || status.peerCount < 0) errors.push('peerCount is invalid')
  if (!Number.isInteger(status.hiveRelays) || status.hiveRelays < args.minHiveRelays) {
    errors.push(`hiveRelays is below ${args.minHiveRelays}`)
  }
  if (!Number.isFinite(status.storageUsed) || status.storageUsed < 0) errors.push('storageUsed is invalid')
  if (!Number.isFinite(status.storageLimit) || status.storageLimit <= 0) errors.push('storageLimit is invalid')
  if (!Number.isFinite(status.storagePercent) || status.storagePercent < 0) errors.push('storagePercent is invalid')
  return errors
}

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function probeOnce (args, deadline) {
  let last = null
  for (let i = 0; i < args.portCount; i++) {
    const port = args.portBase + i
    const remain = Math.max(1, deadline - Date.now())
    const connectTimeout = Math.min(args.connectTimeout, remain)
    const requestTimeout = Math.min(args.requestTimeout, remain)
    const url = `ws://${args.host}:${port}/status-smoke`
    let ws = null
    try {
      ws = await connect(url, connectTimeout)
      const status = await requestStatus(ws, requestTimeout)
      const errors = validateStatus(status, args)
      return { port, status, errors, url }
    } catch (err) {
      last = { port, url, error: err.message }
    } finally {
      try { ws?.close() } catch {}
    }
  }
  return { errors: ['no diagnostic RPC socket answered'], last }
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  const deadline = Date.now() + args.timeout
  let last = null

  while (Date.now() < deadline) {
    const result = await probeOnce(args, deadline)
    last = result
    if (result.status && result.errors.length === 0) {
      const output = { ok: true, port: result.port, status: result.status }
      if (args.json) console.log(JSON.stringify(output))
      else {
        console.log('Runtime RPC smoke passed')
        console.log(`  rpcPort: ${result.port}`)
        console.log(`  proxyPort: ${result.status.proxyPort}`)
        console.log(`  dhtConnected: ${result.status.dhtConnected}`)
        console.log(`  peerCount: ${result.status.peerCount}`)
        console.log(`  hiveRelays: ${result.status.hiveRelays}`)
        console.log(`  storageUsed: ${result.status.storageUsed}`)
      }
      return
    }
    await sleep(500)
  }

  const output = { ok: false, last }
  if (args.json) console.log(JSON.stringify(output))
  else {
    console.error('Runtime RPC smoke failed')
    if (last?.status) {
      console.error('  last status:', JSON.stringify(last.status))
      console.error('  errors:', last.errors.join('; '))
    } else if (last?.last) {
      console.error(`  last probe ${last.last.url}: ${last.last.error}`)
    } else {
      console.error('  no diagnostic RPC socket answered')
    }
  }
  process.exit(1)
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
