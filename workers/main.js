// PearBrowser's v3 Bare worker. PearRuntime.run() places user-supplied worker
// arguments after the executable and worker specifier, so the first two live
// at Bare.argv[2] and Bare.argv[3]. Keep this tiny bootstrap separate from the
// backend so its launch contract is explicit and testable.
const args = globalThis.Bare?.argv || []
const storagePath = String(args[2] || '')
const sessionToken = String(args[3] || '')

if (!storagePath || !sessionToken) {
  throw new Error('PearBrowser v3 worker requires storage path and session token')
}

globalThis.PearBrowserRuntime = { storagePath, sessionToken }

await import('../index.js')
