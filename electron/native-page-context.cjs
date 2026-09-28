'use strict'

// Evaluated in an isolated Chromium world owned by the native tab host. The
// page controls its DOM, so every returned field remains untrusted page data.
// The expression never reads bridge tokens, form values, or hidden content.
const CONTEXT_EXPRESSION = `(() => {
  const maxTitle = 512
  const maxSelection = 8 * 1024
  const maxBody = 20 * 1024
  const maxTotal = 24 * 1024
  const maxNodes = 5000
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const normalize = value => String(value || '').replace(/\\r\\n?/g, '\\n').replace(/[\\t\\f\\v ]+/g, ' ').replace(/ *\\n */g, '\\n').replace(/\\n{3,}/g, '\\n\\n').trim()
  const cut = (value, max) => {
    const bytes = encoder.encode(normalize(value))
    if (bytes.length <= max) return { text: decoder.decode(bytes), bytes: bytes.length, truncated: false }
    let end = max
    while (end > 0 && (bytes[end] & 192) === 128) end--
    return { text: decoder.decode(bytes.subarray(0, end)), bytes: end, truncated: true }
  }
  const title = cut(document.title || '', maxTitle)
  const selection = cut(window.getSelection?.()?.toString() || '', maxSelection)
  const allowedBody = Math.min(maxBody, Math.max(0, maxTotal - title.bytes - selection.bytes))
  let body = ''
  let visited = 0
  let bodyTruncated = false
  let nodeLimitReached = false
  const excluded = 'script,style,noscript,template,input,textarea,select,option,[hidden],[aria-hidden="true"]'
  if (document.body && allowedBody > 0) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      if (visited++ >= maxNodes) { nodeLimitReached = true; bodyTruncated = true; break }
      const parent = node.parentElement
      if (!parent || parent.closest(excluded)) continue
      if (typeof parent.checkVisibility === 'function' && !parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      const piece = cut((body ? '\\n' : '') + node.data, allowedBody - encoder.encode(body).length)
      body += piece.text
      if (piece.truncated) { bodyTruncated = true; break }
    }
  }
  const bodyBytes = encoder.encode(body).length
  return {
    context: { title: title.text, selection: selection.text, body },
    bytes: { title: title.bytes, selection: selection.bytes, body: bodyBytes, total: title.bytes + selection.bytes + bodyBytes },
    flags: { truncated: title.truncated || selection.truncated || bodyTruncated, titleTruncated: title.truncated, selectionTruncated: selection.truncated, bodyTruncated, nodeLimitReached }
  }
})()`

module.exports = { CONTEXT_EXPRESSION }
