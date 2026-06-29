export function tamperLastHexByte (hex) {
  if (typeof hex !== 'string' || hex.length < 2 || hex.length % 2 !== 0) {
    throw new Error('expected an even-length hex string')
  }
  const lastByte = hex.slice(-2).toLowerCase()
  return hex.slice(0, -2) + (lastByte === '00' ? '01' : '00')
}
