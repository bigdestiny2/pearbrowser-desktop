/* peerit Enhancer content script — example Pear Plugin surface.
 *
 * Runs only on the peerit drive (matches in manifest.json). Adds j/k
 * keyboard navigation between posts. Content scripts are injected
 * hash-authorized through the browser's CSP pipeline, so these exact
 * bytes are what the user approved at install time. */
(() => {
  'use strict'
  if (window.__peeritEnhancer) return
  window.__peeritEnhancer = true

  const postSelector = '.post, .post-row, article'
  let cursor = -1

  function posts () {
    return [...document.querySelectorAll(postSelector)]
  }

  function focusPost (index) {
    const all = posts()
    if (!all.length) return
    cursor = Math.max(0, Math.min(all.length - 1, index))
    const el = all[cursor]
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    for (const other of all) other.style.outline = ''
    el.style.outline = '2px solid rgba(94, 176, 239, 0.65)'
    el.style.outlineOffset = '2px'
  }

  window.addEventListener('keydown', (event) => {
    if (event.target && /^(input|textarea|select)$/i.test(event.target.tagName)) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.key === 'j') focusPost(cursor + 1)
    else if (event.key === 'k') focusPost(cursor - 1)
  }, { passive: true })
})()
