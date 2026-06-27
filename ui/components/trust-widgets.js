import { html } from 'htm/react'
import { appTrustSummary, siteTrustSummary } from '../lib/trust-summary.js'
import {
  catalogModerationSummary,
  catalogSourceChips as catalogSourceChipData
} from '../lib/catalog-provenance.js'

export function TrustBadges ({ summary, detail = false }) {
  if (!summary || !Array.isArray(summary.badges) || !summary.badges.length) return null
  return html`
    <div className=${'trust-strip' + (detail ? ' detail' : '')} title=${summary.summary || undefined}>
      ${summary.badges.map((b) => html`<span className=${`src-badge ${b.tone || 'self'}`} key=${b.key} title=${b.title || summary.summary}>${b.label}</span>`)}
    </div>
  `
}

export function AppTrustBadges ({ app, driveInfo, driveKey, permissions, detail = false }) {
  return html`<${TrustBadges} summary=${appTrustSummary(app, {
    driveInfo,
    driveKey,
    loginGrants: permissions?.loginGrants,
    swarmGrants: permissions?.swarmGrants
  })} detail=${detail} />`
}

export function AppTrustDetail ({ app, driveInfo, driveKey, permissions }) {
  const trust = appTrustSummary(app, {
    driveInfo,
    driveKey,
    loginGrants: permissions?.loginGrants,
    swarmGrants: permissions?.swarmGrants
  })
  return html`
    <div className="trust-detail">
      <div className="trust-detail-title">Trust</div>
      <${TrustBadges} summary=${trust} detail=${true} />
      ${trust.summary ? html`<div className="trust-detail-summary">${trust.summary}</div>` : ''}
    </div>
  `
}

export function CatalogSourceChips ({ app }) {
  const chips = catalogSourceChipData(app)
  const moderation = catalogModerationSummary(app)
  if (!chips.length && !moderation) return null
  return html`
    <div className="catalog-provenance">
      ${chips.map((chip) => html`
        <span className=${`source-chip ${chip.tone || 'self'}`} key=${chip.key} title=${chip.title || ''}>${chip.label}</span>
      `)}
    </div>
    ${moderation && html`<div className="catalog-moderation-summary">${moderation}</div>`}
  `
}

export function SiteTrustBadges ({ site, owned = false, permissions }) {
  return html`<${TrustBadges} summary=${siteTrustSummary(site, {
    owned,
    loginGrants: permissions?.loginGrants,
    swarmGrants: permissions?.swarmGrants
  })} />`
}
