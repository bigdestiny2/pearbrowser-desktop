const crypto = require('hypercore-crypto')
const b4a = require('b4a')
const { appSlugForDrive } = require('./app-sync-registry.cjs')

let sodium = null
try { sodium = require('sodium-universal') } catch (_) {}

const HEX64 = /^[0-9a-f]{64}$/i
const APP_SLUG = /^[a-z0-9_-]{1,64}$/
const RAW_APP_ID = /^[a-zA-Z0-9_-]{1,64}$/
const RECORD_TYPE = /^[a-z0-9_-]{1,64}$/
const DEFAULT_NAMESPACE = 'app-outbox-v1'
const META_KEY = 'appOutboxDescriptors'
const DEFAULT_MAX_DESCRIPTORS = 512
const AUTHOR_APP_SLUGS = new Set(['peerit', 'p2pbuilders'])

function normalizeHex64 (value) {
  return typeof value === 'string' && HEX64.test(value) ? value.toLowerCase() : null
}

function scopedAppIdFor (appDriveKey, rawAppId) {
  const drive = normalizeHex64(appDriveKey)
  if (!drive || !RAW_APP_ID.test(String(rawAppId || ''))) return null
  return b4a.toString(crypto.data(b4a.from(`${drive}:${rawAppId}`)), 'hex')
}

function descriptorKey (descriptor) {
  const d = normalizeDescriptor(descriptor, { verify: false })
  return d ? `${d.appSlug}!${d.authorPubkey}!${d.scopedAppId}` : null
}

function normalizeRecordTypes (value) {
  const out = []
  const seen = new Set()
  const list = Array.isArray(value) ? value : []
  for (const item of list) {
    const t = typeof item === 'string' ? item.trim().toLowerCase() : ''
    if (!RECORD_TYPE.test(t) || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= 32) break
  }
  return out
}

function normalizeDescriptor (input, opts = {}) {
  if (!input || typeof input !== 'object') return null
  const appSlug = typeof input.appSlug === 'string' ? input.appSlug.trim().toLowerCase() : ''
  if (!APP_SLUG.test(appSlug)) return null
  const appDriveKey = normalizeHex64(input.appDriveKey)
  const inviteKey = normalizeHex64(input.inviteKey)
  const authorPubkey = normalizeHex64(input.authorPubkey || input.pub || input.publicKey)
  const rawAppId = typeof input.rawAppId === 'string' ? input.rawAppId.trim() : ''
  if (!appDriveKey || !inviteKey || !authorPubkey || !RAW_APP_ID.test(rawAppId)) return null
  const knownSlug = appSlugForDrive(appDriveKey)
  if (knownSlug && knownSlug !== appSlug) return null
  if (AUTHOR_APP_SLUGS.has(appSlug)) {
    if (knownSlug !== appSlug) return null
    if (rawAppId.toLowerCase() !== authorPubkey) return null
  }

  const scopedAppId = scopedAppIdFor(appDriveKey, rawAppId)
  if (!scopedAppId) return null
  if (input.scopedAppId != null && normalizeHex64(input.scopedAppId) !== scopedAppId) return null

  const recordTypes = normalizeRecordTypes(input.recordTypes)
  if (recordTypes.length === 0) return null

  const updatedAt = Number.isFinite(input.updatedAt) && input.updatedAt > 0
    ? Math.floor(input.updatedAt)
    : 0
  const head = input.head && typeof input.head === 'object' && Number.isFinite(input.head.viewLength)
    ? { viewLength: Math.max(0, Math.floor(input.head.viewLength)) }
    : null
  const namespace = typeof input.namespace === 'string' && input.namespace.trim()
    ? input.namespace.trim().slice(0, 96)
    : DEFAULT_NAMESPACE
  const sig = typeof input.sig === 'string' && /^[0-9a-f]{128}$/i.test(input.sig)
    ? input.sig.toLowerCase()
    : null

  const out = {
    kind: 'app-outbox',
    v: 1,
    appSlug,
    appDriveKey,
    rawAppId,
    scopedAppId,
    inviteKey,
    authorPubkey,
    recordTypes,
    updatedAt,
    namespace
  }
  if (head) out.head = head
  if (sig) out.sig = sig

  if (opts.verify && !verifyDescriptor(out)) return null
  return out
}

function descriptorSignable (descriptor) {
  const d = normalizeDescriptor({ ...descriptor, sig: undefined }, { verify: false })
  if (!d) return null
  return {
    kind: d.kind,
    v: d.v,
    appSlug: d.appSlug,
    appDriveKey: d.appDriveKey,
    rawAppId: d.rawAppId,
    scopedAppId: d.scopedAppId,
    inviteKey: d.inviteKey,
    authorPubkey: d.authorPubkey,
    recordTypes: d.recordTypes,
    updatedAt: d.updatedAt,
    namespace: d.namespace,
    ...(d.head ? { head: d.head } : {})
  }
}

function stableStringify (value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const keys = Object.keys(value).sort()
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}'
}

function descriptorPayload (descriptor) {
  const signable = descriptorSignable(descriptor)
  return signable ? stableStringify(signable) : null
}

