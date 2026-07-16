/**
 * Hyper Proxy — Local HTTP server bridging WebView to Hyperdrives
 *
 * URL mapping:
 *   localhost:PORT/hyper/KEY/path → fetches from Hyperdrive
 *   localhost:PORT/app/APP_ID/path → fetches from installed app's drive
 *
 * Injects <base> tags for relative link resolution in HTML.
 */

const http = require('bare-http1')
const crypto = require('bare-crypto')
const { PAGE_CONTEXT_SHIM, PAGE_CONTEXT_SHIM_HASH, pageContextMeta } = require('./page-context-bridge.cjs')

const USER_FRIENDLY_ERRORS = {
  'Invalid drive key': 'This link appears to be broken or incomplete',
  'Invalid drive key format': 'The address you entered is not valid',
  'File not found': 'The page you\'re looking for doesn\'t exist on this site',
  'Timeout': 'Taking longer than expected. The site may be offline or unreachable.',
  'Drive not found': 'This site is currently unavailable. The owner may have taken it offline.',
  'Failed to open drive': 'Could not connect to this site. It may be offline.',
  'Failed to open app drive': 'Could not load this app. It may be corrupted or unavailable.',
  'Failed to open catalog drive': 'Could not load the app store. The catalog may be unavailable.',
  'Hybrid fetch failed': 'Unable to load content. Check your connection and try again.',
  'No catalog.json found': 'This app store is empty or not properly configured.',
  'Invalid origin': 'Security error: Access denied',
  'Buffer exceeded': 'The response was too large to process',
  'Operation too large': 'This action is too large to complete',
}

function getUserFriendlyError(technicalError) {
  for (const [key, message] of Object.entries(USER_FRIENDLY_ERRORS)) {
    if (technicalError.includes(key)) {
      return message
    }
  }
  return 'Something went wrong. Please try again.'
}

function isLoopbackOrigin (origin) {
  if (typeof origin !== 'string') return false
  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:' &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
  } catch {
    return false
  }
}

function normalizeOrigin (origin) {
  if (typeof origin !== 'string' || origin.length === 0) return null
  const parsed = new URL(origin)
  // Bare's URL implementation exposes protocol + host but not `origin`.
  // Building it explicitly keeps injected <base> URLs and token bindings
  // valid in the packaged runtime as well as in Node-based tests.
  return `${parsed.protocol}//${parsed.host}`
}

function originForPort (port) {
  return `http://127.0.0.1:${port}`
}

function normalizeDriveKeyHex (keyHex) {
  if (!isValidDriveKey(keyHex)) {
    throw new Error('Invalid drive key format')
  }
  return keyHex.toLowerCase()
}

function normalizeUrlSuffix (path) {
  const value = typeof path === 'string' && path.length > 0 ? path : '/'
  return value.startsWith('/') ? value : '/' + value
}

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8'
}

function guessType (path) {
  // Extract extension safely
  const lastDot = path.lastIndexOf('.')
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (lastDot <= lastSlash) return 'application/octet-stream'
  const ext = path.slice(lastDot + 1).toLowerCase()
  return CONTENT_TYPES[ext] || 'application/octet-stream'
}

// Validate drive key format (64 hex characters)
function isValidDriveKey (keyHex) {
  return typeof keyHex === 'string' && /^[0-9a-f]{64}$/i.test(keyHex)
}

// Escape HTML entities to prevent XSS
/**
 * Compute the base64 SHA-256 hash of the body of an inline-script
 * shim string of the form `<script>BODY</script>` (the exact form
 * PEAR_SWARM_V1_SHIM and PEAR_ANONGPT_SHIM use). The browser computes
 * the CSP `'sha256-…'` hash over the literal text between the opening
 * `>` of `<script>` and the closing `<` of `</script>`, so we strip
 * the tags before hashing. Returns '' if the input doesn't look like
 * an inline-script block (e.g. empty shim or someone passed a
 * `<script src=…>` tag).
 */
function sha256ScriptBody (shimHtml) {
  if (!shimHtml || typeof shimHtml !== 'string') return ''
  const m = shimHtml.match(/^\s*<script\b[^>]*>([\s\S]*?)<\/script>\s*$/i)
  if (!m) return ''
  return crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')
}

const HYPER_LINK_BRIDGE_SHIM = `<script>
(() => {
  if (window.__pearBrowserHyperLinkBridge) return
  window.__pearBrowserHyperLinkBridge = true
  const handleHyperLink = (event) => {
    const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null
    if (!anchor) return
    const href = String(anchor.getAttribute('href') || anchor.href || '').trim()
    if (!/^hyper:\\/\\//i.test(href)) return
    event.preventDefault()
    event.stopPropagation()
    window.parent.postMessage({
      type: 'pearbrowser:navigate',
      url: href,
      openInNewTab: Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1 || anchor.target === '_blank')
    }, '*')
  }
  document.addEventListener('click', handleHyperLink, true)
  document.addEventListener('auxclick', handleHyperLink, true)
})()
</script>`
const HYPER_LINK_BRIDGE_SHIM_HASH = sha256ScriptBody(HYPER_LINK_BRIDGE_SHIM)

/**
 * Modify a page's Content-Security-Policy meta tag to authorize the
 * inline shim scripts we inject. We add `'sha256-…'` tokens to the
 * `script-src` directive — narrowly authorizing the exact bytes we
 * insert, without weakening the page's protection against XSS (no
 * `'unsafe-inline'`).
 *
 * Three cases:
 *   1. CSP has explicit `script-src` → append hashes to it.
 *   2. CSP has `default-src` but no `script-src` → add a fresh
 *      `script-src 'self' '<hashes>'` so hashes apply (CSP3 doesn't
 *      let `'sha256-…'` tokens inherit from `default-src`).
 *   3. CSP has neither → append `script-src 'self' '<hashes>'`.
 *   4. No CSP meta tag in the document → no-op (page never set one).
 *
 * Idempotent: re-running with the same hash string yields the same
 * policy.
 */
