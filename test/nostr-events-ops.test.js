// SPIKE-SCHNORR-BARE — go/no-go: can a vendored CJS bundle of BIP-340 Schnorr
// load + run under Bare (no ESM, no dynamic import)? Gates ALL of Nostr + anonGPT
// Phase 1b receipts.
//
// VERDICT: GREEN ✅
//   - backend/secp256k1-bundle.cjs (esbuild → CJS, the sheets-bundle pattern)
//     loads via require() and is self-contained pure JS (no node-builtin require),
//     so it loads under Bare exactly like sheets-bundle.cjs.
//   - BIP-340 conformant: the deterministic signature matches official vector #1.
//   - NIP-01 event id + sign/verify works and is content-bound.
//   Caveat: non-deterministic signing uses the global crypto.getRandomValues; under
//   Bare, pass an explicit auxRand (bare-crypto.randomBytes) for signing. Verify
//   (the receipt/event-consumer path) needs no randomness.
//
// Rebuild the bundle with: sh scripts/build-secp256k1-bundle.sh
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import bMod from '../backend/secp256k1-bundle.cjs'
import { tamperLastHexByte } from './helpers/hex.js'
const b = bMod

// BIP-340 official test vector #1
const VEC = {
  sk: 'B7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D9045190CFEF',
  pk: 'DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659',
  aux: '0000000000000000000000000000000000000000000000000000000000000001',
  msg: '243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89',
  sig: '6896BD60EEAE296DB48A229FF71DFE071BDE413E6D43F917DC8DCF8C78DE33418906D11AC976ABCCB20B091292BFF4EA897EFCB639EA871CFA95F6DE339E4B0A',
}

test('the bundle loads via require() and exports the schnorr + NIP-01 API', () => {
  for (const fn of ['schnorrGetPublicKey', 'schnorrSign', 'schnorrVerify', 'sha256Hex', 'nip01Serialize', 'nip01EventId', 'nip01Sign', 'nip01Verify']) {
    assert.equal(typeof b[fn], 'function', fn)
  }
})

test('BIP-340 conformance: matches official test vector #1 (deterministic aux)', () => {
  assert.equal(b.schnorrGetPublicKey(VEC.sk).toUpperCase(), VEC.pk)
  assert.equal(b.schnorrSign(VEC.msg, VEC.sk, VEC.aux).toUpperCase(), VEC.sig)
  assert.equal(b.schnorrVerify(VEC.sig, VEC.msg, VEC.pk), true)
})

test('schnorr verify rejects a tampered message, signature, and wrong key', () => {
  const sk = '11'.repeat(32)
  const pk = b.schnorrGetPublicKey(sk)
  const msg = b.sha256Hex('hello')
  const sig = b.schnorrSign(msg, sk)
  assert.equal(b.schnorrVerify(sig, msg, pk), true)
  assert.equal(b.schnorrVerify(sig, b.sha256Hex('hellox'), pk), false) // tampered msg
  assert.equal(b.schnorrVerify(tamperLastHexByte(sig), msg, pk), false) // tampered sig
  assert.equal(b.schnorrVerify(sig, msg, b.schnorrGetPublicKey('22'.repeat(32))), false) // wrong key
})

test('NIP-01: event id serialization + sign + verify, content-bound', () => {
  const pk = b.schnorrGetPublicKey(VEC.sk)
  const ev = { pubkey: pk, created_at: 1700000000, kind: 1, tags: [['t', 'gm']], content: 'gm' }
  assert.equal(b.nip01Serialize(ev), JSON.stringify([0, pk, 1700000000, 1, [['t', 'gm']], 'gm']))
  assert.match(b.nip01EventId(ev), /^[0-9a-f]{64}$/)
  const signed = b.nip01Sign(ev, VEC.sk)
  assert.equal(b.nip01Verify(signed), true)
  assert.equal(b.nip01Verify({ ...signed, content: 'evil' }), false) // id no longer commits to content
  assert.equal(b.nip01Verify({ ...signed, sig: tamperLastHexByte(signed.sig) }), false)
})

test('the bundle is self-contained pure JS (no require() → Bare-loadable)', () => {
  const src = readFileSync(new URL('../backend/secp256k1-bundle.cjs', import.meta.url), 'utf8')
  const reqs = [...src.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1])
  assert.deepEqual(reqs, [], 'bundle must inline everything (no require): ' + reqs.join(','))
})
