const { generateKeyPairSync } = require('node:crypto')
const { writeFileSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const {
  MANIFEST_NAME,
  createRuntimeIntegrityEnvelope,
  createRuntimeIntegrityPayload
} = require('../electron/runtime-integrity.cjs')

const buildKeys = new Map()

function beforePack (context) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const key = path.resolve(context.appOutDir)
  if (buildKeys.has(key)) throw new Error(`runtime integrity key already exists for ${key}`)
  buildKeys.set(key, privateKey)

  const extraMetadata = context.packager.config.extraMetadata || {}
  context.packager.config.extraMetadata = extraMetadata
  extraMetadata.pearRuntimeIntegrity = {
    schema: 1,
    algorithm: 'ed25519-sha256-tree-v1',
    publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
  }
}

function afterPack (context) {
  const key = path.resolve(context.appOutDir)
  const privateKey = buildKeys.get(key)
  if (!privateKey) throw new Error(`runtime integrity private key is missing for ${key}`)

  const provenance = context.packager.config.extraMetadata?.pearRelease
  if (finalizeAfterSigning(context, provenance)) return

  try {
    writeManifest(context, privateKey, provenance)
  } finally {
    buildKeys.delete(key)
  }
}

function afterSign (context) {
  const key = path.resolve(context.appOutDir)
  const privateKey = buildKeys.get(key)
  if (!privateKey) return

  const provenance = context.packager.config.extraMetadata?.pearRelease
  try {
    writeManifest(context, privateKey, provenance)
    if (context.electronPlatformName === 'darwin') resealMacBundle(context, provenance)
  } finally {
    buildKeys.delete(key)
  }
}

function writeManifest (context, privateKey, provenance) {
  const { Arch } = require('builder-util')
  const unpackedRoot = path.join(resourcesDirectory(context), 'app.asar.unpacked')
  const payload = createRuntimeIntegrityPayload({
    unpackedRoot,
    provenance,
    platform: context.electronPlatformName,
    arch: Arch[context.arch]
  })
  const envelope = createRuntimeIntegrityEnvelope({ payload, privateKey })
  writeFileSync(path.join(unpackedRoot, MANIFEST_NAME), `${JSON.stringify(envelope)}\n`, { mode: 0o644 })
}

function finalizeAfterSigning (context, provenance) {
  return context.electronPlatformName === 'darwin' ||
    (context.electronPlatformName === 'win32' && provenance?.mode === 'public-trust')
}

function resourcesDirectory (context) {
  return context.electronPlatformName === 'darwin'
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : path.join(context.appOutDir, 'resources')
}

function resealMacBundle (context, provenance) {
  const appBundle = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const publicTrust = provenance?.mode === 'public-trust'
  const identity = publicTrust
    ? process.env.PEARBROWSER_MACOS_SIGNING_IDENTITY
    : '-'
  if (!identity) throw new Error('macOS public-trust runtime reseal requires PEARBROWSER_MACOS_SIGNING_IDENTITY')

  const entitlements = path.join(__dirname, '..', publicTrust
    ? 'build/entitlements.mac.plist'
    : 'build/entitlements.mac.package-proof.plist')
  const args = [
    '--force',
    '--sign', identity,
    '--options', 'runtime',
    '--entitlements', entitlements,
    '--generate-entitlement-der'
  ]
  if (publicTrust) args.push('--timestamp')
  if (process.env.CSC_KEYCHAIN) args.push('--keychain', process.env.CSC_KEYCHAIN)
  args.push(appBundle)

  const result = spawnSync('/usr/bin/codesign', args, { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = String(result.error?.message || result.stderr || result.stdout || '').trim()
    throw new Error(`could not reseal macOS bundle after runtime manifest creation: ${detail || `codesign exited ${result.status}`}`)
  }
}

module.exports = { afterPack, afterSign, beforePack }
