import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const {
  MANIFEST_NAME,
  createRuntimeIntegrityEnvelope,
  createRuntimeIntegrityPayload,
  verifyRuntimeIntegrity
} = require('../electron/runtime-integrity.cjs')

const provenance = {
  tag: 'v0.9.1',
  sourceRef: '0123456789abcdef0123456789abcdef01234567',
  mode: 'package-proof',
  pear: '3.3.0'
}
const expected = {
  tag: provenance.tag,
  sourceRef: provenance.sourceRef,
  releaseMode: provenance.mode,
  pear: provenance.pear,
  platform: process.platform,
  arch: process.arch
}

test('runtime tree ordering is independent of host locale', () => {
  const source = readFileSync(new URL('../electron/runtime-integrity.cjs', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /localeCompare/)
})

test('signed physical runtime manifest fails closed on changed or added files', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'pear-runtime-integrity-'))
  try {
    mkdirSync(join(fixture, 'workers'), { recursive: true })
    mkdirSync(join(fixture, 'node_modules', 'pear-runtime'), { recursive: true })
    writeFileSync(join(fixture, 'workers', 'main.js'), 'console.log("worker")\n')
    writeFileSync(join(fixture, 'node_modules', 'pear-runtime', 'index.js'), 'module.exports = class {}\n')

    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const publicKeyBase64 = publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    signFixture(fixture, privateKey)

    const report = verifyRuntimeIntegrity({ unpackedRoot: fixture, publicKey: publicKeyBase64, expected })
    assert.equal(report.files, 2)

    writeFileSync(join(fixture, 'workers', 'main.js'), 'console.log("tampered")\n')
    assert.throws(
      () => verifyRuntimeIntegrity({ unpackedRoot: fixture, publicKey: publicKeyBase64, expected }),
      /physical runtime bytes failed integrity verification/
    )

    writeFileSync(join(fixture, 'workers', 'main.js'), 'console.log("worker")\n')
    writeFileSync(join(fixture, 'node_modules', 'pear-runtime', 'injected.js'), 'throw new Error("injected")\n')
    assert.throws(
      () => verifyRuntimeIntegrity({ unpackedRoot: fixture, publicKey: publicKeyBase64, expected }),
      /physical runtime file count changed/
    )
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('runtime integrity identity and signature are bound to protected ASAR metadata', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'pear-runtime-integrity-'))
  try {
    writeFileSync(join(fixture, 'index.js'), 'module.exports = true\n')
    const signing = generateKeyPairSync('ed25519')
    signFixture(fixture, signing.privateKey)
    const publicKey = signing.publicKey.export({ format: 'der', type: 'spki' }).toString('base64')

    assert.throws(
      () => verifyRuntimeIntegrity({
        unpackedRoot: fixture,
        publicKey,
        expected: { ...expected, sourceRef: 'fedcba9876543210fedcba9876543210fedcba98' }
      }),
      /release source ref must be/
    )

    const otherKey = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    assert.throws(
      () => verifyRuntimeIntegrity({ unpackedRoot: fixture, publicKey: otherKey, expected }),
      /signature verification failed/
    )
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function signFixture (fixture, privateKey) {
  const payload = createRuntimeIntegrityPayload({
    unpackedRoot: fixture,
    provenance,
    platform: process.platform,
    arch: process.arch
  })
  const envelope = createRuntimeIntegrityEnvelope({ payload, privateKey })
  writeFileSync(join(fixture, MANIFEST_NAME), JSON.stringify(envelope))
}
