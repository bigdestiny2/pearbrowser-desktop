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

  // Only steal the splash screen for pre-mount failures. After the
  // App mounts, the status pill at the bottom of the real UI handles
  // disconnect/reconnect state without yanking the user to a splash.
  let mounted = false
  pipe.on('open', () => {
    if (!mounted) root.render(html`<${Splash} message="Handshake OK · waiting for DHT…" />`)
  })
  pipe.on('error', () => {
    if (!mounted) root.render(html`<${Splash} message="Backend unreachable" detail="ws://127.0.0.1:9876 — is the main process running?" failed=${true} />`)
  })
  pipe.on('close', () => {
    if (!mounted) root.render(html`<${Splash} message="Backend disconnected" detail="The WebSocket closed unexpectedly. Restart the app." failed=${true} />`)
  })

  setTimeout(() => {
    mounted = true
    root.render(html`<${App} rpc=${rpc} C=${C} storagePath=${storagePath} />`)
  }, 250)
} catch (err) {
  console.error('Boot failed:', err)
  root.render(html`<${Splash} message="Boot failed" detail=${err.stack || err.message} failed=${true} />`)
}
