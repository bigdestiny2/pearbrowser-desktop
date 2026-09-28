import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { fetchLocalUrl } from '../scripts/release-rpc-story-smoke.mjs'
import driveOrigin from '../backend/drive-origin.cjs'

const { driveHostnameForKey } = driveOrigin
const driveA = 'a'.repeat(64)
const driveB = 'b'.repeat(64)

async function withLocalServer (fn) {
  const requests = []
  const server = http.createServer((req, res) => {
    requests.push({ host: req.headers.host, path: req.url })
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('local drive page')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    await fn(server.address().port, requests)
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))
  }
}

test('release story fetch sends the exact keyed Host to a local TCP endpoint', async () => {
  await withLocalServer(async (port, requests) => {
    const host = driveHostnameForKey(driveA)
    const result = await fetchLocalUrl(`http://${host}:${port}/hyper/${driveA}/index.html?view=1`, 1000, driveA)
    assert.equal(result.statusCode, 200)
    assert.equal(result.body, 'local drive page')
    assert.deepEqual(requests, [{ host: `${host}:${port}`, path: `/hyper/${driveA}/index.html?view=1` }])
  })
})

test('release story fetch rejects sibling drives, remote hosts, and unrelated routes without sending a request', async () => {
  await withLocalServer(async (port, requests) => {
    const hostA = driveHostnameForKey(driveA)
    const hostB = driveHostnameForKey(driveB)
    const invalidUrls = [
      `http://${hostB}:${port}/hyper/${driveA}/`,
      `http://${hostA}:${port}/hyper/${driveB}/`,
      `http://example.com:${port}/hyper/${driveA}/`,
      `http://127.0.0.2:${port}/hyper/${driveA}/`,
      `http://localhost:${port}/hyper/${driveB}/`,
      `http://${hostA}:${port}/clearnet/${driveA}/`,
      `https://${hostA}:${port}/hyper/${driveA}/`,
      `http://user:password@${hostA}:${port}/hyper/${driveA}/`,
      `http://${hostA}:${port}/hyper/${driveA}/#fragment`
    ]
    for (const url of invalidUrls) {
      await assert.rejects(fetchLocalUrl(url, 1000, driveA), /refusing to fetch non-local proxy URL/)
    }
    assert.deepEqual(requests, [])
  })
})

test('release story fetch retains legacy loopback URLs with the expected drive route', async () => {
  await withLocalServer(async (port, requests) => {
    const result = await fetchLocalUrl(`http://localhost:${port}/app/${driveA}/`, 1000, driveA)
    assert.equal(result.statusCode, 200)
    assert.deepEqual(requests, [{ host: `localhost:${port}`, path: `/app/${driveA}/` }])
  })
})
