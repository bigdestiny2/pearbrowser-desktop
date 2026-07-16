'use strict'

/**
 * Browser-owned clearnet (http/https) proxy for PearBrowser.
 *
 * Phases 4–5 of docs/BROWSER_PARITY_PLAN.md without forking pear-electron:
 * every clearnet request that flows through this proxy is evaluated by the
 * same ContentShield engine as hyper://, HTML is rewritten so subresources
 * stay on the proxy, and privacy ladder hooks (tracking strip, farbling,
 * referrer meta) ride the inject path.
 *
 * Direct-mode clearnet (iframe/webview load of the real https URL) is a
 * separate navigation path that skips this module when settings say so;
 * shields then only apply after a future session.webRequest bridge exists.
 */

const { URL } = require('url')
const {
  sanitizeClearnetUrl,
  fingerprintFarblingScript,
  referrerPolicyMeta,
  normalizePrivacySettings
} = require('./privacy-policy.cjs')
const { escapeStyleText } = require('./html-raw-text.cjs')

const MAX_BODY_BYTES = 8 * 1024 * 1024 // 8 MiB response cap for proxy mode
const FETCH_TIMEOUT_MS = 20000
const USER_AGENT = 'PearBrowser/0.5 (clearnet-proxy; P2P browser)'

/**
 * Encode a target URL into a path segment under /clearnet/.
 * Uses base64url so path-safe.
 */
function encodeClearnetTarget (absoluteUrl) {
  const text = String(absoluteUrl || '')
  return Buffer.from(text, 'utf8').toString('base64url')
}

