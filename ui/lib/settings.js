export function unwrapSettings (res) {
  return (res && typeof res.settings === 'object' && res.settings !== null) ? res.settings : (res || {})
}
