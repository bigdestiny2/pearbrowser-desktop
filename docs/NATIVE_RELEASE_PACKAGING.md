# Native Release Packaging

PearBrowser Desktop ships through the stable Pear production link, and the
`appling/` project wraps that link in native macOS, Windows, and Linux launchers.
The GitHub release should not be assetless: every release tag needs native
artifacts plus checksums.

## Backfill v0.5.0

Use the manual GitHub Actions trigger:

1. Open **Actions -> Desktop Native Release**.
2. Run the workflow with tag `v0.5.0`.
3. Wait for the macOS, Windows, and Linux jobs to finish.
4. Confirm the `v0.5.0` GitHub release has the generated installers, per-file
   `.sha256` files, `SHA256SUMS-*`, and `manifest-*` files attached.

The target GitHub release must already exist. The attach job verifies the
downloaded bundle has one checksum index and one manifest for each desktop
platform, then uploads the generated assets with `gh release upload --clobber`.
If the release tag is mistyped or the release is missing, the workflow fails
without creating a new release.

The attach job uses `gh release upload --clobber`, so rerunning the workflow
refreshes broken or stale assets for the same tag instead of creating duplicate
release entries.

## Local Build

```sh
npm run check:appling-release -- --tag v0.5.0
npm install -g bare-make
cd appling
npm install
npm run generate
npm run build
cd ..
npm run package:appling -- --tag v0.5.0
```

The collector searches `appling/build` for platform-native outputs:

- macOS: `.dmg`, `.pkg`, `.zip`, or a zipped `.app` bundle
- Windows: `.exe`, `.msi`, or `.zip`
- Linux: `.AppImage`, `.deb`, `.rpm`, `.snap`, `.tar.*`, or `.zip`

Each copied asset is renamed to `PearBrowser-<version>-<platform>-<arch>.*` and
gets a SHA-256 sidecar. The workflow uploads exactly those collected files.

## Metadata Contract

`scripts/check-appling-release.mjs` fails the workflow when:

- the requested tag does not match `package.json` version
- `appling/CMakeLists.txt` does not match the production Pear key in `pear.json`
- the appling CMake version is stale
- the appling package no longer exposes `generate`, `build`, and `package`

This keeps the native wrappers pinned to the same release that was staged and
verified with `scripts/release-prod.sh`.

## Signing

The current workflow produces unsigned artifacts. Signing can be layered in once
the release credentials exist:

- macOS: add Developer ID certificate import and configure CMake signing before
  `npm run --prefix appling build`
- Windows: add certificate import or signtool signing before collection
- Linux: attach package checksums; no signing is required for the current path

Do not attach hand-built local installers to a public release unless the
corresponding workflow job cannot run and the manual build command plus checksum
output is recorded in the release evidence log.
