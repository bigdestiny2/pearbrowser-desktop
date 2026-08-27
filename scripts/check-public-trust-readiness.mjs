#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const DEFAULT_REPO = 'bigdestiny2/pearbrowser-desktop'
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const repo = args.repo || process.env.GH_REPO || DEFAULT_REPO
const sourceRef = normalizeSourceSha(args.sourceRef || process.env.GITHUB_SHA || '')
const signingGithubEnvironment = args.signingGithubEnvironment || (args.signingSecretSource === 'github' ? 'production' : '')

const sharedReleaseArgs = [
  '--tag',
  tag,
  '--repo',
  repo,
  ...(args.fixture ? ['--fixture', args.fixture] : [])
]
const nativeSigningArgs = [
  '--require-public-trust',
  '--json',
  ...(args.signingSecretSource ? ['--secret-source', args.signingSecretSource] : []),
  ...(args.signingRepo ? ['--repo', args.signingRepo] : args.signingSecretSource === 'github' ? ['--repo', repo] : []),
  ...(signingGithubEnvironment ? ['--github-environment', signingGithubEnvironment] : []),
  ...(args.signingGithubSecretsFile ? ['--github-secrets-file', args.signingGithubSecretsFile] : [])
]
const publishedProvenance = await runPublishedProvenanceCheck({
  fixture: args.fixture,
  repo,
  tag,
  sourceRef
})

const checks = [
  runNodeCheck({
    id: 'native-signing',
    label: 'Native signing credentials',
    script: 'scripts/check-native-signing-credentials.mjs',
    args: nativeSigningArgs
  }),
  runNodeCheck({
    id: 'native-release-assets',
    label: 'Published public-trust release assets',
    script: 'scripts/check-native-release-assets.mjs',
    args: [...sharedReleaseArgs, '--require-published', '--require-public-trust', '--json']
  }),
  publishedProvenance,
  runNodeCheck({
    id: 'native-downloads',
    label: 'Native package byte verification',
    script: 'scripts/verify-native-downloads.mjs',
    args: [...sharedReleaseArgs, '--all', '--json']
  }),
  runNodeCheck({
    id: 'linux-appimage-metadata',
    label: 'Linux AppImage desktop metadata',
    script: 'scripts/check-linux-appimage-metadata.mjs',
    args: ['--json']
  }),
  runNodeCheck({
    id: 'native-install-smoke-plan',
    label: 'Clean-machine install smoke plan',
    script: 'scripts/generate-native-install-smoke-plan.mjs',
    args: [...sharedReleaseArgs, '--trust-mode', 'public-trust', '--source-ref', sourceRef, '--json']
  }),
  runNodeCheck({
    id: 'package-manager-manifests',
    label: 'Package-manager manifest drafts',
    script: 'scripts/generate-package-manager-manifests.mjs',
    args: [...sharedReleaseArgs, '--dry-run', '--json']
  }),
  runNodeCheck({
    id: 'release-evidence',
    label: 'Operator release evidence log',
    script: 'scripts/check-release-evidence.mjs',
    args: [...(args.evidenceFile ? ['--file', args.evidenceFile] : []), '--json']
  })
]

const blockers = checks.flatMap((check) => check.blockers.map((message) => ({
  check: check.id,
  message
})))
const warnings = checks.flatMap((check) => check.warnings.map((message) => ({
  check: check.id,
  message
})))
const report = {
  ok: blockers.length === 0,
  repo,
  tag,
  sourceRef,
  mode: 'public-trust',
  checks,
  blockers,
  warnings
}

if (args.json) printJson(report)
else printHuman(report)

process.exit(report.ok ? 0 : 1)

