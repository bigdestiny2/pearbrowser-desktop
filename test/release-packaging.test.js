import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
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
import { fileURLToPath, pathToFileURL } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const require = createRequire(import.meta.url)
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
const catalogSource = JSON.parse(readFileSync(new URL('../catalog-source/pearbrowser-network.catalog.json', import.meta.url), 'utf8'))
const { SEED_APPS } = require('../backend/catalogue-seed.js')
const rootLicense = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8')
const nativeReleaseWorkflow = readFileSync(new URL('../.github/workflows/desktop-native-release.yml', import.meta.url), 'utf8')
const desktopCiWorkflow = readFileSync(new URL('../.github/workflows/desktop-ci.yml', import.meta.url), 'utf8')
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
const immutableSourceRef = '0123456789abcdef0123456789abcdef01234567'

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

function writePublicTrustReleaseFixture (fixture, { sourceRef = immutableSourceRef } = {}) {
  const version = '0.5.0'
  const targets = [
    { platform: 'macos', arch: 'arm64', extensions: ['app.zip', 'dmg'] },
    { platform: 'macos', arch: 'x64', extensions: ['app.zip', 'dmg'] },
    { platform: 'windows', arch: 'x64', extensions: ['exe'] },
    { platform: 'linux', arch: 'x64', extensions: ['AppImage'] }
  ]
  const assets = []
  const addAsset = (name, content) => {
    const path = join(fixture, name)
    writeFileSync(path, content)
    assets.push({
      name,
      size: readFileSync(path).length,
      url: pathToFileURL(path).toString()
    })
  }

  for (const target of targets) {
    const artifactItems = []
    const checksumLines = []
    for (const extension of target.extensions) {
      const name = `PearBrowser-${version}-${target.platform}-${target.arch}.${extension}`
      const content = `fixture bytes for ${name}`
      const sha256 = createHash('sha256').update(content).digest('hex')
      const checksumLine = `${sha256}  ${name}`
      addAsset(name, content)
      addAsset(`${name}.sha256`, `${checksumLine}\n`)
      checksumLines.push(checksumLine)
      artifactItems.push({
        name,
        source: `dist/electron/${name}`,
        bytes: Buffer.byteLength(content),
        sha256
      })
    }
    addAsset(`SHA256SUMS-${target.platform}-${target.arch}.txt`, `${checksumLines.join('\n')}\n`)
    addAsset(`manifest-${target.platform}-${target.arch}.json`, `${JSON.stringify({
      tag: `v${version}`,
      version,
      sourceRef,
      releaseMode: 'public-trust',
      platform: target.platform,
      arch: target.arch,
      artifacts: artifactItems
    }, null, 2)}\n`)
  }

  const releasePath = join(fixture, 'release.json')
  writeFileSync(releasePath, JSON.stringify({
    tagName: `v${version}`,
    isDraft: false,
    isPrerelease: false,
    assets
  }, null, 2))
  return { releasePath }
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
    sourceRef: immutableSourceRef,
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

test('PearBrowser catalogue row stays migration-only until its Pear v3 production quorum is released', () => {
  const source = catalogSource.apps.find((app) => app.id === 'pearbrowser-desktop')
  const seed = SEED_APPS.find((app) => app.name === 'PearBrowser Desktop')
  const homepageKey = '03f0060a35451cfb6b68ad1dda1b8474ebb43fd9100071ccf7d67679a83ebb4f'

  assert.ok(source, 'catalogue source row missing')
  assert.ok(seed, 'offline catalogue seed row missing')
  assert.equal(source.version, pkg.version)
  assert.equal(source.type, 'standalone')
  assert.equal(source.legacyMigrationId, pkg.upgrade.replace(/^pear:\/\//, ''))
  assert.deepEqual(source.nativeDelivery, { status: 'migration-required' })
  assert.equal(source.driveKey, homepageKey)
  assert.equal(source.homepage, `hyper://${homepageKey}/`)
  assert.equal(source.link, source.homepage)
  assert.equal(seed.version, source.version)
  assert.equal(seed.nativeDeliveryStatus, source.nativeDelivery.status)
  assert.equal(seed.nativeInstallLink, undefined)
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
  assert.match(releaseScript, /Developer ID signing\/notarization/)
  assert.match(releaseScript, /PFX\/Authenticode/)
  assert.match(releaseScript, /exact immutable 40-character source commit SHA/)
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

  assert.match(hiveRelayLayout, /usesNpmRegistrySpecs/)
  assert.match(hiveRelayLayout, /verify the npm dist-tag resolves to EXPECTED_HIVERELAY_VERSION/)
  assert.match(hiveRelayLayout, /entry\.version !== version/)
  assert.match(hiveRelayLayout, /Use latest or an explicit semver range/)
  assert.match(hiveRelayLayout, /process\.exit\(0\)/)
})

test('HiveRelay guard keeps the expected release version as one named constant', () => {
  assert.match(hiveRelayLayout, /const EXPECTED_HIVERELAY_VERSION = '0\.20\.2'/)

  // The version must not be re-hardcoded anywhere else in the guard, otherwise
  // moving the HiveRelay release line silently leaves half the checks behind.
  const literals = hiveRelayLayout.match(/0\.20\.2/g) || []
  assert.equal(
    literals.length,
    1,
    `expected 0.20.2 to appear only in EXPECTED_HIVERELAY_VERSION, found ${literals.length} occurrences`
  )

  // The guard runs as a preinstall hook, so it cannot import semver: nothing is
  // installed yet, and semver is only a transitive dependency of this repo.
  assert.doesNotMatch(hiveRelayLayout, /from 'semver'/)
  assert.doesNotMatch(hiveRelayLayout, /require\('semver'\)/)
  assert.equal(pkg.dependencies?.semver, undefined)
  assert.equal(pkg.devDependencies?.semver, undefined)
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

// Runs the guard against a throwaway package.json whose HiveRelay specs are
// `latest` except for p2p-hiverelay-client, which gets the spec under test.
// No package-lock.json is written, so the guard exercises the spec check only.
function runHiveRelayGuardWithClientSpec (clientSpec, label) {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), `pear-hiverelay-${label}-`)))
  try {
    const dependencies = {}
    for (const name of npmHiveRelayPackages) dependencies[name] = 'latest'
    dependencies['p2p-hiverelay-client'] = clientSpec
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ dependencies }, null, 2))

    return spawnSync(process.execPath, [hiveRelayCheckPath], {
      cwd: fixture,
      encoding: 'utf8'
    })
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
}

