import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  analyzeReleaseEvidence,
  parseMarkdownTables
} from '../scripts/check-release-evidence.mjs'
import {
  buildEvidenceHandoff,
  formatEvidenceHandoffMarkdown
} from '../scripts/generate-release-evidence-handoff.mjs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const completeLog = `
# Release Smoke Evidence Log

## Run Metadata

| Field | Value |
| --- | --- |
| Operator | Alice |
| Desktop repo/branch/head | feat@abc123 |

## Desktop Automated Baseline

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| npm test | green | PASS | log: test-output.txt |
| Mobile store validation | out of scope for desktop-only announcement | DEFER | scope decision: desktop only |

## Announcement Decision

| Question | Answer |
| --- | --- |
| Are all required desktop automated gates PASS? | yes |
| Final decision (GO, NO-GO, or GO desktop only) | GO desktop only |
`

const incompleteLog = `
# Release Smoke Evidence Log

## Run Metadata

| Field | Value |
| --- | --- |
| Operator |  |

## Desktop Automated Baseline

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| npm test | green |  |  |
| CI | green | PASS |  |

## Announcement Decision

| Question | Answer |
| --- | --- |
| Final decision (GO, NO-GO, or GO desktop only) | NO-GO |
`

const guiBlockerLog = `
# Release Smoke Evidence Log

## Run Metadata

| Field | Value |
| --- | --- |
| Operator | Alice |

## Desktop GUI And User Stories

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Browse story | homepage renders, reloads, site info correct |  |  |
| Catalogue story | Apps auto-loads, featured cards visible, search works |  |  |

## Announcement Decision

