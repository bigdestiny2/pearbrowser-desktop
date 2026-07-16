# PearBrowser Desktop v0.7.0 — release runbook

Date: 2026-07-16
Tag: `v0.7.0`
Repo: `bigdestiny2/pearbrowser-desktop`
Production link: `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
Catalogue key: `f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`
Website Hyperdrive key: `03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f`

This release is complete only when source, stable Pear bytes, the live
catalogue, GitHub release/assets, `pearbrowser.com`, and the website Hyperdrive
mirror all advertise `v0.7.0` and pass fresh-reader checks.

## Feature anchors

- Default filter list: `842fb9e64c1c2092ec426151fd4f9ffb23a2efcae26ff3dd61d5d564ed58d99f`
- Pear Dark Reader: `bbde8330169798dc5e0d08f8909b407cea2f8fec7e31d6241f479c714ad42082`
- peerit Enhancer: `1b21d8a6960bdcdfb76da94b80dae0d1a28247516de87e6839ea2f87bb609e10`
- Pear Plugins catalogue: `01b7473601a6a6a58ec240b1c4ef0cdcf1aef0f6f8bf7ff16636faecb640ad13`

All four drives were published, pinned, and fresh-peer verified on 2026-07-16.

## Preflight

```sh
npm test
npm audit --audit-level=high
git diff --check
npm run check:appling-release -- --tag v0.7.0
npm run check:linux-appimage-metadata -- --json
```

## Coordinated publication order

1. Merge the tested source candidate to `main` and record `SOURCE_REF`.
2. Publish the stable Pear production link with `./scripts/release-prod.sh`.
3. Record the new Pear length in README and this runbook; merge that record.
4. Publish the live Hyperbee catalogue from
   `catalog-source/pearbrowser-network.catalog.json` using persistent publisher
   storage.
5. Tag the exact release-source commit `v0.7.0` and create the GitHub release
   from `docs/RELEASE_NOTES_v0.7.0.md`.
6. Run `desktop-native-release.yml` in `package-proof` mode and verify every
   attached package against its SHA-256 sidecar.
7. Update and deploy `pearbrowser.com` from the verified asset metadata.
8. Re-publish the website's stable Hyperdrive mirror.

## Required evidence

- Full desktop test suite, high-severity npm audit, diff check, appling metadata,
  and Linux metadata pass on the tagged source.
- Stable Pear exact length is reachable from a cold metadata reader. On the
  firewalled publisher host, the known same-NAT blob-probe false negative is
  replaced by the durable-seeder gate: a fresh announce plus live remote peers
  actively pulling release bytes. HiveRelay pin acceptance is recorded without
  claiming unavailable signed storage proof.
- Live catalogue reports PearBrowser `0.7.0`, the stable Pear link, and the
  current website Hyperdrive homepage.
- GitHub release exposes one product package per supported target plus matching
  SHA-256 sidecars and manifests.
- `pearbrowser.com` and its Hyperdrive mirror expose the same version, length,
  filenames, byte sizes, and hashes.

## Final record

- Source PR/merge: [#62](https://github.com/bigdestiny2/pearbrowser-desktop/pull/62) / `924823b88363797f2cff24bd57391086f16d938e`
- Stable Pear length: `78006` (from `63165`); cold metadata read matched, two pin refreshes received five relay acceptances each, and the durable seeder re-announced with 4–6 live remote peers pulling more than 2 GB after restart
- Live catalogue length: `307` (catalogue version `8`); signed metadata and all 14 rows verified from four fresh-network peers
- GitHub release/workflow: pending
- Website deploy: pending
- Website Hyperdrive length: pending
