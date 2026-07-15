import bareProcess from 'bare-process'
import fs from 'bare-fs'
import http from 'bare-http1'
import os from 'bare-os'
import path from 'bare-path'
import b4a from 'b4a'
import httpBridgeModule from '../backend/http-bridge.js'
import pearBridgeModule from '../backend/pear-bridge.js'
import { createLazyQvacService } from '../backend/ai/qvac-host.mjs'

if (!globalThis.process) globalThis.process = bareProcess

const { HttpBridge } = httpBridgeModule
const { PEAR_SYNC_SHIM } = pearBridgeModule
const driveKeyHex = '51'.repeat(32)
const token = 'qvac-browser-smoke'
const localModelPath = process.env.QVAC_SMOKE_MODEL_PATH
const modelAlias = localModelPath ? 'local-model' : 'pear-small-chat'
const device = process.env.QVAC_SMOKE_DEVICE || 'cpu'
const models = localModelPath
  ? {
      [modelAlias]: {
        modelSrc: localModelPath,
        modelType: 'llamacpp-completion',
        modelConfig: {
          device,
          gpu_layers: device === 'gpu' ? 99 : 0,
          ctx_size: 1024
        }
      }
    }
  : undefined

const service = createLazyQvacService({
  homeDir: process.env.QVAC_SMOKE_HOME || path.join(os.tmpdir(), 'pearbrowser-qvac-browser-smoke'),
  models,
  maxOutputTokens: 32
})
const manifest = b4a.from(JSON.stringify({
  name: 'qvac-browser-smoke',
  permissions: ['pear.ai.infer']
}))
const bridge = new HttpBridge(
  { _syncGroups: new Map() },
  null,
  async () => ({ get: async () => manifest }),
  {
    aiService: service,
    validateToken: candidate => candidate === token ? driveKeyHex : null
  }
)

const demoPath = path.join(import.meta.dirname, '..', 'examples', 'qvac-native-demo', 'index.html')
const demo = fs.readFileSync(demoPath, 'utf8')
  .replace('<head>', `<head>\n  <meta name="pear-api-token" content="${token}">`)
  .replace('<script>', `${PEAR_SYNC_SHIM}\n  <script>`)
  .replace('maxTokens: 96', 'maxTokens: 32')

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  if (await bridge.handle(req, res, url)) return
  if (req.method === 'GET' && url.pathname === '/') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(demo)
    return
  }
  res.statusCode = 404
  res.end('Not found')
})

let shuttingDown = false
async function shutdown (code) {
  if (shuttingDown) return
  shuttingDown = true
  await new Promise(resolve => server.close(resolve))
  try { await service.close() } catch (err) { console.error('[qvac-browser-smoke] cleanup failed:', err?.message || err) }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
server.on('error', err => {
  console.error('[qvac-browser-smoke] server failed:', err?.stack || err)
  shutdown(1)
})
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port
  console.log(`[qvac-browser-smoke] READY http://127.0.0.1:${port}/`)
  console.log(`[qvac-browser-smoke] model=${modelAlias} device=${device}`)
  if (localModelPath) console.log(`[qvac-browser-smoke] model-path=${localModelPath}`)
})
