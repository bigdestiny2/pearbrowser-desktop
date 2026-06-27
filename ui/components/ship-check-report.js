import { html } from 'htm/react'

export function ShipCheckReport ({ report, onRunVerifier, verifying = false }) {
  if (!report || !Array.isArray(report.checks)) return null
  const title = report.status === 'ready' ? 'Ready'
    : report.status === 'blocked' ? 'Blocked'
      : 'Review'
  return html`
    <div className=${`ship-check ${report.status || 'review'}`}>
      <div className="ship-check-head">
        <div>
          <div className="ship-check-title">Ship check: ${title}</div>
          <div className="ship-check-summary">${report.summary || ''}</div>
        </div>
        <div className="ship-check-counts">
          <span>${report.counts?.pass || 0} pass</span>
          <span>${report.counts?.warn || 0} warn</span>
          <span>${report.counts?.fail || 0} fail</span>
        </div>
      </div>
      <div className="ship-check-list">
        ${report.checks.map((item) => html`
          <div className=${`ship-check-row ${item.status || 'info'}`} key=${item.id}>
            <span className="ship-check-dot"></span>
            <div>
              <div className="ship-check-label">${item.label || item.id}</div>
              <div className="ship-check-message">${item.message || ''}</div>
              ${item.id && /^fresh-peer:/.test(item.id) && item.status !== 'pass' && onRunVerifier && html`
                <button className="btn small" onClick=${onRunVerifier} disabled=${verifying}>
                  ${verifying ? 'Verifying...' : 'Run fresh-peer verifier'}
                </button>
              `}
            </div>
          </div>
        `)}
      </div>
    </div>
  `
}
