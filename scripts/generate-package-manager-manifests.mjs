#!/usr/bin/env node

import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import https from 'node:https'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const MANIFEST_VERSION = '1.12.0'
const DEFAULT_REPO = 'bigdestiny2/pearbrowser-desktop'
const DEFAULT_IDENTIFIER = 'PearBrowser.PearBrowser'
const DEFAULT_PUBLISHER = 'PearBrowser'
const DEFAULT_PACKAGE_NAME = 'PearBrowser'
const UNKNOWN_LICENSE = 'Unknown'
const DEFAULT_LICENSE = projectLicenseFromPackage(pkg) || UNKNOWN_LICENSE
const DEFAULT_DESCRIPTION = 'Peer-to-peer browser and app store'

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const version = versionFromTag(tag)
const repo = args.repo || process.env.GH_REPO || DEFAULT_REPO
const trustMode = normalizeTrustMode(args.trustMode || 'public-trust')
const outDir = resolve(args.outDir || join('dist', 'package-manager-manifests', tag))
const metadata = {
  packageIdentifier: args.packageIdentifier || DEFAULT_IDENTIFIER,
  publisher: args.publisher || DEFAULT_PUBLISHER,
  packageName: args.packageName || DEFAULT_PACKAGE_NAME,
  license: args.license || DEFAULT_LICENSE,
  description: args.description || DEFAULT_DESCRIPTION,
  homepage: args.homepage || `https://github.com/${repo}`
}

let release
try {
  release = args.fixture ? loadFixture(args.fixture) : loadReleaseFromGithub(repo, tag)
} catch (err) {
  fail(err && err.message ? err.message : String(err))
}

const report = await buildReport(release, {
  repo,
  tag,
  version,
  trustMode,
  outDir,
  metadata,
  write: !args.dryRun
})

if (args.json) printJson(report)
else printHuman(report)

