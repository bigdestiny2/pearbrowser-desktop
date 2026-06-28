#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createReadStream, readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const SUPPORTED_TARGETS = [
  { platform: 'macos', arch: 'arm64' },
  { platform: 'macos', arch: 'x64' },
  { platform: 'windows', arch: 'x64' },
  { platform: 'linux', arch: 'x64' }
]

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const version = versionFromTag(tag)
const repo = args.repo || process.env.GH_REPO || 'bigdestiny2/pearbrowser-desktop'
const targets = args.all
  ? SUPPORTED_TARGETS
  : [{ platform: normalizePlatform(args.platform || process.platform), arch: normalizeArch(args.arch || process.arch) }]

let release
try {
  release = args.fixture ? loadFixture(args.fixture) : loadReleaseFromGithub(repo, tag)
} catch (err) {
  fail(err && err.message ? err.message : String(err))
}

const report = {
  ok: true,
  repo,
  tag,
  version,
  targets: [],
  errors: []
}

for (const target of targets) {
  try {
    const resolved = resolveReleaseAsset(release, { repo, tag, version, ...target })
    const sidecar = await readUrlText(resolved.checksum.url)
    const expected = parseSidecar(sidecar, resolved.asset.name)
    const actual = await hashUrl(resolved.asset.url)
    const ok = actual.sha256 === expected.sha256
    if (!ok) {
      throw new Error(`${target.platform}/${target.arch} SHA-256 mismatch for ${resolved.asset.name}: expected ${expected.sha256}, got ${actual.sha256}`)
    }
    if (resolved.asset.size > 0 && actual.bytes !== resolved.asset.size) {
      throw new Error(`${target.platform}/${target.arch} byte count mismatch for ${resolved.asset.name}: expected ${resolved.asset.size}, got ${actual.bytes}`)
    }
    report.targets.push({
      ok: true,
      platform: target.platform,
      arch: target.arch,
      asset: resolved.asset.name,
      checksum: resolved.checksum.name,
      sha256: actual.sha256,
      bytes: actual.bytes
    })
  } catch (err) {
    report.ok = false
    const message = err && err.message ? err.message : String(err)
    report.errors.push(message)
    report.targets.push({
      ok: false,
      platform: target.platform,
      arch: target.arch,
      error: message
    })
  }
}

if (args.json) printJson(report)
else printHuman(report)

if (!report.ok) process.exit(1)

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    fixture: '',
    platform: '',
    arch: '',
    all: false,
    json: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--platform') parsed.platform = requireValue(argv, ++i, arg)
    else if (arg === '--arch') parsed.arch = requireValue(argv, ++i, arg)
    else if (arg === '--all') parsed.all = true
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
  console.error('usage: node scripts/verify-native-downloads.mjs [--tag v0.5.0] [--repo owner/repo] [--platform macos|windows|linux] [--arch x64|arm64] [--all] [--json]')
  console.error('       node scripts/verify-native-downloads.mjs --fixture release.json [--platform macos|windows|linux] [--arch x64|arm64] [--all] [--json]')
  process.exit(code)
}

function fail (message) {
  if (args.json) {
    console.log(JSON.stringify({
      ok: false,
      repo,
      tag,
      version,
      errors: [message],
      targets: []
    }, null, 2))
  } else {
    console.error(`Native download verification failed: ${message}`)
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
  const checksumName = `${asset.name}.sha256`
  const checksumAsset = assets.find((candidate) => candidate.name === checksumName)
  if (!checksumAsset) throw new Error(`missing SHA-256 sidecar for ${asset.name}`)

  return {
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

async function readUrlText (url) {
  const chunks = []
  for await (const chunk of await openUrl(url)) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

async function hashUrl (url) {
  const hash = createHash('sha256')
  let bytes = 0
  for await (const chunk of await openUrl(url)) {
    bytes += chunk.length
    hash.update(chunk)
  }
  return { sha256: hash.digest('hex'), bytes }
}

async function openUrl (url, redirects = 0) {
  const parsed = new URL(url)
  if (parsed.protocol === 'file:') return createReadStream(fileURLToPath(parsed))
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`unsupported download URL protocol: ${parsed.protocol}`)
  }

  const client = parsed.protocol === 'https:' ? https : http
  return await new Promise((resolve, reject) => {
    const req = client.get(parsed, (res) => {
      const status = res.statusCode || 0
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        if (redirects >= 5) {
          reject(new Error(`too many redirects while downloading ${url}`))
          return
        }
        resolve(openUrl(new URL(res.headers.location, parsed).toString(), redirects + 1))
        return
      }
      if (status !== 200) {
        res.resume()
        reject(new Error(`download failed for ${url}: HTTP ${status}`))
        return
      }
      resolve(res)
    })
    req.on('error', reject)
  })
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printHuman (report) {
  if (report.ok) console.log(`Native downloads verified: ${report.repo}@${report.tag}`)
  else console.error(`Native download verification failed: ${report.repo}@${report.tag}`)

  for (const target of report.targets) {
    if (target.ok) {
      console.log(`- ${target.platform}/${target.arch}: ${target.asset} (${target.bytes} bytes, ${target.sha256})`)
    } else {
      console.error(`- ${target.platform}/${target.arch}: ${target.error}`)
    }
  }
}