test('HiveRelay registry guard accepts explicit semver ranges alongside latest', () => {
  // HiveRelay is renumbering off the `latest` dist-tag, so the guard must not
  // block npm install the moment these pins become real semver ranges. These
  // ranges all admit the contracted release line; ranges that do not are
  // covered by the rejection test below.
  const acceptedSpecs = [
    'latest',
    '^0.20.2',
    '~0.20.2',
    '0.20.2',
    '^0.20.0',
    '^0.20.2 || ^1.0.0'
  ]

  for (const spec of acceptedSpecs) {
    const result = runHiveRelayGuardWithClientSpec(spec, 'range')
    assert.equal(result.status, 0, `${spec} should be accepted: ${result.stderr || result.stdout}`)
    assert.equal(result.stdout, '', `${spec} should be quiet on stdout`)
    assert.equal(result.stderr, '', `${spec} should be quiet on stderr`)
  }
})

test('HiveRelay registry guard rejects a well-formed range for the wrong release line', () => {
  // The point of the guard is that the declared spec and the contracted version
  // agree. A syntactically perfect range aimed at a different line is drift, and
  // must fail here rather than as an opaque install-time resolution error.
  for (const spec of ['^0.26.0', '~0.26.0', '0.26.0', '^1.0.0']) {
    const result = runHiveRelayGuardWithClientSpec(spec, 'range')
    assert.equal(result.status, 1, `${spec} targets the wrong release line and should be rejected`)
    assert.match(result.stderr, /cannot resolve the contracted HiveRelay/)
  }
})

test('HiveRelay registry guard grammar cannot backtrack catastrophically', () => {
  // This runs as a preinstall hook, so an exponential-backtracking range check
  // is a hang on `npm install`, not merely a slow test. The earlier grammar had
  // an ambiguous `comparator ( \s+ comparator )*` rule where a comparator could
  // itself start with `\s*`, so a run of k spaces had k valid splits. Drive the
  // real guard binary with that pathological shape.
  const evil = Array(40).fill('1').join('   ') + '!'
  const started = Date.now()
  const result = runHiveRelayGuardWithClientSpec(evil, 'range')
  const elapsed = Date.now() - started

  assert.equal(result.status, 1, 'a non-range spec must still be rejected')
  assert.ok(elapsed < 5000, `range check took ${elapsed}ms; the grammar is backtracking`)
})

test('HiveRelay registry guard still rejects specs that are not registry ranges', () => {
  // A semver range is now fine, but anything that is not a registry-resolvable
  // range still has to fail: unauditable sources and wide-open wildcards.
  const rejectedSpecs = [
    'next',
    'beta',
    'npm:p2p-hiverelay-client@^0.26.0',
    'git+https://github.com/bigdestiny2/P2P-Hiverelay.git',
    'git+ssh://git@github.com/bigdestiny2/P2P-Hiverelay.git',
    'github:bigdestiny2/P2P-Hiverelay',
    'bigdestiny2/P2P-Hiverelay#v0.26.0',
    'https://example.com/p2p-hiverelay-client.tgz',
    'workspace:*',
    'link:../../00-core/hiverelay/packages/client',
    '*',
    'x',
    ''
  ]

  for (const spec of rejectedSpecs) {
    const result = runHiveRelayGuardWithClientSpec(spec, 'drift')
    assert.equal(result.status, 1, `${spec || '(empty)'} should be rejected`)
    assert.match(result.stderr, /p2p-hiverelay-client expected latest or a semver range/)
  }
})

test('HiveRelay registry guard names the offending spec when it drifts', () => {
  const result = runHiveRelayGuardWithClientSpec('next', 'drift')

  assert.equal(result.status, 1)
  assert.match(result.stderr, /p2p-hiverelay-client expected latest or a semver range, found next/)
  assert.match(result.stderr, /for example \^0\.26\.0/)
})

