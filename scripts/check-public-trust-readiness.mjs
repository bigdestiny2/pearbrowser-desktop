#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const DEFAULT_REPO = 'bigdestiny2/pearbrowser-desktop'
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const repo = args.repo || process.env.GH_REPO || DEFAULT_REPO
const sourceRef = normalizeSourceRef(args.sourceRef || 'main')

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
  ...(args.signingGithubSecretsFile ? ['--github-secrets-file', args.signingGithubSecretsFile] : [])
]

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
    args: [...sharedReleaseArgs, '--require-published', '--require-public-trust', '--require-backfill-formats', '--json']
  }),
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
  console.error('usage: node scripts/check-public-trust-readiness.mjs [--tag v0.5.0] [--repo owner/repo] [--fixture release.json] [--evidence-file docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md] [--source-ref main] [--signing-secret-source env|github] [--signing-repo owner/repo] [--signing-github-secrets-file secrets.json] [--json]')
  process.exit(code)
}

function normalizeTag (tag) {
  const normalized = String(tag || '').replace(/^refs\/tags\//, '')
  if (!/^v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) {
    usage(2, `release tag must look like vX.Y.Z, got ${tag}`)
  }
  return normalized
}

function normalizeSourceRef (value) {
  const ref = String(value || '').trim()
  if (!ref) usage(2, '--source-ref cannot be empty')
  if (!/^[A-Za-z0-9._/@+-]+$/.test(ref)) {
    usage(2, `--source-ref contains unsupported characters: ${value}`)
  }
  return ref
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
