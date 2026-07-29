import test from 'node:test'
import assert from 'node:assert/strict'
import communitySubmit from '../backend/community-submit.cjs'

const {
  MAX_ICON_DATA_CHARS,
  MAX_INDEX_BYTES,
  slugify,
  normalizePearInstallLink,
  normalizeIconData,
  deriveKeyAndLink,
  buildSubmissionManifest,
  manageRequest,
  communityBeeEntry,
  buildReviewReport,
  reviewEvidenceMatches,
  submissionRelayOutcome
} = communitySubmit

const RECEIPT = 'f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d'
const TARGET = 'a'.repeat(64)
const Z32 = 'y'.repeat(52)
const PEAR_KEY = 'a'.repeat(52)
const PEAR_LINK = `pear://${PEAR_KEY}`
const PUBLISHER = 'b'.repeat(64)
const PNG_ICON = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a', 'hex').toString('base64')}`

const fakeNormalize = (raw) => {
  if (/^[0-9a-f]{64}$/i.test(raw)) return raw.toLowerCase()
  if (raw === Z32) return TARGET
  return raw
}

function nativeInput (overrides = {}) {
  return {
    submissionKind: 'pear-v3',
    name: 'Native Demo',
    link: PEAR_LINK,
    version: '3.2.1',
    productName: 'Native Demo',
    targets: ['darwin-arm64', 'linux-x64', 'win32-x64'],
    releaseConfirmed: true,
    author: 'alice',
    categories: 'tools, p2p',
    iconData: PNG_ICON,
    ...overrides
  }
}

test('slugify produces stable catalogue-safe ids', () => {
  assert.equal(slugify('Cool App!!'), 'cool-app')
  assert.equal(slugify('  Spaces  & Symbols  '), 'spaces-symbols')
  assert.equal(slugify(''), 'app')
  assert.equal(slugify('A'.repeat(200)).length, 64)
})

test('Pear v3 install links accept only canonical root release identities', () => {
  assert.deepEqual(normalizePearInstallLink(`${PEAR_LINK}/`), { installLink: PEAR_LINK, key: PEAR_KEY })
  assert.deepEqual(normalizePearInstallLink(`PEAR://${PEAR_KEY.toUpperCase()}`), { installLink: PEAR_LINK, key: PEAR_KEY })
  assert.match(normalizePearInstallLink(`${PEAR_LINK}/worker.js`).error, /root Pear release link/i)
  assert.match(normalizePearInstallLink(`pear://0.42.${PEAR_KEY}`).error, /52-character/i)
  assert.match(normalizePearInstallLink(`hyper://${PEAR_KEY}`).error, /52-character/i)
})

test('deriveKeyAndLink accepts Hyper targets and routes Pear links to the native form', () => {
  assert.deepEqual(deriveKeyAndLink(`hyper://${TARGET}/`, fakeNormalize), {
    driveKey: TARGET,
    link: `hyper://${TARGET}/`,
    kind: 'hyper'
  })
  assert.equal(deriveKeyAndLink(Z32, fakeNormalize).driveKey, TARGET)
  assert.match(deriveKeyAndLink(PEAR_LINK, fakeNormalize).error, /Choose Pear v3 app/i)
  assert.ok(deriveKeyAndLink('', fakeNormalize).error)
})

test('icon validation accepts bounded image bytes and rejects spoofed or active data', () => {
  assert.equal(normalizeIconData(PNG_ICON).iconData, PNG_ICON)
  const safeSvg = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8"/></svg>').toString('base64')}`
  assert.equal(normalizeIconData(safeSvg).iconData, safeSvg)
  const activeSvg = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64')}`
  assert.match(normalizeIconData(activeSvg).error, /unsafe SVG/i)
  assert.match(normalizeIconData('data:image/png;base64,AAAA').error, /do not match/i)
  assert.match(normalizeIconData('data:text/plain;base64,SGk=').error, /PNG, JPEG/i)
  assert.match(normalizeIconData('data:image/png;base64,' + 'A'.repeat(MAX_ICON_DATA_CHARS)).error, /too large/i)
})

