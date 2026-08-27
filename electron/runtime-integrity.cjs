const { createHash, createPublicKey, sign, verify } = require('node:crypto')
const {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync
} = require('node:fs')
const path = require('node:path')

const MANIFEST_NAME = 'pear-runtime-integrity.json'
const MANIFEST_SCHEMA = 1
const SIGNATURE_ALGORITHM = 'ed25519'
const TREE_ALGORITHM = 'sha256'
const HASH_BUFFER = Buffer.allocUnsafe(1024 * 1024)

function createRuntimeIntegrityPayload ({ unpackedRoot, provenance, platform, arch }) {
  requirePlainObject(provenance, 'release provenance')
  const payload = {
    schema: MANIFEST_SCHEMA,
    treeAlgorithm: TREE_ALGORITHM,
    tag: requireString(provenance.tag, 'release tag'),
    sourceRef: requireString(provenance.sourceRef, 'release source ref'),
    releaseMode: requireString(provenance.mode, 'release mode'),
    pear: requireString(provenance.pear, 'Pear version'),
    platform: requireString(platform, 'runtime platform'),
    arch: requireString(arch, 'runtime architecture'),
    files: collectRuntimeTree(unpackedRoot)
  }
  return Buffer.from(JSON.stringify(payload))
}

function createRuntimeIntegrityEnvelope ({ payload, privateKey }) {
  if (!Buffer.isBuffer(payload) || payload.length === 0) {
    throw new Error('runtime integrity payload must be a non-empty Buffer')
  }
  return {
    schema: MANIFEST_SCHEMA,
    signatureAlgorithm: SIGNATURE_ALGORITHM,
    payload: payload.toString('base64'),
    signature: sign(null, payload, privateKey).toString('base64')
  }
}

function verifyRuntimeIntegrity ({ unpackedRoot, publicKey, expected }) {
  requirePlainObject(expected, 'expected runtime identity')
  const manifestPath = path.join(unpackedRoot, MANIFEST_NAME)
  const envelope = readJson(manifestPath, 'runtime integrity envelope')
  if (envelope.schema !== MANIFEST_SCHEMA) {
    throw new Error(`runtime integrity envelope schema must be ${MANIFEST_SCHEMA}`)
  }
  if (envelope.signatureAlgorithm !== SIGNATURE_ALGORITHM) {
    throw new Error(`runtime integrity signature algorithm must be ${SIGNATURE_ALGORITHM}`)
  }

  const payloadBytes = decodeCanonicalBase64(envelope.payload, 'runtime integrity payload')
  const signature = decodeCanonicalBase64(envelope.signature, 'runtime integrity signature')
  if (signature.length !== 64) throw new Error('runtime integrity signature must be 64 bytes')

  const keyBytes = decodeCanonicalBase64(publicKey, 'runtime integrity public key')
  const key = createPublicKey({ key: keyBytes, format: 'der', type: 'spki' })
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('runtime integrity public key must be Ed25519')
  }
  if (!verify(null, payloadBytes, key, signature)) {
    throw new Error('runtime integrity signature verification failed')
  }

  const payload = parseJson(payloadBytes, 'signed runtime integrity payload')
  if (payload.schema !== MANIFEST_SCHEMA || payload.treeAlgorithm !== TREE_ALGORITHM) {
    throw new Error('signed runtime integrity payload uses an unsupported schema or tree algorithm')
  }
  for (const [field, label] of [
    ['tag', 'release tag'],
    ['sourceRef', 'release source ref'],
    ['releaseMode', 'release mode'],
    ['pear', 'Pear version'],
    ['platform', 'runtime platform'],
    ['arch', 'runtime architecture']
  ]) {
    if (payload[field] !== expected[field]) {
      throw new Error(`signed runtime integrity ${label} must be ${expected[field]}, got ${payload[field] || '(missing)'}`)
    }
  }

  validateManifestFiles(payload.files)
  const actualFiles = collectRuntimeTree(unpackedRoot)
  if (actualFiles.length !== payload.files.length) {
    throw new Error(`physical runtime file count changed: expected ${payload.files.length}, got ${actualFiles.length}`)
  }

  let totalBytes = 0
  for (let i = 0; i < payload.files.length; i++) {
    const wanted = payload.files[i]
    const actual = actualFiles[i]
    if (wanted.path !== actual.path) {
      throw new Error(`physical runtime path set changed at entry ${i}: expected ${wanted.path}, got ${actual.path}`)
    }
    if (wanted.bytes !== actual.bytes || wanted.sha256 !== actual.sha256) {
      throw new Error(`physical runtime bytes failed integrity verification: ${wanted.path}`)
    }
    totalBytes += actual.bytes
  }

  return {
    files: actualFiles.length,
    bytes: totalBytes,
    payloadSha256: hashBytes(payloadBytes)
  }
}

