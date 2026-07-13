import test from 'node:test'
import assert from 'node:assert/strict'
import {
  summarizeAiCapabilities,
  pickQuickAskModel,
  describeAiStatus,
  buildQuickAskRequest
} from '../ui/lib/qvac-widget.js'

const MODELS = [
  { alias: 'pear-small-chat', label: 'Pear Small Chat', provider: 'qvac', installed: false, expectedSize: 386404992 },
  { alias: 'ollama:qwen3:32b', label: 'qwen3:32b', provider: 'ollama', installed: true, recommended: true },
  { alias: 'ollama:qwen2.5:7b', label: 'qwen2.5:7b', provider: 'ollama', installed: false }
]

test('capability summary normalizes a healthy response', () => {
  const summary = summarizeAiCapabilities({
    available: true,
    busy: false,
    queueDepth: 0,
    models: MODELS
  })

  assert.equal(summary.available, true)
  assert.equal(summary.modelCount, 3)
  assert.equal(summary.loadedCount, 1)
  assert.equal(summary.models[1].alias, 'ollama:qwen3:32b')
  assert.equal(summary.models[1].recommended, true)
  assert.equal(summary.reason, '')
})

test('capability summary fails closed on malformed and unavailable responses', () => {
  assert.deepEqual(summarizeAiCapabilities(null), {
    available: false,
    reason: 'no-capabilities',
    busy: false,
    queueDepth: 0,
    modelCount: 0,
    loadedCount: 0,
    models: []
  })

  const closed = summarizeAiCapabilities({ available: false, reason: 'service-closed', models: MODELS })
  assert.equal(closed.available, false)
  assert.equal(closed.reason, 'service-closed')

  const empty = summarizeAiCapabilities({ available: true, models: [] })
  assert.equal(empty.available, false)
  assert.equal(empty.reason, 'no-models')

  const garbage = summarizeAiCapabilities({ available: true, models: ['nope', 42, { label: 'aliasless' }] })
  assert.equal(garbage.available, false)
  assert.equal(garbage.modelCount, 0)
})

test('quick-ask model preference matches the Ask Browser panel order', () => {
  assert.equal(pickQuickAskModel(MODELS), 'ollama:qwen3:32b')
  assert.equal(pickQuickAskModel(MODELS, 'ollama:qwen2.5:7b'), 'ollama:qwen2.5:7b')
  assert.equal(pickQuickAskModel(MODELS, 'gone-model'), 'ollama:qwen3:32b')

  const noRecommendation = MODELS.map(model => ({ ...model, recommended: false }))
  assert.equal(pickQuickAskModel(noRecommendation), 'ollama:qwen3:32b')

  const qvacOnly = [MODELS[0]]
  assert.equal(pickQuickAskModel(qvacOnly), 'pear-small-chat')
  assert.equal(pickQuickAskModel([]), '')
  assert.equal(pickQuickAskModel(undefined), '')
})

test('status line stays deterministic across states', () => {
  assert.equal(describeAiStatus(summarizeAiCapabilities(null)), 'Local AI unavailable · no-capabilities')
  assert.equal(
    describeAiStatus(summarizeAiCapabilities({ available: true, models: MODELS })),
    '3 local models · ready in memory'
  )
  assert.equal(
    describeAiStatus(summarizeAiCapabilities({
      available: true,
      models: [{ alias: 'pear-small-chat' }]
    })),
    '1 local model · loads on first use'
  )
  assert.equal(
    describeAiStatus(summarizeAiCapabilities({ available: true, busy: true, models: MODELS })),
    '3 local models · generating'
  )
})

test('quick-ask request carries no page context and bounded history', () => {
  const request = buildQuickAskRequest({
    streamId: 'ask-widget-1',
    model: 'pear-small-chat',
    question: '  What is a Hyperdrive?  ',
    history: [
      { role: 'system', content: 'ignored role' },
      { role: 'user', content: 'earlier question' },
      { role: 'assistant', content: 'earlier answer' },
      { role: 'assistant', content: '   ' },
      'not-a-turn'
    ]
  })

  assert.deepEqual(request, {
    streamId: 'ask-widget-1',
    model: 'pear-small-chat',
    question: 'What is a Hyperdrive?',
    history: [
      { role: 'user', content: 'earlier question' },
      { role: 'assistant', content: 'earlier answer' }
    ],
    page: {},
    maxTokens: 192,
    temperature: 0.3
  })
})

test('quick-ask request validation fails closed', () => {
  assert.throws(() => buildQuickAskRequest({ model: 'pear-small-chat', question: 'hi' }), /stream id/)
  assert.throws(() => buildQuickAskRequest({ streamId: 'ask-1', question: 'hi' }), /model alias/)
  assert.throws(() => buildQuickAskRequest({ streamId: 'ask-1', model: 'pear-small-chat', question: '   ' }), /non-empty question/)

  const long = buildQuickAskRequest({
    streamId: 'ask-1',
    model: 'pear-small-chat',
    question: 'q'.repeat(5000)
  })
  assert.equal(long.question.length, 2000)
})
