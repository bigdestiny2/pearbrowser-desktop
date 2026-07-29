import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import launcherMod from '../electron/pear-app-launcher.cjs'

const { PearAppLauncher, normalizePearInstallLink, validateInstallEvent, validateResolvedTargets } = launcherMod
const KEY = 'a'.repeat(52)
const LINK = `pear://${KEY}`

function installEvent (overrides = {}) {
  return {
    app: 'Demo App',
    name: 'demo-app',
    version: '3.0.0',
    upgrade: LINK,
    verlink: `pear://0.42.${KEY}`,
    key: '/by-arch/linux-x64/app/Demo App.AppImage',
    dest: '/home/test/.local/bin/Demo App.AppImage',
    ...overrides
  }
}

test('Pear v3 install links accept only canonical root keys', () => {
  assert.equal(normalizePearInstallLink(`${LINK}/`), LINK)
  assert.equal(normalizePearInstallLink(`PEAR://${KEY.toUpperCase()}`), LINK)
  assert.throws(() => normalizePearInstallLink(`pear://${KEY}/worker.js`), /must not contain a path/)
  assert.throws(() => normalizePearInstallLink('pear://keet'), /52-character Pear key/)
  assert.throws(() => normalizePearInstallLink(`hyper://${KEY}`), /canonical 52-character Pear key/)
})

test('installer metadata is constrained to one GUI artifact and default OS destination', () => {
  assert.deepEqual(validateInstallEvent(installEvent(), {
    platform: 'linux',
    arch: 'x64',
    homeDir: '/home/test',
    expectedLink: LINK
  }), {
    app: 'Demo App',
    packageName: 'demo-app',
    version: '3.0.0',
    upgrade: LINK,
    verlink: `pear://0.42.${KEY}`,
    key: '/by-arch/linux-x64/app/Demo App.AppImage',
    dest: '/home/test/.local/bin/Demo App.AppImage'
  })
  assert.equal(validateInstallEvent(installEvent({ verlink: `pear://0.42.${KEY}.${'b'.repeat(52)}` }), {
    platform: 'linux', arch: 'x64', homeDir: '/home/test', expectedLink: LINK
  }).verlink, `pear://0.42.${KEY}.${'b'.repeat(52)}`)

  assert.throws(() => validateInstallEvent(installEvent({
    app: 'demo-cli',
    key: '/by-arch/linux-x64/app/demo-cli',
    dest: '/home/test/.local/bin/demo-cli'
  }), { platform: 'linux', homeDir: '/home/test', expectedLink: LINK }), /non-GUI executable target/)
  assert.throws(() => validateInstallEvent(installEvent({ key: '/by-arch/linux-arm64/app/Demo App.AppImage' }), {
    platform: 'linux', arch: 'x64', homeDir: '/home/test', expectedLink: LINK
  }), /non-GUI executable target/)
  assert.throws(() => validateInstallEvent(installEvent({ dest: '/tmp/Demo App.AppImage' }), {
    platform: 'linux', homeDir: '/home/test', expectedLink: LINK
  }), /unexpected Linux install destination/)
  assert.throws(() => validateInstallEvent(installEvent({ upgrade: `pear://${'b'.repeat(52)}` }), {
    platform: 'linux', homeDir: '/home/test', expectedLink: LINK
  }), /upgrade identity does not match/)
  assert.throws(() => validateInstallEvent(installEvent({ verlink: `${LINK}/worker.js` }), {
    platform: 'linux', homeDir: '/home/test', expectedLink: LINK
  }), /invalid version link/)
  assert.throws(() => validateInstallEvent(installEvent(), {
    platform: 'linux', homeDir: '/home/test', expectedLink: LINK, expectedAppName: 'Other App'
  }), /product name does not match/)
})

test('resolved installer targets reject mixed GUI and command-line packages before installation', () => {
  const app = {
    filename: 'Demo App',
    ext: '.AppImage',
    dest: '/home/test/.local/bin/Demo App.AppImage',
    isBin: false
  }
  assert.deepEqual(validateResolvedTargets([app], { platform: 'linux', homeDir: '/home/test' }), {
    app: 'Demo App',
    ext: '.AppImage',
    dest: '/home/test/.local/bin/Demo App.AppImage'
  })
  assert.throws(() => validateResolvedTargets([
    { filename: 'demo-cli', ext: '', dest: '/home/test/.local/bin/demo-cli', isBin: true },
    app
  ], { platform: 'linux', homeDir: '/home/test' }), /multiple installable targets/)
})

