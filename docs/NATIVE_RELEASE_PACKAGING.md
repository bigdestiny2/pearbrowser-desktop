# Native Release Packaging

PearBrowser Desktop ships through the stable Pear production link, and the
`appling/` project wraps that link in native macOS, Windows, and Linux launchers.
The GitHub release should not be assetless: every release tag needs native
artifacts plus checksums.

## Backfill v0.5.0

Use the manual GitHub Actions trigger:

1. Make sure the branch containing `.github/workflows/desktop-native-release.yml`
   has been merged to the default branch, otherwise GitHub will not expose the
   manual workflow trigger.
2. Open **Actions -> Desktop Native Release**.
3. Run the workflow with tag `v0.5.0` and `source_ref` set to the branch or
   commit that contains this packaging code, usually `main` after merge.
4. Wait for the macOS, Windows, and Linux jobs to finish.
5. Confirm the `v0.5.0` GitHub release has the generated installers, per-file
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
cd appling
npm ci
npm run generate
npm run build
cd ..
npm run package:appling -- --tag v0.5.0
```

The collector searches `appling/build` for platform-native outputs:

- macOS: `.dmg`, `.pkg`, `.zip`, or a zipped `.app` bundle. The current
  `cmake-pear` path emits a `.app` bundle that the collector zips as
  `.app.zip`.
- Windows: `.msix`, `.exe`, `.msi`, or `.zip`. The current `cmake-pear` path
  emits `.msix`.
- Linux: `.AppImage`, `.deb`, `.rpm`, `.snap`, `.tar.*`, or `.zip`

Each copied asset is renamed to `PearBrowser-<version>-<platform>-<arch>.*` and
gets a SHA-256 sidecar. The workflow uploads exactly those collected files.

`appling/package-lock.json` is committed on purpose. The native wrapper pulls in
`cmake-pear` plus platform packaging helpers; release CI must use
`npm ci --prefix appling` so a rerun for the same tag builds with the same
toolchain that was tested locally.

## Metadata Contract

`scripts/check-appling-release.mjs` fails the workflow when:

- the requested tag does not match `package.json` version
- `appling/CMakeLists.txt` does not match the production Pear key in `pear.json`
- the appling CMake version is stale
- the appling package no longer exposes `generate`, `build`, and `package`
- the native wrapper toolchain lockfile, pinned Bare headers, macOS ICNS asset,
  ad-hoc macOS signing default, or Windows unsigned-packaging fallback is
  missing

This keeps the native wrappers pinned to the same release that was staged and
verified with `scripts/release-prod.sh`.

## Signing

The current macOS workflow produces ad-hoc signed `.app.zip` artifacts so local
and CI builds verify without a private Apple certificate. The current Windows
workflow can package unsigned `.msix` artifacts without a private certificate.
Public trust signing is still a release-credential gate:

- macOS: import a Developer ID certificate, configure
  `PEARBROWSER_MACOS_SIGNING_IDENTITY` and optional
  `PEARBROWSER_MACOS_SIGNING_KEYCHAIN` before `npm run --prefix appling build`,
  then notarize before attaching public assets.
- Windows: add certificate import and configure the MSIX signing subject /
  thumbprint through `PEARBROWSER_WINDOWS_SIGNING_SUBJECT` and
  `PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT` before collection. If the thumbprint
  is empty, the build intentionally skips SignTool and uploads an unsigned MSIX
  package for packaging proof only.
- Linux: attach package checksums; no signing is required for the current
  AppImage path.

Do not attach hand-built local installers to a public release unless the
corresponding workflow job cannot run and the manual build command plus checksum
output is recorded in the release evidence log.
