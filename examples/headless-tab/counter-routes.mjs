/**
 * The demo htmx app's route handlers — the "core logic" a Pear worker exposes.
 * Shared between the Stage-1 in-process harness and the Stage-2 real worker so
 * the app code is identical regardless of how it's hosted.
 *
 * htmx convention: GET / returns the whole page; the other routes return small
 * HTML *fragments* that htmx swaps into a target. No JSON, no client framework.
 */
const PAGE = `<!-- served by a Pear worker, streamed over a pipe -->
<div id="root" style="font:16px/1.5 system-ui;max-width:560px;margin:40px auto;color:#e6e6e6">
  <h2 style="margin:0 0 4px">🍐 Headless htmx app</h2>
  <p style="opacity:.7;margin:.2em 0 1.2em">
    This UI is served by a Pear <b>worker</b> with no window and no HTTP server.
    <code>XMLHttpRequest</code> is hooked to a <b>streamx</b> — htmx thinks it's
    talking to a server.
  </p>
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
    <button hx-post="/inc" hx-target="#count" hx-swap="innerHTML"
      style="padding:8px 14px;border-radius:8px;border:0;background:#16a34a;color:#fff;font-weight:600;cursor:pointer">Count +1</button>
    <button hx-post="/reset" hx-target="#count" hx-swap="innerHTML"
      style="padding:8px 14px;border-radius:8px;border:1px solid #444;background:transparent;color:#ccc;cursor:pointer">reset</button>
    <strong style="margin-left:auto">Count: <span id="count">0</span></strong>
  </div>
  <div id="who" hx-get="/whoami" hx-trigger="load" hx-swap="innerHTML"
    style="font:13px ui-monospace,monospace;opacity:.7"></div>
</div>`

export function registerRoutes (router, ctx = {}) {
  const state = { count: 0, started: ctx.startedAt || 0, label: ctx.label || 'worker' }

  router.get('/', async (req, res) => {
    res.body = PAGE
    res.headers = { 'Content-Type': 'text/html' }
  })

  router.post('/inc', async (req, res) => {
    state.count++
    res.body = String(state.count) // fragment swapped into #count
    res.headers = { 'Content-Type': 'text/html' }
  })

  router.post('/reset', async (req, res) => {
    state.count = 0
    res.body = '0'
    res.headers = { 'Content-Type': 'text/html' }
  })

  router.get('/whoami', async (req, res) => {
    res.body = `served headless by <b>${state.label}</b> · requests over a stream · count=${state.count}`
    res.headers = { 'Content-Type': 'text/html' }
  })

  return state
}
