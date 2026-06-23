import test from 'node:test'
import assert from 'node:assert/strict'

import {
  analyzeReleaseEvidence,
  parseMarkdownTables
} from '../scripts/check-release-evidence.mjs'

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
