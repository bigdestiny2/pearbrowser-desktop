import { useState } from 'react'
import { html } from 'htm/react'
import { AskBrowserPanel } from '/ui/shell.js'

const C = Object.freeze({
  CMD_ASK_BROWSER_CAPABILITIES: 220,
  CMD_ASK_BROWSER_START: 221,
  CMD_ASK_BROWSER_CANCEL: 222,
  EVT_ASK_BROWSER_STREAM: 111
})

class SmokeRpc extends EventTarget {
  constructor () {
    super()
    this.active = new Map()
    this.startCount = 0
  }

  async request (command, data) {
    if (command === C.CMD_ASK_BROWSER_CAPABILITIES) {
      return {
        available: true,
        local: true,
        streaming: true,
        models: [{
          alias: 'ollama:qwen3:32b',
          label: 'qwen3:32b',
          provider: 'ollama',
          family: 'qwen3',
          quantization: 'Q4_K_M',
          recommended: true,
          installed: false
        }]
      }
    }

    if (command === C.CMD_ASK_BROWSER_START) {
      this.startCount++
      const counter = document.querySelector('[data-testid="smoke-start-count"]')
      if (counter) counter.textContent = String(this.startCount)
      const streamId = data.streamId
      const timers = []
      this.active.set(streamId, timers)
      const send = (delay, event) => {
        timers.push(setTimeout(() => {
          if (!this.active.has(streamId)) return
          this.dispatchEvent(new CustomEvent(`event:${C.EVT_ASK_BROWSER_STREAM}`, {
            detail: { streamId, requestId: `native-${streamId}`, event }
          }))
          if (event.type === 'done' || event.type === 'error') this.active.delete(streamId)
        }, delay))
      }
      send(80, { type: 'model-progress', progress: 1 })
      send(160, { type: 'text', delta: 'PearBrowser keeps page context on this device. ' })
      send(260, { type: 'text', delta: 'The active page describes authenticated context capture and local QVAC inference [1].' })
      send(320, { type: 'stats', stats: { tokensPerSecond: 7.4, backendDevice: 'cpu' } })
      send(380, { type: 'done', finishReason: 'eos' })
      return {
        streamId,
        requestId: `native-${streamId}`,
        source: { kind: 'active-page', hasText: true, hasSelection: false }
      }
    }

    if (command === C.CMD_ASK_BROWSER_CANCEL) {
      const timers = this.active.get(data.streamId) || []
      for (const timer of timers) clearTimeout(timer)
      this.active.delete(data.streamId)
      queueMicrotask(() => this.dispatchEvent(new CustomEvent(`event:${C.EVT_ASK_BROWSER_STREAM}`, {
        detail: {
          streamId: data.streamId,
          event: { type: 'done', finishReason: 'cancelled' }
        }
      })))
      return { ok: true }
    }

    return {}
  }
}

const rpc = new SmokeRpc()
const smokeTabs = [{
  id: 'smoke-tab-a',
  title: 'QVAC inside PearBrowser',
  url: 'hyper://ask-browser-smoke/article'
}, {
  id: 'smoke-tab-b',
  title: 'A different local page',
  url: 'hyper://ask-browser-smoke/second-page'
}]

async function captureContext (activeTab) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  return {
    tabId: activeTab.id,
    url: activeTab.url,
    title: activeTab.title,
    text: 'Ask Browser captures bounded visible page text only after the user asks a question.',
    textBytes: 84,
    available: true,
    truncated: false,
    source: 'authenticated-page-context'
  }
}

function probeBrowserRpc () {
  const output = document.querySelector('[data-testid="smoke-rpc-probe-result"]')
  if (!output) return
  output.textContent = 'probing…'
  let received = false
  const socket = new WebSocket('ws://127.0.0.1:9876/status-smoke')
  const timer = setTimeout(() => {
    try { socket.close() } catch {}
    if (!received) output.textContent = 'blocked'
  }, 1000)
  socket.addEventListener('open', () => {
    const json = JSON.stringify({ id: 1, cmd: 70, data: {} })
    socket.send(json.length.toString(16).padStart(8, '0') + json)
  })
  socket.addEventListener('message', () => {
    received = true
    clearTimeout(timer)
    output.textContent = 'FAILED: browser RPC response received'
    try { socket.close() } catch {}
  })
  socket.addEventListener('error', () => {
    if (!received) output.textContent = 'blocked'
  })
  socket.addEventListener('close', () => {
    clearTimeout(timer)
    if (!received) output.textContent = 'blocked'
  })
}

function SmokeApp () {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(smokeTabs[0])
  return html`
    <div className="smoke-shell">
      <div className="smoke-toolbar">
        <strong>PearBrowser</strong>
        <div className="smoke-address">${activeTab.url}</div>
        <button type="button" data-testid="smoke-switch-tab"
          onClick=${() => setActiveTab(tab => tab.id === smokeTabs[0].id ? smokeTabs[1] : smokeTabs[0])}>Switch tab</button>
        <button className=${`nav ask-browser-toggle${open ? ' active' : ''}`}
          data-testid="ask-browser-toggle" onClick=${() => setOpen(value => !value)}>✦ Ask</button>
      </div>
      <div className="smoke-workspace">
        <main className="smoke-page">
          <article className="smoke-card">
            <p>LOCAL-FIRST BROWSER LAB</p>
            <h1>QVAC inside PearBrowser</h1>
            <p>This fixture renders the production Ask Browser component with the production state reducer and a deterministic local stream.</p>
            <p>Backend starts observed: <output data-testid="smoke-start-count">0</output></p>
            <p><button type="button" data-testid="smoke-rpc-probe" onClick=${probeBrowserRpc}>Probe browser RPC boundary</button>
              <output data-testid="smoke-rpc-probe-result">not run</output></p>
          </article>
        </main>
        ${open && html`<${AskBrowserPanel}
          rpc=${rpc}
          C=${C}
          activeTab=${activeTab}
          captureContext=${() => captureContext(activeTab)}
          onClose=${() => setOpen(false)}
        />`}
      </div>
    </div>
  `
}

globalThis.ReactDOM.createRoot(document.querySelector('#app')).render(html`<${SmokeApp} />`)
