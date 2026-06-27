import { useEffect, useRef, useState } from 'react'
import { html } from 'htm/react'
import { AddToCatalogButton, useMyCatalogWriter } from './catalog-actions.js'
import { SearchProvenanceBadges, SearchResultRow } from './search-results.js'

// Local results paint instantly via CMD_SEARCH; the opt-in trusted-peer set
// arrives over EVT_SEARCH_FEDERATED, correlated by queryId so stale replies
// cannot clobber a newer search.
export function FederatedSearch ({ rpc, C, onBrowse, placeholder }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [indexed, setIndexed] = useState(0)
  const [searching, setSearching] = useState(false)
  const [federated, setFederated] = useState(false)
  const [federating, setFederating] = useState(false)
  const [searchMeta, setSearchMeta] = useState(null)
  const [err, setErr] = useState('')
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

  return html`
    <div className="fed-search">
      ${err && html`<div className="apps-error">${err}</div>`}
      ${catalogActions.err && html`<div className="apps-error">${catalogActions.err}</div>`}
      ${catalogActions.notice && html`<div className="apps-ok">${catalogActions.notice}</div>`}
      <div className="urlbar" style=${{ marginBottom: '10px' }}>
        <input type="text" className="url-input"
          placeholder=${placeholder || 'Search the peer-to-peer web...'}
          value=${query}
          onInput=${(e) => setQuery(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && runSearch()} />
        <button className="btn primary" onClick=${runSearch} disabled=${searching || !query.trim()}>${searching ? 'Searching...' : 'Search'}</button>
      </div>
      <label className="search-fed-toggle">
        <input type="checkbox" checked=${federated} onChange=${(e) => setFederated(e.target.checked)} />
        Include trusted peers${federating ? html` <span className="fed-status">- searching peers...</span>` : ''}
        <${SearchProvenanceBadges} meta=${searchMeta} />
      </label>
      ${indexed ? html`<span className="search-indexed" style=${{ marginLeft: '10px', opacity: 0.6, fontSize: '12px' }}>${indexed} page(s) indexed</span>` : ''}
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
    </div>
  `
}
