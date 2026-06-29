# Native Release Packaging

PearBrowser Desktop ships through the stable Pear production link, and the
`appling/` project wraps that link in native macOS, Windows, and Linux launchers.
The GitHub release should not be assetless: every release tag needs native
artifacts plus checksums.

For the broader install/distribution plan, including package-proof versus
public-trust release lanes and channel expansion, see
[Packaging strategy](./PACKAGING_STRATEGY_2026-06-28.md).

## Backfill v0.5.0

Use the manual GitHub Actions trigger:

1. Make sure the branch containing `.github/workflows/desktop-native-release.yml`
   has been merged to the default branch, otherwise GitHub will not expose the
   manual workflow trigger.
2. Open **Actions -> Desktop Native Release**.
3. Run the workflow with tag `v0.5.0`, `source_ref` set to the branch or commit
   that contains this packaging code, usually `main` after merge, and
   `release_mode` set for the intended trust level:
   - `package-proof`: permits ad-hoc macOS signing and unsigned Windows assets.
   - `public-trust`: requires macOS Developer ID/notary credentials and Windows
     signing credentials before assets are uploaded for announcement.
4. Wait for the macOS Apple Silicon, macOS Intel, Windows, and Linux jobs to
   finish.
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
npm run check:linux-appimage-metadata
cd appling
npm ci
npm run generate
npm run build
cd ..
npm run package:appling -- --tag v0.5.0
npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop
npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop
npm run check:public-trust-readiness -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --source-ref <merged-main-commit>
```

The collector searches `appling/build` for platform-native outputs:

- macOS: `.dmg`, `.pkg`, `.zip`, or a zipped `.app` bundle. The current
  `cmake-pear` path emits a `.app` bundle that the collector zips as
  `.app.zip`. Public-trust macOS workflow runs also create a notarized `.dmg`
  before collection, so the same collector attaches both the user-facing DMG and
  the `.app.zip` fallback.
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
  Linux AppStream metainfo source, ad-hoc macOS signing default, or Windows
  unsigned-packaging fallback is missing

This keeps the native wrappers pinned to the same release that was staged and
verified with `scripts/release-prod.sh`.

## Release Asset Contract

`scripts/check-native-release-assets.mjs` is the post-upload guard for GitHub
release attachments. It reads `gh release view --json tagName,isDraft,isPrerelease,assets`
and fails unless the tag has macOS, Windows, and Linux native artifacts, one
`SHA256SUMS-<platform>-<arch>.txt`, one `manifest-<platform>-<arch>.json`, and a
per-artifact `.sha256` sidecar for every installer/package file. Use
`--require-published` before announcement if draft releases should fail the
gate. Use `--require-public-trust` for public-trust release checks; it requires
each macOS architecture to include a `.dmg` artifact.

The checker accepts multiple architecture bundles for one platform. Each
platform/architecture pair must have its own checksum index and manifest, so a
dual macOS release has separate `macos-arm64` and `macos-x64` records instead of
one ambiguous macOS checksum file.

`scripts/resolve-native-release-asset.mjs` is the user-facing selector for those
same attachments. It detects the current OS/CPU by default, or accepts
`--platform macos|windows|linux` and `--arch x64|arm64`, then prints the
recommended package plus its `.sha256` sidecar. Selection prefers public
installer formats when they exist: macOS `.dmg` before `.pkg` before
`.app.zip`, Windows `.exe` before `.msix`, and Linux `.AppImage` before distro
packages. The resolver fails if the package or checksum sidecar is missing, so
README install links cannot silently drift away from the release asset contract.

`scripts/generate-native-install-snippet.mjs` uses the same resolver ordering for
the four supported desktop targets and emits release-note/install-page Markdown
with package links, `.sha256` sidecar links, install notes, and the package-proof
or public-trust warning. Use it after the asset checker and download verifier,
so user-facing copy is generated from the release assets that actually shipped:

```sh
npm run -s generate:native-install-snippet -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop
```

`scripts/generate-native-install-smoke-plan.mjs` turns those same resolver
choices into clean-host smoke instructions. It emits per-target download,
checksum, OS trust, install, launch, downloaded runtime diagnostic, and
evidence-capture steps for macOS, Windows, and Linux. The default
`package-proof` mode records expected trust prompts; `--trust-mode public-trust`
refuses macOS assets unless the release has notarized DMGs. Use `--source-ref`
with the merged commit SHA when producing announcement evidence so clean hosts
fetch the exact `scripts/runtime-rpc-smoke.mjs` helper without needing a source
checkout:

```sh
npm run -s generate:native-install-smoke-plan -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --source-ref <merged-main-commit>
```

`scripts/generate-package-manager-manifests.mjs` prepares the later channel
expansion drafts from the attached release assets. It reads the macOS and
Windows `.sha256` sidecars, writes a Homebrew Cask draft and a WinGet singleton
manifest draft under `dist/package-manager-manifests/<tag>/`, and defaults to
`--trust-mode public-trust`. In that default mode it refuses package-proof macOS
`.app.zip` assets because Homebrew should not be submitted until the public
release has notarized `.dmg` assets. The WinGet `License` value defaults to the
root `package.json` SPDX expression (`Apache-2.0 AND MIT`) unless `--license`
is supplied. Use `--trust-mode package-proof` only for rehearsing the output
shape against the current package-proof release:

```sh
npm run generate:package-manager-manifests -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --trust-mode package-proof
```

`scripts/verify-native-downloads.mjs` is the stronger download-integrity check.
It resolves the recommended package for the current platform/architecture, or
all supported desktop targets with `--all`, downloads each package plus its
`.sha256` sidecar, streams the package through SHA-256, and fails on digest,
sidecar-name, or byte-count mismatch. Use it after a release asset backfill and
before publishing package-manager manifests. The public-trust native release
workflow runs this check automatically after uploading and verifying attached
release assets:

```sh
npm run verify:native-downloads -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --all
```

`scripts/check-linux-appimage-metadata.mjs` verifies the Linux desktop
integration metadata required before treating the AppImage as the long-term
public Linux package. Without arguments it validates the committed Linux icon
and AppStream metainfo source. The native release workflow runs it on Linux with
`--build-dir appling/build` after `npm run --prefix appling build`, so the
generated AppDir must contain `AppRun`, `PearBrowser.desktop`, `icon.png`, and
`usr/share/metainfo/io.github.bigdestiny2.pearbrowser.metainfo.xml` before
artifact collection:

```sh
npm run check:linux-appimage-metadata
npm run check:linux-appimage-metadata -- --build-dir appling/build
```

`scripts/check-public-trust-readiness.mjs` is the operator-facing summary gate
for announcement readiness. It runs the public-trust signing preflight, the
published public-trust release asset checker, byte-level download verification,
the Linux AppImage metadata checker, the public-trust clean-install smoke-plan
generator, the package-manager draft generator in dry-run mode, and the operator
evidence-log checker, then reports all blockers in one JSON or human-readable
result. Use `--source-ref` with the merged commit SHA so the nested
clean-install smoke plan downloads the exact runtime RPC smoke helper:

```sh
npm run check:public-trust-readiness -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --source-ref <merged-main-commit>
```

This command should remain blocked for the current package-proof `v0.5.0`
assets until Developer ID/notary credentials, Windows signing credentials,
notarized macOS DMGs, clean-machine install evidence, and the final announcement
decision are all present.

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
  notarization ticket, re-verifies codesign, creates a drag-to-Applications
  `.dmg`, submits and staples the DMG when notary credentials are present, and
  only then collects the public `.dmg` plus `.app.zip` fallback assets.
  `PEARBROWSER_MACOS_KEYCHAIN_PASSWORD` is optional; the run id is used when it
  is absent.
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

The GitHub workflow mirrors this split. Manual `workflow_dispatch` runs default
to `release_mode=package-proof` so maintainers can refresh packaging assets
without private credentials. Release-published and tag-triggered runs default to
`release_mode=public-trust`, and manual runs can select `public-trust`
explicitly. In public-trust mode, the workflow adds
`--require-public-trust` to `scripts/check-native-signing-credentials.mjs` and
adds `--require-published --require-public-trust` to the post-upload release
asset check.

Do not attach hand-built local installers to a public release unless the
corresponding workflow job cannot run and the manual build command plus checksum
output is recorded in the release evidence log.
