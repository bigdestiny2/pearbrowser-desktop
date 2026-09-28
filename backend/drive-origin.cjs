'use strict'

// A drive key is 256 bits. Its 64-character hex form is too long for one DNS
// label, so encode it as 52 z-base-32 characters under the special localhost
// name. Keeping the full key makes the host mapping reversible and collision
// free. This module has no runtime dependencies and is also bundled into UI.
const ALPHABET = 'ybndrfg8ejkmcpqxot1uwisza345h769'
const HEX_KEY = /^[0-9a-f]{64}$/i
const DRIVE_HOST = /^d-([ybndrfg8ejkmcpqxot1uwisza345h769]{52})\.localhost$/i
const REVERSE = new Map([...ALPHABET].map((char, index) => [char, index]))

function driveHostnameForKey (keyHex) {
  if (typeof keyHex !== 'string' || !HEX_KEY.test(keyHex)) throw new Error('Invalid drive key format')
  let result = ''
  let bits = 0
  let value = 0
  for (let i = 0; i < keyHex.length; i += 2) {
    value = (value << 8) | parseInt(keyHex.slice(i, i + 2), 16)
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += ALPHABET[(value >>> bits) & 31]
    }
    value &= (1 << bits) - 1
  }
  if (bits > 0) result += ALPHABET[(value << (5 - bits)) & 31]
  return `d-${result}.localhost`
}

function driveKeyFromHostname (hostname) {
  if (typeof hostname !== 'string') return null
  const match = DRIVE_HOST.exec(hostname)
  if (!match) return null
  let keyHex = ''
  let bits = 0
  let value = 0
  for (const char of match[1].toLowerCase()) {
    value = (value << 5) | REVERSE.get(char)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      keyHex += ((value >>> bits) & 255).toString(16).padStart(2, '0')
      value &= (1 << bits) - 1
    }
  }
  if (keyHex.length !== 64 || value !== 0) return null
  return driveHostnameForKey(keyHex) === hostname.toLowerCase() ? keyHex : null
}

function isDriveOriginHostname (hostname) {
  return driveKeyFromHostname(hostname) !== null
}

module.exports = { driveHostnameForKey, driveKeyFromHostname, isDriveOriginHostname }
