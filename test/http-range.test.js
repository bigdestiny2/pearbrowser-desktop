import test from 'node:test'
import assert from 'node:assert/strict'
import rangeMod from '../backend/http-range.cjs'

const { parseByteRangeHeader } = rangeMod

test('parseByteRangeHeader parses and clamps explicit byte ranges', () => {
  assert.deepEqual(parseByteRangeHeader('bytes=2-5', 10), {
    unsatisfiable: false,
    start: 2,
    end: 5,
    total: 10,
    length: 4
  })
  assert.deepEqual(parseByteRangeHeader('bytes=2-99', 10), {
    unsatisfiable: false,
    start: 2,
    end: 9,
    total: 10,
    length: 8
  })
})

test('parseByteRangeHeader supports open-ended and suffix ranges', () => {
  assert.deepEqual(parseByteRangeHeader('bytes=7-', 10), {
    unsatisfiable: false,
    start: 7,
    end: 9,
    total: 10,
    length: 3
  })
  assert.deepEqual(parseByteRangeHeader('bytes=-4', 10), {
    unsatisfiable: false,
    start: 6,
    end: 9,
    total: 10,
    length: 4
  })
  assert.deepEqual(parseByteRangeHeader('bytes=-99', 10), {
    unsatisfiable: false,
    start: 0,
    end: 9,
    total: 10,
    length: 10
  })
})

test('parseByteRangeHeader flags unsatisfiable ranges and ignores unsupported shapes', () => {
  assert.deepEqual(parseByteRangeHeader('bytes=10-12', 10), {
    unsatisfiable: true,
    total: 10
  })
  assert.deepEqual(parseByteRangeHeader('bytes=8-3', 10), {
    unsatisfiable: true,
    total: 10
  })
  assert.deepEqual(parseByteRangeHeader('bytes=0-0', 0), {
    unsatisfiable: true,
    total: 0
  })
  assert.equal(parseByteRangeHeader('bytes=1-2,4-5', 10), null)
  assert.equal(parseByteRangeHeader('items=1-2', 10), null)
  assert.equal(parseByteRangeHeader('bytes=-0', 10), null)
  assert.equal(parseByteRangeHeader('bytes=--', 10), null)
})