test('buildSubmissionManifest creates one review receipt for browsable Hyper content', () => {
  const result = buildSubmissionManifest({
    submissionKind: 'hyper',
    name: 'Community Site',
    link: `hyper://${TARGET}/`,
    description: 'A neat site',
    author: 'alice',
    categories: 'tools, social, tools',
    iconData: PNG_ICON
  }, { submittedBy: PUBLISHER, now: 1000, normalizeKey: fakeNormalize })

  assert.equal(result.error, undefined)
  assert.equal(result.kind, 'hyper')
  assert.equal(result.driveKey, TARGET)
  assert.equal(result.receiptId, `community-hyper-${TARGET}`)
  assert.equal(result.manifest.receiptVersion, 1)
  assert.equal(result.manifest.submissionKind, 'hyper')
  assert.equal(result.manifest.type, 'hypersite')
  assert.deepEqual(result.manifest.categories, ['tools', 'social'])
  assert.equal(result.manifest.iconData, PNG_ICON)
})

test('buildSubmissionManifest projects a released Pear v3 app into nativeDelivery', () => {
  const result = buildSubmissionManifest(nativeInput(), { submittedBy: PUBLISHER, now: 2000 })
  assert.equal(result.error, undefined)
  assert.equal(result.kind, 'pear-v3')
  assert.equal(result.driveKey, null)
  assert.equal(result.installLink, PEAR_LINK)
  assert.equal(result.receiptId, `community-native-${PEAR_KEY}`)
  assert.equal(result.manifest.type, 'standalone')
  assert.equal(result.manifest.link, undefined)
  assert.equal(result.manifest.driveKey, undefined)
  assert.deepEqual(result.manifest.nativeDelivery, {
    status: 'available',
    kind: 'pear-v3',
    installLink: PEAR_LINK,
    productName: 'Native Demo',
    targets: ['darwin-arm64', 'linux-x64', 'win32-x64']
  })
  assert.deepEqual(result.manifest.release, {
    channel: 'production',
    publisherConfirmed: true,
    workflow: 'pear-v3-build-stage-provision-multisig'
  })
})

test('Pear v3 submission fails closed on unreleased, versioned, or incomplete metadata', () => {
  assert.match(buildSubmissionManifest(nativeInput({ releaseConfirmed: false })).error, /Confirm that this root link/i)
  assert.match(buildSubmissionManifest(nativeInput({ version: '' })).error, /package version/i)
  assert.match(buildSubmissionManifest(nativeInput({ targets: [] })).error, /Select at least one/i)
  assert.match(buildSubmissionManifest(nativeInput({ targets: ['android-x64'] })).error, /Unsupported Pear v3 target/i)
  assert.match(buildSubmissionManifest(nativeInput({ link: `pear://0.42.${PEAR_KEY}` })).error, /52-character/i)
  assert.match(buildSubmissionManifest(nativeInput({ productName: '../bad' })).error, /filename-safe/i)
})

test('buildSubmissionManifest reports invalid icons instead of silently dropping them', () => {
  const result = buildSubmissionManifest(nativeInput({ iconData: 'data:image/png;base64,AAAA' }))
  assert.match(result.error, /icon bytes/i)
})

test('manageRequest shapes authenticated pending and decision calls', () => {
  const pending = manageRequest('pending', { baseUrl: 'http://127.0.0.1:9100/', apiKey: 'secret' })
  assert.equal(pending.method, 'GET')
  assert.equal(pending.url, 'http://127.0.0.1:9100/api/manage/catalog/pending')
  assert.equal(pending.headers.authorization, 'Bearer secret')
  const approve = manageRequest('approve', { baseUrl: 'https://relay.example', apiKey: 'k', appKey: RECEIPT.toUpperCase() })
  assert.equal(approve.method, 'POST')
  assert.deepEqual(JSON.parse(approve.body), { appKey: RECEIPT })
  assert.ok(manageRequest('pending', {}).error)
  assert.ok(manageRequest('approve', { baseUrl: 'http://x', appKey: 'short' }).error)
})

test('communityBeeEntry emits catalogue-native and Hyper shapes without executable top-level links', () => {
  const native = communityBeeEntry(buildSubmissionManifest(nativeInput(), { now: 42 }).manifest)
  assert.equal(native.key, 'app!native-demo')
  assert.equal(native.value.type, 'standalone')
  assert.equal(native.value.link, undefined)
  assert.equal(native.value.nativeDelivery.installLink, PEAR_LINK)
  assert.equal(native.value.iconData, PNG_ICON)

  const hyperManifest = buildSubmissionManifest({ name: 'Site', submissionKind: 'hyper', link: TARGET }, { normalizeKey: fakeNormalize, now: 44 }).manifest
  const hyper = communityBeeEntry(hyperManifest)
  assert.equal(hyper.value.type, 'hypersite')
  assert.equal(hyper.value.driveKey, TARGET)
  assert.equal(hyper.value.link, `hyper://${TARGET}/`)
})

