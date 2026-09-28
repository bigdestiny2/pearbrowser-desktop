#!/usr/bin/env node
/**
 * Check the operator-filled release smoke evidence log.
 *
 * The log intentionally starts blank. This command exits non-zero until every
 * required gate is marked PASS or DEFER with evidence, and the final
 * announcement decision is GO or GO desktop only.
 */

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { checkOriginIsolationEvidenceFile } from './check-origin-isolation-smoke-evidence.mjs'

const DEFAULT_LOG = new URL('../docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md', import.meta.url)
const DEFAULT_ORIGIN_EVIDENCE = new URL('../docs/origin-isolation-smoke-evidence-peerit-pearfeed-2026-07-04.json', import.meta.url)
const COOKIE_ISOLATION_GATE = 'Current P2P app cookie isolation'
const PASS_STATUSES = new Set(['PASS', 'DEFER'])
const READY_DECISIONS = new Set(['GO', 'GO DESKTOP ONLY'])
const NEGATIVE_DECISION_RE = /^(NO|FAIL|FAILED|BLOCKED)\b/
const READY_ANSWER_RE = /^(YES|PASS|DEFER)\b|OUT OF SCOPE/

function splitRow (line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null
  return trimmed.slice(1, -1).split('|').map((cell) => cell.trim())
}

function isSeparator (cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
}

function normalize (value) {
  return String(value || '').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeUpper (value) {
  return normalize(value).toUpperCase()
}

export function parseMarkdownTables (markdown) {
  const lines = String(markdown).split(/\r?\n/)
  const tables = []
  let section = ''

  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^##\s+(.+?)\s*$/)
    if (heading) {
      section = heading[1].trim()
      continue
    }

    const header = splitRow(lines[i])
    const separator = splitRow(lines[i + 1] || '')
    if (!header || !separator || !isSeparator(separator)) continue

    const rows = []
    i += 2
    while (i < lines.length) {
      const row = splitRow(lines[i])
      if (!row) break
      rows.push(row)
      i += 1
    }
    i -= 1
    tables.push({ section, header, rows })
  }

  return tables
}

function rowObject (table, row) {
  const out = {}
  for (let i = 0; i < table.header.length; i++) {
    out[normalize(table.header[i]).toLowerCase()] = row[i] || ''
  }
  return out
}

function isGateTable (table) {
  const headers = table.header.map((h) => normalize(h).toLowerCase())
  return headers.includes('gate') && headers.includes('result') && headers.includes('evidence')
}

function isMetadataTable (table) {
  const headers = table.header.map((h) => normalize(h).toLowerCase())
  return table.section === 'Run Metadata' && headers.includes('field') && headers.includes('value')
}

function isDecisionTable (table) {
  const headers = table.header.map((h) => normalize(h).toLowerCase())
  return table.section === 'Announcement Decision' && headers.includes('question') && headers.includes('answer')
}

