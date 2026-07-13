import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const allowedRoots = [
  path.join(root, 'ui'),
  path.join(root, 'qvac-smoke'),
  path.join(root, 'node_modules', 'react', 'umd'),
  path.join(root, 'node_modules', 'react-dom', 'umd'),
  path.join(root, 'node_modules', 'htm', 'dist')
]

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8'
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  const relative = url.pathname === '/' ? 'qvac-smoke/ask-browser-ui.html' : url.pathname.slice(1)
  const target = path.resolve(root, relative)
  const allowed = target === path.join(root, 'styles.css') || allowedRoots.some(base => target === base || target.startsWith(`${base}${path.sep}`))
  if (!allowed) {
    res.writeHead(404).end('Not found')
    return
  }

  fs.readFile(target, (err, bytes) => {
    if (err) {
      res.writeHead(404).end('Not found')
      return
    }
    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    })
    res.end(bytes)
  })
})

server.listen(0, '127.0.0.1', () => {
  console.log(`ASK_BROWSER_UI_READY http://127.0.0.1:${server.address().port}/`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
