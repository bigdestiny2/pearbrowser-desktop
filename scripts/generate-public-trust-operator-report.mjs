#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DEFAULT_REPO = 'bigdestiny2/pearbrowser-desktop'

const args = parseArgs(process.argv.slice(2))
const tag = normalizeTag(args.tag || `v${pkg.version}`)
const repo = args.repo || process.env.GH_REPO || DEFAULT_REPO
const sourceRef = normalizeSourceRef(args.sourceRef || 'main')
const format = normalizeFormat(args.format || 'markdown')
const readiness = loadReadiness(args, { tag, repo, sourceRef })
const report = buildReport(readiness, { tag, repo, sourceRef })

if (format === 'json') printJson(report)
else printMarkdown(report)

process.exit(report.ok ? 0 : 1)

function loadReadiness (args, defaults) {
  if (args.readinessFile) {
    return parseJson(readFileSync(args.readinessFile, 'utf8'), args.readinessFile)
  }

  const readinessArgs = [
    '--tag',
    defaults.tag,
    '--repo',
    defaults.repo,
    '--source-ref',
    defaults.sourceRef,
    '--json',
    ...(args.fixture ? ['--fixture', args.fixture] : []),
    ...(args.evidenceFile ? ['--evidence-file', args.evidenceFile] : []),
    ...(args.signingSecretSource ? ['--signing-secret-source', args.signingSecretSource] : []),
    ...(args.signingRepo ? ['--signing-repo', args.signingRepo] : []),
    ...(args.signingGithubSecretsFile ? ['--signing-github-secrets-file', args.signingGithubSecretsFile] : [])
  ]
  const result = spawnSync(process.execPath, [
    join(REPO_ROOT, 'scripts/check-public-trust-readiness.mjs'),
    ...readinessArgs
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024 * 50
  })
  if (!String(result.stdout || '').trim()) {
    return {
      ok: false,
      repo: defaults.repo,
      tag: defaults.tag,
      sourceRef: defaults.sourceRef,
      checks: [],
      blockers: [{ check: 'readiness', message: trimForReport(result.stderr) || 'readiness command failed without JSON output' }],
      warnings: [],
      readinessExitCode: result.status,
      readinessCommand: ['node', 'scripts/check-public-trust-readiness.mjs', ...readinessArgs].join(' ')
    }
  }
  const readiness = parseJson(result.stdout, 'check-public-trust-readiness stdout')
  readiness.readinessExitCode = result.status
  readiness.readinessCommand = ['node', 'scripts/check-public-trust-readiness.mjs', ...readinessArgs].join(' ')
  return readiness
}

function parseJson (text, source) {
  if (!String(text || '').trim()) throw new Error(`${source} is empty`)
  try {
    return JSON.parse(String(text))
  } catch (err) {
    throw new Error(`could not parse ${source} as JSON: ${err.message}`)
  }
}

function buildReport (readiness, defaults) {
  const normalized = readiness && typeof readiness === 'object' ? readiness : {}
  const repo = normalized.repo || defaults.repo
  const tag = normalized.tag || defaults.tag
  const sourceRef = normalized.sourceRef || defaults.sourceRef
  const checks = Array.isArray(normalized.checks) ? normalized.checks.map(normalizeCheck) : []
  const blockers = Array.isArray(normalized.blockers)
    ? normalized.blockers.map(normalizeBlocker)
    : checks.flatMap((check) => check.blockers.map((message) => ({ check: check.id, message })))
  const warnings = Array.isArray(normalized.warnings)
    ? normalized.warnings.map(normalizeBlocker)
    : checks.flatMap((check) => check.warnings.map((message) => ({ check: check.id, message })))
  const blockerGroups = groupBlockers(blockers)
  const nextCommands = nextCommandsFor({ repo, tag, sourceRef })

  return {
    ok: blockers.length === 0 && normalized.ok !== false,
    repo,
    tag,
    sourceRef,
    mode: normalized.mode || 'public-trust',
    checks,
    blockerGroups,
    warnings,
    nextCommands,
    readinessExitCode: normalized.readinessExitCode ?? null,
    readinessCommand: normalized.readinessCommand || ''
  }
}