function decodeClearnetTarget (encoded) {
  try {
    const text = Buffer.from(String(encoded || ''), 'base64url').toString('utf8')
    const u = new URL(text)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Build the loopback local URL that the renderer iframe loads.
 * @param {number|string} port
 * @param {string} targetUrl absolute http(s) URL
 */
function localClearnetUrl (port, targetUrl) {
  const enc = encodeClearnetTarget(targetUrl)
  return `http://127.0.0.1:${port}/clearnet/${enc}`
}

/**
 * Parse /clearnet/<encoded> or /clearnet/<encoded>/extra into target URL.
 */
function parseClearnetPath (pathname, search = '') {
  if (typeof pathname !== 'string' || !pathname.startsWith('/clearnet/')) return null
  const rest = pathname.slice('/clearnet/'.length)
  if (!rest) return null
  // encoded may contain only base64url chars; stop at first slash that is
  // not part of encoding (base64url has no '/').
  const slash = rest.indexOf('/')
  const encoded = slash === -1 ? rest : rest.slice(0, slash)
  const target = decodeClearnetTarget(encoded)
  if (!target) return null
  // Extra path after the blob is not used — full URL is in the blob.
  // search on the proxy request is ignored; target carries its own query.
  return { target, encoded, search }
}

/**
 * Fetch a clearnet URL using bare-https / bare-http1 (Bare runtime) or
 * Node https/http as fallback in unit tests.
 */
function fetchClearnet (absoluteUrl, opts = {}) {
  const timeoutMs = opts.timeoutMs || FETCH_TIMEOUT_MS
  const method = (opts.method || 'GET').toUpperCase()
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: opts.accept || '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    ...(opts.headers || {})
  }
  // Strip hop-by-hop
  delete headers['host']
  delete headers['connection']

  return new Promise((resolve, reject) => {
    let u
    try { u = new URL(absoluteUrl) } catch (err) { return reject(err) }
    const isHttps = u.protocol === 'https:'
    let lib
    try {
      lib = isHttps ? require('bare-https') : require('bare-http1')
    } catch {
      try {
        lib = isHttps ? require('https') : require('http')
      } catch (err) {
        return reject(new Error('HTTP client unavailable: ' + (err && err.message)))
      }
    }

    const req = lib.request({
      method,
      hostname: u.hostname,
      port: u.port ? parseInt(u.port, 10) : (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      headers,
      // Node https option; bare-https ignores unknown fields
      servername: u.hostname
    }, (res) => {
      const chunks = []
      let size = 0
      res.on('data', (c) => {
        size += c.length
        if (size > MAX_BODY_BYTES) {
          try { req.destroy() } catch {}
          return reject(new Error('Response too large'))
        }
        chunks.push(c)
      })
      res.on('end', () => {
        clearTimeout(timer)
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers || {},
          body: Buffer.concat(chunks)
        })
      })
      res.on('error', (err) => { clearTimeout(timer); reject(err) })
    })
    const timer = setTimeout(() => {
      try { req.destroy() } catch {}
      reject(new Error('Clearnet fetch timed out'))
    }, timeoutMs)
    req.on('error', (err) => { clearTimeout(timer); reject(err) })
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

/**
 * Rewrite HTML so navigations and subresources stay on the clearnet proxy.
 * Relative URLs resolve against the document's real clearnet base, then are
 * re-encoded under /clearnet/<blob>.
 */
function rewriteHtmlForProxy (html, documentUrl, proxyOrigin) {
  const base = new URL(documentUrl)
  const origin = String(proxyOrigin || '').replace(/\/$/, '')

  const rewriteAttrUrl = (raw) => {
    const value = String(raw || '').trim()
    if (!value || value.startsWith('#') || value.startsWith('data:') ||
        value.startsWith('blob:') || value.startsWith('javascript:') ||
        value.startsWith('mailto:') || value.startsWith('about:')) {
      return value
    }
    try {
      const abs = new URL(value, base).toString()
      if (!/^https?:/i.test(abs)) return value
      return `${origin}/clearnet/${encodeClearnetTarget(abs)}`
    } catch {
      return value
    }
  }

  let out = String(html || '')
  // href / src / action / poster / formaction / data-src
  out = out.replace(
    /\b(href|src|action|poster|formaction|data-src)\s*=\s*(["'])([^"']*)\2/gi,
    (full, attr, q, val) => `${attr}=${q}${rewriteAttrUrl(val)}${q}`
  )
  // srcset="url 1x, url 2x"
  out = out.replace(/\bsrcset\s*=\s*(["'])([^"']*)\1/gi, (full, q, val) => {
    const parts = val.split(',').map((part) => {
      const bits = part.trim().split(/\s+/)
      if (!bits[0]) return part
      bits[0] = rewriteAttrUrl(bits[0])
      return bits.join(' ')
    })
    return `srcset=${q}${parts.join(', ')}${q}`
  })
  // CSS url(...)
  out = out.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (full, q, val) => {
    const rewritten = rewriteAttrUrl(val.trim())
    return `url(${q}${rewritten}${q})`
  })

  // Inject <base> pointing at proxy document root so any leftover relative
  // resolution still hits our host; we also set a pear-clearnet meta.
  // Bare's URL implementation exposes protocol + host but not `.origin`.
  const documentOrigin = `${base.protocol}//${base.host}`
  const headBits =
    `<meta name="pear-clearnet-origin" content="${escapeHtml(documentOrigin)}">` +
    `<base href="${escapeHtml(origin)}/clearnet/${encodeClearnetTarget(base.toString())}">`

  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}${headBits}`)
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html[^>]*>/i, (m) => `${m}<head>${headBits}</head>`)
  } else {
    out = `<head>${headBits}</head>${out}`
  }
  return out
}

function escapeHtml (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Build the HTML head injection for a clearnet document (shield + privacy).
 * Returns { htmlFragment, scriptBodies: string[] } for CSP hashing by caller.
 */
function buildClearnetInjections (opts = {}) {
  const {
    contentShield = null,
    documentUrl = '',
    privacy = {},
    farblingSalt = 'pear'
  } = opts
  const settings = normalizePrivacySettings(privacy)
  let host = ''
  try { host = new URL(documentUrl).hostname } catch {}

  const fragments = []
  const scriptBodies = []

  const refMeta = referrerPolicyMeta(settings)
  if (refMeta) fragments.push(refMeta)

  if (contentShield && contentShield.enabled !== false) {
    const css = contentShield.cosmeticCssFor
      ? contentShield.cosmeticCssFor(host, {})
      : ''
    if (css) fragments.push(`<style data-pear-shield>${escapeStyleText(css)}</style>`)

    if (typeof contentShield.scriptletsFor === 'function') {
      for (const entry of contentShield.scriptletsFor(host, {})) {
        if (entry && entry.body) {
          scriptBodies.push(entry.body)
          fragments.push(`<script data-pear-scriptlet="${escapeHtml(entry.name || 'scriptlet')}">${entry.body}</script>`)
        }
      }
    }
    if (typeof contentShield.pluginStylesFor === 'function') {
      const pcss = contentShield.pluginStylesFor(host, {})
      if (pcss) fragments.push(`<style data-pear-plugin-style>${escapeStyleText(pcss)}</style>`)
    }
    if (typeof contentShield.pluginScriptsFor === 'function') {
      for (const entry of contentShield.pluginScriptsFor(host, {})) {
        if (entry && entry.body) {
          scriptBodies.push(entry.body)
          fragments.push(`<script data-pear-plugin="${escapeHtml(entry.pluginId || 'plugin')}">${entry.body}</script>`)
        }
      }
    }
  }

  if (settings.fingerprintFarbling) {
    const body = fingerprintFarblingScript(farblingSalt + ':' + host)
    scriptBodies.push(body)
    fragments.push(`<script data-pear-farbling="1">${body}</script>`)
  }

  return { htmlFragment: fragments.join(''), scriptBodies }
}

/**
 * Handle a /clearnet/* request end-to-end.
 * @returns {Promise<boolean>} true if handled
 */
async function handleClearnetRequest (req, res, urlObj, deps = {}) {
  const parsed = parseClearnetPath(urlObj.pathname, urlObj.search)
  if (!parsed) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'text/plain')
    res.end('Invalid clearnet target')
    return true
  }

  const privacy = normalizePrivacySettings(deps.privacy || {})
  const sanitized = sanitizeClearnetUrl(parsed.target, privacy)
  let target = sanitized.url

  // Content Shield network block before any clearnet fetch
  if (deps.contentShield && deps.contentShield.enabled !== false) {
    const verdict = deps.contentShield.shouldBlockUrl(target, {})
    if (verdict.blocked) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('X-Pear-Shield', 'blocked')
      res.end('Blocked by PearBrowser Shield')
      return true
    }
  }

  const proxyOrigin = deps.proxyOrigin || `http://127.0.0.1:${deps.port || 0}`
  let fetchFn = deps.fetchClearnet || fetchClearnet

  try {
    let response = await fetchFn(target, {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: req.headers.accept || 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
        Referer: privacy.referrerPolicy === 'no-referrer' ? undefined : undefined
      }
    })

    // Follow a small number of redirects, re-checking the shield each hop.
    let hops = 0
    while (response.statusCode >= 300 && response.statusCode < 400 && hops < 5) {
      const loc = response.headers.location || response.headers.Location
      if (!loc) break
      let next
      try { next = new URL(loc, target).toString() } catch { break }
      const nextSan = sanitizeClearnetUrl(next, privacy)
      next = nextSan.url
      if (deps.contentShield && deps.contentShield.enabled !== false) {
        const v = deps.contentShield.shouldBlockUrl(next, {})
        if (v.blocked) {
          res.statusCode = 403
          res.setHeader('X-Pear-Shield', 'blocked')
          res.end('Blocked by PearBrowser Shield (redirect)')
          return true
        }
      }
      target = next
      response = await fetchFn(target, { method: 'GET' })
      hops++
    }

    const contentType = String(
      response.headers['content-type'] ||
      response.headers['Content-Type'] ||
      'application/octet-stream'
    ).toLowerCase()

    res.statusCode = response.statusCode || 200
    res.setHeader('X-Pear-Clearnet', '1')
    res.setHeader('X-Pear-Clearnet-Url', target)
    // Do not forward Set-Cookie by default in proxy mode when third-party
    // cookie blocking is on — partitions clearnet cookie jar from hyper.
    const blockCookies = privacy.blockThirdPartyCookies !== false
    for (const [key, value] of Object.entries(response.headers || {})) {
      const lower = key.toLowerCase()
      if (['transfer-encoding', 'content-encoding', 'content-length', 'connection'].includes(lower)) continue
      if (blockCookies && (lower === 'set-cookie' || lower === 'set-cookie2')) continue
      if (lower === 'content-security-policy') continue // we inject our own scripts
      try { res.setHeader(key, value) } catch {}
    }

    let body = response.body
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      let html = body.toString('utf8')
      html = rewriteHtmlForProxy(html, target, proxyOrigin)
      const inj = buildClearnetInjections({
        contentShield: deps.contentShield,
        documentUrl: target,
        privacy,
        farblingSalt: deps.farblingSalt || 'pear'
      })
      if (inj.htmlFragment) {
        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head[^>]*>/i, (m) => `${m}${inj.htmlFragment}`)
        } else {
          html = inj.htmlFragment + html
        }
      }
      body = Buffer.from(html, 'utf8')
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
    } else if (contentType.includes('text/css')) {
      // Rewrite url() in stylesheets
      let css = body.toString('utf8')
      const base = new URL(target)
      css = css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (full, q, val) => {
        const value = String(val || '').trim()
        if (!value || value.startsWith('data:')) return full
        try {
          const abs = new URL(value, base).toString()
          if (!/^https?:/i.test(abs)) return full
          return `url(${q}${proxyOrigin}/clearnet/${encodeClearnetTarget(abs)}${q})`
        } catch {
          return full
        }
      })
      body = Buffer.from(css, 'utf8')
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
    } else if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', contentType)
    }

    res.setHeader('Content-Length', body.length)
    res.end(body)
    return true
  } catch (err) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(`<!doctype html><meta charset="utf-8"><title>Clearnet error</title>
      <body style="font-family:system-ui;padding:2rem;background:#0f1410;color:#e8efe9">
      <h1>Could not load page</h1>
      <p>${escapeHtml(err && err.message ? err.message : String(err))}</p>
      <p style="opacity:.7">Target: ${escapeHtml(target)}</p>
      <p style="opacity:.7">PearBrowser clearnet proxy · shield and privacy ladder still apply.</p>
      </body>`)
    return true
  }
}

module.exports = {
  encodeClearnetTarget,
  decodeClearnetTarget,
  localClearnetUrl,
  parseClearnetPath,
  fetchClearnet,
  rewriteHtmlForProxy,
  buildClearnetInjections,
  handleClearnetRequest,
  MAX_BODY_BYTES,
  USER_AGENT
}