function verifyForApp (appDriveKey, payload, namespace, signed = {}) {
  if (!sodium) return false
  try {
    const signature = b4a.from(String(signed.signature || signed.sig || ''), 'hex')
    const publicKey = b4a.from(String(signed.publicKey || signed.authorPubkey || ''), 'hex')
    if (signature.length !== sodium.crypto_sign_BYTES) return false
    if (publicKey.length !== sodium.crypto_sign_PUBLICKEYBYTES) return false
    const tag = `pear.app.${appDriveKey}:${namespace || ''}:`
    const message = b4a.concat([b4a.from(tag, 'utf-8'), b4a.from(String(payload || ''), 'utf-8')])
    return sodium.crypto_sign_verify_detached(signature, message, publicKey)
  } catch (_) {
    return false
  }
}

function verifyDescriptor (descriptor) {
  const d = normalizeDescriptor(descriptor, { verify: false })
  if (!d || !d.sig) return false
  const payload = descriptorPayload(d)
  if (!payload) return false
  return verifyForApp(d.appDriveKey, payload, d.namespace, {
    signature: d.sig,
    publicKey: d.authorPubkey
  })
}

function makeSignedDescriptor (input, { authorPubkey, signForApp, now } = {}) {
  const pubkey = normalizeHex64(authorPubkey || input && (input.authorPubkey || input.pub || input.publicKey))
  if (!pubkey) throw new Error('authorPubkey required')
  const base = normalizeDescriptor({
    ...input,
    authorPubkey: pubkey,
    updatedAt: Number.isFinite(input && input.updatedAt) ? input.updatedAt : (typeof now === 'function' ? now() : Date.now())
  }, { verify: false })
  if (!base) throw new Error('invalid app-outbox descriptor')
  const payload = descriptorPayload(base)
  const signed = signForApp ? signForApp(base.appDriveKey, payload, base.namespace) : null
  const sig = signed && (signed.signature || signed.sig)
  const signedPubkey = signed && (signed.publicKey || signed.pubkey)
  if (!sig || normalizeHex64(signedPubkey) !== base.authorPubkey) throw new Error('descriptor signer did not match authorPubkey')
  const out = normalizeDescriptor({ ...base, sig }, { verify: true })
  if (!out) throw new Error('descriptor self-verify failed')
  return out
}

function filterDescriptors (descriptors, opts = {}) {
  const appSlug = typeof opts.appSlug === 'string' ? opts.appSlug.trim().toLowerCase() : ''
  const appDriveKey = normalizeHex64(opts.appDriveKey)
  const rawAppId = typeof opts.rawAppId === 'string' ? opts.rawAppId.trim() : ''
  const authorPubkey = normalizeHex64(opts.authorPubkey || opts.author)
  const recordType = typeof opts.recordType === 'string' ? opts.recordType.trim().toLowerCase() : ''
  const limit = Math.max(0, Math.min(Number(opts.limit) || 100, 1000))
  const rows = (Array.isArray(descriptors) ? descriptors : [])
    .map((d) => normalizeDescriptor(d, { verify: opts.verify !== false }))
    .filter(Boolean)
    .filter((d) => !appSlug || d.appSlug === appSlug)
    .filter((d) => !appDriveKey || d.appDriveKey === appDriveKey)
    .filter((d) => !rawAppId || d.rawAppId === rawAppId)
    .filter((d) => !authorPubkey || d.authorPubkey === authorPubkey)
    .filter((d) => !recordType || d.recordTypes.includes(recordType))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  return limit ? rows.slice(0, limit) : rows
}

async function readStoredDescriptors (personalIndex) {
  if (!personalIndex || typeof personalIndex.getMeta !== 'function') return []
  const list = await personalIndex.getMeta(META_KEY, [])
  return filterDescriptors(list, { limit: DEFAULT_MAX_DESCRIPTORS, verify: true })
}

async function storeDescriptor (personalIndex, descriptor, opts = {}) {
  if (!personalIndex || typeof personalIndex.putMeta !== 'function') throw new Error('personalIndex meta store required')
  const row = normalizeDescriptor(descriptor, { verify: true })
  if (!row) throw new Error('invalid or unverified app-outbox descriptor')
  const max = Math.max(1, Math.min(Number(opts.maxDescriptors) || DEFAULT_MAX_DESCRIPTORS, 5000))
  const key = descriptorKey(row)
  const existing = await readStoredDescriptors(personalIndex)
  const merged = [row]
  for (const item of existing) {
    if (descriptorKey(item) !== key) merged.push(item)
  }
  merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  const descriptors = merged.slice(0, max)
  await personalIndex.putMeta(META_KEY, descriptors)
  return { descriptor: row, descriptors }
}

module.exports = {
  DEFAULT_NAMESPACE,
  META_KEY,
  scopedAppIdFor,
  descriptorKey,
  descriptorSignable,
  descriptorPayload,
  normalizeDescriptor,
  verifyDescriptor,
  makeSignedDescriptor,
  filterDescriptors,
  readStoredDescriptors,
  storeDescriptor
}