function normalizeCheck (check) {
  return {
    id: String(check?.id || 'unknown'),
    label: String(check?.label || checkLabel(check?.id || 'unknown')),
    status: String(check?.status || (check?.ok ? 'pass' : 'block')),
    ok: Boolean(check?.ok),
    summary: String(check?.summary || ''),
    command: String(check?.command || ''),
    blockers: Array.isArray(check?.blockers) ? check.blockers.map(String) : [],
    warnings: Array.isArray(check?.warnings) ? check.warnings.map(String) : []
  }
}

function normalizeBlocker (blocker) {
  if (typeof blocker === 'string') return { check: 'unknown', message: blocker }
  return {
    check: String(blocker?.check || 'unknown'),
    message: String(blocker?.message || blocker?.reason || '')
  }
}

function groupBlockers (blockers) {
  const groups = new Map()
  for (const blocker of blockers) {
    const id = blocker.check || 'unknown'
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        label: checkLabel(id),
        blockers: []
      })
    }
    groups.get(id).blockers.push(blocker.message)
  }
  return [...groups.values()]
}

function nextCommandsFor ({ repo, tag, sourceRef }) {
  return [
    {
      id: 'credential-handoff',
      label: 'Generate signing secret handoff',
      command: `npm run -s generate:native-signing-secret-plan -- --repo ${shellQuote(repo)} --tag ${shellQuote(tag)} --source-ref ${shellQuote(sourceRef)}`
    },
    {
      id: 'verify-secret-names',
      label: 'Verify GitHub Actions secret names',
      command: `npm run check:native-signing -- --require-public-trust --secret-source github --repo ${shellQuote(repo)}`
    },
    {
      id: 'dispatch-public-trust-workflow',
      label: 'Run Desktop Native Release in public-trust mode',
      command: `gh workflow run desktop-native-release.yml --repo ${shellQuote(repo)} --ref main -f tag=${shellQuote(tag)} -f source_ref=${shellQuote(sourceRef)} -f release_mode=public-trust`
    },
    {
      id: 'rerun-readiness',
      label: 'Rerun the public-trust readiness gate',
      command: `npm run check:public-trust-readiness -- --tag ${shellQuote(tag)} --repo ${shellQuote(repo)} --source-ref ${shellQuote(sourceRef)} --signing-secret-source github`
    },
    {
      id: 'regenerate-install-guide',
      label: 'Regenerate public-trust install guidance after assets pass',
      command: `npm run -s generate:native-install-guide -- --tag ${shellQuote(tag)} --repo ${shellQuote(repo)} --trust-mode public-trust`
    },
    {
      id: 'generate-clean-install-smoke-plan',
      label: 'Generate clean-machine install smoke plan',
      command: `npm run -s generate:native-install-smoke-plan -- --tag ${shellQuote(tag)} --repo ${shellQuote(repo)} --trust-mode public-trust --source-ref ${shellQuote(sourceRef)}`
    },
    {
      id: 'generate-package-manager-drafts',
      label: 'Generate package-manager drafts from public-trust assets',
      command: `npm run generate:package-manager-manifests -- --tag ${shellQuote(tag)} --repo ${shellQuote(repo)}`
    },
    {
      id: 'verify-evidence-log',
      label: 'Verify the operator evidence log',
      command: 'npm run check:release-evidence'
    }
  ]
}

function printJson (report) {
  console.log(JSON.stringify(report, null, 2))
}

