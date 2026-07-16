'use strict'

// HTML treats <style> contents as raw text and closes the element on a literal
// "</style", regardless of CSS tokenization. Encode every less-than sign as a
// CSS code point before embedding third-party CSS at any HTML injection sink.
function escapeStyleText (css) {
  if (typeof css !== 'string') return ''
  return css.replace(/</g, '\\3c ')
}

module.exports = { escapeStyleText }
