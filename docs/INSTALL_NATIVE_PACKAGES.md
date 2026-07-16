# Install Native Packages

Current release: `v0.7.1`.

These are package-proof desktop builds. Linux uses checksums only. macOS is
ad-hoc signed but not notarized, and Windows packages are unsigned until the
public-trust signing credentials are configured. Treat macOS/Windows OS trust
prompts as expected for this release lane, not as the final public-trust
experience. On macOS, Gatekeeper may say Apple could not verify that
PearBrowser is free of malware until a signed and notarized DMG is published.

## Choose A Package

Download directly from the
[`v0.7.1` GitHub release](https://github.com/bigdestiny2/pearbrowser-desktop/releases/tag/v0.7.1).

| Machine | Recommended package | Checksum sidecar |
| --- | --- | --- |
| macOS Apple Silicon | [PearBrowser-0.7.1-macos-arm64.app.zip](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-macos-arm64.app.zip) | [PearBrowser-0.7.1-macos-arm64.app.zip.sha256](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-macos-arm64.app.zip.sha256) |
| macOS Intel | [PearBrowser-0.7.1-macos-x64.app.zip](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-macos-x64.app.zip) | [PearBrowser-0.7.1-macos-x64.app.zip.sha256](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-macos-x64.app.zip.sha256) |
| Windows x64 | [PearBrowser-0.7.1-windows-x64.msix](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-windows-x64.msix) | [PearBrowser-0.7.1-windows-x64.msix.sha256](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-windows-x64.msix.sha256) |
| Linux x64 | [PearBrowser-0.7.1-linux-x64.AppImage](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-linux-x64.AppImage) | [PearBrowser-0.7.1-linux-x64.AppImage.sha256](https://github.com/bigdestiny2/pearbrowser-desktop/releases/download/v0.7.1/PearBrowser-0.7.1-linux-x64.AppImage.sha256) |

The Linux release contains exactly one product AppImage. Packaging now rejects
ambiguous AppImages and excludes build tools such as AppImageTool.

For the future public-trust macOS lane, the resolver will prefer notarized
`.dmg` assets over `.app.zip` once those assets are attached by the signed
native release workflow.

From a source checkout, ask the resolver for the current machine:

```sh
npm run resolve:native-release -- --tag v0.7.1 --repo bigdestiny2/pearbrowser-desktop
```

Or specify a target:

```sh
npm run resolve:native-release -- --tag v0.7.1 --repo bigdestiny2/pearbrowser-desktop --platform macos --arch x64
```

Release operators can verify every recommended package download and checksum
sidecar in one pass:

```sh
npm run verify:native-downloads -- --tag v0.7.1 --repo bigdestiny2/pearbrowser-desktop --all
```

Release operators can regenerate this guide from the same resolver rules:

```sh
npm run -s generate:native-install-guide -- --tag v0.7.1 --repo bigdestiny2/pearbrowser-desktop
```

## Verify The Download

macOS and Linux:

```sh
shasum -a 256 -c PearBrowser-0.7.1-macos-arm64.app.zip.sha256
```

Use the matching filename for your package. A passing check prints `OK`.

Windows PowerShell:

```powershell
$package = "PearBrowser-0.7.1-windows-x64.msix"
$expected = (Get-Content "$($package).sha256").Split(" ")[0].ToLowerInvariant()
$actual = (Get-FileHash $package -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "SHA-256 mismatch for $package" }
```

## Install

macOS:

1. Unzip the `.app.zip`.
2. Move `PearBrowser.app` to `/Applications`.
3. Verify the SHA-256 sidecar for the downloaded archive before first launch.
4. Open it from Finder. For package-proof builds, macOS may show an unidentified
   developer or malware-verification warning because the app is not notarized.
5. If the first launch is blocked, use Control-click `PearBrowser.app` -> Open
   -> Open, or open System Settings -> Privacy & Security and choose Open Anyway
   for PearBrowser. Continue only if you intentionally trust this package and
   its checksum.

Windows:

1. Install `PearBrowser-0.7.1-windows-x64.msix`.
2. For package-proof builds, Windows SmartScreen may warn because the installer
   is not yet Authenticode-signed. Continue only if you intentionally trust this
   package and its checksum.

Linux:

```sh
chmod +x PearBrowser-0.7.1-linux-x64.AppImage
./PearBrowser-0.7.1-linux-x64.AppImage
```

## Recovery Fallback

The stable Pear link remains available for testers and recovery while native
packaging matures:

```sh
npm i -g pear
pear
pear run pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty
```

This fallback is not the preferred public install path because `pear run` is
deprecated in Pear runtime `v2.4.0`, but it is still useful when diagnosing a
native package issue.
