import { html } from 'htm/react'
import {
  searchResultBadges,
  searchResultExplanation,
  searchRunBadges,
  searchRunSummary
} from '../lib/search-explain.js'
import { catalogEntryFromSearchResult } from '../lib/catalog-provenance.js'

export function SearchProvenanceBadges ({ meta }) {
  const badges = searchRunBadges(meta)
  const summary = searchRunSummary(meta)
  if (!badges.length && !summary) return null
  return html`<span className="search-provenance" title=${summary || undefined}>
    ${badges.map((b) => html`<span className=${`src-badge ${b.tone || 'self'}`} key=${b.key} title=${b.title || summary}>${b.label}</span>`)}
    ${summary ? html`<span className="search-run-summary">${summary}</span>` : ''}
  </span>`
}

export function searchResultUrl (r) {
  if (r && r.link) return r.link
  if (r && /^(?:pear|file|hyper):\/\//i.test(r.driveKey || '')) return r.driveKey
  return `hyper://${r.driveKey}${r.path && r.path !== '/' ? r.path : '/'}`
}

export function SearchResultRow ({ r, onBrowse, federated, renderCatalogButton }) {
  const url = searchResultUrl(r)
  const catalogApp = catalogEntryFromSearchResult(r, { federated })
  const badges = searchResultBadges(r, { federated })
  const explanation = searchResultExplanation(r, { federated })
  return html`
    <div className="library-row" key=${r.docId || (r.driveKey + r.path)}>
      <div className="library-row-main">
        <div className="library-title">
          <span>${r.title || url}</span>
        </div>
        ${badges.length ? html`
          <div className="search-result-badges" title=${explanation || undefined}>
            ${badges.map((b) => html`<span className=${`src-badge ${b.tone || 'self'}`} key=${b.key} title=${b.title || explanation}>${b.label}</span>`)}
          </div>
        ` : ''}
        ${r.excerpt ? html`<div className="library-snippet">${r.excerpt}</div>` : ''}
        <div className="library-url">${url}</div>
        ${explanation ? html`<div className="search-explanation">${explanation}</div>` : ''}
      </div>
      <button className="btn small" onClick=${() => onBrowse(url)}>Open</button>
      ${renderCatalogButton ? renderCatalogButton(catalogApp) : ''}
    </div>
  `
}
