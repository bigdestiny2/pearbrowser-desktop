import { useState } from 'react'
import { html } from 'htm/react'
import { Logo } from '../logo.js'
import { shortKey } from '../lib/keys.js'

export const SCOPE_LABELS = {
  'profile:name': { label: 'Display name', detail: 'Your chosen public name' },
  'profile:avatar': { label: 'Avatar', detail: 'Your profile picture URL' },
  'profile:email': { label: 'Email', detail: 'Email you put in your profile' },
  'profile:website': { label: 'Website', detail: 'Personal site URL on your profile' },
  'profile:read': { label: 'Full profile', detail: 'All filled profile fields' },
  'profile:contact': { label: 'Contact profile', detail: 'Email and website fields' },
  'contacts:read': { label: 'Contacts', detail: 'Your saved contacts list' }
}

export function LoginConsent ({ rpc, C, request, identity, onClose }) {
  const initial = new Set(request.scopes || [])
  const [granted, setGranted] = useState(initial)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')

  const toggle = (s) => {
    setGranted((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const decide = async (approved) => {
    setErr('')
    setBusy(approved ? 'approve' : 'deny')
    try {
      const scopes = approved ? Array.from(granted) : []
      await rpc.request(C.CMD_LOGIN_RESOLVE, {
        requestId: request.requestId,
        approved,
        scopes
      })
      onClose()
    } catch (e) {
      setErr(`could not resolve: ${e.message}`)
      setBusy(null)
    }
  }

  const appLabel = request.appName || 'A Pear app'
  const driveLabel = shortKey(request.driveKey)

  return html`
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${(e) => e.target.classList.contains('modal-overlay') && decide(false)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon">🍐</div>
          <div className="login-header-text">
            <div className="login-app-name">${appLabel}</div>
            <div className="login-app-sub">wants to sign you in</div>
            <div className="login-app-key" title=${request.driveKey}>${driveLabel}</div>
          </div>
        </div>

        ${request.reason && html`<div className="login-reason">"${request.reason}"</div>`}

        <div className="login-section-label">SIGNING IN AS</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🍐</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">You</div>
            <code className="login-identity-key">${shortKey(identity?.publicKey || '')}</code>
          </div>
        </div>

        <div className="login-section-label">${appLabel} WILL SEE</div>
        <div className="login-scopes">
          ${(request.scopes || []).length === 0
            ? html`<div className="login-scope-empty">Nothing — sign-in only confirms it's you.</div>`
            : (request.scopes || []).map((s) => {
                const meta = SCOPE_LABELS[s] || { label: s, detail: '' }
                const on = granted.has(s)
                return html`
                  <label className=${'login-scope' + (on ? ' on' : '')} key=${s}>
                    <input type="checkbox" checked=${on} onChange=${() => toggle(s)} />
                    <div className="login-scope-meta">
                      <div className="login-scope-label">${meta.label}</div>
                      <div className="login-scope-detail">${meta.detail || s}</div>
                    </div>
                  </label>
                `
              })}
        </div>

        ${request.currentGrant && html`
          <div className="login-existing">
            You previously granted this app on
            ${' ' + new Date(request.currentGrant.grantedAt).toLocaleDateString()}.
          </div>
        `}

        ${err && html`<div className="apps-error">${err}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${() => decide(false)} disabled=${busy !== null}>
            ${busy === 'deny' ? 'Cancelling…' : 'Cancel'}
          </button>
          <button className="btn primary" onClick=${() => decide(true)} disabled=${busy !== null}>
            ${busy === 'approve' ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  `
}

export function SwarmConsent ({ rpc, C, request, identity, onClose }) {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')

  const decide = async (approved) => {
    setErr('')
    setBusy(approved ? 'approve' : 'deny')
    try {
      await rpc.request(C.CMD_SWARM_RESOLVE, {
        requestId: request.requestId,
        approved
      })
      onClose()
    } catch (e) {
      setErr(`could not resolve: ${e.message}`)
      setBusy(null)
    }
  }

  const appLabel = request.appName || 'A Pear app'
  const driveLabel = shortKey(request.driveKey)
  const topicLabel = shortKey(request.topicHex)

  return html`
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick=${(e) => e.target.classList.contains('modal-overlay') && decide(false)}>
      <div className="modal-card login-consent">
        <div className="login-header">
          <div className="login-app-icon" style=${{ background: 'linear-gradient(135deg, #58a6ff, #a371f7)' }}>📡</div>
          <div className="login-header-text">
            <div className="login-app-name">${appLabel}</div>
            <div className="login-app-sub">wants to connect to peers on a swarm topic</div>
            <div className="login-app-key" title=${request.driveKey}>${driveLabel}</div>
          </div>
        </div>

        ${request.reason && html`<div className="login-reason">"${request.reason}"</div>`}

        <div className="login-section-label">SWARM TOPIC</div>
        <div className="login-identity">
          <div className="login-identity-avatar">🔑</div>
          <div className="login-identity-meta">
            <div className="login-identity-label">${request.protocol || 'pear.swarm.v1'}</div>
            <code className="login-identity-key">${topicLabel}</code>
          </div>
        </div>

        <div className="login-section-label">WHAT THIS MEANS</div>
        <div className="login-scopes">
          <div className="login-scope on">
            <div className="login-scope-meta">
              <div className="login-scope-label">Discover peers via DHT</div>
              <div className="login-scope-detail">Other devices on this topic will see your IP address.</div>
            </div>
          </div>
          <div className="login-scope on">
            <div className="login-scope-meta">
              <div className="login-scope-label">Send and receive messages directly</div>
              <div className="login-scope-detail">No relay between your peers and you. Messages aren't logged by PearBrowser.</div>
            </div>
          </div>
        </div>

        <div className="login-existing">
          Approving stores a grant for this app + this topic. You can revoke it any time in <strong>Settings → Connected Apps</strong>.
        </div>

        ${err && html`<div className="apps-error">${err}</div>`}

        <div className="login-actions">
          <button className="btn subtle" onClick=${() => decide(false)} disabled=${busy !== null}>
            ${busy === 'deny' ? 'Cancelling…' : 'Cancel'}
          </button>
          <button className="btn primary" onClick=${() => decide(true)} disabled=${busy !== null}>
            ${busy === 'approve' ? 'Connecting…' : 'Approve & Connect'}
          </button>
        </div>
      </div>
    </div>
  `
}

function onboardingSites (p2pBuildersUrl) {
  return [
    {
      id: 'home',
      title: 'PearBrowser homepage',
      subtitle: 'The landing page — what this app is, who built it',
      url: 'hyper://2d6c2be92f07e10ed5a4b07b5c1286a56f0c1220c79ad3c3293b069f8c946763/',
      initial: '🍐',
      gradient: 'linear-gradient(135deg, #7ee787, #58a6ff)'
    },
    {
      id: 'hiveworm',
      title: 'HiveWorm',
      subtitle: 'Multiplayer worm life-sim, fully P2P',
      url: 'pear://d1xbkcpcbi1xa8dexp49rsendra5r67w3qh5a9k8t44oemm4k16y',
      initial: '🐛',
      gradient: 'linear-gradient(135deg, #a371f7, #d946ef)'
    },
    {
      id: 'hiverelay',
      title: 'HiveRelay',
      subtitle: 'The relay backbone keeping it all online',
      url: 'hyper://ea607230f7b9a5f854c664901b2c34faf1c6f5b7cee6fc3bca02ac682fd02754/',
      initial: '🟢',
      gradient: 'linear-gradient(135deg, #00ff41, #3eaf55)'
    },
    {
      id: 'p2pbuilders',
      title: 'P2P Builders',
      subtitle: 'Permissionless P2P hacker news',
      url: p2pBuildersUrl,
      initial: '🔧',
      gradient: 'linear-gradient(135deg, #ff6600, #fbbf24)'
    }
  ]
}

export function Onboarding ({ rpc, C, p2pBuildersUrl, onPickSite, onClose }) {
  const [slide, setSlide] = useState(0)
  const sites = onboardingSites(p2pBuildersUrl)

  const finish = async (pickedUrl) => {
    rpc.request(C.CMD_USERDATA_SET_SETTINGS, {
      updates: { onboardingDone: true, onboardingDoneAt: Date.now() }
    }).catch(() => {})
    if (pickedUrl) onPickSite(pickedUrl)
    onClose()
  }

  return html`
    <div className="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <div className="modal-card onboarding-card">
        ${slide === 0 && html`
          <div className="onb-slide onb-slide-welcome">
            <div className="onb-hero">
              <${Logo} size=${72} />
            </div>
            <h1 className="onb-title">Welcome to <strong>PearBrowser</strong></h1>
            <p className="onb-subtitle">The web that doesn't go down.</p>
            <p className="onb-blurb">
              A peer-to-peer browser, app store, and site publisher. Pages
              live as Hyperdrives, identified by 32-byte keys, replicated
              by their readers. No DNS. No servers. No accounts.
            </p>
            <div className="onb-actions">
              <button className="btn primary" onClick=${() => setSlide(1)}>Get started →</button>
            </div>
          </div>
        `}
        ${slide === 1 && html`
          <div className="onb-slide">
            <h2 className="onb-stepname">Three things at once</h2>
            <div className="onb-pitch-grid">
              <div className="onb-pitch">
                <div className="onb-pitch-icon">🌐</div>
                <div className="onb-pitch-title">Browse hyper://</div>
                <div className="onb-pitch-body">Paste a drive key, fetch from peers, render in-app.</div>
              </div>
              <div className="onb-pitch">
                <div className="onb-pitch-icon">📦</div>
                <div className="onb-pitch-title">Run Pear apps</div>
                <div className="onb-pitch-body">Click a pear:// link, the app opens in its own window.</div>
              </div>
              <div className="onb-pitch">
                <div className="onb-pitch-icon">✒️</div>
                <div className="onb-pitch-title">Publish your own</div>
                <div className="onb-pitch-body">Block editor → publish → pinned 24/7 on HiveRelay.</div>
              </div>
            </div>
            <p className="onb-blurb onb-foot">
              Your identity is generated automatically and stored on this
              machine. You can back it up later in <em>Settings → Identity</em>
              if you want to use it on another device.
            </p>
            <div className="onb-actions">
              <button className="btn subtle" onClick=${() => setSlide(0)}>← Back</button>
              <button className="btn primary" onClick=${() => setSlide(2)}>Continue →</button>
            </div>
          </div>
        `}
        ${slide === 2 && html`
          <div className="onb-slide">
            <h2 className="onb-stepname">Try a site</h2>
            <p className="onb-blurb">Pick one to start with — you can always come back here.</p>
            <div className="onb-sites">
              ${sites.map((s) => html`
                <button
                  className="onb-site-card"
                  key=${s.id}
                  onClick=${() => finish(s.url)}
                  title=${s.url}
                >
                  <div className="onb-site-icon" style=${{ background: s.gradient }}>${s.initial}</div>
                  <div className="onb-site-text">
                    <div className="onb-site-title">${s.title}</div>
                    <div className="onb-site-subtitle">${s.subtitle}</div>
                  </div>
                </button>
              `)}
            </div>
            <div className="onb-actions">
              <button className="btn subtle" onClick=${() => setSlide(1)}>← Back</button>
              <button className="onb-skip" onClick=${() => finish(null)}>Skip — I'll explore</button>
            </div>
          </div>
        `}
        <div className="onb-dots">
          ${[0, 1, 2].map((i) => html`
            <span className=${'onb-dot' + (i === slide ? ' on' : '')} key=${i}></span>
          `)}
        </div>
      </div>
    </div>
  `
}
