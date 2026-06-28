import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pearConfig = JSON.parse(readFileSync(new URL('../pear.json', import.meta.url), 'utf8'))
const applingPkg = JSON.parse(readFileSync(new URL('../appling/package.json', import.meta.url), 'utf8'))
const applingLock = JSON.parse(readFileSync(new URL('../appling/package-lock.json', import.meta.url), 'utf8'))
const applingCmake = readFileSync(new URL('../appling/CMakeLists.txt', import.meta.url), 'utf8')
const nativeReleaseWorkflow = readFileSync(new URL('../.github/workflows/desktop-native-release.yml', import.meta.url), 'utf8')
const desktopCiWorkflow = readFileSync(new URL('../.github/workflows/desktop-ci.yml', import.meta.url), 'utf8')
const applingReleaseCheck = readFileSync(new URL('../scripts/check-appling-release.mjs', import.meta.url), 'utf8')
const applingArtifactCollector = readFileSync(new URL('../scripts/collect-appling-artifacts.mjs', import.meta.url), 'utf8')
const applingArtifactCollectorPath = fileURLToPath(new URL('../scripts/collect-appling-artifacts.mjs', import.meta.url))
const nativeSigningCheck = readFileSync(new URL('../scripts/check-native-signing-credentials.mjs', import.meta.url), 'utf8')
const nativeSigningCheckPath = fileURLToPath(new URL('../scripts/check-native-signing-credentials.mjs', import.meta.url))
const nativeReleaseAssetCheck = readFileSync(new URL('../scripts/check-native-release-assets.mjs', import.meta.url), 'utf8')
const nativeReleaseAssetCheckPath = fileURLToPath(new URL('../scripts/check-native-release-assets.mjs', import.meta.url))
const nativeReleaseAssetResolver = readFileSync(new URL('../scripts/resolve-native-release-asset.mjs', import.meta.url), 'utf8')
const nativeReleaseAssetResolverPath = fileURLToPath(new URL('../scripts/resolve-native-release-asset.mjs', import.meta.url))
const macosNotarizeScript = readFileSync(new URL('../scripts/notarize-appling-macos.mjs', import.meta.url), 'utf8')
const releaseScript = readFileSync(new URL('../scripts/release-prod.sh', import.meta.url), 'utf8')
const sheetsBundleScript = readFileSync(new URL('../scripts/build-sheets-bundle.sh', import.meta.url), 'utf8')
const mainEntry = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
const bootEntry = readFileSync(new URL('../ui/boot.js', import.meta.url), 'utf8')
const tabRuntime = readFileSync(new URL('../backend/tab-runtime.js', import.meta.url), 'utf8')
const runtimeSmoke = readFileSync(new URL('../scripts/runtime-rpc-smoke.mjs', import.meta.url), 'utf8')
const releaseStorySmoke = readFileSync(new URL('../scripts/release-rpc-story-smoke.mjs', import.meta.url), 'utf8')
const liveCatalogVerifier = readFileSync(new URL('../scripts/verify-live-catalog.js', import.meta.url), 'utf8')
const hiveRelayLayout = readFileSync(new URL('../scripts/check-hiverelay-layout.mjs', import.meta.url), 'utf8')
const hiveRelayCheckPath = fileURLToPath(new URL('../scripts/check-hiverelay-layout.mjs', import.meta.url))
const verifyPin = readFileSync(new URL('../scripts/verify-pin.js', import.meta.url), 'utf8')
const pinAppOnHiveRelay = readFileSync(new URL('../scripts/pin-app-on-hiverelay.js', import.meta.url), 'utf8')
const vendoredHiveRelayPackages = [
  ['p2p-hiverelay', 'vendor/hiverelay/p2p-hiverelay-0.20.0.tgz'],
  ['p2p-hiverelay-client', 'vendor/hiverelay/p2p-hiverelay-client-0.20.0.tgz'],
  ['p2p-hiverelay-verifier', 'vendor/hiverelay/p2p-hiverelay-verifier-0.20.0.tgz']
]

test('Pear stage ignore excludes local release/operator scratch files', () => {
  const ignored = pkg.pear?.stage?.ignore || []
  assert.ok(ignored.includes('/.landing-seed.mjs'))
  assert.ok(ignored.includes('/pearbrowser-storage'))
  assert.ok(ignored.includes('/docs'))
  assert.ok(ignored.includes('/scripts'))
  assert.ok(ignored.includes('/test'))
})

