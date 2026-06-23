# PearBrowser Release Readiness - 2026-06-23

Scope: desktop PearBrowser, mobile/native PearBrowser, the live PearBrowser Network catalogue, and the high-risk systems called out for review: catalogue, app launch, search, naming, Nostr bridge, site publishing, sync, and release operations.

## Current Verdict

The release is in strong shape for a community launch. The core protocol tests are broad and green after the final catalogue cleanup:

- Desktop: `node --test 'test/*.test.js'` passed `404/404`.
- Mobile/native: `npm test` passed `124/124`.
- Publisher catalogue: `npm run validate` passes with no warnings.
- Desktop and mobile `git diff --check` are clean.
- Desktop dependency audit: `npm audit --audit-level=high` found 0 vulnerabilities.
- Mobile dependency audit: safe `npm audit fix` removed high/critical advisories, `npm audit --audit-level=high` now passes, and the full mobile suite still passes. Full `npm audit` still reports 15 moderate inherited Expo/React Native toolchain advisories with only breaking framework fixes offered.
- Live catalogue Hyperbee republished at `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`; 5 relay seed requests were accepted.
- Production browser drive fresh-peer verification passed at length `16898`, with `/CHANGELOG.md` blob fetch proving content blocks are reachable.
- Live catalogue fresh-peer verification passed at Hyperbee core length `222`, with signed meta present and Peercord/HiveWorm rows matching expected release metadata, including Peercord `type: "standalone"`.
- Desktop GUI runtime is up in dev mode with Pear Runtime renderer connected to the backend RPC socket on `127.0.0.1:9876`.
- Real-DHT relay health passed again after the latest doc/native fix push, with 1 unique HiveRelay reachable and 7 live relay connections. A restricted/sandboxed network run can false-negative DHT discovery, so release checks should run with real network access.
- PearBrowser homepage, Peercord, and Keet bundle drives were fresh-peer sampled without executing third-party code; all returned peers, file listings, and zero missing sampled blobs.
- Native simulator/device smoke is mostly cleared: the generated Expo iOS project exposed a real missing native module (`ExpoLinking`), the tracked dependency is now added and autolinked, and the tracked SwiftUI `ios-native` shell now builds, installs, launches, recovers from stale Corestore layout, and reaches a green `Connected` worklet state on the iPhone 17 simulator. Generated Expo iOS Debug and Release simulator builds now pass; the Release helper pins `HERMES_CLI_PATH` to the Pods `hermesc` as an Xcode build setting so the bundle phase does not hang on the node_modules compiler path. Android native now builds a fresh debug APK with a verified JDK 17, installs it on a headless `pp_avd` emulator, launches `com.pearbrowser.app/.MainActivity`, loads `libbare-kit.so`, extracts `backend.android.bundle`, starts the local proxy, and reaches a green `Connected` Home screen. Android native release APK/AAB builds also pass with R8/resource shrink, and the env-driven signing path verifies with a disposable test key (`apksigner` for APK, `jarsigner` for AAB).

One earlier desktop `npm test` run reported `401/402`; the immediately repeated compact full run passed `402/402`, and the current release branch now passes `404/404` after the Peercord launch-mode coverage landed. No code change was needed for that earlier blip.

## Fixes In This Pass

