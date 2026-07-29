/**
 * Dev catalogue seed data — GENERATED FILE, do not edit by hand.
 *
 * Source of truth: catalog-source/pearbrowser-network.catalog.json
 * Regenerate:      node scripts/gen-catalogue-seed.mjs
 *
 * The backend can seed this into a local schema-sheets demo room when
 * PEARBROWSER_DEV_CATALOGUE=1 (ensureDevCatalogue in index.js). Normal release
 * launches use the curated live Hyperbee catalog plus this offline seed source;
 * dedupeApps() collapses overlaps by driveKey/link, so each app appears once.
 *
 * Each entry is one `apps` row (validated against APPS_SCHEMA): name + type
 * required, driveKey OR link, type ∈ {standalone (window), hypersite (run-in-tab)}.
 */
module.exports = {
  SEED_APPS: [
    {
      "name": "PearBrowser Desktop",
      "type": "standalone",
      "driveKey": "03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f",
      "link": "hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/",
      "legacyMigrationId": "tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty",
      "nativeDeliveryStatus": "migration-required",
      "author": "bigdestiny2",
      "categories": [
        "browser",
        "tools",
        "p2p"
      ],
      "description": "P2P browser, decentralized app store, and site publisher. macOS / Windows / Linux. Talks to peers directly over Hyperswarm. Pinned 24/7 on HiveRelay.",
      "version": "0.8.0",
      "homepage": "hyper://03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f/",
      "sourceUrl": "https://github.com/bigdestiny2/pearbrowser-desktop",
      "license": "MIT",
      "verification": "relay-listed"
    },
    {
      "name": "peerit",
      "type": "hypersite",
      "driveKey": "ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4",
      "link": "hyper://ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4/",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZjZiM2QiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjOWI2Y2ZmIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxNiIgZmlsbD0idXJsKCNnKSIvPgogIDwhLS0gdGhyZWUgcGVlcnMgY29ubmVjdGVkIGluIGEgbWVzaCwgd2l0aCBhbiB1cHZvdGUgYXJyb3cgLS0+CiAgPGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGEwZTE3IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgICA8cGF0aCBkPSJNMjAgNDAgTDQ0IDQwIE0yMCA0MCBMMzIgMjAgTTQ0IDQwIEwzMiAyMCIgb3BhY2l0eT0iMC41Ii8+CiAgPC9nPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMjAiIHI9IjYiIGZpbGw9IiMwYTBlMTciLz4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjQwIiByPSI2IiBmaWxsPSIjMGEwZTE3Ii8+CiAgPGNpcmNsZSBjeD0iNDQiIGN5PSI0MCIgcj0iNiIgZmlsbD0iIzBhMGUxNyIvPgogIDxwYXRoIGQ9Ik0zMiA1MCBMMzIgMzMgTTMyIDMzIEwyNiAzOSBNMzIgMzMgTDM4IDM5IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMy40IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGZpbGw9Im5vbmUiLz4KPC9zdmc+Cg==",
      "author": "bigdestiny2",
      "categories": [
        "community",
        "social",
        "site",
        "featured"
      ],
      "description": "The front page of the P2P internet — a peer-to-peer Reddit. Communities, posts, threaded comments and votes live in a shared Holepunch log (Autobase + Hyperbee) and replicate directly between peers. No servers, no data center. Runs as a P2P site inside PearBrowser, seeded 24/7 on HiveRelay.",
      "version": "1.0.0",
      "homepage": "hyper://ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4/",
      "sourceUrl": "pear-ecosystem/02-apps/peerit",
      "license": "MIT",
      "verification": "relay-listed"
    },
    {
      "name": "HiveRelay",
      "type": "hypersite",
      "driveKey": "9f2b34aad8cd1a681d5f07d8a76768f0dc92a5008251d02a8600eb0751ad6b5f",
      "author": "bigdestiny2",
      "categories": [
        "infrastructure",
        "site"
      ],
      "description": "Always-on relay infrastructure for the Pear and Hyperswarm ecosystem. Blind peering, NAT traversal, HTTP gateway. Apache-2.0.",
      "version": "0.16.3",
      "sourceUrl": "https://github.com/bigdestiny2/P2P-Hiverelay",
      "license": "Apache-2.0",
      "verification": "relay-listed"
    },
    {
      "name": "P2P Builders",
      "type": "hypersite",
      "driveKey": "ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74",
      "link": "hyper://ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74/",
      "author": "bigdestiny2",
      "categories": [
        "community",
        "social",
        "site",
        "featured"
      ],
      "description": "Permissionless peer-to-peer Hacker News for anons who build P2P — in the browser. Proof-of-work-gated posts, reputation-weighted votes, boards, threaded comments, follows and subscribable blocklists replicate directly between peers over the same Holepunch engine as peerit. Runs as a P2P site inside PearBrowser, seeded 24/7 on HiveRelay.",
      "version": "1.0.0",
      "homepage": "hyper://ac1977a75cc84b46af0af8bb559cd4ebbe10507eb0f51d863e289d09635f6d74/",
      "sourceUrl": "pear-ecosystem/02-apps/p2pbuilders",
      "license": "MIT",
      "verification": "relay-listed"
    },
    {
      "name": "Pear Dealroom",
      "type": "standalone",
      "driveKey": "0724aabf2ad6394983f91c6b24ebd417cb3d25addcf29c98eb246c512dc77f90",
      "link": "hyper://0724aabf2ad6394983f91c6b24ebd417cb3d25addcf29c98eb246c512dc77f90/",
      "legacyMigrationId": "7octu5dimjye8rn68raehwuetk5mttzt4zxh6yjw1eqktn49bq7o",
      "nativeDeliveryStatus": "migration-required",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48cGF0aCBkPSJNMzIgMTJsMTYgNnYxMWMwIDExLTcgMTgtMTYgMjMtOS01LTE2LTEyLTE2LTIzVjE4eiIgZmlsbD0iIzU4YTZmZiIvPjxnIHN0cm9rZT0iIzBhMGQxMiIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTI2IDI4aDEyTTI2IDM0aDEyTTI2IDQwaDgiLz48L2c+PC9zdmc+",
      "author": "bigdestiny2",
      "categories": [
        "productivity",
        "security"
      ],
      "description": "Zero-infrastructure P2P virtual data room for M&A and due diligence. End-to-end encrypted documents, a signed tamper-evident audit trail, and cryptographic access tiers — no cloud, no server, no vendor. Built on Holepunch.",
      "version": "1.0.0",
      "homepage": "hyper://0724aabf2ad6394983f91c6b24ebd417cb3d25addcf29c98eb246c512dc77f90/",
      "sourceUrl": "pear-ecosystem/02-apps/pear-dealroom",
      "license": "MIT",
      "verification": "relay-listed"
    },
    {
      "name": "Paste",
      "type": "standalone",
      "driveKey": "25a06bb3dddec8138e9eda606cc4a11e9ebbe47815fd5d22064b30cff752bb5b",
      "link": "hyper://25a06bb3dddec8138e9eda606cc4a11e9ebbe47815fd5d22064b30cff752bb5b/",
      "legacyMigrationId": "qnax5k8ojtod51ci9qwkrawdof1hx5w3a7gqbueoqnzzq9dw5hfo",
      "nativeDeliveryStatus": "migration-required",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48cmVjdCB4PSIxOCIgeT0iMTYiIHdpZHRoPSIyOCIgaGVpZ2h0PSIzNCIgcng9IjQiIGZpbGw9IiM0YWRlODAiLz48cmVjdCB4PSIyNSIgeT0iMTEiIHdpZHRoPSIxNCIgaGVpZ2h0PSI5IiByeD0iMi41IiBmaWxsPSIjNGFkZTgwIiBzdHJva2U9IiMwYTBkMTIiIHN0cm9rZS13aWR0aD0iMiIvPjxnIHN0cm9rZT0iIzBhMGQxMiIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTI0IDMwaDE2TTI0IDM2aDE2TTI0IDQyaDEwIi8+PC9nPjwvc3ZnPg==",
      "author": "bigdestiny2",
      "categories": [
        "productivity",
        "security",
        "tools"
      ],
      "description": "Local-first, end-to-end encrypted notes & clipboard sync for your own devices. No account, no hosted database, no plaintext replication — built on Pear, Holepunch, Hypercore, Hyperbee, Autobase and Hyperswarm. Tap-to-decrypt rows keep secrets sealed until you reveal them. Desktop (macOS / Windows / Linux) + Expo mobile.",
      "version": "0.1.0",
      "homepage": "hyper://25a06bb3dddec8138e9eda606cc4a11e9ebbe47815fd5d22064b30cff752bb5b/",
      "sourceUrl": "https://github.com/bigdestiny2/pearpaste",
      "license": "Apache-2.0",
      "verification": "relay-listed"
    },
    {
      "name": "PearPoker",
      "type": "hypersite",
      "driveKey": "850929ab0b7f1eb927dd69c6ae057af0a43fba1ced4c33e0df2e7cff0ee92268",
      "legacyMigrationId": "owr1ukamxhxm1j67p8dkhbm46n1d9qoh7igd8ag9f36x6dzjrjwy",
      "nativeDeliveryStatus": "migration-required",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48cGF0aCBkPSJNMzIgMTNDMjEgMjUgMTUgMjkgMTUgMzdhOCA4IDAgMCAwIDE0IDVjLTEgNC0zIDYtNiA5aDE4Yy0zLTMtNS01LTYtOWE4IDggMCAwIDAgMTQtNWMwLTgtNi0xMi0xNy0yNHoiIGZpbGw9IiMzZmI5NTAiLz48L3N2Zz4=",
      "author": "bigdestiny2",
      "categories": [
        "games",
        "social",
        "p2p"
      ],
      "description": "Peer-to-peer poker — play directly between players over Hyperswarm. No server, no house, no rake.",
      "version": "1.0.0",
      "license": "MIT",
      "verification": "relay-listed"
    },
    {
      "name": "Keet",
      "type": "hypersite",
      "legacyMigrationId": "oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo",
      "nativeDeliveryStatus": "migration-required",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48cGF0aCBkPSJNMTQgMjFhNiA2IDAgMCAxIDYtNmgyNGE2IDYgMCAwIDEgNiA2djE1YTYgNiAwIDAgMS02IDZIMjlsLTEwIDh2LThhNiA2IDAgMCAxLTUtNnoiIGZpbGw9IiNmYmJmMjQiLz48ZyBmaWxsPSIjMGEwZDEyIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI4LjUiIHI9IjIuNiIvPjxjaXJjbGUgY3g9IjMzIiBjeT0iMjguNSIgcj0iMi42Ii8+PGNpcmNsZSBjeD0iNDEiIGN5PSIyOC41IiByPSIyLjYiLz48L2c+PC9zdmc+",
      "author": "Holepunch",
      "categories": [
        "chat",
        "communication",
        "featured"
      ],
      "description": "End-to-end encrypted P2P chat, voice, and video calls.",
      "version": "1.0.0",
      "verification": "relay-listed"
    },
    {
      "name": "PearPass",
      "type": "hypersite",
      "legacyMigrationId": "tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo",
      "nativeDeliveryStatus": "migration-required",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48cmVjdCB4PSIxOCIgeT0iMzAiIHdpZHRoPSIyOCIgaGVpZ2h0PSIyMiIgcng9IjQiIGZpbGw9IiMzZmI5NTAiLz48cGF0aCBkPSJNMjQgMzB2LTZhOCA4IDAgMCAxIDE2IDB2NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2ZiOTUwIiBzdHJva2Utd2lkdGg9IjQiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjM5IiByPSIzLjQiIGZpbGw9IiMwYTBkMTIiLz48cmVjdCB4PSIzMC41IiB5PSIzOSIgd2lkdGg9IjMiIGhlaWdodD0iOCIgcng9IjEuNSIgZmlsbD0iIzBhMGQxMiIvPjwvc3ZnPg==",
      "author": "Tether",
      "categories": [
        "security",
        "utilities",
        "featured"
      ],
      "description": "Peer-to-peer password manager — synced across devices without a cloud.",
      "version": "1.0.0",
      "verification": "relay-listed"
    },
    {
      "name": "Peercord",
      "type": "standalone",
      "legacyMigrationId": "wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy",
      "nativeDeliveryStatus": "migration-required",
      "author": "Mastercodeon",
      "categories": [
        "chat",
        "communication",
        "social",
        "featured"
      ],
      "description": "Decentralized Discord-style chat powered by Pear Runtime and Hyperswarm. Text, voice, video, screen sharing, local identity, and P2P file transfer without central servers.",
      "version": "1.0.8",
      "homepage": "https://git.churchofmalware.org/mastercodeon/Peercord",
      "sourceUrl": "https://git.churchofmalware.org/mastercodeon/Peercord",
      "license": "GPL-3.0",
      "verification": "relay-listed"
    },
    {
      "name": "HiveWorm",
      "type": "standalone",
      "driveKey": "e3f910d11e70044afe361b1cecfb5cfb3c4f61f600cc81c2365ba0e6f58c8d4d",
      "link": "hyper://e3f910d11e70044afe361b1cecfb5cfb3c4f61f600cc81c2365ba0e6f58c8d4d/",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48ZyBmaWxsPSIjYTM3MWY3Ij48Y2lyY2xlIGN4PSIxOSIgY3k9IjQ0IiByPSI3Ii8+PGNpcmNsZSBjeD0iMjkiIGN5PSI0MCIgcj0iNyIvPjxjaXJjbGUgY3g9IjM5IiBjeT0iMzMiIHI9IjcuNSIvPjxjaXJjbGUgY3g9IjQ2IiBjeT0iMjQiIHI9IjgiLz48L2c+PGcgZmlsbD0iIzBhMGQxMiI+PGNpcmNsZSBjeD0iNDgiIGN5PSIyMiIgcj0iMS43Ii8+PGNpcmNsZSBjeD0iNDQiIGN5PSIyMC41IiByPSIxLjciLz48L2c+PC9zdmc+",
      "author": "HiveWorm",
      "categories": [
        "games"
      ],
      "description": "Perpetual P2P life-sim — a shared world that syncs directly between players over Hyperswarm. No server.",
      "version": "1.0.0",
      "verification": "unverified"
    },
    {
      "name": "anonGPT",
      "type": "hypersite",
      "legacyMigrationId": "rpzh3fsgg38kfir9nmae7x3o8ubofddzzixr5js4mxd6a6drb6wo",
      "nativeDeliveryStatus": "migration-required",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48cGF0aCBkPSJNMTQgMjFhNiA2IDAgMCAxIDYtNmgyNGE2IDYgMCAwIDEgNiA2djE1YTYgNiAwIDAgMS02IDZIMjlsLTEwIDh2LThhNiA2IDAgMCAxLTUtNnoiIGZpbGw9IiMyMmQzZWUiLz48cGF0aCBkPSJNMzMgMjBsMi4zIDUuNyA1LjcgMi4zLTUuNyAyLjMtMi4zIDUuNy0yLjMtNS43LTUuNy0yLjMgNS43LTIuM3oiIGZpbGw9IiMwYTBkMTIiLz48L3N2Zz4=",
      "author": "anonGPT",
      "categories": [
        "ai",
        "featured"
      ],
      "description": "Private P2P AI chat — pay-per-inference from a HiveMind seller, with signed receipts.",
      "version": "1.0.0",
      "verification": "relay-listed"
    },
    {
      "name": "Pear POS",
      "type": "hypersite",
      "driveKey": "b776f15f3e6860ecf6d923853c295350e55b708772e67d7124899b96aecfcd43",
      "legacyMigrationId": "myhk94sz7tokqcs58173xe7359c6nd9enwrm7z7xrthy9xsr7ehy",
      "nativeDeliveryStatus": "migration-required",
      "author": "Pear POS",
      "categories": [
        "business",
        "commerce",
        "featured"
      ],
      "description": "Peer-to-peer, offline-first point of sale — AI scanning, self-custodial USD₮ & Bitcoin, multi-terminal sync. $0 forever.",
      "version": "1.0.0",
      "verification": "relay-listed"
    },
    {
      "name": "Pear Tickets",
      "type": "hypersite",
      "driveKey": "ec309f516da659718746fe10ded086e2b6d157718c3e3651f86e07a4df34210a",
      "legacyMigrationId": "gsnmwo4kdopbcif44wgt9k1ysmwwn1erh4o1358kis1ebtwbpouy",
      "nativeDeliveryStatus": "migration-required",
      "iconData": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwYTBkMTIiLz48cGF0aCBkPSJNMTQgMjRoMzZhNCA0IDAgMCAxIDQgNHYxLjVhMy4yIDMuMiAwIDAgMCAwIDYuNFYzN2E0IDQgMCAwIDEtNCA0SDE0YTQgNCAwIDAgMS00LTR2LTEuMWEzLjIgMy4yIDAgMCAwIDAtNi40VjI4YTQgNCAwIDAgMSA0LTR6IiBmaWxsPSIjZmJiZjI0Ii8+PHBhdGggZD0iTTQwIDI2djEzIiBzdHJva2U9IiMwYTBkMTIiIHN0cm9rZS13aWR0aD0iMi40IiBzdHJva2UtZGFzaGFycmF5PSIzIDMiLz48L3N2Zz4=",
      "author": "bigdestiny2",
      "categories": [
        "commerce",
        "productivity"
      ],
      "description": "Offline-capable, signed-Hypercore event ticketing — Lightning, Cashu, and Stripe.",
      "version": "1.0.0",
      "verification": "relay-listed"
    }
  ]
}
