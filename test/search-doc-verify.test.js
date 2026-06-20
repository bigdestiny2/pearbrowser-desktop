// Step 5a — a trusted peer can VERIFY a replicated search posting. Proves
// search-core.canonDocBytes reconstructs the exact signed bytes from a d! record
// and that identity-binding.verifyAppSig accepts a posting signed with the
// author's search key (and rejects tampering / impersonation). This is the
// integrity foundation the federated RowVerifier (Step 5b) builds on.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import scMod from '../backend/search-core.cjs'
import ibMod from '../backend/identity-binding.cjs'
const sc = scMod
const ib = ibMod

const hex = (b) => b4a.toString(b, 'hex')
const DOC_NS = 'lighthouse-doc-v2'

// the PersonalIndex sign hook, parameterized by a search keypair
const signerFor = (kp) => (canonDoc) => ({
  sig: hex(crypto.sign(ib.appMessage('search', JSON.stringify(canonDoc), DOC_NS), kp.secretKey)),
  pubkey: hex(kp.publicKey),
})
const dRecOf = (records) => records.find(([k]) => k.startsWith('d!'))[1]

test('canonDocBytes lets a peer verify a posting signed with the author search key', () => {
  const kp = crypto.keyPair()
  const { records } = sc.buildDocRecords(
    { driveKey: 'd1', path: '/', title: 'Keet', body: 'encrypted peer to peer chat' }, signerFor(kp))
  const dRec = dRecOf(records)
  assert.equal(dRec.signerPubkey, hex(kp.publicKey))
  assert.equal(ib.verifyAppSig('search', sc.canonDocBytes(dRec), dRec.sig, dRec.signerPubkey, DOC_NS), true)
})

test('a tampered d! record fails verification (title/driveKey/publishedAt/terms are bound)', () => {
  const kp = crypto.keyPair()
  const { records } = sc.buildDocRecords(
    { driveKey: 'd1', path: '/', title: 'Real', body: 'alpha beta gamma' }, signerFor(kp))
  const dRec = dRecOf(records)
  for (const tampered of [
    { ...dRec, title: 'EVIL' },
    { ...dRec, driveKey: 'attacker' },
    { ...dRec, publishedAt: 9999999999 },
    { ...dRec, terms: [] },
  ]) {
    assert.equal(ib.verifyAppSig('search', sc.canonDocBytes(tampered), dRec.sig, dRec.signerPubkey, DOC_NS), false)
  }
})

test('a posting verified against the wrong pubkey fails (impersonation)', () => {
  const real = crypto.keyPair()
  const attacker = crypto.keyPair()
  const { records } = sc.buildDocRecords(
    { driveKey: 'd1', path: '/', title: 'X', body: 'one two three' }, signerFor(real))
  const dRec = dRecOf(records)
  assert.equal(ib.verifyAppSig('search', sc.canonDocBytes(dRec), dRec.sig, hex(attacker.publicKey), DOC_NS), false)
})
