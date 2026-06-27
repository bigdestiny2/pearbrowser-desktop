/**
 * Test helpers for exercising the Protomux-multiplexed swarm.v1 bridge.
 *
 * Production swarm connections are @hyperswarm/secret-stream byte Duplexes.
 * SwarmBridge runs Protomux.from(conn) on one end; MockPeer runs it on the
 * other and opens matching (protocol, topic) sub-channels.
 */

import { Duplex } from 'streamx'
import Protomux from 'protomux'
import c from 'compact-encoding'
import b4a from 'b4a'

function duplexPair () {
  let a = null
  let b = null

  a = new Duplex({
    write (data, cb) { b.push(b4a.from(data)); cb() },
    final (cb) { try { b.push(null) } catch {} ; cb() }
  })
  b = new Duplex({
    write (data, cb) { a.push(b4a.from(data)); cb() },
    final (cb) { try { a.push(null) } catch {} ; cb() }
  })

  a.once('close', () => { if (!b.destroyed) b.destroy() })
  b.once('close', () => { if (!a.destroyed) a.destroy() })

  return [a, b]
}

class MockPeer {
  constructor (conn) {
    this.conn = conn
    this.mux = Protomux.from(conn)
    this.channels = new Map()
  }

  static key (protocol, id) {
    return protocol + '##' + b4a.toString(b4a.from(id), 'hex')
  }

  openChannel ({ protocol, id, onopen, onmessage, onclose }) {
    const idBuf = b4a.from(id)
    const entry = { ch: null, msg: null, received: [], opened: false }
    const key = MockPeer.key(protocol, idBuf)

    const ch = this.mux.createChannel({
      protocol,
      id: idBuf,
      unique: true,
      onopen: () => { entry.opened = true; if (onopen) onopen() },
      onclose: () => { if (onclose) onclose() },
      ondestroy: () => {}
    })
    if (ch === null) throw new Error('MockPeer: duplicate channel for ' + key)

    const msg = ch.addMessage({
      encoding: c.raw,
      onmessage: (payload) => {
        const buf = b4a.from(payload)
        entry.received.push(buf)
        if (onmessage) onmessage(buf)
      }
    })

    entry.ch = ch
    entry.msg = msg
    entry.send = (data) => msg.send(b4a.from(data))
    entry.close = () => { try { ch.close() } catch {} }
    this.channels.set(key, entry)

    ch.open()
    return entry
  }

  destroy () {
    try { this.conn.destroy() } catch {}
  }
}

export { duplexPair, MockPeer }
