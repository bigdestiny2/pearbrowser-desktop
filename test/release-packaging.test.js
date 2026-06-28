import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
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
const applingReleaseCheck = readFileSync(new URL('../scripts/check-appling-release.mjs', import.meta.url), 'utf8')
const applingArtifactCollector = readFileSync(new URL('../scripts/collect-appling-artifacts.mjs', import.meta.url), 'utf8')
const applingArtifactCollectorPath = fileURLToPath(new URL('../scripts/collect-appling-artifacts.mjs', import.meta.url))
const releaseScript = readFileSync(new URL('../scripts/release-prod.sh', import.meta.url), 'utf8')
const sheetsBundleScript = readFileSync(new URL('../scripts/build-sheets-bundle.sh', import.meta.url), 'utf8')
const mainEntry = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
const bootEntry = readFileSync(new URL('../ui/boot.js', import.meta.url), 'utf8')
const tabRuntime = readFileSync(new URL('../backend/tab-runtime.js', import.meta.url), 'utf8')
const runtimeSmoke = readFileSync(new URL('../scripts/runtime-rpc-smoke.mjs', import.meta.url), 'utf8')
const liveCatalogVerifier = readFileSync(new URL('../scripts/verify-live-catalog.js', import.meta.url), 'utf8')
const hiveRelayLayout = readFileSync(new URL('../scripts/check-hiverelay-layout.mjs', import.meta.url), 'utf8')
const verifyPin = readFileSync(new URL('../scripts/verify-pin.js', import.meta.url), 'utf8')

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

test('HiveRelay workspace pin is v0.20.0 trustless verification release', () => {
  assert.match(hiveRelayLayout, /p2p-hiverelay', '0\.20\.0/)
  assert.match(hiveRelayLayout, /p2p-hiverelay-client', '0\.20\.0/)
  assert.match(hiveRelayLayout, /p2p-hiverelay-verifier', '0\.20\.0/)
})

test('release evidence checker is exposed as an operator script', () => {
  assert.equal(pkg.scripts?.['check:release-evidence'], 'node scripts/check-release-evidence.mjs')
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
  assert.match(nativeReleaseWorkflow, /npm ci --prefix appling/)
  assert.doesNotMatch(nativeReleaseWorkflow, /npm install -g bare-make/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_SIGNING_IDENTITY/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling generate/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling build/)
  assert.match(nativeReleaseWorkflow, /actions\/upload-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /actions\/download-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /release-platform: macos/)
  assert.match(nativeReleaseWorkflow, /gh release view "\$RELEASE_TAG"/)
  assert.match(nativeReleaseWorkflow, /SHA256SUMS-\$\{platform\}-\*\.txt/)
  assert.match(nativeReleaseWorkflow, /Missing SHA-256 sidecar/)
  assert.match(nativeReleaseWorkflow, /gh release upload "\$RELEASE_TAG" "\$\{assets\[@\]\}"/)
  assert.doesNotMatch(nativeReleaseWorkflow, /gh release create/)
  assert.match(nativeReleaseWorkflow, /contents: write/)
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

test('live catalogue verifier asserts Peercord provenance metadata', () => {
  assert.match(liveCatalogVerifier, /Peercord sourceUrl mismatch/)
  assert.match(liveCatalogVerifier, /https:\/\/git\.churchofmalware\.org\/mastercodeon\/Peercord/)
  assert.match(liveCatalogVerifier, /Peercord license mismatch/)
  assert.match(liveCatalogVerifier, /GPL-3\.0/)
})