test('release script purges ignored files from previous Pear stages', () => {
  assert.match(releaseScript, /pear stage --purge/)
})

test('release verification asks HiveRelay for signed seed proof evidence', () => {
  assert.match(releaseScript, /verify-pin\.js --expect \$NEW_LEN --hiverelay/)
  assert.match(verifyPin, /HiveRelayClient/)
  assert.match(verifyPin, /proveSeeded/)
  assert.match(verifyPin, /verifySeededFallback/)
})

test('foreign-key app pin refuses empty checkouts before broadcasting seed', () => {
  assert.match(pinAppOnHiveRelay, /current checkout has 0 file entries/)
  assert.match(pinAppOnHiveRelay, /refusing to seed an empty\/unresolved drive/)
  assert.match(pinAppOnHiveRelay, /process\.exit\(4\)/)
  assert.ok(
    pinAppOnHiveRelay.indexOf('if (fileCount === 0)') < pinAppOnHiveRelay.indexOf('client.seed(drive.key'),
    'empty-checkout guard must run before HiveRelay seed broadcast'
  )
})

test('HiveRelay source install uses vendored v0.20.0 packages', () => {
  for (const [name, tarball] of vendoredHiveRelayPackages) {
    assert.equal(pkg.dependencies?.[name], `file:${tarball}`)
    assert.match(hiveRelayLayout, new RegExp(`${name}', '0\\.20\\.0', '${tarball}`))
  }

  assert.match(hiveRelayLayout, /readPackedPackageJson/)
  assert.match(hiveRelayLayout, /package\.json -> file:vendor\/hiverelay\/\*\.tgz/)
  assert.match(hiveRelayLayout, /The sibling \.\.\/\.\.\/00-core\/hiverelay checkout is optional/)
})

