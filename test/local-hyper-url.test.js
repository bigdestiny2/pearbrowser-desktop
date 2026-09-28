import test from 'node:test'
import assert from 'node:assert/strict'
import localHyperUrl from '../backend/local-hyper-url.cjs'

const { publicHyperUrlForBoundLocalUrl } = localHyperUrl
const keyA = 'a'.repeat(64)
const keyB = 'b'.repeat(64)

test('bound drive and installed-app URLs retain a keyed public Hyper identity', () => {
  for (const route of ['hyper', 'app']) {
    assert.equal(
      publicHyperUrlForBoundLocalUrl(`http://d-any.localhost:14321/${route}/${keyA}/posts/1?q=2#latest`, keyA),
      `hyper://${keyA}/posts/1?q=2#latest`
    )
    assert.equal(
      publicHyperUrlForBoundLocalUrl(`http://d-any.localhost:14321/${route}/${keyA}`, keyA),
      `hyper://${keyA}/`
    )
  }
})

test('unbound, malformed, or mismatched local paths have no Hyper identity', () => {
  const base = 'http://d-any.localhost:14321'
  for (const url of [
    `${base}/hyper/${keyB}/`,
    `${base}/hyper/${keyA}suffix/`,
    `${base}/clearnet/${keyA}/`,
    `http://u:p@d-any.localhost:14321/hyper/${keyA}/`,
    `file:///hyper/${keyA}/`,
    'not a URL'
  ]) {
    assert.equal(publicHyperUrlForBoundLocalUrl(url, keyA), '')
  }
  assert.equal(publicHyperUrlForBoundLocalUrl(`${base}/hyper/${keyA}/`, 'bad'), '')
})