test('HiveRelay guard still rejects mixing file: and registry specs', () => {
  const result = runHiveRelayGuardWithClientSpec('file:../../00-core/hiverelay/packages/client', 'mixed')

  assert.equal(result.status, 1)
  assert.match(result.stderr, /either all npm registry specs or all file: workspace specs/)
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
  assert.match(desktopCiWorkflow, /runs-on: ubuntu-24\.04/)
  assert.match(desktopCiWorkflow, /actions\/checkout@[0-9a-f]{40} # v4/)
  assert.match(desktopCiWorkflow, /actions\/setup-node@[0-9a-f]{40} # v4/)
  assert.match(desktopCiWorkflow, /node-version: 22\.22\.0/)
  assert.doesNotMatch(desktopCiWorkflow, /uses: [^\n]+@v[0-9]/)
  assert.match(desktopCiWorkflow, /repository: bigdestiny2\/PearBrowser\s+ref: 5c1c920b8b42ffe895f78c49c43d176d5ca93086/)
  assert.match(desktopCiWorkflow, /Checkout HiveRelay release contract/)
  assert.match(desktopCiWorkflow, /ref: b702d8e34f4bf6c933763285e1131e468ae9807b # v0\.20\.2/)
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
  // bare-https has no get() shorthand — GETs must go through request()+end().
  assert.match(relayClient, /transport\.request\(relayRequestOptions\(parsed\)/)
  assert.doesNotMatch(relayClient, /transport\.get\(/)
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
  assert.match(nativeSigningCheck, /--github-environment/)
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
    immutableSourceRef,
    '--github-environment',
    'release-signing'
  ], {
    encoding: 'utf8'
  })
  assert.equal(markdown.status, 0, markdown.stderr || markdown.stdout)
  assert.match(markdown.stdout, /# Native Signing Secret Setup/)
  assert.match(markdown.stdout, /Repository: `example\/pearbrowser`/)
  assert.match(markdown.stdout, /GitHub environment: `release-signing`/)
  assert.match(markdown.stdout, /test -s DeveloperIDApplication\.p12/)
  assert.match(markdown.stdout, /openssl base64 -A -in DeveloperIDApplication\.p12/)
  assert.match(markdown.stdout, /test -n "\$\{PEARBROWSER_MACOS_CERTIFICATE_PASSWORD:-\}"/)
  assert.match(markdown.stdout, /gh secret set PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64 --repo example\/pearbrowser --env release-signing/)
  assert.match(markdown.stdout, /npm run check:native-signing -- --require-public-trust --secret-source github --repo example\/pearbrowser --github-environment release-signing/)
  assert.ok(markdown.stdout.includes(`--source-ref ${immutableSourceRef}`))

  const json = spawnSync(process.execPath, [
    nativeSigningSecretPlanPath,
    '--repo',
    'example/pearbrowser',
    '--platform',
    'macos',
    '--source-ref',
    immutableSourceRef,
    '--json'
  ], {
    encoding: 'utf8'
  })
  assert.equal(json.status, 0, json.stderr || json.stdout)
  const report = JSON.parse(json.stdout)
  assert.equal(report.repo, 'example/pearbrowser')
  assert.equal(report.githubEnvironment, 'production')
  assert.equal(report.platform, 'macos')
  assert.equal(report.sourceRef, immutableSourceRef)
  assert.ok(report.requiredSecrets.includes('PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64'))
  assert.ok(report.requiredSecrets.includes('PEARBROWSER_MACOS_NOTARY_TEAM_ID'))
  assert.ok(report.optionalSecrets.includes('PEARBROWSER_MACOS_KEYCHAIN_PASSWORD'))
  assert.ok(!report.requiredSecrets.includes('PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64'))
  assert.ok(report.secrets.some((secret) => secret.name === 'PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64' && secret.command.includes('test -s DeveloperIDApplication.p12')))
  assert.ok(report.secrets.some((secret) => secret.name === 'PEARBROWSER_MACOS_CERTIFICATE_PASSWORD' && secret.command.includes('test -n "$' + '{PEARBROWSER_MACOS_CERTIFICATE_PASSWORD:-}"')))
  assert.ok(report.verificationCommands.some((command) => command.includes('check:native-signing')))
  assert.ok(report.verificationCommands.every((command) => command.includes('production')))
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
  assert.match(nativeReleaseAssetCheck, /expected exactly one macOS \.app\.zip/)
  assert.match(nativeReleaseAssetCheck, /expected exactly one public-trust macOS DMG/)
  assert.match(nativeReleaseAssetCheck, /expected exactly one Windows NSIS \.exe/)
  assert.match(nativeReleaseAssetCheck, /expected exactly one Linux \.AppImage/)
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
  const published = nativeInstallGuide.match(/Latest published release: `v(\d+\.\d+\.\d+)`\./)
  assert.ok(published, 'native install guide must declare its published release')
  assert.ok(nativeInstallGuide.includes(`Current release candidate: \`v${releaseVersion}\`.`))
  assert.ok(nativeInstallGuide.includes(`Do not treat \`v${releaseVersion}\` as downloadable or`))
  assert.doesNotMatch(nativeInstallGuide, new RegExp(`releases/download/v${releaseVersion.replaceAll('.', '\\.')}/`))
  assert.match(nativeInstallGuide, /Authenticode-signed NSIS installer/)
  assert.match(nativeInstallGuide, /Developer ID signed and notarized/)
  assert.match(nativeInstallGuide, /Linux x64.*executable AppImage/)
  assert.match(nativeInstallGuide, /resolve:native-release/)
  assert.match(nativeInstallGuide, /verify:native-downloads/)
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
  assert.doesNotMatch(publicTrustReadiness, /--require-backfill-formats/)
  assert.match(publicTrustReadiness, /--source-ref/)
  assert.match(publicTrustReadiness, /--signing-secret-source/)
  assert.match(publicTrustReadiness, /--signing-github-environment/)
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
      '--source-ref',
      immutableSourceRef,
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
    assert.ok(markdown.stdout.includes(`npm run -s generate:native-signing-secret-plan -- --repo example/pearbrowser --tag v9.9.9 --source-ref ${immutableSourceRef} --github-environment production`))
    assert.match(markdown.stdout, /check:native-signing.*--github-environment production/)
    assert.ok(markdown.stdout.includes(`gh workflow run desktop-native-release.yml --repo example/pearbrowser --ref main -f tag=v9.9.9 -f source_ref=${immutableSourceRef} -f release_mode=public-trust -f publish_release=true`))
    assert.match(markdown.stdout, /npm run -s generate:release-evidence-handoff -- --file docs\/custom-evidence\.md/)
    assert.match(markdown.stdout, /npm run check:release-evidence -- --file docs\/custom-evidence\.md/)

    const json = spawnSync(process.execPath, [
      publicTrustOperatorReportPath,
      '--readiness-file',
      readinessPath,
      '--source-ref',
      immutableSourceRef,
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
    assert.equal(report.sourceRef, immutableSourceRef)
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

test('Electron release metadata uses the reviewed package configuration', () => {
  assert.equal(pkg.devDependencies?.electron, '43.2.0')
  assert.equal(pkg.devDependencies?.['electron-builder'], '26.15.3')
  assert.equal(pkg.scripts?.['check:electron-package'], 'node scripts/check-electron-package.mjs')
  assert.equal(pkg.scripts?.['install:electron-runtime'], 'node node_modules/electron/install.js')
  assert.equal(pkg.scripts?.['package:electron:macos'], 'npm run -s install:electron-runtime && electron-builder --config electron-builder.config.cjs --mac dir --publish never')
  assert.equal(pkg.scripts?.['package:electron:windows'], 'npm run -s install:electron-runtime && electron-builder --config electron-builder.config.cjs --win nsis --publish never')
  assert.equal(pkg.scripts?.['package:electron:linux'], 'npm run -s install:electron-runtime && electron-builder --config electron-builder.config.cjs --linux AppImage --publish never')
  assert.equal(pkg.scripts?.['package:native'], 'node scripts/collect-appling-artifacts.mjs')
  assert.equal(pkg.scripts?.['package:macos-dmg'], 'node scripts/create-macos-dmg.mjs')
  assert.equal(pkg.scripts?.['package:appling'], undefined)
  assert.equal(pkg.dependencies?.electron, undefined)
})

test('native release workflow validates immutable source and builds reviewed Electron artifacts for every desktop OS', () => {
  assert.match(nativeReleaseWorkflow, /name: Desktop Native Release/)
  assert.match(nativeReleaseWorkflow, /workflow_dispatch:/)
  assert.match(nativeReleaseWorkflow, /source_ref:/)
  assert.match(nativeReleaseWorkflow, /publish_release:/)
  assert.match(nativeReleaseWorkflow, /release_mode:/)
  assert.match(nativeReleaseWorkflow, /default: package-proof/)
  assert.match(nativeReleaseWorkflow, /NODE_VERSION: 22\.22\.0/)
  assert.match(nativeReleaseWorkflow, /tag must be a stable vX\.Y\.Z tag/)
  assert.match(nativeReleaseWorkflow, /source_ref must be an exact lowercase 40-character commit SHA/)
  assert.match(nativeReleaseWorkflow, /"\$SOURCE_REF" != "\$DISPATCH_SHA"/)
  assert.match(nativeReleaseWorkflow, /package\.json version .* does not match/)
  assert.match(nativeReleaseWorkflow, /ref: \$\{\{ inputs\.source_ref \}\}/)
  assert.match(nativeReleaseWorkflow, /persist-credentials: false/)
  assert.doesNotMatch(nativeReleaseWorkflow, /\n {2}release:\n/)
  assert.doesNotMatch(nativeReleaseWorkflow, /\n {2}push:\n/)

  assert.equal((nativeReleaseWorkflow.match(/^\s{8}include:$/gm) || []).length, 1)
  assert.match(nativeReleaseWorkflow, /macOS Apple Silicon/)
  assert.match(nativeReleaseWorkflow, /macos-15/)
  assert.match(nativeReleaseWorkflow, /macOS Intel/)
  assert.match(nativeReleaseWorkflow, /macos-15-intel/)
  assert.match(nativeReleaseWorkflow, /Windows x64/)
  assert.match(nativeReleaseWorkflow, /windows-2025/)
  assert.match(nativeReleaseWorkflow, /Linux x64/)
  assert.match(nativeReleaseWorkflow, /ubuntu-24\.04/)
  assert.match(nativeReleaseWorkflow, /package:electron:macos/)
  assert.match(nativeReleaseWorkflow, /package:electron:windows/)
  assert.match(nativeReleaseWorkflow, /package:electron:linux/)
  assert.match(nativeReleaseWorkflow, /npm ci/)
  assert.match(nativeReleaseWorkflow, /npm test/)
  assert.match(nativeReleaseWorkflow, /git diff --exit-code -- ui\/dist\/main\.bundle\.js/)
  assert.doesNotMatch(nativeReleaseWorkflow, /CMAKE|MakeAppx|npm ci --prefix appling|azure\/trusted-signing|libgtk-4-dev|linuxdeploy/)

  assert.match(nativeReleaseWorkflow, /check-electron-package\.mjs/)
  assert.match(nativeReleaseWorkflow, /find dist\/electron -type f -name 'app\.asar' ! -path '\*\/node_modules\/\*'/)
  assert.doesNotMatch(nativeReleaseWorkflow, /-path '\*\/resources\/app\.asar'/)
  assert.match(nativeReleaseWorkflow, /--source-ref "\$SOURCE_REF"/)
  assert.match(nativeReleaseWorkflow, /--release-mode "\$RELEASE_MODE"/)
  assert.match(nativeReleaseWorkflow, /--platform "\$\{\{ matrix\.platform \}\}"/)
  assert.match(nativeReleaseWorkflow, /--arch "\$\{\{ matrix\.arch \}\}"/)
  assert.match(nativeReleaseWorkflow, /embedded ASAR integrity fuse/)
  assert.match(nativeReleaseWorkflow, /only-load-from-ASAR fuse/)
  assert.match(nativeReleaseWorkflow, /runtime-rpc-smoke\.mjs/)
  assert.match(nativeReleaseWorkflow, /chrome_sandbox="\$\(dirname "\$ELECTRON_EXECUTABLE"\)\/chrome-sandbox"/)
  assert.match(nativeReleaseWorkflow, /\[\[ ! -f "\$chrome_sandbox" \|\| -L "\$chrome_sandbox" \]\]/)
  assert.match(nativeReleaseWorkflow, /sudo chown root:root "\$chrome_sandbox"/)
  assert.match(nativeReleaseWorkflow, /sudo chmod 4755 "\$chrome_sandbox"/)
  assert.match(nativeReleaseWorkflow, /owner="\$\(stat -c '%U:%G' "\$chrome_sandbox"\)"/)
  assert.match(nativeReleaseWorkflow, /mode="\$\(stat -c '%a' "\$chrome_sandbox"\)"/)
  assert.match(nativeReleaseWorkflow, /\[\[ "\$owner" != "root:root" \]\]/)
  assert.match(nativeReleaseWorkflow, /\[\[ "\$mode" != "4755" \]\]/)
  assert.match(nativeReleaseWorkflow, /xvfb-run -a/)
  assert.doesNotMatch(nativeReleaseWorkflow, /--no-sandbox/)
  assert.match(nativeReleaseWorkflow, /Start-Process -FilePath \$env:ELECTRON_EXECUTABLE/)

  assert.match(nativeReleaseWorkflow, /PEARBROWSER_MACOS_CERTIFICATE_P12_BASE64/)
  assert.match(nativeReleaseWorkflow, /Import macOS Developer ID certificate into an ephemeral keychain/)
  assert.match(nativeReleaseWorkflow, /security import .* -T \/usr\/bin\/codesign/)
  assert.doesNotMatch(nativeReleaseWorkflow, /security import .* -A/)
  assert.match(nativeReleaseWorkflow, /security set-key-partition-list/)
  assert.match(nativeReleaseWorkflow, /security delete-keychain/)
  assert.match(nativeReleaseWorkflow, /notarize-appling-macos\.mjs --build-dir dist\/electron/)
  assert.match(nativeReleaseWorkflow, /create-macos-dmg\.mjs --tag "\$RELEASE_TAG" --build-dir dist\/electron/)
  assert.match(nativeReleaseWorkflow, /PEARBROWSER_WINDOWS_CERTIFICATE_PFX_BASE64/)
  assert.match(nativeReleaseWorkflow, /WIN_CSC_LINK/)
  assert.match(nativeReleaseWorkflow, /WIN_CSC_KEY_PASSWORD/)
  assert.match(nativeReleaseWorkflow, /Remove-Item -LiteralPath \$pfxPath -Force -ErrorAction SilentlyContinue/)
  assert.doesNotMatch(nativeReleaseWorkflow, /Import-PfxCertificate|PEARBROWSER_WINDOWS_SIGNING_THUMBPRINT/)

  assert.match(nativeReleaseWorkflow, /collect-appling-artifacts\.mjs/)
  assert.match(nativeReleaseWorkflow, /--build-dir dist\/electron/)
  assert.match(nativeReleaseWorkflow, /check-native-release-bundle\.mjs/)
  assert.match(nativeReleaseWorkflow, /actions\/checkout@[0-9a-f]{40} # v4/)
  assert.match(nativeReleaseWorkflow, /actions\/setup-node@[0-9a-f]{40} # v4/)
  assert.match(nativeReleaseWorkflow, /actions\/upload-artifact@[0-9a-f]{40} # v4/)
  assert.match(nativeReleaseWorkflow, /actions\/download-artifact@[0-9a-f]{40} # v4/)
  assert.doesNotMatch(nativeReleaseWorkflow, /uses: [^\n]+@v[0-9]/)

  const globalConfiguration = nativeReleaseWorkflow.slice(0, nativeReleaseWorkflow.indexOf('\njobs:'))
  assert.doesNotMatch(globalConfiguration, /secrets\./)
  assert.doesNotMatch(nativeReleaseWorkflow, /if: [^\n]*secrets\./)
})

test('native release workflow keeps package proof private and public trust draft-first', () => {
  assert.match(nativeReleaseWorkflow, /publish_release=true requires release_mode=public-trust/)
  assert.match(nativeReleaseWorkflow, /environment: \$\{\{ inputs\.release_mode == 'public-trust' && matrix\.platform != 'linux' && 'production' \|\| 'package-proof' \}\}/)
  assert.match(nativeReleaseWorkflow, /attach-draft:\n[\s\S]*?if: \$\{\{ inputs\.release_mode == 'public-trust' \}\}/)
  assert.match(nativeReleaseWorkflow, /publish-release:\n[\s\S]*?if: \$\{\{ inputs\.release_mode == 'public-trust' && inputs\.publish_release \}\}/)
  assert.match(nativeReleaseWorkflow, /gh release create "\$RELEASE_TAG"/)
  assert.match(nativeReleaseWorkflow, /--target "\$SOURCE_REF"/)
  assert.match(nativeReleaseWorkflow, /--draft/)
  assert.match(nativeReleaseWorkflow, /gh release upload "\$RELEASE_TAG" "\$\{assets\[@\]\}"/)
  assert.doesNotMatch(nativeReleaseWorkflow, /--clobber/)
  assert.match(nativeReleaseWorkflow, /gh release edit "\$RELEASE_TAG" --repo "\$GH_REPO" --draft=false --latest/)
  assert.match(nativeReleaseWorkflow, /Download independently verified Actions bundle/)
  assert.match(nativeReleaseWorkflow, /Re-download draft, compare exact bytes, and publish/)
  assert.match(nativeReleaseWorkflow, /gh release download "\$RELEASE_TAG"/)
  assert.match(nativeReleaseWorkflow, /cmp -s -- "\$verified_dir\/\$name" "\$draft_dir\/\$name"/)
  assert.match(nativeReleaseWorkflow, /Draft asset bytes differ from the verified Actions artifact/)
  assert.match(nativeReleaseWorkflow, /--require-published/)
  assert.match(nativeReleaseWorkflow, /--require-public-trust/)
  assert.doesNotMatch(nativeReleaseWorkflow, /--require-backfill-formats/)

  assert.ok(
    nativeReleaseWorkflow.indexOf('Create draft from the exact source commit') <
      nativeReleaseWorkflow.indexOf('Attach assets without overwrite'),
    'the workflow must create a draft before attaching assets'
  )
  assert.ok(
    nativeReleaseWorkflow.indexOf('Download independently verified Actions bundle') <
      nativeReleaseWorkflow.indexOf('Re-download draft, compare exact bytes, and publish'),
    'the workflow must recover the independently verified Actions bundle before final draft verification'
  )
  const finalPublicationStep = nativeReleaseWorkflow.slice(
    nativeReleaseWorkflow.indexOf('- name: Re-download draft, compare exact bytes, and publish'),
    nativeReleaseWorkflow.indexOf('- name: Verify published tag and public downloads')
  )
  assert.ok(
    finalPublicationStep.indexOf('gh release download "$RELEASE_TAG"') <
      finalPublicationStep.indexOf('cmp -s -- "$verified_dir/$name" "$draft_dir/$name"') &&
      finalPublicationStep.indexOf('cmp -s -- "$verified_dir/$name" "$draft_dir/$name"') <
      finalPublicationStep.indexOf('gh release edit "$RELEASE_TAG"'),
    'the same final step must download and byte-compare the current draft before publication'
  )
  assert.equal(
    (finalPublicationStep.match(/check-native-release-bundle\.mjs/g) || []).length,
    2,
    'the final step must checksum-verify both the Actions bundle and downloaded draft'
  )
  assert.ok(
    nativeReleaseWorkflow.indexOf('Create, notarize, and staple public-trust DMG') <
      nativeReleaseWorkflow.indexOf('Collect normalized release artifacts and provenance manifest'),
    'public-trust DMGs must be created before artifact collection'
  )
  assert.ok(
    nativeReleaseWorkflow.indexOf('Re-download draft, compare exact bytes, and publish') <
      nativeReleaseWorkflow.lastIndexOf('verify-native-downloads.mjs'),
    'public download verification must happen after publication'
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

  // Azure Trusted Signing is intentionally deferred until it has a reviewed integration.
  const windowsAzureComplete = run({
    AZURE_TENANT_ID: 'tenant',
    AZURE_CLIENT_ID: 'client',
    AZURE_CLIENT_SECRET: 'secret',
    AZURE_TRUSTED_SIGNING_ENDPOINT: 'https://eus.codesigning.azure.net/',
    AZURE_TRUSTED_SIGNING_ACCOUNT: 'pearbrowser-signing',
    AZURE_TRUSTED_SIGNING_CERT_PROFILE: 'pearbrowser'
  }, ['--platform', 'windows', '--require-public-trust'])
  assert.notEqual(windowsAzureComplete.status, 0)
  assert.ok(windowsAzureComplete.report.checks.some((check) => check.id === 'windows-certificate' && check.status === 'fail'))

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
    assert.equal(githubComplete.report.githubEnvironment, 'production')
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
    assert.equal(githubIncomplete.report.githubEnvironment, 'production')
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

test('Electron artifact collector emits checksummed release assets with provenance', () => {
  assert.match(applingArtifactCollector, /createHash\('sha256'\)/)
  assert.match(applingArtifactCollector, /\.app\.zip/)
  assert.match(applingArtifactCollector, /\.exe/)
  assert.match(applingArtifactCollector, /\.AppImage/)
  assert.match(applingArtifactCollector, /SHA256SUMS-\$\{releasePlatform\}-\$\{arch\}\.txt/)
  assert.match(applingArtifactCollector, /\$\{appName\}-\$\{version\}-\$\{releasePlatform\}-\$\{arch\}/)
  assert.match(applingArtifactCollector, /sourceRef/)
  assert.match(applingArtifactCollector, /releaseMode/)
  assert.match(applingArtifactCollector, /expected exactly one top-level Electron Builder/)
  assert.match(applingArtifactCollector, /release version \$\{version\} does not match package\.json version/)
  assert.match(applingArtifactCollector, /refusing to clear unsafe output directory/)
})

test('Electron artifact collector emits normalized NSIS assets and checksum manifests', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-electron-release-')))
  try {
    const buildDir = join(fixture, 'dist', 'electron')
    mkdirSync(join(buildDir, 'win-unpacked'), { recursive: true })
    writeFileSync(join(buildDir, 'PearBrowser Setup.exe'), 'windows installer bytes')
    writeFileSync(join(buildDir, 'win-unpacked', 'PearBrowser.exe'), 'unpacked app executable')
    writeFileSync(join(buildDir, 'notes.txt'), 'not a release artifact')

    execFileSync(process.execPath, [
      applingArtifactCollectorPath,
      '--tag',
      releaseTag,
      '--source-ref',
      immutableSourceRef,
      '--release-mode',
      'package-proof',
      '--platform',
      'windows',
      '--arch',
      'X64',
      '--build-dir',
      buildDir
    ], { cwd: fixture, encoding: 'utf8' })

    const outDir = join(fixture, 'dist', 'native-release', releaseTag, 'windows', 'x64')
    assert.deepEqual(readdirSync(outDir).sort(), [
      `PearBrowser-${releaseVersion}-windows-x64.exe`,
      `PearBrowser-${releaseVersion}-windows-x64.exe.sha256`,
      'SHA256SUMS-windows-x64.txt',
      'manifest-windows-x64.json'
    ])

    const sidecar = readFileSync(join(outDir, `PearBrowser-${releaseVersion}-windows-x64.exe.sha256`), 'utf8')
    assert.match(sidecar, new RegExp(`^[a-f0-9]{64}  PearBrowser-${releaseVersion.replaceAll('.', '\\.')}-windows-x64\\.exe\\n$`))
    assert.equal(readFileSync(join(outDir, 'SHA256SUMS-windows-x64.txt'), 'utf8'), sidecar)

    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest-windows-x64.json'), 'utf8'))
    assert.equal(manifest.tag, releaseTag)
    assert.equal(manifest.version, releaseVersion)
    assert.equal(manifest.sourceRef, immutableSourceRef)
    assert.equal(manifest.releaseMode, 'package-proof')
    assert.equal(manifest.platform, 'windows')
    assert.equal(manifest.arch, 'x64')
    assert.equal(manifest.artifacts.length, 1)
    assert.equal(manifest.artifacts[0].name, `PearBrowser-${releaseVersion}-windows-x64.exe`)
    assert.equal(manifest.artifacts[0].source, 'dist/electron/PearBrowser Setup.exe')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('Electron artifact collector packages only the top-level product AppImage', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-linux-electron-release-')))
  try {
    const buildDir = join(fixture, 'dist', 'electron')
    mkdirSync(join(buildDir, 'linux-unpacked'), { recursive: true })
    writeFileSync(join(buildDir, 'PearBrowser.AppImage'), 'pearbrowser product bytes')
    writeFileSync(join(buildDir, 'linux-unpacked', 'nested.AppImage'), 'must be ignored')

    execFileSync(process.execPath, [
      applingArtifactCollectorPath,
      '--tag',
      releaseTag,
      '--source-ref',
      immutableSourceRef,
      '--release-mode',
      'package-proof',
      '--platform',
      'linux',
      '--arch',
      'x64',
      '--build-dir',
      buildDir
    ], { cwd: fixture, encoding: 'utf8' })

    const outDir = join(fixture, 'dist', 'native-release', releaseTag, 'linux', 'x64')
    const assetName = `PearBrowser-${releaseVersion}-linux-x64.AppImage`
    assert.equal(readFileSync(join(outDir, assetName), 'utf8'), 'pearbrowser product bytes')
    const manifest = JSON.parse(readFileSync(join(outDir, 'manifest-linux-x64.json'), 'utf8'))
    assert.equal(manifest.sourceRef, immutableSourceRef)
    assert.equal(manifest.releaseMode, 'package-proof')
    assert.equal(manifest.artifacts.length, 1)
    assert.equal(manifest.artifacts[0].source, 'dist/electron/PearBrowser.AppImage')
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
      '--source-ref',
      immutableSourceRef,
      '--release-mode',
      'package-proof',
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
    assert.ok(missingReport.errors.some((error) => error.includes('expected exactly one public-trust macOS DMG for macos/x64, found 0')))
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
    assert.match(markdown.stdout, /does not independently attest Developer ID signing/)
    assert.match(markdown.stdout, /validate those properties against the complete published release evidence/)
    assert.doesNotMatch(markdown.stdout, /The macOS DMG is Developer ID signed/)
    assert.doesNotMatch(markdown.stdout, /Windows NSIS \.exe is Authenticode-signed/)

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
    assert.match(guide.stdout, /Signing and notarization status must come from release evidence, not these filenames/)
    assert.doesNotMatch(guide.stdout, /supported user-facing formats are a notarized macOS/)
    assert.doesNotMatch(guide.stdout, /legacy migration record/i)

    const packageProofDir = join(fixture, 'package-proof')
    mkdirSync(packageProofDir)
    const { releasePath: packageProofRelease } = writePackageManagerReleaseFixture(packageProofDir, [
      'PearBrowser-0.5.0-macos-arm64.app.zip',
      'PearBrowser-0.5.0-macos-arm64.app.zip.sha256',
      'PearBrowser-0.5.0-macos-x64.app.zip',
      'PearBrowser-0.5.0-macos-x64.app.zip.sha256',
      'PearBrowser-0.5.0-windows-x64.exe',
      'PearBrowser-0.5.0-windows-x64.exe.sha256',
      'PearBrowser-0.5.0-linux-x64.AppImage',
      'PearBrowser-0.5.0-linux-x64.AppImage.sha256'
    ])
    const packageProofGuide = spawnSync(process.execPath, [
      nativeInstallSnippetPath,
      '--fixture',
      packageProofRelease,
      '--tag',
      'v0.5.0',
      '--trust-mode',
      'package-proof',
      '--format',
      'guide'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(packageProofGuide.status, 0, packageProofGuide.stderr || packageProofGuide.stdout)
    assert.match(packageProofGuide.stdout, /package-proof GitHub Actions artifacts only/)
    assert.match(packageProofGuide.stdout, /macOS is ad-hoc signed but not notarized/)
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
      immutableSourceRef,
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(json.status, 0, json.stderr || json.stdout)
    const report = JSON.parse(json.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.trustMode, 'package-proof')
    assert.equal(report.sourceRef, immutableSourceRef)
    assert.equal(report.runtimeSmokeScript, `https://raw.githubusercontent.com/bigdestiny2/pearbrowser-desktop/${immutableSourceRef}/scripts/runtime-rpc-smoke.mjs`)
    assert.equal(report.targets.length, 4)
    assert.ok(report.warnings.some((warning) => warning.includes('package-proof clean-install smoke')))
    assert.ok(report.targets.find((target) => target.label === 'macOS Apple Silicon').commands.some((command) => command.includes('ditto -x -k')))
    assert.ok(report.targets.find((target) => target.label === 'macOS Apple Silicon').commands.some((command) => command.includes('codesign --verify')))
    assert.ok(report.targets.find((target) => target.label === 'macOS Apple Silicon').commands.some((command) => command.includes('runtime-rpc-smoke.mjs --timeout 20000 --max-storage-percent 100 --json')))
    assert.ok(report.targets.find((target) => target.label === 'Windows x64').commands.some((command) => command.includes('Get-AuthenticodeSignature')))
    assert.ok(report.targets.find((target) => target.label === 'Windows x64').commands.some((command) => command.includes('Start menu')))
    assert.ok(report.targets.find((target) => target.label === 'Windows x64').commands.some((command) => command.includes('Invoke-WebRequest -Uri') && command.includes(`${immutableSourceRef}/scripts/runtime-rpc-smoke.mjs`)))
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
      immutableSourceRef
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.equal(markdown.status, 0, markdown.stderr || markdown.stdout)
    assert.match(markdown.stdout, /## Native Clean-Install Smoke Plan/)
    assert.ok(markdown.stdout.includes(`Smoke helper source: [${immutableSourceRef}]`))
    assert.match(markdown.stdout, /### macOS Apple Silicon/)
    assert.match(markdown.stdout, /```powershell/)
    assert.match(markdown.stdout, /Evidence to record:/)

    const blocked = spawnSync(process.execPath, [
      nativeInstallSmokePlanPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      immutableSourceRef,
      '--trust-mode',
      'public-trust',
      '--json'
    ], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8'
    })

    assert.notEqual(blocked.status, 0)
    const blockedReport = JSON.parse(blocked.stdout)
    assert.ok(blockedReport.errors.some((error) => error.includes('public-trust clean-install smoke requires notarized macOS DMG assets')))

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
      '--source-ref',
      immutableSourceRef,
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
    const { releasePath } = writePublicTrustReleaseFixture(fixture)
    const evidencePath = join(fixture, 'evidence.md')
    writeCompleteReleaseEvidenceFixture(evidencePath)

    const result = spawnSync(process.execPath, [
      publicTrustReadinessPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      immutableSourceRef,
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
    assert.equal(report.sourceRef, immutableSourceRef)
    assert.equal(report.checks.length, 8)
    assert.deepEqual(report.blockers, [])
    assert.ok(report.checks.every((check) => check.ok))
    assert.ok(report.checks.find((check) => check.id === 'native-install-smoke-plan').command.includes(`--source-ref ${immutableSourceRef}`))
    assert.equal(report.checks.find((check) => check.id === 'linux-appimage-metadata').status, 'pass')
    assert.match(report.checks.find((check) => check.id === 'published-provenance').summary, new RegExp(`sourceRef=${immutableSourceRef}`))
    assert.ok(report.checks.some((check) => check.id === 'native-downloads' && check.summary.includes('verified=4')))
    assert.deepEqual(report.warnings, [])
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('public-trust readiness checker rejects published manifests from a different source commit', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-public-trust-source-mismatch-')))
  try {
    const { releasePath } = writePublicTrustReleaseFixture(fixture, {
      sourceRef: 'fedcba9876543210fedcba9876543210fedcba98'
    })
    const evidencePath = join(fixture, 'evidence.md')
    writeCompleteReleaseEvidenceFixture(evidencePath)

    const result = spawnSync(process.execPath, [
      publicTrustReadinessPath,
      '--fixture',
      releasePath,
      '--tag',
      'v0.5.0',
      '--source-ref',
      immutableSourceRef,
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
    const provenance = report.checks.find((check) => check.id === 'published-provenance')
    assert.equal(provenance.status, 'block')
    assert.ok(provenance.blockers.some((message) => message.includes('manifest-macos-arm64.json: sourceRef')))
    assert.ok(provenance.blockers.some((message) => message.includes(immutableSourceRef)))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('public-trust readiness checker can read signing gate from GitHub Actions secret names', () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'pear-public-trust-github-secrets-')))
  try {
    const { releasePath } = writePublicTrustReleaseFixture(fixture)
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
      immutableSourceRef,
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
    assert.match(nativeSigning.command, /--github-environment production/)
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
      immutableSourceRef,
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
    assert.ok(report.checks.find((check) => check.id === 'native-install-smoke-plan').command.includes(`--source-ref ${immutableSourceRef}`))
    assert.equal(report.checks.find((check) => check.id === 'package-manager-manifests').status, 'block')
    assert.ok(report.blockers.some((blocker) => blocker.message.includes('expected exactly one public-trust macOS DMG for macos/arm64, found 0')))
    assert.ok(report.blockers.some((blocker) => blocker.message.includes('public-trust clean-install smoke requires notarized macOS DMG assets')))
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
        'PearBrowser-0.5.0-windows-x64.exe',
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
    assert.ok(report.errors.some((error) => error.includes('missing SHA-256 sidecar for PearBrowser-0.5.0-windows-x64.exe')))
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
  assert.match(releaseStorySmoke, /PEERCORD_MIGRATION_ID/)
  assert.match(releaseStorySmoke, /runMode: 'migration-required'/)
  assert.doesNotMatch(releaseStorySmoke, /CMD_LAUNCH_PEAR_LINK/)
  assert.doesNotMatch(releaseStorySmoke, /CMD_RUN_APP_IN_TAB/)
})

test('live catalogue verifier asserts PearBrowser release contract and Peercord provenance metadata', () => {
  assert.match(liveCatalogVerifier, /PearBrowser version mismatch/)
  assert.match(liveCatalogVerifier, /PearBrowser native install link mismatch/)
  assert.match(liveCatalogVerifier, /PearBrowser native delivery must be an available Pear v3 release/)
  assert.match(liveCatalogVerifier, /PearBrowser migration identity mismatch/)
  assert.match(liveCatalogVerifier, /PearBrowser homepage mismatch/)
  assert.match(liveCatalogVerifier, /Peercord sourceUrl mismatch/)
  assert.match(liveCatalogVerifier, /https:\/\/git\.churchofmalware\.org\/mastercodeon\/Peercord/)
  assert.match(liveCatalogVerifier, /Peercord license mismatch/)
  assert.match(liveCatalogVerifier, /GPL-3\.0/)
})