if (!report.ok) process.exit(1)

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    fixture: '',
    outDir: '',
    trustMode: '',
    packageIdentifier: '',
    publisher: '',
    packageName: '',
    license: '',
    description: '',
    homepage: '',
    dryRun: false,
    json: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--out-dir') parsed.outDir = requireValue(argv, ++i, arg)
    else if (arg === '--trust-mode') parsed.trustMode = requireValue(argv, ++i, arg)
    else if (arg === '--package-identifier') parsed.packageIdentifier = requireValue(argv, ++i, arg)
    else if (arg === '--publisher') parsed.publisher = requireValue(argv, ++i, arg)
    else if (arg === '--package-name') parsed.packageName = requireValue(argv, ++i, arg)
    else if (arg === '--license') parsed.license = requireValue(argv, ++i, arg)
    else if (arg === '--description') parsed.description = requireValue(argv, ++i, arg)
    else if (arg === '--homepage') parsed.homepage = requireValue(argv, ++i, arg)
    else if (arg === '--dry-run') parsed.dryRun = true
    else if (arg === '--json') parsed.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown argument: ${arg}`)
  }
  return parsed
}

function requireValue (argv, index, flag) {
  const value = argv[index] || ''
  if (!value || value.startsWith('--')) usage(2, `${flag} requires a value`)
  return value
}

function usage (code, message = '') {
  if (message) console.error(`error: ${message}`)
  console.error('usage: node scripts/generate-package-manager-manifests.mjs [--tag v0.5.0] [--repo owner/repo] [--trust-mode public-trust|package-proof] [--out-dir dist/package-manager-manifests/v0.5.0] [--dry-run] [--json]')
  console.error('       node scripts/generate-package-manager-manifests.mjs --fixture release.json [--tag v0.5.0] [--trust-mode public-trust|package-proof] [--out-dir path] [--json]')
  process.exit(code)
}

function fail (message) {
  if (args.json) {
    console.log(JSON.stringify({
      ok: false,
      repo,
      tag,
      version,
      trustMode,
      outDir,
      files: [],
      warnings: [],
      errors: [message]
    }, null, 2))
  } else {
    console.error(`Package-manager manifest generation failed: ${message}`)
  }
  process.exit(1)
}

function normalizeTag (tag) {
  const normalized = String(tag || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) {
    usage(2, `release tag must look like vX.Y.Z, got ${tag}`)
  }
  return normalized
}

function versionFromTag (tag) {
  return normalizeTag(tag).slice(1)
}

function normalizeTrustMode (value) {
  const mode = String(value || '').toLowerCase()
  if (mode === 'public-trust' || mode === 'package-proof') return mode
  usage(2, `unsupported trust mode: ${value}`)
}

function loadFixture (path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function loadReleaseFromGithub (repo, tag) {
  try {
    const out = execFileSync('gh', [
      'release',
      'view',
      tag,
      '--repo',
      repo,
      '--json',
      'tagName,isDraft,isPrerelease,assets'
    ], { encoding: 'utf8' })
    return JSON.parse(out)
  } catch (err) {
    const stderr = err?.stderr ? String(err.stderr).trim() : ''
    throw new Error(stderr || `could not load GitHub release ${repo}@${tag}`)
  }
}

async function buildReport (release, options) {
  const errors = []
  const warnings = []
  const tagName = release?.tagName || release?.tag_name || ''

  if (tagName && tagName !== options.tag) {
    errors.push(`release tagName ${tagName} does not match expected ${options.tag}`)
  }
  if (options.trustMode === 'public-trust') {
    if (release?.isDraft) errors.push('public-trust package-manager manifests require a published release')
    if (release?.isPrerelease) errors.push('public-trust package-manager manifests require a non-prerelease release')
  } else {
    warnings.push('package-proof manifests are rehearsal artifacts; do not submit them to Homebrew or WinGet until public-trust signing/notarization gates pass')
  }
  if (options.metadata.license === UNKNOWN_LICENSE) {
    warnings.push('WinGet License defaults to Unknown; confirm the project license before package-manager submission')
  }

  let resolved = null
  if (errors.length === 0) {
    try {
      resolved = await resolvePackageManagerAssets(release, options)
      validateTrustMode(resolved, options, errors)
    } catch (err) {
      errors.push(err && err.message ? err.message : String(err))
    }
  }

  const files = []
  if (errors.length === 0) {
    try {
      const cask = generateHomebrewCask(resolved, options)
      const winget = generateWingetSingleton(resolved, options)
      files.push(
        {
          kind: 'homebrew-cask',
          path: join(options.outDir, 'homebrew', 'pearbrowser.rb'),
          bytes: Buffer.byteLength(cask),
          content: cask
        },
        {
          kind: 'winget-singleton',
          path: wingetManifestPath(options),
          bytes: Buffer.byteLength(winget),
          content: winget
        }
      )
      if (options.write) writeFiles(files)
    } catch (err) {
      errors.push(err && err.message ? err.message : String(err))
    }
  }

  return {
    ok: errors.length === 0,
    repo: options.repo,
    tag: options.tag,
    version: options.version,
    trustMode: options.trustMode,
    outDir: options.outDir,
    release: {
      tagName,
      isDraft: !!release?.isDraft,
      isPrerelease: !!release?.isPrerelease
    },
    assets: resolved ? summarizeAssets(resolved) : {},
    files: files.map(({ kind, path, bytes }) => ({ kind, path, bytes })),
    warnings,
    errors
  }
}

async function resolvePackageManagerAssets (release, options) {
  const macosArm64 = resolveReleaseAsset(release, { ...options, platform: 'macos', arch: 'arm64' })
  const macosX64 = resolveReleaseAsset(release, { ...options, platform: 'macos', arch: 'x64' })
  const windowsX64 = resolveReleaseAsset(release, { ...options, platform: 'windows', arch: 'x64' })

  return {
    macosArm64: {
      ...macosArm64,
      sha256: await readSidecarSha256(macosArm64)
    },
    macosX64: {
      ...macosX64,
      sha256: await readSidecarSha256(macosX64)
    },
    windowsX64: {
      ...windowsX64,
      sha256: await readSidecarSha256(windowsX64)
    }
  }
}

function resolveReleaseAsset (release, options) {
  const assets = normalizeAssets(release?.assets)
  if (assets.length === 0) throw new Error('release has no attached assets')

  const prefix = `PearBrowser-${options.version}-${options.platform}-${options.arch}`
  const candidates = assets
    .filter((asset) => asset.name.startsWith(prefix))
    .filter((asset) => !asset.name.endsWith('.sha256'))
    .filter((asset) => isPrimaryArtifact(options.platform, asset.name))
    .sort((a, b) => {
      return artifactRank(options.platform, a.name) - artifactRank(options.platform, b.name) ||
        a.name.length - b.name.length ||
        a.name.localeCompare(b.name)
    })

  if (candidates.length === 0) {
    throw new Error(`no ${options.platform}/${options.arch} native artifact found for ${options.tag}`)
  }

  const asset = candidates[0]
  if (asset.size <= 0) throw new Error(`${asset.name} is empty or missing a size`)

  const checksumName = `${asset.name}.sha256`
  const checksumAsset = assets.find((candidate) => candidate.name === checksumName)
  if (!checksumAsset) throw new Error(`missing SHA-256 sidecar for ${asset.name}`)
  if (checksumAsset.size <= 0) throw new Error(`${checksumName} is empty or missing a size`)

  return {
    platform: options.platform,
    arch: options.arch,
    asset: {
      name: asset.name,
      size: asset.size,
      url: asset.url || githubReleaseAssetUrl(options.repo, options.tag, asset.name)
    },
    checksum: {
      name: checksumName,
      size: checksumAsset.size,
      url: checksumAsset.url || githubReleaseAssetUrl(options.repo, options.tag, checksumName)
    }
  }
}

function normalizeAssets (assets) {
  if (!Array.isArray(assets)) return []
  return assets
    .map((asset) => ({
      name: String(asset?.name || '').trim(),
      size: Number(asset?.size ?? asset?.sizeInBytes ?? asset?.size_bytes ?? 0),
      url: String(asset?.url || asset?.browserDownloadUrl || asset?.browser_download_url || '').trim()
    }))
    .filter((asset) => asset.name)
}

function isPrimaryArtifact (platform, name) {
  if (platform === 'macos') return /\.(?:dmg|pkg|app\.zip|zip)$/i.test(name)
  if (platform === 'windows') return /\.(?:exe|msix|msi|zip)$/i.test(name)
  return false
}

function artifactRank (platform, name) {
  const order = {
    macos: [/\.dmg$/i, /\.pkg$/i, /\.app\.zip$/i, /\.zip$/i],
    windows: [/\.exe$/i, /\.msix$/i, /\.msi$/i, /\.zip$/i]
  }[platform] || []
  const index = order.findIndex((pattern) => pattern.test(name))
  return index === -1 ? order.length : index
}

async function readSidecarSha256 (resolved) {
  const text = await readUrlText(resolved.checksum.url)
  return parseSidecar(text, resolved.asset.name).sha256
}

function parseSidecar (text, expectedName) {
  const firstLine = String(text || '').trim().split(/\r?\n/, 1)[0] || ''
  const match = firstLine.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/)
  if (!match) throw new Error(`invalid SHA-256 sidecar for ${expectedName}`)
  const sha256 = match[1].toLowerCase()
  const name = match[2].trim()
  if (name !== expectedName) {
    throw new Error(`SHA-256 sidecar names ${name}, expected ${expectedName}`)
  }
  return { sha256, name }
}

function validateTrustMode (resolved, options, errors) {
  if (options.trustMode !== 'public-trust') return
  for (const target of [resolved.macosArm64, resolved.macosX64]) {
    if (!/\.dmg$/i.test(target.asset.name)) {
      errors.push(`public-trust Homebrew Cask requires notarized macOS DMG assets, got ${target.asset.name}`)
    }
  }
  if (!/\.exe$/i.test(resolved.windowsX64.asset.name)) {
    errors.push(`public-trust WinGet draft expects the signed Windows .exe installer, got ${resolved.windowsX64.asset.name}`)
  }
}

function generateHomebrewCask (resolved, options) {
  const suffix = commonMacosSuffix(resolved, options.version)
  const verified = `https://github.com/${options.repo}/`
  return [
    '# Generated by scripts/generate-package-manager-manifests.mjs',
    '# Submit only after public-trust signing/notarization and clean-machine smoke pass.',
    'cask "pearbrowser" do',
    '  arch arm: "arm64", intel: "x64"',
    '',
    `  version "${options.version}"`,
    `  sha256 arm:   "${resolved.macosArm64.sha256}",`,
    `         intel: "${resolved.macosX64.sha256}"`,
    '',
    `  url "https://github.com/${options.repo}/releases/download/v#{version}/PearBrowser-#{version}-macos-#{arch}${suffix}",`,
    `      verified: "${verified}"`,
    '  name "PearBrowser"',
    `  desc "${rubyString(options.metadata.description)}"`,
    `  homepage "${options.metadata.homepage}"`,
    '',
    '  app "PearBrowser.app"',
    'end',
    ''
  ].join('\n')
}

