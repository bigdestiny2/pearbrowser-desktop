import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createAskStreamId,
  normalizePageContextResponse,
  createInitialAskStreamState,
  reduceAskStreamEvent,
  formatModelLabel,
  formatBytes,
  presentAskText
} from '../ui/lib/ask-browser.js'

test('createAskStreamId returns distinct renderer-owned ids', () => {
  const first = createAskStreamId()
  const second = createAskStreamId()
  assert.match(first, /^ask-[a-z0-9-]+$/i)
  assert.notEqual(first, second)
})

test('page context trusts tab URL and title instead of response metadata', () => {
  const context = normalizePageContextResponse({
    tabId: 'tab-1',
    url: 'hyper://attacker/',
    title: 'Spoofed title',
    text: 'Visible page text',
    source: 'renderer-dom'
  }, {
    id: 'tab-1',
    url: 'hyper://trusted/',
    displayUrl: 'hyper://display-only/',
    title: 'Trusted title'
  })

  assert.equal(context.url, 'hyper://trusted/')
  assert.equal(context.title, 'Trusted title')
  assert.equal(context.text, 'Visible page text')
  assert.equal(context.available, true)
  assert.equal(context.stale, false)
  assert.deepEqual(context.provenance, {
    tabId: 'trusted-tab',
    url: 'trusted-tab',
    title: 'trusted-tab',
    text: 'context-response'
  })
})

test('page context discards stale and malformed extraction responses', () => {
  const tab = { id: 'tab-current', url: 'hyper://current/', title: 'Current' }
  const stale = normalizePageContextResponse({
    tabId: 'tab-old',
    text: 'private text from old tab'
  }, tab)
  assert.equal(stale.stale, true)
  assert.equal(stale.available, false)
  assert.equal(stale.text, '')

  const malformed = normalizePageContextResponse({ text: ['not', 'text'] }, tab)
  assert.equal(malformed.stale, false)
  assert.equal(malformed.available, false)
  assert.equal(malformed.text, '')

  const absent = normalizePageContextResponse(null, null)
  assert.equal(absent.title, 'Untitled page')
  assert.equal(absent.available, false)
})

test('page context caps UTF-8 without splitting a multibyte character', () => {
  const context = normalizePageContextResponse({
    tabId: 'tab-1',
    text: 'A😀éB'
  }, {
    id: 'tab-1',
    url: 'hyper://trusted/',
    title: 'Trusted'
  }, { maxTextBytes: 6 })

  assert.equal(context.text, 'A😀')
  assert.equal(context.textBytes, 5)
  assert.equal(new TextEncoder().encode(context.text).byteLength, 5)
  assert.equal(context.truncated, true)
})

test('page context accepts the authenticated bridge response shape', () => {
  const context = normalizePageContextResponse({
    tabId: 'tab-1',
    context: { selection: 'important sentence', body: 'rest of page' },
    flags: { truncated: false }
  }, { id: 'tab-1', url: 'hyper://trusted/', title: 'Trusted' })

  assert.equal(context.available, true)
  assert.equal(context.text, 'Selected text:\nimportant sentence\n\nPage text:\nrest of page')
})

test('stream reducer accumulates progress, deltas, stats, and completion', () => {
  const streamId = 'ask-current'
  let state = createInitialAskStreamState(streamId)
  assert.equal(state.status, 'starting')

  state = reduceAskStreamEvent(state, {
    streamId,
    event: { type: 'model-progress', progress: 1.5 }
  })
  assert.equal(state.status, 'loading-model')
  assert.equal(state.modelProgress, 1)

  state = reduceAskStreamEvent(state, {
    streamId,
    event: { type: 'model-progress', progress: { percentage: 50 } }
  })
  assert.equal(state.modelProgress, 0.5)

  state = reduceAskStreamEvent(state, {
    streamId,
    event: { type: 'text', delta: 'Hello' }
  })
  state = reduceAskStreamEvent(state, {
    requestId: streamId,
    event: { type: 'text', delta: ' world' }
  })
  assert.equal(state.status, 'streaming')
  assert.equal(state.text, 'Hello world')

  state = reduceAskStreamEvent(state, {
    streamId,
    event: { type: 'stats', stats: { tokensPerSecond: 12.5, backendDevice: 'cpu' } }
  })
  assert.deepEqual(state.stats, { tokensPerSecond: 12.5, backendDevice: 'cpu' })

  state = reduceAskStreamEvent(state, {
    streamId,
    event: { type: 'done', finishReason: 'eos' }
  })
  assert.equal(state.status, 'done')
  assert.equal(state.finishReason, 'eos')
  assert.equal(state.text, 'Hello world')
})

test('stream reducer ignores stale, unscoped, malformed, and post-terminal events', () => {
  const initial = createInitialAskStreamState('ask-current')
  assert.strictEqual(reduceAskStreamEvent(initial, {
    streamId: 'ask-stale',
    event: { type: 'text', delta: 'wrong stream' }
  }), initial)
  assert.strictEqual(reduceAskStreamEvent(initial, {
    event: { type: 'text', delta: 'missing stream id' }
  }), initial)
  assert.strictEqual(reduceAskStreamEvent(initial, {
    streamId: 'ask-current',
    event: { type: 'text', delta: 42 }
  }), initial)
  assert.strictEqual(reduceAskStreamEvent(initial, {
    streamId: 'ask-current',
    event: { type: 'stats', stats: [] }
  }), initial)

  const done = reduceAskStreamEvent(initial, {
    streamId: 'ask-current',
    event: { type: 'done' }
  })
  assert.strictEqual(reduceAskStreamEvent(done, {
    streamId: 'ask-current',
    event: { type: 'text', delta: 'too late' }
  }), done)
})

test('stream reducer records terminal errors and cancellation', () => {
  const failed = reduceAskStreamEvent(createInitialAskStreamState('ask-fail'), {
    streamId: 'ask-fail',
    event: { type: 'error', code: 'model-load-failed', message: 'Could not load model' }
  })
  assert.equal(failed.status, 'error')
  assert.equal(failed.finishReason, 'error')
  assert.deepEqual(failed.error, {
    code: 'model-load-failed',
    message: 'Could not load model'
  })

  const cancelled = reduceAskStreamEvent(createInitialAskStreamState('ask-cancel'), {
    streamId: 'ask-cancel',
    event: { type: 'done', finishReason: 'cancelled' }
  })
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(cancelled.finishReason, 'cancelled')
})

test('model and byte labels are concise', () => {
  assert.equal(formatModelLabel('local-qwen_3'), 'Local QWEN 3')
  assert.equal(formatModelLabel(''), 'Local model')
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1024 * 1024), '1 MB')
  assert.equal(formatBytes(-1), '—')
})

test('presentation hides model thinking tags from the transcript', () => {
  assert.equal(presentAskText('<think>private reasoning</think>\n\nAnswer [1]'), 'Answer [1]')
  assert.equal(presentAskText('<think>still reasoning'), '')
})
