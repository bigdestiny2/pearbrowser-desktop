import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import sodium from 'sodium-universal'
import b4a from 'b4a'
import protocolMod from '../backend/identity-protocol.cjs'

const {
  LOGIN_PROTOCOL,
  LOGIN_NAMESPACE,
  DEFAULT_LOGIN_GRANT_TTL_MS,
  LOGIN_CHALLENGE_MAX_BYTES,
  MIN_LOGIN_GRANT_TTL_MS,
  normalizeLoginChallenge,
  normalizeLoginGrantTtlMs,
  normalizeLoginScopes,
  canonicalLoginPayload,
  makeLoginAttestation,
  verifyLoginAttestation,
} = protocolMod

const DRIVE = '0c35d12fd9b1115dd2d1fb1cd1751817c9173d3196ac7c62ae37d023340dcb75'
const NOW = 1782285204000

function keypairFromSeed (seed) {
  const publicKey = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const secretKey = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_seed_keypair(publicKey, secretKey, seed)
  return { publicKey, secretKey }
}

function fakeIdentity () {
  const keys = new Map()
  return {
    getAppKeypair (driveKeyHex) {
      if (!keys.has(driveKeyHex)) {
        const seed = createHash('sha256').update('test-root').update(driveKeyHex).digest()
        keys.set(driveKeyHex, keypairFromSeed(seed))
      }
      return keys.get(driveKeyHex)
    },
    signForApp (driveKeyHex, payload, namespace = '') {
      const { publicKey, secretKey } = this.getAppKeypair(driveKeyHex)
      const tag = `pear.app.${driveKeyHex}:${namespace}:`
      const message = b4a.concat([b4a.from(tag, 'utf8'), b4a.from(payload, 'utf8')])
      const signature = b4a.alloc(sodium.crypto_sign_BYTES)
      sodium.crypto_sign_detached(signature, message, secretKey)
      return {
        signature: b4a.toString(signature, 'hex'),
        publicKey: b4a.toString(publicKey, 'hex'),
        algorithm: 'ed25519',
        tag,
      }
    },
  }
}

test('normalizeLoginScopes keeps only supported scopes in protocol order', () => {
  assert.deepEqual(
    normalizeLoginScopes(['contacts:read', 'pay', 'profile:name', 'contacts:read', 7, '']),
    ['profile:name', 'contacts:read']
  )
})

test('normalizeLoginChallenge bounds verifier-provided freshness challenges', () => {
  assert.equal(normalizeLoginChallenge(null), null)
  assert.equal(normalizeLoginChallenge('nonce-123'), 'nonce-123')
  assert.throws(() => normalizeLoginChallenge('x'.repeat(LOGIN_CHALLENGE_MAX_BYTES + 1)), /challenge must be <=/)
  assert.throws(() => normalizeLoginChallenge({ nonce: 'x' }), /challenge must be a string/)
})

test('normalizeLoginGrantTtlMs clamps grants to the protocol window', () => {
  assert.equal(normalizeLoginGrantTtlMs(undefined), DEFAULT_LOGIN_GRANT_TTL_MS)
  assert.equal(normalizeLoginGrantTtlMs(1), MIN_LOGIN_GRANT_TTL_MS)
  assert.equal(normalizeLoginGrantTtlMs(DEFAULT_LOGIN_GRANT_TTL_MS * 10), DEFAULT_LOGIN_GRANT_TTL_MS)
})

test('Pear Passport login attestation verifies and keeps legacy proof fields', () => {
  const att = makeLoginAttestation({
    identity: fakeIdentity(),
    driveKeyHex: DRIVE.toUpperCase(),
    grant: {
      scopes: ['contacts:read', 'profile:name', 'pay'],
      grantedAt: NOW - 1000,
      expiresAt: NOW + DEFAULT_LOGIN_GRANT_TTL_MS,
    },
    challenge: 'login-challenge-001',
    now: NOW,
  })

  assert.equal(att.protocol, LOGIN_PROTOCOL)
  assert.equal(att.version, 1)
  assert.equal(att.driveKey, DRIVE)
  assert.equal(att.subject, att.appPubkey)
  assert.deepEqual(att.scopes, ['profile:name', 'contacts:read'])
  assert.equal(att.challenge, 'login-challenge-001')
  assert.equal(att.claims.challenge, 'login-challenge-001')
  assert.equal(att.proof.namespace, LOGIN_NAMESPACE)
  assert.match(att.proof.signature, /^[0-9a-f]{128}$/)
  assert.match(att.loginProof, /^[0-9a-f]{128}$/)
  assert.equal(att.tag, `pear.app.${DRIVE}:login:`)
  assert.equal(verifyLoginAttestation(att, { now: NOW }), true)
})

test('canonicalLoginPayload is independent of top-level claim key order', () => {
  const a = {
    protocol: LOGIN_PROTOCOL,
    version: 1,
    driveKey: DRIVE,
    subject: 'a'.repeat(64),
    appPubkey: 'a'.repeat(64),
    scopes: ['profile:name'],
    grantedAt: NOW - 1,
    issuedAt: NOW,
    expiresAt: NOW + 1,
    challenge: 'abc',
  }
  const b = {
    expiresAt: a.expiresAt,
    issuedAt: a.issuedAt,
    scopes: a.scopes,
    challenge: a.challenge,
    appPubkey: a.appPubkey,
    subject: a.subject,
    driveKey: a.driveKey,
    grantedAt: a.grantedAt,
    version: a.version,
    protocol: a.protocol,
  }
  assert.equal(canonicalLoginPayload(a), canonicalLoginPayload(b))
})

test('Pear Passport login verification fails closed on tampering and expiry', () => {
  const att = makeLoginAttestation({
    identity: fakeIdentity(),
    driveKeyHex: DRIVE,
    grant: { scopes: ['profile:name'], grantedAt: NOW - 1000, expiresAt: NOW + 1000 },
    now: NOW,
  })

  assert.equal(verifyLoginAttestation({ ...att, driveKey: 'f'.repeat(64) }, { now: NOW }), false)
  assert.equal(verifyLoginAttestation({ ...att, challenge: 'different' }, { now: NOW }), false)
  assert.equal(verifyLoginAttestation({ ...att, proof: { ...att.proof, type: 'UnknownProof' } }, { now: NOW }), false)
  assert.equal(verifyLoginAttestation({ ...att, proof: { ...att.proof, namespace: 'login' } }, { now: NOW }), false)
  assert.equal(verifyLoginAttestation({ ...att, claims: { ...att.claims, scopes: ['contacts:read'] } }, { now: NOW }), false)
  assert.equal(verifyLoginAttestation({ ...att, claims: { ...att.claims, admin: true } }, { now: NOW }), false)
  assert.equal(verifyLoginAttestation({ ...att, claims: { ...att.claims, protocol: 'evil' } }, { now: NOW }), false)
  assert.equal(verifyLoginAttestation(att, { now: NOW + 2000 }), false)
  assert.equal(verifyLoginAttestation(att, { now: NOW + 2000, allowExpired: true }), true)
})

test('default login grant TTL is 30 days', () => {
  assert.equal(DEFAULT_LOGIN_GRANT_TTL_MS, 30 * 24 * 60 * 60 * 1000)
})
