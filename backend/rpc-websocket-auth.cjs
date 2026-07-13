'use strict'

const CMD_GET_STATUS = 2
const MAX_RPC_FRAME = 10_000_000
const MAX_RPC_BUFFER = 20_000_000
const MAX_DIAGNOSTIC_PENDING = 64

function authorizeRpcWebSocket ({ url = '/', headers = {} } = {}, opts = {}) {
  let parsed
  try { parsed = new URL(url, 'ws://127.0.0.1') } catch { return denied('invalid-url') }

  const sessionToken = normalizeToken(opts.sessionToken)
  const diagnosticToken = normalizeToken(opts.diagnosticToken)
  const suppliedSession = parsed.searchParams.get('session') || ''
  const suppliedDiagnostic = parsed.searchParams.get('token') || ''
  const origin = headerValue(headers, 'origin').trim()

  if (parsed.pathname === '/') {
    if (!sessionToken || !constantTimeEqual(suppliedSession, sessionToken)) {
      return denied('invalid-session')
    }
    return { allowed: true, kind: 'renderer', full: true }
  }

  if (parsed.pathname !== '/status-smoke') return denied('unknown-path')

  // A full diagnostic is an explicitly enabled native-operator capability.
  // Browsers always send Origin (including the literal "null" for opaque
  // origins), so an embedded page cannot use a leaked query string.
  if (!origin && diagnosticToken && constantTimeEqual(suppliedDiagnostic, diagnosticToken)) {
    return { allowed: true, kind: 'diagnostic', full: true }
  }

  // The trusted renderer probes readiness before claiming the single renderer
  // slot. Native status tools remain backwards compatible without receiving
  // access to any command other than CMD_GET_STATUS.
  if ((sessionToken && constantTimeEqual(suppliedSession, sessionToken)) || !origin) {
    return { allowed: true, kind: 'diagnostic', full: false }
  }

  return denied('invalid-diagnostic-session')
}

class RpcFrameDecoder {
  constructor () {
    this.buffer = ''
  }

  push (chunk) {
    this.buffer += typeof chunk === 'string' ? chunk : chunk?.toString?.() || ''
    if (this.buffer.length > MAX_RPC_BUFFER) throw new Error('RPC buffer exceeds limit')

    const messages = []
    while (this.buffer.length >= 8) {
      const prefix = this.buffer.slice(0, 8)
      if (!/^[0-9a-f]{8}$/i.test(prefix)) throw new Error('Invalid RPC frame prefix')
      const length = parseInt(prefix, 16)
      if (length <= 0 || length > MAX_RPC_FRAME) throw new Error('Invalid RPC frame length')
      if (this.buffer.length < 8 + length) break
      const json = this.buffer.slice(8, 8 + length)
      this.buffer = this.buffer.slice(8 + length)
      messages.push(JSON.parse(json))
    }
    return messages
  }
}

class DiagnosticRpcRouter {
  constructor ({ forward } = {}) {
    if (typeof forward !== 'function') throw new TypeError('DiagnosticRpcRouter requires forward')
    this.forward = forward
    this.sockets = new Map()
    this.pending = new Map()
    this.backendDecoder = new RpcFrameDecoder()
    this.nextHostId = -1
  }

  add (socket, { full = false } = {}) {
    if (!socket || typeof socket.write !== 'function') throw new TypeError('Diagnostic socket must be writable')
    this.sockets.set(socket, { full: !!full, decoder: new RpcFrameDecoder(), pending: new Set() })
  }

  remove (socket) {
    const state = this.sockets.get(socket)
    if (!state) return
    for (const hostId of state.pending) this.pending.delete(hostId)
    this.sockets.delete(socket)
  }

  receive (socket, chunk) {
    const state = this.sockets.get(socket)
    if (!state) throw new Error('Unknown diagnostic socket')
    const messages = state.decoder.push(chunk)

    for (const message of messages) {
      const clientId = Number(message?.id)
      const command = Number(message?.cmd)
      if (!Number.isSafeInteger(clientId) || clientId === 0 || !Number.isSafeInteger(command)) {
        throw new Error('Invalid diagnostic RPC request')
      }
      if (!state.full && command !== CMD_GET_STATUS) {
        socket.write(frameRpc({ id: clientId, error: 'Diagnostic RPC only allows CMD_GET_STATUS' }))
        continue
      }
      if (state.pending.size >= MAX_DIAGNOSTIC_PENDING) {
        socket.write(frameRpc({ id: clientId, error: 'Too many pending diagnostic requests' }))
        continue
      }

      const hostId = this.nextHostId--
      state.pending.add(hostId)
      this.pending.set(hostId, { socket, clientId })
      this.forward(frameRpc({ id: hostId, cmd: command, data: message.data || {} }))
    }
  }

  routeBackend (chunk) {
    const messages = this.backendDecoder.push(chunk)
    for (const message of messages) {
      const route = this.pending.get(message?.id)
      if (!route) continue
      this.pending.delete(message.id)
      const state = this.sockets.get(route.socket)
      state?.pending.delete(message.id)
      if (!state) continue
      route.socket.write(frameRpc({
        id: route.clientId,
        ...(message.error !== undefined ? { error: message.error } : { result: message.result })
      }))
    }
  }
}

function frameRpc (message) {
  const json = JSON.stringify(message)
  return json.length.toString(16).padStart(8, '0') + json
}

function headerValue (headers, name) {
  if (!headers) return ''
  if (typeof headers.get === 'function') return String(headers.get(name) || '')
  return String(headers[name] || headers[name.toLowerCase()] || '')
}

function normalizeToken (value) {
  return typeof value === 'string' ? value.trim() : String(value || '').trim()
}

function constantTimeEqual (left, right) {
  const a = normalizeToken(left)
  const b = normalizeToken(right)
  let difference = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index++) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0)
  }
  return difference === 0
}

function denied (reason) {
  return { allowed: false, kind: null, full: false, reason }
}

module.exports = {
  CMD_GET_STATUS,
  authorizeRpcWebSocket,
  RpcFrameDecoder,
  DiagnosticRpcRouter,
  frameRpc,
  constantTimeEqual
}
