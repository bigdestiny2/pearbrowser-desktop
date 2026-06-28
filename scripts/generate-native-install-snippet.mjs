#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const SUPPORTED_TARGETS = [
  { label: 'macOS Apple Silicon', platform: 'macos', arch: 'arm64' },
  { label: 'macOS Intel', platform: 'macos', arch: 'x64' },
  { label: 'Windows x64', platform: 'windows', arch: 'x64' },
  { label: 'Linux x64', platform: 'linux', arch: 'x64' }
]

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const version = versionFromTag(tag)
const repo = args.repo || process.env.GH_REPO || 'bigdestiny2/pearbrowser-desktop'
const trustMode = normalizeTrustMode(args.trustMode || 'package-proof')

let release
try {
  release = args.fixture ? loadFixture(args.fixture) : loadReleaseFromGithub(repo, tag)
} catch (err) {
  fail(err && err.message ? err.message : String(err))
}

const report = buildInstallReport(release, { repo, tag, version, trustMode })

if (args.json) printJson(report)
else printMarkdown(report)

if (!report.ok) process.exit(1)

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    fixture: '',
    trustMode: '',
    json: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--trust-mode') parsed.trustMode = requireValue(argv, ++i, arg)
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
  console.error('usage: node scripts/generate-native-install-snippet.mjs [--tag v0.5.0] [--repo owner/repo] [--trust-mode package-proof|public-trust] [--json]')
  console.error('       node scripts/generate-native-install-snippet.mjs --fixture release.json [--tag v0.5.0] [--trust-mode package-proof|public-trust] [--json]')
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
      targets: [],
      errors: [message]
    }, null, 2))
  } else {
    console.error(`Native install snippet generation failed: ${message}`)
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
  if (mode === 'package-proof' || mode === 'public-trust') return mode
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

function buildInstallReport (release, options) {
  const errors = []
  const targets = []
  const tagName = release?.tagName || release?.tag_name || ''

  if (tagName && tagName !== options.tag) {
    errors.push(`release tagName ${tagName} does not match expected ${options.tag}`)
  }

  for (const target of SUPPORTED_TARGETS) {
    try {
      const resolved = resolveReleaseAsset(release, { ...options, ...target })
      targets.push({
        label: target.label,
        platform: target.platform,
        arch: target.arch,
        asset: resolved.asset,
        checksum: resolved.checksum,
        install: installNoteFor(target.platform, resolved.asset.name)
      })
    } catch (err) {
      errors.push(`${target.platform}/${target.arch}: ${err && err.message ? err.message : String(err)}`)
    }
  }

  return {
    ok: errors.length === 0,
    repo: options.repo,
    tag: options.tag,
    version: options.version,
    trustMode: options.trustMode,
    release: {
      tagName,
      isDraft: !!release?.isDraft,
      isPrerelease: !!release?.isPrerelease,
      url: githubReleasePageUrl(options.repo, options.tag)
    },
    targets,
    errors
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
    throw new Error(`no native artifact found for ${options.tag}`)
  }

  const asset = candidates[0]
  if (asset.size <= 0) throw new Error(`${asset.name} is empty or missing a size`)

  const checksumName = `${asset.name}.sha256`
  const checksumAsset = assets.find((candidate) => candidate.name === checksumName)
  if (!checksumAsset) throw new Error(`missing SHA-256 sidecar for ${asset.name}`)
  if (checksumAsset.size <= 0) throw new Error(`${checksumName} is empty or missing a size`)

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

function installNoteFor (platform, name) {
  if (platform === 'macos' && /\.dmg$/i.test(name)) {
    return 'Open the DMG and drag PearBrowser.app to /Applications.'
  }
  if (platform === 'macos') {
    return 'Unzip the archive, move PearBrowser.app to /Applications, then open it from Finder.'
  }
  if (platform === 'windows' && /\.msix$/i.test(name)) {
    return 'Open the MSIX package and follow the Windows installer prompts.'
  }
  if (platform === 'windows') {
    return 'Run the installer and follow the Windows prompts.'
  }
  if (platform === 'linux' && /\.(?:AppImage)$/i.test(name)) {
    return `Run chmod +x ${name}, then launch ./${name}.`
  }
  return 'Download the package and follow the platform installer prompts.'
}

function githubReleasePageUrl (repo, tag) {
  return `https://github.com/${repo}/releases/tag/${encodeURIComponent(tag)}`
}

function githubReleaseAssetUrl (repo, tag, name) {
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`
}

function markdownLink (label, url) {
  return `[${label}](${url})`
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printMarkdown (report) {
  if (!report.ok) {
    console.error(`Native install snippet generation failed for ${report.tag}:`)
    for (const error of report.errors) console.error(`- ${error}`)
    return
  }

  console.log('## Native Installers')
  console.log()
  console.log(`Download the package for your machine from the ${markdownLink(`${report.tag} GitHub release`, report.release.url)}, then verify it with the matching SHA-256 sidecar.`)
  if (report.release.isDraft) console.log()
  if (report.release.isDraft) console.log('Warning: this release is still a draft.')
  if (report.release.isPrerelease) console.log()
  if (report.release.isPrerelease) console.log('Warning: this release is marked prerelease.')
  console.log()
  console.log('| Machine | Package | SHA-256 sidecar |')
  console.log('| --- | --- | --- |')
  for (const target of report.targets) {
    console.log(`| ${target.label} | ${markdownLink(target.asset.name, target.asset.url)} | ${markdownLink(target.checksum.name, target.checksum.url)} |`)
  }
  console.log()
  console.log('### Install Notes')
  for (const note of unique(report.targets.map((target) => target.install))) {
    console.log(`- ${note}`)
  }
  console.log()
  console.log('### Trust Note')
  if (report.trustMode === 'public-trust') {
    console.log('These assets are expected to be signed/notarized where the OS supports it. Keep the checksum sidecars in the release notes for independent byte verification.')
  } else {
    console.log('These are package-proof assets. macOS or Windows may show OS trust prompts until the public-trust signing and notarization lane is complete.')
  }
}

function unique (values) {
  return [...new Set(values)]
}
