'use strict'

// The proxy has already authenticated this local URL against its live,
// drive-bound listener. Keep the public tab identity tied to that exact key.
function publicHyperUrlForBoundLocalUrl (localUrl, keyHex) {
  if (typeof localUrl !== 'string' || !/^[0-9a-f]{64}$/.test(keyHex || '')) return ''
  try {
    const parsed = new URL(localUrl)
    if (parsed.protocol !== 'http:' || parsed.username || parsed.password) return ''
    const prefix = new RegExp(`^/(?:hyper|app)/${keyHex}(?=/|$)`, 'i')
    if (!prefix.test(parsed.pathname)) return ''
    const path = parsed.pathname.replace(prefix, '') || '/'
    return `hyper://${keyHex}${path}${parsed.search}${parsed.hash}`
  } catch {
    return ''
  }
}

module.exports = { publicHyperUrlForBoundLocalUrl }
