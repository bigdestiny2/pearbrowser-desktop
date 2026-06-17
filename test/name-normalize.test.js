// Tests for backend/name-normalize.cjs (naming Phase N0).
import test from 'node:test'
import assert from 'node:assert/strict'
import mod from '../backend/name-normalize.cjs'
const { normalize, skeleton } = mod

test('normalize: NFKC + lowercase, and is idempotent', () => {
  // fullwidth + uppercase → ascii lowercase
  assert.equal(normalize('ＰａＹＰａＬ'), 'paypal')
  const once = normalize('Ｋéet')
  assert.equal(normalize(once), once)        // idempotent
})

test('normalize: strips invisible / zero-width characters', () => {
  assert.equal(normalize('pay​pal'), 'paypal')   // zero-width space
  assert.equal(normalize('pay­pal'), 'paypal')   // soft hyphen
  assert.equal(normalize('keet﻿'), 'keet')       // BOM
})

test('normalize: non-string → empty', () => {
  assert.equal(normalize(null), '')
  assert.equal(normalize(undefined), '')
  assert.equal(normalize(42), '')
})

test('skeleton: Cyrillic homograph collides with the Latin original', () => {
  // 'раypal' uses Cyrillic р (U+0440) + а (U+0430), then Latin 'ypal'.
  const cyrillic = 'раypal'
  assert.equal(skeleton(cyrillic), 'paypal')
  assert.equal(skeleton('paypal'), 'paypal')
  assert.equal(skeleton(cyrillic), skeleton('paypal'))  // the squat is caught
})

test('skeleton: distinct names do not collide', () => {
  assert.equal(skeleton('keet'), 'keet')
  assert.notEqual(skeleton('keet'), skeleton('pearpass'))
})