- Added Peercord to the featured apps and default catalogue, with tests.
- Kept Peercord on the standalone Pear launch path. Upstream Peercord currently ships as a full Pear desktop app, not a pear-request worker, so surfacing "Run in tab" would create a bad launch experience. It can move to headless tab launch once Peercord publishes a worker/headless entry point.
- Cleaned the HiveWorm catalogue row: explicit `driveKey`, `url` for the Hyperdrive page, and no misleading `pearLink` for a `hyper://` target.
- Added `catalog-source/pearbrowser-network.catalog.json` so the canonical catalogue source is versioned in the desktop GitHub repo.
- Regenerated `backend/catalogue-seed.js` from the versioned catalogue source so the offline seed and live catalogue agree.
- Added `.landing-seed.mjs` to `.gitignore` so the local operational landing-page seeder does not appear as release source.
- Added mobile `expo-linking@~55.0.15` after the iOS simulator launch exposed `[runtime not ready]: Error: Cannot find native module 'ExpoLinking'`.
- Added `npm run ios:generated:release` in the mobile repo to make the generated Expo iOS Release simulator build use the working Pods Hermes compiler path through an Xcode build setting.
- Added a non-destructive mobile Corestore recovery path in `bigdestiny2/PearBrowser@41a7fb6`: if root app storage belongs to another Corestore, the backend falls back to an identity-scoped `corestore-*` subdirectory instead of failing worklet boot.
- Fixed Android native first-launch Home behavior in the mobile repo: Home now retries bookmark RPCs across the Binder/worklet boot race, so a clean install no longer shows "Bookmarks are unavailable right now" before the backend reports ready.
- Added optional env-driven Android release signing to the native shell and R8 rules for unused React Native adapter classes inside `bare-kit.aar`; release APK/AAB builds and disposable-key signing verification now pass.

## Catalogue And Launch

The Apps surface is coherent now:

- Featured apps include Keet, PearPass, anonGPT, Paste, and Peercord.
- The default live catalogue and the offline seed both contain 13 entries.
- The catalogue loader accepts Hyperdrive JSON, signed Hyperbee, Autobee, schema-sheets rooms, HiveRelay index rooms, community submissions, and writable personal catalogues.
- App rows distinguish launch behavior:
  - `standalone`: full Pear/file apps open in their own isolated window through `CMD_LAUNCH_PEAR_LINK`.
  - `hypersite`: pear-request/streamed apps use `CMD_RUN_APP_IN_TAB` and render headless in a Browse tab.
  - static Hyperdrive pages open directly in Browse.
- The browser prefetches known Pear bundle keys before standalone launch and surfaces download/peer progress, so a user can run the latest catalogue version without visiting a project page, downloading a package, or applying manual updates.

Peercord specifically:

- Catalogue link: `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`
- Version: `1.0.8`
- Source: `https://git.churchofmalware.org/mastercodeon/Peercord`
- Launch mode: `standalone`
- Reason: current upstream `pear.json` is `type: "desktop"` with `main: "index.js"`, and the main process constructs an Electron `BrowserWindow`; no pear-request worker bridge or `Pear.worker.pipe()` headless entry is published.

## Search

The search engine is well defended for a release:

- Local-first search returns first-paint results without waiting on federation.
- Queries are NFKC-normalized and capped at 512 chars.
- Limits are clamped to `0..100`.
- Federated search is opt-in and emits a correlated enriched event with `queryId`; stale federations are dropped.
- Personal index records are signed and verifiable by peers.
- Ranking is deterministic, resistant to NaN/negative-score poisoning, and avoids burying strong text matches.
- Fanout is digest-first where possible, bounded by per-query and live-session budgets.
- Completeness anchors detect forged, truncated, or forked peer indexes where the metadata exists.

Remaining improvement: external, multi-peer search performance should still be sampled with real trusted peers after launch traffic exists.

## Naming

The naming layer is ready as an experimental but usable local/social name system:

- URL-bar bare names and `pearname://` resolve through the same typed-name path.
- Local petnames win over registry and curated aliases.
- Registry names are owner-signed, monotonic, and protected against replay, release/reclaim mistakes, and homograph squatting.
- Federated contact claims are accepted only when the contact is verified and the claim owner matches the contact root.
- Provenance is preserved, so a petname, registry record, curated alias, and trusted-contact answer are not falsely equivalent.

Remaining improvement: the UI could make provenance more discoverable in the address bar without adding friction.

## Nostr Bridge

The Nostr bridge is scoped correctly for this release: trusted-contact Nostr, not a public relay client.

- Nostr keys are deterministically derived from the PearBrowser identity seed.
- Binding is dual-signed: the Pear root signs the Nostr key and the Nostr key signs the Pear root.
- Revocation and higher-epoch rebinding are covered.
- Events are verified, deduped, queryable, and partitioned by trust.
- Federated contact feeds only admit events authored by that contact's attested Nostr key.
- Revoked or forged bindings hide/quarantine contact events instead of showing them as trusted.

