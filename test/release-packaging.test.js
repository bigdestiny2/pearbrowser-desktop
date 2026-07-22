import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
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
import { fileURLToPath, pathToFileURL } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const require = createRequire(import.meta.url)
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
const pearConfig = JSON.parse(readFileSync(new URL('../pear.json', import.meta.url), 'utf8'))
const catalogSource = JSON.parse(readFileSync(new URL('../catalog-source/pearbrowser-network.catalog.json', import.meta.url), 'utf8'))
const { SEED_APPS } = require('../backend/catalogue-seed.js')
const rootLicense = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8')
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
const nativeSigningSecretPlan = readFileSync(new URL('../scripts/generate-native-signing-secret-plan.mjs', import.meta.url), 'utf8')
const nativeSigningSecretPlanPath = fileURLToPath(new URL('../scripts/generate-native-signing-secret-plan.mjs', import.meta.url))
const nativeReleaseAssetCheck = readFileSync(new URL('../scripts/check-native-release-assets.mjs', import.meta.url), 'utf8')
const nativeReleaseAssetCheckPath = fileURLToPath(new URL('../scripts/check-native-release-assets.mjs', import.meta.url))
const nativeReleaseAssetResolver = readFileSync(new URL('../scripts/resolve-native-release-asset.mjs', import.meta.url), 'utf8')
const nativeReleaseAssetResolverPath = fileURLToPath(new URL('../scripts/resolve-native-release-asset.mjs', import.meta.url))
const nativeDownloadVerifier = readFileSync(new URL('../scripts/verify-native-downloads.mjs', import.meta.url), 'utf8')
const nativeDownloadVerifierPath = fileURLToPath(new URL('../scripts/verify-native-downloads.mjs', import.meta.url))
const nativeInstallSnippet = readFileSync(new URL('../scripts/generate-native-install-snippet.mjs', import.meta.url), 'utf8')
const nativeInstallSnippetPath = fileURLToPath(new URL('../scripts/generate-native-install-snippet.mjs', import.meta.url))
const nativeInstallGuide = readFileSync(new URL('../docs/INSTALL_NATIVE_PACKAGES.md', import.meta.url), 'utf8')
const nativeInstallSmokePlan = readFileSync(new URL('../scripts/generate-native-install-smoke-plan.mjs', import.meta.url), 'utf8')
const nativeInstallSmokePlanPath = fileURLToPath(new URL('../scripts/generate-native-install-smoke-plan.mjs', import.meta.url))
const originIsolationSmokePlan = readFileSync(new URL('../scripts/generate-origin-isolation-smoke-plan.mjs', import.meta.url), 'utf8')
const originIsolationSmokePlanPath = fileURLToPath(new URL('../scripts/generate-origin-isolation-smoke-plan.mjs', import.meta.url))
const originIsolationSmokeEvidence = readFileSync(new URL('../scripts/generate-origin-isolation-smoke-evidence.mjs', import.meta.url), 'utf8')
const packageManagerManifests = readFileSync(new URL('../scripts/generate-package-manager-manifests.mjs', import.meta.url), 'utf8')
const packageManagerManifestsPath = fileURLToPath(new URL('../scripts/generate-package-manager-manifests.mjs', import.meta.url))
const publicTrustReadiness = readFileSync(new URL('../scripts/check-public-trust-readiness.mjs', import.meta.url), 'utf8')
const publicTrustReadinessPath = fileURLToPath(new URL('../scripts/check-public-trust-readiness.mjs', import.meta.url))
const publicTrustOperatorReport = readFileSync(new URL('../scripts/generate-public-trust-operator-report.mjs', import.meta.url), 'utf8')
const publicTrustOperatorReportPath = fileURLToPath(new URL('../scripts/generate-public-trust-operator-report.mjs', import.meta.url))
const linuxAppImageMetadata = readFileSync(new URL('../scripts/check-linux-appimage-metadata.mjs', import.meta.url), 'utf8')
const linuxAppImageMetadataPath = fileURLToPath(new URL('../scripts/check-linux-appimage-metadata.mjs', import.meta.url))
const linuxMetainfo = readFileSync(new URL('../appling/assets/linux/io.github.bigdestiny2.pearbrowser.metainfo.xml', import.meta.url), 'utf8')
const macosDmgPackager = readFileSync(new URL('../scripts/create-macos-dmg.mjs', import.meta.url), 'utf8')
const macosNotarizeScript = readFileSync(new URL('../scripts/notarize-appling-macos.mjs', import.meta.url), 'utf8')
const releaseScript = readFileSync(new URL('../scripts/release-prod.sh', import.meta.url), 'utf8')
const sheetsBundleScript = readFileSync(new URL('../scripts/build-sheets-bundle.sh', import.meta.url), 'utf8')
const mainEntry = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
const bootEntry = readFileSync(new URL('../ui/boot.js', import.meta.url), 'utf8')
const rpcWebSocketAuth = readFileSync(new URL('../backend/rpc-websocket-auth.cjs', import.meta.url), 'utf8')
const tabRuntime = readFileSync(new URL('../backend/tab-runtime.js', import.meta.url), 'utf8')
const runtimeSmoke = readFileSync(new URL('../scripts/runtime-rpc-smoke.mjs', import.meta.url), 'utf8')
const releaseStorySmoke = readFileSync(new URL('../scripts/release-rpc-story-smoke.mjs', import.meta.url), 'utf8')
const liveCatalogVerifier = readFileSync(new URL('../scripts/verify-live-catalog.js', import.meta.url), 'utf8')
const hiveRelayLayout = readFileSync(new URL('../scripts/check-hiverelay-layout.mjs', import.meta.url), 'utf8')
const hiveRelayCheckPath = fileURLToPath(new URL('../scripts/check-hiverelay-layout.mjs', import.meta.url))
const relayClient = readFileSync(new URL('../backend/relay-client.js', import.meta.url), 'utf8')
const verifyPin = readFileSync(new URL('../scripts/verify-pin.js', import.meta.url), 'utf8')
const pinAppOnHiveRelay = readFileSync(new URL('../scripts/pin-app-on-hiverelay.js', import.meta.url), 'utf8')
const npmHiveRelayPackages = ['p2p-hiverelay', 'p2p-hiverelay-client', 'p2p-hiverelay-verifier']
const releaseVersion = pkg.version
const releaseTag = `v${releaseVersion}`
const releaseVersionPattern = releaseVersion.replaceAll('.', '\\.')
const releaseTagPattern = releaseTag.replaceAll('.', '\\.')

function writePackageManagerReleaseFixture (fixture, names) {
  const shaByName = new Map()
  const assets = names.map((name, i) => {
    if (name.endsWith('.sha256')) {
      const assetName = name.slice(0, -'.sha256'.length)
      const sha256 = shaByName.get(assetName) || createHash('sha256').update(assetName).digest('hex')
      shaByName.set(assetName, sha256)
      const sidecarPath = join(fixture, name)
      const sidecar = `${sha256}  ${assetName}\n`
      writeFileSync(sidecarPath, sidecar)
      return {
        name,
        size: sidecar.length,
        url: pathToFileURL(sidecarPath).toString()
      }
    }

    const assetPath = join(fixture, name)
    writeFileSync(assetPath, name)
    const sha256 = createHash('sha256').update(name).digest('hex')
    shaByName.set(name, sha256)
    return {
      name,
      size: readFileSync(assetPath).length,
      url: pathToFileURL(assetPath).toString()
    }
  })
  const releasePath = join(fixture, 'release.json')
  writeFileSync(releasePath, JSON.stringify({
    tagName: 'v0.5.0',
    isDraft: false,
    isPrerelease: false,
    assets
  }, null, 2))
  return {
    releasePath,
    shaFor: (name) => shaByName.get(name)
  }
}

function writeCompleteReleaseEvidenceFixture (path) {
  writeFileSync(path, `
# Release Smoke Evidence Log

## Run Metadata

| Field | Value |
| --- | --- |
| Operator | Fixture |
| Desktop repo/branch/head | fixture@abc123 |

## Desktop Automated Baseline

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Public-trust readiness | all machine gates represented | PASS | fixture command output |

## Announcement Decision

| Question | Answer |
| --- | --- |
| Are all required desktop automated gates PASS? | YES |
| Are all required desktop GUI/user-story gates PASS? | YES |
| Was Peercord trust approved manually and did the standalone window open? | OUT OF SCOPE |
| Are all required mobile automated gates PASS? | OUT OF SCOPE |
| Are production mobile signing/store gates PASS, or explicitly out of announcement scope? | OUT OF SCOPE |
| Are residual risks documented in release notes? | YES |
| Final decision (GO, NO-GO, or GO desktop only) | GO desktop only |
`)
}

function writeBlockedPublicTrustReadinessFixture (path) {
  writeFileSync(path, JSON.stringify({
    ok: false,
    repo: 'example/pearbrowser',
    tag: 'v9.9.9',
    sourceRef: 'abc123',
    mode: 'public-trust',
    checks: [
      {
        id: 'native-signing',
        label: 'Native signing credentials',
        ok: false,
        status: 'block',
        summary: 'mode=public-trust; pass=2; warn=0; fail=3',
        command: 'node scripts/check-native-signing-credentials.mjs --require-public-trust --json',
        blockers: [
          'macos-certificate: macOS Developer ID certificate is missing',
          'windows-certificate: Windows signing certificate is missing'
        ],
        warnings: []
      },
      {
        id: 'native-downloads',
        label: 'Native package byte verification',
        ok: true,
        status: 'pass',
        summary: 'verified=4; errors=0',
        command: 'node scripts/verify-native-downloads.mjs --all --json',
        blockers: [],
        warnings: []
      },
      {
        id: 'release-evidence',
        label: 'Operator release evidence log',
        ok: false,
        status: 'block',
        summary: 'passed=38; deferred=3; incomplete=1; failures=0',
        command: 'node scripts/check-release-evidence.mjs --json',
        blockers: [
          'incomplete: Announcement Decision / Final decision (GO, NO-GO, or GO desktop only): answer is blank; final decision is missing'
        ],
        warnings: [
          'deferred: Desktop Automated Baseline / Peercord bundle: publisher reseed required'
        ]
      }
    ],
    blockers: [
      { check: 'native-signing', message: 'macos-certificate: macOS Developer ID certificate is missing' },
      { check: 'native-signing', message: 'windows-certificate: Windows signing certificate is missing' },
      { check: 'release-evidence', message: 'incomplete: Announcement Decision / Final decision (GO, NO-GO, or GO desktop only): answer is blank; final decision is missing' }
    ],
    warnings: [
      { check: 'release-evidence', message: 'deferred: Desktop Automated Baseline / Peercord bundle: publisher reseed required' }
    ]
  }, null, 2))
}

