// Pure wallet-UI helpers shared by the shell's Wallet settings section.
//
// Framework-free and side-effect-free so they can be unit-tested under plain
// node (see test/wallet-lib.test.js) without loading React/htm — same
// contract as ui/lib/keys.js.
//
//   formatAtomic        atomic integer string → human amount (string math)
//   truncateAddress     0x… address → compact label
//   normalizeMnemonic   textarea input → word list (12 or 24 words)
//   utf8ToB64/b64ToUtf8 base64 for the JSON-only RPC frame (no atob/Buffer)
//   walletErrorMessage  coded backend errors → human messages
//   passphraseStrength  create-form strength hint
//   activityLabel       projected journal entry → one-line description

// Amounts cross as base-10 integer strings; the conversion is pure string
// math — never a float. Trailing zeros are trimmed for readability.
export function formatAtomic (amountAtomic, decimals) {
  if (typeof amountAtomic !== 'string' || !/^[0-9]+$/.test(amountAtomic)) return String(amountAtomic ?? '')
  if (!Number.isSafeInteger(decimals) || decimals < 0) return amountAtomic
  if (decimals === 0) return amountAtomic.replace(/^0+(?=\d)/, '')
  const padded = amountAtomic.padStart(decimals + 1, '0')
  const whole = padded.slice(0, -decimals).replace(/^0+(?=\d)/, '')
  const frac = padded.slice(-decimals).replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole
}

// EVM addresses are 42 chars ("0x" + 40 hex); show 0x1234…cdef.
export function truncateAddress (address) {
  if (!address || typeof address !== 'string') return ''
  if (address.length <= 14) return address
  return address.slice(0, 6) + '…' + address.slice(-4)
}

// Recovery-phrase textarea → words, or null when the word count is not a
// valid BIP-39 length (the wallet uses 24; 12 is accepted for imports of
// standard phrases). Case/word validity is checked by the engine, not here.
export function normalizeMnemonic (text) {
  if (typeof text !== 'string') return null
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length !== 12 && words.length !== 24) return null
  return words
}

// --- base64 (the RPC frame is JSON-only, so mnemonics cross as base64) -----
// atob/Buffer are not guaranteed in every shell context, so these are tiny
// pure-JS codecs over UTF-8.

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_REVERSE = (() => {
  const map = new Map()
  for (let i = 0; i < B64_ALPHABET.length; i++) map.set(B64_ALPHABET[i], i)
  return map
})()

function utf8Encode (str) {
  return new TextEncoder().encode(str)
}

function utf8Decode (bytes) {
  return new TextDecoder().decode(bytes)
}

export function bytesToB64 (bytes) {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : null
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : null
    out += B64_ALPHABET[b0 >> 2]
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 === null ? 0 : b1 >> 4)]
    out += b1 === null ? '=' : B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 === null ? 0 : b2 >> 6)]
    out += b2 === null ? '=' : B64_ALPHABET[b2 & 0x3f]
  }
  return out
}

export function b64ToBytes (b64) {
  if (typeof b64 !== 'string') return null
  const clean = b64.replace(/=+$/, '')
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) return null
  const out = []
  let acc = 0
  let bits = 0
  for (const ch of clean) {
    acc = (acc << 6) | B64_REVERSE.get(ch)
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((acc >> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

export function utf8ToB64 (str) {
  return bytesToB64(utf8Encode(str))
}

// Returns null on malformed base64 instead of throwing — callers surface a
// generic backup error.
export function b64ToUtf8 (b64) {
  const bytes = b64ToBytes(b64)
  return bytes === null ? null : utf8Decode(bytes)
}

// --- error mapping -----------------------------------------------------------
// RPC errors cross the frame as err.message strings only (backend/rpc.js
// serializes just the message), so match on the stable coded-error text the
// wallet service/handlers throw.
export function walletErrorMessage (err) {
  const msg = typeof err === 'string' ? err : String(err?.message || err || '')
  const m = msg.toLowerCase()
  if (m.includes('bad-passphrase') || m.includes('passphrase is incorrect')) {
    return 'Wrong passphrase — check it and try again.'
  }
  if (m.includes('wallet-exists') || m.includes('vault already exists')) {
    return 'A wallet already exists on this device. Unlock it, or reset app data to start over.'
  }
  if (m.includes('wallet-locked') || m.includes('wallet is locked')) {
    return 'The wallet is locked — unlock it first.'
  }
  if (m.includes('lock the wallet before starting a backup')) {
    return 'Lock the wallet before starting a backup.'
  }
  if (m.includes('rate-limited') || m.includes('rate limit')) {
    return 'Rate limited — wait a moment and try again.'
  }
  if (m.includes('prompt-expired')) return 'That approval prompt expired — try the action again.'
  if (m.includes('not-found') || m.includes('not available') || m.includes('vault is absent')) {
    return 'The wallet is not available yet — the worklet may still be booting. Try again in a moment.'
  }
  if (m.includes('not-implemented') || m.includes('not implemented')) return 'This wallet feature is not implemented in this build.'
  return msg || 'Something went wrong.'
}

// --- passphrase strength hint (create form) ----------------------------------
export function passphraseStrength (passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    return { score: 0, label: '', hint: 'Use 12+ characters — a short sentence works well.' }
  }
  let score = 0
  if (passphrase.length >= 8) score++
  if (passphrase.length >= 12) score++
  if (passphrase.length >= 16) score++
  if (/[a-z]/.test(passphrase) && /[A-Z]/.test(passphrase)) score++
  if (/[0-9]/.test(passphrase)) score++
  if (/[^a-zA-Z0-9\s]/.test(passphrase)) score++
  if (/^[a-z]+$/.test(passphrase) && passphrase.length < 12) score = Math.min(score, 1)
  if (score <= 2) return { score, label: 'weak', hint: 'Too easy to guess — make it longer and mix words, digits, symbols.' }
  if (score <= 4) return { score, label: 'fair', hint: 'Okay — longer is better. Losing this passphrase loses the wallet.' }
  return { score, label: 'strong', hint: 'Strong. Store it safely — there is no reset.' }
}

// --- activity feed -----------------------------------------------------------
// Projected journal entry (see backend/wallet/wallet-chrome-reads.cjs) → a
// one-line label for the recent-activity list.
export function activityLabel (tx) {
  if (!tx || typeof tx !== 'object') return ''
  switch (tx.type) {
    case 'intent':
      return tx.intentType === 'payment' ? 'Payment requested' : tx.intentType === 'sign-app' ? 'App signature requested' : 'Request'
    case 'prompt': return 'Approval prompt opened'
    case 'approval': return 'Approved'
    case 'rejection': return 'Rejected'
    case 'broadcast': return 'Broadcast to network'
    case 'outcome': {
      const states = {
        submitted: 'Payment submitted',
        expired: 'Prompt expired',
        cancelled: 'Cancelled',
        error: 'Failed'
      }
      return states[tx.state] || (tx.state ? `Outcome: ${tx.state}` : 'Outcome')
    }
    case 'connect': return 'App connected'
    case 'disconnect': return 'App disconnected'
    case 'sign-app': return 'App payload signed'
    default: return tx.type
  }
}
