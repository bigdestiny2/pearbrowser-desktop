# Lighthouse Phase 0 — live-wiring notes (deferred commit)

The Phase-0 engine (`backend/search-core.cjs`, `backend/personal-index.cjs`) is
committed + tested. The live wiring below is **applied to the working tree**
(full suite green) but **not committed**, because `index.js` / `constants.js` /
`ui/boot.js` carry concurrent in-flight work that must not be swept into a
search commit. Recorded here so it is recoverable if those files are
overwritten. Re-apply on the clean integration pass.

## `backend/constants.js`
```js
// after CMD_LOAD_CATALOG_INDEX = 176
const CMD_SEARCH = 177        // query the personal index
const CMD_SEARCH_INDEX = 178  // index a page { driveKey, path, title, text }
// add CMD_SEARCH, CMD_SEARCH_INDEX to module.exports
```

## `ui/boot.js` (the `C = {}` mirror)
```js
CMD_SEARCH: 177,
CMD_SEARCH_INDEX: 178,
```

## `backend/index.js`
- `let personalIndex = null` near the other manager declarations.
- After `userData.ready()` (identity already constructed):
```js
try {
  const { PersonalIndex } = require('./personal-index.cjs') // lazy: degrade, don't crash boot
  const sign = (canonDoc) => {
    const r = identity.signForApp('search', JSON.stringify(canonDoc), 'lighthouse-doc-v2')
    return { sig: r.signature, pubkey: r.publicKey }
  }
  personalIndex = await new PersonalIndex(store, { sign }).ready()
} catch (err) { personalIndex = null }
```
- Handlers (near the catalog handlers):
```js
rpc.handle(C.CMD_SEARCH, async (data) => {
  await whenReady()
  if (!personalIndex) return { results: [], stats: { docs: 0 } }
  const results = await personalIndex.search(String((data && data.query) || ''),
    { now0: Date.now(), limit: (data && data.limit) || 50 })
  return { results, stats: await personalIndex.stats() }
})
rpc.handle(C.CMD_SEARCH_INDEX, async (data) => {
  await whenReady()
  if (!personalIndex || !data || !data.driveKey) return { ok: false }
  try {
    const docId = await personalIndex.indexDoc({
      driveKey: normalizeDriveKey(data.driveKey), path: data.path || '/',
      title: data.title || '', body: data.text || data.body || '',
      publishedAt: Number.isFinite(data.publishedAt) ? data.publishedAt : 0,
    })
    return { ok: !!docId, docId }
  } catch { return { ok: false } }
})
```
- Cleanup in shutdown: `if (personalIndex) { try { await personalIndex.close() } catch {} personalIndex = null }`

## UI (deferred — `ui/shell.js`)
A search box that calls `CMD_SEARCH` and renders `{driveKey, path, title}` hits
as clickable `hyper://` links; and a `CMD_SEARCH_INDEX` push on page load
(title + extracted visible text) and on bookmark. Not yet applied (shell.js is
under heavy concurrent edit).

## Bare `.cjs` resolution
`search-core.cjs` / `personal-index.cjs` are CommonJS `.cjs` (Node-testable +
Bare-requirable). The require is lazy + guarded, so if Bare cannot resolve the
extension, search disables gracefully rather than crashing boot — verify on the
first real Bare run; if it fails, rename to `.js` (and switch tests to a CJS
shim) or vendor a loader.
