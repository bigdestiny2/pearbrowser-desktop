# Native Release Packaging

PearBrowser Desktop `v0.9.1` is packaged from the reviewed Electron
application with the pinned electron-builder toolchain. A legacy Pear identity
or launcher is not a desktop release artifact. Runtime OTA download/apply
remains disabled until the Pear v3 production identity, signer roster,
provisioning record, and multisig ceremony are independently verified.

The latest published release is still `v0.9.0`. Treat `v0.9.1` as a release
candidate until the public-trust workflow and post-publication checks described
here pass.

## Release artifact contract

The supported `v0.9.1` artifact set is:

| Platform | Architectures | Required artifacts |
| --- | --- | --- |
| macOS | `arm64`, `x64` | Developer ID signed/notarized `.app.zip` and signed, notarized, stapled `.dmg` for each architecture |
| Windows | `x64` | PFX/Authenticode-signed NSIS `.exe` |
| Linux | `x64` | `.AppImage` |

Every product artifact must have a matching `.sha256` sidecar. Every
platform/architecture bundle must also contain its own
`SHA256SUMS-<platform>-<arch>.txt` and
`manifest-<platform>-<arch>.json`. The manifest records the stable tag, exact
40-character source commit SHA, release mode, platform, architecture, and
artifact digests.

The Windows format is NSIS `.exe`. Retired package formats and the legacy
launcher are relevant only when auditing older releases; they are not accepted
as `v0.9.1` release outputs.

## Packaging boundary

electron-builder packages the actual root Electron application and the pinned
Electron runtime. The reviewed application entry points stay in ASAR, while
the embedded Pear worker/backend and native modules are deliberately unpacked
to physical paths required by the worker runtime. Electron fuses require
embedded ASAR integrity validation, loading the application from ASAR,
encrypted cookies, and disabled RunAsNode, `NODE_OPTIONS`, and CLI inspector
entry points.

Unpacked executable code is not trusted on placement alone. Each platform
build generates an ephemeral Ed25519 key, embeds only its public key and the
exact release identity in protected `app.asar`, then signs a SHA-256 inventory
of every file under `app.asar.unpacked` after platform signing is complete.
The packaged host verifies the signature, release identity, exact path set,
sizes, and every file digest before it can require `pear-runtime` or spawn the
worker. The build-time private key is never written into the application.

`scripts/check-electron-package.mjs` is the pre-release content gate. It checks
the packaged provenance, compares the reviewed runtime source bytes, verifies
the expected ASAR/unpacked placement, confirms the platform Pear sidecar is
present and executable, independently repeats the signed unpacked-tree check,
checks the exact Electron fuse states, and rejects legacy build content or a
duplicate Electron runtime.

The release workflow repeats content inspection and launch/RPC smoke on hosted
runners. A successful local build is useful proof, but it does not replace the
hosted platform jobs or the public-trust signature checks.

## Workflow authority

`.github/workflows/desktop-native-release.yml` is intentionally:

- manual (`workflow_dispatch`) only;
- stable-tag only (`vX.Y.Z`);
- pinned to an exact lowercase 40-character source commit SHA;
- create-only, refusing any existing tag or GitHub Release;
- draft-first for public-trust publication; and
- unable to overwrite existing assets.

The `source_ref` input must equal the commit that supplied the dispatched
workflow. Branch names, tags, short SHAs, and symbolic refs such as `main` are
not accepted as package provenance.

### `package-proof`

This mode permits ad-hoc macOS signing and unsigned Windows packaging so the
artifact structure and clean-host launch can be reviewed before credentials
are used. Its outputs are GitHub Actions artifacts only.

`package-proof` must not create a Git tag, draft, GitHub Release, or public
download. `publish_release=true` is invalid in this mode.

### `public-trust`

This mode uses the protected `production` environment and fails closed unless
the complete macOS and Windows credential sets are present. It builds and
verifies all platform bundles, creates a draft targeted at the exact source
commit, then immediately before publication re-downloads every current draft
asset and requires an exact filename, byte-for-byte, manifest, and checksum
match with the independently verified Actions bundle. It publishes only when
the operator explicitly dispatched with `publish_release=true` and approved
the protected environment.

Creating the draft creates the tag. If a run fails after draft creation, leave
the draft and tag available for inspection. The workflow never cleans them up
or retries destructively. After diagnosing the failure, a maintainer may
deliberately remove both with:

```sh
gh release delete <tag> --repo bigdestiny2/pearbrowser-desktop --cleanup-tag
```

Confirm the draft/release and tag are both absent before dispatching the same
tag again. Existing-release backfills are outside this create-only workflow.

## External signing prerequisites

Signing credentials are external prerequisites. They are not generated,
stored, or recoverable from this repository. Add them to the protected
`production` GitHub environment without pasting them into issues, logs, or
command history.

Generate the name-only handoff and guarded setup commands with an exact release
SHA:

```sh
npm run -s generate:native-signing-secret-plan -- \
  --repo bigdestiny2/pearbrowser-desktop \
  --tag v0.9.1 \
  --source-ref <40-hex-release-sha> \
  --github-environment production
```

### macOS

Public-trust macOS packaging requires:

