# pear-appling

Template repository for creating Pear applings.

## Building

The GitHub Actions workflow `.github/workflows/desktop-native-release.yml`
builds macOS, Windows, and Linux release artifacts and attaches them to the
matching GitHub release. The current `cmake-pear` toolchain emits a macOS
`.app` bundle, Windows `.msix`, and Linux `.AppImage`; the root collector zips
the `.app` bundle and adds checksums/manifests. To build locally:

```console
npm ci
npm run generate
npm run build
cd ..
npm run package:appling -- --tag v0.5.0
```

macOS local builds are ad-hoc signed by default. Public macOS distribution needs
the GitHub Actions Developer ID and notary secrets documented in
`../docs/NATIVE_RELEASE_PACKAGING.md`; when they are present, CI imports the
certificate, signs, notarizes, staples, and re-verifies before collecting the
`.app.zip`.

Windows builds skip SignTool unless `PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT` is
set or a PFX certificate is imported by CI. The default unsigned MSIX/EXE assets
are useful as packaging proof; public Windows distribution needs a certificate
whose subject matches `PEARBROWSER_WINDOWS_SIGNING_SUBJECT`.

Run `npm run check:appling-release -- --tag v0.5.0` before cutting a release.
It verifies that `CMakeLists.txt` uses the same version as the desktop package
and the same Pear key as `pear.json`.

Run `npm run check:native-signing -- --require-public-trust` from the repo root
before publishing public desktop assets. It validates that the macOS Developer
ID/notary and Windows PFX secret sets are complete before CI spends a release
run.

See `../docs/NATIVE_RELEASE_PACKAGING.md` for the release workflow and asset
upload contract.

## License

Apache-2.0
