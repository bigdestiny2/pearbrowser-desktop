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
6. Verify the attached asset set:
   `npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop`.
7. Confirm the user-facing asset selector resolves the expected package for the
   current machine:
   `npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop`.

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
npm run check:native-signing
cd appling
npm ci
npm run generate
npm run build
cd ..
npm run package:appling -- --tag v0.5.0
npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop
npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop
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

## Release Asset Contract

`scripts/check-native-release-assets.mjs` is the post-upload guard for GitHub
release attachments. It reads `gh release view --json tagName,isDraft,isPrerelease,assets`
and fails unless the tag has macOS, Windows, and Linux native artifacts, one
`SHA256SUMS-<platform>-<arch>.txt`, one `manifest-<platform>-<arch>.json`, and a
per-artifact `.sha256` sidecar for every installer/package file. Use
`--require-published` before announcement if draft releases should fail the
gate.

`scripts/resolve-native-release-asset.mjs` is the user-facing selector for those
same attachments. It detects the current OS/CPU by default, or accepts
`--platform macos|windows|linux` and `--arch x64|arm64`, then prints the
recommended package plus its `.sha256` sidecar. Selection prefers public
installer formats when they exist: macOS `.dmg` before `.pkg` before
`.app.zip`, Windows `.exe` before `.msix`, and Linux `.AppImage` before distro
packages. The resolver fails if the package or checksum sidecar is missing, so
README install links cannot silently drift away from the release asset contract.

## Signing

The current macOS workflow produces ad-hoc signed `.app.zip` artifacts so local
and CI builds verify without a private Apple certificate. The current Windows
workflow can package unsigned `.msix` artifacts without a private certificate.
Public trust signing is still a release-credential gate:

- macOS: add `PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64`,
  `PEARBROWSER_MACOS_CERTIFICATE_PASSWORD`,
  `PEARBROWSER_MACOS_SIGNING_IDENTITY`,
  `PEARBROWSER_MACOS_NOTARY_APPLE_ID`,
  `PEARBROWSER_MACOS_NOTARY_PASSWORD`, and
  `PEARBROWSER_MACOS_NOTARY_TEAM_ID` as GitHub Actions secrets. The workflow
  imports the Developer ID certificate into a temporary keychain, passes that
  keychain to CMake signing, submits the built `.app` to notarytool, staples the
  notarization ticket, re-verifies codesign, and only then collects the public
  `.app.zip` asset. `PEARBROWSER_MACOS_KEYCHAIN_PASSWORD` is optional; the run
  id is used when it is absent.
- Windows: add `PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64` and
  `PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD` as GitHub Actions secrets, plus
  optional `PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT` and
  `PEARBROWSER_WINDOWS_SIGNING_SUBJECT`. If the thumbprint is empty, the
  workflow uses the imported certificate thumbprint. If the thumbprint remains
  empty, the build intentionally skips SignTool and uploads unsigned Windows
  packages for packaging proof only. When signing is configured, the workflow
  signs additional `.exe` installer artifacts and verifies Windows installer
  signatures before collection.
- Linux: attach package checksums; no signing is required for the current
  AppImage path.

Before spending a native release run on public distribution, validate the
credential payload set:

```sh
npm run check:native-signing -- --require-public-trust
```

Without `--require-public-trust`, the command accepts the packaging-proof path:
macOS can remain ad-hoc signed, Windows can remain unsigned, and Linux relies on
checksums. With `--require-public-trust`, macOS must have the Developer ID
certificate pair, a real signing identity, and the notary credential trio;
Windows must have the PFX certificate pair; Linux remains checksum-only.

Do not attach hand-built local installers to a public release unless the
corresponding workflow job cannot run and the manual build command plus checksum
output is recorded in the release evidence log.
