// Pear Passport identity protocol helpers.
//
// This module is intentionally pure/CommonJS and Node-testable. It gives the
// login ceremony a canonical, versioned attestation shape while preserving the
// older { appPubkey, loginProof, tag } fields apps already consume.

const crypto = require('hypercore-crypto')
const b4a = require('b4a')

const LOGIN_PROTOCOL = 'pear-passport-login-v1'
const LOGIN_NAMESPACE = 'passport-login'
const LEGACY_LOGIN_NAMESPACE = 'login'
const DEFAULT_LOGIN_GRANT_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MIN_LOGIN_GRANT_TTL_MS = 60 * 1000
const LOGIN_CHALLENGE_MAX_BYTES = 512

const LOGIN_SCOPES = [
  'profile:read',
  'profile:name',
  'profile:contact',
  'profile:avatar',
  'profile:email',
  'profile:website',
  'contacts:read',
]
const LOGIN_SCOPE_SET = new Set(LOGIN_SCOPES)
const LOGIN_CLAIM_KEYS = new Set([
  'protocol',
  'version',
  'driveKey',
  'subject',
  'appPubkey',
  'scopes',
  'grantedAt',
  'issuedAt',
  'expiresAt',
  'challenge',
])

function normalizeDriveKeyHex (driveKeyHex) {
  if (typeof driveKeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(driveKeyHex)) {
    throw new Error('driveKeyHex must be a 64-hex string')
  }
  return driveKeyHex.toLowerCase()
}

function normalizePubkeyHex (pubkeyHex, label = 'pubkey') {
  if (typeof pubkeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(pubkeyHex)) {
    throw new Error(`${label} must be a 64-hex string`)
  }
  return pubkeyHex.toLowerCase()
}

