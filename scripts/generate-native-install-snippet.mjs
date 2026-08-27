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
const trustMode = normalizeTrustMode(args.trustMode || 'public-trust')
const format = normalizeFormat(args.format || 'snippet')

if (trustMode === 'package-proof' && !args.fixture) {
  fail('package-proof artifacts live in GitHub Actions only; pass --fixture with downloaded artifact metadata instead of reading or creating a GitHub Release')
}

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
  console.error('usage: node scripts/generate-native-install-snippet.mjs [--tag v0.9.1] [--repo owner/repo] [--trust-mode public-trust] [--format snippet|guide] [--json]')
  console.error('       node scripts/generate-native-install-snippet.mjs --fixture actions-artifacts.json [--tag v0.9.1] --trust-mode package-proof [--format snippet|guide] [--json]')
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
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(normalized)) {
    usage(2, `release tag must be stable vX.Y.Z, got ${tag}`)
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
  if (options.trustMode === 'public-trust') {
    if (release?.isDraft) errors.push('public-trust install guidance requires a published release')
    if (release?.isPrerelease) errors.push('public-trust install guidance requires a stable non-prerelease release')
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
    .filter((asset) => isPrimaryArtifact(options.platform, asset.name, options.trustMode))
    .sort((a, b) => {
      return artifactRank(options.platform, a.name, options.trustMode) - artifactRank(options.platform, b.name, options.trustMode) ||
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

function isPrimaryArtifact (platform, name, trustMode) {
  if (platform === 'macos') return trustMode === 'public-trust' ? /\.dmg$/i.test(name) : /\.app\.zip$/i.test(name)
  if (platform === 'windows') return /\.exe$/i.test(name)
  if (platform === 'linux') return /\.AppImage$/i.test(name)
  return false
}

function artifactRank (platform, name, trustMode) {
  const order = {
    macos: trustMode === 'public-trust' ? [/\.dmg$/i] : [/\.app\.zip$/i],
    windows: [/\.exe$/i],
    linux: [/\.AppImage$/i]
  }[platform] || []
  const index = order.findIndex((pattern) => pattern.test(name))
  return index === -1 ? order.length : index
}

function installNoteFor (platform, name) {
  if (platform === 'macos' && /\.dmg$/i.test(name)) {
    return 'Open the DMG and drag PearBrowser.app to /Applications.'
  }
  if (platform === 'macos') {
    return 'Unzip the archive, move PearBrowser.app to /Applications, then open it from Finder. Package-proof builds may require the macOS Privacy & Security "Open Anyway" flow after checksum verification.'
  }
  if (platform === 'windows') {
    return 'Run the NSIS .exe installer and follow the Windows prompts.'
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
    console.log('Release metadata identifies these packages as public-trust lane outputs, but this generator checks only publication state, filenames, sizes, and SHA-256 sidecar presence. It does not independently attest Developer ID signing, notarization or stapling, or Authenticode signing. Release operators must validate those properties against the complete published release evidence before making OS-trust claims. Keep every SHA-256 sidecar in the release notes for independent byte verification.')
  } else {
    console.log('These are package-proof GitHub Actions artifacts, not release assets. macOS or Windows may show OS trust prompts; do not redistribute or publish them as a GitHub Release.')
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

  console.log('# Install Native Packages')
  console.log()
  console.log(`Current release: \`${report.tag}\`.`)
  console.log()
  if (report.trustMode === 'public-trust') {
    console.log('Release metadata identifies these packages as public-trust lane outputs, and every package has a matching SHA-256 sidecar for independent byte verification. This guide does not independently attest Developer ID signing, notarization or stapling, or Authenticode signing; release operators must validate those properties against the complete published release evidence before making OS-trust claims.')
  } else {
    console.log('These are package-proof GitHub Actions artifacts only. Linux uses checksums, macOS is ad-hoc signed but not notarized, and the Windows NSIS installer is unsigned. They are never attached to or published as a GitHub Release; use them only for packaging and clean-host verification.')
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
  console.log('The supported user-facing formats are a macOS `.dmg`, a Windows NSIS `.exe`, and a Linux `.AppImage`. Public-trust releases also retain the macOS `.app.zip` plus its checksum as a directly inspectable companion artifact. Signing and notarization status must come from release evidence, not these filenames.')
  if (report.trustMode !== 'public-trust') {
    console.log()
    console.log('The public-trust macOS lane selects the notarized `.dmg`; the `.app.zip` remains a release companion only after Developer ID signing and notarization pass.')
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
    console.log('3. Verify the SHA-256 sidecar for the downloaded archive before first launch.')
    console.log('4. Open it from Finder. For package-proof builds, macOS may show an unidentified developer or malware-verification warning because the app is not notarized.')
    console.log('5. If the first launch is blocked, use Control-click `PearBrowser.app` -> Open -> Open, or open System Settings -> Privacy & Security and choose Open Anyway for PearBrowser. Continue only if you intentionally trust this package and its checksum.')
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
}

function unique (values) {
  return [...new Set(values)]
}
