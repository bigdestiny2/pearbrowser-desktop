import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  applyPearUpdateAndRestart,
  pearOtaArtifactName,
  relaunchAfterPearUpdate
} = require('../electron/pear-ota-lifecycle.cjs')

test('Pear OTA artifact names match the packaged deployment basenames', () => {
  assert.equal(pearOtaArtifactName('PearBrowser', 'darwin'), 'PearBrowser.app')
  assert.equal(pearOtaArtifactName('PearBrowser', 'linux'), 'PearBrowser.AppImage')
  assert.equal(pearOtaArtifactName('PearBrowser', 'win32'), 'PearBrowser.exe')
  assert.equal(pearOtaArtifactName('PearBrowser.app', 'darwin'), 'PearBrowser.app')
  assert.throws(() => pearOtaArtifactName('../PearBrowser', 'darwin'), /safe artifact basename/)
  assert.throws(() => pearOtaArtifactName('PearBrowser', 'freebsd'), /not supported/)
})

test('Pear OTA applies an update before relaunching macOS', async () => {
  const calls = []
  await applyPearUpdateAndRestart({
    updater: { applyUpdate: async () => calls.push('apply') },
    app: {
      relaunch: () => calls.push('relaunch'),
      quit: () => calls.push('quit')
    },
    platform: 'darwin'
  })
  assert.deepEqual(calls, ['apply', 'relaunch', 'quit'])
})

test('Pear OTA relaunches an AppImage through its stable outer path', () => {
  const calls = []
  relaunchAfterPearUpdate({
    app: {
      relaunch: (options) => calls.push(['relaunch', options]),
      quit: () => calls.push(['quit'])
    },
    platform: 'linux',
    env: { APPIMAGE: '/opt/PearBrowser.AppImage' },
    argv: ['/tmp/.mount/AppRun', '--appimage-extract-and-run', '--profile', 'test']
  })
  assert.deepEqual(calls, [
    ['relaunch', {
      execPath: '/opt/PearBrowser.AppImage',
      args: ['--appimage-extract-and-run', '--profile', 'test']
    }],
    ['quit']
  ])
})

test('Pear OTA lets the Windows NSIS installation relaunch on the next open', () => {
  const calls = []
  relaunchAfterPearUpdate({
    app: {
      relaunch: () => calls.push('relaunch'),
      quit: () => calls.push('quit')
    },
    platform: 'win32'
  })
  assert.deepEqual(calls, ['quit'])
})

test('Pear OTA does not restart when applying the update fails', async () => {
  const calls = []
  await assert.rejects(
    applyPearUpdateAndRestart({
      updater: { applyUpdate: async () => { throw new Error('swap failed') } },
      app: {
        relaunch: () => calls.push('relaunch'),
        quit: () => calls.push('quit')
      },
      platform: 'darwin'
    }),
    /swap failed/
  )
  assert.deepEqual(calls, [])
})
