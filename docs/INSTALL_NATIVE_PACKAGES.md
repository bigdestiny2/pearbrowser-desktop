# Install Native Packages

Latest published release: `v0.9.0`.

Current release candidate: `v0.9.1`. Do not treat `v0.9.1` as downloadable or
live until its GitHub Release is published and the public-download verifier
passes. Signing credentials and clean-host evidence are still external release
prerequisites.

Package-proof builds are ad-hoc/unsigned GitHub Actions artifacts for release
engineering only. They are never attached to or published as a GitHub Release
and are not end-user downloads.

## `v0.9.1` public-trust packages

Once the `v0.9.1` public-trust release is published, use these formats:

| Machine | Installer | Companion artifact |
| --- | --- | --- |
| macOS Apple Silicon | `PearBrowser-0.9.1-macos-arm64.dmg` | `PearBrowser-0.9.1-macos-arm64.app.zip` |
| macOS Intel | `PearBrowser-0.9.1-macos-x64.dmg` | `PearBrowser-0.9.1-macos-x64.app.zip` |
| Windows x64 | `PearBrowser-0.9.1-windows-x64.exe` | Authenticode-signed NSIS installer |
| Linux x64 | `PearBrowser-0.9.1-linux-x64.AppImage` | executable AppImage |

Every listed file must have a matching `.sha256` sidecar. The macOS app archive
and DMG must be Developer ID signed and notarized; the DMG must be stapled. The
Windows NSIS installer must report a valid Authenticode signature. Linux uses
checksum verification.

After publication, resolve the recommended artifact for the current machine:

```sh
npm run resolve:native-release -- \
  --tag v0.9.1 \
  --repo bigdestiny2/pearbrowser-desktop
```

Release operators must verify all public downloads before sharing the release:

```sh
npm run verify:native-downloads -- \
  --tag v0.9.1 \
  --repo bigdestiny2/pearbrowser-desktop \
  --all
```

## Verify the download

Download the artifact and its identically named `.sha256` sidecar from the
published `v0.9.1` GitHub Release.

macOS:

```sh
shasum -a 256 -c PearBrowser-0.9.1-macos-arm64.dmg.sha256
codesign --verify --deep --strict --verbose=2 /Applications/PearBrowser.app
xcrun stapler validate /Applications/PearBrowser.app
spctl --assess --type execute --verbose /Applications/PearBrowser.app
```

Use `x64` instead of `arm64` on an Intel Mac. Run the signature commands after
copying `PearBrowser.app` to `/Applications`.

Windows PowerShell:

```powershell
$package = "PearBrowser-0.9.1-windows-x64.exe"
$expected = (Get-Content "$($package).sha256").Split(" ")[0].ToLowerInvariant()
$actual = (Get-FileHash $package -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "SHA-256 mismatch for $package" }

$signature = Get-AuthenticodeSignature $package
$signature | Format-List
if ($signature.Status -ne "Valid") { throw "Authenticode signature is not valid" }
```

Linux:

```sh
sha256sum -c PearBrowser-0.9.1-linux-x64.AppImage.sha256
```

Stop if a checksum or signature check fails. Do not bypass an unexpected OS
trust warning on a public-trust build.

## Install

### macOS

1. Open the architecture-matched `.dmg`.
2. Drag `PearBrowser.app` to `/Applications`.
3. Verify the signature, notarization staple, and Gatekeeper assessment.
4. Open PearBrowser from Finder.

### Windows

1. Run `PearBrowser-0.9.1-windows-x64.exe`.
2. Confirm Windows reports a valid signed publisher before continuing.
3. Complete the NSIS installer and launch PearBrowser from the Start menu.

### Linux

```sh
chmod +x PearBrowser-0.9.1-linux-x64.AppImage
./PearBrowser-0.9.1-linux-x64.AppImage
```

## Data and upgrades

Installing a native package must not require deleting the existing PearBrowser
profile. Back up important data before changing versions, then confirm tabs,
bookmarks, history, identity, and application state after first launch.

Runtime OTA download/apply is intentionally disabled. The retained Pear
`upgrade` identity is a migration record, not an update channel, until the Pear
v3 production identity, signer roster, provision, and multisig ceremony are
independently verified. Use verified native installers for upgrades and
rollback until that gate is complete.

See [Pear v3 migration](./PEAR_V3_MIGRATION.md) for legacy-data guidance and
[Native release packaging](./NATIVE_RELEASE_PACKAGING.md) for the operator
contract.

## Historical packages

Older releases used a different native-launcher experiment and different
Windows package formats. Those downloads are historical migration inputs, not
the `v0.9.1` package contract. Never substitute an older launcher artifact for
the reviewed Electron application.
