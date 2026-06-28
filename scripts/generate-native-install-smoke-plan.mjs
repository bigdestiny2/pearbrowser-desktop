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

const report = buildSmokePlan(release, { repo, tag, version, trustMode })

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
  console.error('usage: node scripts/generate-native-install-smoke-plan.mjs [--tag v0.5.0] [--repo owner/repo] [--trust-mode package-proof|public-trust] [--json]')
  console.error('       node scripts/generate-native-install-smoke-plan.mjs --fixture release.json [--tag v0.5.0] [--trust-mode package-proof|public-trust] [--json]')
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
      warnings: [],
      errors: [message]
    }, null, 2))
  } else {
    console.error(`Native install smoke plan generation failed: ${message}`)
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

function buildSmokePlan (release, options) {
  const errors = []
  const warnings = []
  const targets = []
  const tagName = release?.tagName || release?.tag_name || ''

  if (tagName && tagName !== options.tag) {
    errors.push(`release tagName ${tagName} does not match expected ${options.tag}`)
  }
  if (options.trustMode === 'public-trust') {
    if (release?.isDraft) errors.push('public-trust clean-install smoke requires a published release')
    if (release?.isPrerelease) errors.push('public-trust clean-install smoke requires a non-prerelease release')
  } else {
    warnings.push('package-proof clean-install smoke may include expected macOS or Windows OS trust prompts')
  }

  for (const target of SUPPORTED_TARGETS) {
    try {
      const resolved = resolveReleaseAsset(release, { ...options, ...target })
      validateTrustMode(target, resolved, options, errors)
      targets.push({
        label: target.label,
        platform: target.platform,
        arch: target.arch,
        cleanHost: cleanHostFor(target.platform),
        asset: resolved.asset,
        checksum: resolved.checksum,
        commands: commandsFor(target, resolved, options),
        evidence: evidenceFor(target.platform, options.trustMode)
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
    warnings,
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

function validateTrustMode (target, resolved, options, errors) {
  if (options.trustMode !== 'public-trust') return
  if (target.platform === 'macos' && !/\.dmg$/i.test(resolved.asset.name)) {
    errors.push(`public-trust clean-install smoke requires notarized macOS DMG assets, got ${resolved.asset.name}`)
  }
  if (target.platform === 'windows' && !/\.exe$/i.test(resolved.asset.name)) {
    errors.push(`public-trust clean-install smoke expects the signed Windows .exe installer, got ${resolved.asset.name}`)
  }
}

function cleanHostFor (platform) {
  if (platform === 'macos') return 'Clean macOS user profile or VM with no PearBrowser source checkout in the working directory.'
  if (platform === 'windows') return 'Clean Windows VM or user profile with no PearBrowser source checkout in the working directory.'
  if (platform === 'linux') return 'Clean Ubuntu desktop VM or user profile with no PearBrowser source checkout in the working directory.'
  return 'Clean host with no PearBrowser source checkout in the working directory.'
}

function commandsFor (target, resolved, options) {
  if (target.platform === 'macos') return macosCommands(resolved, options)
  if (target.platform === 'windows') return windowsCommands(resolved)
  if (target.platform === 'linux') return linuxCommands(resolved)
  return []
}

function macosCommands (resolved, options) {
  const asset = shellQuote(resolved.asset.name)
  const checksum = shellQuote(resolved.checksum.name)
  const commands = [
    `curl -L -o ${asset} ${shellQuote(resolved.asset.url)}`,
    `curl -L -o ${checksum} ${shellQuote(resolved.checksum.url)}`,
    `shasum -a 256 -c ${checksum}`
  ]

  if (/\.dmg$/i.test(resolved.asset.name)) {
    commands.push(
      `hdiutil attach ${asset}`,
      'cp -R /Volumes/PearBrowser/PearBrowser.app /Applications/',
      'hdiutil detach /Volumes/PearBrowser',
      'codesign --verify --deep --strict --verbose=2 /Applications/PearBrowser.app'
    )
    if (options.trustMode === 'public-trust') {
      commands.push(
        'xcrun stapler validate /Applications/PearBrowser.app',
        'spctl --assess --type execute --verbose /Applications/PearBrowser.app'
      )
    }
    commands.push('open /Applications/PearBrowser.app')
    return commands
  }

  commands.push(
    'rm -rf PearBrowser-install',
    'mkdir PearBrowser-install',
    `ditto -x -k ${asset} PearBrowser-install`,
    'cp -R PearBrowser-install/PearBrowser.app /Applications/',
    'codesign --verify --deep --strict --verbose=2 /Applications/PearBrowser.app',
    'open /Applications/PearBrowser.app'
  )
  return commands
}

function windowsCommands (resolved) {
  const asset = powershellString(resolved.asset.name)
  const checksum = powershellString(resolved.checksum.name)
  const assetUrl = powershellString(resolved.asset.url)
  const checksumUrl = powershellString(resolved.checksum.url)
  const commands = [
    `Invoke-WebRequest -Uri ${assetUrl} -OutFile ${asset}`,
    `Invoke-WebRequest -Uri ${checksumUrl} -OutFile ${checksum}`,
    `$expected = (Get-Content .\\${resolved.checksum.name}).Split(' ')[0].ToUpperInvariant()`,
    `$actual = (Get-FileHash .\\${resolved.asset.name} -Algorithm SHA256).Hash`,
    'if ($actual -ne $expected) { throw "SHA256 mismatch" }',
    `Get-AuthenticodeSignature .\\${resolved.asset.name} | Format-List`
  ]

  if (/\.msix$/i.test(resolved.asset.name)) {
    commands.push(`Add-AppxPackage .\\${resolved.asset.name}`)
  } else {
    commands.push(`Start-Process .\\${resolved.asset.name} -Wait`)
  }
  commands.push('# Launch PearBrowser from the Start menu and confirm the first window opens.')
  return commands
}

function linuxCommands (resolved) {
  const asset = shellQuote(resolved.asset.name)
  const checksum = shellQuote(resolved.checksum.name)
  const commands = [
    `curl -L -o ${asset} ${shellQuote(resolved.asset.url)}`,
    `curl -L -o ${checksum} ${shellQuote(resolved.checksum.url)}`,
    `sha256sum -c ${checksum}`
  ]

  if (/\.AppImage$/i.test(resolved.asset.name)) {
    commands.push(
      `chmod +x ${asset}`,
      `./${resolved.asset.name}`
    )
  } else {
    commands.push('Install the package with the platform package manager, then launch PearBrowser from the desktop environment.')
  }
  return commands
}

function evidenceFor (platform, trustMode) {
  const common = [
    'OS version and architecture',
    'Package filename and SHA-256 verification output',
    'Screenshot or screen recording of the first PearBrowser window',
    'Confirmation that the test host did not use a source checkout'
  ]
  if (platform === 'macos') {
    common.push('codesign verification output')
    if (trustMode === 'public-trust') common.push('stapler and spctl assessment output')
    else common.push('Any expected Gatekeeper prompt or trust warning text')
  } else if (platform === 'windows') {
    common.push('Get-AuthenticodeSignature output')
    if (trustMode !== 'public-trust') common.push('Any expected SmartScreen or unsigned-installer warning text')
  } else if (platform === 'linux') {
    common.push('Terminal output showing the AppImage starts on the clean desktop session')
  }
  return common
}

function githubReleasePageUrl (repo, tag) {
  return `https://github.com/${repo}/releases/tag/${encodeURIComponent(tag)}`
}

function githubReleaseAssetUrl (repo, tag, name) {
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`
}

function shellQuote (value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function powershellString (value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function markdownLink (label, url) {
  return `[${label}](${url})`
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printMarkdown (report) {
  if (!report.ok) {
    console.error(`Native install smoke plan generation failed for ${report.tag}:`)
    for (const error of report.errors) console.error(`- ${error}`)
    for (const warning of report.warnings) console.error(`warning: ${warning}`)
    return
  }

  console.log('## Native Clean-Install Smoke Plan')
  console.log()
  console.log(`Release: ${markdownLink(report.tag, report.release.url)}`)
  console.log(`Trust mode: ${report.trustMode}`)
  for (const warning of report.warnings) console.log(`Warning: ${warning}`)
  console.log()
  console.log('Run each target on a clean host or VM. Record the evidence bullets back into the release smoke evidence log before announcement.')
  console.log()

  for (const target of report.targets) {
    console.log(`### ${target.label}`)
    console.log()
    console.log(`Clean host: ${target.cleanHost}`)
    console.log()
    console.log(`Package: ${markdownLink(target.asset.name, target.asset.url)}`)
    console.log(`SHA-256 sidecar: ${markdownLink(target.checksum.name, target.checksum.url)}`)
    console.log()
    console.log('Commands:')
    console.log()
    console.log(codeFence(target.platform))
    for (const command of target.commands) console.log(command)
    console.log('```')
    console.log()
    console.log('Evidence to record:')
    for (const item of target.evidence) console.log(`- ${item}`)
    console.log()
  }
}

function codeFence (platform) {
  if (platform === 'windows') return '```powershell'
  return '```sh'
}
