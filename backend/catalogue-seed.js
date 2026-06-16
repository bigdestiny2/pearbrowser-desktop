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
    }
  ]
}
