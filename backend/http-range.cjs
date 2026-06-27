'use strict'

function parseByteRangeHeader (header, totalBytes) {
  if (typeof header !== 'string') return null
  const total = Number(totalBytes)
  if (!Number.isSafeInteger(total) || total < 0) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null

  const startRaw = match[1]
  const endRaw = match[2]
  if (!startRaw && !endRaw) return null
  if (total === 0) return { unsatisfiable: true, total: 0 }

  let start
  let end
  if (!startRaw) {
    const suffix = Number.parseInt(endRaw, 10)
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null
    start = suffix >= total ? 0 : total - suffix
    end = total - 1
  } else {
    start = Number.parseInt(startRaw, 10)
    end = endRaw ? Number.parseInt(endRaw, 10) : total - 1
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null
    if (start < 0 || end < 0) return null
    if (start > end || start >= total) return { unsatisfiable: true, total }
    if (end >= total) end = total - 1
  }

  return {
    unsatisfiable: false,
    start,
    end,
    total,
    length: end - start + 1
  }
}

module.exports = {
  parseByteRangeHeader
}
