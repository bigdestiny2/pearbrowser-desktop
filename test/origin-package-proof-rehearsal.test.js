import test from 'node:test'
import assert from 'node:assert/strict'
import driveOrigin from '../backend/drive-origin.cjs'
import {
  driveFrameUrlMatches,
  makeRehearsalArtifact,
  normalizeApps,
  redactDiagnostic
} from '../scripts/capture-origin-isolation-package-proof.mjs'

const { driveHostnameForKey } = driveOrigin
const keyA = 'a'.repeat(64)
const keyB = 'b'.repeat(64)
const apps = normalizeApps([
  { url: `hyper://${keyA}/`, label: 'App A' },
  { url: `hyper://${keyB}/`, label: 'App B' }
])

test('rehearsal requires distinct canonical real-drive URLs', () => {
  assert.deepEqual(apps.map((app) => app.driveKey), [keyA, keyB])
  assert.throws(() => normalizeApps([{ url: `hyper://${keyA}/` }, { url: `hyper://${keyA}/` }]), /distinct drive keys/)
  assert.throws(() => normalizeApps([{ url: `http://${keyA}/` }, { url: `hyper://${keyB}/` }]), /root hyper/)
  assert.throws(() => normalizeApps([{ url: `hyper://${keyA}/`, driveKey: keyB }, { url: `hyper://${keyB}/` }]), /does not match/)
})

test('frame binding requires the exact drive-keyed host and route', () => {
  const hostname = driveHostnameForKey(keyA)
  assert.equal(driveFrameUrlMatches(`http://${hostname}:61001/hyper/${keyA}/`, apps[0]), true)
  assert.equal(driveFrameUrlMatches(`http://${hostname}:61001/app/${keyA}/index.html`, apps[0]), true)
  assert.equal(driveFrameUrlMatches(`http://127.0.0.1:61001/hyper/${keyA}/`, apps[0]), false)
  assert.equal(driveFrameUrlMatches(`http://${driveHostnameForKey(keyB)}:61001/hyper/${keyA}/`, apps[0]), false)
  assert.equal(driveFrameUrlMatches(`http://${hostname}:61001/hyper/${keyB}/`, apps[0]), false)
  assert.equal(driveFrameUrlMatches(`https://${hostname}:61001/hyper/${keyA}/`, apps[0]), false)
})

test('rehearsal artifact cannot be mistaken for trusted release evidence and errors redact tokens', () => {
  const artifact = makeRehearsalArtifact({ apps, packageInfo: { releaseMode: 'package-proof' }, profileId: 'fresh-profile' })
  assert.equal(artifact.kind, 'pearbrowser-origin-isolation-package-proof-rehearsal')
  assert.equal(artifact.status, 'REHEARSAL_BLOCKED')
  assert.equal(artifact.releaseGate.status, 'BLOCKED')
  assert.equal(artifact.releaseGate.trustedElectronCapture, false)
  assert.equal(artifact.releaseGate.independentAttestation, false)
  assert.match(artifact.cookieScope, /default and SameSite=Lax app cookies are outside this rehearsal/)
  const secret = 'f'.repeat(64)
  const redacted = redactDiagnostic(`ws://127.0.0.1:9876/status-smoke?session=${secret}&token=${secret}`)
  assert.equal(redacted.includes(secret), false)
  assert.match(redacted, /session=\[REDACTED\]/)
})
