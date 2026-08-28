import { sep } from 'node:path'

export function normalizeAsarEntry (path) {
  return String(path).replace(/^[\\/]+/, '').replace(/\\/g, '/')
}

export function toAsarExtractionPath (path, separator = sep) {
  return normalizeAsarEntry(path).split('/').join(separator)
}