function publicTrustSigningEnv () {
  return {
    PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64: Buffer.from('dummy p12').toString('base64'),
    PEARBROWSER_MACOS_CERTIFICATE_PASSWORD: 'secret',
    PEARBROWSER_MACOS_SIGNING_IDENTITY: 'Developer ID Application: PearBrowser Desktop (TEAMID)',
    PEARBROWSER_MACOS_NOTARY_APPLE_ID: 'release@example.com',
    PEARBROWSER_MACOS_NOTARY_PASSWORD: 'secret',
    PEARBROWSER_MACOS_NOTARY_TEAM_ID: 'TEAMID',
    PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64: Buffer.from('dummy pfx').toString('base64'),
    PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD: 'secret'
  }
}

function writeGithubSigningSecretsFixture (path, options = {}) {
  const omit = new Set(options.omit || [])
  const names = [
    'PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64',
    'PEARBROWSER_MACOS_CERTIFICATE_PASSWORD',
    'PEARBROWSER_MACOS_SIGNING_IDENTITY',
    'PEARBROWSER_MACOS_NOTARY_APPLE_ID',
    'PEARBROWSER_MACOS_NOTARY_PASSWORD',
    'PEARBROWSER_MACOS_NOTARY_TEAM_ID',
    'PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64',
    'PEARBROWSER_WINDOWS_CERTIFICATE_PASSWORD'
  ].filter((name) => !omit.has(name))

  writeFileSync(path, JSON.stringify(names.map((name) => ({ name })), null, 2))
}

function writeLinuxAppDirFixture (fixture, options = {}) {
  const appDir = join(fixture, 'PearBrowser.AppDir')
  const metainfoDir = join(appDir, 'usr', 'share', 'metainfo')
  mkdirSync(metainfoDir, { recursive: true })
  writeFileSync(join(appDir, 'AppRun'), '#!/bin/sh\nexec usr/bin/pearbrowser "$@"\n')
  writeFileSync(join(appDir, 'PearBrowser.desktop'), [
    '[Desktop Entry]',
    'Version=1.0',
    'Name=PearBrowser',
    'Comment=P2P browser, app store, and publishing platform',
    'Exec=pearbrowser',
    `Icon=${options.badIcon ? 'wrong-icon' : 'icon'}`,
    'Type=Application',
    'Categories=Network;',
    ''
  ].join('\n'))
  writeFileSync(join(appDir, 'icon.png'), 'png bytes')
  if (!options.missingMetainfo) {
    writeFileSync(join(metainfoDir, 'io.github.bigdestiny2.pearbrowser.metainfo.xml'), linuxMetainfo)
  }
  return appDir
}

test('Pear stage ignore excludes local release/operator scratch files', () => {
  const ignored = pkg.pear?.stage?.ignore || []
  assert.ok(ignored.includes('/.landing-seed.mjs'))
  assert.ok(ignored.includes('/pearbrowser-storage'))
  assert.ok(ignored.includes('/docs'))
  assert.ok(ignored.includes('/scripts'))
  assert.ok(ignored.includes('/test'))
})

test('PearBrowser catalogue release row stays in sync with package and public addresses', () => {
  const source = catalogSource.apps.find((app) => app.id === 'pearbrowser-desktop')
  const seed = SEED_APPS.find((app) => app.name === 'PearBrowser Desktop')
  const homepageKey = '03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f'

  assert.ok(source, 'catalogue source row missing')
  assert.ok(seed, 'offline catalogue seed row missing')
  assert.equal(source.version, pkg.version)
  assert.equal(source.pearLink, pearConfig.links.production)
  assert.equal(source.link, pearConfig.links.production)
  assert.equal(source.driveKey, homepageKey)
  assert.equal(source.homepage, `hyper://${homepageKey}/`)
  assert.equal(seed.version, source.version)
  assert.equal(seed.link, source.link)
  assert.equal(seed.driveKey, source.driveKey)
  assert.equal(seed.homepage, source.homepage)
})

test('release script purges ignored files from previous Pear stages', () => {
  assert.match(releaseScript, /native-release preflight/)
  assert.match(releaseScript, /no publication authority/)
  assert.doesNotMatch(releaseScript, /pear stage/)
  assert.doesNotMatch(releaseScript, /pear release/)
})

