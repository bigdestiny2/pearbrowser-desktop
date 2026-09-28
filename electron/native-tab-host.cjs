'use strict'

const { WebContentsView } = require('electron')
const { driveHostnameForKey, driveKeyFromHostname } = require('../backend/drive-origin.cjs')
const { CONTEXT_EXPRESSION } = require('./native-page-context.cjs')

const TAB_ID = /^tab-[a-z0-9-]{1,80}$/i
const DRIVE_KEY = /^[0-9a-f]{64}$/i
const HYPER_AUTHORITY = /^(?:[0-9a-f]{64}|[13-9a-km-uw-z]{52})$/i
const MAX_NAV_URL = 4096
const MAX_TABS = 100

function normalizeTabId (value) {
  if (typeof value !== 'string' || !TAB_ID.test(value)) throw new Error('Invalid native tab id')
  return value
}

function normalizeDriveKey (value) {
  if (typeof value !== 'string' || !DRIVE_KEY.test(value)) throw new Error('Invalid drive key')
  return value.toLowerCase()
}

function parseDriveLocalUrl (raw, expectedKey = '') {
  if (typeof raw !== 'string' || raw.length > MAX_NAV_URL) return null
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'http:' || !parsed.port || parsed.username || parsed.password) return null
    const key = driveKeyFromHostname(parsed.hostname)
    if (!key || (expectedKey && key !== expectedKey)) return null
    const match = /^\/(?:hyper|app)\/([0-9a-f]{64})(\/.*|$)/i.exec(parsed.pathname)
    if (!match || match[1].toLowerCase() !== key) return null
    return { url: parsed.href, origin: parsed.origin, key, publicUrl: `hyper://${key}${match[2] || '/'}${parsed.search}${parsed.hash}` }
  } catch {
    return null
  }
}

function publicNavigationTarget (raw) {
  if (typeof raw !== 'string' || raw.length > MAX_NAV_URL) return null
  const local = parseDriveLocalUrl(raw)
  if (local) return local.publicUrl
  try {
    const parsed = new URL(raw)
    if (parsed.username || parsed.password) return null
    if (parsed.protocol === 'hyper:' && HYPER_AUTHORITY.test(parsed.hostname)) return parsed.href
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '[::1]') return null
    return parsed.href
  } catch {
    return null
  }
}

function shortcutForInput (input) {
  if (!input || input.type !== 'keyDown' || !(input.meta || input.control)) return null
  const key = String(input.key || '').toLowerCase()
  if (key === 't') return { command: input.shift ? 'reopen-tab' : 'new-tab' }
  if (key === 'w') return { command: 'close-tab' }
  if (key === 'l') return { command: 'focus-address' }
  if (key === 'r') return { command: 'reload' }
  if (key === 'i' && (input.shift || input.alt)) return { command: 'devtools' }
  if (/^[1-9]$/.test(key)) return { command: 'switch-tab', index: Number(key) }
  return null
}

class NativeTabHost {
  constructor ({ window, session, emit = () => {} }) {
    if (!window?.contentView || !window?.webContents) throw new TypeError('BrowserWindow required')
    if (!session) throw new TypeError('Dedicated Electron session required')
    this.window = window
    this.session = session
    this.emit = emit
    this.tabs = new Map()
    this.activeId = null
    this.activeBounds = null
    this.closed = false
    // Pages do not inherit shell permissions. A permission change must receive
    // a separate, explicit review instead of accepting Electron's default.
    this.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    this.session.setPermissionCheckHandler?.(() => false)
  }

  getWebContents (tabId) {
    return this.tabs.get(normalizeTabId(tabId))?.view.webContents || null
  }