function commonMacosSuffix (resolved, version) {
  const armPrefix = `PearBrowser-${version}-macos-arm64`
  const intelPrefix = `PearBrowser-${version}-macos-x64`
  const armSuffix = resolved.macosArm64.asset.name.slice(armPrefix.length)
  const intelSuffix = resolved.macosX64.asset.name.slice(intelPrefix.length)
  if (!armSuffix || armSuffix !== intelSuffix) {
    throw new Error(`macOS package names must differ only by arch to generate one Homebrew Cask URL: ${resolved.macosArm64.asset.name}, ${resolved.macosX64.asset.name}`)
  }
  return armSuffix
}

function generateWingetSingleton (resolved, options) {
  const installerType = wingetInstallerType(resolved.windowsX64.asset.name)
  return [
    '# yaml-language-server: $schema=https://aka.ms/winget-manifest.singleton.1.12.0.schema.json',
    '# Generated by scripts/generate-package-manager-manifests.mjs',
    '# Confirm Publisher, PackageName, License, installer type, and silent install behavior before submission.',
    `PackageIdentifier: ${yamlString(options.metadata.packageIdentifier)}`,
    `PackageVersion: ${yamlString(options.version)}`,
    'PackageLocale: en-US',
    `Publisher: ${yamlString(options.metadata.publisher)}`,
    `PackageName: ${yamlString(options.metadata.packageName)}`,
    `License: ${yamlString(options.metadata.license)}`,
    `ShortDescription: ${yamlString(options.metadata.description)}`,
    `PackageUrl: ${yamlString(options.metadata.homepage)}`,
    'Installers:',
    '  - Architecture: x64',
    `    InstallerType: ${installerType}`,
    `    InstallerUrl: ${yamlString(resolved.windowsX64.asset.url)}`,
    `    InstallerSha256: ${resolved.windowsX64.sha256.toUpperCase()}`,
    'ManifestType: singleton',
    `ManifestVersion: ${MANIFEST_VERSION}`,
    ''
  ].join('\n')
}

