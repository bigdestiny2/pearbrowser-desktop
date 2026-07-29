# PearBrowser Desktop v0.6.1 — corrective release runbook

> Historical v2 operator record. It must not be reused to publish, launch, or
> recover current builds; use the verified native-package v3 release workflow.

Date: 2026-07-15
Tag: `v0.6.1`
Repo: `bigdestiny2/pearbrowser-desktop`
Production link: `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
Catalogue key: `f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`
Website Hyperdrive key: `03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f`

This patch is complete only when source, stable Pear bytes, live catalogue,
GitHub release, native packages, `pearbrowser.com`, and its Hyperdrive mirror
all advertise the same version and pass fresh-reader checks.

## Release blockers being corrected

- The live catalogue and embedded offline seed advertised PearBrowser `0.4.5`.
- The normalized Linux asset for `v0.6.0` contained AppImageTool; the actual
  PearBrowser image was attached under an extra suffixed filename.

## Preflight

```sh
npm test
npm audit --audit-level=high
git diff --check
npm run check:appling-release -- --tag v0.6.1
npm run check:linux-appimage-metadata -- --json
```

The Linux packaging fixture must prove that an adjacent
`appimagetool-*.AppImage` is ignored and `PearBrowser.AppImage` becomes the only
normalized Linux product. The live catalogue verifier is expected to fail until
the publisher is updated to `0.6.1`.

## Coordinated publication order

1. Merge the tested source candidate to `main` and record `SOURCE_REF`.
2. Publish the stable Pear production link with `./scripts/release-prod.sh`.
3. Record the new Pear length in README and this runbook; merge that record.
4. Publish the live Hyperbee catalogue from
   `catalog-source/pearbrowser-network.catalog.json` using the persistent
   publisher storage.
5. Tag the exact release-source commit `v0.6.1` and create the GitHub release.
6. Run `desktop-native-release.yml` in `package-proof` mode.
7. Inspect the Linux AppImage contents and verify all package checksums and
   embedded versions before publishing website download metadata.
8. Update and deploy `pearbrowser.com`, then republish its stable Hyperdrive
   mirror.

## Required fresh-reader evidence

```sh
node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm
npm run check:native-release-assets -- --tag v0.6.1 --repo bigdestiny2/pearbrowser-desktop --require-backfill-formats
npm run verify:native-downloads -- --tag v0.6.1 --repo bigdestiny2/pearbrowser-desktop --all
```

Additionally verify:

- stable Pear package metadata reports `0.6.1` at the newly released length;
- the live catalogue row reports `0.6.1`, the stable Pear link, and the current
  website Hyperdrive homepage;
- the Linux archive extracts to `usr/bin/pearbrowser` and is not AppImageTool;
- macOS and Windows package metadata reports `0.6.1`;
- GitHub README, release page, `pearbrowser.com`, and the website Hyperdrive
  mirror expose the same version, links, file sizes, and SHA-256 values.

## Final record

- Runtime publication source: `d71ba5eed973706bc02eeeab1e7b62898870e566`
- Release source/tag target: `d5511bbbd2f9d7b58f018624180c96ade9a17eb7`
- Stable Pear length: `63165` (from `63158`); fresh-peer exact-length and
  `/index.html` read passed with five peers, plus five HiveRelay pin acceptances
- GitHub release: <https://github.com/bigdestiny2/pearbrowser-desktop/releases/tag/v0.6.1>;
  published as latest with 16 checksum-verifiable assets
- Native workflow: package-proof run `29428784689` passed for macOS arm64/x64,
  Windows x64, and Linux x64; public download verification passed for all four
  primary artifacts. The automatic public-trust run `29430716284` failed closed
  on the intentionally missing macOS/Windows signing credentials and was
  cancelled after that expected gate.
- Live catalogue length: `290`; fresh reader reported PearBrowser `0.6.1`, the
  stable Pear link, current website Hyperdrive, 14 apps, and four peers
- Website deployment: `bigdestiny2/pearbrowser-com` merge
  `d62fa5ebce2db16864163ec4da8df2dd6c3ed660`; production
  `pearbrowser.com` returned `v0.6.1`, length `63165`, and the exact native asset
  filenames, sizes, and SHA-256 values
- Website Hyperdrive publication: stable key
  `03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f`,
  length `79`; five HiveRelay pin acceptances, followed by a cold extraction and
  a fresh-peer `index.html` read with ten connected peers