test('Hyper review binds the receipt to a separately fetched target drive', () => {
  const manifest = buildSubmissionManifest({
    submissionKind: 'hyper',
    name: 'Reviewed Site',
    link: TARGET,
    version: '1.0.0'
  }, { now: 1000, normalizeKey: fakeNormalize }).manifest
  const report = buildReviewReport({
    appKey: RECEIPT,
    pending: { appKey: RECEIPT, publisherPubkey: PUBLISHER, source: 'seed-protocol', discoveredAt: 1000 },
    manifest,
    receiptDriveVersion: 2,
    targetDriveKey: TARGET,
    targetDriveVersion: 4,
    indexText: '<!doctype html><html><body>Hello</body></html>',
    indexBytes: 47,
    duplicates: [],
    normalizeKey: fakeNormalize
  }, 2000)

  assert.equal(report.approvalAllowed, true)
  assert.equal(report.submissionKind, 'hyper')
  assert.equal(report.previewUrl, `hyper://${TARGET}/`)
  assert.equal(report.manifest.driveKey, TARGET)
  assert.equal(report.evidence.receiptDriveVersion, 2)
  assert.equal(report.evidence.targetDriveVersion, 4)
  assert.equal(report.evidence.queueSource, 'seed-protocol')
  assert.equal(report.evidence.directSeedRequest, true)
  assert.ok(report.checks.some((check) => check.id === 'queue-source' && check.status === 'pass'))
  assert.ok(report.checks.some((check) => check.id === 'mutable-content' && check.status === 'warning'))
})

test('Pear v3 review validates metadata without pretending to execute or pin the package', () => {
  const manifest = buildSubmissionManifest(nativeInput(), { now: 1000 }).manifest
  const report = buildReviewReport({
    appKey: RECEIPT,
    pending: { appKey: RECEIPT, publisherPubkey: PUBLISHER, source: 'seed-protocol' },
    manifest,
    receiptDriveVersion: 3,
    duplicates: []
  }, 2000)

  assert.equal(report.approvalAllowed, true)
  assert.equal(report.submissionKind, 'pear-v3')
  assert.equal(report.previewUrl, '')
  assert.equal(report.manifest.nativeDelivery.installLink, PEAR_LINK)
  assert.equal(report.evidence.targetDriveVersion, 0)
  assert.ok(report.checks.some((check) => check.id === 'native-delivery' && check.status === 'pass'))
  assert.ok(report.checks.some((check) => check.id === 'install-boundary' && check.status === 'warning'))
  assert.equal(report.checks.some((check) => check.id === 'entrypoint'), false)
})

test('review blocks missing receipts and unavailable Hyper targets', () => {
  const missing = buildReviewReport({
    appKey: RECEIPT,
    pending: { appKey: RECEIPT, publisherPubkey: PUBLISHER, source: 'seed-protocol' },
    receiptDriveVersion: 0,
    receiptFetchError: 'offline'
  })
  assert.equal(missing.approvalAllowed, false)
  assert.ok(missing.checks.some((check) => check.id === 'manifest' && check.status === 'block'))

  const manifest = buildSubmissionManifest({ name: 'Offline Site', submissionKind: 'hyper', link: TARGET }, { normalizeKey: fakeNormalize }).manifest
  const offline = buildReviewReport({
    appKey: RECEIPT,
    pending: { appKey: RECEIPT, publisherPubkey: PUBLISHER, source: 'seed-protocol' },
    receiptDriveVersion: 1,
    manifest,
    targetDriveKey: TARGET,
    targetFetchError: 'not seeded'
  })
  assert.equal(offline.approvalAllowed, false)
  assert.ok(offline.checks.some((check) => check.id === 'target-availability' && check.status === 'block'))
  assert.ok(offline.checks.some((check) => check.id === 'entrypoint' && check.status === 'block'))
})

