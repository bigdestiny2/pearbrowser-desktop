# PearBrowser Desktop appling

Native release wrapper for PearBrowser Desktop. This appling points at the
stable production Pear link:

```text
pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty
```

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

macOS local builds are ad-hoc signed by default. Public macOS distribution still
needs a Developer ID identity, notarization, and the matching CMake signing
cache values wired into CI.

Windows builds skip SignTool unless `PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT` is
set. The default unsigned MSIX is useful as packaging proof; public Windows
distribution still needs a certificate whose subject matches
`PEARBROWSER_WINDOWS_SIGNING_SUBJECT`.

Run `npm run check:appling-release -- --tag v0.5.0` before cutting a release.
It verifies that `CMakeLists.txt` uses the same version as the desktop package
and the same Pear key as `pear.json`.

See `../docs/NATIVE_RELEASE_PACKAGING.md` for the release workflow and asset
upload contract.

## License

Apache-2.0
