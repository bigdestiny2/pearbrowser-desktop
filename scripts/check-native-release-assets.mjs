#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const version = versionFromTag(tag)
const repo = args.repo || process.env.GH_REPO || 'bigdestiny2/pearbrowser-desktop'

let release
try {
  release = args.fixture ? loadFixture(args.fixture) : loadReleaseFromGithub(repo, tag)
} catch (err) {
  const message = err && err.message ? err.message : String(err)
  if (args.json) {
    console.log(JSON.stringify({
      ok: false,
      tag,
      repo,
      errors: [message],
      warnings: [],
      platforms: {}
    }, null, 2))
  } else {
    console.error(`Native release asset check failed: ${message}`)
  }
  process.exit(1)
}

const report = verifyRelease(release, {
  repo,
  tag,
  version,
  requirePublished: args.requirePublished
})

if (args.json) printJson(report)
else printHuman(report)

if (!report.ok) process.exit(1)

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    fixture: '',
    json: false,
    requirePublished: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--json') parsed.json = true
    else if (arg === '--require-published') parsed.requirePublished = true
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
  console.error('usage: node scripts/check-native-release-assets.mjs [--tag v0.5.0] [--repo owner/repo] [--require-published] [--json]')
  console.error('       node scripts/check-native-release-assets.mjs --fixture release.json [--tag v0.5.0] [--json]')
  process.exit(code)
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

function verifyRelease (release, options) {
  const errors = []
  const warnings = []
  const assets = normalizeAssets(release?.assets)
  const names = new Set()
  const duplicateNames = new Set()

  for (const asset of assets) {
    if (names.has(asset.name)) duplicateNames.add(asset.name)
    names.add(asset.name)
  }

  if (duplicateNames.size > 0) {
    errors.push(`duplicate release asset name(s): ${[...duplicateNames].sort().join(', ')}`)
  }
  if (assets.length === 0) errors.push('release has no attached assets')

  const tagName = release?.tagName || release?.tag_name || ''
  if (tagName && tagName !== options.tag) {
    errors.push(`release tagName ${tagName} does not match expected ${options.tag}`)
  }
  if (options.requirePublished && release?.isDraft) {
    errors.push('release is still a draft; publish it before public announcement')
  }
  if (release?.isPrerelease) {
    warnings.push('release is marked prerelease')
  }

  const platforms = {}
  for (const platform of ['macos', 'windows', 'linux']) {
    platforms[platform] = verifyPlatform(platform, assets, names, options.version, errors)
  }

  const classified = new Set()
  for (const platform of Object.values(platforms)) {
    for (const name of platform.artifacts) classified.add(name)
    for (const name of platform.sidecars) classified.add(name)
    for (const name of platform.sums) classified.add(name)
    for (const name of platform.manifests) classified.add(name)
  }
  const extras = assets
    .map((asset) => asset.name)
    .filter((name) => !classified.has(name))
    .sort()
  if (extras.length) warnings.push(`unclassified attached asset(s): ${extras.join(', ')}`)

  return {
    ok: errors.length === 0,
    repo: options.repo,
    tag: options.tag,
    version: options.version,
    release: {
      tagName,
      isDraft: !!release?.isDraft,
      isPrerelease: !!release?.isPrerelease
    },
    counts: {
      assets: assets.length,
      errors: errors.length,
      warnings: warnings.length
    },
    platforms,
    errors,
    warnings
  }
}

function normalizeAssets (assets) {
  if (!Array.isArray(assets)) return []
  return assets
    .map((asset) => ({
      name: String(asset?.name || '').trim(),
      size: Number(asset?.size ?? asset?.sizeInBytes ?? asset?.size_bytes ?? 0)
    }))
    .filter((asset) => asset.name)
}

