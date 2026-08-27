'use strict'

const ARTIFACT_EXTENSIONS = Object.freeze({
  darwin: '.app',
  linux: '.AppImage',
  win32: '.exe'
})

function pearOtaArtifactName (productName, platform = process.platform) {
  const name = String(productName || '').trim()
  // eslint-disable-next-line no-control-regex
  if (!name || /[\\/\u0000-\u001f\u007f]/.test(name)) {
    throw new Error('Pear OTA product name must be a safe artifact basename')
  }

  const extension = ARTIFACT_EXTENSIONS[platform]
  if (!extension) throw new Error(`Pear OTA updates are not supported on ${platform}`)
  return name.endsWith(extension) ? name : `${name}${extension}`
}

function relaunchAfterPearUpdate ({
  app,
  platform = process.platform,
  env = process.env,
  argv = process.argv
}) {
  if (!app || typeof app.quit !== 'function') throw new Error('Electron app lifecycle is required')

  if (platform === 'linux' && env.APPIMAGE) {
    if (typeof app.relaunch !== 'function') throw new Error('Electron relaunch is unavailable')
    app.relaunch({
      execPath: env.APPIMAGE,
      args: [
        '--appimage-extract-and-run',
        ...argv.slice(1).filter((arg) => arg !== '--appimage-extract-and-run')
      ]
    })
  } else if (platform !== 'win32') {
    if (typeof app.relaunch !== 'function') throw new Error('Electron relaunch is unavailable')
    app.relaunch()
  }

  // The Windows NSIS installation owns relaunch/registration, so a future
  // Pear OTA apply exits and lets the next user launch start the swapped app.
  // macOS and Linux can relaunch their outer bundles immediately. OTA remains
  // disabled until this platform behavior and the production multisig channel
  // have independent release evidence.
  app.quit()
}

async function applyPearUpdateAndRestart ({ updater, app, platform, env, argv }) {
  if (!updater || typeof updater.applyUpdate !== 'function') {
    throw new Error('Pear OTA updater is required')
  }
  await updater.applyUpdate()
  relaunchAfterPearUpdate({ app, platform, env, argv })
}

module.exports = {
  ARTIFACT_EXTENSIONS,
  applyPearUpdateAndRestart,
  pearOtaArtifactName,
  relaunchAfterPearUpdate
}
