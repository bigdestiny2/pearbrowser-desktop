import { useEffect, useRef, useState } from 'react'
import { html } from 'htm/react'
import { Logo, Wordmark } from './logo.js'

function copyText (text) {
  try {
    navigator.clipboard?.writeText(text)
  } catch {}
}

// Vetted against https://github.com/holepunchto/pear-aliases — these
// are the canonical pear:// keys for Holepunch-ecosystem apps.
const FEATURED_APPS = [
  {
    id: 'keet',
    name: 'Keet',
    tagline: 'End-to-end encrypted P2P chat, voice, and video calls by Holepunch.',
    link: 'pear://oeeoz3w6fjjt7bym3ndpa6hhicm8f8naxyk11z4iypeoupn6jzpo',
    initial: 'K',
    gradient: 'linear-gradient(135deg, #fbbf24, #f97316)'
  },
  {
    id: 'pearpass',
    name: 'PearPass',
    tagline: 'Peer-to-peer password manager from Tether — synced across devices without a cloud.',
    link: 'pear://tywsat7gz8m65ejx4zjn3773pbdc4j8m66tukis8dgzekraymtzo',
    initial: 'P',
    gradient: 'linear-gradient(135deg, #3fb950, #58a6ff)'
  },
  {
    id: 'doctor',
    name: 'Pear Doctor',
    tagline: 'Diagnose your Pear runtime — networking, DHT reachability, NAT traversal.',
    link: 'pear://fs1xuyzx6c9mu6zu6t5ubhkcbzz913h814te9ay9zzbc9hzf15fo',
    initial: 'D',
    gradient: 'linear-gradient(135deg, #a371f7, #d946ef)'
  }
]

const TAB_META = {
  browse: { label: 'Browse', icon: '🌐' },
  apps: { label: 'Apps', icon: '📦' },
  sites: { label: 'P2P Sites', icon: '✒️' },
  library: { label: 'Library', icon: '🔖' },
  settings: { label: 'Settings', icon: '⚙' }
}

const DEFAULT_URL = 'hyper://14a1f4c00c2f98047b89a86b5521f980a6213523f75a7e9d6e49a1b17fd4c694/'

function normalizeUrl (raw) {
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith('hyper://')) return s
  if (/^[0-9a-f]{64}$/i.test(s)) return `hyper://${s}/`
  if (/^[13-9a-km-uw-z]{52}$/i.test(s)) return `hyper://${s}/`
  if (s.includes('/') || s.startsWith('pear://')) return s
  return `hyper://${s}`
}

