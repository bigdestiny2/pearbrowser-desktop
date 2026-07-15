import { html } from 'htm/react'

// Network-node pear: a pear silhouette made of peers.
// Renders crisp at any size — inline SVG, no assets.
export function Logo ({ size = 64, animated = false }) {
  return html`
    <svg
      width=${size}
      height=${size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className=${animated ? 'logo-svg logo-pulse' : 'logo-svg'}
    >
      <defs>
        <radialGradient id="peerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ee787" />
          <stop offset="100%" stopColor="#238636" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="30" r="5" fill="url(#peerGrad)" />
      <circle cx="42" cy="52" r="6" fill="url(#peerGrad)" />
      <circle cx="78" cy="52" r="6" fill="url(#peerGrad)" />
      <circle cx="60" cy="72" r="7" fill="url(#peerGrad)" />
      <circle cx="36" cy="90" r="7.5" fill="url(#peerGrad)" />
      <circle cx="84" cy="90" r="7.5" fill="url(#peerGrad)" />
      <circle cx="60" cy="104" r="8.5" fill="url(#peerGrad)" />
    </svg>
  `
}

export function Wordmark () {
  return html`
    <div className="wordmark">
      <span className="wordmark-bold">Pear</span><span className="wordmark-light">Browser</span>
    </div>
  `
}
