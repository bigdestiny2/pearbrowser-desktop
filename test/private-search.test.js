import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PRIVATE_SEARCH_PROVIDER,
  normalizePrivateSearchQuery,
  buildPrivateSearchUrl
} from '../ui/lib/private-search.js'

test('private search uses the declared DuckDuckGo HTTPS endpoint', () => {
  assert.equal(PRIVATE_SEARCH_PROVIDER.name, 'DuckDuckGo')
  assert.equal(PRIVATE_SEARCH_PROVIDER.origin, 'https://duckduckgo.com/')
  const url = new URL(buildPrivateSearchUrl('tracker blocking browser'))
  assert.equal(url.origin, 'https://duckduckgo.com')
  assert.equal(url.searchParams.get('q'), 'tracker blocking browser')
  assert.deepEqual([...url.searchParams.keys()], ['q'])
})

test('private search normalizes whitespace, bounds input, and rejects blanks', () => {
  assert.equal(normalizePrivateSearchQuery('  private\n\tsearch  '), 'private search')
  assert.equal(normalizePrivateSearchQuery('x'.repeat(3000)).length, 2048)
  assert.equal(buildPrivateSearchUrl('   '), null)
})

test('the browser-owned home is first and contains an honest provider disclosure', () => {
  const shell = readFileSync(new URL('../ui/shell.js', import.meta.url), 'utf8')
  assert.match(shell, /\{ url: '', title: 'PearBrowser Home' \},\n\s*\{ url: DEFAULT_URL, title: 'PearBrowser' \}/)
  assert.match(shell, /data-testid="private-search-form"/)
  assert.match(shell, /data-testid="private-search-input"[\s\S]*autoFocus/)
  assert.match(shell, /rememberVisit: false/)
  assert.match(shell, /receives your query and network address/)
  assert.match(shell, /Private search is not anonymity/)
})
