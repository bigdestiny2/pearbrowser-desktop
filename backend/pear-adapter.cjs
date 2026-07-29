/**
 * Pear adapter for PearBrowser backend.
 *
 * The original backend assumes a mobile BareKit host that injects
 * `BareKit.IPC` (a duplex stream) before the backend loads. For the
 * desktop worker adapter we use an in-memory pipe pair.
 *
 * The v3 Electron host owns the worker lifecycle. If it later provides a
 * native duplex, only the two sides returned here need replacing; the backend
 * and renderer RPC contracts remain unchanged.
 */

const EventEmitter = require('bare-events')

class InMemoryPipe extends EventEmitter {
  constructor (name) {
    super()
    this.name = name
    this._peer = null
    this._closed = false
  }

  _link (peer) {
    this._peer = peer
  }

  write (chunk) {
    if (this._closed) return false
    if (!this._peer) return false
    queueMicrotask(() => {
      if (!this._peer._closed) this._peer.emit('data', chunk)
    })
    return true
  }

  end () {
    if (this._closed) return
    this._closed = true
    queueMicrotask(() => {
      if (this._peer && !this._peer._closed) this._peer.emit('close')
    })
  }

  ref () {}
  unref () {}
}

function createPipePair () {
  const a = new InMemoryPipe('ui')
  const b = new InMemoryPipe('backend')
  a._link(b)
  b._link(a)
  return [a, b]
}

function bootBackend ({ storagePath, esmModules }) {
  const [uiSide, backendSide] = createPipePair()

  // Shim the BareKit global the backend expects.
  globalThis.BareKit = { IPC: backendSide }

  // Stash ESM modules the root `index.js` loaded statically so the
  // CJS backend can use them without paying Bare's CJS→ESM
  // dynamic-import cost. See AnongptBuyer for the consumer.
  if (esmModules) globalThis._pearbrowserEsmModules = esmModules

  // Backend reads `Bare.argv[0]` for its storage path.
  try {
    if (typeof Bare !== 'undefined') {
      if (!Bare.argv) Bare.argv = []
      Bare.argv[0] = storagePath
    }
  } catch {}

  // Load the backend. It immediately starts `boot()` which
  // talks to BareKit.IPC — which is `backendSide`.
  require('./index.js')

  return uiSide
}

module.exports = { bootBackend }
