import { html } from 'htm/react'

// Network-node pear: a pear silhouette made of peers, mesh-connected.
// Renders crisp at any size — inline SVG, no assets.
export function Logo ({ size = 64, animated = false }) {
  return html`
    <svg
      width=${size}
      height=${size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class=${animated ? 'logo-svg logo-pulse' : 'logo-svg'}
    >
      <defs>
        <radialGradient id="peerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#7ee787" />
          <stop offset="100%" stop-color="#238636" />
        </radialGradient>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3fb950" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#58a6ff" stop-opacity="0.4" />
        </linearGradient>
      </defs>
      <!-- Stem -->
      <line x1="60" y1="10" x2="60" y2="22" stroke="url(#lineGrad)" stroke-width="2.2" stroke-linecap="round" />
      <!-- Leaf -->
      <ellipse cx="68" cy="16" rx="7" ry="3.5" fill="url(#peerGrad)" transform="rotate(-20 68 16)" opacity="0.85" />
      <!-- Connection lines forming pear silhouette: narrow top → wide bottom -->
      <g stroke="url(#lineGrad)" stroke-width="1.4">
        <!-- Top narrow cluster -->
        <line x1="60" y1="26" x2="48" y2="42" />
        <line x1="60" y1="26" x2="72" y2="42" />
        <line x1="48" y1="42" x2="72" y2="42" />
        <!-- Neck to body -->
        <line x1="48" y1="42" x2="36" y2="66" />
        <line x1="72" y1="42" x2="84" y2="66" />
        <line x1="48" y1="42" x2="60" y2="62" />
        <line x1="72" y1="42" x2="60" y2="62" />
        <!-- Body: wide round bottom -->
        <line x1="36" y1="66" x2="32" y2="88" />
        <line x1="84" y1="66" x2="88" y2="88" />
        <line x1="36" y1="66" x2="60" y2="62" />
        <line x1="84" y1="66" x2="60" y2="62" />
        <line x1="60" y1="62" x2="44" y2="98" />
        <line x1="60" y1="62" x2="76" y2="98" />
        <line x1="32" y1="88" x2="44" y2="98" />
        <line x1="88" y1="88" x2="76" y2="98" />
        <line x1="44" y1="98" x2="60" y2="104" />
        <line x1="76" y1="98" x2="60" y2="104" />
        <line x1="32" y1="88" x2="44" y2="98" />
      </g>
      <!-- Peer nodes arranged to outline a pear: narrow shoulders, wide hips -->
      <circle cx="60" cy="26" r="5" fill="url(#peerGrad)" />
      <circle cx="48" cy="42" r="5.5" fill="url(#peerGrad)" />
      <circle cx="72" cy="42" r="5.5" fill="url(#peerGrad)" />
      <circle cx="60" cy="62" r="6.5" fill="url(#peerGrad)" />
      <circle cx="36" cy="66" r="7" fill="url(#peerGrad)" />
      <circle cx="84" cy="66" r="7" fill="url(#peerGrad)" />
      <circle cx="32" cy="88" r="7.5" fill="url(#peerGrad)" />
      <circle cx="88" cy="88" r="7.5" fill="url(#peerGrad)" />
      <circle cx="44" cy="98" r="6.5" fill="url(#peerGrad)" />
      <circle cx="76" cy="98" r="6.5" fill="url(#peerGrad)" />
      <circle cx="60" cy="104" r="5" fill="url(#peerGrad)" />
    </svg>
  `
}

export function Wordmark () {
  return html`
    <div class="wordmark">
      <span class="wordmark-bold">Pear</span><span class="wordmark-light">Browser</span>
    </div>
  `
}