Remaining improvement: public relay client behavior, relay moderation policy, and large-feed UX are future work.

## Mobile/Native Parity

The mobile app logic is tested, and native simulator/device release smoke is partly cleared:

- TypeScript, backend syntax checks, bridge templates, and native source-contract tests pass.
- Mobile catalogue normalization preserves safe link-only rows and rejects targetless rows.
- iOS and Android bridge constants are mirrored for login, profile, connected apps, trusted origins, and `swarm.v1`.
- Mobile flows cover Home, Browse, Explore, Settings, My Sites, editor, QR scanner, identity backup/restore, and bridge runtime smoke tests.
- An installed iOS simulator build launched and exposed `[runtime not ready]: Error: Cannot find native module 'ExpoLinking'`.
- `expo-linking@~55.0.15` is now tracked in `package.json`/`package-lock.json`; `npm ls expo-linking` resolves `expo-linking@55.0.15`, and Expo autolinking resolves the `ExpoLinking` pod/module.
- A follow-up generated Expo iOS Debug simulator build now succeeds with signing disabled and DerivedData under `/private/tmp`; it includes the `ExpoLinking` pod, runs `[Expo] Configure project`, and copies/strips the BareKit xcframework stack. The generated Expo Release simulator path is also release-build-cleared when the build pins `HERMES_CLI_PATH` to `ios/Pods/hermes-engine/destroot/bin/hermesc` as an Xcode build setting. The earlier stalled path invoked `/Users/localllm/Desktop/PearBrowser/node_modules/hermes-compiler/hermesc/osx-bin/hermesc`; the Pods compiler successfully bytecodes the same 7.5 MB JS bundle, and the full generated Expo Release simulator build now succeeds.
- The tracked SwiftUI `ios-native` shell builds, installs, launches, and reaches green `Connected` on the iPhone 17 simulator. The smoke also verified stale-Corestore recovery: the first launch failed with `Another corestore is stored here`, then the fallback build recovered into an identity-scoped subdirectory and booted the worklet.
- Android native Gradle inspection, Kotlin/Java compile, and `:app:assembleDebug` pass with Eclipse Temurin 17; Homebrew OpenJDK 17.0.19 hung in AGP's JDK image transform on this machine. The fresh debug APK (`android-native/app/build/outputs/apk/debug/app-debug.apk`, 169 MB diagnostic build with bare-kit/addons and two ARM ABIs) installed and launched on a headless `pp_avd` emulator. The app reached a green `Connected` Home screen after extracting the bundled worklet and starting the local proxy.
- Android native `:app:assembleRelease` and `:app:bundleRelease` pass with R8/resource shrink after suppressing unused React Native adapter warnings from the local Bare Kit AAR. Env-driven release signing was verified with a disposable test keystore: `app-release.apk` is 142 MB and verifies with certificate `CN=PearBrowserTest, O=PearBrowser, C=US`; `app-release.aab` is 49 MB and passes `jarsigner -verify` with expected self-signed test-certificate warnings.

Required before native/mobile distribution: validate Apple and Android production signing with real credentials, run app-store-style distribution checks, and broaden simulator/emulator smoke to real devices. Local Node tests do not prove platform WebView behavior under real OS permissions.

## Release Operations

The release script is in better shape after the recent verify-step fix:

- `scripts/release-prod.sh` stages, releases, pins, and verifies.
- On the publisher box, it avoids false failure from same-NAT/fresh-peer verification by confirming the durable seeder announced the new length and has live remote peers.
- Off the publisher box, `scripts/verify-pin.js --expect <length>` remains the stronger external round trip.
- `scripts/verify-live-catalog.js` fresh-loads the published Hyperbee catalogue and asserts expected app rows plus Peercord launch metadata from the network.
- `scripts/verify-app-full.js` is available for deeper fresh-peer blob sampling across a drive.
- The live DHT verifiers must run with real network access. In a restricted sandbox, peer discovery can time out even when the same checks pass outside the sandbox.

Required external smoke before a public announcement:

