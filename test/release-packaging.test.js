import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pearConfig = JSON.parse(readFileSync(new URL('../pear.json', import.meta.url), 'utf8'))
const applingPkg = JSON.parse(readFileSync(new URL('../appling/package.json', import.meta.url), 'utf8'))
const applingCmake = readFileSync(new URL('../appling/CMakeLists.txt', import.meta.url), 'utf8')
const nativeReleaseWorkflow = readFileSync(new URL('../.github/workflows/desktop-native-release.yml', import.meta.url), 'utf8')
const applingReleaseCheck = readFileSync(new URL('../scripts/check-appling-release.mjs', import.meta.url), 'utf8')
const applingArtifactCollector = readFileSync(new URL('../scripts/collect-appling-artifacts.mjs', import.meta.url), 'utf8')
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
  assert.equal(applingPkg.scripts.generate, 'bare-make generate')
  assert.equal(applingPkg.scripts.build, 'bare-make build')
  assert.equal(pkg.scripts?.['check:appling-release'], 'node scripts/check-appling-release.mjs')
  assert.equal(pkg.scripts?.['package:appling'], 'node scripts/collect-appling-artifacts.mjs')
  assert.match(applingReleaseCheck, /appling CMake ID/)
  assert.match(applingReleaseCheck, /release tag must look like vX\.Y\.Z/)
})

test('native release workflow builds and attaches appling artifacts for every desktop OS', () => {
  assert.match(nativeReleaseWorkflow, /name: Desktop Native Release/)
  assert.match(nativeReleaseWorkflow, /workflow_dispatch:/)
  assert.match(nativeReleaseWorkflow, /release:/)
  assert.match(nativeReleaseWorkflow, /push:\n\s+tags:/)
  assert.match(nativeReleaseWorkflow, /macos-latest/)
  assert.match(nativeReleaseWorkflow, /windows-latest/)
  assert.match(nativeReleaseWorkflow, /ubuntu-latest/)
  assert.match(nativeReleaseWorkflow, /npm install -g bare-make/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling generate/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling build/)
  assert.match(nativeReleaseWorkflow, /actions\/upload-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /actions\/download-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /gh release upload "\$RELEASE_TAG" release-assets\/\*/)
  assert.match(nativeReleaseWorkflow, /contents: write/)
})

test('appling artifact collector emits checksummed release assets', () => {
  assert.match(applingArtifactCollector, /createHash\('sha256'\)/)
  assert.match(applingArtifactCollector, /\.app\.zip/)
  assert.match(applingArtifactCollector, /SHA256SUMS-\$\{releasePlatform\}-\$\{arch\}\.txt/)
  assert.match(applingArtifactCollector, /\$\{appName\}-\$\{version\}-\$\{releasePlatform\}-\$\{arch\}/)
  assert.match(applingArtifactCollector, /no \$\{releasePlatform\} appling artifacts found/)
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