async function runPublishedProvenanceCheck ({ fixture, repo, tag, sourceRef }) {
  const label = 'Published provenance manifests and checksum metadata'
  const command = `validate published public-trust provenance for ${tag} from ${sourceRef}`
  const directory = mkdtempSync(join(tmpdir(), 'pearbrowser-published-provenance-'))
  try {
    const release = loadReleaseMetadata({ fixture, repo, tag })
    const targets = expectedProvenanceTargets(tag)
    const requiredNames = targets.flatMap((target) => [
      target.manifestName,
      target.sumsName,
      ...target.artifactNames.map((name) => `${name}.sha256`)
    ])
    const assets = normalizeReleaseAssets(release?.assets)
    const errors = validateRequiredAssets(assets, requiredNames)

    if (errors.length === 0) {
      await downloadProvenanceAssets({ fixture, repo, tag, assets, requiredNames, directory })
      errors.push(...verifyPublishedProvenance({ release, assets, targets, directory, tag, sourceRef }))
    }

    return {
      id: 'published-provenance',
      label,
      ok: errors.length === 0,
      status: errors.length === 0 ? 'pass' : 'block',
      command,
      exitCode: errors.length === 0 ? 0 : 1,
      summary: errors.length === 0
        ? `targets=${targets.length}; artifacts=${targets.reduce((count, target) => count + target.artifactNames.length, 0)}; sourceRef=${sourceRef}`
        : `errors=${errors.length}`,
      blockers: errors,
      warnings: []
    }
  } catch (error) {
    return {
      id: 'published-provenance',
      label,
      ok: false,
      status: 'block',
      command,
      exitCode: 1,
      summary: 'published provenance could not be verified',
      blockers: [error && error.message ? error.message : String(error)],
      warnings: []
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function loadReleaseMetadata ({ fixture, repo, tag }) {
  if (fixture) return JSON.parse(readFileSync(fixture, 'utf8'))
  const result = spawnSync('gh', [
    'release',
    'view',
    tag,
    '--repo',
    repo,
    '--json',
    'tagName,isDraft,isPrerelease,assets'
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 })
  if (result.status !== 0) {
    throw new Error(trimForReport(result.stderr || result.stdout) || `could not load GitHub release ${repo}@${tag}`)
  }
  return JSON.parse(result.stdout)
}

function expectedProvenanceTargets (tag) {
  const version = tag.slice(1)
  return [
    { platform: 'macos', arch: 'arm64' },
    { platform: 'macos', arch: 'x64' },
    { platform: 'windows', arch: 'x64' },
    { platform: 'linux', arch: 'x64' }
  ].map(({ platform, arch }) => {
    const prefix = `PearBrowser-${version}-${platform}-${arch}`
    const artifactNames = platform === 'macos'
      ? [`${prefix}.app.zip`, `${prefix}.dmg`]
      : platform === 'windows'
        ? [`${prefix}.exe`]
        : [`${prefix}.AppImage`]
    return {
      platform,
      arch,
      artifactNames,
      manifestName: `manifest-${platform}-${arch}.json`,
      sumsName: `SHA256SUMS-${platform}-${arch}.txt`
    }
  })
}

function normalizeReleaseAssets (assets) {
  if (!Array.isArray(assets)) return []
  return assets.map((asset) => ({
    name: String(asset?.name || '').trim(),
    size: Number(asset?.size ?? asset?.sizeInBytes ?? asset?.size_bytes ?? 0),
    url: String(asset?.url || asset?.browserDownloadUrl || asset?.browser_download_url || '').trim()
  })).filter((asset) => asset.name)
}

function validateRequiredAssets (assets, requiredNames) {
  const errors = []
  const counts = new Map()
  for (const asset of assets) counts.set(asset.name, (counts.get(asset.name) || 0) + 1)
  for (const name of requiredNames) {
    const count = counts.get(name) || 0
    if (count !== 1) errors.push(`published release must contain exactly one ${name}, found ${count}`)
  }
  return errors
}

async function downloadProvenanceAssets ({ fixture, repo, tag, assets, requiredNames, directory }) {
  if (!fixture) {
    const patterns = requiredNames.flatMap((name) => ['--pattern', name])
    const result = spawnSync('gh', [
      'release',
      'download',
      tag,
      '--repo',
      repo,
      '--dir',
      directory,
      ...patterns
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 })
    if (result.status !== 0) {
      throw new Error(trimForReport(result.stderr || result.stdout) || `could not download provenance assets for ${repo}@${tag}`)
    }
  } else {
    const byName = new Map(assets.map((asset) => [asset.name, asset]))
    for (const name of requiredNames) {
      const asset = byName.get(name)
      if (!asset?.url) throw new Error(`${name} is missing a fixture download URL`)
      await downloadFixtureAsset(asset.url, join(directory, name))
    }
  }

  const byName = new Map(assets.map((asset) => [asset.name, asset]))
  for (const name of requiredNames) {
    const expectedSize = byName.get(name)?.size || 0
    const actualSize = statSync(join(directory, name)).size
    if (expectedSize <= 0 || actualSize !== expectedSize) {
      throw new Error(`${name} byte count must match published metadata (${expectedSize}), got ${actualSize}`)
    }
  }
}

async function downloadFixtureAsset (url, destination) {
  const parsed = new URL(url)
  if (parsed.protocol === 'file:') {
    copyFileSync(fileURLToPath(parsed), destination)
    return
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`unsupported fixture download URL protocol: ${parsed.protocol}`)
  }
  const response = await fetch(parsed, { redirect: 'follow' })
  if (!response.ok) throw new Error(`could not download ${parsed}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > 5 * 1024 * 1024) throw new Error(`provenance asset from ${parsed} exceeds 5 MiB`)
  writeFileSync(destination, bytes)
}

function verifyPublishedProvenance ({ release, assets, targets, directory, tag, sourceRef }) {
  const errors = []
  const releaseTag = release?.tagName || release?.tag_name || ''
  checkEqual(errors, releaseTag, tag, 'published release tag')
  if (release?.isDraft) errors.push('published provenance requires a non-draft release')
  if (release?.isPrerelease) errors.push('published provenance requires a stable non-prerelease release')
  const assetByName = new Map(assets.map((asset) => [asset.name, asset]))

  for (const target of targets) {
    const manifest = readJson(join(directory, target.manifestName), target.manifestName, errors)
    if (!manifest) continue
    checkEqual(errors, manifest.tag, tag, `${target.manifestName}: tag`)
    checkEqual(errors, manifest.version, tag.slice(1), `${target.manifestName}: version`)
    checkEqual(errors, manifest.sourceRef, sourceRef, `${target.manifestName}: sourceRef`)
    checkEqual(errors, manifest.releaseMode, 'public-trust', `${target.manifestName}: releaseMode`)
    checkEqual(errors, manifest.platform, target.platform, `${target.manifestName}: platform`)
    checkEqual(errors, manifest.arch, target.arch, `${target.manifestName}: arch`)
    if (!Array.isArray(manifest.artifacts)) {
      errors.push(`${target.manifestName}: artifacts must be an array`)
      continue
    }

    const items = new Map(manifest.artifacts.map((item) => [String(item?.name || ''), item]))
    if (items.size !== manifest.artifacts.length) errors.push(`${target.manifestName}: duplicate artifact name`)
    checkArray(errors, [...items.keys()].sort(), [...target.artifactNames].sort(), `${target.manifestName}: artifact names`)
    const checksumLines = []
    for (const artifactName of target.artifactNames) {
      const item = items.get(artifactName)
      if (!item) continue
      if (!Number.isInteger(item.bytes) || item.bytes <= 0) errors.push(`${target.manifestName}: invalid byte count for ${artifactName}`)
      if (!/^[a-f0-9]{64}$/.test(String(item.sha256 || ''))) errors.push(`${target.manifestName}: invalid SHA-256 for ${artifactName}`)
      if (typeof item.source !== 'string' || !item.source.startsWith('dist/electron/')) {
        errors.push(`${target.manifestName}: source for ${artifactName} must be under dist/electron`)
      }
      checkEqual(errors, assetByName.get(artifactName)?.size, item.bytes, `${target.manifestName}: published byte count for ${artifactName}`)
      const expectedLine = `${item.sha256}  ${artifactName}`
      checkEqual(errors, readFileSync(join(directory, `${artifactName}.sha256`), 'utf8').trim(), expectedLine, `${artifactName}.sha256`)
      checksumLines.push(expectedLine)
    }
    const sums = readFileSync(join(directory, target.sumsName), 'utf8').trim().split(/\r?\n/).sort()
    checkArray(errors, sums, checksumLines.sort(), target.sumsName)
  }
  return errors
}

function readJson (path, label, errors) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    errors.push(`${label}: could not parse JSON: ${error.message}`)
    return null
  }
}

function checkEqual (errors, actual, expected, label) {
  if (actual !== expected) errors.push(`${label} must be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

function checkArray (errors, actual, expected, label) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    errors.push(`${label} must contain ${expected.join(', ')}, got ${actual.join(', ')}`)
  }
}

function runNodeCheck ({ id, label, script, args }) {
  const result = spawnSync(process.execPath, [join(REPO_ROOT, script), ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024 * 50
  })
  const report = parseChildJson(result.stdout)
  const parseError = report ? '' : 'subcommand did not return a JSON report'
  const command = ['node', script, ...args].join(' ')
  const blockers = [
    ...errorsFromReport(report),
    ...(parseError ? [parseError] : [])
  ]
  const warnings = warningsFromReport(report)
  const ok = result.status === 0 && report?.ok !== false && blockers.length === 0

  if (!ok && blockers.length === 0) {
    blockers.push(trimForReport(result.stderr || result.stdout) || `subcommand exited ${result.status ?? 'without a status'}`)
  }

  return {
    id,
    label,
    ok,
    status: ok ? (warnings.length ? 'warn' : 'pass') : 'block',
    command,
    exitCode: result.status,
    summary: summaryFor(id, report, result),
    blockers,
    warnings
  }
}

function parseChildJson (stdout) {
  const text = String(stdout || '').trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function summaryFor (id, report, result) {
  if (!report) return trimForReport(result.stderr || result.stdout) || 'no JSON output'
  if (id === 'native-signing') {
    return `mode=${report.mode}; pass=${report.counts?.pass ?? 0}; warn=${report.counts?.warn ?? 0}; fail=${report.counts?.fail ?? 0}`
  }
  if (id === 'native-release-assets') {
    return `assets=${report.counts?.assets ?? 0}; warnings=${report.counts?.warnings ?? 0}; errors=${report.counts?.errors ?? 0}`
  }
  if (id === 'native-downloads') {
    const verified = Array.isArray(report.targets) ? report.targets.filter((target) => target.ok).length : 0
    return `verified=${verified}; errors=${Array.isArray(report.errors) ? report.errors.length : 0}`
  }
  if (id === 'linux-appimage-metadata') {
    return `inspections=${Array.isArray(report.inspections) ? report.inspections.length : 0}; errors=${Array.isArray(report.errors) ? report.errors.length : 0}`
  }
  if (id === 'native-install-smoke-plan') {
    return `targets=${Array.isArray(report.targets) ? report.targets.length : 0}; errors=${Array.isArray(report.errors) ? report.errors.length : 0}`
  }
  if (id === 'package-manager-manifests') {
    return `files=${Array.isArray(report.files) ? report.files.length : 0}; warnings=${Array.isArray(report.warnings) ? report.warnings.length : 0}; errors=${Array.isArray(report.errors) ? report.errors.length : 0}`
  }
  if (id === 'release-evidence') {
    return `passed=${report.counts?.passed ?? 0}; deferred=${report.counts?.deferred ?? 0}; incomplete=${report.counts?.incomplete ?? 0}; failures=${report.counts?.failures ?? 0}`
  }
  return report.ok ? 'ok' : 'blocked'
}

function errorsFromReport (report) {
  if (!report || typeof report !== 'object') return []
  const errors = []
  if (Array.isArray(report.errors)) errors.push(...report.errors.map(String))
  if (Array.isArray(report.checks)) {
    for (const check of report.checks.filter((check) => check.status === 'fail')) {
      errors.push(formatCheckMessage(check))
    }
  }
  if (Array.isArray(report.failures)) {
    errors.push(...report.failures.map((item) => formatEvidenceItem('failure', item)))
  }
  if (Array.isArray(report.incomplete)) {
    errors.push(...report.incomplete.map((item) => formatEvidenceItem('incomplete', item)))
  }
  return errors
}

function warningsFromReport (report) {
  if (!report || typeof report !== 'object') return []
  const warnings = []
  if (Array.isArray(report.warnings)) warnings.push(...report.warnings.map(String))
  if (Array.isArray(report.checks)) {
    for (const check of report.checks.filter((check) => check.status === 'warn')) {
      warnings.push(formatCheckMessage(check))
    }
  }
  if (Array.isArray(report.deferred)) {
    warnings.push(...report.deferred.map((item) => formatEvidenceItem('deferred', item)))
  }
  return warnings
}

function formatCheckMessage (check) {
  const parts = [check.id, check.summary].filter(Boolean)
  let message = parts.join(': ')
  if (check.remediation) message += `; ${check.remediation}`
  return message
}

function formatEvidenceItem (kind, item) {
  const location = [item.section, item.item].filter(Boolean).join(' / ')
  const detail = item.reason || item.evidence || ''
  return `${kind}: ${location}${detail ? `: ${detail}` : ''}`
}

function trimForReport (value) {
  const text = String(value || '').trim().replace(/\s+/g, ' ')
  if (text.length <= 400) return text
  return `${text.slice(0, 397)}...`
}

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    fixture: '',
    evidenceFile: '',
    sourceRef: '',
    signingSecretSource: '',
    signingRepo: '',
    signingGithubEnvironment: '',
    signingGithubSecretsFile: '',
    json: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--evidence-file') parsed.evidenceFile = requireValue(argv, ++i, arg)
    else if (arg === '--source-ref') parsed.sourceRef = requireValue(argv, ++i, arg)
    else if (arg === '--signing-secret-source') parsed.signingSecretSource = requireValue(argv, ++i, arg)
    else if (arg === '--signing-repo') parsed.signingRepo = requireValue(argv, ++i, arg)
    else if (arg === '--signing-github-environment') parsed.signingGithubEnvironment = requireValue(argv, ++i, arg)
    else if (arg === '--signing-github-secrets-file') parsed.signingGithubSecretsFile = requireValue(argv, ++i, arg)
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
  console.error('usage: node scripts/check-public-trust-readiness.mjs [--tag v0.9.1] [--repo owner/repo] [--fixture release.json] [--evidence-file docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md] --source-ref <40-hex-commit-sha> [--signing-secret-source env|github] [--signing-repo owner/repo] [--signing-github-environment name] [--signing-github-secrets-file secrets.json] [--json]')
  process.exit(code)
}

function normalizeTag (tag) {
  const normalized = String(tag || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(normalized)) {
    usage(2, `public-trust release tag must be stable vX.Y.Z, got ${tag}`)
  }
  return normalized
}

function normalizeSourceSha (value) {
  const ref = String(value || '').trim()
  if (!/^[a-f0-9]{40}$/i.test(ref)) {
    usage(2, '--source-ref must be the exact immutable 40-character release commit SHA')
  }
  return ref.toLowerCase()
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printHuman (report) {
  console.log(`PearBrowser public-trust readiness (${report.ok ? 'READY' : 'BLOCKED'})`)
  console.log(`repo=${report.repo} tag=${report.tag} sourceRef=${report.sourceRef}`)
  for (const check of report.checks) {
    console.log(`${check.status.toUpperCase().padEnd(5)} ${check.id}: ${check.summary}`)
  }
  if (report.blockers.length) {
    console.log()
    console.log('Blockers')
    for (const blocker of report.blockers) console.log(`- ${blocker.check}: ${blocker.message}`)
  }
  if (report.warnings.length) {
    console.log()
    console.log('Warnings')
    for (const warning of report.warnings) console.log(`- ${warning.check}: ${warning.message}`)
  }
}
