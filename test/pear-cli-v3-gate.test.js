import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertSupportedPearCliVersion,
  checkPearCli,
  extractPearCliVersion,
  extractPearVersionsState
} from '../scripts/check-pear-cli-v3.mjs'

function versionsOutput ({
  reportedPearRuntimeVersion = '2.6.5',
  checkout = {
    key: 'pzcjqmpoo6szkoc4bpkw65ib9ctnrq7b6mneeinbhbheihaq6p6o',
    length: 3243,
    fork: 0
  }
} = {}) {
  return [
    JSON.stringify({
      cmd: 'versions',
      tag: 'platform',
      data: { checkout }
    }),
    JSON.stringify({
      cmd: 'versions',
      tag: 'runtimes',
      data: { pear: reportedPearRuntimeVersion, bare: '1.24.3 (sidecar) / 1.29.4' }
    }),
    JSON.stringify({
      cmd: 'versions',
      tag: 'modules',
      data: { 'pear-runtime-updater': '^3.1.0' }
    })
  ].join('\n')
}

test('Pear CLI gate reads the platform version from current CLI output', () => {
  const output = [
    'pear://0.3243.pzcjqmpoo6szkoc4bpkw65ib9ctnrq7b6mneeinbhbheihaq6p6o / v3.3.0',
    'Key=pzcjqmpoo6szkoc4bpkw65ib9ctnrq7b6mneeinbhbheihaq6p6o',
    'SemVer=3.3.0',
    'Fork=0',
    'Length=3243'
  ].join('\n')
  assert.equal(extractPearCliVersion(output), '3.3.0')
})

test('Pear CLI gate accepts only the reviewed stable platform release', () => {
  assert.equal(assertSupportedPearCliVersion('3.3.0'), '3.3.0')
  assert.throws(() => assertSupportedPearCliVersion('2.6.5'), /too old/)
  assert.throws(() => assertSupportedPearCliVersion('3.4.0-rc.0'), /prerelease/)
  assert.throws(() => assertSupportedPearCliVersion('3.3.1'), /has not been reviewed/)
  assert.throws(() => assertSupportedPearCliVersion('3.4.0'), /has not been reviewed/)
  assert.throws(() => assertSupportedPearCliVersion('4.0.0'), /outside the reviewed v3/)
  assert.throws(() => extractPearCliVersion('not a version'), /semantic version/)
})

test('Pear CLI gate validates tagged platform state without conflating internal runtime metadata', () => {
  const state = extractPearVersionsState(versionsOutput())
  assert.deepEqual(state.checkout, {
    key: 'pzcjqmpoo6szkoc4bpkw65ib9ctnrq7b6mneeinbhbheihaq6p6o',
    length: 3243,
    fork: 0
  })
  assert.equal(state.reportedPearRuntimeVersion, '2.6.5')
  assert.equal(state.bareVersion, '1.24.3 (sidecar) / 1.29.4')
})

test('Pear CLI gate checks the v3.3.0 platform identity and versions state', () => {
  const calls = []
  const result = checkPearCli({
    command: 'pear-test',
    spawn: (command, args) => {
      calls.push([command, ...args])
      if (args[0] === '-v') {
        return { status: 0, stdout: 'pear://0.3243.aaaa / v3.3.0\n', stderr: '' }
      }
      return { status: 0, stdout: versionsOutput(), stderr: '' }
    }
  })

  assert.deepEqual(calls, [
    ['pear-test', '-v'],
    ['pear-test', 'versions', '--json']
  ])
  assert.equal(result.version, '3.3.0')
  assert.equal(result.versions.reportedPearRuntimeVersion, '2.6.5')
  assert.equal(result.versions.checkout.length, 3243)
})

test('Pear CLI gate rejects malformed or incomplete versions state', () => {
  assert.throws(() => extractPearVersionsState(''), /output was empty/)
  assert.throws(() => extractPearVersionsState('{not-json}'), /not valid JSON/)
  assert.throws(() => extractPearVersionsState(JSON.stringify({
    cmd: 'versions',
    tag: 'runtimes',
    data: { pear: '2.6.5', bare: '1.29.4' }
  })), /did not contain a tagged platform record/)
  assert.throws(() => extractPearVersionsState(JSON.stringify({
    cmd: 'versions',
    tag: 'platform',
    data: { checkout: { key: 'abc', length: 1, fork: 0 } }
  })), /did not contain a tagged runtimes record/)
  assert.throws(() => extractPearVersionsState([
    versionsOutput(),
    JSON.stringify({ cmd: 'versions', tag: 'platform', data: { checkout: { key: 'abc', length: 1, fork: 0 } } })
  ].join('\n')), /multiple tagged platform records/)
  assert.throws(() => extractPearVersionsState([
    versionsOutput(),
    JSON.stringify({ cmd: 'versions', tag: 'runtimes', data: { pear: '2.6.5', bare: '1.29.4' } })
  ].join('\n')), /multiple tagged runtimes records/)
  assert.throws(() => extractPearVersionsState(versionsOutput({
    checkout: { key: 'abc', length: 0, fork: 0 }
  })), /positive length/)
  assert.throws(() => extractPearVersionsState(versionsOutput({
    checkout: { key: 'abc', length: 1, fork: -1 }
  })), /valid fork/)
})