function wingetInstallerType (name) {
  if (/\.msix$/i.test(name)) return 'msix'
  if (/\.msi$/i.test(name)) return 'msi'
  return 'exe'
}

function wingetManifestPath (options) {
  const parts = String(options.metadata.packageIdentifier || '').split('.').filter(Boolean)
  const publisher = parts[0] || options.metadata.publisher || DEFAULT_PUBLISHER
  const packageName = parts.slice(1).join('.') || options.metadata.packageName || DEFAULT_PACKAGE_NAME
  const firstLetter = publisher[0].toLowerCase()
  return join(
    options.outDir,
    'winget',
    'manifests',
    firstLetter,
    publisher,
    packageName,
    options.version,
    `${options.metadata.packageIdentifier}.yaml`
  )
}

function rubyString (value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function yamlString (value) {
  return `"${String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function projectLicenseFromPackage (pkg) {
  if (typeof pkg?.license === 'string') return pkg.license.trim()
  if (typeof pkg?.license?.type === 'string') return pkg.license.type.trim()
  return ''
}

function summarizeAssets (resolved) {
  return Object.fromEntries(Object.entries(resolved).map(([key, value]) => [key, {
    name: value.asset.name,
    url: value.asset.url,
    checksum: value.checksum.name,
    sha256: value.sha256
  }]))
}

function writeFiles (files) {
  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true })
    writeFileSync(file.path, file.content)
  }
}

function githubReleaseAssetUrl (repo, tag, name) {
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`
}

async function readUrlText (url) {
  const chunks = []
  for await (const chunk of await openUrl(url)) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

async function openUrl (url, redirects = 0) {
  if (String(url).startsWith('file:')) return createReadStream(fileURLToPath(url))
  if (redirects > 5) throw new Error(`too many redirects for ${url}`)
  const client = String(url).startsWith('https:') ? https : http
  return await new Promise((resolvePromise, reject) => {
    const req = client.get(url, {
      headers: {
        'user-agent': 'pearbrowser-package-manager-manifest-generator'
      }
    }, (res) => {
      const location = res.headers.location
      if (res.statusCode >= 300 && res.statusCode < 400 && location) {
        res.resume()
        const next = new URL(location, url).toString()
        openUrl(next, redirects + 1).then(resolvePromise, reject)
        return
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      resolvePromise(res)
    })
    req.on('error', reject)
    req.setTimeout(120000, () => {
      req.destroy(new Error(`timeout reading ${url}`))
    })
  })
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printHuman (report) {
  if (!report.ok) {
    console.error(`Package-manager manifest generation failed for ${report.tag}:`)
    for (const error of report.errors) console.error(`- ${error}`)
    for (const warning of report.warnings) console.error(`warning: ${warning}`)
    return
  }
  const verb = args.dryRun ? 'Prepared' : 'Wrote'
  console.log(`${verb} package-manager manifest drafts for ${report.tag} (${report.trustMode})`)
  for (const file of report.files) {
    console.log(`- ${file.kind}: ${file.path}`)
  }
  for (const warning of report.warnings) console.warn(`warning: ${warning}`)
}
