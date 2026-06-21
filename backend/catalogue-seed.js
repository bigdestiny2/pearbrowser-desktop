/**
 * Dev catalogue seed data.
 *
 * Until the HiveRelay publishes a canonical schema-sheets catalogue room, the
 * backend seeds one locally on boot (see ensureDevCatalogue in index.js) so the
 * Apps store is populated end-to-end from the real schema-sheets read path.
 * Replace with the relay's z32 link (loadCatalogSheets) once it exists.
 *
 * Each entry is one `apps` row (validated against APPS_SCHEMA): name + type
 * required, driveKey OR link, type ∈ {standalone (window), hypersite (run-in-tab)}.
 */
module.exports = {
  SEED_APPS: [
    {
      name: 'Keet',
      link: 'pear://oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo',
      type: 'standalone',
      author: 'Holepunch',
      categories: ['chat', 'communication', 'featured'],
      description: 'End-to-end encrypted P2P chat, voice, and video calls.',
      verification: 'relay-listed'
    },
    {
      name: 'PearPass',
      link: 'pear://tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo',
      type: 'standalone',
      author: 'Tether',
      categories: ['security', 'utilities', 'featured'],
      description: 'Peer-to-peer password manager — synced across devices without a cloud.',
      verification: 'relay-listed'
    },
    {
      name: 'HiveWorm',
      link: 'pear://d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y',
      type: 'standalone',
      author: 'HiveWorm',
      categories: ['games'],
      description: 'Perpetual P2P life-sim — runs as a Pear app via swarm.v1.',
      verification: 'unverified'
    },
    {
      name: 'anonGPT',
      link: 'pear://rpzh3fsgg38kfir9nmae7x3o8ubofddzzixr5js4mxd6a6drb6wo',
      type: 'standalone',
      author: 'anonGPT',
      categories: ['ai', 'featured'],
      description: 'Private P2P AI chat — pay-per-inference from a HiveMind seller, with signed receipts.',
      verification: 'relay-listed'
    },
    {
      name: 'Headless Demo',
      link: 'file:///Users/localllm/Desktop/pear-request-demo',
      type: 'hypersite',
      author: 'pearbrowser',
      categories: ['utilities', 'demo'],
      description: 'A pear-request htmx app — runs headless in a tab, no separate window.',
      verification: 'author-signed'
    },
    {
      // Pear POS landing site — published Hyperdrive, seeded on HiveRelay, runs
      // in a tab (hypersite). Re-publish with `npm run publish:site` to update.
      name: 'Pear POS',
      driveKey: 'b776f15f3e6860ecf6d923853c295350e55b708772e67d7124899b96aecfcd43',
      type: 'hypersite',
      author: 'Pear POS',
      categories: ['business', 'commerce', 'featured'],
      description: 'Peer-to-peer, offline-first point of sale — AI scanning, self-custodial USD₮ & Bitcoin, multi-terminal sync. $0 forever.',
      verification: 'relay-listed'
    },
    {
      // Launchable Pear POS register (standalone window). Replace the link with
      // the real pear:// key from `pear release` (PEAR-RELEASE.md) to launch it;
      // until then it appears in the Apps catalogue but cannot open.
      name: 'Pear POS (App)',
      link: 'pear://REPLACE_WITH_STAGED_KEY',
      type: 'standalone',
      author: 'Pear POS',
      categories: ['business', 'commerce', 'productivity'],
      description: 'The native Pear POS register — full P2P sync, AI product scanning, and self-custodial crypto payments.',
      verification: 'author-signed'
    },
    {
      // PearBrowser landing site — published Hyperdrive, seeded on HiveRelay, runs
      // in a tab (hypersite). Re-publish: node scripts/publish-and-pin.js
      // ../../03-sites/p2p-sites/pearbrowser --name pearbrowser-home --key 1868916a…
      // --storage ../../03-sites/pearbrowser-publishers/seed-pearbrowser
      name: 'PearBrowser',
      driveKey: '1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d',
      type: 'hypersite',
      author: 'bigdestiny2',
      categories: ['browser', 'featured'],
      description: 'The browser for the peer-to-peer web — browse hyper://, install Pear apps, publish sites pinned 24/7, and search through people you trust with Lighthouse.',
      verification: 'relay-listed'
    },
    {
      // HiveRelay landing site. Re-publish: --name p2phiverelay --key 9f2b34aa…
      // --storage ../../03-sites/pearbrowser-publishers/seed-hiverelay
      name: 'HiveRelay',
      driveKey: '9f2b34aad8cd1a681d5f07d8a76768f0dc92a5008251d02a8600eb0751ad6b5f',
      type: 'hypersite',
      author: 'bigdestiny2',
      categories: ['infrastructure', 'featured'],
      description: 'The always-on, blind seed backbone for P2P apps — your Hyperdrive stays online after you close your laptop, and the operator never sees your data.',
      verification: 'relay-listed'
    },
    {
      // P2P Builders landing site. Re-publish: --name p2pbuilders --key 8545ce29…
      // --storage ../../03-sites/pearbrowser-publishers/seed-p2pbuilders
      name: 'P2P Builders',
      driveKey: '8545ce29bedf22d3c6ff682684b626947e4b71e98d874931df7a1d00b70db5b7',
      type: 'hypersite',
      author: 'bigdestiny2',
      categories: ['community'],
      description: 'Where the people building peer-to-peer hang out — a permissionless, server-less board and the front door to the whole Pear ecosystem of real apps.',
      verification: 'relay-listed'
    },
    {
      // Paste (pearpaste) landing — published Hyperdrive, pinned on HiveRelay.
      name: 'Paste',
      driveKey: '25a06bb3dddec8138e9eda606cc4a11e9ebbe47815fd5d22064b30cff752bb5b',
      type: 'hypersite',
      author: 'defidon',
      categories: ['productivity', 'security'],
      description: 'Local-first, end-to-end encrypted notes & clipboard sync for your own devices — no account, no server, no plaintext replication.',
      verification: 'relay-listed'
    },
    {
      // Pear Dealroom landing — published Hyperdrive, pinned on HiveRelay.
      name: 'Pear Dealroom',
      driveKey: '0724aabf2ad6394983f91c6b24ebd417cb3d25addcf29c98eb246c512dc77f90',
      type: 'hypersite',
      author: 'defidon',
      categories: ['productivity', 'security'],
      description: 'Zero-infrastructure E2EE virtual data room for M&A — a signed tamper-evident audit trail and cryptographic access tiers, no cloud.',
      verification: 'relay-listed'
    },
    {
      // Pear Tickets landing — published Hyperdrive (ec309f51…), pinned on HiveRelay.
      name: 'Pear Tickets',
      driveKey: 'ec309f516da659718746fe10ded086e2b6d157718c3e3651f86e07a4df34210a',
      type: 'hypersite',
      author: 'bigdestiny2',
      categories: ['commerce', 'productivity'],
      description: 'Offline-capable, signed-Hypercore event ticketing — Lightning, Cashu, and Stripe.',
      verification: 'relay-listed'
    }
  ]
}
