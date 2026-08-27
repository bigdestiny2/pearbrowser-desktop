const pkg = require('./package.json')
const runtimeIntegrityHooks = require('./scripts/electron-runtime-integrity-hooks.cjs')

const releaseMode = process.env.RELEASE_MODE || 'package-proof'
const releaseTag = process.env.RELEASE_TAG || `v${pkg.version}`
const sourceRef = process.env.SOURCE_REF || 'local-working-tree'

if (!['package-proof', 'public-trust'].includes(releaseMode)) {
  throw new Error(`RELEASE_MODE must be package-proof or public-trust, got ${releaseMode}`)
}
if (releaseTag !== `v${pkg.version}` || !/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(releaseTag)) {
  throw new Error(`RELEASE_TAG must be the stable package tag v${pkg.version}, got ${releaseTag}`)
}
if (sourceRef !== 'local-working-tree' && !/^[0-9a-f]{40}$/.test(sourceRef)) {
  throw new Error('SOURCE_REF must be an exact lowercase 40-character commit SHA')
}
if (process.env.CI && sourceRef === 'local-working-tree') {
  throw new Error('CI packaging requires SOURCE_REF to be an exact commit SHA')
}

const publicTrust = releaseMode === 'public-trust'
const artifactName = '${productName}-${version}-${os}-${arch}.${ext}' // eslint-disable-line no-template-curly-in-string
if (publicTrust && process.platform === 'win32') {
  const certificate = process.env.WIN_CSC_LINK || process.env.CSC_LINK || ''
  const password = process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD || ''
  if (!certificate || !password) {
    throw new Error('Windows public-trust packaging requires WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD')
  }
}

module.exports = {
  appId: 'io.github.bigdestiny2.pearbrowser',
  productName: 'PearBrowser',
  electronVersion: '43.2.0',
  electronDist: 'node_modules/electron/dist',
  copyright: 'Copyright © 2026 PearBrowser contributors',
  beforePack: runtimeIntegrityHooks.beforePack,
  afterPack: runtimeIntegrityHooks.afterPack,
  afterSign: runtimeIntegrityHooks.afterSign,
  asar: true,
  asarUnpack: [
    'workers/**/*',
    'index.js',
    'backend/**/*',
    'node_modules/**/*'
  ],
  extraResources: [
    {
      from: 'packaging/pear-runtime-package.json',
      to: 'app.asar.unpacked/package.json'
    }
  ],
  electronFuses: {
    runAsNode: false,
    enableCookieEncryption: true,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true
  },
  npmRebuild: false,
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  compression: 'maximum',
  removePackageScripts: true,
  forceCodeSigning: publicTrust,
  directories: {
    output: 'dist/electron',
    buildResources: 'appling/assets'
  },
  files: [
    'electron/**/*',
    'workers/**/*',
    'backend/**/*',
    'ui/dist/main.bundle.js',
    'index.js',
    'index.html',
    'styles.css',
    'package.json'
  ],
  extraMetadata: {
    pearRelease: {
      tag: releaseTag,
      sourceRef,
      mode: releaseMode,
      pear: '3.3.0'
    }
  },
  mac: {
    target: ['dir'],
    category: 'public.app-category.utilities',
    icon: 'appling/assets/darwin/icon.icns',
    identity: publicTrust ? (process.env.PEARBROWSER_MACOS_SIGNING_IDENTITY || undefined) : '-',
    hardenedRuntime: true,
    entitlements: publicTrust ? 'build/entitlements.mac.plist' : 'build/entitlements.mac.package-proof.plist',
    entitlementsInherit: publicTrust ? 'build/entitlements.mac.plist' : 'build/entitlements.mac.package-proof.plist',
    gatekeeperAssess: false,
    notarize: false,
    minimumSystemVersion: '12.0',
    artifactName
  },
  win: {
    target: ['nsis'],
    icon: 'appling/assets/win32/icon.png',
    requestedExecutionLevel: 'asInvoker',
    forceCodeSigning: publicTrust,
    artifactName,
    signtoolOptions: {
      signingHashAlgorithms: ['sha256'],
      rfc3161TimeStampServer: 'http://timestamp.digicert.com'
    }
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: false,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'PearBrowser'
  },
  linux: {
    target: ['AppImage'],
    category: 'Network',
    icon: 'appling/assets/linux/icon.png',
    executableName: 'pearbrowser',
    artifactName,
    desktop: {
      entry: {
        Name: 'PearBrowser',
        Comment: pkg.description,
        Categories: 'Network;WebBrowser;'
      }
    }
  },
  appImage: {
    artifactName
  }
}
