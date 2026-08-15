'use strict'

// RFC 8785 canonical JSON for the release-owned data subset used by network
// manifests and approval fingerprints. It deliberately rejects values outside
// JSON's interoperable scalar/object/array model and all unsafe numbers.
function canonicalizeReleaseData (value, ancestors = new Set()) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('canonical release data contains an unsafe number')
    return JSON.stringify(value)
  }
  if (!value || typeof value !== 'object') throw new Error('canonical release data contains an unsupported value')
  if (ancestors.has(value)) throw new Error('canonical release data contains a cycle')
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      return '[' + value.map(entry => canonicalizeReleaseData(entry, ancestors)).join(',') + ']'
    }
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) {
      throw new Error('canonical release data contains a non-plain record')
    }
    const keys = Reflect.ownKeys(value)
    if (keys.some(key => typeof key !== 'string')) {
      throw new Error('canonical release data contains a symbol key')
    }
    keys.sort()
    return '{' + keys.map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !('value' in descriptor) || descriptor.get || descriptor.set) {
        throw new Error('canonical release data contains an accessor')
      }
      return JSON.stringify(key) + ':' + canonicalizeReleaseData(descriptor.value, ancestors)
    }).join(',') + '}'
  } finally {
    ancestors.delete(value)
  }
}

module.exports = { canonicalizeReleaseData }