function printMarkdown (report) {
  console.log('# Public-Trust Release Operator Report')
  console.log('')
  console.log(`Repository: \`${report.repo}\``)
  console.log(`Release tag: \`${report.tag}\``)
  console.log(`Source ref: \`${report.sourceRef}\``)
  console.log(`Status: \`${report.ok ? 'READY' : 'BLOCKED'}\``)
  console.log('')

  console.log('## Gate Summary')
  console.log('')
  if (!report.checks.length) {
    console.log('No readiness checks were reported.')
  } else {
    console.log('| Gate | Status | Summary |')
    console.log('| --- | --- | --- |')
    for (const check of report.checks) {
      console.log(`| ${escapeTableCell(check.label)} | ${escapeTableCell(check.status.toUpperCase())} | ${escapeTableCell(check.summary || '-')} |`)
    }
  }
  console.log('')

  console.log('## Blocking Work')
  console.log('')
  if (!report.blockerGroups.length) {
    console.log('No blockers remain. Treat this as ready only after the release evidence log and final decision are current.')
  } else {
    for (const group of report.blockerGroups) {
      console.log(`### ${group.label}`)
      console.log('')
      for (const blocker of group.blockers) console.log(`- [ ] ${blocker}`)
      console.log('')
    }
  }

  if (report.warnings.length) {
    console.log('## Warnings And Deferrals')
    console.log('')
    for (const warning of report.warnings) console.log(`- ${checkLabel(warning.check)}: ${warning.message}`)
    console.log('')
  }

  console.log('## Next Commands')
  console.log('')
  for (const item of report.nextCommands) {
    console.log(`### ${item.label}`)
    console.log('')
    console.log('```sh')
    console.log(item.command)
    console.log('```')
    console.log('')
  }
}

function checkLabel (id) {
  const labels = {
    'native-signing': 'Signing Credentials',
    'native-release-assets': 'Public-Trust Release Assets',
    'native-downloads': 'Native Package Downloads',
    'linux-appimage-metadata': 'Linux AppImage Metadata',
    'native-install-smoke-plan': 'Clean-Machine Install Smoke',
    'package-manager-manifests': 'Package-Manager Drafts',
    'release-evidence': 'Operator Evidence',
    readiness: 'Readiness Command',
    unknown: 'Other'
  }
  return labels[id] || id
}

function escapeTableCell (value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function trimForReport (value) {
  const text = String(value || '').trim().replace(/\s+/g, ' ')
  if (text.length <= 400) return text
  return `${text.slice(0, 397)}...`
}

function shellQuote (value) {
  const text = String(value || '')
  if (/^[A-Za-z0-9_./:@+-]+$/.test(text)) return text
  return `'${text.replace(/'/g, "'\\''")}'`
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

function normalizeFormat (value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'markdown' || normalized === 'md') return 'markdown'
  if (normalized === 'json') return 'json'
  usage(2, `unknown format: ${value}`)
}

function parseArgs (argv) {
  const parsed = {
    tag: '',
    repo: '',
    sourceRef: '',
    readinessFile: '',
    fixture: '',
    evidenceFile: '',
    signingSecretSource: '',
    signingRepo: '',
    signingGithubSecretsFile: '',
    format: ''
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--tag') parsed.tag = requireValue(argv, ++i, arg)
    else if (arg === '--repo') parsed.repo = requireValue(argv, ++i, arg)
    else if (arg === '--source-ref') parsed.sourceRef = requireValue(argv, ++i, arg)
    else if (arg === '--readiness-file') parsed.readinessFile = requireValue(argv, ++i, arg)
    else if (arg === '--fixture') parsed.fixture = requireValue(argv, ++i, arg)
    else if (arg === '--evidence-file') parsed.evidenceFile = requireValue(argv, ++i, arg)
    else if (arg === '--signing-secret-source') parsed.signingSecretSource = requireValue(argv, ++i, arg)
    else if (arg === '--signing-repo') parsed.signingRepo = requireValue(argv, ++i, arg)
    else if (arg === '--signing-github-secrets-file') parsed.signingGithubSecretsFile = requireValue(argv, ++i, arg)
    else if (arg === '--format') parsed.format = requireValue(argv, ++i, arg)
    else if (arg === '--json') parsed.format = 'json'
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
  console.error('usage: node scripts/generate-public-trust-operator-report.mjs [--tag v0.5.0] [--repo owner/repo] [--source-ref main] [--readiness-file readiness.json] [--fixture release.json] [--evidence-file docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md] [--signing-secret-source env|github] [--signing-repo owner/repo] [--signing-github-secrets-file secrets.json] [--format markdown|json] [--json]')
  process.exit(code)
}
