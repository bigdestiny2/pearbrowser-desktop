#!/usr/bin/env node
/**
 * Run the desktop release evidence gates that can be automated safely.
 *
 * The script can patch the release evidence markdown with PASS/FAIL rows, and
 * can also run in GitHub Actions after install/test/audit to emit the Desktop
 * CI evidence row without querying GitHub APIs.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

import {
  RELEASE_EVIDENCE_LOG,
  APP_FULL_TARGETS,
  BUNDLE_CONTRACT_TARGETS,
  appFullCommand,
  browserStateSyncSmokeCommand,
  bundleContractCommand
} from './lib/release-evidence-targets.mjs'

const DEFAULT_LOG = new URL('../' + RELEASE_EVIDENCE_LOG, import.meta.url)

export function desktopReleaseEvidenceGates ({ includeCi = true } = {}) {
  const gates = []
  if (includeCi) gates.push({ gate: 'Desktop CI', kind: 'ci' })

  gates.push({
    gate: 'node scripts/browser-state-sync-smoke.js',
    kind: 'command',
    command: browserStateSyncSmokeCommand(),
    timeoutMs: 45_000,
    summarize: summarizeBrowserStateSyncEvidence
  })

  gates.push({
    gate: 'node scripts/check-relays.js',
    kind: 'command',
    command: ['node', 'scripts/check-relays.js', '--require-relay', '--json'],
    timeoutMs: 45_000,
    summarize: summarizeRelayEvidence
  })

  for (const target of ['homepage', 'peercord', 'keet']) {
    const preset = APP_FULL_TARGETS[target]
    gates.push({
      gate: `node scripts/verify-app-full.js ${target === 'homepage' ? 'homepage' : preset.name[0].toUpperCase() + preset.name.slice(1)}`,
      kind: 'command',
      command: appFullCommand(target),
      timeoutMs: (preset.timeout + 45) * 1000,
      summarize: summarizeAppFullEvidence
    })
  }

  for (const target of ['peercord-linux', 'peercord-windows']) {
    const label = target === 'peercord-linux'
      ? 'Peercord Linux bundle contract'
      : 'Peercord Windows bundle contract'
    const preset = BUNDLE_CONTRACT_TARGETS[target]
    gates.push({
      gate: label,
      kind: 'command',
      command: bundleContractCommand(target),
      timeoutMs: (preset.timeout + 45) * 1000,
      summarize: summarizeBundleContractEvidence
    })
  }

  return gates
}

function parseArgs (argv) {
  const args = {
    file: DEFAULT_LOG,
    write: false,
    json: false,
    ciOnly: false,
    liveOnly: false,
    ciUrl: '',
    ciSha: '',
    ciEvidence: ''
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--file') args.file = new URL(argv[++i], pathToFileURL(process.cwd() + '/'))
    else if (arg === '--write') args.write = true
    else if (arg === '--json') args.json = true
    else if (arg === '--ci-only') args.ciOnly = true
    else if (arg === '--live-only') args.liveOnly = true
    else if (arg === '--ci-url') args.ciUrl = argv[++i] || ''
    else if (arg === '--ci-sha') args.ciSha = argv[++i] || ''
    else if (arg === '--ci-evidence') args.ciEvidence = argv[++i] || ''
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }

  if (args.ciOnly && args.liveOnly) usage(2, '--ci-only and --live-only cannot be combined')
  return args
}

function usage (code, message = '') {
  if (message) console.error('error:', message)
  console.error('usage: node scripts/collect-desktop-release-evidence.mjs [--write] [--file docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md]')
  console.error('       node scripts/collect-desktop-release-evidence.mjs --ci-only --json')
  console.error('       node scripts/collect-desktop-release-evidence.mjs --write --ci-url <github-actions-run-url>')
  process.exit(code)
}

function today () {
  return new Date().toISOString().slice(0, 10)
}

function truncate (value, max = 300) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max - 1) + '...' : text
}

function sanitizeCell (value) {
  return truncate(value, 900).replace(/\|/g, '/')
}

export function parseResultLine (output) {
  const lines = String(output || '').split(/\r?\n/).reverse()
  const line = lines.find((line) => line.startsWith('RESULT: '))
  if (!line) return null
  return JSON.parse(line.slice('RESULT: '.length))
}

export function ciEvidenceFromEnv (env = process.env, opts = {}) {
  if (opts.ciEvidence) {
    return {
      gate: 'Desktop CI',
      result: 'PASS',
      evidence: opts.ciEvidence
    }
  }

  const runUrl = opts.ciUrl || (
    env.GITHUB_ACTIONS === 'true' &&
    env.GITHUB_SERVER_URL &&
    env.GITHUB_REPOSITORY &&
    env.GITHUB_RUN_ID
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
      : ''
  )
  if (!runUrl) return null

  const sha = opts.ciSha || env.GITHUB_SHA || ''
  const workflow = env.GITHUB_WORKFLOW || 'Desktop CI'
  const job = env.GITHUB_JOB ? `/${env.GITHUB_JOB}` : ''
  const ref = env.GITHUB_REF_NAME ? ` on ${env.GITHUB_REF_NAME}` : ''
  const shortSha = sha ? ` ${sha.slice(0, 12)}` : ''
  return {
    gate: 'Desktop CI',
    result: 'PASS',
    evidence: `${today()} GitHub Actions ${workflow}${job}${ref}${shortSha}: npm ci, npm test, and npm audit --audit-level=high completed before evidence step; ${runUrl}`
  }
}

function summarizeRelayEvidence (result) {
  return `${today()} automation: ${result.uniqueRelays} unique relays reachable via DHT, ${result.liveConnections} live client connections, timeout ${result.timeoutSeconds}s`
}

function summarizeAppFullEvidence (result) {
  return `${today()} ${result.name} fresh-peer run: peers ${result.peers}, entries ${result.entries}, sampled ${result.blobsPresent}/${result.sampled}, missing ${result.blobsMissing}, bytes ${result.bytes}`
}

function summarizeBundleContractEvidence (result) {
  const pearType = result.pearJson && result.pearJson.type ? result.pearJson.type : '(missing)'
  const main = result.pearJson && result.pearJson.main ? result.pearJson.main : '(missing)'
  const files = Array.isArray(result.filesChecked) ? result.filesChecked.join(', ') : ''
  return `${today()} ${result.name}: pear.json type ${pearType}, main ${main}, files checked ${files || '(none)'}, peers ${result.peers}, metadata length ${result.metaLength}`
}

function summarizeBrowserStateSyncEvidence (result) {
  const devices = Number.isFinite(Number(result.devices)) ? Number(result.devices) : 3
  const bookmarks = Number.isFinite(Number(result.bookmarks)) ? Number(result.bookmarks) : 0
  const retention = result.retentionAuditOk
    ? `retention compacted (${Number.isFinite(Number(result.compactedOps)) ? Number(result.compactedOps) : 0} ops checkpointed, ${Number.isFinite(Number(result.retainedOps)) ? Number(result.retainedOps) : 0} retained)`
    : 'retention unchecked'
  return `${today()} encrypted sync smoke: ${devices} devices, ${bookmarks} converged bookmarks, keyless reader ${result.keylessReaderBlocked ? 'blocked' : 'unchecked'}, restart ${result.restartDeterministic ? 'deterministic' : 'unchecked'}, storage bounds ${result.storageAuditOk ? 'within limits' : 'unchecked'}, ${retention}`
}

function splitRow (line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim())
}

function normalizeGate (value) {
  return String(value || '').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function updateMarkdownGateRows (markdown, updates) {
  const updateByGate = new Map(updates.map((update) => [normalizeGate(update.gate), update]))
  let changed = 0
  const lines = String(markdown).split(/\r?\n/).map((line) => {
    const cells = splitRow(line)
    if (!cells || cells.length < 4 || normalizeGate(cells[0]) === 'gate') return line
    const update = updateByGate.get(normalizeGate(cells[0]))
    if (!update) return line

    cells[2] = update.result
    cells[3] = sanitizeCell(update.evidence)
    changed += 1
    return '| ' + cells.join(' | ') + ' |'
  })

  return { markdown: lines.join('\n'), changed }
}

async function runCommand (command, timeoutMs) {
  return await new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, timeoutMs)

    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, stdout, stderr, timedOut })
    })
  })
}

function failureEvidence (record, run, parsed) {
  const parsedError = parsed && (parsed.error || (Array.isArray(parsed.errors) && parsed.errors.join('; ')))
  const output = parsedError || run.stderr || run.stdout
  const exit = run.timedOut ? 'timed out' : `exit ${run.code}${run.signal ? ` signal ${run.signal}` : ''}`
  return `${today()} automation failed (${exit}) for ${record.command.join(' ')}${output ? ': ' + truncate(output) : ''}`
}

async function runEvidenceGate (gate) {
  const run = await runCommand(gate.command, gate.timeoutMs)
  const parsed = parseResultLine(run.stdout + '\n' + run.stderr)
  const ok = run.code === 0 && !run.timedOut && (!parsed || parsed.ok !== false)
  return {
    gate: gate.gate,
    command: gate.command,
    result: ok ? 'PASS' : 'FAIL',
    evidence: ok ? gate.summarize(parsed || {}) : failureEvidence(gate, run, parsed),
    parsed,
    exitCode: run.code,
    timedOut: run.timedOut
  }
}

function writeGithubSummary (records, env = process.env) {
  if (!env.GITHUB_STEP_SUMMARY) return
  const lines = ['### Desktop Release Evidence', '']
  for (const record of records) {
    lines.push(`- ${record.gate}: ${record.result} - ${record.evidence}`)
  }
  lines.push('')
  appendFileSync(env.GITHUB_STEP_SUMMARY, lines.join('\n'))
}

function printRecords (records) {
  for (const record of records) {
    console.log(`${record.result.padEnd(4)} ${record.gate}`)
    console.log(`     ${record.evidence}`)
  }
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  const records = []

  if (!args.liveOnly) {
    const ciRecord = ciEvidenceFromEnv(process.env, args)
    if (ciRecord) records.push(ciRecord)
    else if (args.ciOnly) usage(2, 'CI evidence requires GitHub Actions env, --ci-url, or --ci-evidence')
  }

  if (!args.ciOnly) {
    const gates = desktopReleaseEvidenceGates({ includeCi: false })
    for (const gate of gates) {
      records.push(await runEvidenceGate(gate))
    }
  }

  if (args.write) {
    const original = readFileSync(args.file, 'utf8')
    const updated = updateMarkdownGateRows(original, records)
    writeFileSync(args.file, updated.markdown)
    records.push({
      gate: 'release evidence log',
      result: 'INFO',
      evidence: `updated ${updated.changed} row(s) in ${args.file.pathname}`
    })
  }

  writeGithubSummary(records)

  if (args.json) console.log(JSON.stringify({ ok: records.every((record) => record.result !== 'FAIL'), records }, null, 2))
  else printRecords(records)

  process.exit(records.some((record) => record.result === 'FAIL') ? 1 : 0)
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err.stack || err.message)
    process.exit(1)
  })
}