function verifyPlatform (platform, assets, names, version, errors) {
  const sums = assets.filter((asset) => asset.name.match(new RegExp(`^SHA256SUMS-${escapeRegex(platform)}-[A-Za-z0-9._-]+\\.txt$`)))
  const manifests = assets.filter((asset) => asset.name.match(new RegExp(`^manifest-${escapeRegex(platform)}-[A-Za-z0-9._-]+\\.json$`)))
  const sumsByArch = assetsByArch(sums, new RegExp(`^SHA256SUMS-${escapeRegex(platform)}-([A-Za-z0-9._-]+)\\.txt$`), `${platform} SHA256SUMS`, errors)
  const manifestsByArch = assetsByArch(manifests, new RegExp(`^manifest-${escapeRegex(platform)}-([A-Za-z0-9._-]+)\\.json$`), `${platform} manifest`, errors)
  const primaryPrefix = `PearBrowser-${version}-${platform}-`
  const artifacts = assets
    .filter((asset) => asset.name.startsWith(primaryPrefix))
    .filter((asset) => !asset.name.endsWith('.sha256'))
    .filter((asset) => isPrimaryArtifact(platform, asset.name, version))
  const artifactsByArch = assetsGroupedByArch(
    artifacts,
    new RegExp(`^PearBrowser-${escapeRegex(version)}-${escapeRegex(platform)}-([A-Za-z0-9._-]+?)(?:[-.].*)?$`),
    `${platform} artifact`,
    errors
  )

  if (sums.length === 0) {
    errors.push(`expected at least one SHA256SUMS file for ${platform}`)
  }
  if (manifests.length === 0) {
    errors.push(`expected at least one manifest file for ${platform}`)
  }

  const arches = [...new Set([
    ...sumsByArch.keys(),
    ...manifestsByArch.keys(),
    ...artifactsByArch.keys()
  ])].sort()

  if (arches.length === 0) {
    errors.push(`expected at least one ${platform} native architecture`)
  }

  for (const arch of arches) {
    if (!sumsByArch.has(arch)) errors.push(`missing SHA256SUMS file for ${platform}/${arch}`)
    if (!manifestsByArch.has(arch)) errors.push(`missing manifest file for ${platform}/${arch}`)
    if (!artifactsByArch.has(arch)) {
      errors.push(`expected at least one primary ${platform}/${arch} native artifact named ${primaryPrefix}${arch}...`)
    }
  }

  const sidecars = []
  for (const artifact of artifacts) {
    if (artifact.size <= 0) errors.push(`${platform} artifact ${artifact.name} is empty or missing a size`)
    const sidecar = `${artifact.name}.sha256`
    if (!names.has(sidecar)) errors.push(`missing SHA-256 sidecar for ${artifact.name}`)
    else sidecars.push(sidecar)
  }

  for (const asset of [...sums, ...manifests, ...sidecars.map((name) => assets.find((asset) => asset.name === name)).filter(Boolean)]) {
    if (asset.size <= 0) errors.push(`${asset.name} is empty or missing a size`)
  }

  return {
    arch: arches.length === 1 ? arches[0] : null,
    arches,
    artifacts: artifacts.map((asset) => asset.name).sort(),
    sidecars: sidecars.sort(),
    sums: sums.map((asset) => asset.name).sort(),
    manifests: manifests.map((asset) => asset.name).sort()
  }
}

function assetsByArch (assets, pattern, label, errors) {
  const byArch = new Map()
  for (const asset of assets) {
    const arch = asset.name.match(pattern)?.[1] || ''
    if (!arch) {
      errors.push(`${label} ${asset.name} does not include an architecture`)
      continue
    }
    const normalized = arch.toLowerCase()
    if (byArch.has(normalized)) {
      errors.push(`duplicate ${label} for ${normalized}: ${byArch.get(normalized).name}, ${asset.name}`)
    } else {
      byArch.set(normalized, asset)
    }
  }
  return byArch
}

function assetsGroupedByArch (assets, pattern, label, errors) {
  const byArch = new Map()
  for (const asset of assets) {
    const arch = asset.name.match(pattern)?.[1] || ''
    if (!arch) {
      errors.push(`${label} ${asset.name} does not include an architecture`)
      continue
    }
    const normalized = arch.toLowerCase()
    const group = byArch.get(normalized) || []
    group.push(asset)
    byArch.set(normalized, group)
  }
  return byArch
}

function isPrimaryArtifact (platform, name, version) {
  if (!name.startsWith(`PearBrowser-${version}-${platform}-`)) return false
  if (platform === 'macos') return /\.(?:app\.zip|dmg|pkg|zip)$/i.test(name)
  if (platform === 'windows') return /\.(?:msix|exe|msi|zip)$/i.test(name)
  if (platform === 'linux') return /\.(?:AppImage|deb|rpm|snap|tar\.gz|tgz|tar\.xz|zip)$/i.test(name)
  return false
}

function escapeRegex (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printHuman (report) {
  if (report.ok) console.log(`Native release assets ok: ${report.repo}@${report.tag} (${report.counts.assets} assets)`)
  else console.error(`Native release asset check failed: ${report.repo}@${report.tag}`)

  for (const [platform, data] of Object.entries(report.platforms)) {
    const arch = data.arches.length ? data.arches.join(',') : 'unknown-arch'
    const artifacts = data.artifacts.length ? data.artifacts.join(', ') : 'none'
    console.log(`- ${platform}/${arch}: ${artifacts}`)
  }

  for (const warning of report.warnings) console.warn(`warning: ${warning}`)
  for (const error of report.errors) console.error(`error: ${error}`)
}
