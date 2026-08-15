import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import b4a from 'b4a'
import receiptMod from '../backend/anongpt-receipt.cjs'
import secp from '../backend/secp256k1-bundle.cjs'
import buyerMod from '../backend/anongpt-buyer.js'

const {
  RECEIPT_SCHEMA,
  hcjson,
  sha256Hex,
  signingMessage,
  receiptCore,
  verifyReceipt
} = receiptMod
const { AnongptBuyer } = buyerMod

const SELLER_SK = '11'.repeat(32)
const SELLER_PUB = secp.schnorrGetPublicKey(SELLER_SK)
const DIAL_KEY = '22'.repeat(32)
const INPUT = 'What is a peer-to-peer network?'
const TEXT = 'A network where peers exchange data directly.'
const RATE_CARD = { perCall: 50, perInputToken: 1, perOutputToken: 4 }

function wordCount (s) {
  return String(s).trim().split(/\s+/).filter(Boolean).length
}

function mintReceipt (o = {}) {
  const promptTokens = o.promptTokens ?? wordCount(o.input ?? INPUT)
  const outputTokens = o.outputTokens ?? wordCount(o.text ?? TEXT)
  const breakdown = o.breakdown ?? {
    base: RATE_CARD.perCall,
    input: promptTokens * RATE_CARD.perInputToken,
    output: outputTokens * RATE_CARD.perOutputToken
  }
  const core = {
    schema: RECEIPT_SCHEMA,
    requestId: 'req-1',
    sellerPubkey: SELLER_PUB,
    modelId: 'qvac-smollm2',
    modelDigest: sha256Hex('synthetic-model'),
    inputHash: sha256Hex(hcjson(o.input ?? INPUT)),
    outputHash: sha256Hex(String(o.text ?? TEXT)),
    promptTokens,
    outputTokens,
    rateCardId: 'hivemind/usdt-rate-card@1',
    breakdown,
    cost: breakdown.base + breakdown.input + breakdown.output,
    asset: 'USDT',
    payment: { rHash: 'b'.repeat(64), preimage: 'c'.repeat(64) },
    timestamp: 1700000000000
  }
  return {
    ...core,
    sellerSig: secp.schnorrSign(signingMessage(receiptCore(core)), SELLER_SK, '00'.repeat(32))
  }
}

async function runBuyerWith (serverResult, req = {}) {
  let activeProtocol = null

  class FakeServiceRegistry {}
  class FakeServiceProtocol extends EventEmitter {
    constructor () {
      super()
      activeProtocol = this
    }

    attach () {}
    destroy () {}

    async request (remotePubkey, service, method, payload) {
      assert.equal(remotePubkey, DIAL_KEY)
      assert.equal(service, 'ai')
      assert.equal(method, 'infer')
      assert.equal(payload.input, req.input || INPUT)
      return serverResult
    }
  }
  class FakeHyperswarm extends EventEmitter {
    join (key, opts) {
      assert.equal(b4a.toString(key, 'hex'), DIAL_KEY)
      assert.equal(opts.client, true)
      assert.equal(opts.server, false)
      setImmediate(() => activeProtocol.emit('channel-open', { remotePubkey: DIAL_KEY }))
    }

    async destroy () {}
  }

  const buyer = new AnongptBuyer({
    services: {
      ServiceRegistry: FakeServiceRegistry,
      ServiceProtocol: FakeServiceProtocol
    },
    // The full suite runs native crypto and Argon2 tests in parallel. Keep this
    // synthetic transport deadline above scheduler jitter; no test waits for it.
    dialTimeoutMs: 2000,
    inferTimeoutMs: 2000
  })
  buyer._resolveModules = () => ({
    ServiceRegistry: FakeServiceRegistry,
    ServiceProtocol: FakeServiceProtocol,
    Hyperswarm: FakeHyperswarm,
    b4a
  })
  return buyer.infer({
    input: INPUT,
    sellerPubkey: DIAL_KEY,
    rateCard: RATE_CARD,
    ...req
  })
}

test('HCJSON golden vector stays byte-stable for receipt signatures', () => {
  const core = {
    schema: 'hivemind/receipt@1.0',
    requestId: 'req-1',
    sellerPubkey: 'ab12',
    modelId: 'qvac-smollm2',
    promptTokens: 11,
    outputTokens: 22,
    breakdown: { base: 50, input: 11, output: 88 },
    cost: 149,
    asset: 'USDT',
    payment: { rHash: 'bb22', preimage: 'cc33' },
    timestamp: 1700000000000
  }
  const expected = '{"asset":"USDT","breakdown":{"base":50,"input":11,"output":88},"cost":149,"modelId":"qvac-smollm2","outputTokens":22,"payment":{"preimage":"cc33","rHash":"bb22"},"promptTokens":11,"requestId":"req-1","schema":"hivemind/receipt@1.0","sellerPubkey":"ab12","timestamp":1700000000000}'
  assert.equal(hcjson(core), expected)
  assert.equal(signingMessage(core), sha256Hex(expected))
})

test('verifyReceipt accepts an honest receipt and rejects output rebinding', async () => {
  const receipt = mintReceipt()
  assert.equal((await verifyReceipt(receipt, { input: INPUT, output: TEXT, rateCard: RATE_CARD })).ok, true)

  const tampered = await verifyReceipt(receipt, { input: INPUT, output: TEXT + ' extra', rateCard: RATE_CARD })
  assert.equal(tampered.ok, false)
  assert.equal(tampered.failedStep, 6)
})

test('AnongptBuyer returns locally verified success for a valid seller receipt', async () => {
  const receipt = mintReceipt()
  const result = await runBuyerWith({
    text: TEXT,
    promptTokens: receipt.promptTokens,
    tokens: receipt.outputTokens,
    tokensPerSecond: 12,
    backendDevice: 'qvac/cpu',
    verify: { ok: false, reason: 'seller-supplied-value-must-be-ignored' },
    receipt
  })

  assert.equal(result.ok, true)
  assert.equal(result.verify.ok, true, result.verify.detail)
  assert.equal(result.result.receipt, receipt)
})

test('AnongptBuyer keeps a successful but forged answer untrusted', async () => {
  const receipt = mintReceipt({ text: TEXT })
  const result = await runBuyerWith({
    text: TEXT + ' swapped',
    promptTokens: receipt.promptTokens,
    tokens: receipt.outputTokens,
    tokensPerSecond: 12,
    backendDevice: 'qvac/cpu',
    receipt
  })

  assert.equal(result.ok, true)
  assert.equal(result.verify.ok, false)
  assert.equal(result.verify.failedStep, 6)
})

test('browser anonGPT shim fails closed if local verify metadata is missing', () => {
  const bridgePath = fileURLToPath(new URL('../backend/pear-bridge.js', import.meta.url))
  const bridgeSource = readFileSync(bridgePath, 'utf8')
  assert.match(bridgeSource, /missing-local-verify/)
  assert.match(bridgeSource, /json\.verify\.ok = false/)
})
