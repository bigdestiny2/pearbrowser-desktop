// Pure key/value formatting helpers shared by the shell UI.
//
// Framework-free and side-effect-free so they can be unit-tested under
// plain node (see test/keys.test.js) without loading React/htm.
//
//   z-base-32 ⇄ hex          drive keys are shown in both encodings
//   formatBytes              human-readable cached-bytes display
//   shortKey                 truncated key for compact labels
//   normalizeUrl             URL-bar input → canonical hyper://… URL

const Z32_ALPHABET = 'ybndrfg8ejkmcpqxot1uwisza345h769'
const Z32_REVERSE = (() => {
  const map = new Map()
  for (let i = 0; i < Z32_ALPHABET.length; i++) map.set(Z32_ALPHABET[i], i)
  return map
})()

export function hexToBytes (hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function bytesToHex (bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function z32EncodeBytes (bytes) {
  const max = bytes.byteLength * 8
  let s = ''
  for (let p = 0; p < max; p += 5) {
    const i = p >>> 3
    const j = p & 7
    if (j <= 3) {
      s += Z32_ALPHABET[(bytes[i] >>> (3 - j)) & 0b11111]
      continue
    }
    const of = j - 3
    const high = (bytes[i] << of) & 0b11111
    const low = (i + 1 >= bytes.byteLength ? 0 : bytes[i + 1]) >>> (8 - of)
    s += Z32_ALPHABET[high | low]
  }
  return s
}

export function z32DecodeToBytes (s) {
  const clean = String(s || '').toLowerCase()
  const out = new Uint8Array(Math.ceil(clean.length * 5 / 8))
  let pb = 0
  let ps = 0
  const quintet = () => {
    const ch = clean[ps++]
    if (!Z32_REVERSE.has(ch)) throw new Error('invalid z-base-32')
    return Z32_REVERSE.get(ch)
  }

  const r = clean.length & 7
  const q = (clean.length - r) / 8

  for (let i = 0; i < q; i++) {
    const a = quintet(), b = quintet(), c = quintet(), d = quintet()
    const e = quintet(), f = quintet(), g = quintet(), h = quintet()
    out[pb++] = (a << 3) | (b >>> 2)
    out[pb++] = ((b & 0b11) << 6) | (c << 1) | (d >>> 4)
    out[pb++] = ((d & 0b1111) << 4) | (e >>> 1)
    out[pb++] = ((e & 0b1) << 7) | (f << 2) | (g >>> 3)
    out[pb++] = ((g & 0b111) << 5) | h
  }

  if (r === 0) return out.subarray(0, pb)
  const a = quintet(), b = quintet()
  out[pb++] = (a << 3) | (b >>> 2)
  if (r <= 2) return out.subarray(0, pb)
  const c = quintet(), d = quintet()
  out[pb++] = ((b & 0b11) << 6) | (c << 1) | (d >>> 4)
  if (r <= 4) return out.subarray(0, pb)
  const e = quintet()
  out[pb++] = ((d & 0b1111) << 4) | (e >>> 1)
  if (r <= 5) return out.subarray(0, pb)
  const f = quintet(), g = quintet()
  out[pb++] = ((e & 0b1) << 7) | (f << 2) | (g >>> 3)
  if (r <= 7) return out.subarray(0, pb)
  const h = quintet()
  out[pb++] = ((g & 0b111) << 5) | h
  return out.subarray(0, pb)
}

export function z32FromHex (hex) {
  const bytes = hexToBytes(hex)
  return bytes ? z32EncodeBytes(bytes) : null
}

export function hexFromZ32 (s) {
  try {
    const bytes = z32DecodeToBytes(s)
    return bytes.length === 32 ? bytesToHex(bytes) : null
  } catch {
    return null
  }
}

export function formatBytes (value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let n = bytes / 1024
  let unit = units[0]
  for (let i = 1; i < units.length && n >= 1024; i++) {
    n /= 1024
    unit = units[i]
  }
  return `${n >= 10 ? n.toFixed(1) : n.toFixed(2)} ${unit}`
}

export function shortKey (k) {
  if (!k || typeof k !== 'string') return ''
  if (k.length <= 16) return k
  return k.slice(0, 8) + '…' + k.slice(-6)
}

export function normalizeUrl (raw) {
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith('hyper://')) return s
  if (/^[0-9a-f]{64}$/i.test(s)) return `hyper://${s}/`
  if (/^[13-9a-km-uw-z]{52}$/i.test(s)) return `hyper://${s}/`
  if (s.includes('/') || s.startsWith('pear://')) return s
  return `hyper://${s}`
}

// Naming Phase N1 — true when `raw` is a bare name token the resolver should
// try BEFORE URL handling: a single word like "keet" or "pear-pass", not a
// drive key, domain, path, or scheme. A cheap pre-filter so the URL bar only
// issues CMD_NAME_RESOLVE for plausible names (the backend resolver still
// returns null for anything unknown, so this never changes correctness — only
// avoids an RPC on ordinary navigations). Rejects keys explicitly so a typed
// 64-hex/52-z32 key always goes straight to drive loading.
export function looksLikeName (raw) {
  const s = String(raw || '').trim()
  if (!/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(s)) return false  // single token: no dot/slash/scheme/space
  if (/^[0-9a-f]{64}$/i.test(s)) return false                 // 64-char hex drive key
  if (/^[13-9a-km-uw-z]{52}$/i.test(s)) return false          // 52-char z-base-32 key
  return true
}

// Route a catalog reference to the right backend loader by URL scheme:
//   bare key / hyper://  → Hyperdrive catalog  (CMD_LOAD_CATALOG)
//   hyperbee://          → Hyperbee catalog     (CMD_LOAD_CATALOG_BEE)
//   autobee://           → Autobase collab cat. (CMD_LOAD_CATALOG_AUTOBEE)
// Returns the scheme-stripped key plus `bee`/`autobee` flags, or null for
// empty input. (`bee` stays for back-compat; `kind` is the canonical field.)
export function parseCatalogRef (raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  const autobee = /^autobee:\/\//i.test(s)
  const bee = /^hyperbee:\/\//i.test(s)
  const key = s.replace(/^(autobee|hyperbee|hyper):\/\//i, '').replace(/\/+$/, '').trim()
  if (!key) return null
  return { key, bee, autobee, kind: autobee ? 'autobee' : bee ? 'hyperbee' : 'drive' }
}

// Parse a multi-device sync pairing invite: `sync://<key>:<encKey>` (the bare
// `<key>:<encKey>` form is also accepted). Both halves are 64-hex — the base
// bootstrap key and the encryption key. Returns { key, encKey } lowercased, or
// null if malformed. The pair is a sensitive capability: it IS the key to the
// user's encrypted, synced bookmarks, so anyone holding it can read them.
export function parseSyncInvite (raw) {
  const s = String(raw || '').trim().replace(/^sync:\/\//i, '').replace(/\/+$/, '')
  const m = s.match(/^([0-9a-f]{64}):([0-9a-f]{64})$/i)
  if (!m) return null
  return { key: m[1].toLowerCase(), encKey: m[2].toLowerCase() }
}

// Build the shareable pairing invite from a sync base key + encryption key.
// Returns '' if either half is not 64-hex (so callers can disable a Copy
// button rather than offer a malformed invite).
export function formatSyncInvite (key, encKey) {
  const k = String(key || '').trim().toLowerCase()
  const e = String(encKey || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(k) || !/^[0-9a-f]{64}$/.test(e)) return ''
  return `sync://${k}:${e}`
}
