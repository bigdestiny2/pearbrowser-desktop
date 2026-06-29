# PearBrowser Packaging Strategy - 2026-06-28

Scope: make PearBrowser installable on macOS, Windows, and Linux with the fewest user decisions possible, while keeping the stable Pear release link as the OTA content channel. Mobile/native remains a sibling release lane because it has store and device-signing gates.

Primary user promise: download one native package, launch it normally, and let PearBrowser's stable Pear key keep app content current after install.

## Current State

- GitHub release `v0.5.0` has native desktop assets for macOS arm64/x64,
  Windows x64, and Linux x64, with SHA-256 sidecars, checksum indexes, and
  platform manifests.
- `scripts/resolve-native-release-asset.mjs` chooses the recommended release package for the current or requested platform and verifies the checksum sidecar exists.
- `scripts/verify-native-downloads.mjs` downloads the recommended package set
  and verifies the bytes against the attached `.sha256` sidecars.
- `scripts/generate-native-install-snippet.mjs` emits release-note/install-page
  Markdown from those resolver choices, so user-facing links come from attached
  assets instead of hand-maintained copy; `generate:native-install-guide` emits
  the full direct-link native install guide from the same resolver.
- `scripts/generate-native-install-smoke-plan.mjs` emits clean-host install
  smoke commands, a downloadable runtime diagnostic helper, and evidence
  bullets from the same resolver choices, so macOS/Windows/Linux manual smoke
  runs do not drift from attached assets or require a source checkout.
- `scripts/generate-package-manager-manifests.mjs` emits Homebrew Cask and
  WinGet singleton manifest drafts from attached assets and checksum sidecars;
  it defaults to public-trust gates, uses the root package SPDX license by
  default, and allows package-proof output only for rehearsal.
- `scripts/check-linux-appimage-metadata.mjs` verifies Linux AppImage desktop
  integration metadata: source icon/AppStream files locally, and generated
  AppDir/AppImage desktop entry, icon, and metainfo during Linux native builds.
- `scripts/check-public-trust-readiness.mjs` aggregates the public-trust
  signing, published release asset, byte-level download, Linux AppImage
  metadata, clean-install smoke plan, package-manager draft, and operator
  evidence-log gates into one blocker report, and passes `--source-ref` through
  to the clean-install smoke plan for reproducible helper downloads.
- `scripts/generate-public-trust-operator-report.mjs` formats that readiness
  state into a Markdown handoff with gate summaries, grouped blockers, warnings,
  and exact next commands for the credential holder and release operator.
- `scripts/generate-release-evidence-handoff.mjs` formats the operator evidence
  log into grouped manual rows with expected outcomes and copy-ready
  `PASS`/`DEFER` table templates, so evidence capture does not require reading
  raw checker JSON.
- `scripts/generate-native-signing-secret-plan.mjs` emits the public-trust
  GitHub Actions secret inventory, guarded `gh secret set` command templates
  that fail on empty files or env values, and the follow-up signing/readiness
  checks so credential setup can be handed to an operator without copying
  workflow YAML by hand.
- `.github/workflows/desktop-native-release.yml` builds macOS, Windows, and Linux packages in CI.
- The native workflow now has two modes:
  - `package-proof`: manual default, permits ad-hoc macOS signing and unsigned Windows packages.
  - `public-trust`: required for announcement-ready assets, requires macOS Developer ID/notary credentials, notarized macOS DMG assets, Windows signing credentials, a published GitHub release, and post-upload native download verification.
- Source installs are standalone because the HiveRelay `0.20.0` packages are vendored under `vendor/hiverelay`.

## Distribution Model

Use three lanes, with stricter gates as the audience widens:

| Lane | Audience | Artifact source | Trust level | Gate |
| --- | --- | --- | --- | --- |
| Source checkout | contributors and debuggers | `npm install`, `pear`, local scripts | developer trust | `npm test`, vendored HiveRelay guard, high-severity audit |
| Package proof | internal testers and packaging validation | GitHub release assets from manual workflow | checksum trust plus OS warnings where unsigned | native workflow `release_mode=package-proof`, asset checker, smoke evidence |
| Public trust | public desktop users | GitHub release assets, then package managers | OS code-signing trust plus checksums | native workflow `release_mode=public-trust`, notarized macOS DMG, Windows signing verification, published release check, download verification |

The stable Pear link is still the application-content update channel. Native packages should change only when the wrapper, OS integration, permissions, icons, signing, or runtime shell changes.

## Platform Targets

| Platform | Now | Public-trust target | Later channel |
| --- | --- | --- | --- |
| macOS | ad-hoc signed `.app.zip` for arm64 and x64 | Developer ID signed and notarized `.dmg`, with stapled ticket and SHA-256 sidecar | Homebrew Cask after the `.dmg` URL and checksum are stable |
| Windows | unsigned `.exe` and `.msix` package proof | Authenticode-signed `.exe` and `.msix`, timestamped and verified in CI | WinGet manifest after the signed installer URL and `InstallerSha256` are stable |
| Linux | `.AppImage` plus checksums | `.AppImage` remains primary, with desktop file/icon/AppStream metadata checked by CI | `.deb`/`.rpm` only if user demand or distro policy warrants it |
| iOS | simulator and native-shell evidence only | TestFlight/App Store validation after production Apple signing | App Store |
| Android | emulator and disposable release signing evidence | production upload/release keystore plus Play/Firebase validation | Google Play or Firebase App Distribution |

## Public-Trust Desktop Checklist