  load ({ tabId, url, driveKey }) {
    this._assertOpen()
    const id = normalizeTabId(tabId)
    const key = normalizeDriveKey(driveKey)
    const target = parseDriveLocalUrl(url, key)
    if (!target || new URL(target.url).hostname !== driveHostnameForKey(key)) throw new Error('Native tab URL is not bound to its exact drive origin')
    let entry = this.tabs.get(id)
    if (entry && entry.driveKey !== key) {
      const selected = this.activeId === id
      this.close({ tabId: id })
      if (selected) this.activeId = id
      entry = null
    }
    if (!entry) {
      if (this.tabs.size >= MAX_TABS) throw new Error('Native tab limit reached')
      entry = this._createEntry(id, key, target.origin)
      this.tabs.set(id, entry)
    }
    if (entry.origin !== target.origin) {
      const selected = this.activeId === id
      this.close({ tabId: id })
      if (selected) this.activeId = id
      entry = this._createEntry(id, key, target.origin)
      this.tabs.set(id, entry)
    }
    if (entry.url !== target.url) {
      entry.url = target.url
      entry.view.webContents.loadURL(target.url).catch((error) => {
        if (this.tabs.get(id) === entry) this._emit(id, 'error', { reason: String(error?.message || error).slice(0, 200) })
      })
    }
    if (this.activeId === id) this._showEntry(entry)
    return { tabId: id, webContentsId: entry.view.webContents.id, url: target.url }
  }

  select ({ tabId, bounds }) {
    this._assertOpen()
    const id = normalizeTabId(tabId)
    this.activeBounds = this._validatedBounds(bounds)
    if (this.activeId && this.activeId !== id) this._detach(this.tabs.get(this.activeId))
    this.activeId = id
    const entry = this.tabs.get(id)
    if (entry) this._showEntry(entry)
    return !!entry
  }

  hide () {
    if (this.activeId) this._detach(this.tabs.get(this.activeId))
    this.activeId = null
    this.activeBounds = null
    if (!this.window.isDestroyed() && !this.window.webContents.isDestroyed()) this.window.webContents.focus()
  }

  close ({ tabId }) {
    const id = normalizeTabId(tabId)
    const entry = this.tabs.get(id)
    if (!entry) return false
    this.tabs.delete(id)
    this._detach(entry)
    if (!entry.view.webContents.isDestroyed()) entry.view.webContents.close({ waitForBeforeUnload: false })
    if (this.activeId === id) {
      this.activeId = null
      if (!this.window.isDestroyed() && !this.window.webContents.isDestroyed()) this.window.webContents.focus()
    }
    return true
  }

  closeAll () {
    if (this.closed) return
    for (const tabId of [...this.tabs.keys()]) this.close({ tabId })
    this.closed = true
  }

  reload ({ tabId }) {
    const contents = this._requireContents(tabId)
    contents.reload()
  }

  openDevTools ({ tabId }) {
    const contents = this._requireContents(tabId)
    contents.openDevTools({ mode: 'detach' })
  }

  async captureContext ({ tabId }) {
    const id = normalizeTabId(tabId)
    const entry = this.tabs.get(id)
    if (!entry || entry.view.webContents.isDestroyed()) throw new Error('Native tab is unavailable')
    const contents = entry.view.webContents
    const currentUrl = contents.getURL()
    const current = parseDriveLocalUrl(currentUrl, entry.driveKey)
    if (!current || current.origin !== entry.origin) throw new Error('Native tab is outside its drive origin')
    const captured = await contents.executeJavaScriptInIsolatedWorld(999, [{ code: CONTEXT_EXPRESSION }])
    if (this.tabs.get(id) !== entry || contents.isDestroyed() || contents.getURL() !== currentUrl) throw new Error('Native tab changed during context capture')
    if (!captured || typeof captured !== 'object' || !captured.context) throw new Error('Native page context was unavailable')
    return { tabId: id, ...captured, source: 'native-isolated-world' }
  }