test('v3 release preflight leaves availability verification to the approved release workflow', () => {
  assert.doesNotMatch(releaseScript, /verify-pin\.js/)
  assert.match(releaseScript, /independent HiveRelay availability evidence/)
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

test('HiveRelay source install defaults to npm latest packages locked at 0.20.2', () => {
  for (const name of npmHiveRelayPackages) {
    assert.equal(pkg.dependencies?.[name], 'latest')
    const entry = packageLock.packages?.[`node_modules/${name}`]
    assert.equal(entry?.version, '0.20.2')
    assert.match(entry?.resolved || '', new RegExp(`registry\\.npmjs\\.org/${name}/-/${name}-0\\.20\\.2\\.tgz`))
  }

  assert.match(hiveRelayLayout, /usesNpmLatestDefaults/)
  assert.match(hiveRelayLayout, /verify npm latest resolves to HiveRelay 0\.20\.2/)
  assert.match(hiveRelayLayout, /entry\.version !== version/)
  assert.match(hiveRelayLayout, /Use latest for standalone installs/)
  assert.match(hiveRelayLayout, /process\.exit\(0\)/)
})

test('HiveRelay registry guard is quiet for standalone source installs', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-hiverelay-npm-')))
  try {
    const dependencies = {}
    for (const name of npmHiveRelayPackages) dependencies[name] = 'latest'
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ dependencies }, null, 2))

    const result = spawnSync(process.execPath, [hiveRelayCheckPath], {
      cwd: fixture,
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, '')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('HiveRelay registry guard fails when the npm release line drifts', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-hiverelay-drift-')))
  try {
    const dependencies = {}
    for (const name of npmHiveRelayPackages) dependencies[name] = 'latest'
    dependencies['p2p-hiverelay-client'] = '^0.21.0'
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ dependencies }, null, 2))

    const result = spawnSync(process.execPath, [hiveRelayCheckPath], {
      cwd: fixture,
      encoding: 'utf8'
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /p2p-hiverelay-client expected latest, found \^0\.21\.0/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('HiveRelay local workspace guard still fails for missing file dependencies', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-hiverelay-local-')))
  try {
    const dependencies = {}
    for (const name of npmHiveRelayPackages) dependencies[name] = `file:../../00-core/hiverelay/packages/${name}`
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ dependencies }, null, 2))

    const result = spawnSync(process.execPath, [hiveRelayCheckPath], {
      cwd: fixture,
      encoding: 'utf8'
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /file: HiveRelay dependencies/)
    assert.match(result.stderr, /Missing local packages/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('desktop CI checks out and guards the HiveRelay 0.20.2 release contract', () => {
  assert.match(desktopCiWorkflow, /Checkout HiveRelay release contract/)
  assert.match(desktopCiWorkflow, /ref: v0\.20\.2/)
  assert.match(desktopCiWorkflow, /Guard HiveRelay 0\.20\.2 workspace layout/)
  assert.match(desktopCiWorkflow, /pear-ecosystem\/00-core\/hiverelay\/packages\/core\/package\.json/)
  assert.match(desktopCiWorkflow, /published to npm/)
  assert.match(desktopCiWorkflow, /npm ci/)
  assert.doesNotMatch(desktopCiWorkflow, /Checkout HiveRelay workspace packages/)
  assert.doesNotMatch(desktopCiWorkflow, /vendor\/hiverelay/)
})

test('RelayClient uses scheme-aware transport for public HTTPS gateways', () => {
  assert.match(relayClient, /const https = require\('bare-https'\)/)
  assert.match(relayClient, /function relayTransportForUrl/)
  assert.match(relayClient, /parsed\.protocol === 'https:' \? 443 : 80/)
  assert.match(relayClient, /transport\.get\(relayRequestOptions\(parsed\)/)
  assert.match(relayClient, /transport\.request\(\{/)
  assert.match(relayClient, /DEFAULT_MAX_RESPONSE_BYTES = 16 \* 1024 \* 1024/)
  assert.match(relayClient, /DEFAULT_MAX_CONTROL_RESPONSE_BYTES = 1024 \* 1024/)
})

test('release evidence checker is exposed as an operator script', () => {
  assert.equal(pkg.scripts?.['check:release-evidence'], 'node scripts/check-release-evidence.mjs')
})

test('native signing credential checker is exposed as an operator script', () => {
  assert.equal(pkg.scripts?.['check:native-signing'], 'node scripts/check-native-signing-credentials.mjs')
  assert.match(nativeSigningCheck, /--require-public-trust/)
  assert.match(nativeSigningCheck, /--secret-source/)
  assert.match(nativeSigningCheck, /gh', \[\s*'secret',\s*'list'/)
  assert.match(nativeSigningCheck, /--github-secrets-file/)
  assert.match(nativeSigningCheck, /PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64/)
  assert.match(nativeSigningCheck, /PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64/)
})

test('native signing secret plan generator is exposed for credential handoff', () => {
  assert.equal(pkg.scripts?.['generate:native-signing-secret-plan'], 'node scripts/generate-native-signing-secret-plan.mjs')
  assert.match(nativeSigningSecretPlan, /Native Signing Secret Setup/)
  assert.match(nativeSigningSecretPlan, /PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64/)
  assert.match(nativeSigningSecretPlan, /PEARBROWSER_MACOS_NOTARY_TEAM_ID/)
  assert.match(nativeSigningSecretPlan, /PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64/)
  assert.match(nativeSigningSecretPlan, /openssl base64 -A/)
  assert.match(nativeSigningSecretPlan, /test -s/)
  assert.match(nativeSigningSecretPlan, /test -n/)
  assert.match(nativeSigningSecretPlan, /check:native-signing/)
  assert.match(nativeSigningSecretPlan, /check:public-trust-readiness/)

  const markdown = spawnSync(process.execPath, [
    nativeSigningSecretPlanPath,
    '--repo',
    'example/pearbrowser',
    '--tag',
    'v9.9.9',
    '--source-ref',
    'abc123'
  ], {
    encoding: 'utf8'
  })
  assert.equal(markdown.status, 0, markdown.stderr || markdown.stdout)
  assert.match(markdown.stdout, /# Native Signing Secret Setup/)
  assert.match(markdown.stdout, /Repository: `example\/pearbrowser`/)
  assert.match(markdown.stdout, /test -s DeveloperIDApplication\.p12/)
  assert.match(markdown.stdout, /openssl base64 -A -in DeveloperIDApplication\.p12/)
  assert.match(markdown.stdout, /test -n "\$\{PEARBROWSER_MACOS_CERTIFICATE_PASSWORD:-\}"/)
  assert.match(markdown.stdout, /gh secret set PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64 --repo example\/pearbrowser/)
  assert.match(markdown.stdout, /npm run check:native-signing -- --require-public-trust --secret-source github --repo example\/pearbrowser/)
  assert.match(markdown.stdout, /--source-ref abc123/)

  const json = spawnSync(process.execPath, [
    nativeSigningSecretPlanPath,
    '--repo',
    'example/pearbrowser',
    '--platform',
    'macos',
    '--json'
  ], {
    encoding: 'utf8'
  })
  assert.equal(json.status, 0, json.stderr || json.stdout)
  const report = JSON.parse(json.stdout)
  assert.equal(report.repo, 'example/pearbrowser')
  assert.equal(report.platform, 'macos')
  assert.ok(report.requiredSecrets.includes('PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64'))
  assert.ok(report.requiredSecrets.includes('PEARBROWSER_MACOS_NOTARY_TEAM_ID'))
  assert.ok(report.optionalSecrets.includes('PEARBROWSER_MACOS_KEYCHAIN_PASSWORD'))
  assert.ok(!report.requiredSecrets.includes('PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64'))
  assert.ok(report.secrets.some((secret) => secret.name === 'PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64' && secret.command.includes('test -s DeveloperIDApplication.p12')))
  assert.ok(report.secrets.some((secret) => secret.name === 'PEARBROWSER_MACOS_CERTIFICATE_PASSWORD' && secret.command.includes('test -n "${PEARBROWSER_MACOS_CERTIFICATE_PASSWORD:-}"')))
  assert.ok(report.verificationCommands.some((command) => command.includes('check:native-signing')))
})

test('native release asset checker is exposed as an operator script', () => {
  assert.equal(pkg.scripts?.['check:native-release-assets'], 'node scripts/check-native-release-assets.mjs')
  assert.match(nativeReleaseAssetCheck, /gh', \[\s*'release',\s*'view'/)
  assert.match(nativeReleaseAssetCheck, /SHA256SUMS-\$\{escapeRegex\(platform\)\}/)
  assert.match(nativeReleaseAssetCheck, /manifest-\$\{escapeRegex\(platform\)\}/)
  assert.match(nativeReleaseAssetCheck, /missing SHA-256 sidecar/)
  assert.match(nativeReleaseAssetCheck, /--require-published/)
  assert.match(nativeReleaseAssetCheck, /--require-public-trust/)
  assert.match(nativeReleaseAssetCheck, /--require-backfill-formats/)
  assert.match(nativeReleaseAssetCheck, /missing public-trust macOS DMG/)
  assert.match(nativeReleaseAssetCheck, /missing required v0\.5\.0 backfill/)
})

test('native release asset resolver is exposed for platform download guidance', () => {
  assert.equal(pkg.scripts?.['resolve:native-release'], 'node scripts/resolve-native-release-asset.mjs')
  assert.match(nativeReleaseAssetResolver, /normalizePlatform/)
  assert.match(nativeReleaseAssetResolver, /artifactRank/)
  assert.match(nativeReleaseAssetResolver, /githubReleaseAssetUrl/)
  assert.match(nativeReleaseAssetResolver, /missing SHA-256 sidecar/)
})

test('native download verifier is exposed for end-to-end checksum evidence', () => {
  assert.equal(pkg.scripts?.['verify:native-downloads'], 'node scripts/verify-native-downloads.mjs')
  assert.match(nativeDownloadVerifier, /SUPPORTED_TARGETS/)
  assert.match(nativeDownloadVerifier, /readUrlText/)
  assert.match(nativeDownloadVerifier, /hashUrl/)
  assert.match(nativeDownloadVerifier, /SHA-256 mismatch/)
})

test('Linux AppImage metadata checker is exposed for desktop integration gates', () => {
  assert.equal(pkg.scripts?.['check:linux-appimage-metadata'], 'node scripts/check-linux-appimage-metadata.mjs')
  assert.match(linuxAppImageMetadata, /PearBrowser\.desktop/)
  assert.match(linuxAppImageMetadata, /io\.github\.bigdestiny2\.pearbrowser\.metainfo\.xml/)
  assert.match(linuxAppImageMetadata, /metadata_license/)
  assert.match(linuxAppImageMetadata, /--build-dir/)
  assert.match(linuxAppImageMetadata, /isProductAppImage/)
  assert.match(linuxAppImageMetadata, /exactly one PearBrowser AppImage/)
  assert.doesNotMatch(linuxAppImageMetadata, /if \(appDirs\.length\) \{[\s\S]*?return\n\s*\}/)
  assert.match(linuxMetainfo, /<component type="desktop-application">/)
  assert.match(linuxMetainfo, /<launchable type="desktop-id">PearBrowser\.desktop<\/launchable>/)
  assert.match(linuxMetainfo, /<binary>pearbrowser<\/binary>/)
})

test('native install snippet generator is exposed for release notes', () => {
  assert.equal(pkg.scripts?.['generate:native-install-snippet'], 'node scripts/generate-native-install-snippet.mjs')
  assert.equal(pkg.scripts?.['generate:native-install-guide'], 'node scripts/generate-native-install-snippet.mjs --format guide')
  assert.match(nativeInstallSnippet, /SUPPORTED_TARGETS/)
  assert.match(nativeInstallSnippet, /Native Installers/)
  assert.match(nativeInstallSnippet, /artifactRank/)
  assert.match(nativeInstallSnippet, /--format/)
  assert.match(nativeInstallSnippet, /Install Native Packages/)
  assert.match(nativeInstallSnippet, /Trust Note/)
  assert.match(nativeInstallGuide, new RegExp(`releases/download/${releaseTagPattern}/PearBrowser-${releaseVersionPattern}-macos-arm64\\.app\\.zip`))
  assert.match(nativeInstallGuide, /Apple could not verify that\s+PearBrowser is free of malware/)
  assert.match(nativeInstallGuide, /Open Anyway/)
  assert.match(nativeInstallGuide, /generate:native-install-guide/)
})

test('native install smoke plan generator is exposed for clean-machine evidence', () => {
  assert.equal(pkg.scripts?.['generate:native-install-smoke-plan'], 'node scripts/generate-native-install-smoke-plan.mjs')
  assert.match(nativeInstallSmokePlan, /SUPPORTED_TARGETS/)
  assert.match(nativeInstallSmokePlan, /Native Clean-Install Smoke Plan/)
  assert.match(nativeInstallSmokePlan, /clean host or VM/)
  assert.match(nativeInstallSmokePlan, /runtime-rpc-smoke\.mjs/)
  assert.match(nativeInstallSmokePlan, /--source-ref/)
  assert.match(nativeInstallSmokePlan, /public-trust clean-install smoke requires notarized macOS DMG/)
})

test('origin isolation smoke plan generator is exposed for feature-flagged GUI evidence', () => {
  assert.equal(pkg.scripts?.['generate:origin-isolation-smoke-plan'], 'node scripts/generate-origin-isolation-smoke-plan.mjs')
  assert.equal(pkg.scripts?.['generate:origin-isolation-smoke-evidence'], 'node scripts/generate-origin-isolation-smoke-evidence.mjs')
  assert.match(originIsolationSmokePlan, /PEARBROWSER_PER_DRIVE_ORIGINS=1/)
  assert.match(originIsolationSmokePlan, /localStorage/)
  assert.match(originIsolationSmokePlan, /indexedDB/)
  assert.match(originIsolationSmokePlan, /document\.cookie/)
  assert.match(originIsolationSmokePlan, /strict-CSP real app/)
  assert.match(originIsolationSmokePlan, /Peerit identity\/sync/)
  assert.match(originIsolationSmokePlan, /generate-origin-isolation-smoke-evidence\.mjs/)
  assert.match(originIsolationSmokeEvidence, /local-hyperproxy-httpbridge-fixture/)
  assert.match(originIsolationSmokeEvidence, /new HyperProxy/)
  assert.match(originIsolationSmokeEvidence, /new HttpBridge/)
})

test('origin isolation smoke plan generator emits app-specific acceptance evidence', () => {
  const appA = `hyper://${'a'.repeat(64)}/index.html`
  const appB = `hyper://${'b'.repeat(64)}/index.html`
  const result = spawnSync(process.execPath, [
    originIsolationSmokePlanPath,
    '--app-a',
    appA,
    '--app-b',
    appB,
    '--label-a',
    'Peerit fixture',
    '--label-b',
    'Poked fixture',
    '--json'
  ], {
    encoding: 'utf8'
  })

  assert.equal(result.status, 0, result.stderr || result.stdout)
  const report = JSON.parse(result.stdout)
  assert.equal(report.ok, true)
  assert.equal(report.kind, 'pearbrowser-origin-isolation-smoke-plan')
  assert.equal(report.featureFlag, 'PEARBROWSER_PER_DRIVE_ORIGINS=1')
  assert.equal(report.apps[0].driveKey, 'a'.repeat(64))
  assert.equal(report.apps[1].driveKey, 'b'.repeat(64))
  assert.ok(report.commands.some((command) => command.id === 'launch-feature-flagged-desktop'))
  assert.ok(report.commands.some((command) => command.command.includes('--homepage-url')))
  assert.ok(report.commands.some((command) => command.id === 'automated-origin-isolation-evidence'))
  assert.match(report.automatedVerifier.command, /generate:origin-isolation-smoke-evidence/)
  assert.match(report.automatedVerifier.validatesWith, /check:origin-isolation-smoke-evidence/)
  assert.ok(report.manualSteps.some((step) => step.id === 'origin-split'))
  assert.ok(report.manualSteps.some((step) => step.id === 'real-app-bridge'))
  assert.equal(report.evidenceTemplate.kind, 'pearbrowser-origin-isolation-smoke-evidence')
  assert.equal(report.evidenceTemplate.apps[0].driveKey, 'a'.repeat(64))
  assert.equal(report.evidenceTemplate.storage.proofKey, 'pear-origin-isolation-proof')
  assert.equal(report.evidenceTemplate.realAppBridge.routes.swarmEvents, true)
  assert.match(report.evidenceTemplate.automatedVerifier.command, /generate:origin-isolation-smoke-evidence/)
  assert.match(report.snippets.writeStorageInAppA, /localStorage\.setItem/)
  assert.match(report.snippets.writeStorageInAppA, /indexedDB\.open/)
  assert.match(report.snippets.readStorageInAppB, /document\.cookie/)
  assert.ok(report.acceptance.some((item) => item.includes('different `location.origin`')))

  const rejected = spawnSync(process.execPath, [
    originIsolationSmokePlanPath,
    '--app-a',
    appA,
    '--app-b',
    appA,
    '--json'
  ], {
    encoding: 'utf8'
  })
  assert.equal(rejected.status, 2)
  assert.match(rejected.stderr, /different drive keys/)
})

test('package-manager manifest generator is exposed for channel expansion drafts', () => {
  assert.equal(pkg.scripts?.['generate:package-manager-manifests'], 'node scripts/generate-package-manager-manifests.mjs')
  assert.match(packageManagerManifests, /generateHomebrewCask/)
  assert.match(packageManagerManifests, /generateWingetSingleton/)
  assert.match(packageManagerManifests, /projectLicenseFromPackage/)
  assert.match(packageManagerManifests, /InstallerSha256/)
  assert.match(packageManagerManifests, /public-trust Homebrew Cask requires notarized macOS DMG/)
})

test('project license metadata is explicit for public package-manager drafts', () => {
  assert.equal(pkg.license, 'Apache-2.0 AND MIT')
  assert.match(rootLicense, /SPDX-License-Identifier: Apache-2\.0 AND MIT/)
  assert.match(rootLicense, /appling\/LICENSE/)
  assert.match(rootLicense, /MIT License/)
  assert.match(linuxMetainfo, /<project_license>Apache-2\.0 AND MIT<\/project_license>/)
})

test('public-trust readiness checker is exposed as the announcement gate', () => {
  assert.equal(pkg.scripts?.['check:public-trust-readiness'], 'node scripts/check-public-trust-readiness.mjs')
  assert.match(publicTrustReadiness, /check-native-signing-credentials\.mjs/)
  assert.match(publicTrustReadiness, /check-native-release-assets\.mjs/)
  assert.match(publicTrustReadiness, /verify-native-downloads\.mjs/)
  assert.match(publicTrustReadiness, /check-linux-appimage-metadata\.mjs/)
  assert.match(publicTrustReadiness, /generate-native-install-smoke-plan\.mjs/)
  assert.match(publicTrustReadiness, /generate-package-manager-manifests\.mjs/)
  assert.match(publicTrustReadiness, /check-release-evidence\.mjs/)
  assert.match(publicTrustReadiness, /--require-public-trust/)
  assert.match(publicTrustReadiness, /--require-published/)
  assert.match(publicTrustReadiness, /--require-backfill-formats/)
  assert.match(publicTrustReadiness, /--source-ref/)
  assert.match(publicTrustReadiness, /--signing-secret-source/)
  assert.match(publicTrustReadiness, /--dry-run/)
})

test('public-trust operator report is exposed for release handoff', () => {
  assert.equal(pkg.scripts?.['generate:public-trust-operator-report'], 'node scripts/generate-public-trust-operator-report.mjs')
  assert.match(publicTrustOperatorReport, /Public-Trust Release Operator Report/)
  assert.match(publicTrustOperatorReport, /check-public-trust-readiness\.mjs/)
  assert.match(publicTrustOperatorReport, /generate:native-signing-secret-plan/)
  assert.match(publicTrustOperatorReport, /gh workflow run desktop-native-release\.yml/)
  assert.match(publicTrustOperatorReport, /generate:native-install-smoke-plan/)
  assert.match(publicTrustOperatorReport, /check:release-evidence/)
})

test('public-trust operator report formats readiness blockers into next actions', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-public-trust-operator-report-')))
  try {
    const readinessPath = join(fixture, 'readiness.json')
    writeBlockedPublicTrustReadinessFixture(readinessPath)

    const markdown = spawnSync(process.execPath, [
      publicTrustOperatorReportPath,
      '--readiness-file',
      readinessPath,
      '--evidence-file',
      'docs/custom-evidence.md'
    ], {
      encoding: 'utf8'
    })
    assert.equal(markdown.status, 1)
    assert.match(markdown.stdout, /# Public-Trust Release Operator Report/)
    assert.match(markdown.stdout, /Status: `BLOCKED`/)
    assert.match(markdown.stdout, /### Signing Credentials/)
    assert.match(markdown.stdout, /\[ \] macos-certificate: macOS Developer ID certificate is missing/)
    assert.match(markdown.stdout, /### Operator Evidence/)
    assert.match(markdown.stdout, /Final decision is missing/i)
    assert.match(markdown.stdout, /npm run -s generate:native-signing-secret-plan -- --repo example\/pearbrowser --tag v9\.9\.9 --source-ref abc123/)
    assert.match(markdown.stdout, /gh workflow run desktop-native-release\.yml --repo example\/pearbrowser --ref main -f tag=v9\.9\.9 -f source_ref=abc123 -f release_mode=public-trust/)
    assert.match(markdown.stdout, /npm run -s generate:release-evidence-handoff -- --file docs\/custom-evidence\.md/)
    assert.match(markdown.stdout, /npm run check:release-evidence -- --file docs\/custom-evidence\.md/)

    const json = spawnSync(process.execPath, [
      publicTrustOperatorReportPath,
      '--readiness-file',
      readinessPath,
      '--evidence-file',
      'docs/custom-evidence.md',
      '--json'
    ], {
      encoding: 'utf8'
    })
    assert.equal(json.status, 1)
    const report = JSON.parse(json.stdout)
    assert.equal(report.ok, false)
    assert.equal(report.repo, 'example/pearbrowser')
    assert.equal(report.tag, 'v9.9.9')
    assert.equal(report.sourceRef, 'abc123')
    assert.equal(report.evidenceFile, 'docs/custom-evidence.md')
    assert.ok(report.blockerGroups.some((group) => group.id === 'native-signing' && group.blockers.length === 2))
    assert.ok(report.nextCommands.some((command) => command.id === 'dispatch-public-trust-workflow'))
    assert.ok(report.nextCommands.some((command) => command.id === 'generate-release-evidence-handoff' && command.command.includes('--file docs/custom-evidence.md')))
    assert.ok(report.warnings.some((warning) => warning.check === 'release-evidence'))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('macOS DMG packager is exposed for public-trust native releases', () => {
  assert.equal(pkg.scripts?.['package:macos-dmg'], 'node scripts/create-macos-dmg.mjs')
  assert.match(macosDmgPackager, /hdiutil/)
  assert.match(macosDmgPackager, /notarytool/)
  assert.match(macosDmgPackager, /stapler/)
  assert.match(macosDmgPackager, /Applications/)
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
  assert.equal(pkg.scripts?.['package:macos-dmg'], 'node scripts/create-macos-dmg.mjs')
  assert.match(applingReleaseCheck, /appling CMake ID/)
  assert.match(applingReleaseCheck, /release tag must look like vX\.Y\.Z/)
  assert.match(applingReleaseCheck, /\['macOS icon', '\.\.\/appling\/assets\/darwin\/icon\.png'\]/)
  assert.match(applingReleaseCheck, /\['macOS icns icon', '\.\.\/appling\/assets\/darwin\/icon\.icns'\]/)
  assert.match(applingReleaseCheck, /Linux AppStream metainfo/)
  assert.match(applingCmake, /PEARBROWSER_BARE_HEADERS_VERSION "1\.28\.7"/)
  assert.match(applingCmake, /PEARBROWSER_LINUX_METAINFO/)
  assert.match(applingCmake, /function\(configure_pear_appling_linux target\)/)
  assert.match(applingCmake, /usr\/share\/metainfo\/io\.github\.bigdestiny2\.pearbrowser\.metainfo\.xml/)
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
  assert.match(nativeReleaseWorkflow, /release_mode:/)
  assert.match(nativeReleaseWorkflow, /package-proof/)
  assert.match(nativeReleaseWorkflow, /public-trust/)
  assert.match(nativeReleaseWorkflow, /SOURCE_REF:/)
  assert.match(nativeReleaseWorkflow, /RELEASE_MODE:/)
  assert.match(nativeReleaseWorkflow, /ref: \$\{\{ env\.SOURCE_REF \}\}/)
  assert.match(nativeReleaseWorkflow, /release:/)
  assert.match(nativeReleaseWorkflow, /push:\n\s+tags:/)
  assert.match(nativeReleaseWorkflow, /macOS Apple Silicon/)
  assert.match(nativeReleaseWorkflow, /macos-15/)
  assert.match(nativeReleaseWorkflow, /macOS Intel/)
  assert.match(nativeReleaseWorkflow, /macos-15-intel/)
  assert.match(nativeReleaseWorkflow, /windows-latest/)
  assert.match(nativeReleaseWorkflow, /ubuntu-latest/)
  assert.match(nativeReleaseWorkflow, /libgtk-4-dev/)
  assert.match(nativeReleaseWorkflow, /core\.longpaths true/)
  assert.match(nativeReleaseWorkflow, /MakeAppx\.exe/)
  assert.match(nativeReleaseWorkflow, /npm ci --prefix appling/)
  assert.doesNotMatch(nativeReleaseWorkflow, /npm install -g bare-make/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_SIGNING_IDENTITY/)
  assert.match(nativeReleaseWorkflow, /args=\(--platform "\$RUNNER_OS"\)/)
  assert.match(nativeReleaseWorkflow, /--require-public-trust/)
  assert.match(nativeReleaseWorkflow, /node scripts\/check-native-signing-credentials\.mjs "\$\{args\[@\]\}"/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_NOTARY_APPLE_ID/)
  assert.match(nativeReleaseWorkflow, /Import macOS signing certificate/)
  assert.match(nativeReleaseWorkflow, /node scripts\/notarize-appling-macos\.mjs/)
  assert.match(nativeReleaseWorkflow, /Create public-trust macOS DMG/)
  assert.match(nativeReleaseWorkflow, /npm run package:macos-dmg -- --tag "\$RELEASE_TAG"/)
  assert.match(nativeReleaseWorkflow, /security set-key-partition-list/)
  assert.match(nativeReleaseWorkflow, /security delete-keychain/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64/)
  assert.match(nativeReleaseWorkflow, /Import-PfxCertificate/)
  assert.match(nativeReleaseWorkflow, /Sign additional Windows installer artifacts/)
  assert.match(nativeReleaseWorkflow, /signtool verify/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling generate/)
  assert.match(nativeReleaseWorkflow, /npm run --prefix appling build/)
  assert.match(nativeReleaseWorkflow, /Verify Linux AppImage metadata/)
  assert.match(nativeReleaseWorkflow, /check:linux-appimage-metadata -- --build-dir appling\/build/)
  assert.match(nativeReleaseWorkflow, /-name 'PearBrowser\.AppImage'/)
  assert.match(nativeReleaseWorkflow, /Expected exactly one PearBrowser\.AppImage/)
  assert.doesNotMatch(nativeReleaseWorkflow, /AppImage' -type f \| head -n1/)
  assert.match(nativeReleaseWorkflow, /actions\/upload-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /actions\/download-artifact@v4/)
  assert.match(nativeReleaseWorkflow, /release-platform: macos/)
  assert.match(nativeReleaseWorkflow, /gh release view "\$RELEASE_TAG"/)
  assert.match(nativeReleaseWorkflow, /SHA256SUMS-\$\{platform\}-\*\.txt/)
  assert.match(nativeReleaseWorkflow, /Expected at least one SHA256SUMS file/)
  assert.match(nativeReleaseWorkflow, /Expected at least one \$\{platform\} backfill artifact matching \$\{pattern\}/)
  assert.match(nativeReleaseWorkflow, /Missing SHA-256 sidecar/)
  assert.match(nativeReleaseWorkflow, /gh release upload "\$RELEASE_TAG" "\$\{assets\[@\]\}"/)
  assert.match(nativeReleaseWorkflow, /Checkout release verifier/)
  assert.match(nativeReleaseWorkflow, /check-native-release-assets\.mjs/)
  assert.match(nativeReleaseWorkflow, /--require-backfill-formats/)
  assert.match(nativeReleaseWorkflow, /Verify public-trust release downloads/)
  assert.match(nativeReleaseWorkflow, /verify-native-downloads\.mjs/)
  assert.match(nativeReleaseWorkflow, /--require-published/)
  assert.match(nativeReleaseWorkflow, /--require-public-trust/)
  assert.doesNotMatch(nativeReleaseWorkflow, /gh release create/)
  assert.match(nativeReleaseWorkflow, /contents: write/)
})

test('native release workflow defaults manual runs to package proof and public release events to public trust', () => {
  assert.match(nativeReleaseWorkflow, /default: package-proof/)
  assert.match(nativeReleaseWorkflow, /RELEASE_MODE: \$\{\{ github\.event\.inputs\.release_mode \|\| 'public-trust' \}\}/)
  assert.match(nativeReleaseWorkflow, /case "\$RELEASE_MODE" in/)
  assert.match(nativeReleaseWorkflow, /if \[\[ "\$RELEASE_MODE" == "public-trust" \]\]; then/)
  assert.ok(
    nativeReleaseWorkflow.indexOf('args+=(--require-public-trust)') <
      nativeReleaseWorkflow.indexOf('node scripts/check-native-signing-credentials.mjs "${args[@]}"'),
    'public-trust mode must add the native signing hard gate before running the checker'
  )
  assert.ok(
    nativeReleaseWorkflow.indexOf('args+=(--require-published)') <
      nativeReleaseWorkflow.indexOf('check-native-release-assets.mjs "${args[@]}"'),
    'public-trust mode must require a published release in the post-upload asset check'
  )
  assert.ok(
    nativeReleaseWorkflow.indexOf('Create public-trust macOS DMG') <
      nativeReleaseWorkflow.indexOf('node scripts/collect-appling-artifacts.mjs'),
    'public-trust macOS DMG must be created before release artifact collection'
  )
  assert.ok(
    nativeReleaseWorkflow.indexOf("if: env.RELEASE_MODE == 'public-trust'") <
      nativeReleaseWorkflow.indexOf('verify-native-downloads.mjs'),
    'public-trust mode must run byte-level native download verification after upload'
  )
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

  // Azure Trusted Signing is an accepted EV-equivalent alternative to the PFX path.
  const windowsAzureComplete = run({
    AZURE_TENANT_ID: 'tenant',
    AZURE_CLIENT_ID: 'client',
    AZURE_CLIENT_SECRET: 'secret',
    AZURE_TRUSTED_SIGNING_ENDPOINT: 'https://eus.codesigning.azure.net/',
    AZURE_TRUSTED_SIGNING_ACCOUNT: 'pearbrowser-signing',
    AZURE_TRUSTED_SIGNING_CERT_PROFILE: 'pearbrowser'
  }, ['--platform', 'windows', '--require-public-trust'])
  assert.equal(windowsAzureComplete.status, 0)
  assert.equal(windowsAzureComplete.report.counts.fail, 0)
  assert.ok(windowsAzureComplete.report.checks.some((check) => check.id === 'windows-certificate' && check.status === 'pass'))

  const partialAzure = run({
    AZURE_TRUSTED_SIGNING_ACCOUNT: 'pearbrowser-signing'
  }, ['--platform', 'windows', '--require-public-trust'])
  assert.notEqual(partialAzure.status, 0)
  assert.ok(partialAzure.report.checks.some((check) => check.id === 'windows-certificate' && check.status === 'fail'))

  const partialWindows = run({
    PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64: Buffer.from('dummy pfx').toString('base64')
  }, ['--platform', 'windows'])
  assert.notEqual(partialWindows.status, 0)
  assert.ok(partialWindows.report.checks.some((check) => check.id === 'windows-certificate' && check.status === 'fail'))

  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-github-signing-secrets-')))
  try {
    const secretsPath = join(fixture, 'github-secrets.json')
    writeGithubSigningSecretsFixture(secretsPath)
    const githubComplete = run({}, [
      '--require-public-trust',
      '--secret-source',
      'github',
      '--repo',
      'bigdestiny2/pearbrowser-desktop',
      '--github-secrets-file',
      secretsPath
    ])
    assert.equal(githubComplete.status, 0, githubComplete.stderr || githubComplete.stdout)
    assert.equal(githubComplete.report.secretSource, 'github')
    assert.equal(githubComplete.report.repo, 'bigdestiny2/pearbrowser-desktop')
    assert.equal(githubComplete.report.counts.fail, 0)
    assert.ok(githubComplete.report.checks.some((check) => check.id === 'secret-values-unreadable' && check.status === 'warn'))

    writeGithubSigningSecretsFixture(secretsPath, { omit: ['PEARBROWSER_MACOS_NOTARY_PASSWORD'] })
    const githubIncomplete = run({}, [
      '--require-public-trust',
      '--secret-source',
      'github',
      '--github-secrets-file',
      secretsPath
    ])
    assert.notEqual(githubIncomplete.status, 0)
    assert.ok(githubIncomplete.report.checks.some((check) => check.id === 'macos-notary' && check.status === 'fail'))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
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
    writeFileSync(join(buildDir, 'PearBrowser.exe'), 'raw bare-pear launcher — must be excluded')
    writeFileSync(join(buildDir, 'PearBrowser.dmg'), 'wrong platform bytes')
    writeFileSync(join(buildDir, 'notes.txt'), 'not a release artifact')

    execFileSync(process.execPath, [
      applingArtifactCollectorPath,
      '--tag',
      releaseTag,
      '--platform',
      'windows',
      '--arch',
      'X64',
      '--build-dir',
      join(fixture, 'appling', 'build')
    ], { cwd: fixture, encoding: 'utf8' })

    const outDir = join(fixture, 'dist', 'appling-release', releaseTag, 'windows')
    assert.deepEqual(readdirSync(outDir).sort(), [
      `PearBrowser-${releaseVersion}-windows-x64.exe`,
      `PearBrowser-${releaseVersion}-windows-x64.exe.sha256`,
      'SHA256SUMS-windows-x64.txt',
      'manifest-windows-x64.json'
    ])

    const sidecar = readFileSync(join(outDir, `PearBrowser-${releaseVersion}-windows-x64.exe.sha256`), 'utf8')
    assert.match(sidecar, new RegExp(`^[a-f0-9]{64}  PearBrowser-${releaseVersion.replaceAll('.', '\\.')}-windows-x64\\.exe\\n$`))

    const sums = readFileSync(join(outDir, 'SHA256SUMS-windows-x64.txt'), 'utf8')
    assert.equal(sums, sidecar)

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest-windows-x64.json'), 'utf8'))
    assert.equal(manifest.tag, releaseTag)
    assert.equal(manifest.version, releaseVersion)
    assert.equal(manifest.platform, 'windows')
    assert.equal(manifest.arch, 'x64')
    assert.equal(manifest.artifacts.length, 1)
    assert.equal(manifest.artifacts[0].name, `PearBrowser-${releaseVersion}-windows-x64.exe`)
    assert.equal(manifest.artifacts[0].source, 'appling/build/nested/PearBrowser Setup.exe')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('appling artifact collector excludes AppImageTool and packages PearBrowser', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-linux-appling-release-')))
  try {
    const buildDir = join(fixture, 'appling', 'build', 'nested')
    mkdirSync(buildDir, { recursive: true })
    writeFileSync(join(buildDir, 'appimagetool-x86_64.AppImage'), 'packaging tool bytes')
    writeFileSync(join(buildDir, 'PearBrowser.AppImage'), 'pearbrowser product bytes')

    execFileSync(process.execPath, [
      applingArtifactCollectorPath,
      '--tag',
      releaseTag,
      '--platform',
      'linux',
      '--arch',
      'x64',
      '--build-dir',
      join(fixture, 'appling', 'build')
    ], { cwd: fixture, encoding: 'utf8' })

    const outDir = join(fixture, 'dist', 'appling-release', releaseTag, 'linux')
    const assetName = `PearBrowser-${releaseVersion}-linux-x64.AppImage`
    assert.equal(readFileSync(join(outDir, assetName), 'utf8'), 'pearbrowser product bytes')
    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest-linux-x64.json'), 'utf8'))
    assert.equal(manifest.artifacts.length, 1)
    assert.equal(manifest.artifacts[0].source, 'appling/build/nested/PearBrowser.AppImage')
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
      releaseTag,
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
        'PearBrowser-0.5.0-macos-x64.app.zip',
        'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
        'SHA256SUMS-macos-x64.txt',
        'manifest-macos-x64.json',
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
      '--require-backfill-formats',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.counts.assets, 18)
    assert.deepEqual(report.platforms.macos.arches, ['arm64', 'x64'])
    assert.equal(report.platforms.macos.artifacts.length, 2)
    assert.equal(report.platforms.macos.sums.length, 2)
    assert.equal(report.platforms.macos.manifests.length, 2)
    assert.equal(report.platforms.windows.artifacts.length, 2)
    assert.equal(report.platforms.linux.artifacts.length, 1)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native release asset checker requires macOS DMGs for public-trust assets', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-public-trust-')))
  try {
    const releasePath = join(fixture, 'release.json')
    const publicTrustAssets = [
      'PearBrowser-0.5.0-macos-arm64.dmg',
      'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'SHA256SUMS-macos-arm64.txt',
      'manifest-macos-arm64.json',
      'PearBrowser-0.5.0-macos-x64.dmg',
      'PearBrowser-0.5.0-macos-x64.dmg.sha256',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'SHA256SUMS-macos-x64.txt',
      'manifest-macos-x64.json',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'SHA256SUMS-windows-x64.txt',
      'manifest-windows-x64.json',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256',
      'SHA256SUMS-linux-x64.txt',
      'manifest-linux-x64.json'
    ]
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: publicTrustAssets.map((name, i) => ({ name, size: i + 1 }))
    }, null, 2))

    const ok = spawnSync(process.execPath, [
      nativeReleaseAssetCheckPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--require-public-trust',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(ok.status, 0, ok.stderr || ok.stdout)
    const okReport = JSON.parse(ok.stdout)
    assert.equal(okReport.ok, true)
    assert.equal(okReport.platforms.macos.artifacts.filter((name) => name.endsWith('.dmg')).length, 2)

    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: publicTrustAssets
        .filter((name) => !name.includes('macos-x64.dmg'))
        .map((name, i) => ({ name, size: i + 1 }))
    }, null, 2))

    const missing = spawnSync(process.execPath, [
      nativeReleaseAssetCheckPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--require-public-trust',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(missing.status, 0)
    const missingReport = JSON.parse(missing.stdout)
    assert.ok(missingReport.errors.some((error) => error.includes('missing public-trust macOS DMG for macos/x64')))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native release asset checker requires v0.5.0 backfill package formats when requested', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-backfill-formats-')))
  try {
    const releasePath = join(fixture, 'release.json')
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: [
        'PearBrowser-0.5.0-macos-arm64.dmg',
        'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
        'SHA256SUMS-macos-arm64.txt',
        'manifest-macos-arm64.json',
        'PearBrowser-0.5.0-windows-x64.exe',
        'PearBrowser-0.5.0-windows-x64.exe.sha256',
        'SHA256SUMS-windows-x64.txt',
        'manifest-windows-x64.json',
        'PearBrowser-0.5.0-linux-x64.deb',
        'PearBrowser-0.5.0-linux-x64.deb.sha256',
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
      '--require-backfill-formats',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(result.status, 0)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, false)
    assert.ok(report.errors.some((error) => error.includes('missing required v0.5.0 backfill macOS .app.zip artifact for macos/arm64')))
    assert.ok(report.errors.some((error) => error.includes('missing required v0.5.0 backfill Windows .msix artifact for windows/x64')))
    assert.ok(report.errors.some((error) => error.includes('missing required v0.5.0 backfill Linux .AppImage artifact for linux/x64')))
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
        'PearBrowser-0.5.0-macos-arm64.dmg',
        'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
        'PearBrowser-0.5.0-macos-arm64.app.zip',
        'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
        'PearBrowser-0.5.0-windows-x64.msix',
        'PearBrowser-0.5.0-windows-x64.msix.sha256',
        'PearBrowser-0.5.0-windows-x64.exe',
        'PearBrowser-0.5.0-windows-x64.exe.sha256',
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

    assert.equal(resolve('macos', 'arm64').asset.name, 'PearBrowser-0.5.0-macos-arm64.dmg')
    assert.equal(resolve('windows', 'x64').asset.name, 'PearBrowser-0.5.0-windows-x64.exe')
    assert.equal(resolve('linux', 'x64').asset.name, 'PearBrowser-0.5.0-linux-x64.AppImage')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native release asset resolver rejects ambiguous equally preferred packages', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-resolver-ambiguous-')))
  try {
    const releasePath = join(fixture, 'release.json')
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: [
        'PearBrowser-0.5.0-linux-x64.AppImage',
        'PearBrowser-0.5.0-linux-x64.AppImage.sha256',
        'PearBrowser-0.5.0-linux-x64-PearBrowser.AppImage',
        'PearBrowser-0.5.0-linux-x64-PearBrowser.AppImage.sha256'
      ].map((name, i) => ({ name, size: i + 1 }))
    }, null, 2))

    const assetCheck = spawnSync(process.execPath, [
      nativeReleaseAssetCheckPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--json'
    ], { encoding: 'utf8' })
    assert.notEqual(assetCheck.status, 0)
    assert.ok(JSON.parse(assetCheck.stdout).errors.some((error) => error.includes('expected exactly one Linux .AppImage')))

    const result = spawnSync(process.execPath, [
      nativeReleaseAssetResolverPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--platform',
      'linux',
      '--arch',
      'x64',
      '--json'
    ], { encoding: 'utf8' })

    assert.notEqual(result.status, 0)
    assert.match(JSON.parse(result.stdout).error, /ambiguous linux\/x64 native artifacts/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native install snippet generator emits release-note packages for every desktop target', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-install-snippet-')))
  try {
    const releasePath = join(fixture, 'release.json')
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: [
        'PearBrowser-0.5.0-macos-arm64.dmg',
        'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
        'PearBrowser-0.5.0-macos-arm64.app.zip',
        'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
        'PearBrowser-0.5.0-macos-x64.dmg',
        'PearBrowser-0.5.0-macos-x64.dmg.sha256',
        'PearBrowser-0.5.0-windows-x64.msix',
        'PearBrowser-0.5.0-windows-x64.msix.sha256',
        'PearBrowser-0.5.0-windows-x64.exe',
        'PearBrowser-0.5.0-windows-x64.exe.sha256',
        'PearBrowser-0.5.0-linux-x64.AppImage',
        'PearBrowser-0.5.0-linux-x64.AppImage.sha256'
      ].map((name, i) => ({
        name,
        size: i + 1,
        url: `https://example.invalid/${name}`
      }))
    }, null, 2))

    const json = spawnSync(process.execPath, [
      nativeInstallSnippetPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--trust-mode',
      'public-trust',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(json.status, 0, json.stderr || json.stdout)
    const report = JSON.parse(json.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.targets.length, 4)
    assert.equal(report.targets.find((target) => target.label === 'macOS Apple Silicon').asset.name, 'PearBrowser-0.5.0-macos-arm64.dmg')
    assert.equal(report.targets.find((target) => target.label === 'macOS Intel').asset.name, 'PearBrowser-0.5.0-macos-x64.dmg')
    assert.equal(report.targets.find((target) => target.label === 'Windows x64').asset.name, 'PearBrowser-0.5.0-windows-x64.exe')
    assert.equal(report.targets.find((target) => target.label === 'Linux x64').asset.name, 'PearBrowser-0.5.0-linux-x64.AppImage')
    assert.ok(report.targets.every((target) => target.checksum.name === `${target.asset.name}.sha256`))
    assert.ok(report.targets.some((target) => target.install.includes('drag PearBrowser.app to /Applications')))

    const markdown = spawnSync(process.execPath, [
      nativeInstallSnippetPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--trust-mode',
      'public-trust'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(markdown.status, 0, markdown.stderr || markdown.stdout)
    assert.match(markdown.stdout, /## Native Installers/)
    assert.match(markdown.stdout, /PearBrowser-0\.5\.0-macos-arm64\.dmg/)
    assert.match(markdown.stdout, /PearBrowser-0\.5\.0-windows-x64\.exe/)
    assert.match(markdown.stdout, /These assets are expected to be signed\/notarized/)

    const guide = spawnSync(process.execPath, [
      nativeInstallSnippetPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--trust-mode',
      'public-trust',
      '--format',
      'guide'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(guide.status, 0, guide.stderr || guide.stdout)
    assert.match(guide.stdout, /# Install Native Packages/)
    assert.match(guide.stdout, /\[PearBrowser-0\.5\.0-macos-arm64\.dmg\]\(https:\/\/example\.invalid\/PearBrowser-0\.5\.0-macos-arm64\.dmg\)/)
    assert.match(guide.stdout, /npm run -s generate:native-install-guide/)
    assert.match(guide.stdout, /PowerShell/)
    assert.match(guide.stdout, /legacy migration record/i)

    const packageProofDir = join(fixture, 'package-proof')
    mkdirSync(packageProofDir)
    const { releasePath: packageProofRelease } = writePackageManagerReleaseFixture(packageProofDir, [
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'PearBrowser-0.5.0-windows-x64.msix',
      'PearBrowser-0.5.0-windows-x64.msix.sha256',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256'
    ])
    const packageProofGuide = spawnSync(process.execPath, [
      nativeInstallSnippetPath,
      '--fixture',
      packageProofRelease,
      '--tag',
      'v0.5.0',
      '--format',
      'guide'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(packageProofGuide.status, 0, packageProofGuide.stderr || packageProofGuide.stdout)
    assert.match(packageProofGuide.stdout, /Apple could not verify that PearBrowser is free of malware/)
    assert.match(packageProofGuide.stdout, /Control-click `PearBrowser\.app` -> Open -> Open/)
    assert.match(packageProofGuide.stdout, /Open Anyway/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native install smoke plan generator emits clean-machine commands for every desktop target', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-install-smoke-plan-')))
  try {
    const { releasePath } = writePackageManagerReleaseFixture(fixture, [
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256'
    ])

    const json = spawnSync(process.execPath, [
      nativeInstallSmokePlanPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      'release-smoke-source',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(json.status, 0, json.stderr || json.stdout)
    const report = JSON.parse(json.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.trustMode, 'package-proof')
    assert.equal(report.sourceRef, 'release-smoke-source')
    assert.equal(report.runtimeSmokeScript, 'https://raw.githubusercontent.com/bigdestiny2/pearbrowser-desktop/release-smoke-source/scripts/runtime-rpc-smoke.mjs')
    assert.equal(report.targets.length, 4)
    assert.ok(report.warnings.some((warning) => warning.includes('package-proof clean-install smoke')))
    assert.ok(report.targets.find((target) => target.label === 'macOS Apple Silicon').commands.some((command) => command.includes('ditto -x -k')))
    assert.ok(report.targets.find((target) => target.label === 'macOS Apple Silicon').commands.some((command) => command.includes('codesign --verify')))
    assert.ok(report.targets.find((target) => target.label === 'macOS Apple Silicon').commands.some((command) => command.includes('runtime-rpc-smoke.mjs --timeout 20000 --max-storage-percent 100 --json')))
    assert.ok(report.targets.find((target) => target.label === 'Windows x64').commands.some((command) => command.includes('Get-AuthenticodeSignature')))
    assert.ok(report.targets.find((target) => target.label === 'Windows x64').commands.some((command) => command.includes('Start menu')))
    assert.ok(report.targets.find((target) => target.label === 'Windows x64').commands.some((command) => command.includes('Invoke-WebRequest -Uri') && command.includes('release-smoke-source/scripts/runtime-rpc-smoke.mjs')))
    assert.ok(report.targets.find((target) => target.label === 'Windows x64').commands.some((command) => command.includes('node .\\pearbrowser-runtime-rpc-smoke.mjs')))
    assert.ok(report.targets.find((target) => target.label === 'Linux x64').commands.some((command) => command.includes('chmod +x')))
    assert.ok(report.targets.find((target) => target.label === 'Linux x64').commands.some((command) => command.includes('curl -L -o pearbrowser-runtime-rpc-smoke.mjs')))
    assert.ok(report.targets.every((target) => target.evidence.some((item) => item.includes('source checkout'))))
    assert.ok(report.targets.every((target) => target.evidence.some((item) => item.includes('runtime-rpc-smoke JSON output'))))

    const markdown = spawnSync(process.execPath, [
      nativeInstallSmokePlanPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      'release-smoke-source'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(markdown.status, 0, markdown.stderr || markdown.stdout)
    assert.match(markdown.stdout, /## Native Clean-Install Smoke Plan/)
    assert.match(markdown.stdout, /Smoke helper source: \[release-smoke-source\]/)
    assert.match(markdown.stdout, /### macOS Apple Silicon/)
    assert.match(markdown.stdout, /```powershell/)
    assert.match(markdown.stdout, /Evidence to record:/)

    const blocked = spawnSync(process.execPath, [
      nativeInstallSmokePlanPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--trust-mode',
      'public-trust',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(blocked.status, 0)
    const blockedReport = JSON.parse(blocked.stdout)
    assert.ok(blockedReport.errors.some((error) => error.includes('public-trust clean-install smoke requires notarized macOS DMG')))

    const publicTrustDir = join(fixture, 'public-trust')
    mkdirSync(publicTrustDir)
    const { releasePath: publicTrustRelease } = writePackageManagerReleaseFixture(publicTrustDir, [
      'PearBrowser-0.5.0-macos-arm64.dmg',
      'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
      'PearBrowser-0.5.0-macos-x64.dmg',
      'PearBrowser-0.5.0-macos-x64.dmg.sha256',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256'
    ])
    const publicTrust = spawnSync(process.execPath, [
      nativeInstallSmokePlanPath,
      '--fixture',
      publicTrustRelease,
      '--tag',
      'v0.5.0',
      '--trust-mode',
      'public-trust',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(publicTrust.status, 0, publicTrust.stderr || publicTrust.stdout)
    const publicTrustReport = JSON.parse(publicTrust.stdout)
    assert.equal(publicTrustReport.ok, true)
    assert.deepEqual(publicTrustReport.warnings, [])
    const macos = publicTrustReport.targets.find((target) => target.label === 'macOS Apple Silicon')
    assert.ok(macos.commands.some((command) => command.includes('hdiutil attach')))
    assert.ok(macos.commands.some((command) => command.includes('xcrun stapler validate')))
    assert.ok(macos.commands.some((command) => command.includes('spctl --assess')))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('Linux AppImage metadata checker validates source metadata and AppDir contents', () => {
  const source = spawnSync(process.execPath, [
    linuxAppImageMetadataPath,
    '--json'
  ], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8'
  })

  assert.equal(source.status, 0, source.stderr || source.stdout)
  const sourceReport = JSON.parse(source.stdout)
  assert.equal(sourceReport.ok, true)
  assert.equal(sourceReport.inspections[0].kind, 'source')

  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-linux-appdir-')))
  try {
    const appDir = writeLinuxAppDirFixture(fixture)
    const appdir = spawnSync(process.execPath, [
      linuxAppImageMetadataPath,
      '--appdir',
      appDir,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(appdir.status, 0, appdir.stderr || appdir.stdout)
    const appdirReport = JSON.parse(appdir.stdout)
    assert.equal(appdirReport.ok, true)
    assert.ok(appdirReport.inspections.some((inspection) => inspection.kind === 'appdir'))

    const buildDir = join(fixture, 'build')
    mkdirSync(buildDir)
    const buildAppDir = writeLinuxAppDirFixture(buildDir)
    const dependencyFixtureAppDir = join(buildDir, '_deps', 'libappling-src', 'test', 'fixtures', 'app', 'linux-x64', 'Example.AppDir')
    mkdirSync(dependencyFixtureAppDir, { recursive: true })
    writeFileSync(join(dependencyFixtureAppDir, 'README.txt'), 'dependency fixture, not a release AppDir')
    const build = spawnSync(process.execPath, [
      linuxAppImageMetadataPath,
      '--build-dir',
      buildDir,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(build.status, 0, build.stderr || build.stdout)
    const buildReport = JSON.parse(build.stdout)
    assert.equal(buildReport.ok, true)
    assert.ok(buildReport.inspections.some((inspection) => inspection.appDir === buildAppDir))
    assert.ok(!buildReport.inspections.some((inspection) => inspection.appDir === dependencyFixtureAppDir))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('Linux AppImage metadata checker blocks AppDirs without AppStream metainfo', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-linux-appdir-missing-meta-')))
  try {
    const appDir = writeLinuxAppDirFixture(fixture, { missingMetainfo: true })
    const result = spawnSync(process.execPath, [
      linuxAppImageMetadataPath,
      '--appdir',
      appDir,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(result.status, 0)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, false)
    assert.ok(report.errors.some((error) => error.includes('AppStream metainfo')))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('package-manager manifest generator emits Homebrew and WinGet drafts from public-trust assets', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-package-manifests-')))
  try {
    const { releasePath, shaFor } = writePackageManagerReleaseFixture(fixture, [
      'PearBrowser-0.5.0-macos-arm64.dmg',
      'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
      'PearBrowser-0.5.0-macos-x64.dmg',
      'PearBrowser-0.5.0-macos-x64.dmg.sha256',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256'
    ])
    const outDir = join(fixture, 'out')

    const result = spawnSync(process.execPath, [
      packageManagerManifestsPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--out-dir',
      outDir,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.trustMode, 'public-trust')
    assert.equal(report.files.length, 2)
    assert.deepEqual(report.warnings, [])

    const caskPath = join(outDir, 'homebrew', 'pearbrowser.rb')
    const cask = readFileSync(caskPath, 'utf8')
    assert.match(cask, /cask "pearbrowser"/)
    assert.match(cask, /arch arm: "arm64", intel: "x64"/)
    assert.match(cask, new RegExp(shaFor('PearBrowser-0.5.0-macos-arm64.dmg')))
    assert.match(cask, new RegExp(shaFor('PearBrowser-0.5.0-macos-x64.dmg')))
    assert.match(cask, /PearBrowser-#\{version\}-macos-#\{arch\}\.dmg/)
    assert.match(cask, /app "PearBrowser\.app"/)

    const wingetPath = join(outDir, 'winget', 'manifests', 'p', 'PearBrowser', 'PearBrowser', '0.5.0', 'PearBrowser.PearBrowser.yaml')
    const winget = readFileSync(wingetPath, 'utf8')
    assert.match(winget, /PackageIdentifier: "PearBrowser\.PearBrowser"/)
    assert.match(winget, /PackageVersion: "0\.5\.0"/)
    assert.match(winget, /License: "Apache-2\.0 AND MIT"/)
    assert.match(winget, /InstallerType: exe/)
    assert.match(winget, new RegExp(`InstallerSha256: ${shaFor('PearBrowser-0.5.0-windows-x64.exe').toUpperCase()}`))
    assert.match(winget, /ManifestType: singleton/)

    const customOut = join(fixture, 'custom-out')
    const custom = spawnSync(process.execPath, [
      packageManagerManifestsPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--out-dir',
      customOut,
      '--license',
      'MPL-2.0',
      '--package-identifier',
      'PearBrowser.Experimental',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(custom.status, 0, custom.stderr || custom.stdout)
    const customReport = JSON.parse(custom.stdout)
    assert.ok(customReport.files.some((file) => {
      return file.path.endsWith('winget/manifests/p/PearBrowser/Experimental/0.5.0/PearBrowser.Experimental.yaml')
    }))
    const customWinget = readFileSync(join(customOut, 'winget', 'manifests', 'p', 'PearBrowser', 'Experimental', '0.5.0', 'PearBrowser.Experimental.yaml'), 'utf8')
    assert.match(customWinget, /PackageIdentifier: "PearBrowser\.Experimental"/)
    assert.match(customWinget, /License: "MPL-2\.0"/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('package-manager manifest generator gates package-proof assets by default', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-package-proof-manifests-')))
  try {
    const { releasePath } = writePackageManagerReleaseFixture(fixture, [
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256'
    ])

    const blocked = spawnSync(process.execPath, [
      packageManagerManifestsPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--out-dir',
      join(fixture, 'blocked'),
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(blocked.status, 0)
    const blockedReport = JSON.parse(blocked.stdout)
    assert.equal(blockedReport.ok, false)
    assert.ok(blockedReport.errors.some((error) => error.includes('public-trust Homebrew Cask requires notarized macOS DMG assets')))

    const rehearsal = spawnSync(process.execPath, [
      packageManagerManifestsPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--trust-mode',
      'package-proof',
      '--out-dir',
      join(fixture, 'rehearsal'),
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(rehearsal.status, 0, rehearsal.stderr || rehearsal.stdout)
    const rehearsalReport = JSON.parse(rehearsal.stdout)
    assert.equal(rehearsalReport.ok, true)
    assert.ok(rehearsalReport.warnings.some((warning) => warning.includes('package-proof manifests are rehearsal artifacts')))
    const cask = readFileSync(join(fixture, 'rehearsal', 'homebrew', 'pearbrowser.rb'), 'utf8')
    assert.match(cask, /PearBrowser-#\{version\}-macos-#\{arch\}\.app\.zip/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('public-trust readiness checker passes when all release gates are represented', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-public-trust-readiness-')))
  try {
    const { releasePath } = writePackageManagerReleaseFixture(fixture, [
      'PearBrowser-0.5.0-macos-arm64.dmg',
      'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'SHA256SUMS-macos-arm64.txt',
      'manifest-macos-arm64.json',
      'PearBrowser-0.5.0-macos-x64.dmg',
      'PearBrowser-0.5.0-macos-x64.dmg.sha256',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'SHA256SUMS-macos-x64.txt',
      'manifest-macos-x64.json',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'PearBrowser-0.5.0-windows-x64.msix',
      'PearBrowser-0.5.0-windows-x64.msix.sha256',
      'SHA256SUMS-windows-x64.txt',
      'manifest-windows-x64.json',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256',
      'SHA256SUMS-linux-x64.txt',
      'manifest-linux-x64.json'
    ])
    const evidencePath = join(fixture, 'evidence.md')
    writeCompleteReleaseEvidenceFixture(evidencePath)

    const result = spawnSync(process.execPath, [
      publicTrustReadinessPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      'release-smoke-source',
      '--evidence-file',
      evidencePath,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env: publicTrustSigningEnv()
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.mode, 'public-trust')
    assert.equal(report.sourceRef, 'release-smoke-source')
    assert.equal(report.checks.length, 7)
    assert.deepEqual(report.blockers, [])
    assert.ok(report.checks.every((check) => check.ok))
    assert.match(report.checks.find((check) => check.id === 'native-install-smoke-plan').command, /--source-ref release-smoke-source/)
    assert.equal(report.checks.find((check) => check.id === 'linux-appimage-metadata').status, 'pass')
    assert.ok(report.checks.some((check) => check.id === 'native-downloads' && check.summary.includes('verified=4')))
    assert.deepEqual(report.warnings, [])
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('public-trust readiness checker can read signing gate from GitHub Actions secret names', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-public-trust-github-secrets-')))
  try {
    const { releasePath } = writePackageManagerReleaseFixture(fixture, [
      'PearBrowser-0.5.0-macos-arm64.dmg',
      'PearBrowser-0.5.0-macos-arm64.dmg.sha256',
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'SHA256SUMS-macos-arm64.txt',
      'manifest-macos-arm64.json',
      'PearBrowser-0.5.0-macos-x64.dmg',
      'PearBrowser-0.5.0-macos-x64.dmg.sha256',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'SHA256SUMS-macos-x64.txt',
      'manifest-macos-x64.json',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'PearBrowser-0.5.0-windows-x64.msix',
      'PearBrowser-0.5.0-windows-x64.msix.sha256',
      'SHA256SUMS-windows-x64.txt',
      'manifest-windows-x64.json',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256',
      'SHA256SUMS-linux-x64.txt',
      'manifest-linux-x64.json'
    ])
    const evidencePath = join(fixture, 'evidence.md')
    const secretsPath = join(fixture, 'github-secrets.json')
    writeCompleteReleaseEvidenceFixture(evidencePath)
    writeGithubSigningSecretsFixture(secretsPath)

    const result = spawnSync(process.execPath, [
      publicTrustReadinessPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      'release-smoke-source',
      '--evidence-file',
      evidencePath,
      '--signing-secret-source',
      'github',
      '--signing-github-secrets-file',
      secretsPath,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env: {}
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, true)
    const nativeSigning = report.checks.find((check) => check.id === 'native-signing')
    assert.equal(nativeSigning.status, 'warn')
    assert.match(nativeSigning.command, /--secret-source github/)
    assert.match(nativeSigning.command, /--github-secrets-file/)
    assert.ok(report.warnings.some((warning) => warning.message.includes('secret-values-unreadable')))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('public-trust readiness checker aggregates package-proof blockers', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-public-trust-blocked-')))
  try {
    const { releasePath } = writePackageManagerReleaseFixture(fixture, [
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'SHA256SUMS-macos-arm64.txt',
      'manifest-macos-arm64.json',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'SHA256SUMS-macos-x64.txt',
      'manifest-macos-x64.json',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'SHA256SUMS-windows-x64.txt',
      'manifest-windows-x64.json',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256',
      'SHA256SUMS-linux-x64.txt',
      'manifest-linux-x64.json'
    ])
    const evidencePath = join(fixture, 'evidence.md')
    writeCompleteReleaseEvidenceFixture(evidencePath)

    const result = spawnSync(process.execPath, [
      publicTrustReadinessPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      'release-smoke-source',
      '--evidence-file',
      evidencePath,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env: publicTrustSigningEnv()
    })

    assert.notEqual(result.status, 0)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, false)
    assert.equal(report.checks.find((check) => check.id === 'native-signing').status, 'pass')
    assert.equal(report.checks.find((check) => check.id === 'native-downloads').status, 'pass')
    assert.equal(report.checks.find((check) => check.id === 'linux-appimage-metadata').status, 'pass')
    assert.equal(report.checks.find((check) => check.id === 'native-release-assets').status, 'block')
    assert.equal(report.checks.find((check) => check.id === 'native-install-smoke-plan').status, 'block')
    assert.match(report.checks.find((check) => check.id === 'native-install-smoke-plan').command, /--source-ref release-smoke-source/)
    assert.equal(report.checks.find((check) => check.id === 'package-manager-manifests').status, 'block')
    assert.ok(report.blockers.some((blocker) => blocker.message.includes('missing public-trust macOS DMG for macos/arm64')))
    assert.ok(report.blockers.some((blocker) => blocker.message.includes('public-trust clean-install smoke requires notarized macOS DMG')))
    assert.ok(report.blockers.some((blocker) => blocker.message.includes('public-trust Homebrew Cask requires notarized macOS DMG assets')))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('native download verifier checks package bytes against the SHA-256 sidecar', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-native-downloads-')))
  try {
    const assetName = 'PearBrowser-0.5.0-macos-arm64.app.zip'
    const assetPath = join(fixture, assetName)
    const sidecarPath = join(fixture, `${assetName}.sha256`)
    writeFileSync(assetPath, 'native package bytes')
    const sha256 = createHash('sha256').update(readFileSync(assetPath)).digest('hex')
    writeFileSync(sidecarPath, `${sha256}  ${assetName}\n`)

    const releasePath = join(fixture, 'release.json')
    writeFileSync(releasePath, JSON.stringify({
      tagName: 'v0.5.0',
      isDraft: false,
      isPrerelease: false,
      assets: [
        {
          name: assetName,
          size: readFileSync(assetPath).length,
          url: pathToFileURL(assetPath).toString()
        },
        {
          name: `${assetName}.sha256`,
          size: readFileSync(sidecarPath).length,
          url: pathToFileURL(sidecarPath).toString()
        }
      ]
    }, null, 2))

    const result = spawnSync(process.execPath, [
      nativeDownloadVerifierPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--platform',
      'macos',
      '--arch',
      'arm64',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.targets.length, 1)
    assert.equal(report.targets[0].asset, assetName)
    assert.equal(report.targets[0].sha256, sha256)

    writeFileSync(sidecarPath, `${'0'.repeat(64)}  ${assetName}\n`)
    const mismatch = spawnSync(process.execPath, [
      nativeDownloadVerifierPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--platform',
      'macos',
      '--arch',
      'arm64',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(mismatch.status, 0)
    const mismatchReport = JSON.parse(mismatch.stdout)
    assert.equal(mismatchReport.ok, false)
    assert.ok(mismatchReport.errors.some((error) => error.includes('SHA-256 mismatch')))
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

test('runtime smoke is authenticated, status-only by default, and does not become the renderer', () => {
  assert.match(rpcWebSocketAuth, /\/status-smoke/)
  assert.match(mainEntry, /function listenRpcServer/)
  assert.match(mainEntry, /http\.createServer/)
  assert.match(mainEntry, /authorizeRpcWebSocket/)
  assert.match(mainEntry, /DiagnosticRpcRouter/)
  assert.match(bootEntry, /function probeBackend/)
  assert.match(bootEntry, /diagnosticUrlFor/)
  assert.match(bootEntry, /RPC_SESSION_TOKEN/)
  assert.match(bootEntry, /CMD_GET_STATUS/)
  assert.match(rpcWebSocketAuth, /Diagnostic RPC only allows CMD_GET_STATUS/)
  assert.match(rpcWebSocketAuth, /routeBackend/)
  assert.match(tabRuntime, /function listenWsServer/)
  assert.match(tabRuntime, /http\.createServer/)
  assert.match(mainEntry, /onDiagnosticSocket/)
  assert.match(mainEntry, /diagnostics\.add\(socket\)/)
  assert.match(mainEntry, /diagnostics\.delete\(socket\)/)
  assert.match(mainEntry, /teardown\('renderer-ws-close'\)/)
  assert.match(mainEntry, /RENDERER_RECONNECT_GRACE_MS/)
  assert.match(mainEntry, /renderer reconnected within grace period/)
  assert.match(bootEntry, /enableReconnect/)
  assert.match(bootEntry, /reconnect-failed/)
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
  assert.match(releaseStorySmoke, /--desktop-gui-stories/)
  assert.match(releaseStorySmoke, /siteStory: false/)
  assert.match(releaseStorySmoke, /desktopGuiStories: false/)
  assert.match(releaseStorySmoke, /CMD_SEARCH_INDEX/)
  assert.match(releaseStorySmoke, /CMD_SEARCH/)
  assert.match(releaseStorySmoke, /searchIndexEnabled: true/)
  assert.match(releaseStorySmoke, /searchIndexEnabled: false/)
  assert.match(releaseStorySmoke, /restoredSearchIndexSetting/)
  assert.match(releaseStorySmoke, /CMD_NAME_RESOLVE/)
  assert.match(releaseStorySmoke, /CMD_USERDATA_ADD_BOOKMARK/)
  assert.match(releaseStorySmoke, /CMD_USERDATA_SAVE_SESSION/)
  assert.match(releaseStorySmoke, /CMD_GET_DRIVE_INFO/)
  assert.match(releaseStorySmoke, /CMD_CREATE_SITE/)
  assert.match(releaseStorySmoke, /CMD_UPDATE_SITE/)
  assert.match(releaseStorySmoke, /CMD_PUBLISH_SITE/)
  assert.match(releaseStorySmoke, /CMD_DELETE_SITE/)
  assert.match(releaseStorySmoke, /runDesktopGuiStories/)
  assert.match(releaseStorySmoke, /runNostrTrustedContactStory/)
  assert.match(releaseStorySmoke, /buildReleaseEvidence/)
  assert.match(releaseStorySmoke, /Browse story/)
  assert.match(releaseStorySmoke, /Fresh-launch landing story/)
  assert.match(releaseStorySmoke, /Catalogue story/)
  assert.match(releaseStorySmoke, /Latest-app-without-download story/)
  assert.match(releaseStorySmoke, /Nostr trusted-contact story/)
  assert.match(releaseStorySmoke, /Library\/session story/)
  assert.match(releaseStorySmoke, /PearBrowser\|Pear Browser/)
  assert.match(releaseStorySmoke, /REQUIRED_FEATURED = \['Keet', 'PearPass', 'anonGPT', 'Paste', 'Peercord'\]/)
  assert.match(releaseStorySmoke, /PEERCORD_LINK/)
  assert.match(releaseStorySmoke, /runMode: 'window'/)
  assert.doesNotMatch(releaseStorySmoke, /CMD_LAUNCH_PEAR_LINK/)
  assert.doesNotMatch(releaseStorySmoke, /CMD_RUN_APP_IN_TAB/)
})

test('live catalogue verifier asserts PearBrowser release contract and Peercord provenance metadata', () => {
  assert.match(liveCatalogVerifier, /PearBrowser version mismatch/)
  assert.match(liveCatalogVerifier, /PearBrowser link mismatch/)
  assert.match(liveCatalogVerifier, /PearBrowser homepage mismatch/)
  assert.match(liveCatalogVerifier, /Peercord sourceUrl mismatch/)
  assert.match(liveCatalogVerifier, /https:\/\/git\.churchofmalware\.org\/mastercodeon\/Peercord/)
  assert.match(liveCatalogVerifier, /Peercord license mismatch/)
  assert.match(liveCatalogVerifier, /GPL-3\.0/)
})
