#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const version = versionFromTag(tag)
const repo = args.repo || process.env.GH_REPO || 'bigdestiny2/pearbrowser-desktop'
const platform = normalizePlatform(args.platform || process.platform)
const arch = normalizeArch(args.arch || process.arch)

let release
try {
  release = args.fixture ? loadFixture(args.fixture) : loadReleaseFromGithub(repo, tag)
} catch (err) {
  fail(err && err.message ? err.message : String(err))
}

let result
try {
  result = resolveReleaseAsset(release, { repo, tag, version, platform, arch })
} catch (err) {
  fail(err && err.message ? err.message : String(err))
}

if (args.json) printJson(result)
else printHuman(result)

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    fixture: '',
    platform: '',
    arch: '',
    json: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--platform') parsed.platform = requireValue(argv, ++i, arg)
    else if (arg === '--arch') parsed.arch = requireValue(argv, ++i, arg)
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
  console.error('usage: node scripts/resolve-native-release-asset.mjs [--tag v0.5.0] [--repo owner/repo] [--platform macos|windows|linux] [--arch x64|arm64] [--json]')
  console.error('       node scripts/resolve-native-release-asset.mjs --fixture release.json [--platform macos|windows|linux] [--arch x64|arm64] [--json]')
  process.exit(code)
}

function fail (message) {
  if (args.json) {
    console.log(JSON.stringify({
      ok: false,
      repo,
      tag,
      version,
      platform,
      arch,
      error: message
    }, null, 2))
  } else {
    console.error(`Native release asset resolver failed: ${message}`)
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

function normalizePlatform (value) {
  const platform = String(value || '').toLowerCase()
  if (platform === 'darwin' || platform === 'mac' || platform === 'macos') return 'macos'
  if (platform === 'win32' || platform === 'win' || platform === 'windows') return 'windows'
  if (platform === 'linux') return 'linux'
  usage(2, `unsupported platform: ${value}`)
}

function normalizeArch (value) {
  const arch = String(value || '').toLowerCase()
  if (arch === 'x64' || arch === 'amd64') return 'x64'
  if (arch === 'arm64' || arch === 'aarch64') return 'arm64'
  return arch
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

function resolveReleaseAsset (release, options) {
  const assets = normalizeAssets(release?.assets)
  const names = new Set(assets.map((asset) => asset.name))
  const tagName = release?.tagName || release?.tag_name || ''
  if (tagName && tagName !== options.tag) {
    throw new Error(`release tagName ${tagName} does not match expected ${options.tag}`)
  }
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
    ok: true,
    repo: options.repo,
    tag: options.tag,
    version: options.version,
    platform: options.platform,
    arch: options.arch,
    release: {
      tagName,
      isDraft: !!release?.isDraft,
      isPrerelease: !!release?.isPrerelease
    },
    asset: {
      name: asset.name,
      size: asset.size,
      url: asset.url || githubReleaseAssetUrl(options.repo, options.tag, asset.name)
    },
    checksum: {
      name: checksumName,
      size: checksumAsset.size,
      url: checksumAsset.url || githubReleaseAssetUrl(options.repo, options.tag, checksumName)
    },
    candidates: candidates.map((candidate) => candidate.name)
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
  if (platform === 'linux') return /\.(?:AppImage|deb|rpm|snap|tar\.gz|tgz|tar\.xz|zip)$/i.test(name)
  return false
}

function artifactRank (platform, name) {
  const order = {
    macos: [/\.dmg$/i, /\.pkg$/i, /\.app\.zip$/i, /\.zip$/i],
    windows: [/\.exe$/i, /\.msix$/i, /\.msi$/i, /\.zip$/i],
    linux: [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i, /\.snap$/i, /\.tar\.gz$/i, /\.tgz$/i, /\.tar\.xz$/i, /\.zip$/i]
  }[platform] || []
  const index = order.findIndex((pattern) => pattern.test(name))
  return index === -1 ? order.length : index
}

function githubReleaseAssetUrl (repo, tag, name) {
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`
}

function printJson (result) {
  console.log(JSON.stringify(result, null, 2))
}

function printHuman (result) {
  console.log(`PearBrowser ${result.tag} native package for ${result.platform}/${result.arch}`)
  console.log(`package:  ${result.asset.name}`)
  console.log(`          ${result.asset.url}`)
  console.log(`checksum: ${result.checksum.name}`)
  console.log(`          ${result.checksum.url}`)
  if (result.release.isDraft) console.warn('warning: release is still a draft')
  if (result.release.isPrerelease) console.warn('warning: release is marked prerelease')
}
