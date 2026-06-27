import { useEffect, useRef, useState } from 'react'
import { html } from 'htm/react'
import { AddToCatalogButton, useMyCatalogWriter } from './catalog-actions.js'
import { SearchProvenanceBadges, SearchResultRow } from './search-results.js'

function TrustedPeers ({ rpc, C }) {
  const [invite, setInvite] = useState(null)
  const [peers, setPeers] = useState([])
  const [addUrl, setAddUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const load = async () => {
    try {
      setInvite(await rpc.request(C.CMD_CONTACTS_MY_INVITE))
      const res = await rpc.request(C.CMD_CONTACTS_LIST, { limit: 200 })
      setPeers(Array.isArray(res?.contacts) ? res.contacts : [])
    } catch (e) {
      setMsg(e.message)
    }
  }

  useEffect(() => { load() }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const add = async () => {
    const url = addUrl.trim()
    if (!url) return
    setMsg('')
    try {
      const res = await rpc.request(C.CMD_CONTACTS_ADD_INVITE, { url })
      const c = res?.contact || {}
      setAddUrl('')
      setMsg(`Added ${c.displayName || (c.pubkey ? c.pubkey.slice(0, 12) + '...' : 'contact')}${c.bindingKey ? ' - searchable' : ''}`)
      load()
    } catch (e) {
      setMsg(`Couldn't add: ${e.message}`)
    }
  }

  return html`
    <details className="trusted-peers">
      <summary>Trusted peers for federated search (${peers.length})</summary>
      <div className="tp-body">
        <p className="subtitle">Share your invite so a peer can add you; paste theirs to search their content. Peer results are cryptographically verified before they're shown.</p>
        ${invite && html`
          <div className="tp-field">
            <label>Your invite</label>
            <div className="tp-row">
              <input className="profile-input" readOnly value=${invite.url} onClick=${(e) => e.target.select()} />
              <button className="btn small" onClick=${copy}>${copied ? 'Copied' : 'Copy'}</button>
            </div>
          </div>`}
        <div className="tp-field">
          <label>Add a peer</label>
          <div className="tp-row">
            <input className="profile-input" placeholder="Paste a pear://contact invite..." value=${addUrl}
                   onInput=${(e) => setAddUrl(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && add()} />
            <button className="btn small primary" onClick=${add} disabled=${!addUrl.trim()}>Add</button>
          </div>
        </div>
        ${msg && html`<div className="tp-msg">${msg}</div>`}
        ${peers.length > 0 && html`
          <ul className="tp-list">
            ${peers.map((p) => html`
              <li key=${p.pubkey}>
                <span className="tp-name">${p.displayName || (p.pubkey.slice(0, 16) + '...')}</span>
                ${p.verifiedAt ? html`<span className="src-badge followed">verified</span>` : html`<span className="src-badge other">unverified</span>`}
                ${p.bindingKey ? html`<span className="src-badge self">searchable</span>` : ''}
              </li>`)}
          </ul>`}
      </div>
    </details>`
}

export function Library ({ rpc, C, onBrowse }) {
  const [bookmarks, setBookmarks] = useState([])
  const [history, setHistory] = useState([])
  const [err, setErr] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [indexed, setIndexed] = useState(0)
  const [searching, setSearching] = useState(false)
  const [federated, setFederated] = useState(false)
  const [federating, setFederating] = useState(false)
  const [searchMeta, setSearchMeta] = useState(null)
  const catalogActions = useMyCatalogWriter(rpc, C)
  const searchIdRef = useRef(0)

  const runSearch = async () => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      setFederating(false)
      setSearchMeta(null)
      return
    }
    setSearching(true)
    setFederating(false)
    setSearchMeta(null)
    try {
      const res = await rpc.request(C.CMD_SEARCH, { query: q, limit: 50, federated })
      searchIdRef.current = res?.queryId || 0
      setResults(Array.isArray(res?.results) ? res.results : [])
      setIndexed(res?.stats?.docs || 0)
      if (res?.federating) setFederating(true)
    } catch (e) {
      setErr(`search: ${e.message}`)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const onFederated = (e) => {
      const d = (e && e.detail) || {}
      if (d.queryId !== searchIdRef.current) return
      if (Array.isArray(d.results)) setResults(d.results)
      setSearchMeta(d)
      setFederating(d.phase === 'batch')
    }
    rpc.addEventListener(`event:${C.EVT_SEARCH_FEDERATED}`, onFederated)
    return () => rpc.removeEventListener(`event:${C.EVT_SEARCH_FEDERATED}`, onFederated)
  }, [])

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
    } catch (e) {
      setErr(e.message)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Clear all browsing history?')) return
    try {
      await rpc.request(C.CMD_USERDATA_CLEAR_HISTORY)
      refresh()
    } catch (e) {
      setErr(e.message)
    }
  }

  return html`
    <div className="library">
      <h1>Library</h1>
      <p className="subtitle">Your saved bookmarks and recent browsing history, stored locally in your Hyperbee.</p>
      ${err && html`<div className="apps-error">${err}</div>`}

      <h2>Search your P2P content</h2>
      <p className="subtitle">Full-text search over everything you've browsed, local by default; trusted-peer search only runs when enabled.${indexed ? ` ${indexed} page(s) indexed.` : ''}</p>
      <div className="urlbar" style=${{ marginBottom: '12px' }}>
        <input
          type="text"
          className="url-input"
          placeholder="Search pages you've visited..."
          value=${query}
          onInput=${(e) => setQuery(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && runSearch()}
        />
        <button className="btn primary" onClick=${runSearch} disabled=${searching || !query.trim()}>${searching ? 'Searching...' : 'Search'}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${federated} onChange=${(e) => setFederated(e.target.checked)} />
        Include trusted peers${federating ? html` <span className="fed-status">- searching peers...</span>` : ''}
        <${SearchProvenanceBadges} meta=${searchMeta} />
      </label>
      <${TrustedPeers} rpc=${rpc} C=${C} />
      ${catalogActions.err && html`<div className="apps-error">${catalogActions.err}</div>`}
      ${catalogActions.notice && html`<div className="apps-ok">${catalogActions.notice}</div>`}
      ${results !== null && (results.length === 0
        ? html`<p className="placeholder">No matches${indexed === 0 ? ' yet - browse some hyper:// pages first to build your index.' : '.'}</p>`
        : html`<div className="library-list">
            ${results.map((r) => html`
              <${SearchResultRow}
                r=${r}
                onBrowse=${onBrowse}
                federated=${federated}
                renderCatalogButton=${(app) => html`<${AddToCatalogButton} catalogActions=${catalogActions} app=${app} />`}
              />
            `)}
          </div>`)}

      <h2>Bookmarks (${bookmarks.length})</h2>
      ${bookmarks.length === 0
        ? html`<p className="placeholder">No bookmarks yet. Use the star button in Browse, or open About this site and choose Bookmark this site.</p>`
        : html`<div className="library-list">
            ${bookmarks.map((b) => html`
              <div className="library-row" key=${b.url}>
                <div className="library-row-main">
                  <div className="library-title">${b.title || b.url}</div>
                  <div className="library-url">${b.url}</div>
                </div>
                <button className="btn small" onClick=${() => onBrowse(b.url)}>Open</button>
                <button className="btn small subtle" onClick=${() => removeBookmark(b.url)}>Remove</button>
              </div>
            `)}
          </div>`}

      <div className="library-history-head">
        <h2>History (${history.length})</h2>
        ${history.length > 0 && html`<button className="btn small subtle" onClick=${clearHistory}>Clear history</button>`}
      </div>
      ${history.length === 0
        ? html`<p className="placeholder">No browsing history yet.</p>`
        : html`<div className="library-list">
            ${history.slice(0, 100).map((h, i) => html`
              <div className="library-row" key=${(h.url || '') + ':' + i}>
                <div className="library-row-main">
                  <div className="library-title">${h.title || h.url}</div>
                  <div className="library-url">${h.url} ${h.visitedAt ? '- ' + new Date(h.visitedAt).toLocaleString() : ''}</div>
                </div>
                <button className="btn small" onClick=${() => onBrowse(h.url)}>Open</button>
              </div>
            `)}
          </div>`}
    </div>
  `
}
