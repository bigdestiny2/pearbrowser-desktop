# PearBrowser Desktop v0.7.1 — release runbook

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

- Source merge/tag: pending
- Stable Pear length: pending (from `78006`)
- Live catalogue length/version: pending (from length `307`, version `8`)
- GitHub release/workflow: pending
- Website deploy: pending
- Website Hyperdrive length: pending (from `126`)