function injectCspShimHashes (html, hashesB64) {
  if (!hashesB64 || hashesB64.length === 0) return html
  const hashTokens = hashesB64.map((h) => `'sha256-${h}'`).join(' ')
  // Match the meta CSP tag in either attribute order; allow single or
  // double quotes around the content attribute value.
  const re = /<meta\s+[^>]*?http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*?content\s*=\s*(["'])([\s\S]*?)\1[^>]*>/i
  return html.replace(re, (full, q, policy) => {
    let newPolicy = policy
    if (/script-src\b/i.test(newPolicy)) {
      newPolicy = newPolicy.replace(/script-src([^;]*)/i, (m, rest) => `script-src${rest} ${hashTokens}`)
    } else if (/default-src\b/i.test(newPolicy)) {
      newPolicy = newPolicy.replace(/(default-src[^;]*)(;|$)/i, (m, ds, end) => `${ds}; script-src 'self' ${hashTokens}${end}`)
    } else {
      newPolicy = newPolicy + (newPolicy.endsWith(';') ? ' ' : '; ') + `script-src 'self' ${hashTokens}`
    }
    return full.replace(`${q}${policy}${q}`, `${q}${newPolicy}${q}`)
  })
}

function escapeHtml (str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
}

class HyperProxy {
  constructor (getDrive, onError, relayClient, opts = {}) {
    this._getDrive = getDrive // async (keyHex) => Hyperdrive
    this._onError = onError || (() => {})
    this._relay = relayClient || null // RelayClient for fast-path
    this._httpBridge = null // HttpBridge for direct WebView API
    this._server = null
    this._port = 0
    this._perDriveOrigins = !!opts.perDriveOrigins
    this._driveOrigins = new Map() // driveKeyHex -> { server, port, ready, lastUsedAt }
    this._stats = { relayHits: 0, p2pHits: 0, total: 0 }
    // P2P-first relay race (privacy): wait this long for P2P before contacting
    // the relay. _relayFirst=true is the kill-switch back to the parallel race.
    this._relayGraceMs = 500
    this._relayFirst = false
    this._inFlight = new Map() // key -> Promise

    // LRU content cache
    this._cache = new Map() // Simple LRU implementation
    this._cacheMaxSize = 50 * 1024 * 1024 // 50MB
    this._cacheCurrentSize = 0
    this._cacheStats = { hits: 0, misses: 0 }
    this._apiTokens = new Map() // token -> { driveKeyHex, origin, issuedAt }
    this._apiTokenTtlMs = 10 * 60 * 1000 // 10 minutes
    // Separate least-privilege secret for the browser chrome's explicit
    // current-page capture. It is never accepted by /api/* and is stable only
    // for the lifetime of this drive's browser origin.
    this._pageContextTokens = new Map()
    /**
     * String injected into the <head> of every served text/html response,
     * exposing window.pear.swarm.v1 to pages. Set by setPearSwarmShim();
     * empty by default so older PearBrowsers gracefully omit it.
     */
    this._pearSwarmShim = ''
    /**
     * String injected into the <head> of every served text/html response,
     * exposing window.pear.sync + window.pear.identity to pages. Set by
     * setPearSyncShim(); empty by default. Without it, multi-writer apps
     * (peerit, p2pbuilders, …) fall back to single-user localStorage mode.
     */
    this._pearSyncShim = ''
    this._pearSyncShimHash = ''
    /**
     * Page-side anonGPT shim, plus the gate key it's allowed to be
     * injected for. The shim is only emitted into HTML responses when
     * the loaded drive's hex key equals this._anongptDriveKey AND the
     * drive's manifest.json declares the required privacy claims.
     * See setAnongptShim() / setAnongptDriveKey() and the manifest
     * cache below. Everything else gets only the swarm.v1 shim.
     */
    this._anongptShim = ''
    this._anongptDriveKey = ''
    // Cache of validated manifest results per drive key:
    //   Map<driveKeyHex, { ok: boolean, reason?: string, checkedAt: number }>
    // TTL is small because a publisher pushing a new release should
    // see the gate re-check; we cache for 60s to avoid hammering the
    // drive on every HTML response.
    this._anongptManifestCache = new Map()
    this._anongptManifestTtlMs = 60 * 1000
    /**
     * Content Shield (docs/BROWSER_PARITY_PLAN.md Phases 1–3). When set, every
     * /hyper/* and /app/* request is checked before any P2P/relay fetch and
     * HTML responses receive cosmetic CSS, optional strict-mode CSP, scriptlets,
     * and plugin styles/scripts. Null keeps the proxy byte-identical to the
     * pre-shield behavior.
     */
    this._contentShield = null
    /**
     * Privacy ladder settings for clearnet (/clearnet/*) handling.
     * Updated live from user-data via setPrivacySettings().
     */
    this._privacySettings = null
    this._clearnetHandler = null
  }

  setHttpBridge (bridge) {
    this._httpBridge = bridge
  }

  setContentShield (shield) {
    this._contentShield = shield || null
  }

  setPrivacySettings (settings) {
    this._privacySettings = settings || null
  }

  /**
   * Optional injection of clearnet request handler (from clearnet-proxy.cjs).
   * Defaults to requiring the module on first /clearnet/ hit.
   */
  setClearnetHandler (handler) {
    this._clearnetHandler = typeof handler === 'function' ? handler : null
  }

  pageContextToken (driveKeyHex) {
    const keyHex = normalizeDriveKeyHex(driveKeyHex)
    let token = this._pageContextTokens.get(keyHex)
    if (!token) {
      token = crypto.randomBytes(32).toString('hex')
      this._pageContextTokens.set(keyHex, token)
    }
    return token
  }

  /**
   * Provide the page-side window.pear.swarm.v1 shim (a string of HTML/JS
   * that gets concatenated into every served HTML response's <head>).
   * Called once at boot from index.js with PEAR_SWARM_V1_SHIM. Setting
   * this to the empty string disables the surface; pages will no longer
   * see window.pear.swarm.
   */
  setPearSwarmShim (shimHtml) {
    this._pearSwarmShim = String(shimHtml || '')
    this._pearSwarmShimHash = this._pearSwarmShim ? sha256ScriptBody(this._pearSwarmShim) : ''
  }

  /**
   * Provide the page-side window.pear.sync + window.pear.identity shim.
   * Called once at boot from index.js with PEAR_SYNC_SHIM. Empty string
   * disables the surface (pages see no data bridge → dev-mode fallback).
   */
  setPearSyncShim (shimHtml) {
    this._pearSyncShim = String(shimHtml || '')
    this._pearSyncShimHash = this._pearSyncShim ? sha256ScriptBody(this._pearSyncShim) : ''
  }

  /**
   * Set the page-side window.pear.anongpt shim string. Empty string
   * disables the surface entirely (any drive — including the anonGPT
   * drive — gets no anongpt API).
   */
  setAnongptShim (shimHtml) {
    this._anongptShim = String(shimHtml || '')
    this._anongptShimHash = this._anongptShim ? sha256ScriptBody(this._anongptShim) : ''
  }

  /**
   * Set the single Hyperdrive hex key allowed to receive the anonGPT
   * shim. See backend/constants.js ANONGPT_DRIVE_KEY. Any other drive
   * will not see window.pear.anongpt regardless of what its
   * manifest.json claims.
   */
  setAnongptDriveKey (driveKeyHex) {
    this._anongptDriveKey = typeof driveKeyHex === 'string' ? driveKeyHex.toLowerCase() : ''
  }

  /**
   * Returns true if the loaded drive is allowed to host the anongpt
   * shim AND its manifest.json declares the four required privacy
   * claims per anongpt/docs/spec/02-pearbrowser-dev-bridge.md §4. False
   * otherwise — including when the gate key isn't set, the drive
   * doesn't match, the manifest is missing, malformed, or doesn't
   * declare the claims. Cached per-drive for _anongptManifestTtlMs.
   *
   * The validation is intentionally strict: a missing field is treated
   * as a failed check, not as "default to allow". Privacy contract is
   * fail-closed by default.
   */
  async _shouldInjectAnongptShim (driveKeyHex) {
    if (!this._anongptShim) return false
    if (!this._anongptDriveKey) return false
    if (typeof driveKeyHex !== 'string') return false
    if (driveKeyHex.toLowerCase() !== this._anongptDriveKey) return false

    const cached = this._anongptManifestCache.get(driveKeyHex.toLowerCase())
    if (cached && (Date.now() - cached.checkedAt) < this._anongptManifestTtlMs) {
      return cached.ok
    }

    const result = await this._validateAnongptManifest(driveKeyHex)
    this._anongptManifestCache.set(driveKeyHex.toLowerCase(), {
      ok: result.ok,
      reason: result.ok ? null : result.reason,
      checkedAt: Date.now()
    })
    if (!result.ok) {
      console.warn('[anongpt-gate] manifest gate FAILED for', driveKeyHex.slice(0, 12) + '…', '—', result.reason)
    }
    return result.ok
  }

  /**
   * Read manifest.json from the drive and validate the four claims
   * required by the privacy contract. The "pear.anongpt.infer claim"
   * can be declared in either of two ways, both seen in practice:
   *   (a) manifest.permissions includes 'pear.anongpt.infer'  ← anonGPT
   *       publisher convention (treats the API as a permission scope)
   *   (b) manifest.pear.anongpt.infer is truthy                ← nested
   *       object form mentioned in the dev-bridge spec
   * Either form is accepted; both express the same intent. The four
   * privacy claims are checked exactly as the spec requires (no
   * heuristics — a missing field is a failed check, not a default).
   *
   *   - permission declared (one of the two forms above)
   *   - privacy.storesPrompts === false
   *   - privacy.remoteHttpInference === 'forbidden'
   *   - privacy.requiresLocalRuntime === true
   *
   * Returns { ok: true } on success, { ok: false, reason } otherwise.
   */
  async _validateAnongptManifest (driveKeyHex) {
    let manifest
    try {
      const fetched = await this._fetchP2P(driveKeyHex, '/manifest.json')
      if (!fetched || !fetched.content) {
        return { ok: false, reason: 'manifest.json not reachable' }
      }
      manifest = JSON.parse(fetched.content.toString('utf-8'))
    } catch (err) {
      return { ok: false, reason: 'manifest.json parse error: ' + (err && err.message) }
    }
    if (!manifest || typeof manifest !== 'object') {
      return { ok: false, reason: 'manifest.json not an object' }
    }
    const declaredViaPermissions = Array.isArray(manifest.permissions) &&
      manifest.permissions.includes('pear.anongpt.infer')
    const declaredViaNested = manifest.pear && manifest.pear.anongpt && manifest.pear.anongpt.infer
    if (!declaredViaPermissions && !declaredViaNested) {
      return {
        ok: false,
        reason: 'manifest.json does not declare pear.anongpt.infer (expected either ' +
          '`permissions: ["pear.anongpt.infer", ...]` or `pear.anongpt.infer: true`)'
      }
    }
    const privacy = manifest.privacy
    if (!privacy || typeof privacy !== 'object') {
      return { ok: false, reason: 'manifest.json missing `privacy` block' }
    }
    if (privacy.storesPrompts !== false) {
      return { ok: false, reason: 'privacy.storesPrompts must be false (got ' + JSON.stringify(privacy.storesPrompts) + ')' }
    }
    if (privacy.remoteHttpInference !== 'forbidden') {
      return { ok: false, reason: 'privacy.remoteHttpInference must be "forbidden" (got ' + JSON.stringify(privacy.remoteHttpInference) + ')' }
    }
    if (privacy.requiresLocalRuntime !== true) {
      return { ok: false, reason: 'privacy.requiresLocalRuntime must be true (got ' + JSON.stringify(privacy.requiresLocalRuntime) + ')' }
    }
    return { ok: true }
  }

  /**
   * Inject `<base>` + per-page `pear-api-token` meta + swarm.v1 shim
   * (always) + anongpt shim (gated) into an HTML response body. Used by
   * both the cache HIT and cache MISS paths so a reloaded page still
   * gets a fresh token. The token is per-request, never cached.
   *
   * @param {Buffer|string} content   raw upstream HTML
   * @param {string}        driveKeyHex
   * @param {string}        reqPath   request URL path (used to choose
   *                                  `/app/` vs `/hyper/` for <base>)
   * @returns {Buffer}                response body with the head block injected
   */
  async _injectHtmlHead (content, driveKeyHex, reqPath, documentOrigin = null) {
    const html = (Buffer.isBuffer(content) ? content : Buffer.from(content)).toString('utf-8')
    const keyHex = normalizeDriveKeyHex(driveKeyHex)
    const prefix = reqPath.startsWith('/app/') ? '/app/' : '/hyper/'
    // Host MUST match the document origin the page is navigated to (CMD_NAVIGATE
    // loads it from http://127.0.0.1:<port>). `localhost` and `127.0.0.1` are
    // DIFFERENT origins to the browser, so a `localhost` <base> makes every
    // relative resource (styles.css, js/app.js) resolve cross-origin to the
    // 127.0.0.1 document — and any page with a `script-src 'self'` / `style-src
    // 'self'` CSP then refuses its OWN files: index.html renders but nothing
    // else loads (the "splash but never boots" bug). Keep this in lockstep with
    // the host used in index.js CMD_NAVIGATE.
    const origin = normalizeOrigin(documentOrigin || originForPort(this._port))
    const baseHref = `${origin}${prefix}${keyHex}/`
    const apiToken = this.issueApiToken(keyHex, { origin })
    const contextToken = this.pageContextToken(keyHex)
    const includeAnongpt = await this._shouldInjectAnongptShim(keyHex)
    if (includeAnongpt) {
      console.log('[anongpt-gate] injecting shim for', keyHex.slice(0, 12) + '…')
    }
    // Cosmetic element hiding, scriptlets, plugin styles/scripts, and optional
    // strict third-party CSP ride the same injection path as the browser shims.
    // Style blocks need no CSP script hash; scriptlets/plugin scripts are
    // hash-authorized exactly like the swarm/sync/anongpt shims.
    const shieldOpts = { documentKey: keyHex }
    const shieldCss = this._contentShield
      ? this._contentShield.cosmeticCssFor(keyHex, shieldOpts)
      : ''
    const pluginCss = this._contentShield && typeof this._contentShield.pluginStylesFor === 'function'
      ? this._contentShield.pluginStylesFor(keyHex, shieldOpts)
      : ''
    const scriptlets = this._contentShield && typeof this._contentShield.scriptletsFor === 'function'
      ? this._contentShield.scriptletsFor(keyHex, shieldOpts)
      : []
    const pluginScripts = this._contentShield && typeof this._contentShield.pluginScriptsFor === 'function'
      ? this._contentShield.pluginScriptsFor(keyHex, shieldOpts)
      : []

    const scriptletTags = []
    const scriptletHashes = []
    for (const entry of scriptlets) {
      const tag = `<script data-pear-scriptlet="${escapeHtml(entry.name || 'scriptlet')}">${entry.body}</script>`
      const hash = sha256ScriptBody(tag)
      if (hash) {
        scriptletTags.push(tag)
        scriptletHashes.push(hash)
      }
    }
    const pluginScriptTags = []
    const pluginScriptHashes = []
    for (const entry of pluginScripts) {
      const tag = `<script data-pear-plugin="${escapeHtml(entry.pluginId || 'plugin')}">${entry.body}</script>`
      const hash = sha256ScriptBody(tag)
      if (hash) {
        pluginScriptTags.push(tag)
        pluginScriptHashes.push(hash)
      }
    }

    const strictMode = this._contentShield &&
      typeof this._contentShield.isStrict === 'function' &&
      this._contentShield.isStrict(keyHex)
    // Collect every script hash we will inject so strict CSP (and page CSP
    // rewriting) authorizes them. Order matches headInjection below.
    const hashesToAuthorize = []
    if (HYPER_LINK_BRIDGE_SHIM_HASH) hashesToAuthorize.push(HYPER_LINK_BRIDGE_SHIM_HASH)
    if (PAGE_CONTEXT_SHIM_HASH) hashesToAuthorize.push(PAGE_CONTEXT_SHIM_HASH)
    if (this._pearSwarmShim && this._pearSwarmShimHash) hashesToAuthorize.push(this._pearSwarmShimHash)
    if (this._pearSyncShim && this._pearSyncShimHash) hashesToAuthorize.push(this._pearSyncShimHash)
    if (includeAnongpt && this._anongptShimHash) hashesToAuthorize.push(this._anongptShimHash)
    for (const h of scriptletHashes) hashesToAuthorize.push(h)
    for (const h of pluginScriptHashes) hashesToAuthorize.push(h)

    const strictMeta = strictMode
      ? `<meta http-equiv="Content-Security-Policy" content="${this._contentShield.strictCspContent(hashesToAuthorize)}" data-pear-shield-strict="1">`
      : ''

    const headInjection =
      `<base href="${baseHref}">` +
      `<meta name="pear-api-token" content="${apiToken}">` +
      pageContextMeta(contextToken) +
      strictMeta +
      HYPER_LINK_BRIDGE_SHIM +
      PAGE_CONTEXT_SHIM +
      (this._pearSwarmShim || '') +
      (this._pearSyncShim || '') +
      (includeAnongpt ? this._anongptShim : '') +
      scriptletTags.join('') +
      pluginScriptTags.join('') +
      (shieldCss ? `<style data-pear-shield>${shieldCss}</style>` : '') +
      (pluginCss ? `<style data-pear-plugin-style>${pluginCss}</style>` : '')
    let injected = html.includes('<head>')
      ? html.replace('<head>', `<head>${headInjection}`)
      : html.replace(/<html>/i, `<html><head>${headInjection}</head>`)

    // Page may carry a strict CSP that forbids inline scripts (anonGPT
    // ships `script-src 'self'` with no 'unsafe-inline' — its own
    // scripts are hash-whitelisted in its page). Without help our
    // shims would be in the HTML but never execute, and the page's
    // feature detection for window.pear.* would report "private
    // runtime unavailable" — exactly the failure mode the spec demands
    // for missing runtimes. To make our injection visible to the page
    // we add the shim hashes to the page's CSP `script-src` directive.
    // We do NOT add 'unsafe-inline' (that would weaken the page's
    // protection against XSS); we add only the exact hashes of the
    // exact scripts we (the authorized runtime) inject.
    if (hashesToAuthorize.length > 0) {
      injected = injectCspShimHashes(injected, hashesToAuthorize)
    }

    return Buffer.from(injected)
  }

  get port () { return this._port }

  get perDriveOrigins () { return this._perDriveOrigins }

  async localOriginForDrive (driveKeyHex) {
    const keyHex = normalizeDriveKeyHex(driveKeyHex)
    if (!this._perDriveOrigins) return originForPort(this._port)
    try {
      const entry = await this._ensureDriveOrigin(keyHex)
      return originForPort(entry.port)
    } catch (err) {
      console.warn('[origin-isolation] per-drive origin failed for', keyHex.slice(0, 12) + '…', '-', err && err.message)
      return originForPort(this._port)
    }
  }

  async localUrlForDrive (driveKeyHex, mode, path = '/') {
    const keyHex = normalizeDriveKeyHex(driveKeyHex)
    const prefix = mode === 'app' ? '/app/' : '/hyper/'
    const origin = await this.localOriginForDrive(keyHex)
    return `${origin}${prefix}${keyHex}${normalizeUrlSuffix(path)}`
  }

  async _ensureDriveOrigin (driveKeyHex) {
    const keyHex = normalizeDriveKeyHex(driveKeyHex)
    let entry = this._driveOrigins.get(keyHex)
    if (entry) {
      entry.lastUsedAt = Date.now()
      return entry.ready
    }

    entry = {
      server: null,
      port: 0,
      ready: null,
      lastUsedAt: Date.now()
    }
    entry.server = http.createServer((req, res) => this._handle(req, res, {
      boundDriveKeyHex: keyHex,
      port: entry.port
    }))
    entry.ready = new Promise((resolve, reject) => {
      const onError = (err) => {
        this._driveOrigins.delete(keyHex)
        reject(err)
      }
      entry.server.once('error', onError)
      entry.server.listen(0, '127.0.0.1', () => {
        entry.server.removeListener('error', onError)
        entry.port = entry.server.address().port
        resolve(entry)
      })
    })
    this._driveOrigins.set(keyHex, entry)
    return entry.ready
  }

  async releaseDriveOrigin (driveKeyHex) {
    const keyHex = normalizeDriveKeyHex(driveKeyHex)
    this._pageContextTokens.delete(keyHex)
    const entry = this._driveOrigins.get(keyHex)
    if (!entry) return false
    this._driveOrigins.delete(keyHex)
    try { await entry.ready } catch {}
    if (!entry.server) return true
    await new Promise(resolve => entry.server.close(() => resolve()))
    return true
  }

  async start () {
    this._server = http.createServer((req, res) => this._handle(req, res))

    return new Promise((resolve, reject) => {
      this._server.on('error', reject)
      this._server.listen(0, '127.0.0.1', () => {
        this._port = this._server.address().port
        resolve(this._port)
      })
    })
  }

  async stop () {
    const closers = []
    if (this._server) {
      const server = this._server
      this._server = null
      closers.push(new Promise(resolve => server.close(() => resolve())))
    }
    for (const entry of this._driveOrigins.values()) {
      if (!entry.server) continue
      closers.push(new Promise(resolve => entry.server.close(() => resolve())))
    }
    this._driveOrigins.clear()
    this._pageContextTokens.clear()
    await Promise.all(closers)
  }

  async _handle (req, res, context = {}) {
    const serverPort = context.port || this._port
    const documentOrigin = originForPort(serverPort)
    // Validate origin - only allow strict loopback origins
    const origin = req.headers.origin
    if (origin && !isLoopbackOrigin(origin)) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'text/plain')
      return res.end('Invalid origin: only localhost is allowed')
    }

    // Set CORS headers for valid origins
    res.setHeader('Access-Control-Allow-Origin', origin || documentOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Pear-Token')

    // CORS preflight handler
    if (req.method === 'OPTIONS') {
      if (origin && !isLoopbackOrigin(origin)) {
        res.statusCode = 403
        return res.end('Invalid origin')
      }
      res.setHeader('Access-Control-Allow-Origin', origin || documentOrigin)
      res.statusCode = 204
      return res.end()
    }

    const url = new URL(req.url, documentOrigin)
    const path = url.pathname

    // HTTP Bridge — direct API for WebView apps (bypasses RN relay)
    if (this._httpBridge && path.startsWith('/api/')) {
      const handled = await this._httpBridge.handle(req, res, url)
      if (handled) return
    }

    // Health check
    if (path === '/health') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ ok: true }))
    }

    // Clearnet proxy (Phase 4) — browser-owned https/http fetch with shield
    if (path.startsWith('/clearnet/')) {
      const handle = this._clearnetHandler || require('./clearnet-proxy.cjs').handleClearnetRequest
      return handle(req, res, url, {
        contentShield: this._contentShield,
        privacy: this._privacySettings,
        proxyOrigin: documentOrigin,
        port: serverPort
      })
    }

    try {
      let driveKeyHex, filePath

      if (path.startsWith('/hyper/')) {
        // Direct hyper:// browsing: /hyper/KEY/path
        const rest = path.slice('/hyper/'.length)
        const slash = rest.indexOf('/')
        driveKeyHex = slash === -1 ? rest : rest.slice(0, slash)
        filePath = slash === -1 ? '/' : rest.slice(slash)
      } else if (path.startsWith('/app/')) {
        // Installed app: /app/DRIVE_KEY/path
        const rest = path.slice('/app/'.length)
        const slash = rest.indexOf('/')
        driveKeyHex = slash === -1 ? rest : rest.slice(0, slash)
        filePath = slash === -1 ? '/' : rest.slice(slash)
      } else {
        res.statusCode = 404
        return res.end('Not found')
      }

      // SECURITY: Validate drive key format to prevent path traversal
      if (!isValidDriveKey(driveKeyHex)) {
        res.statusCode = 400
        return res.end('Invalid drive key format')
      }
      driveKeyHex = driveKeyHex.toLowerCase()

      if (context.boundDriveKeyHex && driveKeyHex !== context.boundDriveKeyHex) {
        res.statusCode = 403
        return res.end('Forbidden for this origin')
      }

      // SECURITY: Validate file path to prevent directory traversal
      if (filePath.includes('..') || filePath.includes('\x00')) {
        res.statusCode = 400
        return res.end('Invalid file path')
      }

      // Content Shield: decide before any cache/P2P/relay work so a blocked
      // subresource never costs swarm bandwidth or leaks to a relay.
      // Per-drive allowlist (documentKey) exempts the whole drive.
      if (this._contentShield) {
        const verdict = this._contentShield.shouldBlockUrl(
          `hyper://${driveKeyHex}${filePath}`,
          { documentKey: driveKeyHex }
        )
        if (verdict.blocked) {
          res.statusCode = 403
          res.setHeader('Content-Type', 'text/plain')
          res.setHeader('X-Pear-Shield', 'blocked')
          return res.end('Blocked by PearBrowser Shield')
        }
        if (verdict.allowlisted) {
          res.setHeader('X-Pear-Shield', 'allowlisted')
        }
      }

      this._stats.total++

      // Check if this is a directory request
      if (filePath.endsWith('/') || filePath === '') {
        const drive = await this._getDrive(driveKeyHex)
        if (drive) {
          // Brief wait for the drive's manifest to sync from the swarm
          // before checking whether index.html exists. Without this,
          // freshly-opened drives (just joined the swarm seconds ago)
          // returned null from drive.entry() before any blocks had
          // arrived — and we fell back to the empty directory listing.
          // 8s is plenty for a hot relay; first-time peer discovery
          // sometimes needs longer, but the directory-listing fallback
          // still kicks in if it does.
          try {
            await Promise.race([
              drive.update({ wait: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('update-timeout')), 8000))
            ])
          } catch {
            // Timeout is acceptable — drive.entry will still try below.
          }
          const indexExists = await drive.entry(filePath + 'index.html').catch(() => null)
          if (!indexExists) {
            // No index, show directory listing
            return this._serveDirectoryListing(res, drive, driveKeyHex, filePath)
          }
          // Has index, serve it (filePath stays as directory path)
        }
      }

      // Check cache first
      const cacheKey = this._getCacheKey(driveKeyHex, filePath)
      const cached = this._getFromCache(cacheKey)
      if (cached) {
        res.setHeader('Content-Type', cached.contentType)
        res.setHeader('X-Cache', 'HIT')
        // HTML responses must STILL get the per-page api-token + shim
        // injection even when served from cache. The cache stores raw
        // upstream content; the token is per-request and must not be
        // cached (each page load gets a fresh token). Caching the post-
        // injection HTML would leak tokens across requests, so we
        // re-inject on every HIT instead.
        if (cached.contentType.includes('text/html')) {
          const injected = await this._injectHtmlHead(cached.content, driveKeyHex, path, documentOrigin)
          res.statusCode = 200
          return res.end(injected)
        }
        res.statusCode = 200
        return res.end(cached.content)
      }
      this._cacheStats.misses++

      // HYBRID FETCH: race relay (fast) vs P2P (reliable)
      const result = await this._hybridFetch(driveKeyHex, filePath)

      if (!result) {
        res.statusCode = 404
        return res.end('File not found')
      }

      // Cache successful result
      this._setCache(cacheKey, result.content, result.contentType)

      const contentType = result.contentType
      const content = result.content
      res.setHeader('X-Cache', 'MISS')

      res.setHeader('Content-Type', contentType)
      res.setHeader('X-Source', result.source)

      // Inject <base> tag + per-page api-token meta + window.pear.swarm.v1
      // shim for HTML responses. Pages get the shim "for free" — no
      // <script src> required from the author. Token is also exposed in a
      // meta tag so the shim can read it without holding it in JS at
      // construction time. The anonGPT shim is conditionally added when
      // the gate passes. Logic lives in _injectHtmlHead() so cache HIT
      // and cache MISS use the identical injection path.
      if (contentType.includes('text/html')) {
        const injected = await this._injectHtmlHead(content, driveKeyHex, path, documentOrigin)
        res.statusCode = 200
        return res.end(injected)
      }

      // Range request support for streaming (video, audio, large files)
      res.setHeader('Accept-Ranges', 'bytes')
      const rangeHeader = req.headers.range

      if (rangeHeader) {
        const total = content.length
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)
        if (match && (match[1] || match[2])) {
          // Clamp the requested range to the actual content bounds. Without
          // this, an open-ended or oversized range (e.g. `bytes=0-999999`
          // against a smaller file) sets a Content-Length larger than the
          // bytes we actually send, and browsers stall the media stream.
          let start = match[1] ? parseInt(match[1], 10) : 0
          let end = match[2] ? parseInt(match[2], 10) : total - 1
          if (Number.isNaN(start)) start = 0
          if (Number.isNaN(end) || end > total - 1) end = total - 1

          // Unsatisfiable range → 416 per RFC 7233.
          if (start > end || start >= total) {
            res.statusCode = 416
            res.setHeader('Content-Range', `bytes */${total}`)
            return res.end()
          }

          const chunkSize = end - start + 1
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
          res.setHeader('Content-Length', chunkSize)
          res.statusCode = 206
          return res.end(content.slice(start, end + 1))
        }
      }

      res.setHeader('Content-Length', content.length)
      res.statusCode = 200
      res.end(content)
    } catch (err) {
      // Log detailed error internally
      this._onError(path, err.message)
      // Return user-friendly error to client
      const userMessage = getUserFriendlyError(err.message)
      res.statusCode = 502
      res.setHeader('Content-Type', 'text/html')
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cannot Load Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .container { text-align: center; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #ff9500; font-size: 20px; margin-bottom: 12px; }
    p { color: #999; line-height: 1.6; margin-bottom: 24px; }
    .error-code { 
      display: inline-block;
      background: #1a1a1a;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔌</div>
    <h1>Cannot Load Page</h1>
    <p>${userMessage}</p>
    <div class="error-code">${err.code || '502'}</div>
  </div>
</body>
</html>`)
    }
  }

  /**
   * Hybrid fetch — race relay HTTP (fast) vs P2P Hyperdrive (reliable).
   * Deduplicates concurrent requests for the same file.
   * Returns { content, contentType, source } or null.
   */
  async _hybridFetch (keyHex, filePath) {
    const cacheKey = `${keyHex}:${filePath}`

    // Return existing promise if already fetching
    if (this._inFlight.has(cacheKey)) {
      return this._inFlight.get(cacheKey)
    }

    // Create the fetch promise
    const promise = this._doHybridFetch(keyHex, filePath)
    this._inFlight.set(cacheKey, promise)

    // Clean up when done
    promise.finally(() => {
      this._inFlight.delete(cacheKey)
    })

    return promise
  }

  /**
   * Internal hybrid fetch implementation — race relay HTTP (fast) vs P2P Hyperdrive (reliable).
   * Returns { content, contentType, source } or null.
   */
  async _doHybridFetch (keyHex, filePath) {
    // Resolve directory paths
    let resolvedPath = filePath
    if (filePath.endsWith('/') || filePath === '') {
      resolvedPath = (filePath || '/') + 'index.html'
    }

    // P2P-FIRST (privacy): try P2P, only contact the relay if P2P misses or is
    // slower than _relayGraceMs, so the relay never sees a fetch P2P could have
    // served. _relayFirst restores the old parallel race.
    const { p2pFirstFetch } = require('./p2p-first-fetch.js')
    const { result } = await p2pFirstFetch({
      fetchP2P: () => this._fetchP2P(keyHex, resolvedPath),
      fetchRelay: this._relay ? () => this._relay.fetch(keyHex, resolvedPath) : null,
      graceMs: this._relayGraceMs,
      relayFirst: this._relayFirst,
    })

    if (result) {
      if (result.source === 'relay') this._stats.relayHits++
      else this._stats.p2pHits++
    } else {
      this._onError(keyHex + resolvedPath, 'Hybrid fetch failed: all sources unavailable')
    }

    return result
  }

  /**
   * Fetch from P2P (Hyperdrive)
   * Uses { wait: true } for non-blocking wait — Hypercore handles
   * the waiting internally instead of us polling every 300ms.
   * Inspired by Vinjari's fetch.js approach.
   */
  async _fetchP2P (keyHex, filePath) {
    const drive = await this._getDrive(keyHex)
    if (!drive) return null

    // Use Hyperdrive's built-in wait: true to wait for the specific
    // block we need, with a 15s timeout. No polling.
    let content = await Promise.race([
      drive.get(filePath, { wait: true }),
      new Promise(resolve => setTimeout(() => resolve(null), 15000))
    ])

    // Stale-session self-heal: if the fetch missed, the author may have
    // RE-PUBLISHED the drive (advanced it to a new version) since this
    // session was opened. A cached session stays pinned to the version it
    // first saw, so a newer file (e.g. js/app.js after a re-publish) isn't in
    // the file index this session reads — index.html still loads from the old
    // version but its scripts 404, and the page hangs. Re-advance once and, ONLY
    // if the version actually moved, drop this drive's stale per-file cache and
    // retry — so a re-publish self-heals without making a genuinely-missing file
    // pay a second 15s wait.
    if (!content && typeof drive.update === 'function') {
      const before = drive.version
      try {
        await Promise.race([
          drive.update({ wait: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('update-timeout')), 8000))
        ])
      } catch {}
      if (drive.version !== before) {
        this.invalidateCache(keyHex)
        content = await Promise.race([
          drive.get(filePath, { wait: true }),
          new Promise(resolve => setTimeout(() => resolve(null), 15000))
        ])
      }
    }

    if (!content) return null

    return { content, contentType: guessType(filePath) }
  }

  _getCacheKey (driveKeyHex, filePath) {
    return `${driveKeyHex}:${filePath}`
  }

  _getFromCache (key) {
    const entry = this._cache.get(key)
    if (!entry) return null

    // Check TTL (5 minutes)
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      this._cache.delete(key)
      this._cacheCurrentSize -= entry.size
      return null
    }

    // Update access order (LRU)
    entry.lastAccess = Date.now()
    this._cacheStats.hits++
    return entry
  }

  _setCache (key, content, contentType) {
    const size = content.length

    // Don't cache files > 5MB
    if (size > 5 * 1024 * 1024) return

    // Evict oldest entries if needed
    while (this._cacheCurrentSize + size > this._cacheMaxSize && this._cache.size > 0) {
      let oldest = null
      let oldestTime = Infinity
      for (const [k, v] of this._cache) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess
          oldest = k
        }
      }
      if (oldest) {
        const entry = this._cache.get(oldest)
        this._cacheCurrentSize -= entry.size
        this._cache.delete(oldest)
      }
    }

    this._cache.set(key, {
      content,
      contentType,
      size,
      timestamp: Date.now(),
      lastAccess: Date.now()
    })
    this._cacheCurrentSize += size
  }

  /**
   * Invalidate cache entries for a specific drive key
   * @param {string} driveKeyHex - The drive key to invalidate
   */
  invalidateCache (driveKeyHex) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(`${driveKeyHex}:`)) {
        const entry = this._cache.get(key)
        this._cacheCurrentSize -= entry.size
        this._cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats () {
    return {
      ...this._cacheStats,
      size: this._cacheCurrentSize,
      maxSize: this._cacheMaxSize,
      entries: this._cache.size
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache () {
    this._cache.clear()
    this._cacheCurrentSize = 0
    this._cacheStats.hits = 0
    this._cacheStats.misses = 0
  }

  issueApiToken (driveKeyHex, opts = {}) {
    const keyHex = normalizeDriveKeyHex(driveKeyHex)
    const origin = opts && opts.origin ? normalizeOrigin(opts.origin) : null
    if (origin && !isLoopbackOrigin(origin)) throw new Error('Invalid token origin')
    this._cleanupExpiredApiTokens()
    const token = crypto.randomBytes(32).toString('hex')
    this._apiTokens.set(token, { driveKeyHex: keyHex, origin, kind: 'drive', issuedAt: Date.now() })
    return token
  }

  validateApiToken (token) {
    if (typeof token !== 'string' || token.length < 32) return null
    this._cleanupExpiredApiTokens()
    const entry = this._apiTokens.get(token)
    if (!entry) return null
    return {
      driveKeyHex: entry.driveKeyHex,
      origin: entry.origin || null,
      kind: entry.kind || 'drive',
      issuedAt: entry.issuedAt
    }
  }

  _cleanupExpiredApiTokens () {
    const now = Date.now()
    for (const [token, entry] of this._apiTokens) {
      if (now - entry.issuedAt > this._apiTokenTtlMs) {
        this._apiTokens.delete(token)
      }
    }
  }

  async _serveDirectoryListing (res, drive, keyHex, dirPath) {
    const entries = []
    const MAX_ENTRIES = 1000 // Prevent memory exhaustion
    const TIMEOUT_MS = 5000
    const startTime = Date.now()

    // Normalize dirPath for listing (ensure it ends with / for prefix matching)
    const normalizedDirPath = dirPath.endsWith('/') ? dirPath : dirPath + '/'

    try {
      for await (const entry of drive.list(normalizedDirPath)) {
        // Check timeout
        if (Date.now() - startTime > TIMEOUT_MS) {
          break
        }
        entries.push(entry.key)
        if (entries.length >= MAX_ENTRIES) {
          entries.push('... (truncated)')
          break
        }
      }
    } catch (err) {
      this._onError('directory-listing', err.message)
    }

    // Escape all entries to prevent XSS
    const items = entries.map(e => {
      const name = e.startsWith(dirPath) ? e.slice(dirPath.length) : e
      const escapedName = escapeHtml(name)
      const escapedE = escapeHtml(e)
      return `<li><a href="/hyper/${escapeHtml(keyHex)}${escapedE}">${escapedName}</a></li>`
    }).join('\n')

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>hyper://${escapeHtml(keyHex.slice(0, 8))}...${escapeHtml(dirPath)}</title>
<style>body{font-family:-apple-system,sans-serif;padding:20px;background:#0a0a0a;color:#e0e0e0}
h1{color:#ff9500;font-size:1.1em;word-break:break-all}ul{list-style:none;padding:0}
li{padding:8px 0;border-bottom:1px solid #333}a{color:#4dabf7;text-decoration:none}</style>
</head><body><h1>hyper://${escapeHtml(keyHex.slice(0, 8))}...${escapeHtml(dirPath)}</h1>
<ul>${items || '<li style="color:#666">Empty directory</li>'}</ul></body></html>`)
  }
}

module.exports = { 
  HyperProxy, 
  getUserFriendlyError,
  USER_FRIENDLY_ERRORS 
}