  _createEntry (tabId, driveKey, origin) {
    const view = new WebContentsView({
      webPreferences: {
        session: this.session,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false
      }
    })
    const entry = { tabId, driveKey, origin, url: '', view, attached: false }
    const contents = view.webContents
    contents.setWindowOpenHandler(({ url }) => {
      const target = publicNavigationTarget(url)
      if (target && this.tabs.get(tabId) === entry) queueMicrotask(() => this._emit(tabId, 'open-url', { url: target, openInNewTab: true }))
      return { action: 'deny' }
    })
    contents.on('will-navigate', (event) => {
      // Let this drive handle its own form method, history replacement, and
      // document navigation. Reissuing it through shell go() would turn a
      // POST into a GET and discard page history semantics.
      const local = parseDriveLocalUrl(event.url, driveKey)
      if (local && local.origin === entry.origin) return
      event.preventDefault()
      const target = publicNavigationTarget(event.url)
      if (target && this.tabs.get(tabId) === entry) this._emit(tabId, 'open-url', { url: target, openInNewTab: false })
    })
    contents.on('will-redirect', (event) => {
      const redirect = parseDriveLocalUrl(event.url, driveKey)
      if (redirect && redirect.origin === entry.origin) return
      event.preventDefault()
      const target = publicNavigationTarget(event.url)
      if (target && this.tabs.get(tabId) === entry) this._emit(tabId, 'open-url', { url: target, openInNewTab: false })
    })
    contents.on('did-navigate', (_event, url) => this._emitNavigation(entry, url))
    contents.on('did-navigate-in-page', (_event, url, isMainFrame) => { if (isMainFrame) this._emitNavigation(entry, url) })
    contents.on('page-title-updated', (_event, title) => this._emit(tabId, 'title', { title: String(title || '').slice(0, 512) }))
    contents.on('did-finish-load', () => this._emit(tabId, 'load'))
    contents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedUrl, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) this._emit(tabId, 'error', { reason: String(errorDescription || errorCode).slice(0, 200) })
    })
    contents.on('before-input-event', (event, input) => {
      const shortcut = shortcutForInput(input)
      if (!shortcut) return
      event.preventDefault()
      if (shortcut.command === 'focus-address') this.window.webContents.focus()
      this._emit(tabId, 'shortcut', shortcut)
    })
    contents.on('render-process-gone', (_event, details) => this._emit(tabId, 'error', { reason: `Page renderer ${details.reason}` }))
    return entry
  }

  _emitNavigation (entry, rawUrl) {
    if (this.tabs.get(entry.tabId) !== entry) return
    const current = parseDriveLocalUrl(rawUrl, entry.driveKey)
    if (current && current.origin === entry.origin) this._emit(entry.tabId, 'navigation', { url: current.publicUrl })
  }

  _showEntry (entry) {
    if (!this.activeBounds || this.tabs.get(entry.tabId) !== entry) return
    if (!entry.attached) {
      this.window.contentView.addChildView(entry.view)
      entry.attached = true
    }
    entry.view.setBounds(this.activeBounds)
    entry.view.setVisible(true)
  }

  _detach (entry) {
    if (!entry || !entry.attached) return
    entry.view.setVisible(false)
    if (!this.window.isDestroyed()) this.window.contentView.removeChildView(entry.view)
    entry.attached = false
  }

  _validatedBounds (bounds) {
    if (!bounds || !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(bounds[key]))) throw new Error('Invalid native tab bounds')
    const outer = this.window.getContentBounds()
    const x = Math.max(0, Math.floor(bounds.x))
    const y = Math.max(0, Math.floor(bounds.y))
    const width = Math.min(Math.floor(bounds.width), outer.width - x)
    const height = Math.min(Math.floor(bounds.height), outer.height - y)
    if (width < 1 || height < 1) throw new Error('Native tab bounds are outside the window')
    return { x, y, width, height }
  }

  _requireContents (tabId) {
    const contents = this.getWebContents(tabId)
    if (!contents || contents.isDestroyed()) throw new Error('Native tab is unavailable')
    return contents
  }

  _emit (tabId, type, payload = {}) {
    if (!this.closed && this.tabs.has(tabId)) this.emit({ tabId, type, ...payload })
  }

  _assertOpen () {
    if (this.closed || this.window.isDestroyed()) throw new Error('Native tab host is closed')
  }
}

module.exports = { NativeTabHost, parseDriveLocalUrl, publicNavigationTarget, shortcutForInput }
