# PearBrowser Packaging Strategy - 2026-06-28

Scope: make PearBrowser installable on macOS, Windows, and Linux with the fewest user decisions possible, while keeping the stable Pear release link as the OTA content channel. Mobile/native remains a sibling release lane because it has store and device-signing gates.

Primary user promise: download one native package, launch it normally, and let PearBrowser's stable Pear key keep app content current after install.

## Current State

- GitHub release `v0.5.0` has native desktop assets, SHA-256 sidecars, checksum indexes, and platform manifests.
- `scripts/resolve-native-release-asset.mjs` chooses the recommended release package for the current or requested platform and verifies the checksum sidecar exists.
- `.github/workflows/desktop-native-release.yml` builds macOS, Windows, and Linux packages in CI.
- The native workflow now has two modes:
  - `package-proof`: manual default, permits ad-hoc macOS signing and unsigned Windows packages.
  - `public-trust`: required for announcement-ready assets, requires macOS Developer ID/notary credentials, Windows signing credentials, and a published GitHub release.
- Source installs are standalone because the HiveRelay `0.20.0` packages are vendored under `vendor/hiverelay`.

## Distribution Model

Use three lanes, with stricter gates as the audience widens:

| Lane | Audience | Artifact source | Trust level | Gate |
| --- | --- | --- | --- | --- |
| Source checkout | contributors and debuggers | `npm install`, `pear`, local scripts | developer trust | `npm test`, vendored HiveRelay guard, high-severity audit |
| Package proof | internal testers and packaging validation | GitHub release assets from manual workflow | checksum trust plus OS warnings where unsigned | native workflow `release_mode=package-proof`, asset checker, smoke evidence |
| Public trust | public desktop users | GitHub release assets, then package managers | OS code-signing trust plus checksums | native workflow `release_mode=public-trust`, notarization/signing verification, published release check |

The stable Pear link is still the application-content update channel. Native packages should change only when the wrapper, OS integration, permissions, icons, signing, or runtime shell changes.

## Platform Targets

| Platform | Now | Public-trust target | Later channel |
| --- | --- | --- | --- |
| macOS | ad-hoc signed `.app.zip` | Developer ID signed and notarized `.dmg`, with stapled ticket and SHA-256 sidecar | Homebrew Cask after the `.dmg` URL and checksum are stable |
| Windows | unsigned `.exe` and `.msix` package proof | Authenticode-signed `.exe` and `.msix`, timestamped and verified in CI | WinGet manifest after the signed installer URL and `InstallerSha256` are stable |
| Linux | `.AppImage` plus checksums | `.AppImage` remains primary, with desktop file/icon/AppStream metadata checked | `.deb`/`.rpm` only if user demand or distro policy warrants it |
| iOS | simulator and native-shell evidence only | TestFlight/App Store validation after production Apple signing | App Store |
| Android | emulator and disposable release signing evidence | production upload/release keystore plus Play/Firebase validation | Google Play or Firebase App Distribution |

## Public-Trust Desktop Checklist

1. Configure GitHub Actions secrets for macOS Developer ID signing:
   `PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64`,
   `PEARBROWSER_MACOS_CERTIFICATE_PASSWORD`,
   `PEARBROWSER_MACOS_SIGNING_IDENTITY`,
   `PEARBROWSER_MACOS_NOTARY_APPLE_ID`,
   `PEARBROWSER_MACOS_NOTARY_PASSWORD`, and
   `PEARBROWSER_MACOS_NOTARY_TEAM_ID`.
2. Configure GitHub Actions secrets for Windows signing:
   `PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64`,
   `PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD`, and optionally
   `PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT`.
3. Run `npm run check:native-signing -- --require-public-trust` before spending CI minutes.
4. Run Desktop Native Release with `release_mode=public-trust` or publish/tag the release so the workflow defaults to public trust.
5. Verify post-upload assets with:
   `npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --require-published`.
6. Resolve and record the user-facing packages for macOS, Windows, and Linux:
   `npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --platform <platform> --arch <arch>`.
7. Smoke install from a clean machine or VM per OS and record evidence in `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md`.

Recommended OS-level checks:

- macOS: `codesign --verify --deep --strict`, `xcrun stapler validate`, and `spctl --assess --type execute`.
- Windows: `signtool verify /pa /v` and `Get-AuthenticodeSignature` for signed installer artifacts.
- Linux: run the AppImage on a clean Ubuntu desktop session with no source checkout present.

## Channel Expansion Plan

1. Keep GitHub Releases as the canonical asset host until public-trust desktop assets have at least one successful clean-machine install pass.
2. Add a short install page or release-note block that points each OS to the resolver-selected package, its checksum sidecar, and the stable Pear link fallback.
3. Add Homebrew Cask only after macOS ships a notarized `.dmg`; Homebrew casks expect stable versioned URLs and checksums.
4. Add WinGet only after Windows assets are signed and stable; WinGet manifests carry installer metadata and SHA-256 hashes.
5. Add Linux distro packages only after AppImage feedback proves there is demand. Avoid maintaining `.deb`/`.rpm` until the support burden is justified.
6. Keep mobile out of the desktop announcement unless `npm run release:preflight` passes without `--soft` and real device/store evidence is recorded.

## Release Decision Rule

Desktop can be announced as "package-proof" only if the release notes explicitly warn about macOS/Windows trust prompts. Desktop can be announced as "public-trust" only after the public-trust workflow passes and clean-machine install evidence is recorded.

Mobile should be announced separately unless production signing, TestFlight/App Store Connect, Play/Firebase validation, and real-device smoke are all green.

Peercord should remain a deferred catalogue trust gate until the full bundle drive is reachable again and a human approves the Pear trust prompt on a real launch.

## References

- Apple: [Notarizing macOS software before distribution](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution) and [Developer ID](https://developer.apple.com/developer-id/)
- Microsoft: [SignTool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool) and [MSIX package signing overview](https://learn.microsoft.com/en-us/windows/msix/package/signing-package-overview)
- GitHub CLI: [`gh release upload`](https://cli.github.com/manual/gh_release_upload)
- Homebrew: [Cask Cookbook](https://docs.brew.sh/Cask-Cookbook)
- WinGet: [Package manifest](https://learn.microsoft.com/en-us/windows/package-manager/package/manifest)
- Android: [Sign your app](https://developer.android.com/studio/publish/app-signing)
- Apple: [TestFlight](https://developer.apple.com/testflight/)
