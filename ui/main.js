import { createRoot } from 'react-dom/client'
import { html } from 'htm/react'
import { App } from './shell.js'
import { startBackend } from './boot.js'
import { Logo, Wordmark } from './logo.js'

const container = document.getElementById('app')
const root = createRoot(container)

function Splash ({ message, detail, failed }) {
  return html`
    <div class="splash">
      <div class="splash-inner">
        <${Logo} size=${96} animated=${!failed} />
        <${Wordmark} />
        <div class="splash-tagline">P2P browser, app store, and publishing — no servers required.</div>
        <div class=${'splash-status' + (failed ? ' failed' : '')}>
          <span class="splash-spinner"></span>
          <span>${message}</span>
        </div>
        ${detail && html`<pre class="splash-detail">${detail}</pre>`}
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

  // Only steal the splash screen for pre-mount failures. After the
  // App mounts, the status pill at the bottom of the real UI handles
  // disconnect/reconnect state without yanking the user to a splash.
  let mounted = false
  pipe.on('open', () => {
    if (!mounted && !bootFailedShown) root.render(html`<${Splash} message="Handshake OK · waiting for DHT…" />`)
  })
  pipe.on('error', () => {
    if (!mounted && !bootFailedShown) root.render(html`<${Splash} message="Backend unreachable" detail="ws://127.0.0.1:9876 — is the main process running?" failed=${true} />`)
  })
  pipe.on('close', () => {
    if (!mounted && !bootFailedShown) root.render(html`<${Splash} message="Backend disconnected" detail="The WebSocket closed unexpectedly. Restart the app." failed=${true} />`)
  })

  setTimeout(() => {
    if (bootFailedShown) return  // never mount the app on a dead backend
    mounted = true
    root.render(html`<${App} rpc=${rpc} C=${C} storagePath=${storagePath} />`)
  }, 250)
} catch (err) {
  console.error('Boot failed:', err)
  root.render(html`<${Splash} message="Boot failed" detail=${err.stack || err.message} failed=${true} />`)
}