export function analyzeReleaseEvidence (markdown, { requireCookieIsolation = false, originIsolationReport = null } = {}) {
  const tables = parseMarkdownTables(markdown)
  const incomplete = []
  const failures = []
  const passed = []
  const deferred = []
  const cookieRows = []

  for (const table of tables) {
    if (isMetadataTable(table)) {
      for (const row of table.rows) {
        const obj = rowObject(table, row)
        if (!normalize(obj.value)) {
          incomplete.push({
            section: table.section,
            item: normalize(obj.field),
            reason: 'metadata value is blank'
          })
        }
      }
      continue
    }

    if (isGateTable(table)) {
      for (const row of table.rows) {
        const obj = rowObject(table, row)
        const gate = normalize(obj.gate)
        const result = normalizeUpper(obj.result)
        const evidence = normalize(obj.evidence)
        if (gate === COOKIE_ISOLATION_GATE) cookieRows.push({ section: table.section, result })
        if (!result) {
          incomplete.push({ section: table.section, item: gate, reason: 'result is blank' })
          continue
        }
        if (!PASS_STATUSES.has(result)) {
          failures.push({ section: table.section, item: gate, reason: `result is ${result}` })
          continue
        }
        if (!evidence) {
          incomplete.push({ section: table.section, item: gate, reason: `${result} requires evidence` })
          continue
        }
        if (requireCookieIsolation && gate === COOKIE_ISOLATION_GATE) {
          if (result !== 'PASS') {
            failures.push({ section: table.section, item: gate, reason: 'current P2P app cookie isolation cannot be deferred for desktop release' })
          } else if (originIsolationReport?.ok !== true) {
            const checks = (originIsolationReport?.failures || []).slice(0, 5).map((failure) => failure.id).join(', ')
            failures.push({ section: table.section, item: gate, reason: `trusted origin-isolation evidence did not pass${checks ? `: ${checks}` : ''}` })
          } else {
            passed.push({ section: table.section, item: gate, evidence })
          }
          continue
        }
        if (result === 'DEFER') deferred.push({ section: table.section, item: gate, evidence })
        else passed.push({ section: table.section, item: gate, evidence })
      }
      continue
    }

    if (isDecisionTable(table)) {
      let finalDecision = ''
      let finalDecisionQuestion = ''
      let finalDecisionAnswerMissing = false
      for (const row of table.rows) {
        const obj = rowObject(table, row)
        const question = normalize(obj.question)
        const answer = normalize(obj.answer)
        if (/^Final decision/i.test(question)) {
          finalDecisionQuestion = question || 'Final decision'
          if (!answer) {
            finalDecisionAnswerMissing = true
            continue
          }
          finalDecision = normalizeUpper(answer)
          continue
        }
        if (!answer) {
          incomplete.push({ section: table.section, item: question, reason: 'answer is blank' })
          continue
        }

        const upperAnswer = normalizeUpper(answer)
        if (NEGATIVE_DECISION_RE.test(upperAnswer)) {
          failures.push({ section: table.section, item: question, reason: `answer is ${upperAnswer}` })
        } else if (!READY_ANSWER_RE.test(upperAnswer)) {
          incomplete.push({
            section: table.section,
            item: question,
            reason: 'answer must be yes/pass/defer or explicitly out of scope'
          })
        }
      }

      if (!finalDecision) {
        incomplete.push({
          section: table.section,
          item: finalDecisionQuestion || 'Final decision',
          reason: finalDecisionAnswerMissing ? 'answer is blank; final decision is missing' : 'final decision is missing'
        })
      } else if (finalDecision === 'NO-GO') {
        failures.push({ section: table.section, item: finalDecisionQuestion || 'Final decision', reason: 'decision is NO-GO' })
      } else if (!READY_DECISIONS.has(finalDecision)) {
        incomplete.push({
          section: table.section,
          item: finalDecisionQuestion || 'Final decision',
          reason: 'decision must be GO, GO desktop only, or NO-GO'
        })
      }
    }
  }

  if (requireCookieIsolation && cookieRows.length !== 1) {
    failures.push({ section: 'Desktop GUI And User Stories', item: COOKIE_ISOLATION_GATE, reason: `exactly one cookie-isolation gate row is required, found ${cookieRows.length}` })
  }

  if (!tables.some(isMetadataTable)) {
    failures.push({ section: 'Run Metadata', item: 'table', reason: 'metadata table missing' })
  }
  if (!tables.some(isGateTable)) {
    failures.push({ section: 'Release gates', item: 'tables', reason: 'gate tables missing' })
  }
  if (!tables.some(isDecisionTable)) {
    failures.push({ section: 'Announcement Decision', item: 'table', reason: 'decision table missing' })
  }

  const ok = failures.length === 0 && incomplete.length === 0
  return {
    ok,
    counts: {
      passed: passed.length,
      deferred: deferred.length,
      incomplete: incomplete.length,
      failures: failures.length
    },
    passed,
    deferred,
    incomplete,
    failures
  }
}

function hasCookieIsolationRow (markdown) {
  return parseMarkdownTables(markdown).some((table) => isGateTable(table) && table.rows.some((row) => normalize(rowObject(table, row).gate) === COOKIE_ISOLATION_GATE))
}

function parseArgs (argv) {
  const args = { file: DEFAULT_LOG, originIsolationEvidence: DEFAULT_ORIGIN_EVIDENCE, json: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--file') args.file = new URL(argv[++i], pathToFileURL(process.cwd() + '/'))
    else if (arg === '--origin-isolation-evidence') args.originIsolationEvidence = new URL(argv[++i], pathToFileURL(process.cwd() + '/'))
    else if (arg === '--json') args.json = true
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }
  return args
}

function usage (code, message = '') {
  if (message) console.error('error:', message)
  console.error('usage: node scripts/check-release-evidence.mjs [--file docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md] [--origin-isolation-evidence capture-evidence.json] [--json]')
  process.exit(code)
}

function printReport (result, file) {
  console.log(`Release evidence log: ${file}`)
  console.log(`  passed:     ${result.counts.passed}`)
  console.log(`  deferred:   ${result.counts.deferred}`)
  console.log(`  incomplete: ${result.counts.incomplete}`)
  console.log(`  failures:   ${result.counts.failures}`)

  const printItems = (label, items) => {
    if (!items.length) return
    console.log()
    console.log(label)
    for (const item of items.slice(0, 30)) {
      console.log(`  - [${item.section}] ${item.item}: ${item.reason}`)
    }
    if (items.length > 30) console.log(`  ... ${items.length - 30} more`)
  }

  printItems('Incomplete', result.incomplete)
  printItems('Failures', result.failures)
  console.log()
  console.log(result.ok ? 'Release evidence is complete.' : 'Release evidence is not complete.')
}

async function main () {
  const args = parseArgs(process.argv.slice(2))
  const markdown = readFileSync(args.file, 'utf8')
  let originIsolationReport = null
  if (hasCookieIsolationRow(markdown)) {
    try {
      originIsolationReport = checkOriginIsolationEvidenceFile(args.originIsolationEvidence)
    } catch (error) {
      originIsolationReport = { ok: false, status: 'blocked', failures: [{ id: 'evidence-load', detail: error.message }] }
    }
  }
  const result = analyzeReleaseEvidence(markdown, { requireCookieIsolation: true, originIsolationReport })
  result.originIsolation = {
    evidenceFile: args.originIsolationEvidence.pathname,
    status: originIsolationReport?.status || 'missing-row',
    failures: originIsolationReport?.failures || []
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else printReport(result, args.file.pathname)
  process.exit(result.ok ? 0 : 1)
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err.stack || err.message)
    process.exit(1)
  })
}
