#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'

import piMod from '../backend/personal-index.cjs'
import evalMod from '../backend/lighthouse-eval.cjs'

const { PersonalIndex } = piMod
const { runEvaluation } = evalMod

function hasFlag (name) {
  return process.argv.includes(name)
}

function argValue (name, fallback = null) {
  const idx = process.argv.indexOf(name)
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback
}

function fixtureDocs () {
  const peeritDrive = 'ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4'
  const p2pBuildersDrive = 'ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74'
  return [
    {
      key: 'page-replication',
      driveKey: 'hypercore-notes',
      path: '/replication',
      title: 'Hypercore replication notes',
      body: 'Merkle trees, append-only logs, sparse replication, and peer availability.',
      publishedAt: 1710000000000,
      source: { kind: 'page', verifiedAs: 'browser-indexed' }
    },
    {
      key: 'peerit-outbox',
      driveKey: `hyper://${peeritDrive}/#/r/p2p/comments/outbox`,
      path: '/',
      title: 'Offline outbox discovery for Peerit',
      body: 'peerit post about signed Lighthouse app-outbox descriptors and durable app data.',
      publishedAt: 1710000001000,
      source: {
        kind: 'app-data',
        appSlug: 'peerit',
        recordType: 'post',
        recordKey: 'post!p2p!outbox',
        author: 'a'.repeat(64),
        appDriveKey: peeritDrive,
        rawAppId: 'peerit',
        scopedAppId: '1'.repeat(64),
        verifiedAs: 'app-signed-observed'
      }
    },
    {
      key: 'peerit-comment',
      driveKey: `hyper://${peeritDrive}/#/r/p2p/comments/outbox`,
      path: '/comment/c1',
      title: 'Comment in r/p2p',
      body: 'peerit comment asking how snippets explain why this matched in Lighthouse search.',
      publishedAt: 1710000002000,
      source: {
        kind: 'app-data',
        appSlug: 'peerit',
        recordType: 'comment',
        recordKey: 'comment!p2p!outbox!c1',
        author: 'b'.repeat(64),
        appDriveKey: peeritDrive,
        rawAppId: 'peerit',
        scopedAppId: '1'.repeat(64),
        verifiedAs: 'app-signed-observed'
      }
    },
    {
      key: 'builders-board',
      driveKey: `hyper://${p2pBuildersDrive}/#/b/front`,
      path: '/',
      title: 'b/front durable apps board',
      body: 'p2pbuilders board for app builders comparing relay-confirmed availability and searchable metadata.',
      publishedAt: 1710000003000,
      source: {
        kind: 'app-data',
        appSlug: 'p2pbuilders',
        recordType: 'board',
        recordKey: 'board!front',
        author: 'c'.repeat(64),
        appDriveKey: p2pBuildersDrive,
        rawAppId: 'p2pbuilders',
        scopedAppId: '2'.repeat(64),
        verifiedAs: 'app-signed-observed'
      }
    },
    {
      key: 'page-recipes',
      driveKey: 'recipes',
      path: '/bread',
      title: 'Bread notes',
      body: 'sourdough hydration and kitchen timing, intentionally unrelated to Lighthouse.',
      publishedAt: 1710000004000,
      source: { kind: 'page', verifiedAs: 'browser-indexed' }
    }
  ]
}

function querySpecs (ids) {
  return [
    {
      id: 'local-page-replication',
      query: 'hypercore replication',
      relevant: { [ids.get('page-replication')]: 3 }
    },
    {
      id: 'peerit-outbox-filter',
      query: 'app:peerit type:post outbox discovery',
      relevant: { [ids.get('peerit-outbox')]: 3 }
    },
    {
      id: 'peerit-comment-snippet',
      query: 'app:peerit type:comment snippets matched',
      relevant: { [ids.get('peerit-comment')]: 3 }
    },
    {
      id: 'builders-availability',
      query: 'app:p2pbuilders availability searchable',
      relevant: { [ids.get('builders-board')]: 3 }
    },
    {
      id: 'prefix-recall',
      query: 'replic*',
      relevant: {
        [ids.get('page-replication')]: 3
      }
    }
  ]
}

function printReport (report) {
  const a = report.aggregate
  console.log(`Lighthouse eval: ${a.queries} queries @${report.k}`)
  console.log(`MRR ${a.mrr.toFixed(3)}  Recall@${report.k} ${a.recallAtK.toFixed(3)}  nDCG ${a.ndcg.toFixed(3)}  p95 ${a.latencyMsP95}ms`)
  for (const row of report.queries) {
    const status = row.recallAtK >= 1 ? 'ok' : 'miss'
    console.log(`${status.padEnd(4)} ${row.id.padEnd(24)} rr=${row.reciprocalRank.toFixed(3)} recall=${row.recallAtK.toFixed(3)} ndcg=${row.ndcg.toFixed(3)} ${row.latencyMs}ms`)
  }
}

async function main () {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-eval-'))
  const store = new Corestore(dir)
  await store.ready()
  const index = await new PersonalIndex(store).ready()
  try {
    const ids = new Map()
    for (const doc of fixtureDocs()) ids.set(doc.key, await index.indexDoc(doc))
    const k = Math.max(1, Math.min(Number(argValue('--k', '5')) || 5, 50))
    const report = await runEvaluation({
      k,
      queries: querySpecs(ids),
      search: (query, opts) => index.search(query, opts),
      now0: 1710000100000
    })

    const failUnderMrr = Number(argValue('--fail-under-mrr', '0'))
    const failUnderRecall = Number(argValue('--fail-under-recall', '0'))
    if (hasFlag('--json')) console.log(JSON.stringify(report, null, 2))
    else printReport(report)
    if ((failUnderMrr && report.aggregate.mrr < failUnderMrr) ||
        (failUnderRecall && report.aggregate.recallAtK < failUnderRecall)) {
      process.exitCode = 1
    }
  } finally {
    await index.close().catch(() => {})
    await store.close().catch(() => {})
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch((err) => {
  console.error(err && err.stack || err)
  process.exit(1)
})