test('review surfaces duplicates, external behavior, and oversized entrypoints', () => {
  const manifest = buildSubmissionManifest({ name: 'External', submissionKind: 'hyper', link: TARGET }, { normalizeKey: fakeNormalize }).manifest
  const report = buildReviewReport({
    appKey: RECEIPT,
    pending: { appKey: RECEIPT, publisherPubkey: PUBLISHER, source: 'seed-protocol' },
    receiptDriveVersion: 1,
    manifest,
    targetDriveKey: TARGET,
    targetDriveVersion: 2,
    indexText: '<html><script src="https://cdn.example/app.js"></script><form></form></html>',
    duplicates: [{ id: 'existing', name: 'Existing', driveKey: TARGET }]
  })
  assert.equal(report.approvalAllowed, true)
  assert.deepEqual(report.evidence.externalOrigins, ['https://cdn.example'])
  assert.deepEqual(report.evidence.behaviorSignals, ['form submission'])
  assert.ok(report.checks.some((check) => check.id === 'duplicate' && check.status === 'warning'))

  const oversized = buildReviewReport({
    appKey: RECEIPT,
    pending: { appKey: RECEIPT, publisherPubkey: PUBLISHER, source: 'seed-protocol' },
    receiptDriveVersion: 1,
    manifest,
    targetDriveKey: TARGET,
    targetDriveVersion: 2,
    indexText: '<html></html>',
    indexBytes: MAX_INDEX_BYTES + 1
  })
  assert.equal(oversized.approvalAllowed, false)
  assert.ok(oversized.checks.some((check) => check.id === 'entrypoint' && check.status === 'block'))
})

test('review rejects publisher-shaped keys outside direct seed-protocol entries', () => {
  const manifest = buildSubmissionManifest({ name: 'Untrusted', submissionKind: 'hyper', link: TARGET }, { normalizeKey: fakeNormalize }).manifest
  for (const source of ['federation', 'remote-catalogue', 'unknown', undefined]) {
    const report = buildReviewReport({
      appKey: RECEIPT,
      pending: { appKey: RECEIPT, publisherPubkey: PUBLISHER, source },
      receiptDriveVersion: 1,
      manifest,
      targetDriveKey: TARGET,
      targetDriveVersion: 2,
      indexText: '<html><body>site</body></html>'
    })

    assert.equal(report.approvalAllowed, false)
    assert.equal(report.evidence.queueSource, source || '')
    assert.equal(report.evidence.directSeedRequest, false)
    assert.equal(report.checks.find((check) => check.id === 'queue-source').status, 'block')
    assert.equal(report.checks.find((check) => check.id === 'publisher').status, 'block')
  }
})

test('submissionRelayOutcome distinguishes moderation queues from replication acceptance', () => {
  assert.deepEqual(submissionRelayOutcome({
    acceptances: 1,
    denials: [
      { relay: 'a'.repeat(64), reasonCode: 'queued-for-review', terminal: false },
      { relay: 'a'.repeat(64), reasonCode: 'queued-for-review', terminal: false }
    ]
  }), {
    status: 'pending-review',
    acceptances: 1,
    queuedForReview: 1,
    terminalDenials: 0
  })
  assert.deepEqual(submissionRelayOutcome({ acceptances: 2 }), {
    status: 'relay-accepted',
    acceptances: 2,
    queuedForReview: 0,
    terminalDenials: 0
  })
  assert.deepEqual(submissionRelayOutcome({
    denials: [{ relay: 'c'.repeat(64), reasonCode: 'capacity', terminal: true }]
  }), {
    status: 'awaiting-relay',
    acceptances: 0,
    queuedForReview: 0,
    terminalDenials: 1
  })
})

test('reviewEvidenceMatches binds approval to receipt and target versions', () => {
  const report = { checkedAt: 1234, evidence: { receiptDriveVersion: 9, targetDriveVersion: 4 } }
  assert.equal(reviewEvidenceMatches({ reviewedAt: 1234, reviewedReceiptDriveVersion: 9, reviewedTargetDriveVersion: 4 }, report), true)
  assert.equal(reviewEvidenceMatches({ reviewedAt: 1234, reviewedReceiptDriveVersion: 10, reviewedTargetDriveVersion: 4 }, report), false)
  assert.equal(reviewEvidenceMatches({ reviewedAt: 1234, reviewedReceiptDriveVersion: 9, reviewedTargetDriveVersion: 5 }, report), false)
  assert.equal(reviewEvidenceMatches({}, report), false)
})
