import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const backend = readFileSync(new URL('../backend/index.js', import.meta.url), 'utf8')
const ui = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
const constants = readFileSync(new URL('../backend/constants.js', import.meta.url), 'utf8')
const seedGenerator = readFileSync(new URL('../scripts/gen-catalogue-seed.mjs', import.meta.url), 'utf8')

function between (source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.ok(from >= 0, `missing start marker: ${start}`)
  assert.ok(to > from, `missing end marker: ${end}`)
  return source.slice(from, to)
}

test('submission RPC queues exactly one catalogue receipt instead of the target release', () => {
  const handler = between(backend, 'rpc.handle(C.CMD_SUBMIT_APP', 'rpc.handle(C.CMD_MOD_PENDING')
  assert.match(handler, /appId:\s*receiptId/)
  assert.match(handler, /seed:\s*true/)
  assert.match(handler, /mdrive\.replicas\.accepted/)
  assert.doesNotMatch(handler, /hiveRelay\.seed\s*\(/)
  assert.match(handler, /installLink/)
})

test('moderation fetches the receipt first and Hyper target content separately', () => {
  const review = between(backend, 'async function reviewPendingSubmission', '// Minimal JSON HTTP')
  assert.match(review, /Receipt drive open/)
  assert.match(review, /manifest\.submissionKind === 'hyper'/)
  assert.match(review, /Target drive open/)
  assert.match(review, /receiptDriveVersion/)
  assert.match(review, /targetDriveVersion/)
})

test('renderer exposes Pear v3 metadata, target selection, and bounded icon upload', () => {
  const form = between(ui, 'function CommunitySubmit', '// In-app moderator panel')
  assert.match(form, /submissionKind/)
  assert.match(form, /releaseConfirmed/)
  assert.match(form, /productName/)
  assert.match(form, /targets/)
  assert.match(form, /type="file"/)
  assert.match(form, /image\/png,image\/jpeg,image\/webp,image\/gif,image\/svg\+xml/)
  assert.match(form, /iconData/)
  assert.match(form, /pear build/)
  assert.match(form, /pear provision/)
})

test('approval RPC contract binds receipt and optional target versions', () => {
  assert.match(constants, /reviewedReceiptDriveVersion/)
  assert.match(constants, /reviewedTargetDriveVersion/)
  const moderator = between(ui, 'function ModeratorPanel', '// Browser-side defensive dedup')
  assert.match(moderator, /reviewedReceiptDriveVersion/)
  assert.match(moderator, /reviewedTargetDriveVersion/)
})

test('generated catalogue seed preserves the complete Pear v3 native delivery contract', () => {
  assert.match(seedGenerator, /nativeDeliveryStatus/)
  assert.match(seedGenerator, /nativeDeliveryKind/)
  assert.match(seedGenerator, /nativeInstallLink/)
  assert.match(seedGenerator, /nativeProductName/)
  assert.match(seedGenerator, /nativeTargets/)
})
