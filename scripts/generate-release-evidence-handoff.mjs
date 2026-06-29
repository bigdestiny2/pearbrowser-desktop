#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import {
  analyzeReleaseEvidence,
  parseMarkdownTables
} from './check-release-evidence.mjs'

const DEFAULT_LOG = new URL('../docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md', import.meta.url)
const PASS_STATUSES = new Set(['PASS', 'DEFER'])
const NEGATIVE_DECISION_RE = /^(NO|FAIL|FAILED|BLOCKED)\b/
const READY_ANSWER_RE = /^(YES|PASS|DEFER)\b|OUT OF SCOPE/

export function buildEvidenceHandoff (markdown, options = {}) {
  const file = options.file || DEFAULT_LOG.pathname
  const analysis = analyzeReleaseEvidence(markdown)
  const rows = indexEvidenceRows(markdown)
  const blockers = mergeDuplicateBlockers([
    ...analysis.incomplete.map((item) => ({ ...item, status: 'incomplete' })),
    ...analysis.failures.map((item) => ({ ...item, status: 'failure' }))
  ])
  const groupsBySection = new Map()

  for (const blocker of blockers) {
    const row = findIndexedRow(rows, blocker)
    const item = {
      section: blocker.section,
      item: blocker.item,
      status: blocker.status,
      reason: blocker.reason,
      kind: row?.kind || kindForSection(blocker.section),
      expected: row?.expected || '',
      result: row?.result || '',
      evidence: row?.evidence || '',
      answer: row?.answer || '',
      template: row ? templateForRow(row, blocker) : ''
    }
    if (!groupsBySection.has(item.section)) {
      groupsBySection.set(item.section, { section: item.section, items: [] })
    }
    groupsBySection.get(item.section).items.push(item)
  }

  return {
    ok: analysis.ok,
    file,
    counts: analysis.counts,
    groups: [...groupsBySection.values()],
    passed: analysis.passed,
    deferred: analysis.deferred
  }
}

export function formatEvidenceHandoffMarkdown (handoff) {
  const out = []
  out.push('# Release Evidence Handoff')
  out.push('')
  out.push(`Evidence log: \`${handoff.file}\``)
  out.push(`Status: \`${handoff.ok ? 'READY' : 'BLOCKED'}\``)
  out.push('')
  out.push('## Summary')
  out.push('')
  out.push('| Result | Count |')
  out.push('| --- | --- |')
  out.push(`| Passed | ${handoff.counts.passed} |`)
  out.push(`| Deferred | ${handoff.counts.deferred} |`)
  out.push(`| Incomplete | ${handoff.counts.incomplete} |`)
  out.push(`| Failures | ${handoff.counts.failures} |`)
  out.push('')

  out.push('## Blocking Rows')
  out.push('')
  if (!handoff.groups.length) {
    out.push('No blocking evidence rows remain. Re-run the release evidence gate before announcement.')
    out.push('')
  } else {
    for (const group of handoff.groups) {
      out.push(`### ${group.section}`)
      out.push('')
      for (const item of group.items) {
        out.push(`- [ ] ${item.item}`)
        out.push(`  - Blocker: ${item.reason}`)
        if (item.expected) out.push(`  - Expected: ${item.expected}`)
        if (item.result || item.evidence || item.answer) {
          out.push(`  - Current: ${currentStateFor(item)}`)
        }
        if (item.template) {
          out.push('  - Fill:')
          out.push('')
          out.push('```md')
          out.push(item.template)
          out.push('```')
          out.push('')
        }
      }
    }
  }

  out.push('## Evidence Rules')
  out.push('')
  out.push('- Use `PASS` only when the operator has the evidence in hand.')
  out.push('- Use `DEFER` only with an explicit scope decision and evidence note.')
  out.push('- Evidence can be a screenshot/log path, terminal excerpt, CI URL, release asset URL, or store validation URL.')
  out.push('- Re-run `npm run check:release-evidence` after updating the log.')
  out.push('')

  return out.join('\n')
}

function indexEvidenceRows (markdown) {
  const tables = parseMarkdownTables(markdown)
  const rows = []

  for (const table of tables) {
    const headers = table.header.map((h) => normalize(h).toLowerCase())
    if (table.section === 'Run Metadata' && headers.includes('field') && headers.includes('value')) {
      for (const row of table.rows) {
        const obj = rowObject(table, row)
        rows.push({
          kind: 'metadata',
          section: table.section,
          item: normalize(obj.field),
          value: normalize(obj.value)
        })
      }
      continue
    }

    if (headers.includes('gate') && headers.includes('result') && headers.includes('evidence')) {
      for (const row of table.rows) {
        const obj = rowObject(table, row)
        rows.push({
          kind: 'gate',
          section: table.section,
          item: normalize(obj.gate),
          expected: normalize(obj.expected),
          result: normalizeUpper(obj.result),
          evidence: normalize(obj.evidence)
        })
      }
      continue
    }

    if (table.section === 'Announcement Decision' && headers.includes('question') && headers.includes('answer')) {
      for (const row of table.rows) {
        const obj = rowObject(table, row)
        const question = normalize(obj.question)
        rows.push({
          kind: 'decision',
          section: table.section,
          item: question,
          answer: normalize(obj.answer)
        })
        if (/^Final decision/i.test(question)) {
          rows.push({
            kind: 'decision',
            section: table.section,
            item: 'Final decision',
            answer: normalize(obj.answer),
            originalQuestion: question
          })
        }
      }
    }
  }

  return rows
}