| Question | Answer |
| --- | --- |
| Final decision (GO, NO-GO, or GO desktop only) | GO desktop only |
`

const storySmoke = {
  ok: true,
  releaseEvidence: {
    kind: 'pearbrowser-release-rpc-story-smoke-evidence',
    rows: [
      {
        section: 'Desktop GUI And User Stories',
        gate: 'Browse story',
        result: 'PASS',
        evidence: 'release RPC desktop-gui smoke: homepage fetched and drive-info key matched'
      }
    ]
  }
}

test('release evidence parser keeps table sections and rows', () => {
  const tables = parseMarkdownTables(completeLog)
  assert.equal(tables.length, 3)
  assert.equal(tables[0].section, 'Run Metadata')
  assert.equal(tables[1].section, 'Desktop Automated Baseline')
  assert.equal(tables[1].rows.length, 2)
})

test('complete release evidence accepts PASS and documented DEFER rows', () => {
  const result = analyzeReleaseEvidence(completeLog)
  assert.equal(result.ok, true)
  assert.equal(result.counts.passed, 1)
  assert.equal(result.counts.deferred, 1)
  assert.equal(result.counts.incomplete, 0)
  assert.equal(result.counts.failures, 0)
})

test('blank results, missing evidence, and NO-GO decision block release evidence', () => {
  const result = analyzeReleaseEvidence(incompleteLog)
  assert.equal(result.ok, false)
  assert.ok(result.incomplete.some((item) => item.reason === 'metadata value is blank'))
  assert.ok(result.incomplete.some((item) => item.reason === 'result is blank'))
  assert.ok(result.incomplete.some((item) => item.reason === 'PASS requires evidence'))
  assert.ok(result.failures.some((item) => item.reason === 'decision is NO-GO'))
})

test('unexpected gate result is a failure', () => {
  const result = analyzeReleaseEvidence(completeLog.replace('PASS | log: test-output.txt', 'FAIL | log: fail.txt'))
  assert.equal(result.ok, false)
  assert.ok(result.failures.some((item) => item.reason === 'result is FAIL'))
})

test('negative announcement answers block release evidence', () => {
  const result = analyzeReleaseEvidence(completeLog.replace('Are all required desktop automated gates PASS? | yes', 'Are all required desktop automated gates PASS? | No - network gate pending'))
  assert.equal(result.ok, false)
  assert.ok(result.failures.some((item) => item.item === 'Are all required desktop automated gates PASS?' && item.reason === 'answer is NO - NETWORK GATE PENDING'))
})

test('ambiguous announcement answers remain incomplete', () => {
  const result = analyzeReleaseEvidence(completeLog.replace('Are all required desktop automated gates PASS? | yes', 'Are all required desktop automated gates PASS? | maybe after review'))
  assert.equal(result.ok, false)
  assert.ok(result.incomplete.some((item) => item.item === 'Are all required desktop automated gates PASS?' && item.reason === 'answer must be yes/pass/defer or explicitly out of scope'))
})

test('blank final decision is one combined blocker', () => {
  const blankFinal = completeLog.replace(
    'Final decision (GO, NO-GO, or GO desktop only) | GO desktop only',
    'Final decision (GO, NO-GO, or GO desktop only) |  '
  )
  const result = analyzeReleaseEvidence(blankFinal)
  assert.equal(result.ok, false)
  assert.equal(result.counts.incomplete, 1)
  assert.deepEqual(result.incomplete, [{
    section: 'Announcement Decision',
    item: 'Final decision (GO, NO-GO, or GO desktop only)',
    reason: 'answer is blank; final decision is missing'
  }])
})

test('release evidence handoff groups incomplete rows with fill templates', () => {
  const handoff = buildEvidenceHandoff(incompleteLog, { file: 'fixture.md' })
  assert.equal(handoff.ok, false)
  assert.equal(handoff.counts.incomplete, 3)
  assert.equal(handoff.counts.failures, 1)

  const metadata = handoff.groups.find((group) => group.section === 'Run Metadata')
  assert.ok(metadata.items.some((item) => item.item === 'Operator' && item.template === '| Operator | <record value> |'))

  const gates = handoff.groups.find((group) => group.section === 'Desktop Automated Baseline')
  assert.ok(gates.items.some((item) => item.item === 'npm test' && item.template.includes('| npm test | green | <PASS|DEFER> | <evidence path, URL, or terminal excerpt> |')))
  assert.ok(gates.items.some((item) => item.item === 'CI' && item.template.includes('| CI | green | PASS | <evidence path, URL, or terminal excerpt> |')))

  const decision = handoff.groups.find((group) => group.section === 'Announcement Decision')
  assert.ok(decision.items.some((item) => /^Final decision/i.test(item.item) && item.template.includes('GO desktop only')))
})

test('release evidence handoff can prefill matching rows from release story smoke JSON', () => {
  const handoff = buildEvidenceHandoff(guiBlockerLog, { file: 'fixture.md', storySmoke })
  const group = handoff.groups.find((item) => item.section === 'Desktop GUI And User Stories')
  const browse = group.items.find((item) => item.item === 'Browse story')
  const catalogue = group.items.find((item) => item.item === 'Catalogue story')

  assert.equal(browse.automatedEvidence.result, 'PASS')
  assert.equal(browse.automatedEvidence.evidence, 'release RPC desktop-gui smoke: homepage fetched and drive-info key matched')
  assert.match(browse.template, /\| Browse story \| homepage renders, reloads, site info correct \| PASS \| release RPC desktop-gui smoke: homepage fetched and drive-info key matched \|/)
  assert.match(catalogue.template, /\| Catalogue story \| Apps auto-loads, featured cards visible, search works \| <PASS\|DEFER> \| <evidence path, URL, or terminal excerpt> \|/)

  const markdown = formatEvidenceHandoffMarkdown(handoff)
  assert.match(markdown, /Automated evidence: PASS - release RPC desktop-gui smoke/)
})

test('release evidence handoff markdown exposes summary, blockers, and rerun command', () => {
  const markdown = formatEvidenceHandoffMarkdown(buildEvidenceHandoff(incompleteLog, { file: 'fixture.md' }))
  assert.match(markdown, /# Release Evidence Handoff/)
  assert.match(markdown, /Status: `BLOCKED`/)
  assert.match(markdown, /### Desktop Automated Baseline/)
  assert.match(markdown, /\| npm test \| green \| <PASS\|DEFER> \| <evidence path, URL, or terminal excerpt> \|/)
  assert.match(markdown, /npm run check:release-evidence/)
})

test('release evidence handoff collapses duplicate final-decision blockers', () => {
  const blankFinal = completeLog.replace(
    'Final decision (GO, NO-GO, or GO desktop only) | GO desktop only',
    'Final decision (GO, NO-GO, or GO desktop only) |  '
  )
  const handoff = buildEvidenceHandoff(blankFinal, { file: 'fixture.md' })
  const decision = handoff.groups.find((group) => group.section === 'Announcement Decision')
  const finalItems = decision.items.filter((item) => /^Final decision/i.test(item.item))
  assert.equal(finalItems.length, 1)
  assert.equal(finalItems[0].reason, 'answer is blank; final decision is missing')
})

test('release evidence handoff is exposed as an npm script', () => {
  assert.equal(pkg.scripts['generate:release-evidence-handoff'], 'node scripts/generate-release-evidence-handoff.mjs')
})