- `PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64`
- `PEARBROWSER_MACOS_CERTIFICATE_PASSWORD`
- `PEARBROWSER_MACOS_SIGNING_IDENTITY`
- `PEARBROWSER_MACOS_NOTARY_APPLE_ID`
- `PEARBROWSER_MACOS_NOTARY_PASSWORD`
- `PEARBROWSER_MACOS_NOTARY_TEAM_ID`

`PEARBROWSER_MACOS_KEYCHAIN_PASSWORD` and
`PEARBROWSER_MACOS_SIGNING_KEYCHAIN` are optional runner controls. The
workflow must verify the Developer ID signature, submit for notarization,
staple the result, and assess the final app/DMG before collection.

### Windows

The supported `v0.9.1` Windows public-trust route requires both:

- `PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64`
- `PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD`

electron-builder consumes that PFX during NSIS packaging so the application
executable, uninstaller, and final installer are signed in the correct order.
The workflow must require a valid Authenticode signature on the unpacked
application and final installer.

Azure Trusted Signing is deferred for this release. electron-builder 26's
current Azure path installs a mutable TrustedSigning PowerShell module during
the build. Azure credentials do not satisfy the `v0.9.1` public-trust gate;
reconsider that route only after the module and integration are version-pinned
and reviewed.

### Linux

The AppImage lane currently requires no signing secret. The release still
requires the per-file SHA-256 sidecar, platform checksum index, manifest,
desktop metadata inspection, and clean-host launch evidence.

Check the protected environment's secret names before dispatch:

```sh
npm run check:native-signing -- \
  --require-public-trust \
  --secret-source github \
  --repo bigdestiny2/pearbrowser-desktop \
  --github-environment production
```

GitHub does not expose secret values after upload. This preflight can confirm
names only; the workflow must still prove certificate import, signature
validity, and notarization.

## Local package proof

Install from the committed lockfile, test, audit, then build the host package:

```sh
npm ci
npm test
npm audit --audit-level=high
npm run build:ui
git diff --exit-code -- ui/dist/main.bundle.js

# Choose the command for the current host.
npm run package:electron:macos
npm run package:electron:windows
npm run package:electron:linux
```

Local packaging defaults to `RELEASE_MODE=package-proof` and records
`local-working-tree` provenance. CI must instead supply a stable `RELEASE_TAG`,
an exact `SOURCE_REF`, and the requested release mode. Inspect the unpacked app
with `scripts/check-electron-package.mjs`, verify the platform signature/fuses,
launch the packaged executable, and run `scripts/runtime-rpc-smoke.mjs` before
treating the output as proof.

Local outputs must not be uploaded to a release. Only the hosted public-trust
workflow has release authority.

## Public-trust operator sequence

1. Merge the reviewed release delta to the workflow branch and record the
   exact 40-character commit SHA.
2. Confirm the stable `v0.9.1` tag and release do not exist.
3. Confirm all required credentials are present in the protected `production`
   environment.
4. Dispatch from the release commit:

   ```sh
   gh workflow run desktop-native-release.yml \
     --repo bigdestiny2/pearbrowser-desktop \
     --ref main \
     -f tag=v0.9.1 \
     -f source_ref=<40-hex-release-sha> \
     -f release_mode=public-trust \
     -f publish_release=true
   ```

5. Approve the protected environment only after reviewing the immutable inputs.
6. Wait for macOS Apple Silicon, macOS Intel, Windows, Linux, bundle
   verification, draft creation, publication, and public-download verification
   to finish green.
7. Verify the published artifacts and downloads independently:

   ```sh
   npm run check:native-release-assets -- \
     --tag v0.9.1 \
     --repo bigdestiny2/pearbrowser-desktop \
     --require-published \
     --require-public-trust

   npm run verify:native-downloads -- \
     --tag v0.9.1 \
     --repo bigdestiny2/pearbrowser-desktop \
     --all
   ```

8. Generate the commit-pinned clean-host plan and record evidence for all four
   targets:

   ```sh
   npm run -s generate:native-install-smoke-plan -- \
     --tag v0.9.1 \
     --repo bigdestiny2/pearbrowser-desktop \
     --trust-mode public-trust \
     --source-ref <40-hex-release-sha>
   ```

9. Run the aggregated readiness gate and operator report. These are expected
   to remain blocked until the credentials, published assets, clean-host
   evidence, and final release decision actually exist:

   ```sh
   npm run check:public-trust-readiness -- \
     --tag v0.9.1 \
     --repo bigdestiny2/pearbrowser-desktop \
     --source-ref <40-hex-release-sha> \
     --signing-secret-source github \
     --signing-github-environment production

   npm run -s generate:public-trust-operator-report -- \
     --tag v0.9.1 \
     --repo bigdestiny2/pearbrowser-desktop \
     --source-ref <40-hex-release-sha> \
     --signing-secret-source github \
     --signing-github-environment production
   ```

10. Regenerate user-facing install copy from the published public-trust assets.

## Historical migration note

Older PearBrowser releases used a separate native-launcher experiment and
different Windows package formats. Those files may remain in history or as
icon/metadata sources during migration. They are not the `v0.9.1` build target,
do not prove that the reviewed Electron source was packaged, and must not be
collected by the current release workflow.
