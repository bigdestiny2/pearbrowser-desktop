/**
 * UI-side RPC client.
 *
 * Mirrors the wire protocol of backend/rpc.js (8-hex length-prefixed
 * JSON frames) so both sides speak the same thing. For M1 we talk to
 * an in-memory pipe; swapping to `pear-pipe` later doesn't change this.
 */

export class RpcClient extends EventTarget {
  constructor (pipe) {
    super()
    this._pipe = pipe
    this._nextId = 1
    this._pending = new Map()
    this._buffer = ''
    this._connected = pipe.connected !== false

    pipe.on('data', (chunk) => this._onData(chunk))
    pipe.on('open', () => {
      this._connected = true
      this.dispatchEvent(new CustomEvent('open'))
    })
    pipe.on('close', () => {
      this._disconnect('RPC connection closed')
      this.dispatchEvent(new CustomEvent('close'))
    })
    pipe.on('error', (err) => {
      this._disconnect('RPC connection failed')
      this.dispatchEvent(new CustomEvent('error', { detail: err }))
    })
  }

  request (cmd, data = {}, timeout = 30000) {
    if (cmd === undefined || cmd === null) {
      return Promise.reject(new Error('RPC command is missing. Renderer constants are out of sync with backend/constants.js.'))
    }
    if (!this._connected) {
      return Promise.reject(new Error(`RPC unavailable: ${cmd} (backend disconnected; reconnecting)`))
    }

    return new Promise((resolve, reject) => {
      const id = this._nextId++
      const timer = setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.delete(id)
          reject(new Error(`RPC timeout: ${cmd}`))
        }
      }, timeout)
      this._pending.set(id, { resolve, reject, timer })
      try {
        this._send({ id, cmd, data })
      } catch (err) {
        clearTimeout(timer)
        this._pending.delete(id)
        reject(err)
      }
    })
  }

  on (event, fn) {
    this.addEventListener(event, (e) => fn(e.detail))
    return this
  }

  _send (msg) {
    const json = JSON.stringify(msg)
    const frame = json.length.toString(16).padStart(8, '0') + json
    if (this._pipe.write(frame) === false) {
      throw new Error('RPC connection is not writable')
    }
  }

  _disconnect (message) {
    this._connected = false
    for (const pending of this._pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error(message))
    }
    this._pending.clear()
  }

  _onData (chunk) {
    this._buffer += typeof chunk === 'string' ? chunk : chunk.toString()
    while (this._buffer.length >= 8) {
      const len = parseInt(this._buffer.slice(0, 8), 16)
      if (isNaN(len) || len <= 0) {
        this._buffer = ''
        return
      }
      if (this._buffer.length < 8 + len) break
      const json = this._buffer.slice(8, 8 + len)
      this._buffer = this._buffer.slice(8 + len)
      let msg
      try { msg = JSON.parse(json) } catch { continue }
      this._dispatch(msg)
    }
  }

  _dispatch (msg) {
    if (msg.id && (msg.result !== undefined || msg.error)) {
      const p = this._pending.get(msg.id)
      if (p) {
        clearTimeout(p.timer)
        this._pending.delete(msg.id)
        msg.error ? p.reject(new Error(msg.error)) : p.resolve(msg.result)
      }
      return
    }
    if (msg.event) {
      this.dispatchEvent(new CustomEvent(`event:${msg.event}`, { detail: msg.data }))
      this.dispatchEvent(new CustomEvent('event', { detail: { name: msg.event, data: msg.data } }))
    }
  }
}