function Browse ({ rpc, C, navUrl, onNavigated }) {
  const [input, setInput] = useState(navUrl || DEFAULT_URL)
  const [src, setSrc] = useState(null)
  const [status, setStatus] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const iframeRef = useRef(null)

  const go = async (url) => {
    const target = normalizeUrl(url)
    if (!target) return
    setStatus(`resolving ${target}…`)
    try {
      const res = await rpc.request(C.CMD_NAVIGATE, { url: target })
      setSrc(res.localUrl)
      setStatus('')
      setHistory((h) => {
        const trimmed = h.slice(0, histIdx + 1)
        const next = [...trimmed, target]
        setHistIdx(next.length - 1)
        return next
      })
      setInput(target)
      rpc.request(C.CMD_USERDATA_ADD_HISTORY, { url: target }).catch(() => {})
    } catch (err) {
      setStatus(`error: ${err.message}`)
    }
  }

  const bookmark = async () => {
    const target = normalizeUrl(input)
    if (!target) return
    try {
      await rpc.request(C.CMD_USERDATA_ADD_BOOKMARK, { url: target, title: target })
      setStatus(`bookmarked ${target}`)
      setTimeout(() => setStatus(''), 1500)
    } catch (err) {
      setStatus(`bookmark failed: ${err.message}`)
    }
  }

  useEffect(() => {
    if (navUrl) {
      go(navUrl)
      onNavigated?.()
    }
  }, [navUrl])

  const back = () => {
    if (histIdx <= 0) return
    const i = histIdx - 1
    setHistIdx(i)
    go(history[i])
  }
  const forward = () => {
    if (histIdx >= history.length - 1) return
    const i = histIdx + 1
    setHistIdx(i)
    go(history[i])
  }
  const reload = () => {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src
  }
  const onKey = (e) => { if (e.key === 'Enter') go(input) }

  return html`
    <div class="browse">
      <div class="urlbar">
        <button class="nav" onClick=${back} disabled=${histIdx <= 0}>◀</button>
        <button class="nav" onClick=${forward} disabled=${histIdx >= history.length - 1}>▶</button>
        <button class="nav" onClick=${reload} disabled=${!src}>⟳</button>
        <input
          type="text"
          value=${input}
          onInput=${(e) => setInput(e.target.value)}
          onKeyDown=${onKey}
          placeholder="hyper://<key>/path"
          spellcheck="false"
        />
        <button class="nav" onClick=${bookmark} disabled=${!input.trim()} title="Bookmark this URL">☆</button>
        <button class="nav go" onClick=${() => go(input)}>Go</button>
      </div>
      ${status && html`<div class="browse-status">${status}</div>`}
      ${src
        ? html`<iframe ref=${iframeRef} class="webview" src=${src} sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock"></iframe>`
        : html`
          <div class="browse-welcome">
            <div class="browse-welcome-inner">
              <div class="browse-welcome-logo">🍐</div>
              <h2>The peer-to-peer web starts here</h2>
              <p>Paste any <code>hyper://</code> URL in the address bar above — hex or z-base-32 — and PearBrowser will fetch it directly from its peers. No DNS, no servers, no CDN.</p>
              <div class="browse-welcome-actions">
                <button class="btn primary" onClick=${() => go(DEFAULT_URL)}>Try the PearBrowser site</button>
                <button class="btn subtle" onClick=${() => { if (iframeRef.current) iframeRef.current.focus?.(); document.querySelector('.urlbar input')?.focus() }}>Focus the URL bar</button>
              </div>
              <div class="browse-welcome-tip">Tip: visit <strong>Apps</strong> to launch Keet, PearPass, and other Pear apps.</div>
            </div>
          </div>
        `}
    </div>
  `
}

function Apps ({ rpc, C, onLaunch }) {
  const [catalogKey, setCatalogKey] = useState('')
  const [catalog, setCatalog] = useState(null)
  const [installed, setInstalled] = useState([])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [pearLink, setPearLink] = useState('')
  const [launched, setLaunched] = useState('')

  const launchPearLink = async (overrideLink) => {
    const link = (typeof overrideLink === 'string' ? overrideLink : pearLink).trim()
    if (!link) return
    setErr(''); setBusy('pear-link'); setLaunched('')
    try {
      await rpc.request(C.CMD_LAUNCH_PEAR_LINK, { link }, 60000)
      setLaunched(`Launched ${link.slice(0, 60)}${link.length > 60 ? '…' : ''} in a new window.`)
      setPearLink('')
      setTimeout(() => setLaunched(''), 4000)
    } catch (e) {
      setErr(`launch: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const refreshInstalled = async () => {
    try {
      const list = await rpc.request(C.CMD_LIST_INSTALLED)
      setInstalled(Array.isArray(list) ? list : (list?.apps ?? []))
    } catch (e) {
      setErr(`list failed: ${e.message}`)
    }
  }

  useEffect(() => { refreshInstalled() }, [])

  const loadCatalog = async () => {
    const key = catalogKey.trim()
    if (!key) return
    setErr(''); setBusy('catalog'); setCatalog(null)
    try {
      const data = await rpc.request(C.CMD_LOAD_CATALOG, { keyHex: key })
      setCatalog(data)
    } catch (e) {
      setErr(`catalog: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const installApp = async (app) => {
    setErr(''); setBusy(`install:${app.id}`)
    try {
      await rpc.request(C.CMD_INSTALL_APP, app, 120000)
      await refreshInstalled()
    } catch (e) {
      setErr(`install ${app.name}: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const uninstallApp = async (app) => {
    setErr(''); setBusy(`uninstall:${app.id}`)
    try {
      await rpc.request(C.CMD_UNINSTALL_APP, { id: app.id })
      await refreshInstalled()
    } catch (e) {
      setErr(`uninstall ${app.name}: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const launchApp = async (app) => {
    setErr(''); setBusy(`launch:${app.id}`)
    try {
      const res = await rpc.request(C.CMD_LAUNCH_APP, { id: app.id })
      onLaunch(res.localUrl)
    } catch (e) {
      setErr(`launch ${app.name}: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const isInstalled = (id) => installed.some((a) => a.id === id)

  return html`
    <div class="apps">
      <h1>Apps</h1>
      <p class="subtitle">Launch any Pear app by link, or browse a HiveRelay catalog.</p>

      <h2>Featured</h2>
      <div class="app-grid">
        ${FEATURED_APPS.map((app) => html`
          <div class="app-card" key=${app.id}>
            <div class="app-icon app-icon-fallback" style=${{ background: app.gradient, color: '#0b0e14' }}>${app.initial}</div>
            <div class="app-info">
              <div class="app-name">${app.name}</div>
              <div class="app-desc">${app.tagline}</div>
              <div class="app-meta">${app.link}</div>
            </div>
            <div class="app-actions">
              <button class="btn primary" onClick=${() => launchPearLink(app.link)} disabled=${busy === 'pear-link'}>Launch</button>
            </div>
          </div>
        `)}
      </div>

      <h2>Launch a Pear app</h2>
      <div class="catalog-loader">
        <input
          type="text"
          placeholder="pear://&lt;key&gt; — opens in a new window"
          value=${pearLink}
          onInput=${(e) => setPearLink(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && launchPearLink()}
          spellcheck="false"
        />
        <button class="btn primary" onClick=${launchPearLink} disabled=${!pearLink || busy === 'pear-link'}>
          ${busy === 'pear-link' ? 'Launching…' : 'Launch'}
        </button>
      </div>
      ${launched && html`<div class="apps-ok">${launched}</div>`}

      <h2>App Catalog</h2>
      <div class="catalog-loader">
        <input
          type="text"
          placeholder="Catalog drive key (hex or z32)"
          value=${catalogKey}
          onInput=${(e) => setCatalogKey(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && loadCatalog()}
          spellcheck="false"
        />
        <button class="btn primary" onClick=${loadCatalog} disabled=${!catalogKey || busy === 'catalog'}>
          ${busy === 'catalog' ? 'Loading…' : 'Load catalog'}
        </button>
      </div>
      ${err && html`<div class="apps-error">${err}</div>`}

      ${catalog && html`
        <h2>${catalog.name || 'Catalog'} · ${catalog.apps?.length ?? 0} apps</h2>
        <div class="app-grid">
          ${(catalog.apps ?? []).map((app) => html`
            <div class="app-card" key=${app.id}>
              ${app.iconData
                ? html`<img src=${app.iconData} alt="" class="app-icon" />`
                : html`<div class="app-icon app-icon-fallback">${(app.name || '?').charAt(0)}</div>`}
              <div class="app-info">
                <div class="app-name">${app.name}</div>
                <div class="app-desc">${app.description || ''}</div>
                <div class="app-meta">${app.version ? 'v' + app.version : ''} ${app.author ? '· ' + app.author : ''}</div>
              </div>
              <div class="app-actions">
                ${isInstalled(app.id)
                  ? html`
                    <button class="btn" onClick=${() => launchApp(app)} disabled=${busy === `launch:${app.id}`}>Launch</button>
                    <button class="btn subtle" onClick=${() => uninstallApp(app)} disabled=${busy === `uninstall:${app.id}`}>Uninstall</button>
                  `
                  : html`
                    <button class="btn primary" onClick=${() => installApp(app)} disabled=${busy === `install:${app.id}`}>
                      ${busy === `install:${app.id}` ? 'Installing…' : 'Install'}
                    </button>
                  `}
              </div>
            </div>
          `)}
        </div>
      `}

      <h2>Installed</h2>
      ${installed.length === 0
        ? html`<p class="placeholder">No apps installed yet.</p>`
        : html`<div class="app-grid">
            ${installed.map((app) => html`
              <div class="app-card" key=${app.id}>
                <div class="app-icon app-icon-fallback">${(app.name || '?').charAt(0)}</div>
                <div class="app-info">
                  <div class="app-name">${app.name}</div>
                  <div class="app-meta">v${app.version || '?'}</div>
                </div>
                <div class="app-actions">
                  <button class="btn" onClick=${() => launchApp(app)} disabled=${busy === `launch:${app.id}`}>Launch</button>
                  <button class="btn subtle" onClick=${() => uninstallApp(app)} disabled=${busy === `uninstall:${app.id}`}>Uninstall</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `
}

function Library ({ rpc, C, onBrowse }) {
  const [bookmarks, setBookmarks] = useState([])
  const [history, setHistory] = useState([])
  const [err, setErr] = useState('')

  const refresh = async () => {
    try {
      const b = await rpc.request(C.CMD_USERDATA_LIST_BOOKMARKS)
      setBookmarks(Array.isArray(b) ? b : (b?.bookmarks ?? []))
      const h = await rpc.request(C.CMD_USERDATA_LIST_HISTORY, { limit: 200 })
      setHistory(Array.isArray(h) ? h : (h?.history ?? []))
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  const removeBookmark = async (url) => {
    try {
      await rpc.request(C.CMD_USERDATA_REMOVE_BOOKMARK, { url })
      refresh()
    } catch (e) { setErr(e.message) }
  }

  const clearHistory = async () => {
    if (!confirm('Clear all browsing history?')) return
    try {
      await rpc.request(C.CMD_USERDATA_CLEAR_HISTORY)
      refresh()
    } catch (e) { setErr(e.message) }
  }

  return html`
    <div class="library">
      <h1>Library</h1>
      <p class="subtitle">Your saved bookmarks and recent browsing history, stored locally in your Hyperbee.</p>
      ${err && html`<div class="apps-error">${err}</div>`}

      <h2>Bookmarks (${bookmarks.length})</h2>
      ${bookmarks.length === 0
        ? html`<p class="placeholder">No bookmarks yet. In the Browse tab, right-click the URL bar to bookmark the current page (coming soon) — or use the button on a hyperdrive page.</p>`
        : html`<div class="library-list">
            ${bookmarks.map((b) => html`
              <div class="library-row" key=${b.url}>
                <div class="library-row-main">
                  <div class="library-title">${b.title || b.url}</div>
                  <div class="library-url">${b.url}</div>
                </div>
                <button class="btn small" onClick=${() => onBrowse(b.url)}>Open</button>
                <button class="btn small subtle" onClick=${() => removeBookmark(b.url)}>Remove</button>
              </div>
            `)}
          </div>`}

      <div class="library-history-head">
        <h2>History (${history.length})</h2>
        ${history.length > 0 && html`<button class="btn small subtle" onClick=${clearHistory}>Clear history</button>`}
      </div>
      ${history.length === 0
        ? html`<p class="placeholder">No browsing history yet.</p>`
        : html`<div class="library-list">
            ${history.slice(0, 100).map((h, i) => html`
              <div class="library-row" key=${(h.url || '') + ':' + i}>
                <div class="library-row-main">
                  <div class="library-title">${h.title || h.url}</div>
                  <div class="library-url">${h.url} ${h.visitedAt ? '· ' + new Date(h.visitedAt).toLocaleString() : ''}</div>
                </div>
                <button class="btn small" onClick=${() => onBrowse(h.url)}>Open</button>
              </div>
            `)}
          </div>`}
    </div>
  `
}

function Settings ({ rpc, C, status, storagePath, log }) {
  const [identity, setIdentity] = useState(null)
  const [seedPhrase, setSeedPhrase] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    rpc.request(C.CMD_GET_IDENTITY).then(setIdentity).catch((e) => setErr(e.message))
  }, [])

  const revealPhrase = async () => {
    if (seedPhrase) { setSeedPhrase(null); return }
    setErr(''); setBusy('reveal')
    try {
      const res = await rpc.request(C.CMD_IDENTITY_EXPORT_PHRASE)
      setSeedPhrase(res.mnemonic)
    } catch (e) { setErr(e.message) }
    finally { setBusy(null) }
  }

  const clearCache = async () => {
    if (!confirm('Clear all cached drives + proxy cache? Installed apps and your sites are NOT affected.')) return
    setErr(''); setBusy('cache')
    try {
      const res = await rpc.request(C.CMD_CLEAR_CACHE)
      alert(`Cleared: ${res.message || res.cleared + ' items'}`)
    } catch (e) { setErr(e.message) }
    finally { setBusy(null) }
  }

  const resetApp = async () => {
    if (!confirm('Reset app data?\n\nThis will:\n  1. Unseed every pinned site from HiveRelay\n  2. Wipe all local state (sites, apps, bookmarks, identity)\n  3. Quit the app\n\nCopy any drive keys you want to keep first!')) return
    if (!confirm('Are you ABSOLUTELY sure? This cannot be undone.')) return
    setErr(''); setBusy('reset')
    try {
      const res = await rpc.request(C.CMD_RESET_APP, {}, 60000)
      alert(`Unseeded ${res.unseeded?.length ?? 0} site(s). App will now quit. Relaunch to start fresh.`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  return html`
    <div class="settings">
      <h1>Settings</h1>
      <p class="subtitle">Identity, infrastructure, and diagnostics for your peer-to-peer browser.</p>
      ${err && html`<div class="apps-error">${err}</div>`}

      <h2>Identity</h2>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Your peer public key</div>
            <code class="settings-code">${identity?.publicKey || '(loading…)'}</code>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Backup phrase</div>
            <div class="settings-subtle">${identity?.hasBackupPhrase ? `${identity.mnemonicWordCount}-word BIP39 mnemonic` : 'not available'}</div>
          </div>
          <button class="btn" onClick=${revealPhrase} disabled=${busy === 'reveal' || !identity?.hasBackupPhrase}>
            ${seedPhrase ? 'Hide' : 'Reveal phrase'}
          </button>
        </div>
        ${seedPhrase && html`
          <pre class="seed-phrase">${seedPhrase}</pre>
          <div class="settings-warning">Write this down. Anyone with these words controls your identity.</div>
        `}
      </div>

      <h2>HiveRelay Network</h2>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Connected relays</div>
            <div class="settings-subtle">${status.hiveRelays || 0} HiveRelay(s) reachable via the DHT right now</div>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Default replication factor</div>
            <div class="settings-subtle">3 relays per published site (configurable per-publish in a future release)</div>
          </div>
        </div>
      </div>

      <h2>Live status</h2>
      <pre class="boot-log">${JSON.stringify(status, null, 2)}</pre>

      <h2>Storage</h2>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Path</div>
            <code class="settings-code">${storagePath}</code>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Usage</div>
            <div class="settings-subtle">${status.storageUsed ? (status.storageUsed / 1048576).toFixed(1) + ' MB' : '—'} / ${status.storageLimit ? (status.storageLimit / 1048576).toFixed(0) + ' MB' : '—'}</div>
          </div>
          <button class="btn subtle" onClick=${clearCache} disabled=${busy === 'cache'}>Clear cache</button>
        </div>
      </div>

      <h2>Danger zone</h2>
      <div class="settings-card danger">
        <div class="settings-row">
          <div>
            <div class="settings-label">Reset app data</div>
            <div class="settings-subtle">Unseeds every published site from HiveRelay first (only possible while your publisher keypair is intact), then wipes local storage and quits. You'll start fresh on next launch. <strong>Copy your drive keys before doing this.</strong></div>
          </div>
          <button class="btn subtle danger" onClick=${resetApp} disabled=${busy === 'reset'}>${busy === 'reset' ? 'Resetting…' : 'Reset data'}</button>
        </div>
      </div>

      <h2>Boot log</h2>
      <pre class="boot-log">${log.join('\n') || '(events arrived pre-mount — check status above)'}</pre>
    </div>
  `
}

const BLOCK_TEMPLATES = {
  heading: () => ({ type: 'heading', level: 1, text: 'New heading' }),
  text: () => ({ type: 'text', text: 'Write something.' }),
  image: () => ({ type: 'image', src: 'https://', alt: '' }),
  link: () => ({ type: 'link', href: 'https://', text: 'Link text' }),
  html: () => ({ type: 'html', text: '<div>\n  <!-- Raw HTML / CSS / JS — rendered as-is -->\n</div>' }),
  code: () => ({ type: 'code', text: '// code sample — shown as text' }),
  quote: () => ({ type: 'quote', text: 'A quote.' }),
  list: () => ({ type: 'list', items: ['Item 1', 'Item 2'] }),
  divider: () => ({ type: 'divider' })
}

function BlockEditor ({ block, onChange }) {
  const update = (patch) => onChange({ ...block, ...patch })
  switch (block.type) {
    case 'heading':
      return html`
        <div class="block-fields">
          <select value=${block.level} onChange=${(e) => update({ level: +e.target.value })}>
            ${[1, 2, 3].map((n) => html`<option value=${n}>H${n}</option>`)}
          </select>
          <input type="text" value=${block.text} onInput=${(e) => update({ text: e.target.value })} />
        </div>
      `
    case 'text':
    case 'quote':
    case 'code':
    case 'html':
      return html`<textarea rows=${block.type === 'html' ? 8 : (block.type === 'code' ? 4 : 2)} value=${block.text} placeholder=${block.type === 'html' ? 'Paste raw HTML, CSS, or <script> — rendered as part of the page' : ''} onInput=${(e) => update({ text: e.target.value })}></textarea>`
    case 'image':
      return html`
        <div class="block-fields">
          <input type="text" placeholder="src (https://…)" value=${block.src} onInput=${(e) => update({ src: e.target.value })} />
          <input type="text" placeholder="alt text" value=${block.alt} onInput=${(e) => update({ alt: e.target.value })} />
        </div>
      `
    case 'link':
      return html`
        <div class="block-fields">
          <input type="text" placeholder="href" value=${block.href} onInput=${(e) => update({ href: e.target.value })} />
          <input type="text" placeholder="text" value=${block.text} onInput=${(e) => update({ text: e.target.value })} />
        </div>
      `
    case 'list':
      return html`<textarea rows=${Math.max(2, block.items.length)} placeholder="One item per line" value=${block.items.join('\n')} onInput=${(e) => update({ items: e.target.value.split('\n') })}></textarea>`
    case 'divider':
      return html`<div class="placeholder">— divider —</div>`
    default:
      return html`<div class="placeholder">unknown block: ${block.type}</div>`
  }
}

function SiteEditor ({ site, rpc, C, onBack, onBrowse }) {
  const [name, setName] = useState(site.name || '')
  const [blocks, setBlocks] = useState(site.blocks || [])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [meta, setMeta] = useState({ keyHex: site.keyHex, published: site.published })
  const [loaded, setLoaded] = useState(!site.published)

  useEffect(() => {
    if (loaded || !site.siteId) return
    ;(async () => {
      try {
        const res = await rpc.request(C.CMD_GET_SITE_BLOCKS, { siteId: site.siteId })
        if (Array.isArray(res?.blocks) && res.blocks.length > 0) setBlocks(res.blocks)
      } catch {}
      setLoaded(true)
    })()
  }, [site.siteId])

  const addBlock = (type) => setBlocks((b) => [...b, BLOCK_TEMPLATES[type]()])
  const updateBlock = (i, next) => setBlocks((b) => b.map((x, j) => j === i ? next : x))
  const removeBlock = (i) => setBlocks((b) => b.filter((_, j) => j !== i))
  const moveBlock = (i, dir) => setBlocks((b) => {
    const j = i + dir
    if (j < 0 || j >= b.length) return b
    const next = [...b]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const save = async () => {
    setErr(''); setBusy('save')
    try {
      await rpc.request(C.CMD_UPDATE_SITE, { siteId: site.siteId, blocks, name })
    } catch (e) {
      setErr(`save: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const publish = async () => {
    setErr(''); setBusy('publish')
    try {
      await rpc.request(C.CMD_UPDATE_SITE, { siteId: site.siteId, blocks, name })
      const res = await rpc.request(C.CMD_PUBLISH_SITE, { siteId: site.siteId }, 120000)
      setMeta({ keyHex: res.keyHex, published: true, pin: res.pin })
    } catch (e) {
      setErr(`publish: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const unpublish = async () => {
    setErr(''); setBusy('unpublish')
    try {
      await rpc.request(C.CMD_UNPUBLISH_SITE, { siteId: site.siteId })
      setMeta((m) => ({ ...m, published: false }))
    } catch (e) {
      setErr(`unpublish: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  return html`
    <div class="site-editor">
      <div class="site-editor-bar">
        <button class="btn subtle" onClick=${onBack}>← Sites</button>
        <input class="site-name-input" type="text" placeholder="Site name" value=${name} onInput=${(e) => setName(e.target.value)} />
        <div class="spacer"></div>
        <button class="btn" onClick=${save} disabled=${busy === 'save'} title="Write block changes to the drive — peers see updates live">${busy === 'save' ? 'Saving…' : 'Save'}</button>
        ${meta.published
          ? html`<button class="btn subtle" onClick=${unpublish} disabled=${busy === 'unpublish'}>${busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}</button>`
          : html`<button class="btn primary" onClick=${publish} disabled=${busy === 'publish'} title="Seeds via Hyperswarm and pins to HiveRelay for 24/7 availability">${busy === 'publish' ? 'Publishing…' : 'Publish & Pin'}</button>`}
      </div>

      ${err && html`<div class="apps-error">${err}</div>`}

      ${meta.published && meta.keyHex && html`
        <div class="site-published">
          <div class="site-published-row">
            <span>Published at</span>
            <code>hyper://${meta.keyHex}/</code>
            <button class="btn small" onClick=${() => copyText(`hyper://${meta.keyHex}/`)} title="Copy hyper:// URL">📋 Copy</button>
            <button class="btn" onClick=${() => onBrowse(`hyper://${meta.keyHex}/`)}>Open in Browse</button>
          </div>
          <div class="site-published-row subtle">
            <span>Drive key</span>
            <code class="key-mono">${meta.keyHex}</code>
            <button class="btn small subtle" onClick=${() => copyText(meta.keyHex)} title="Copy raw key">📋 Key</button>
          </div>
          <div class="site-pin-row ${meta.pin?.replicatedPeers > 0 ? 'ok' : 'warn'}">
            ${meta.pin?.replicatedPeers > 0
              ? html`<span>📌 Replicated to ${meta.pin.replicatedPeers} HiveRelay peer${meta.pin.replicatedPeers === 1 ? '' : 's'} (of ${meta.pin.acceptances} accepted). Safe to close the app — stays online 24/7.</span>`
              : meta.pin?.ok
                ? html`<span>📡 <strong>${meta.pin.acceptances} relay${meta.pin.acceptances === 1 ? '' : 's'} accepted</strong> your pin request, but none have pulled the content yet. The public HiveRelay network may take minutes or may not replicate at all. Your site is reachable via Hyperswarm as long as this app is running. Share your drive key now; keep the app open until you're sure someone's replicated it.</span>`
                : html`<span>⚠️ Seeded P2P locally only. ${meta.pin?.connectedRelays > 0 ? `Connected to ${meta.pin.connectedRelays} relay(s) but none accepted the seed request.` : 'No HiveRelays connected yet; retry in a moment.'} Site is reachable while this app is running.</span>`}
          </div>
          <div class="site-save-warning">
            💾 <strong>Save this key now.</strong> It's the only way to recover this site if you reset app data. Anyone with the key can reach your site; only this machine's publisher keypair can unseed it.
          </div>
        </div>
      `}

      <div class="blocks">
        ${blocks.length === 0 && html`<p class="placeholder">No blocks yet. Add one below.</p>`}
        ${blocks.map((block, i) => html`
          <div class="block" key=${i}>
            <div class="block-header">
              <span class="block-type">${block.type}</span>
              <div class="spacer"></div>
              <button class="btn subtle small" onClick=${() => moveBlock(i, -1)} disabled=${i === 0}>↑</button>
              <button class="btn subtle small" onClick=${() => moveBlock(i, 1)} disabled=${i === blocks.length - 1}>↓</button>
              <button class="btn subtle small" onClick=${() => removeBlock(i)}>✕</button>
            </div>
            <${BlockEditor} block=${block} onChange=${(next) => updateBlock(i, next)} />
          </div>
        `)}
      </div>

      <div class="add-block-row">
        <span class="placeholder">Add:</span>
        ${Object.keys(BLOCK_TEMPLATES).map((t) => html`
          <button class="btn subtle small" onClick=${() => addBlock(t)}>${t}</button>
        `)}
      </div>
    </div>
  `
}

function Sites ({ rpc, C, onBrowse }) {
  const [sites, setSites] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [newName, setNewName] = useState('')
  // Callback ref stored in a ref-box so htm definitely wires it.
  const inputBox = useRef({ el: null })
  const setInputRef = (el) => { inputBox.current.el = el }

  const refresh = async () => {
    try {
      const list = await rpc.request(C.CMD_LIST_SITES)
      setSites(Array.isArray(list) ? list : (list?.sites ?? []))
    } catch (e) {
      setErr(`list: ${e.message}`)
    }
  }

  useEffect(() => { refresh() }, [])

  const createSite = async () => {
    if (busy === 'create') return
    const el = document.querySelector('.site-name-field')
    const raw = el?.value ?? ''
    const n = raw.trim() || 'Untitled'
    setErr(''); setBusy('create')
    try {
      const res = await rpc.request(C.CMD_CREATE_SITE, { name: n }, 120000)
      if (el) el.value = ''
      await refresh()
      setEditing({ siteId: res.siteId ?? res.id, name: n, blocks: [] })
    } catch (e) {
      setErr(`create: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const deleteSite = async (site) => {
    if (!confirm(`Delete "${site.name}"?`)) return
    setErr(''); setBusy(`del:${site.siteId}`)
    try {
      await rpc.request(C.CMD_DELETE_SITE, { siteId: site.siteId })
      await refresh()
    } catch (e) {
      setErr(`delete: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  if (editing) {
    return html`<${SiteEditor} site=${editing} rpc=${rpc} C=${C} onBack=${() => { setEditing(null); refresh() }} onBrowse=${onBrowse} />`
  }

  return html`
    <div class="sites">
      <h1>Sites</h1>
      <p class="subtitle">Browse P2P sites or create your own — published to the HiveRelay network for 24/7 availability.</p>
      <div class="catalog-loader">
        <input
          class="site-name-field"
          type="text"
          placeholder="New site name…"
          onKeyDown=${(e) => e.key === 'Enter' && createSite()}
        />
        <button class="btn primary" onClick=${createSite} disabled=${busy === 'create'}>
          ${busy === 'create' ? 'Creating…' : 'Create site'}
        </button>
      </div>
      ${err && html`<div class="apps-error">${err}</div>`}

      ${sites.length === 0
        ? html`<p class="placeholder">No sites yet. Create one above.</p>`
        : html`<div class="app-grid">
            ${sites.map((site) => html`
              <div class="app-card" key=${site.siteId}>
                <div class="app-icon app-icon-fallback">${(site.name || '?').charAt(0)}</div>
                <div class="app-info">
                  <div class="app-name">${site.name}</div>
                  <div class="app-meta">${site.published ? 'published · ' + (site.keyHex?.slice(0, 8) ?? '') + '…' : 'draft'}</div>
                </div>
                <div class="app-actions">
                  <button class="btn" onClick=${() => setEditing(site)}>Edit</button>
                  ${site.published && site.keyHex && html`<button class="btn subtle" onClick=${() => onBrowse(`hyper://${site.keyHex}/`)}>Open</button>`}
                  ${site.published && site.keyHex && html`<button class="btn subtle" onClick=${() => copyText(`hyper://${site.keyHex}/`)}>📋 Copy</button>`}
                  <button class="btn subtle" onClick=${() => deleteSite(site)} disabled=${busy === `del:${site.siteId}`}>Delete</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `
}

export function App ({ rpc, C, storagePath }) {
  const [tab, setTab] = useState('browse')
  const [navUrl, setNavUrl] = useState(null)
  const [status, setStatus] = useState({ stage: 'booting', peerCount: 0, dhtConnected: false, ready: false, proxyPort: null })
  const [log, setLog] = useState([])

  useEffect(() => {
    const appendLog = (line) => setLog((l) => [...l.slice(-200), line])

    const onBoot = (e) => { appendLog(`[${e.detail.stage}] ${e.detail.message || ''}`); setStatus((s) => ({ ...s, stage: e.detail.stage })) }
    const onReady = (e) => { appendLog(`[ready] HTTP proxy on port ${e.detail.port}`); setStatus((s) => ({ ...s, ready: true, proxyPort: e.detail.port, stage: 'ready' })) }
    const onPeer = (e) => setStatus((s) => ({ ...s, peerCount: e.detail.peerCount }))
    const onErr = (e) => appendLog(`[error] ${e.detail?.message || JSON.stringify(e.detail)}`)

    rpc.addEventListener(`event:${C.EVT_BOOT_PROGRESS}`, onBoot)
    rpc.addEventListener(`event:${C.EVT_READY}`, onReady)
    rpc.addEventListener(`event:${C.EVT_PEER_COUNT}`, onPeer)
    rpc.addEventListener(`event:${C.EVT_ERROR}`, onErr)

    const poll = setInterval(async () => {
      try {
        const s = await rpc.request(C.CMD_GET_STATUS)
        setStatus((prev) => ({ ...prev, ...s }))
      } catch {}
    }, 3000)

    return () => {
      clearInterval(poll)
      rpc.removeEventListener(`event:${C.EVT_BOOT_PROGRESS}`, onBoot)
      rpc.removeEventListener(`event:${C.EVT_READY}`, onReady)
      rpc.removeEventListener(`event:${C.EVT_PEER_COUNT}`, onPeer)
      rpc.removeEventListener(`event:${C.EVT_ERROR}`, onErr)
    }
  }, [rpc, C])

  const launchInBrowse = (url) => {
    setNavUrl(url)
    setTab('browse')
  }

  const isReady = status.ready || !!status.proxyPort
  const statusClass = !isReady ? 'booting' : (status.dhtConnected ? 'ok' : 'err')
  const statusText = !isReady
    ? `Booting: ${status.stage}`
    : `DHT · ${status.peerCount} peer${status.peerCount === 1 ? '' : 's'} · ${status.hiveRelays || 0} relay${status.hiveRelays === 1 ? '' : 's'} · proxy :${status.proxyPort}`

  return html`
    <div class="app">
      <div class="topbar">
        <div class="brand">
          <${Logo} size=${22} />
          <${Wordmark} />
        </div>
        <div class="tabs">
          ${Object.entries(TAB_META).map(([id, m]) => html`
            <button class=${'tab' + (tab === id ? ' active' : '')} onClick=${() => setTab(id)} key=${id}>
              <span class="tab-icon">${m.icon}</span>
              <span class="tab-label">${m.label}</span>
            </button>
          `)}
        </div>
        <div class="topbar-spacer"></div>
      </div>

      <div class=${'panel' + (tab === 'browse' ? ' panel-browse' : '')}>
        ${tab === 'browse' && html`<${Browse} rpc=${rpc} C=${C} navUrl=${navUrl} onNavigated=${() => setNavUrl(null)} />`}
        ${tab === 'apps' && html`<${Apps} rpc=${rpc} C=${C} onLaunch=${launchInBrowse} />`}
        ${tab === 'sites' && html`<${Sites} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} />`}
        ${tab === 'library' && html`<${Library} rpc=${rpc} C=${C} onBrowse=${launchInBrowse} />`}
        ${tab === 'settings' && html`<${Settings} rpc=${rpc} C=${C} status=${status} storagePath=${storagePath} log=${log} />`}
      </div>

      <div class=${'status ' + statusClass}>
        <span class="dot"></span>${statusText}
      </div>
    </div>
  `
}