- If time allows, run `node scripts/verify-app-full.js --key 1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d --name pearbrowser --samples 12`.
- Launch Peercord and one existing featured Pear app from the catalogue after explicitly approving Pear's trust prompt for Peercord.
- Clear remaining native mobile smoke before any app-store-style mobile announcement: production Apple/Android signing and store validation plus broader real-device testing.

## Evidence

Commands run during this pass:

```sh
npm test
node --test --test-reporter=spec test/*.test.js
node --test test/catalog-manager-safety.test.js test/catalog-bee.test.js test/peercord-catalog.test.js test/resolve-name.test.js test/index-room-client.test.js
git diff --check
npm test # mobile/native
npm ls expo-linking # mobile/native, resolved expo-linking@55.0.15
npm run bundle-backend-native-ios # mobile/native tracked SwiftUI shell
npm run bundle-backend-native-android # mobile/native tracked Android shell
npm audit --audit-level=high
npm audit fix # mobile/native, non-force only
npm audit --audit-level=high # mobile/native after fix
npm run validate # publisher catalogue
node scripts/gen-catalogue-seed.mjs
node scripts/publish-catalog-bee.js catalog-source/pearbrowser-network.catalog.json --storage /Users/localllm/Projects/pear-ecosystem/03-sites/pearbrowser-publishers/catalog
node scripts/check-relays.js
node scripts/verify-pin.js --expect 16898 # latest rerun: length 16898, peers 2, /CHANGELOG.md sampled
node scripts/verify-live-catalog.js --expect-app peercord --expect-app hiveworm # latest rerun: length 222, peers 1, 13 apps, Peercord type standalone
node scripts/verify-app-full.js --key 1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d --name pearbrowser-homepage --samples 12 --timeout 90
node scripts/verify-app-full.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord --samples 12 --timeout 90 # latest rerun: peers 1, entries 14730, sampled 12, missing 0
node scripts/verify-app-full.js --key 82110be69e2a531e840bc886dc7b9cab16729c587815295f55035109b45e4ddb --name keet --samples 12 --timeout 90
xcodebuild -workspace ios/PearBrowser.xcworkspace -list # mobile/native, succeeded
xcrun simctl list devices available # mobile/native, selected booted iPhone 17, OS 26.4.1
./gradlew :app:tasks --all # mobile/native, failed: no Java Runtime
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Debug -destination 'id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B' -derivedDataPath ios/build/DerivedData CODE_SIGNING_ALLOWED=NO build # mobile/native, failed at final framework embed script after generated Expo path fixes
xcrun simctl install 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B ios/build/DerivedData/Build/Products/Debug-iphonesimulator/PearBrowser.app # mobile/native, succeeded with prior build
xcrun simctl launch 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B com.pearbrowser.app # mobile/native, exposed missing ExpoLinking runtime module
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Debug -destination 'id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B' -derivedDataPath ios/build/DerivedData CODE_SIGNING_ALLOWED=NO COCOAPODS_PARALLEL_CODE_SIGN=false COMPILER_INDEX_STORE_ENABLE=NO build # mobile/native after expo-linking, blocked by generated shell-script phase hang in this environment
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Debug -sdk iphonesimulator -destination id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B -derivedDataPath /private/tmp/pearbrowser-generated-ios-dd CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO RCT_NO_LAUNCH_PACKAGER=1 SKIP_BUNDLING=1 build # generated Expo iOS Debug, succeeded; no JS bundle by design
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Release -sdk iphonesimulator -destination id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B -derivedDataPath /private/tmp/pearbrowser-generated-ios-release-dd CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO RCT_NO_LAUNCH_PACKAGER=1 build # generated Expo iOS Release, interrupted after Hermes bytecode compilation stalled
node_modules/hermes-compiler/hermesc/osx-bin/hermesc -emit-binary -max-diagnostic-width=80 -Og -out /private/tmp/pearbrowser-test-Og.hbc /tmp/pearbrowser-generated-ios-release-dd/Build/Products/Release-iphonesimulator/main.jsbundle # direct repro: stalled for >60s and was interrupted
ios/Pods/hermes-engine/destroot/bin/hermesc -emit-binary -max-diagnostic-width=80 -O -out /private/tmp/pearbrowser-pods-hermes-O.hbc /private/tmp/pearbrowser-generated-ios-release-dd/Build/Products/Release-iphonesimulator/main.jsbundle # generated Expo iOS Release bundle, Pods compiler succeeded
npm run ios:generated:release # generated Expo iOS Release simulator build, succeeded with HERMES_CLI_PATH as an Xcode build setting
xcodebuild -project ios-native/PearBrowser.xcodeproj -scheme PearBrowser -configuration Debug -destination 'id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B' -derivedDataPath ios-native/build/DerivedData CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO build # tracked SwiftUI iOS shell, succeeded
xcrun simctl install 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B ios-native/build/DerivedData/Build/Products/Debug-iphonesimulator/PearBrowser.app # tracked SwiftUI iOS shell, succeeded
xcrun simctl launch 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B com.pearbrowser.app # tracked SwiftUI iOS shell, reached green Connected after Corestore fallback
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/Cellar/openjdk@17/17.0.19/bin:$PATH android/gradlew -p android-native :app:tasks --all # Android native, succeeded
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/Cellar/openjdk@17/17.0.19/bin:$PATH android/gradlew -p android-native --no-daemon -Dkotlin.compiler.execution.strategy=in-process :app:compileDebugKotlin # Android native, succeeded
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/Cellar/openjdk@17/17.0.19/bin:$PATH android/gradlew -p android-native --no-daemon -Dkotlin.compiler.execution.strategy=in-process :app:assembleDebug # Android native, Homebrew OpenJDK hung in jmod/JDK image transform
JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:compileDebugJavaWithJavac # Android native with Temurin 17, succeeded
JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:assembleDebug # Android native with Temurin 17, succeeded; fresh debug APK installed/launched on pp_avd and reached green Connected
JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:assembleRelease :app:bundleRelease # Android native unsigned release, succeeded after R8 rules
PEARBROWSER_ANDROID_KEYSTORE=/private/tmp/pearbrowser-test-upload.jks PEARBROWSER_ANDROID_STORE_PASSWORD=changeit PEARBROWSER_ANDROID_KEY_ALIAS=pearbrowser PEARBROWSER_ANDROID_KEY_PASSWORD=changeit JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:assembleRelease :app:bundleRelease # Android native disposable-key signed release, succeeded
apksigner verify --print-certs android-native/app/build/outputs/apk/release/app-release.apk # Android native signed APK, verified CN=PearBrowserTest
jarsigner -verify android-native/app/build/outputs/bundle/release/app-release.aab # Android native signed AAB, verified with expected self-signed test-certificate warnings
```

