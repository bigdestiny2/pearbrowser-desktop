export function normalizeLoginGrant (grant) {
  const driveKey = grant?.driveKey || grant?.driveKeyHex || ''
  return { ...(grant || {}), driveKey, driveKeyHex: driveKey }
}
