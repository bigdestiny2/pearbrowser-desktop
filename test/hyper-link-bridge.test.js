import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('Browse routes hyper:// iframe link messages through owned tabs', () => {
  const browse = readFileSync(new URL('../ui/components/browse.js', import.meta.url), 'utf8')

  assert.match(browse, /window\.addEventListener\('message', onFrameMessage\)/)
  assert.match(browse, /data\.type !== 'pearbrowser:navigate'/)
  assert.ok(browse.includes(String.raw`if (!/^hyper:\/\//i.test(url)) return`))
  assert.match(browse, /iframeRefs\.current\[t\.id\]\?\.contentWindow === event\.source/)
  assert.match(browse, /go\(url, sourceTab\.id\)/)
  assert.match(browse, /go\(url, t\.id\)/)
})

test('backend hyper navigation preserves hash routes in the proxied iframe URL', () => {
  const backend = readFileSync(new URL('../backend/index.js', import.meta.url), 'utf8')

  assert.match(backend, /parsed\.search \|\| ''}\$\{parsed\.hash \|\| ''}/)
})