function normalizeTimestamp (n, label) {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} must be a positive timestamp`)
  return Math.floor(n)
}

function normalizeLoginScopes (scopes) {
  const requested = new Set()
  for (const raw of Array.isArray(scopes) ? scopes : []) {
    const scope = String(raw).trim()
    if (!LOGIN_SCOPE_SET.has(scope)) continue
    requested.add(scope)
  }
  return LOGIN_SCOPES.filter((scope) => requested.has(scope))
}

function normalizeLoginChallenge (challenge) {
  if (challenge === undefined || challenge === null || challenge === '') return null
  if (typeof challenge !== 'string') throw new Error('challenge must be a string')
  if (b4a.from(challenge, 'utf-8').length > LOGIN_CHALLENGE_MAX_BYTES) {
    throw new Error(`challenge must be <= ${LOGIN_CHALLENGE_MAX_BYTES} bytes`)
  }
  return challenge
}

function normalizeLoginGrantTtlMs (ttlMs, defaultTtlMs = DEFAULT_LOGIN_GRANT_TTL_MS) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return defaultTtlMs
  return Math.min(Math.max(Math.floor(ttlMs), MIN_LOGIN_GRANT_TTL_MS), defaultTtlMs)
}

function assertKnownClaimKeys (claims) {
  for (const key of Object.keys(claims)) {
    if (!LOGIN_CLAIM_KEYS.has(key)) throw new Error(`claims contains unknown field: ${key}`)
  }
}

function sortKeysDeep (value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key])
    return out
  }
  return value
}

function stableStringify (value) {
  return JSON.stringify(sortKeysDeep(value))
}

function normalizeLoginClaims (claims, opts = {}) {
  if (!claims || typeof claims !== 'object') throw new Error('claims object required')
  if (opts.strict) assertKnownClaimKeys(claims)
  if (claims.protocol !== undefined && claims.protocol !== LOGIN_PROTOCOL) throw new Error('claims protocol mismatch')
  if (claims.version !== undefined && claims.version !== 1) throw new Error('claims version mismatch')

  const driveKey = normalizeDriveKeyHex(claims.driveKey ?? claims.driveKeyHex)
  const appPubkey = normalizePubkeyHex(claims.appPubkey ?? claims.subject, 'appPubkey')
  const issuedAt = normalizeTimestamp(claims.issuedAt ?? Date.now(), 'issuedAt')
  const grantedAt = normalizeTimestamp(claims.grantedAt ?? issuedAt, 'grantedAt')
  const expiresAt = normalizeTimestamp(claims.expiresAt, 'expiresAt')
  const challenge = normalizeLoginChallenge(claims.challenge)
  if (expiresAt <= issuedAt) throw new Error('expiresAt must be after issuedAt')
  const normalized = {
    protocol: LOGIN_PROTOCOL,
    version: 1,
    driveKey,
    subject: appPubkey,
    appPubkey,
    scopes: normalizeLoginScopes(claims.scopes),
    grantedAt,
    issuedAt,
    expiresAt,
  }
  if (challenge !== null) normalized.challenge = challenge
  return normalized
}

function canonicalLoginPayload (claims) {
  return `${LOGIN_PROTOCOL}:${stableStringify(normalizeLoginClaims(claims))}`
}

function appTag (driveKeyHex, namespace = '') {
  return `pear.app.${normalizeDriveKeyHex(driveKeyHex)}:${namespace}:`
}

function appMessage (driveKeyHex, payload, namespace = '') {
  return b4a.concat([
    b4a.from(appTag(driveKeyHex, namespace), 'utf-8'),
    typeof payload === 'string' ? b4a.from(payload, 'utf-8') : b4a.from(payload || []),
  ])
}

function makeLegacyLoginPayload ({ driveKey, appPubkey, scopes, expiresAt }) {
  return `pear.login.v1:${driveKey}:${appPubkey}:${(scopes || []).join(',')}:${expiresAt}`
}

function makeLoginAttestation ({ identity, driveKeyHex, grant, challenge = null, now = Date.now() }) {
  if (!identity || typeof identity.getAppKeypair !== 'function' || typeof identity.signForApp !== 'function') {
    throw new Error('identity with getAppKeypair/signForApp required')
  }
  if (!grant || typeof grant !== 'object') throw new Error('grant required')

  const driveKey = normalizeDriveKeyHex(driveKeyHex)
  const keypair = identity.getAppKeypair(driveKey)
  const appPubkey = b4a.toString(keypair.publicKey, 'hex')
  const claims = normalizeLoginClaims({
    driveKey,
    appPubkey,
    scopes: grant.scopes,
    grantedAt: grant.grantedAt ?? now,
    issuedAt: now,
    expiresAt: grant.expiresAt,
    challenge,
  })
  const payload = canonicalLoginPayload(claims)
  const proof = identity.signForApp(driveKey, payload, LOGIN_NAMESPACE)

  // Backward-compatible proof: older apps verify this under namespace "login".
  const legacyPayload = makeLegacyLoginPayload(claims)
  const legacy = identity.signForApp(driveKey, legacyPayload, LEGACY_LOGIN_NAMESPACE)

  const attestation = {
    protocol: LOGIN_PROTOCOL,
    version: 1,
    subject: appPubkey,
    appPubkey,
    driveKey,
    scopes: claims.scopes,
    grantedAt: claims.grantedAt,
    issuedAt: claims.issuedAt,
    expiresAt: claims.expiresAt,
    claims,
    proof: {
      type: 'PearPassportLoginProof',
      algorithm: 'ed25519',
      publicKey: appPubkey,
      namespace: LOGIN_NAMESPACE,
      signature: proof.signature,
    },
    loginProof: legacy.signature,
    tag: legacy.tag,
  }
  if (claims.challenge !== undefined) attestation.challenge = claims.challenge
  return attestation
}

function verifyLoginAttestation (attestation, opts = {}) {
  try {
    if (!attestation || typeof attestation !== 'object') return false
    if (attestation.protocol !== LOGIN_PROTOCOL || attestation.version !== 1) return false
    const rawClaims = attestation.claims || attestation
    const claims = normalizeLoginClaims(rawClaims, { strict: !!attestation.claims })
    if (attestation.appPubkey && normalizePubkeyHex(attestation.appPubkey, 'appPubkey') !== claims.appPubkey) return false
    if (attestation.subject && normalizePubkeyHex(attestation.subject, 'subject') !== claims.appPubkey) return false
    if (attestation.driveKey && normalizeDriveKeyHex(attestation.driveKey) !== claims.driveKey) return false
    if (attestation.challenge !== undefined && attestation.challenge !== claims.challenge) return false

    const proof = attestation.proof || {}
    if (proof.type !== 'PearPassportLoginProof') return false
    if (proof.algorithm !== 'ed25519' || proof.namespace !== LOGIN_NAMESPACE) return false
    if (normalizePubkeyHex(proof.publicKey, 'proof.publicKey') !== claims.appPubkey) return false
    if (typeof proof.signature !== 'string' || !/^[0-9a-f]{128}$/i.test(proof.signature)) return false

    const now = Number.isFinite(opts.now) ? opts.now : Date.now()
    if (!opts.allowExpired && claims.expiresAt <= now) return false

    return crypto.verify(
      appMessage(claims.driveKey, canonicalLoginPayload(claims), LOGIN_NAMESPACE),
      b4a.from(proof.signature, 'hex'),
      b4a.from(claims.appPubkey, 'hex')
    )
  } catch {
    return false
  }
}

module.exports = {
  LOGIN_PROTOCOL,
  LOGIN_NAMESPACE,
  LEGACY_LOGIN_NAMESPACE,
  DEFAULT_LOGIN_GRANT_TTL_MS,
  MIN_LOGIN_GRANT_TTL_MS,
  LOGIN_CHALLENGE_MAX_BYTES,
  LOGIN_SCOPES,
  normalizeLoginScopes,
  normalizeLoginChallenge,
  normalizeLoginGrantTtlMs,
  canonicalLoginPayload,
  makeLoginAttestation,
  verifyLoginAttestation,
}