Key live values:

- Production browser link: `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
- Browser homepage drive: `hyper://1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d/`
- PearBrowser Network catalogue: `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`
- Peercord: `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`

## Residual Risks

- Live GUI process health was proven for PearBrowser itself, and Peercord/Keet bundle availability was proven without executing them. A real Peercord window launch still requires explicit human approval of Pear's trust prompt for that third-party key.
- Network replication can vary by relay health and NAT conditions. This pass saw reachable relays, a reachable production drive, and a reachable live catalogue, but a second-network spot check remains useful before a high-visibility announcement.
- Peercord cannot honestly be marketed as headless-in-tab until upstream ships a compatible pear-request worker. PearBrowser does launch it from the featured catalogue without manual download/update.
- Public Nostr relay behavior is not part of this release; the shipped feature is the trusted-contact bridge.
- Native mobile is not app-store-release-cleared yet. The JS/test surface is green, the missing `ExpoLinking` dependency is fixed, generated Expo iOS Debug and Release simulator builds pass, the tracked SwiftUI iOS shell reaches `Connected`, Android native debug APK assembly plus emulator launch pass, and Android release APK/AAB plus disposable-key signing verification pass. Remaining gates are production Apple/Android signing and store validation plus broader real-device validation.
- Mobile still reports 15 moderate `npm audit` advisories in Expo/React Native test/tooling transitive dependencies. npm's available fix requires breaking major-version changes, so these should move to the next mobile platform-upgrade lane rather than this release-day hardening pass.
