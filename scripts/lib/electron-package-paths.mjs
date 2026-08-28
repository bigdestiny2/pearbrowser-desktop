export function normalizeAsarEntry (path) {
  return String(path).replace(/^[\\/]+/, '').replace(/\\/g, '/')
}
