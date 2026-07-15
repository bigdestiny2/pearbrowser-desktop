import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')

test('renderer ships the Ask Browser panel and browser-owned stream contract', () => {
  const shell = read('ui/shell.js')
  const styles = read('styles.css')
  assert.match(shell, /function AskBrowserPanel/)
  assert.match(shell, /data-testid="ask-browser-toggle"/)
  assert.match(shell, /data-testid="ask-browser-panel"/)
  assert.match(shell, /CMD_ASK_BROWSER_START/)
  assert.match(shell, /EVT_ASK_BROWSER_STREAM/)
  assert.match(styles, /\.ask-browser-panel/)
  assert.match(styles, /\.browse-workspace/)
})

test('desktop entry discovers only host-approved Ollama aliases before creating QVAC', () => {
  const entry = read('index.js')
  const catalog = read('backend/ai/qvac-ollama-catalog.mjs')
  const pkg = JSON.parse(read('package.json'))
  assert.match(entry, /discoverOllamaQwenModels/)
  assert.match(entry, /modelsRoot: env\.OLLAMA_MODELS/)
  assert.match(entry, /createLazyQvacService\(\{\s*homeDir: storagePath,\s*models: qvacModels,\s*idleUnloadMs: qvacIdleUnloadMs\s*\}\)/)
  assert.match(entry, /PEARBROWSER_QVAC_IDLE_UNLOAD_MS/)
  assert.match(catalog, /alias = `ollama:\$\{modelName\}`/)
  assert.match(catalog, /modelSrc: modelPath/)
  assert.ok(pkg.pear.stage.entrypoints.includes('/backend/index.js'))
  assert.ok(pkg.pear.stage.entrypoints.includes('/backend/ai/qvac-runtime.mjs'))
})

test('renderer ships the QVAC Local AI widget on the blank-tab surface', () => {
  const shell = read('ui/shell.js')
  const styles = read('styles.css')
  const widgetLib = read('ui/lib/qvac-widget.js')
  assert.match(shell, /function QvacWidget/)
  assert.match(shell, /data-testid="qvac-widget"/)
  assert.match(shell, /<\$\{QvacWidget\} rpc=\$\{rpc\} C=\$\{C\} \/>/)
  assert.match(shell, /from '\.\/lib\/qvac-widget\.js'/)
  assert.match(styles, /\.qvac-widget/)
  // The widget never captures page context: its request builder pins page: {}.
  assert.match(widgetLib, /page: \{\}/)
})

test('Ask Browser context is authenticated separately from page API tokens', () => {
  const proxy = read('backend/hyper-proxy.js')
  const contextBridge = read('backend/page-context-bridge.cjs')
  assert.match(proxy, /_pageContextTokens = new Map/)
  assert.match(proxy, /pageContextMeta\(contextToken\)/)
  assert.match(contextBridge, /event\.source !== window\.parent/)
  assert.match(contextBridge, /event\.ports\.length !== 1/)
  assert.match(contextBridge, /pear-page-context-token/)
})
