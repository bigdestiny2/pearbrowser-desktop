import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { Script } from 'node:vm'

import bridge from '../backend/page-context-bridge.cjs'

const {
  PAGE_CONTEXT_META_NAME,
  PAGE_CONTEXT_SHIM_BODY,
  PAGE_CONTEXT_SHIM,
  PAGE_CONTEXT_SHIM_HASH,
  pageContextMeta
} = bridge

const TOKEN = 'a'.repeat(64)

function element ({ excluded = false, visible = true } = {}) {
  return {
    closest () { return excluded ? this : null },
    checkVisibility () { return visible }
  }
}

function textNode (text, opts) {
  return {
    data: text,
    nodeValue: text,
    parentElement: element(opts)
  }
}

function makePort () {
  return {
    messages: [],
    closed: 0,
    postMessage (message) { this.messages.push(message) },
    close () { this.closed++ }
  }
}

function bootShim ({
  token = TOKEN,
  title = 'Example',
  selection = 'selected text',
  nodes = [textNode('visible body')]
} = {}) {
  let messageListener = null
  const parent = {}
  const document = {
    title,
    body: {},
    querySelector (selector) {
      assert.equal(selector, `meta[name="${PAGE_CONTEXT_META_NAME}"]`)
      return token ? { content: token } : null
    },
    createTreeWalker () {
      let index = 0
      return {
        nextNode () { return nodes[index++] || null }
      }
    }
  }
  const window = {
    parent,
    addEventListener (type, listener, capture) {
      assert.equal(type, 'message')
      assert.equal(capture, true)
      messageListener = listener
    },
    getSelection () {
      return { toString: () => selection }
    },
    getComputedStyle () {
      return { display: 'block', visibility: 'visible' }
    }
  }
  new Script(PAGE_CONTEXT_SHIM_BODY).runInNewContext({
    window,
    document,
    NodeFilter: { SHOW_TEXT: 4 },
    TextEncoder,
    TextDecoder
  })
  assert.equal(typeof messageListener, 'function')
  return { listener: messageListener, parent, window }
}

function request (runtime, overrides = {}) {
  const port = overrides.port || makePort()
  runtime.listener({
    source: overrides.source === undefined ? runtime.parent : overrides.source,
    data: {
      type: 'pearbrowser:context-request',
      v: 1,
      requestId: 'request-1',
      contextToken: TOKEN,
      ...(overrides.data || {})
    },
    ports: overrides.ports || [port]
  })
  return port
}

test('page context shim is exact valid JavaScript with a matching CSP hash', () => {
  assert.equal(PAGE_CONTEXT_SHIM, `<script>${PAGE_CONTEXT_SHIM_BODY}</script>`)
  assert.doesNotThrow(() => new Script(PAGE_CONTEXT_SHIM_BODY))
  const actualHash = crypto.createHash('sha256').update(PAGE_CONTEXT_SHIM_BODY, 'utf8').digest('base64')
  assert.equal(PAGE_CONTEXT_SHIM_HASH, actualHash)
})

test('page context meta accepts only normalized 32-byte hexadecimal tokens', () => {
  assert.equal(
    pageContextMeta(' A'.trim().repeat(64)),
    `<meta name="${PAGE_CONTEXT_META_NAME}" content="${TOKEN}">`
  )
  assert.throws(() => pageContextMeta('short'), /32 bytes of hexadecimal/)
  assert.throws(() => pageContextMeta('z'.repeat(64)), /32 bytes of hexadecimal/)
})

test('page context bridge requires its parent, exact protocol, token, and one MessagePort', () => {
  const runtime = bootShim()

  const wrongSource = request(runtime, { source: {} })
  assert.deepEqual(wrongSource.messages, [])

  const wrongType = request(runtime, { data: { type: 'pearbrowser:other' } })
  assert.deepEqual(wrongType.messages, [])

  const wrongVersion = request(runtime, { data: { v: 2 } })
  assert.deepEqual(wrongVersion.messages, [])

  const wrongToken = request(runtime, { data: { contextToken: 'b'.repeat(64) } })
  assert.deepEqual(wrongToken.messages, [])
  assert.equal(wrongToken.closed, 1)

  const noPort = makePort()
  request(runtime, { port: noPort, ports: [] })
  assert.deepEqual(noPort.messages, [])

  const extraPorts = [makePort(), makePort()]
  request(runtime, { port: extraPorts[0], ports: extraPorts })
  assert.deepEqual(extraPorts[0].messages, [])
  assert.deepEqual(extraPorts[1].messages, [])
})

test('page context bridge extracts bounded UTF-8 text and omits form values', () => {
  const secret = 'PASSWORD_VALUE_MUST_NOT_LEAK'
  const runtime = bootShim({
    title: 'T'.repeat(2000),
    selection: 'é'.repeat(10000),
    nodes: [
      textNode(secret, { excluded: true }),
      textNode('😀'.repeat(10000))
    ]
  })
  const port = request(runtime)

  assert.equal(port.closed, 1)
  assert.equal(port.messages.length, 1)
  const response = port.messages[0]
  assert.equal(response.type, 'pearbrowser:context-response')
  assert.equal(response.v, 1)
  assert.equal(response.requestId, 'request-1')
  assert.ok(response.bytes.title <= 512)
  assert.ok(response.bytes.selection <= 8 * 1024)
  assert.ok(response.bytes.body <= 20 * 1024)
  assert.ok(response.bytes.total <= 24 * 1024)
  assert.equal(new TextEncoder().encode(response.context.title).byteLength, response.bytes.title)
  assert.equal(new TextEncoder().encode(response.context.selection).byteLength, response.bytes.selection)
  assert.equal(new TextEncoder().encode(response.context.body).byteLength, response.bytes.body)
  assert.equal(response.context.body.includes(secret), false)
  assert.equal(response.context.selection.endsWith('\ufffd'), false)
  assert.equal(response.context.body.endsWith('\ufffd'), false)
  assert.deepEqual({ ...response.flags }, {
    truncated: true,
    titleTruncated: true,
    selectionTruncated: true,
    bodyTruncated: true,
    nodeLimitReached: false
  })
})

test('page context bridge excludes opacity-hidden text from model context', () => {
  assert.match(PAGE_CONTEXT_SHIM_BODY, /checkOpacity: true/)
  assert.match(PAGE_CONTEXT_SHIM_BODY, /Number\(style\.opacity\) === 0/)
})
