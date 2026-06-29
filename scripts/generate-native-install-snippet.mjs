#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pearConfig = JSON.parse(readFileSync(new URL('../pear.json', import.meta.url), 'utf8'))

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
const format = normalizeFormat(args.format || 'snippet')

let release
try {
  release = args.fixture ? loadFixture(args.fixture) : loadReleaseFromGithub(repo, tag)
} catch (err) {
  fail(err && err.message ? err.message : String(err))
}

const report = buildInstallReport(release, { repo, tag, version, trustMode })

if (args.json) printJson(report)
else if (format === 'guide') printInstallGuide(report)
else printMarkdown(report)

if (!report.ok) process.exit(1)

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    fixture: '',
    trustMode: '',
    format: '',
    json: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--trust-mode') parsed.trustMode = requireValue(argv, ++i, arg)
    else if (arg === '--format') parsed.format = requireValue(argv, ++i, arg)
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
  console.error('usage: node scripts/generate-native-install-snippet.mjs [--tag v0.5.0] [--repo owner/repo] [--trust-mode package-proof|public-trust] [--format snippet|guide] [--json]')
  console.error('       node scripts/generate-native-install-snippet.mjs --fixture release.json [--tag v0.5.0] [--trust-mode package-proof|public-trust] [--format snippet|guide] [--json]')
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
      format,
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

function normalizeFormat (value) {
  const selected = String(value || '').toLowerCase()
  if (selected === 'snippet' || selected === 'guide') return selected
  usage(2, `unsupported format: ${value}`)
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
    format,
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

function printInstallGuide (report) {
  if (!report.ok) {
    console.error(`Native install guide generation failed for ${report.tag}:`)
    for (const error of report.errors) console.error(`- ${error}`)
    return
  }

  const macos = report.targets.filter((target) => target.platform === 'macos')
  const windows = report.targets.find((target) => target.platform === 'windows')
  const linux = report.targets.find((target) => target.platform === 'linux')
  const macosExample = macos[0]
  const fallback = pearConfig?.links?.production || ''

  console.log('# Install Native Packages')
  console.log()
  console.log(`Current release: \`${report.tag}\`.`)
  console.log()
  if (report.trustMode === 'public-trust') {
    console.log('These are public-trust desktop builds. macOS and Windows packages are expected to be signed where the OS supports it, and every package keeps a matching SHA-256 sidecar for independent byte verification.')
  } else {
    console.log('These are package-proof desktop builds. Linux uses checksums only. macOS is ad-hoc signed but not notarized, and Windows packages are unsigned until the public-trust signing credentials are configured. Treat macOS/Windows OS trust prompts as expected for this release lane, not as the final public-trust experience.')
  }
  console.log()
  console.log('## Choose A Package')
  console.log()
  console.log(`Download directly from the ${markdownLink(`${report.tag} GitHub release`, report.release.url)}.`)
  console.log()
  console.log('| Machine | Recommended package | Checksum sidecar |')
  console.log('| --- | --- | --- |')
  for (const target of report.targets) {
    console.log(`| ${target.label} | ${markdownLink(target.asset.name, target.asset.url)} | ${markdownLink(target.checksum.name, target.checksum.url)} |`)
  }
  console.log()
  console.log('The Windows `.msix` and extra Linux AppImage artifact may remain attached for package validation, but the resolver selects the `.exe` and normalized `.AppImage` as the user-facing defaults.')
  if (report.trustMode !== 'public-trust') {
    console.log()
    console.log('For the future public-trust macOS lane, the resolver will prefer notarized `.dmg` assets over `.app.zip` once those assets are attached by the signed native release workflow.')
  }
  console.log()
  console.log('From a source checkout, ask the resolver for the current machine:')
  console.log()
  console.log('```sh')
  console.log(`npm run resolve:native-release -- --tag ${report.tag} --repo ${report.repo}`)
  console.log('```')
  console.log()
  console.log('Or specify a target:')
  console.log()
  console.log('```sh')
  console.log(`npm run resolve:native-release -- --tag ${report.tag} --repo ${report.repo} --platform macos --arch x64`)
  console.log('```')
  console.log()
  console.log('Release operators can verify every recommended package download and checksum sidecar in one pass:')
  console.log()
  console.log('```sh')
  console.log(`npm run verify:native-downloads -- --tag ${report.tag} --repo ${report.repo} --all`)
  console.log('```')
  console.log()
  console.log('Release operators can regenerate this guide from the same resolver rules:')
  console.log()
  console.log('```sh')
  console.log(`npm run -s generate:native-install-guide -- --tag ${report.tag} --repo ${report.repo}`)
  console.log('```')
  console.log()
  console.log('## Verify The Download')
  console.log()
  console.log('macOS and Linux:')
  console.log()
  console.log('```sh')
  console.log(`shasum -a 256 -c ${macosExample?.checksum?.name || 'PearBrowser-<version>-macos-arm64.app.zip.sha256'}`)
  console.log('```')
  console.log()
  console.log('Use the matching filename for your package. A passing check prints `OK`.')
  console.log()
  if (windows) {
    console.log('Windows PowerShell:')
    console.log()
    console.log('```powershell')
    console.log(`$package = "${windows.asset.name}"`)
    console.log('$expected = (Get-Content "$($package).sha256").Split(" ")[0].ToLowerInvariant()')
    console.log('$actual = (Get-FileHash $package -Algorithm SHA256).Hash.ToLowerInvariant()')
    console.log('if ($actual -ne $expected) { throw "SHA-256 mismatch for $package" }')
    console.log('```')
    console.log()
  }
  console.log('## Install')
  console.log()
  console.log('macOS:')
  console.log()
  if (macos.some((target) => /\.dmg$/i.test(target.asset.name))) {
    console.log('1. Open the DMG.')
    console.log('2. Drag `PearBrowser.app` to `/Applications`.')
    console.log('3. Open it from Finder.')
  } else {
    console.log('1. Unzip the `.app.zip`.')
    console.log('2. Move `PearBrowser.app` to `/Applications`.')
    console.log('3. Open it from Finder. For package-proof builds, macOS may show an unidentified developer warning. Use Control-click -> Open only if you intentionally trust this package and its checksum.')
  }
  console.log()
  console.log('Windows:')
  console.log()
  console.log(`1. Run \`${windows?.asset?.name || 'PearBrowser-<version>-windows-x64.exe'}\`.`)
  if (report.trustMode === 'public-trust') {
    console.log('2. Follow the Windows installer prompts.')
  } else {
    console.log('2. For package-proof builds, Windows SmartScreen may warn because the installer is not yet Authenticode-signed. Continue only if you intentionally trust this package and its checksum.')
  }
  console.log()
  console.log('Linux:')
  console.log()
  console.log('```sh')
  console.log(`chmod +x ${linux?.asset?.name || 'PearBrowser-<version>-linux-x64.AppImage'}`)
  console.log(`./${linux?.asset?.name || 'PearBrowser-<version>-linux-x64.AppImage'}`)
  console.log('```')
  if (fallback) {
    console.log()
    console.log('## Recovery Fallback')
    console.log()
    console.log('The stable Pear link remains available for testers and recovery while native packaging matures:')
    console.log()
    console.log('```sh')
    console.log('npm i -g pear')
    console.log('pear')
    console.log(`pear run ${fallback}`)
    console.log('```')
    console.log()
    console.log('This fallback is not the preferred public install path because `pear run` is deprecated in Pear runtime `v2.4.0`, but it is still useful when diagnosing a native package issue.')
  }
}

function unique (values) {
  return [...new Set(values)]
}
