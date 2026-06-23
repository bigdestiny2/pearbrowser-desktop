/**
 * anonGPT / HiveMind receipt verification.
 *
 * Verify-only port of HiveMind's receipt verifier: HCJSON canonicalization,
 * Schnorr signature verification, and the buyer-side receipt checks. The
 * seller may include unsigned display extras on the receipt; only CORE_KEYS
 * are reconstructed into the signed core.
 */

const secp = require('./secp256k1-bundle.cjs')

const RECEIPT_SCHEMA = 'hivemind/receipt@1.0'
const SUPPORTED_MAJORS = new Set([1])

const CORE_KEYS = [
  'schema', 'requestId', 'sellerPubkey', 'buyerPubkey', 'modelId', 'modelDigest',
  'inputHash', 'outputHash', 'promptTokens', 'outputTokens', 'rateCardId',
  'breakdown', 'cost', 'asset', 'payment', 'timestamp'
]

const OUTPUT_SPECIAL_MARGIN = 8
const PROMPT_TEMPLATE_MARGIN = 64

function hcjson (value) {
  const out = encode(value)
  if (out === undefined) throw new Error('hcjson: top-level value serialized to nothing')
  return out
}

function encode (v) {
  if (v === null || v === undefined) return undefined
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) {
      throw new Error('hcjson: non-integer number not allowed in canonical form: ' + v)
    }
    return String(v)
  }
  if (Array.isArray(v)) return '[' + v.map((x) => encode(x) ?? 'null').join(',') + ']'
  if (typeof v === 'object') {
    const keys = Object.keys(v)
      .filter((k) => v[k] !== null && v[k] !== undefined)
      .sort()
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + encode(v[k])).join(',') + '}'
  }
  throw new Error('hcjson: unsupported value type: ' + typeof v)
}

function sha256Hex (input) {
  return secp.sha256Hex(input)
}

function signingMessage (core) {
  return sha256Hex(hcjson(core))
}

function hexToBytes (hex) {
  const s = String(hex)
  if (s.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(s)) throw new Error('invalid hex input')
  const out = new Uint8Array(s.length >> 1)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16)
  return out
}

function verifyCoreSig (core, sigHex, pubkeyHex) {
  if (!sigHex || !pubkeyHex) return false
  return secp.schnorrVerify(sigHex, signingMessage(core), pubkeyHex)
}

function codePoints (s) {
  return [...String(s)].length
}

function inputText (input) {
  if (Array.isArray(input)) return input.map((m) => String(m && m.content != null ? m.content : '')).join('\n')
  return String(input)
}

function parseSchema (schema) {
  const m = /^([^@]+)@(\d+)\.(\d+)$/.exec(String(schema || ''))
  if (!m) return null
  return { name: m[1], major: Number(m[2]), minor: Number(m[3]) }
}

function receiptCore (r) {
  const core = {}
  if (!r || typeof r !== 'object') return core
  for (const k of CORE_KEYS) {
    const v = r[k]
    if (v === undefined || v === null) continue
    if (k === 'breakdown') core.breakdown = { base: v.base, input: v.input, output: v.output }
    else if (k === 'payment') core.payment = { rHash: v.rHash, preimage: v.preimage }
    else core[k] = v
  }
  return core
}

