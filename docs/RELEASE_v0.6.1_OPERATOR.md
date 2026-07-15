# PearBrowser Desktop v0.6.1 — corrective release runbook

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

- Release source: pending
- Stable Pear length: pending
- GitHub release: pending
- Native workflow: pending
- Live catalogue length: pending
- Website deployment: pending
- Website Hyperdrive publication: pending