1. Generate the operator credential handoff:
   `npm run -s generate:native-signing-secret-plan -- --repo bigdestiny2/pearbrowser-desktop --tag v0.5.0 --source-ref <merged-main-commit>`.
2. Configure GitHub Actions secrets for macOS Developer ID signing:
   `PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64`,
   `PEARBROWSER_MACOS_CERTIFICATE_PASSWORD`,
   `PEARBROWSER_MACOS_SIGNING_IDENTITY`,
   `PEARBROWSER_MACOS_NOTARY_APPLE_ID`,
   `PEARBROWSER_MACOS_NOTARY_PASSWORD`, and
   `PEARBROWSER_MACOS_NOTARY_TEAM_ID`.
3. Configure GitHub Actions secrets for Windows signing:
   `PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64`,
   `PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD`, and optionally
   `PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT`.
4. Run `npm run check:native-signing -- --require-public-trust --secret-source github --repo bigdestiny2/pearbrowser-desktop` before spending CI minutes. This confirms the required GitHub Actions secret names are present; CI still validates the unreadable certificate values by importing/signing/notarizing during the workflow.
5. Run Desktop Native Release with `release_mode=public-trust` or publish/tag the release so the workflow defaults to public trust.
6. Run the public-trust readiness aggregator after the workflow completes:
   `npm run check:public-trust-readiness -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --source-ref <merged-main-commit> --signing-secret-source github`.
   It should be treated as blocked until the subchecks below and the operator
   evidence log are green.
7. Generate the public-trust operator report from the same readiness state:
   `npm run -s generate:public-trust-operator-report -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --source-ref <merged-main-commit> --signing-secret-source github`.
8. Generate the release evidence handoff before filling manual rows:
   `npm run -s generate:release-evidence-handoff`.
9. Verify post-upload assets with:
   `npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --require-published --require-public-trust`.
10. Verify the recommended package downloads:
   `npm run verify:native-downloads -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --all`.
11. Verify Linux AppImage desktop integration metadata:
   `npm run check:linux-appimage-metadata`; the native release workflow also
   runs it with `--build-dir appling/build` on Linux before artifact collection.
12. Resolve and record the user-facing packages for macOS, Windows, and Linux:
   `npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --platform <platform> --arch <arch>`.
13. Generate the release-note/install-page block from the attached assets:
   `npm run -s generate:native-install-snippet -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --trust-mode public-trust`.
14. Regenerate the full native install guide from the same resolver:
   `npm run -s generate:native-install-guide -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --trust-mode public-trust`.
15. Generate the clean-machine smoke plan from the same assets, using the
    merged commit SHA as the helper source:
   `npm run -s generate:native-install-smoke-plan -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --trust-mode public-trust --source-ref <merged-main-commit>`.
16. Generate Homebrew/WinGet package-manager drafts from the same assets:
   `npm run generate:package-manager-manifests -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop`.
17. Smoke install from a clean machine or VM per OS and record evidence in `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md`.

Recommended OS-level checks:

- macOS: `codesign --verify --deep --strict`, `xcrun stapler validate`, and `spctl --assess --type execute`.
- Windows: `signtool verify /pa /v` and `Get-AuthenticodeSignature` for signed installer artifacts.
- Linux: run the AppImage on a clean Ubuntu desktop session with no source checkout present.

## Channel Expansion Plan

1. Keep GitHub Releases as the canonical asset host until public-trust desktop assets have at least one successful clean-machine install pass.
2. Use `npm run -s generate:native-install-snippet` for release notes and `npm run -s generate:native-install-guide` for the full direct-link install page that points each OS to the resolver-selected package and checksum sidecar while keeping the stable Pear fallback.
3. Use `npm run -s generate:native-install-smoke-plan` for the clean-host smoke checklist that must be executed before public-trust announcement or package-manager submission; the generated plan downloads the runtime RPC smoke helper from `--source-ref` so testers do not need a checkout.
4. Use `npm run -s generate:native-signing-secret-plan` before public-trust
   workflow dispatch so the operator has the canonical secret names and setup
   command templates, including empty-input guards before `gh secret set`.
5. Use `npm run check:public-trust-readiness -- --source-ref <merged-main-commit> --signing-secret-source github` as the operator-facing summary
   gate before announcement; it should return `READY` only after signing
   credentials, public-trust assets, byte verification, Linux metadata,
   package-manager drafts, clean-host evidence, and the announcement decision
   are all represented.
6. Use `npm run -s generate:public-trust-operator-report -- --source-ref <merged-main-commit> --signing-secret-source github` to hand grouped blockers and commands to the people holding credentials, clean-machine test hosts, package-manager submitters, and release-evidence operators; the report now includes the release evidence handoff command.
7. Use `npm run -s generate:release-evidence-handoff` to turn the current evidence-log blockers into grouped manual rows and copy-ready table templates before the final smoke pass.
8. Generate Homebrew/WinGet drafts with `npm run generate:package-manager-manifests`; submit them only after public-trust assets and clean-machine install evidence are green.
9. Add Homebrew Cask only after macOS ships a notarized `.dmg`; Homebrew casks expect stable versioned URLs and checksums.
10. Add WinGet only after Windows assets are signed and stable; WinGet manifests carry installer metadata and SHA-256 hashes, and the generated draft still needs publisher and silent-install behavior reviewed before submission.
11. Add Linux distro packages only after AppImage feedback proves there is demand. Avoid maintaining `.deb`/`.rpm` until the support burden is justified.
12. Keep mobile out of the desktop announcement unless `npm run release:preflight` passes without `--soft` and real device/store evidence is recorded.

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
