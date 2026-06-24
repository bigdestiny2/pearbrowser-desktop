import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('Browse routes hyper:// iframe link messages through owned tabs', () => {
  const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')

  assert.match(shell, /window\.addEventListener\('message', onFrameMessage\)/)
  assert.match(shell, /data\.type !== 'pearbrowser:navigate'/)
  assert.ok(shell.includes(String.raw`if (!/^hyper:\/\//i.test(url)) return`))
  assert.match(shell, /iframeRefs\.current\[t\.id\]\?\.contentWindow === event\.source/)
  assert.match(shell, /go\(url, sourceTab\.id\)/)
  assert.match(shell, /go\(url, t\.id\)/)
})

test('backend hyper navigation preserves hash routes in the proxied iframe URL', () => {
  const backend = readFileSync(new URL('../backend/index.js', import.meta.url), 'utf8')

  assert.match(backend, /parsed\.search \|\| ''}\$\{parsed\.hash \|\| ''}/)
})