test('HiveRelay vendored package guard passes for standalone source installs', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-hiverelay-vendor-')))
  try {
    const vendorDir = join(fixture, 'vendor', 'hiverelay')
    mkdirSync(vendorDir, { recursive: true })

    const dependencies = {}
    for (const [name, tarball] of vendoredHiveRelayPackages) {
      dependencies[name] = `file:${tarball}`
      copyFileSync(
        fileURLToPath(new URL(`../${tarball}`, import.meta.url)),
        join(fixture, tarball)
      )
    }

    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ dependencies }, null, 2))

    const result = spawnSync(process.execPath, [hiveRelayCheckPath], {
      cwd: fixture,
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(result.stderr, /optional local HiveRelay checkout missing/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('desktop CI verifies vendored HiveRelay source install without sibling checkout', () => {
  assert.match(desktopCiWorkflow, /Verify vendored HiveRelay packages/)
  assert.match(desktopCiWorkflow, /npm ci/)
  assert.doesNotMatch(desktopCiWorkflow, /P2P-Hiverelay/)
  assert.doesNotMatch(desktopCiWorkflow, /Checkout HiveRelay workspace packages/)
})

test('release evidence checker is exposed as an operator script', () => {
  assert.equal(pkg.scripts?.['check:release-evidence'], 'node scripts/check-release-evidence.mjs')
})

test('native signing credential checker is exposed as an operator script', () => {
  assert.equal(pkg.scripts?.['check:native-signing'], 'node scripts/check-native-signing-credentials.mjs')
  assert.match(nativeSigningCheck, /--require-public-trust/)
  assert.match(nativeSigningCheck, /PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64/)
  assert.match(nativeSigningCheck, /PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64/)
})

test('native release asset checker is exposed as an operator script', () => {
  assert.equal(pkg.scripts?.['check:native-release-assets'], 'node scripts/check-native-release-assets.mjs')
  assert.match(nativeReleaseAssetCheck, /gh', \[\s*'release',\s*'view'/)
  assert.match(nativeReleaseAssetCheck, /SHA256SUMS-\$\{escapeRegex\(platform\)\}/)
  assert.match(nativeReleaseAssetCheck, /manifest-\$\{escapeRegex\(platform\)\}/)
  assert.match(nativeReleaseAssetCheck, /missing SHA-256 sidecar/)
  assert.match(nativeReleaseAssetCheck, /--require-published/)
})

test('native release asset resolver is exposed for platform download guidance', () => {
  assert.equal(pkg.scripts?.['resolve:native-release'], 'node scripts/resolve-native-release-asset.mjs')
  assert.match(nativeReleaseAssetResolver, /normalizePlatform/)
  assert.match(nativeReleaseAssetResolver, /artifactRank/)
  assert.match(nativeReleaseAssetResolver, /githubReleaseAssetUrl/)
  assert.match(nativeReleaseAssetResolver, /missing SHA-256 sidecar/)
})

test('appling release metadata stays in sync with the production Pear channel', () => {
  const productionId = pearConfig.links.production.replace(/^pear:\/\//, '')
  assert.match(applingCmake, new RegExp(`ID "${productionId}"`))
  assert.match(applingCmake, new RegExp(`VERSION ${pkg.version.replace(/\./g, '\\.')}`))
  assert.equal(applingPkg.name, 'pearbrowser-desktop-appling')
  assert.equal(applingPkg.devDependencies?.['bare-headers'], '1.28.7')
  assert.equal(applingPkg.devDependencies?.['bare-make'], '1.8.0')
  assert.equal(applingLock.packages?.['node_modules/bare-headers']?.version, '1.28.7')
  assert.equal(applingLock.packages?.['node_modules/bare-make']?.version, '1.8.0')
  assert.equal(applingPkg.scripts.generate, 'bare-make generate')
  assert.equal(applingPkg.scripts.build, 'bare-make build')
  assert.equal(pkg.scripts?.['check:appling-release'], 'node scripts/check-appling-release.mjs')
  assert.equal(pkg.scripts?.['package:appling'], 'node scripts/collect-appling-artifacts.mjs')
  assert.match(applingReleaseCheck, /appling CMake ID/)
  assert.match(applingReleaseCheck, /release tag must look like vX\.Y\.Z/)
  assert.match(applingReleaseCheck, /\['macOS icon', '\.\.\/appling\/assets\/darwin\/icon\.png'\]/)
  assert.match(applingReleaseCheck, /\['macOS icns icon', '\.\.\/appling\/assets\/darwin\/icon\.icns'\]/)
  assert.match(applingCmake, /PEARBROWSER_BARE_HEADERS_VERSION "1\.28\.7"/)
  assert.match(applingCmake, /PEARBROWSER_MACOS_SIGNING_IDENTITY\s+"-"\s+CACHE/)
  assert.match(applingCmake, /PEARBROWSER_WINDOWS_SIGNING_SUBJECT\s+"CN=PearBrowser Desktop"\s+CACHE/)
  assert.match(applingCmake, /WINDOWS_SIGNING_SUBJECT "\$\{PEARBROWSER_WINDOWS_SIGNING_SUBJECT\}"/)
  assert.match(applingCmake, /WINDOWS_SIGNING_THUMBPRINT "\$\{PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT\}"/)
  assert.match(applingCmake, /function\(download_bare_headers result\)/)
  assert.match(applingCmake, /function\(code_sign_macos target\)/)
  assert.match(applingCmake, /function\(code_sign_windows target\)/)
  assert.match(applingReleaseCheck, /bare-make generate/)
})

test('native release workflow builds and attaches appling artifacts for every desktop OS', () => {
  assert.match(nativeReleaseWorkflow, /name: Desktop Native Release/)
  assert.match(nativeReleaseWorkflow, /workflow_dispatch:/)
  assert.match(nativeReleaseWorkflow, /source_ref:/)
  assert.match(nativeReleaseWorkflow, /SOURCE_REF:/)
  assert.match(nativeReleaseWorkflow, /ref: \$\{\{ env\.SOURCE_REF \}\}/)
  assert.match(nativeReleaseWorkflow, /release:/)
  assert.match(nativeReleaseWorkflow, /push:\n\s+tags:/)
  assert.match(nativeReleaseWorkflow, /macos-latest/)
  assert.match(nativeReleaseWorkflow, /windows-latest/)
  assert.match(nativeReleaseWorkflow, /ubuntu-latest/)
  assert.match(nativeReleaseWorkflow, /libgtk-4-dev/)
  assert.match(nativeReleaseWorkflow, /core\.longpaths true/)
  assert.match(nativeReleaseWorkflow, /MakeAppx\.exe/)
  assert.match(nativeReleaseWorkflow, /npm ci --prefix appling/)
  assert.doesNotMatch(nativeReleaseWorkflow, /npm install -g bare-make/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_SIGNING_IDENTITY/)
  assert.match(nativeReleaseWorkflow, /node scripts\/check-native-signing-credentials\.mjs --platform "\$RUNNER_OS"/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_NOTARY_APPLE_ID/)
  assert.match(nativeReleaseWorkflow, /Import macOS signing certificate/)
  assert.match(nativeReleaseWorkflow, /node scripts\/notarize-appling-macos\.mjs/)
  assert.match(nativeReleaseWorkflow, /security set-key-partition-list/)
  assert.match(nativeReleaseWorkflow, /security delete-keychain/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64/)
  assert.match(nativeReleaseWorkflow, /Import-PfxCertificate/)
  assert.match(nativeReleaseWorkflow, /Sign additional Windows installer artifacts/)
  assert.match(nativeReleaseWorkflow, /signtool verify/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling generate/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling build/)
  assert.match(nativeReleaseWorkflow, /actions\/upload-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /actions\/download-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /release-platform: macos/)
  assert.match(nativeReleaseWorkflow, /gh release view "\$RELEASE_TAG"/)
  assert.match(nativeReleaseWorkflow, /SHA256SUMS-\$\{platform\}-\*\.txt/)
  assert.match(nativeReleaseWorkflow, /Missing SHA-256 sidecar/)
  assert.match(nativeReleaseWorkflow, /gh release upload "\$RELEASE_TAG" "\$\{assets\[@\]\}"/)
  assert.match(nativeReleaseWorkflow, /Checkout release verifier/)
  assert.match(nativeReleaseWorkflow, /check-native-release-assets\.mjs/)
  assert.doesNotMatch(nativeReleaseWorkflow, /gh release create/)
  assert.match(nativeReleaseWorkflow, /contents: write/)
})

test('native signing credential checker separates package proof from public trust gates', () => {
  const run = (env, args = []) => {
    const result = spawnSync(process.execPath, [
      nativeSigningCheckPath,
      '--json',
      ...args
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env
    })
    return {
      ...result,
      report: result.stdout ? JSON.parse(result.stdout) : null
    }
  }

  const proof = run({})
  assert.equal(proof.status, 0)
  assert.equal(proof.report.mode, 'package-proof')
  assert.equal(proof.report.counts.fail, 0)
  assert.ok(proof.report.counts.warn >= 3)

  const publicTrustMissing = run({}, ['--require-public-trust'])
  assert.notEqual(publicTrustMissing.status, 0)
  assert.equal(publicTrustMissing.report.mode, 'public-trust')
  assert.ok(publicTrustMissing.report.checks.some((check) => check.id === 'macos-certificate' && check.status === 'fail'))
  assert.ok(publicTrustMissing.report.checks.some((check) => check.id === 'macos-notary' && check.status === 'fail'))
  assert.ok(publicTrustMissing.report.checks.some((check) => check.id === 'windows-certificate' && check.status === 'fail'))

  const macosComplete = run({
    PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64: Buffer.from('dummy p12').toString('base64'),
    PEARBROWSER_MACOS_CERTIFICATE_PASSWORD: 'secret',
    PEARBROWSER_MACOS_SIGNING_IDENTITY: 'Developer ID Application: PearBrowser Desktop (TEAMID)',
    PEARBROWSER_MACOS_NOTARY_APPLE_ID: 'release@example.com',
    PEARBROWSER_MACOS_NOTARY_PASSWORD: 'secret',
    PEARBROWSER_MACOS_NOTARY_TEAM_ID: 'TEAMID'
  }, ['--platform', 'macos', '--require-public-trust'])
  assert.equal(macosComplete.status, 0)
  assert.equal(macosComplete.report.counts.fail, 0)

  const windowsComplete = run({
    PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64: Buffer.from('dummy pfx').toString('base64'),
    PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD: 'secret'
  }, ['--platform', 'windows', '--require-public-trust'])
  assert.equal(windowsComplete.status, 0)
  assert.equal(windowsComplete.report.counts.fail, 0)

  const partialWindows = run({
    PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64: Buffer.from('dummy pfx').toString('base64')
  }, ['--platform', 'windows'])
  assert.notEqual(partialWindows.status, 0)
  assert.ok(partialWindows.report.checks.some((check) => check.id === 'windows-certificate' && check.status === 'fail'))
})

test('macOS notarization helper submits, staples, and verifies app bundles', () => {
  assert.match(macosNotarizeScript, /PEARBROWSER_MACOS_NOTARY_APPLE_ID/)
  assert.match(macosNotarizeScript, /notarytool/)
  assert.match(macosNotarizeScript, /stapler/)
  assert.match(macosNotarizeScript, /codesign/)
  assert.match(macosNotarizeScript, /Skipping macOS notarization/)
  assert.match(macosNotarizeScript, /--password/)
  assert.match(macosNotarizeScript, /\*\*\*\*\*\*\*\*/)
})

test('appling artifact collector emits checksummed release assets', () => {
  assert.match(applingArtifactCollector, /createHash\('sha256'\)/)
  assert.match(applingArtifactCollector, /\.app\.zip/)
  assert.match(applingArtifactCollector, /\.msix/)
  assert.match(applingArtifactCollector, /SHA256SUMS-\$\{releasePlatform\}-\$\{arch\}\.txt/)
  assert.match(applingArtifactCollector, /\$\{appName\}-\$\{version\}-\$\{releasePlatform\}-\$\{arch\}/)
  assert.match(applingArtifactCollector, /no \$\{releasePlatform\} appling artifacts found/)
  assert.match(applingArtifactCollector, /release version \$\{version\} does not match package\.json version/)
  assert.match(applingArtifactCollector, /refusing to clear unsafe output directory/)
})

test('appling artifact collector emits normalized assets and checksum manifests', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-appling-release-')))
  try {
    const buildDir = join(fixture, 'appling', 'build', 'nested')
    mkdirSync(buildDir, { recursive: true })
    writeFileSync(join(buildDir, 'PearBrowser Setup.exe'), 'windows installer bytes')
    writeFileSync(join(buildDir, 'PearBrowser.dmg'), 'wrong platform bytes')
    writeFileSync(join(buildDir, 'notes.txt'), 'not a release artifact')

    execFileSync(process.execPath, [
      applingArtifactCollectorPath,
      '--tag',
      'v0.5.0',
      '--platform',
      'windows',
      '--arch',
      'X64',
      '--build-dir',
      join(fixture, 'appling', 'build')
    ], { cwd: fixture, encoding: 'utf8' })

    const outDir = join(fixture, 'dist', 'appling-release', 'v0.5.0', 'windows')
    assert.deepEqual(readdirSync(outDir).sort(), [
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'SHA256SUMS-windows-x64.txt',
      'manifest-windows-x64.json'
    ])

    const sidecar = readFileSync(join(outDir, 'PearBrowser-0.5.0-windows-x64.exe.sha256'), 'utf8')
    assert.match(sidecar, /^[a-f0-9]{64}  PearBrowser-0\.5\.0-windows-x64\.exe\n$/)

    const sums = readFileSync(join(outDir, 'SHA256SUMS-windows-x64.txt'), 'utf8')
    assert.equal(sums, sidecar)

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest-windows-x64.json'), 'utf8'))
    assert.equal(manifest.tag, 'v0.5.0')
    assert.equal(manifest.version, '0.5.0')
    assert.equal(manifest.platform, 'windows')
    assert.equal(manifest.arch, 'x64')
    assert.equal(manifest.artifacts.length, 1)
    assert.equal(manifest.artifacts[0].name, 'PearBrowser-0.5.0-windows-x64.exe')
    assert.equal(manifest.artifacts[0].source, 'appling/build/nested/PearBrowser Setup.exe')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('appling artifact collector refuses unsafe output directories before clearing them', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-appling-release-')))
  try {
    const buildDir = join(fixture, 'appling', 'build')
    const unsafeDir = join(fixture, 'unsafe-output')
    const sentinel = join(unsafeDir, 'keep.txt')
    mkdirSync(buildDir, { recursive: true })
    mkdirSync(unsafeDir, { recursive: true })
    writeFileSync(join(buildDir, 'PearBrowser.exe'), 'windows installer bytes')
    writeFileSync(sentinel, 'do not delete')

    const result = spawnSync(process.execPath, [
      applingArtifactCollectorPath,
      '--tag',
      'v0.5.0',
      '--platform',
      'windows',
      '--arch',
      'x64',
      '--build-dir',
      buildDir,
      '--out-dir',
      unsafeDir
    ], { cwd: fixture, encoding: 'utf8' })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /refusing to clear unsafe output directory/)
    assert.equal(readFileSync(sentinel, 'utf8'), 'do not delete')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native release asset checker accepts complete attached asset fixtures', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-assets-')))
  try {
    const releasePath = join(fixture, 'release.json')
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: [
        'PearBrowser-0.5.0-macos-arm64.app.zip',
        'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
        'SHA256SUMS-macos-arm64.txt',
        'manifest-macos-arm64.json',
        'PearBrowser-0.5.0-windows-x64.msix',
        'PearBrowser-0.5.0-windows-x64.msix.sha256',
        'PearBrowser-0.5.0-windows-x64-installer.exe',
        'PearBrowser-0.5.0-windows-x64-installer.exe.sha256',
        'SHA256SUMS-windows-x64.txt',
        'manifest-windows-x64.json',
        'PearBrowser-0.5.0-linux-x64.AppImage',
        'PearBrowser-0.5.0-linux-x64.AppImage.sha256',
        'SHA256SUMS-linux-x64.txt',
        'manifest-linux-x64.json'
      ].map((name, i) => ({ name, size: i + 1 }))
    }, null, 2))

    const result = spawnSync(process.execPath, [
      nativeReleaseAssetCheckPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.counts.assets, 14)
    assert.equal(report.platforms.macos.artifacts.length, 1)
    assert.equal(report.platforms.windows.artifacts.length, 2)
    assert.equal(report.platforms.linux.artifacts.length, 1)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native release asset resolver chooses the recommended package for each desktop platform', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-resolver-')))
  try {
    const releasePath = join(fixture, 'release.json')
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: [
        'PearBrowser-0.5.0-macos-arm64.app.zip',
        'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
        'PearBrowser-0.5.0-windows-x64.msix',
        'PearBrowser-0.5.0-windows-x64.msix.sha256',
        'PearBrowser-0.5.0-windows-x64.exe',
        'PearBrowser-0.5.0-windows-x64.exe.sha256',
        'PearBrowser-0.5.0-linux-x64-PearBrowser.AppImage',
        'PearBrowser-0.5.0-linux-x64-PearBrowser.AppImage.sha256',
        'PearBrowser-0.5.0-linux-x64.AppImage',
        'PearBrowser-0.5.0-linux-x64.AppImage.sha256'
      ].map((name, i) => ({
        name,
        size: i + 1,
        url: `https://example.invalid/${name}`
      }))
    }, null, 2))

    const resolve = (platform, arch) => {
      const result = spawnSync(process.execPath, [
        nativeReleaseAssetResolverPath,
        '--fixture',
        releasePath,
        '--tag',
        'v0.5.0',
        '--platform',
        platform,
        '--arch',
        arch,
        '--json'
      ], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        encoding: 'utf8'
      })
      assert.equal(result.status, 0, result.stderr || result.stdout)
      return JSON.parse(result.stdout)
    }

    assert.equal(resolve('macos', 'arm64').asset.name, 'PearBrowser-0.5.0-macos-arm64.app.zip')
    assert.equal(resolve('windows', 'x64').asset.name, 'PearBrowser-0.5.0-windows-x64.exe')
    assert.equal(resolve('linux', 'x64').asset.name, 'PearBrowser-0.5.0-linux-x64.AppImage')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native release asset checker fails when an installer sidecar is missing', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-assets-')))
  try {
    const releasePath = join(fixture, 'release.json')
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: [
        'PearBrowser-0.5.0-macos-arm64.app.zip',
        'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
        'SHA256SUMS-macos-arm64.txt',
        'manifest-macos-arm64.json',
        'PearBrowser-0.5.0-windows-x64.msix',
        'SHA256SUMS-windows-x64.txt',
        'manifest-windows-x64.json',
        'PearBrowser-0.5.0-linux-x64.AppImage',
        'PearBrowser-0.5.0-linux-x64.AppImage.sha256',
        'SHA256SUMS-linux-x64.txt',
        'manifest-linux-x64.json'
      ].map((name, i) => ({ name, size: i + 1 }))
    }, null, 2))

    const result = spawnSync(process.execPath, [
      nativeReleaseAssetCheckPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(result.status, 0)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, false)
    assert.ok(report.errors.some((error) => error.includes('missing SHA-256 sidecar for PearBrowser-0.5.0-windows-x64.msix')))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('schema-sheets bundle keeps native addons in package context', () => {
  assert.match(sheetsBundleScript, /--external:quickbit-native/)
  assert.match(sheetsBundleScript, /--external:simdle-native/)
})

test('runtime smoke uses a diagnostic RPC path that does not become the renderer', () => {
  assert.match(mainEntry, /\/status-smoke/)
  assert.match(mainEntry, /function listenRpcServer/)
  assert.match(mainEntry, /http\.createServer/)
  assert.match(bootEntry, /function probeBackend/)
  assert.match(bootEntry, /diagnosticUrlFor/)
  assert.match(bootEntry, /CMD_GET_STATUS/)
  assert.match(tabRuntime, /function listenWsServer/)
  assert.match(tabRuntime, /http\.createServer/)
  assert.match(mainEntry, /onDiagnosticSocket/)
  assert.match(mainEntry, /diagnostics\.add\(socket\)/)
  assert.match(mainEntry, /diagnostics\.delete\(socket\)/)
  assert.match(mainEntry, /teardown\('renderer-ws-close'\)/)
  assert.doesNotMatch(mainEntry.match(/const onDiagnosticSocket[\s\S]*?\n}\n\nconst onSocket/)?.[0] || '', /teardown\(/)
})

test('runtime smoke asserts backend readiness fields', () => {
  assert.match(runtimeSmoke, /\/status-smoke/)
  assert.match(runtimeSmoke, /CMD_GET_STATUS = 2/)
  assert.match(runtimeSmoke, /status\.dhtConnected !== true/)
  assert.match(runtimeSmoke, /status\.proxyPort/)
  assert.match(runtimeSmoke, /status\.hiveRelays/)
})

test('runtime smoke can enforce a clean release profile storage ceiling', () => {
  assert.match(runtimeSmoke, /--max-storage-percent/)
  assert.match(runtimeSmoke, /parseNonNegativeNumber/)
  assert.match(runtimeSmoke, /storagePercent exceeds/)
  assert.match(runtimeSmoke, /args\.maxStoragePercent/)
})

test('release story smoke covers browse, catalogue, local stories, and opt-in site publishing without launching third-party apps', () => {
  assert.equal(pkg.scripts?.['smoke:release-stories'], 'node scripts/release-rpc-story-smoke.mjs')
  assert.match(releaseStorySmoke, /CMD_NAVIGATE/)
  assert.match(releaseStorySmoke, /CMD_LOAD_CATALOG_BEE/)
  assert.match(releaseStorySmoke, /CMD_GET_CATALOG_APPS/)
  assert.match(releaseStorySmoke, /--local-stories/)
  assert.match(releaseStorySmoke, /--site-story/)
  assert.match(releaseStorySmoke, /siteStory: false/)
  assert.match(releaseStorySmoke, /CMD_SEARCH_INDEX/)
  assert.match(releaseStorySmoke, /CMD_SEARCH/)
  assert.match(releaseStorySmoke, /CMD_NAME_RESOLVE/)
  assert.match(releaseStorySmoke, /CMD_USERDATA_ADD_BOOKMARK/)
  assert.match(releaseStorySmoke, /CMD_USERDATA_SAVE_SESSION/)
  assert.match(releaseStorySmoke, /CMD_CREATE_SITE/)
  assert.match(releaseStorySmoke, /CMD_UPDATE_SITE/)
  assert.match(releaseStorySmoke, /CMD_PUBLISH_SITE/)
  assert.match(releaseStorySmoke, /CMD_DELETE_SITE/)
  assert.match(releaseStorySmoke, /PearBrowser\|Pear Browser/)
  assert.match(releaseStorySmoke, /REQUIRED_FEATURED = \['Keet', 'PearPass', 'anonGPT', 'Paste', 'Peercord'\]/)
  assert.match(releaseStorySmoke, /PEERCORD_LINK/)
  assert.match(releaseStorySmoke, /runMode: 'window'/)
  assert.doesNotMatch(releaseStorySmoke, /CMD_LAUNCH_PEAR_LINK/)
  assert.doesNotMatch(releaseStorySmoke, /CMD_RUN_APP_IN_TAB/)
})

test('live catalogue verifier asserts Peercord provenance metadata', () => {
  assert.match(liveCatalogVerifier, /Peercord sourceUrl mismatch/)
  assert.match(liveCatalogVerifier, /https:\/\/git\.churchofmalware\.org\/mastercodeon\/Peercord/)
  assert.match(liveCatalogVerifier, /Peercord license mismatch/)
  assert.match(liveCatalogVerifier, /GPL-3\.0/)
})