function rowObject (table, row) {
  const out = {}
  for (let i = 0; i < table.header.length; i++) {
    out[normalize(table.header[i]).toLowerCase()] = row[i] || ''
  }
  return out
}

function findIndexedRow (rows, blocker) {
  return rows.find((row) => row.section === blocker.section && row.item === blocker.item) ||
    (blocker.item === 'Final decision'
      ? rows.find((row) => row.section === blocker.section && row.kind === 'decision' && /^Final decision/i.test(row.item))
      : null)
}

function mergeDuplicateBlockers (blockers) {
  const merged = new Map()
  for (const blocker of blockers) {
    const key = `${blocker.section}\0${canonicalBlockerItem(blocker.item)}`
    if (!merged.has(key)) {
      merged.set(key, { ...blocker })
      continue
    }
    const existing = merged.get(key)
    existing.reason = mergeReasons(existing.reason, blocker.reason)
    if (existing.status !== 'failure' && blocker.status === 'failure') existing.status = 'failure'
  }
  return [...merged.values()]
}

function canonicalBlockerItem (item) {
  return /^Final decision/i.test(String(item || '')) ? 'Final decision' : item
}

function mergeReasons (...reasons) {
  return [...new Set(reasons.flatMap((reason) => String(reason || '').split(/\s*;\s*/)).filter(Boolean))].join('; ')
}

function templateForRow (row, blocker) {
  if (row.kind === 'metadata') {
    return `| ${row.item} | <record value> |`
  }
  if (row.kind === 'decision') {
    return `| ${row.originalQuestion || row.item} | ${decisionTemplateValue(row, blocker)} |`
  }
  if (row.kind === 'gate') {
    const status = PASS_STATUSES.has(row.result) ? row.result : '<PASS|DEFER>'
    const evidence = row.evidence || '<evidence path, URL, or terminal excerpt>'
    return `| ${row.item} | ${row.expected || '<expected result>'} | ${status} | ${evidence} |`
  }
  return ''
}

function decisionTemplateValue (row, blocker) {
  const question = row.originalQuestion || row.item
  if (/^Final decision/i.test(question) || blocker.item === 'Final decision') return 'GO desktop only'
  if (blocker.status === 'failure' || NEGATIVE_DECISION_RE.test(normalizeUpper(row.answer))) return 'yes'
  if (row.answer && READY_ANSWER_RE.test(normalizeUpper(row.answer))) return row.answer
  return '<yes|defer: documented scope|out of scope: documented scope>'
}

function currentStateFor (item) {
  if (item.kind === 'decision') return `answer=${item.answer || '<blank>'}`
  if (item.kind === 'metadata') return 'value=<blank>'
  return `result=${item.result || '<blank>'}; evidence=${item.evidence || '<blank>'}`
}

function kindForSection (section) {
  if (section === 'Run Metadata') return 'metadata'
  if (section === 'Announcement Decision') return 'decision'
  return 'gate'
}

function normalize (value) {
  return String(value || '').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeUpper (value) {
  return normalize(value).toUpperCase()
}

function normalizeFormat (value) {
  const format = String(value || '').toLowerCase()
  if (format === 'markdown' || format === 'json') return format
  usage(2, `unsupported format: ${value}`)
}

function parseArgs (argv) {
  const parsed = {
    file: DEFAULT_LOG,
    format: 'markdown'
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--file') parsed.file = new URL(requireValue(argv, ++i, arg), pathToFileURL(process.cwd() + '/'))
    else if (arg === '--format') parsed.format = normalizeFormat(requireValue(argv, ++i, arg))
    else if (arg === '--json') parsed.format = 'json'
    else if (arg === '-h' || arg === '--help') usage(0)
    else usage(2, `unknown option: ${arg}`)
  }
  return parsed
}

function requireValue (argv, index, flag) {
  const value = argv[index] || ''
  if (!value || value.startsWith('--')) usage(2, `${flag} requires a value`)
  return value
}

function usage (code, message = '') {
  if (message) console.error('error:', message)
  console.error('usage: node scripts/generate-release-evidence-handoff.mjs [--file docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md] [--format markdown|json] [--json]')
  process.exit(code)
}

function main () {
  const args = parseArgs(process.argv.slice(2))
  const markdown = readFileSync(args.file, 'utf8')
  const handoff = buildEvidenceHandoff(markdown, { file: args.file.pathname })
  if (args.format === 'json') console.log(JSON.stringify(handoff, null, 2))
  else console.log(formatEvidenceHandoffMarkdown(handoff))
  process.exit(handoff.ok ? 0 : 1)
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    main()
  } catch (err) {
    console.error(err.stack || err.message)
    process.exit(1)
  }
}