async function verifyReceipt (receipt, expected = {}, opts = {}) {
  const fail = (failedStep, detail) => ({ ok: false, failedStep, detail })
  const notes = {}

  try {
    if (!receipt || typeof receipt !== 'object') return fail(1, 'receipt missing or not an object')

    const sch = parseSchema(receipt.schema)
    if (!sch || sch.name !== 'hivemind/receipt' || !SUPPORTED_MAJORS.has(sch.major)) {
      return fail(1, 'unsupported schema: ' + receipt.schema)
    }
    if (receipt.asset !== 'USDT') return fail(1, 'unexpected asset: ' + receipt.asset)

    if (!verifyCoreSig(receiptCore(receipt), receipt.sellerSig, receipt.sellerPubkey)) {
      return fail(2, 'seller signature invalid')
    }

    if (expected.sellerPubkey && receipt.sellerPubkey !== expected.sellerPubkey) {
      return fail(3, 'sellerPubkey mismatch vs chosen seller')
    }
    if (expected.buyerPubkey && receipt.buyerPubkey !== expected.buyerPubkey) {
      return fail(3, 'buyerPubkey mismatch')
    }

    if (expected.modelId && receipt.modelId !== expected.modelId) {
      return fail(4, 'modelId mismatch: ' + receipt.modelId + ' vs ' + expected.modelId)
    }
    if (expected.modelDigest && receipt.modelDigest !== expected.modelDigest) {
      return fail(4, 'modelDigest mismatch (possible model substitution)')
    }

    if (expected.input !== undefined) {
      const want = sha256Hex(hcjson(expected.input))
      if (receipt.inputHash !== want) return fail(5, 'inputHash does not bind the sent prompt')
    }

    if (expected.output !== undefined) {
      const want = sha256Hex(String(expected.output))
      if (receipt.outputHash !== want) return fail(6, 'outputHash does not bind the returned text')
    }

    const out = receipt.outputTokens
    const inp = receipt.promptTokens
    if (!Number.isInteger(out) || out < 0 || !Number.isInteger(inp) || inp < 0) {
      return fail(7, 'token counts must be non-negative integers')
    }
    if (expected.output !== undefined) {
      const outChars = codePoints(expected.output)
      if (out > outChars + OUTPUT_SPECIAL_MARGIN) {
        return fail(7, 'outputTokens ' + out + ' exceeds character ceiling ' + outChars + '+' + OUTPUT_SPECIAL_MARGIN + ' (inflation)')
      }
      if (outChars > 0 && out === 0) return fail(7, 'outputTokens 0 but text was produced')
    } else if (out > 0) {
      return fail(7, 'outputTokens > 0 but no output was bound — cannot verify the charge')
    }
    if (expected.input !== undefined) {
      const inChars = codePoints(inputText(expected.input))
      if (inp > inChars + PROMPT_TEMPLATE_MARGIN) {
        return fail(7, 'promptTokens ' + inp + ' exceeds character ceiling ' + inChars + '+' + PROMPT_TEMPLATE_MARGIN + ' (inflation)')
      }
    }
    if (typeof expected.tokenizer === 'function') {
      const count = (t) => {
        const r = expected.tokenizer(t)
        return Array.isArray(r) ? r.length : Number(r)
      }
      const tol = expected.tolerance || {}
      const tolOut = Number.isFinite(tol.out) ? tol.out : 0
      const tolIn = Number.isFinite(tol.in) ? tol.in : 8
      const tOut = count(String(expected.output ?? ''))
      const tIn = count(inputText(expected.input ?? ''))
      if (out > tOut + tolOut) return fail(7, 'outputTokens ' + out + ' > tokenizer ' + tOut + ' (+' + tolOut + ')')
      if (inp > tIn + tolIn) return fail(7, 'promptTokens ' + inp + ' > tokenizer ' + tIn + ' (+' + tolIn + ')')
      notes.recount = { tokenizerIn: tIn, tokenizerOut: tOut }
    } else {
      notes.recount = 'ceiling-only (no tokenizer injected — gross-inflation bound enforced)'
    }

    if (expected.rateCard) {
      const rc = expected.rateCard
      const base = rc.perCall
      const inCost = inp * rc.perInputToken
      const outCost = out * rc.perOutputToken
      const cost = base + inCost + outCost
      const b = receipt.breakdown || {}
      if (b.base !== base || b.input !== inCost || b.output !== outCost) {
        return fail(8, 'breakdown mismatch: got {' + b.base + ',' + b.input + ',' + b.output + '} want {' + base + ',' + inCost + ',' + outCost + '}')
      }
      if (receipt.cost !== cost) return fail(8, 'cost ' + receipt.cost + ' != recomputed ' + cost)
    }

    const pay = receipt.payment || {}
    if (!pay.preimage || typeof pay.preimage !== 'string') {
      return fail(9, 'missing payment preimage')
    }
    const hashLock = opts.hashLock ?? expected.hashLock ?? false
    if (hashLock) {
      const got = sha256Hex(hexToBytes(pay.preimage))
      if (got !== pay.rHash) return fail(9, 'preimage does not hash to rHash')
    } else {
      notes.payment = 'presence-only (provider does not honor hash-lock)'
    }

    return { ok: true, notes }
  } catch (e) {
    return { ok: false, failedStep: 0, detail: 'verifier error: ' + (e && e.message) }
  }
}

module.exports = {
  RECEIPT_SCHEMA,
  CORE_KEYS,
  OUTPUT_SPECIAL_MARGIN,
  PROMPT_TEMPLATE_MARGIN,
  hcjson,
  sha256Hex,
  signingMessage,
  verifyCoreSig,
  codePoints,
  inputText,
  parseSchema,
  receiptCore,
  verifyReceipt
}