test('native installer records authoritative package metadata and closes its resources', async () => {
  let instance = null
  class FakeInstall extends EventEmitter {
    constructor (opts) {
      super()
      this.opts = opts
      this.closed = false
      instance = this
    }

    async ready () {
      this.emit('installing', { link: this.opts.link, host: 'linux-x64' })
      this.emit('stats', { peers: 2, download: { bytes: 1024, speed: 256 } })
      this.emit('app', installEvent())
      this.emit('final', { success: true, installed: 1, exists: [] })
    }

    async close () { this.closed = true }
  }

  const progress = []
  const launcher = new PearAppLauncher({
    platform: 'linux',
    arch: 'x64',
    homeDir: '/home/test',
    Install: FakeInstall
  })
  const record = await launcher.install({ id: 'demo', name: 'Demo', link: LINK, productName: 'Demo App', verification: 'author-signed' }, (event) => progress.push(event))

  assert.equal(instance.opts.link, LINK)
  assert.deepEqual(Object.keys(instance.opts), ['link'])
  assert.equal(instance.closed, true)
  assert.equal(record.app, 'Demo App')
  assert.equal(record.packageName, 'demo-app')
  assert.equal(record.dest, '/home/test/.local/bin/Demo App.AppImage')
  assert.equal(record.verification, 'author-signed')
  assert.deepEqual(progress.map((event) => event.phase), ['connecting', 'downloading', 'installing', 'complete'])
})

test('native installer rejects packages that expose a binary target', async () => {
  let closed = false
  class FakeInstall extends EventEmitter {
    async ready () {
      this.emit('app', installEvent({
        app: 'demo-cli',
        key: '/by-arch/linux-x64/app/demo-cli',
        dest: '/home/test/.local/bin/demo-cli'
      }))
    }

    async close () { closed = true }
  }

  const launcher = new PearAppLauncher({ platform: 'linux', arch: 'x64', homeDir: '/home/test', Install: FakeInstall })
  await assert.rejects(launcher.install({ id: 'demo', link: LINK }), /non-GUI executable target/)
  assert.equal(closed, true)
})

test('native Linux launch uses only the recorded installed artifact', async () => {
  let spawned = null
  const launcher = new PearAppLauncher({
    platform: 'linux',
    arch: 'x64',
    homeDir: '/home/test',
    fs: { existsSync: (filename) => filename === '/home/test/.local/bin/Demo App.AppImage' },
    spawn: (filename, args, opts) => {
      spawned = { filename, args, opts, unref: false }
      return { unref: () => { spawned.unref = true } }
    }
  })
  launcher.records.set(LINK, {
    id: 'demo',
    link: LINK,
    app: 'Demo App',
    packageName: 'demo-app',
    version: '3.0.0',
    dest: '/home/test/.local/bin/Demo App.AppImage',
    platform: 'linux',
    arch: 'x64'
  })

  const result = await launcher.launch(LINK)
  assert.equal(result.launched, true)
  assert.deepEqual(spawned, {
    filename: '/home/test/.local/bin/Demo App.AppImage',
    args: [],
    opts: { detached: true, stdio: 'ignore' },
    unref: true
  })
})

test('persisted native app records are revalidated before they can be launched', () => {
  const valid = {
    id: 'demo',
    link: LINK,
    app: 'Demo App',
    packageName: 'demo-app',
    version: '3.0.0',
    upgrade: LINK,
    verlink: `pear://0.42.${KEY}`,
    artifactKey: '/by-arch/linux-x64/app/Demo App.AppImage',
    dest: '/home/test/.local/bin/Demo App.AppImage',
    platform: 'linux',
    arch: 'x64'
  }
  const launcher = new PearAppLauncher({
    platform: 'linux',
    arch: 'x64',
    homeDir: '/home/test',
    dataFile: '/state/pear-v3-apps.json',
    fs: {
      readFileSync: () => JSON.stringify({ apps: [valid, { ...valid, link: `pear://${'b'.repeat(52)}`, dest: '/tmp/evil.AppImage' }] }),
      existsSync: () => true
    }
  })

  assert.equal(launcher.list().length, 1)
  assert.equal(launcher.list()[0].link, LINK)
})
