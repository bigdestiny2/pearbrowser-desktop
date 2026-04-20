/**
 * Pear adapter for PearBrowser backend.
 *
 * The original backend assumes a mobile BareKit host that injects
 * `BareKit.IPC` (a duplex stream) before the backend loads. In the
 * desktop Pear fork we run the backend in the renderer for M1 and
 * fake that injection with an in-memory pipe pair.
 *
 * Migration to a real 2-process layout (pear-run + pear-pipe) only
 * has to swap the two "sides" returned here for a real `bare-pipe`
 * duplex; the backend code above and the UI RPC client below don't
 * change.
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

function bootBackend ({ storagePath }) {
  const [uiSide, backendSide] = createPipePair()

  // Shim the BareKit global the backend expects.
  globalThis.BareKit = { IPC: backendSide }

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
