import { useEffect, useState } from 'react'
import { html } from 'htm/react'

// Catalog icons arrive as base64 data URIs from an untrusted Hyperdrive.
// Only allow image data URIs (or http/https) into an <img src> so a hostile
// catalog can't smuggle a javascript:/other scheme into the renderer.
export function safeIconSrc (src) {
  if (typeof src !== 'string') return null
  if (/^data:image\//i.test(src)) return src
  if (/^https?:\/\//i.test(src)) return src
  return null
}

// Render an app/site icon: use any catalogue-inlined iconData, else lazily fetch
// it from the drive (CMD_GET_APP_ICON tries the declared iconRef + well-known
// paths like /icon.svg, /icon.png, /favicon.*). Falls back to a letter glyph.
export function AppIcon ({ rpc, C, driveKey, iconRef, iconData, name }) {
  const [src, setSrc] = useState(safeIconSrc(iconData))
  useEffect(() => {
    if (src || !driveKey || !/^[0-9a-f]{64}$/i.test(driveKey) || !(C && C.CMD_GET_APP_ICON)) return
    let alive = true
    rpc.request(C.CMD_GET_APP_ICON, { driveKey, iconRef })
      .then((res) => { const s = safeIconSrc(res && res.iconData); if (alive && s) setSrc(s) })
      .catch(() => {})
    return () => { alive = false }
  }, [driveKey, iconRef])
  return src
    ? html`<img src=${src} alt="" className="app-icon" />`
    : html`<div className="app-icon app-icon-fallback">${(name || '?').charAt(0)}</div>`
}
