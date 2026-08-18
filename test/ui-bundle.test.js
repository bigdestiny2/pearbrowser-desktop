// The shell is React over bare specifiers ('react-dom/client', 'htm/react').
// The embedded-Electron host loads index.html over file://, where bare
// specifiers can never resolve — the window rendered blank from the Pear v3
// migration until v0.9.x because nothing asserted the page loads a resolvable
// entry. index.html must therefore reference the esbuild bundle
// (npm run build:ui), and the committed bundle must stay self-contained.
import test from 'node:test'
import assert from 'node:assert'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE = join(ROOT, 'ui', 'dist', 'main.bundle.js')

test('index.html loads the bundled UI entry, not bare-specifier sources', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  assert.match(html, /src="\.\/ui\/dist\/main\.bundle\.js"/,
    'index.html must reference ./ui/dist/main.bundle.js (npm run build:ui)')
  assert.doesNotMatch(html, /src="\.\/ui\/main\.js"/,
    'index.html must not load ui/main.js directly — bare imports cannot resolve over file://')
})

test('the committed UI bundle exists and is self-contained', () => {
  assert.ok(existsSync(BUNDLE), 'ui/dist/main.bundle.js missing — run npm run build:ui')
  const source = readFileSync(BUNDLE, 'utf8')
  assert.ok(source.length > 10_000, 'bundle is implausibly small')
  assert.doesNotMatch(source, /from\s*["'](react|react-dom|htm)["'/]/,
    'bundle still imports bare specifiers — esbuild bundling failed')
})
