/**
 * Stage 1 proof: an htmx app served by a worker over a stream, rendered HEADLESS
 * in a browser tab. No HTTP app-server — the tab's XMLHttpRequest is hooked to a
 * WebSocket that bridges to a pear-request router (the "worker"). This is the
 * exact mechanism the pearbrowser "run in tab" path will use; here the worker is
 * in-process, in Stage 2 it's a real `pear-run` headless worker.
 *
 *   node run-demo.mjs            # assert headless render + htmx-over-stream
 *   node run-demo.mjs --keep     # leave the server up to open in a real browser
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import * as esbuild from 'esbuild'
import { PearRequestRouter } from 'pear-request/server'
import { registerRoutes } from './counter-routes.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const keep = process.argv.includes('--keep')

// 1. bundle the browser client (createPearRequest + Buffer) -> IIFE
const bundle = (await esbuild.build({
  entryPoints: [path.join(dir, 'client-entry.mjs')],
  bundle: true, format: 'iife', write: false, platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' }
})).outputFiles[0].text
console.log('client bundle: ' + bundle.length + ' bytes')

// 2. static http server (wrapper page + htmx + the client bundle)
const types = { '.html': 'text/html', '.js': 'text/javascript' }
const files = {
  '/': fs.readFileSync(path.join(dir, 'wrapper.html')),
  '/htmx.min.js': fs.readFileSync(path.join(dir, 'htmx.min.js')),
  '/pear-request-client.bundle.js': Buffer.from(bundle)
}
const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0]
  const body = files[p === '/' ? '/' : p]
  if (!body) { res.writeHead(404); return res.end('nf') }
  res.writeHead(200, { 'content-type': types[path.extname(p) || '.html'] || 'text/html' })
  res.end(body)
})

// 3. WS <-> worker-pipe bridge. Each tab connection gets its own headless worker.
const wss = new WebSocketServer({ server, path: '/__pipe' })
let workers = 0
wss.on('connection', (ws) => {
  workers++
  const pipe = { write: (buf) => { ws.send(buf); return true }, once: (ev, cb) => { if (ev === 'drain') queueMicrotask(cb) } }
  const router = new PearRequestRouter(pipe)
  registerRoutes(router, { label: 'in-proc worker #' + workers })
  ws.on('message', (data) => { try { router.processMessage(data) } catch (e) { console.error('router:', e.message) } })
})

await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/`
console.log('serving ' + url)

if (keep) { console.log('--keep: open the URL above in a browser. Ctrl-C to stop.'); }
else {
  const { chromium } = await import('playwright')
  let failed = false
  const check = (c, m) => { if (!c) { failed = true; console.log('  ✗ ' + m) } else console.log('  ✓ ' + m) }
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

  console.log('\n# Stage 1 — htmx app served by a worker-over-stream, rendered headless')
  await page.goto(url)
  await page.waitForFunction(() => window.__PEAR_TAB_READY === true, null, { timeout: 10000 })
  // the worker's GET / fragment must have rendered into the tab
  await page.waitForFunction(() => document.body.innerText.includes('Headless htmx app'), null, { timeout: 10000 })
  check(true, 'worker served the app UI into the tab (GET / over the stream)')

  const count0 = await page.textContent('#count')
  check(count0.trim() === '0', 'initial count is 0 (from the worker)')

  // click the htmx button 3x — each is an XHR-over-stream POST /inc
  for (let i = 1; i <= 3; i++) {
    await page.click('button:has-text("Count +1")')
    await page.waitForFunction((n) => document.querySelector('#count')?.textContent?.trim() === String(n), i, { timeout: 5000 })
  }
  check((await page.textContent('#count')).trim() === '3', 'htmx POST /inc over the stream incremented count to 3')

  await page.click('button:has-text("reset")')
  await page.waitForFunction(() => document.querySelector('#count')?.textContent?.trim() === '0', null, { timeout: 5000 })
  check(true, 'htmx POST /reset over the stream reset count to 0')

  const who = (await page.textContent('#who')) || ''
  check(who.includes('served headless'), 'lazy hx-get /whoami fragment loaded over the stream')

  if (errs.length) { failed = true; console.log('  page errors: ' + errs.join(' | ')) }
  const shot = path.join(dir, 'headless-tab.png')
  await page.screenshot({ path: shot })
  console.log('  screenshot: ' + shot)

  await browser.close(); server.close()
  console.log('\n' + (failed ? 'STAGE 1 FAILED' : 'STAGE 1 PASSED — htmx app runs headless in a tab, UI streamed from a worker over XHR-as-streamx'))
  process.exit(failed ? 1 : 0)
}