function collectRuntimeTree (unpackedRoot) {
  const root = path.resolve(unpackedRoot)
  const rootStat = lstatSync(root)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`physical runtime root must be a real directory: ${root}`)
  }

  const files = []
  visit(root, '')
  return files.sort((a, b) => compareStrings(a.path, b.path))

  function visit (directory, relativeDirectory) {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => compareStrings(a.name, b.name))
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name
      if (relativePath === MANIFEST_NAME) continue
      const absolutePath = path.join(directory, entry.name)
      const stat = lstatSync(absolutePath)
      if (stat.isSymbolicLink()) {
        throw new Error(`physical runtime must not contain symbolic links: ${relativePath}`)
      }
      if (stat.isDirectory()) {
        visit(absolutePath, relativePath)
        continue
      }
      if (!stat.isFile()) {
        throw new Error(`physical runtime contains an unsupported entry type: ${relativePath}`)
      }
      files.push({
        path: relativePath,
        bytes: stat.size,
        sha256: hashFile(absolutePath)
      })
    }
  }
}

function validateManifestFiles (files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('signed runtime integrity payload must contain files')
  }
  let previous = ''
  for (const file of files) {
    requirePlainObject(file, 'runtime integrity file entry')
    const relativePath = requireString(file.path, 'runtime integrity file path')
    if (relativePath.includes('\\') || relativePath.startsWith('/') || relativePath.split('/').includes('..')) {
      throw new Error(`runtime integrity file path is unsafe: ${relativePath}`)
    }
    if (relativePath === MANIFEST_NAME) {
      throw new Error('runtime integrity envelope must not sign itself')
    }
    if (previous && compareStrings(previous, relativePath) >= 0) {
      throw new Error(`runtime integrity file entries are not strictly sorted: ${relativePath}`)
    }
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0) {
      throw new Error(`runtime integrity byte count is invalid: ${relativePath}`)
    }
    if (!/^[0-9a-f]{64}$/.test(file.sha256 || '')) {
      throw new Error(`runtime integrity SHA-256 is invalid: ${relativePath}`)
    }
    previous = relativePath
  }
}

function hashFile (file) {
  const hash = createHash(TREE_ALGORITHM)
  const descriptor = openSync(file, 'r')
  try {
    while (true) {
      const bytesRead = readSync(descriptor, HASH_BUFFER, 0, HASH_BUFFER.length, null)
      if (bytesRead === 0) break
      hash.update(HASH_BUFFER.subarray(0, bytesRead))
    }
  } finally {
    closeSync(descriptor)
  }
  return hash.digest('hex')
}

function compareStrings (left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function hashBytes (bytes) {
  return createHash(TREE_ALGORITHM).update(bytes).digest('hex')
}

function readJson (file, label) {
  try {
    return parseJson(readFileSync(file), label)
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${label} is missing: ${file}`)
    throw error
  }
}

function parseJson (bytes, label) {
  try {
    const value = JSON.parse(Buffer.from(bytes).toString('utf8'))
    requirePlainObject(value, label)
    return value
  } catch (error) {
    if (error.message.startsWith(`${label} must`)) throw error
    throw new Error(`${label} is not valid JSON: ${error.message}`)
  }
}

function decodeCanonicalBase64 (value, label) {
  const encoded = requireString(value, label)
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error(`${label} must be canonical base64`)
  }
  const decoded = Buffer.from(encoded, 'base64')
  if (decoded.length === 0 || decoded.toString('base64') !== encoded) {
    throw new Error(`${label} must be canonical base64`)
  }
  return decoded
}

function requirePlainObject (value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
}

function requireString (value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

module.exports = {
  MANIFEST_NAME,
  collectRuntimeTree,
  createRuntimeIntegrityEnvelope,
  createRuntimeIntegrityPayload,
  verifyRuntimeIntegrity
}
