# PearBrowser Desktop v0.7.1 — release runbook

> Historical v2 operator record. It must not be reused to publish, launch, or
> recover current builds; use the verified native-package v3 release workflow.

Date: 2026-07-16
Tag: `v0.7.1`
Repo: `bigdestiny2/pearbrowser-desktop`
Production link: `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
Catalogue key: `f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`
Website Hyperdrive key: `03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f`

This corrective release is complete only when the source, stable Pear bytes,
live catalogue, GitHub release/assets, `pearbrowser.com`, and website
Hyperdrive mirror all advertise `v0.7.1` and pass their fresh-reader checks.

## Fix anchors

- Renderer RPC rejects all pending calls immediately on socket close/error.
- The authenticated renderer retries with bounded backoff while the backend
  preserves its Corestore and event buffer for eight seconds.
- The reconnect screen remounts the app only after the RPC handshake returns.
- Failed initial WebSocket candidates are destroyed before scanning the next
  RPC port.

## Verified candidate evidence

- Focused transport and packaging tests: `64/64`.
- Complete desktop suite: `681/681`.
- Runtime smoke: DHT connected, proxy ready, 21 HiveRelay connections.
- Controlled renderer reload: replacement backend/port handoff observed,
  followed by `renderer reconnected within grace period`.
- Post-reload RPCs: commands `31`, `80`, `83`, and `40` all passed in `1–2 ms`.

## Coordinated publication order

1. Merge and tag the tested source candidate.
2. Publish the stable Pear production link with `./scripts/release-prod.sh`.
3. Publish catalogue version `9` with PearBrowser `0.7.1` and verify it from a
   fresh reader.
4. Create the GitHub `v0.7.1` release from
   `docs/RELEASE_NOTES_v0.7.1.md`, run package-proof native builds, and verify
   every attached asset against its SHA-256 sidecar.
5. Update/deploy `pearbrowser.com`, then publish and fresh-read the tracked-only
   website Hyperdrive mirror.
6. Record exact source refs, drive lengths, workflow URLs, and website evidence
   below.

## Final record

- Source merge/tag: hotfix PR
  [#65](https://github.com/bigdestiny2/pearbrowser-desktop/pull/65) / merge
  `3afe35c0337daa4f3ebce7270842b563f066bd55`; publication record PR
  [#66](https://github.com/bigdestiny2/pearbrowser-desktop/pull/66) / tagged commit
  `d2db5f028c1b307a3cb65e141494078c57f85577`.
- Stable Pear length: `92835` (from `78006`); five relays accepted the seed
  request. A fresh peer found seven peers, reached the exact length, and read
  `/index.html` (451 bytes). A signed HiveRelay storage proof was unavailable
  because the relay returned `ROUTE_NOT_FOUND: storage-proof.prove`; the direct
  fresh-peer content check passed.
- Live catalogue length/version: `324`, version `9` (from length `307`, version
  `8`); five relays accepted the seed request. A fresh reader found five peers,
  verified the signed metadata, all 14 application rows, PearBrowser `0.7.1`,
  and the expected Peercord, peerit, and HiveWorm entries.
- GitHub release/workflow:
  [v0.7.1](https://github.com/bigdestiny2/pearbrowser-desktop/releases/tag/v0.7.1);
  package-proof [run 29503613273](https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/29503613273)
  passed all four targets and attached 16 assets with zero structural warnings.
  All four product packages were downloaded and matched their SHA-256 sidecars
  and advertised byte sizes.
- Website deploy: [pearbrowser.com PR #5](https://github.com/bigdestiny2/pearbrowser-com/pull/5) /
  `4609dc7caf415cef65aecd4aae563a552855b477`; Vercel and Pages deployment
  checks passed, and production HTML plus byte-identical `downloads.json`
  returned `v0.7.1`, length `92835`, and the verified package metadata.
- Website Hyperdrive length: `140` (from `126`); five relays accepted the seed
  request. A fresh peer found five peers, read `/index.html` (42,177 bytes),
  and extracted exactly 14 tracked files (171.8 KB). The extracted tree matched
  the publish tree byte-for-byte, its sync check passed, and `/.git` was absent.
  A signed relay storage proof was unavailable because the connected relay did
  not expose the storage-proof service; direct fresh-peer verification passed.
