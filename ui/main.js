import { createRoot } from 'react-dom/client'
import { html } from 'htm/react'
import { App } from './shell.js'
import { startBackend } from './boot.js'
import { Logo, Wordmark } from './logo.js'

const container = document.getElementById('app')
const root = createRoot(container)

function Splash ({ message, detail, failed }) {
  return html`
    <div className="splash">
      <div className="splash-inner">
        <${Logo} size=${96} animated=${!failed} />
        <${Wordmark} />
        <div className="splash-tagline">P2P browser, app store, and publishing — no servers required.</div>
        <div className=${'splash-status' + (failed ? ' failed' : '')}>
          <span className="splash-spinner"></span>
          <span>${message}</span>
        </div>
        ${detail && html`<pre className="splash-detail">${detail}</pre>`}
      </div>
    </div>
  `
}

root.render(html`<${Splash} message="Connecting to backend…" />`)

try {
  const { rpc, C, storagePath, pipe } = await startBackend()

  // Backend-boot-failed event from the main process: the WS server is
  // up but `require('./backend/index.js')` threw at boot. Renderer
  // gets a structured error frame instead of having to guess. We
  // render the message + stack directly so users / community helpers
  // can paste it into a bug report without a `--dev` log dive.
  let bootFailedShown = false
  rpc.on('event:backend-boot-failed', (data) => {
    bootFailedShown = true
    console.error('Backend boot failed in main process:')
    console.error(data?.message)
    if (data?.stack) console.error(data.stack)
    const detail = [
      data?.message || '(no message)',
      data?.code ? '\nCode: ' + data.code : '',
      data?.stack ? '\n\n' + data.stack : '',
      '\n\nLikely fix: clear the local app cache and relaunch:',
      '\n  rm -rf "$HOME/Library/Application Support/pear/by-dkey/00f61fc1473b9d01a199833fc96e76d5e99000c603ec697bc842f8d978538f4d"',
      '\n  pear run pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty'
    ].join('')
    root.render(html`<${Splash}
      message="Backend failed to boot"
      detail=${detail}
      failed=${true} />`)
  })

  // A renderer reload or transient local WebSocket failure should not leave
  // the mounted app issuing requests into a dead pipe. Show an explicit
  // reconnect state and remount once the authenticated socket is restored.
  let mounted = false
  const mountApp = () => {
    if (bootFailedShown || mounted || !pipe.connected) return
    mounted = true
    root.render(html`<${App} rpc=${rpc} C=${C} storagePath=${storagePath} />`)
  }
  pipe.on('open', () => {
    if (bootFailedShown) return
    root.render(html`<${Splash} message="Handshake restored · resuming…" />`)
    setTimeout(mountApp, 50)
  })
  pipe.on('error', (err) => {
    console.error('Backend RPC connection error:', err)
  })
  pipe.on('close', () => {
    if (bootFailedShown) return
    mounted = false
    root.render(html`<${Splash} message="Backend connection lost · reconnecting…" />`)
  })
  pipe.on('reconnecting', ({ attempt } = {}) => {
    if (bootFailedShown) return
    root.render(html`<${Splash} message=${`Reconnecting to backend${attempt ? ` · attempt ${attempt}` : ''}…`} />`)
  })
  pipe.on('reconnect-failed', () => {
    if (bootFailedShown) return
    mounted = false
    root.render(html`<${Splash}
      message="Backend disconnected"
      detail="Automatic reconnect failed. Fully quit and relaunch PearBrowser; your profile and application storage are safe."
      failed=${true} />`)
  })

  setTimeout(mountApp, 250)
} catch (err) {
  console.error('Boot failed:', err)
  root.render(html`<${Splash} message="Boot failed" detail=${err.stack || err.message} failed=${true} />`)
}
