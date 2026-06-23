// NIP-19 npub encoding — bech32 (BIP-173) over the x-only Nostr pubkey, for
// human-facing display ONLY (npub1…). Never on the wire (events use raw hex).
// Encode-only; PURE, CommonJS (Bare requires it, Node tests it).

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const HEX64 = /^[0-9a-f]{64}$/i

function polymod (values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const v of values) {
    const top = chk >>> 25
    chk = ((chk & 0x1ffffff) << 5) ^ v
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i]
  }
  return chk
}

function hrpExpand (hrp) {
  const out = []
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5)
  out.push(0)
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31)
  return out
}

function createChecksum (hrp, data) {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0])
  const mod = polymod(values) ^ 1
  const out = []
  for (let i = 0; i < 6; i++) out.push((mod >> (5 * (5 - i))) & 31)
  return out
}

function bech32Encode (hrp, data) {
  const combined = data.concat(createChecksum(hrp, data))
  let s = hrp + '1'
  for (const d of combined) s += CHARSET[d]
  return s
}

// 8-bit bytes → 5-bit groups (with padding, as bech32 data requires).
function convertBits (bytes, from, to, pad) {
  let acc = 0
  let bits = 0
  const out = []
  const maxv = (1 << to) - 1
  for (const b of bytes) {
    if (b < 0 || (b >> from) !== 0) throw new Error('invalid byte for convertBits')
    acc = (acc << from) | b
    bits += from
    while (bits >= to) { bits -= to; out.push((acc >> bits) & maxv) }
  }
  if (pad && bits > 0) out.push((acc << (to - bits)) & maxv)
  return out
}

function npubEncode (pubkeyHex) {
  if (typeof pubkeyHex !== 'string' || !HEX64.test(pubkeyHex)) throw new Error('npubEncode expects a 64-hex x-only pubkey')
  const bytes = []
  for (let i = 0; i < 64; i += 2) bytes.push(parseInt(pubkeyHex.substr(i, 2), 16))
  return bech32Encode('npub', convertBits(bytes, 8, 5, true))
}

module.exports = { npubEncode, bech32Encode, convertBits }
