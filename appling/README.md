# PearBrowser Desktop appling

Native release wrapper for PearBrowser Desktop. This appling points at the
stable production Pear link:

```text
pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty
```

## Building

The GitHub Actions workflow `.github/workflows/desktop-native-release.yml`
builds macOS, Windows, and Linux release artifacts and attaches them to the
matching GitHub release. To build locally:

```console
npm i -g bare-make
npm i
npm run generate
npm run build
cd ..
npm run package:appling -- --tag v0.5.0
```

Run `npm run check:appling-release -- --tag v0.5.0` before cutting a release.
It verifies that `CMakeLists.txt` uses the same version as the desktop package
and the same Pear key as `pear.json`.

See `../docs/NATIVE_RELEASE_PACKAGING.md` for the release workflow and asset
upload contract.

## License

Apache-2.0
