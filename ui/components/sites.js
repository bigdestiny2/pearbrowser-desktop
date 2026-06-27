import { useEffect, useRef, useState } from 'react'
import { html } from 'htm/react'
import { AddToCatalogButton, useMyCatalogWriter } from './catalog-actions.js'
import { AppIcon } from './app-icon.js'
import { FederatedSearch } from './federated-search.js'
import { usePermissionEvidence } from './permission-evidence.js'
import { ShipCheckReport } from './ship-check-report.js'
import { SiteTrustBadges } from './trust-widgets.js'
import { catalogEntryFromPublishedSite } from '../lib/catalog-provenance.js'
import { dedupeApps } from '../lib/catalog-apps.js'

function copyText (text) {
  try {
    navigator.clipboard?.writeText(text)
  } catch {}
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
        <div className="block-fields">
          <select value=${block.level} onChange=${(e) => update({ level: +e.target.value })}>
            ${[1, 2, 3].map((n) => html`<option key=${n} value=${n}>H${n}</option>`)}
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
        <div className="block-fields">
          <input type="text" placeholder="src (https://…)" value=${block.src} onInput=${(e) => update({ src: e.target.value })} />
          <input type="text" placeholder="alt text" value=${block.alt} onInput=${(e) => update({ alt: e.target.value })} />
        </div>
      `
    case 'link':
      return html`
        <div className="block-fields">
          <input type="text" placeholder="href" value=${block.href} onInput=${(e) => update({ href: e.target.value })} />
          <input type="text" placeholder="text" value=${block.text} onInput=${(e) => update({ text: e.target.value })} />
        </div>
      `
    case 'list':
      return html`<textarea rows=${Math.max(2, block.items.length)} placeholder="One item per line" value=${block.items.join('\n')} onInput=${(e) => update({ items: e.target.value.split('\n') })}></textarea>`
    case 'divider':
      return html`<div className="placeholder">— divider —</div>`
    default:
      return html`<div className="placeholder">unknown block: ${block.type}</div>`
  }
}

function SiteEditor ({ site, rpc, C, onBack, onBrowse }) {
  const [name, setName] = useState(site.name || '')
  const [blocks, setBlocks] = useState(site.blocks || [])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [meta, setMeta] = useState({ keyHex: site.keyHex, published: site.published })
  const [loaded, setLoaded] = useState(!site.published)
  const [shipCheck, setShipCheck] = useState(null)
  const [iconOk, setIconOk] = useState(false)
  const catalogActions = useMyCatalogWriter(rpc, C)

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

  const shipCheckPayload = (extra = {}) => ({
    kind: 'site',
    siteId: site.siteId,
    name,
    blocks,
    keyHex: meta.keyHex,
    published: meta.published,
    pin: meta.pin || null,
    ...extra
  })

  const runShipCheck = async (extra = {}) => {
    setErr(''); setBusy('ship-check')
    try {
      const res = await rpc.request(C.CMD_SHIP_CHECK, shipCheckPayload(extra), 30000)
      setShipCheck(res)
    } catch (e) {
      setErr(`ship check: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const runFreshPeerVerifier = async () => {
    setErr(''); setBusy('verify')
    try {
      const proof = await rpc.request(C.CMD_RUN_FRESH_PEER_VERIFY, shipCheckPayload(), 130000)
      await runShipCheck({ verifierResult: proof })
    } catch (e) {
      setErr(`fresh-peer verifier: ${e.message}`)
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

  const uploadIcon = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > 512 * 1024) { setErr('icon: too large (max 512KB)'); e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = async () => {
      setErr(''); setIconOk(false); setBusy('icon')
      try {
        await rpc.request(C.CMD_SET_SITE_ICON, { siteId: site.siteId, dataUrl: reader.result })
        setIconOk(true); setTimeout(() => setIconOk(false), 2500)
      } catch (err) { setErr(`icon: ${err.message}`) }
      finally { setBusy(null); if (e.target) e.target.value = '' }
    }
    reader.readAsDataURL(file)
  }

  const publishedCatalogApp = meta.published && meta.keyHex
    ? catalogEntryFromPublishedSite({ keyHex: meta.keyHex, name, pin: meta.pin })
    : null

  return html`
    <div className="site-editor">
      <div className="site-editor-bar">
        <button className="btn subtle" onClick=${onBack}>← Sites</button>
        <input className="site-name-input" type="text" placeholder="Site name" value=${name} onInput=${(e) => setName(e.target.value)} />
        <div className="spacer"></div>
        <label className="btn subtle" title="Upload a site icon (SVG/PNG/JPEG/WebP, ≤512KB) — shows in the browser's site list">
          ${busy === 'icon' ? 'Uploading…' : (iconOk ? '✓ Icon set' : '🖼 Icon')}
          <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" style=${{ display: 'none' }} onChange=${uploadIcon} />
        </label>
        <button className="btn" onClick=${() => runShipCheck()} disabled=${busy === 'ship-check'} title="Run local publishing diagnostics">${busy === 'ship-check' ? 'Checking...' : 'Ship check'}</button>
        <button className="btn" onClick=${save} disabled=${busy === 'save'} title="Write block changes to the drive — peers see updates live">${busy === 'save' ? 'Saving…' : 'Save'}</button>
        ${meta.published
          ? html`<button key="unpublish" className="btn subtle" onClick=${unpublish} disabled=${busy === 'unpublish'}>${busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}</button>`
          : html`<button key="publish" className="btn primary" onClick=${publish} disabled=${busy === 'publish'} title="Seeds via Hyperswarm and pins to HiveRelay for 24/7 availability">${busy === 'publish' ? 'Publishing…' : 'Publish & Pin'}</button>`}
      </div>

      ${err && html`<div className="apps-error">${err}</div>`}
      ${catalogActions.err && html`<div className="apps-error">${catalogActions.err}</div>`}
      ${catalogActions.notice && html`<div className="apps-ok">${catalogActions.notice}</div>`}
      <${ShipCheckReport} report=${shipCheck} onRunVerifier=${runFreshPeerVerifier} verifying=${busy === 'verify'} />

      ${meta.published && meta.keyHex && html`
        <div className="site-published">
          <div className="site-published-row">
            <span>Published at</span>
            <code>hyper://${meta.keyHex}/</code>
            <button className="btn small" onClick=${() => copyText(`hyper://${meta.keyHex}/`)} title="Copy hyper:// URL">📋 Copy</button>
            <button className="btn" onClick=${() => onBrowse(`hyper://${meta.keyHex}/`)}>Open in Browse</button>
            <${AddToCatalogButton} catalogActions=${catalogActions} app=${publishedCatalogApp} className="btn small subtle" label="Add to My Catalog" />
          </div>
          <div className="site-published-row subtle">
            <span>Drive key</span>
            <code className="key-mono">${meta.keyHex}</code>
            <button className="btn small subtle" onClick=${() => copyText(meta.keyHex)} title="Copy raw key">📋 Key</button>
          </div>
          <div className="site-pin-row ${meta.pin?.replicatedPeers > 0 ? 'ok' : 'warn'}">
            ${meta.pin?.replicatedPeers > 0
              ? html`<span>📌 Replicated to ${meta.pin.replicatedPeers} HiveRelay peer${meta.pin.replicatedPeers === 1 ? '' : 's'} (of ${meta.pin.acceptances} accepted). Safe to close the app — stays online 24/7.</span>`
              : meta.pin?.ok
                ? html`<span>📡 <strong>${meta.pin.acceptances} relay${meta.pin.acceptances === 1 ? '' : 's'} accepted</strong> your pin request, but none have pulled the content yet. The public HiveRelay network may take minutes or may not replicate at all. Your site is reachable via Hyperswarm as long as this app is running. Share your drive key now; keep the app open until you're sure someone's replicated it.</span>`
                : html`<span>⚠️ Seeded P2P locally only. ${meta.pin?.connectedRelays > 0 ? `Connected to ${meta.pin.connectedRelays} relay(s) but none accepted the seed request.` : 'No HiveRelays connected yet; retry in a moment.'} Site is reachable while this app is running.</span>`}
          </div>
          <div className="site-save-warning">
            💾 <strong>Save this key now.</strong> It's the only way to recover this site if you reset app data. Anyone with the key can reach your site; only this machine's publisher keypair can unseed it.
          </div>
        </div>
      `}

      <div className="blocks">
        ${blocks.length === 0 && html`<p className="placeholder">No blocks yet. Add one below.</p>`}
        ${blocks.map((block, i) => html`
          <div className="block" key=${i}>
            <div className="block-header">
              <span className="block-type">${block.type}</span>
              <div className="spacer"></div>
              <button className="btn subtle small" onClick=${() => moveBlock(i, -1)} disabled=${i === 0}>↑</button>
              <button className="btn subtle small" onClick=${() => moveBlock(i, 1)} disabled=${i === blocks.length - 1}>↓</button>
              <button className="btn subtle small" onClick=${() => removeBlock(i)}>✕</button>
            </div>
            <${BlockEditor} block=${block} onChange=${(next) => updateBlock(i, next)} />
          </div>
        `)}
      </div>

      <div className="add-block-row">
        <span className="placeholder">Add:</span>
        ${Object.keys(BLOCK_TEMPLATES).map((t) => html`
          <button key=${t} className="btn subtle small" onClick=${() => addBlock(t)}>${t}</button>
        `)}
      </div>
    </div>
  `
}

export function Sites ({ rpc, C, onBrowse, peeritDriveKey = '' }) {
  const [sites, setSites] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const permissions = usePermissionEvidence(rpc, C)
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

  const [discovered, setDiscovered] = useState([])
  const loadDiscovered = async () => {
    try {
      const res = await rpc.request(C.CMD_GET_CATALOG_APPS)
      const apps = Array.isArray(res) ? res : (res?.apps ?? [])
      const sites = apps.filter((a) => a && typeof a.driveKey === 'string' && /^[0-9a-f]{64}$/i.test(a.driveKey))
      const rank = (a) => (a.driveKey === peeritDriveKey ? 0
        : (Array.isArray(a.categories) && a.categories.includes('featured') ? 1 : 2))
      const ordered = dedupeApps(sites)
        .map((a, i) => ({ a, i }))
        .sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i)
        .map((e) => e.a)
      setDiscovered(ordered)
    } catch (e) { /* discovery is best-effort */ }
  }

  useEffect(() => { refresh(); loadDiscovered() }, [])

  const createSite = async () => {
    if (busy === 'create') return
    const el = inputBox.current.el || document.querySelector('.site-name-field')
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
    <div className="sites">
      <h1>P2P Sites</h1>
      <p className="subtitle">Search the peer-to-peer web, browse published sites, or create your own — all served 24/7 on the HiveRelay network.</p>

      <h2>Search the P2P web</h2>
      <${FederatedSearch} rpc=${rpc} C=${C} onBrowse=${onBrowse} placeholder="Search the peer-to-peer web…" />

      <h2>Published sites${discovered.length ? ` (${discovered.length})` : ''}</h2>
      <p className="subtitle">Live hyper:// sites pinned on the relay network — open any one in a tab.</p>
      ${discovered.length === 0
        ? html`<p className="placeholder">Loading published sites…</p>`
        : html`<div className="app-grid">
            ${discovered.map((s) => html`
              <div className="app-card" key=${s.driveKey}>
                <${AppIcon} rpc=${rpc} C=${C} driveKey=${s.driveKey} iconRef=${s.icon} iconData=${s.iconData} name=${s.name} />
                <div className="app-info">
                  <div className="app-name">${s.name}</div>
                  <div className="app-meta">${s.description || ('hyper://' + s.driveKey.slice(0, 10) + '…')}</div>
                  <${SiteTrustBadges} site=${s} permissions=${permissions} />
                </div>
                <div className="app-actions">
                  <button className="btn primary" onClick=${() => onBrowse('hyper://' + s.driveKey + '/')}>Open</button>
                  <button className="btn subtle" onClick=${() => copyText('hyper://' + s.driveKey + '/')}>📋 Copy</button>
                </div>
              </div>
            `)}
          </div>`}

      <h2>Your sites</h2>
      <p className="subtitle">Create and publish your own P2P site — auto-pinned to HiveRelay for 24/7 availability.</p>
      <div className="catalog-loader">
        <input
          ref=${setInputRef}
          className="site-name-field"
          type="text"
          placeholder="New site name…"
          onKeyDown=${(e) => e.key === 'Enter' && createSite()}
        />
        <button className="btn primary" onClick=${createSite} disabled=${busy === 'create'}>
          ${busy === 'create' ? 'Creating…' : 'Create site'}
        </button>
      </div>
      ${err && html`<div className="apps-error">${err}</div>`}

      ${sites.length === 0
        ? html`<p className="placeholder">No sites yet. Create one above.</p>`
        : html`<div className="app-grid">
            ${sites.map((site) => html`
              <div className="app-card" key=${site.siteId}>
                <${AppIcon} rpc=${rpc} C=${C} driveKey=${site.keyHex} name=${site.name} />
                <div className="app-info">
                  <div className="app-name">${site.name}</div>
                  <div className="app-meta">${site.published ? 'published · ' + (site.keyHex?.slice(0, 8) ?? '') + '…' : 'draft'}</div>
                  <${SiteTrustBadges} site=${site} owned=${true} permissions=${permissions} />
                </div>
                <div className="app-actions">
                  <button className="btn" onClick=${() => setEditing(site)}>Edit</button>
                  ${site.published && site.keyHex && html`<button className="btn subtle" onClick=${() => onBrowse(`hyper://${site.keyHex}/`)}>Open</button>`}
                  ${site.published && site.keyHex && html`<button className="btn subtle" onClick=${() => copyText(`hyper://${site.keyHex}/`)}>📋 Copy</button>`}
                  <button className="btn subtle" onClick=${() => deleteSite(site)} disabled=${busy === `del:${site.siteId}`}>Delete</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `
}
