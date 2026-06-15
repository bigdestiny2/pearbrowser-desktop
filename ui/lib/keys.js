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
