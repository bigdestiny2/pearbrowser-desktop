import { useEffect, useState } from 'react'
import { html } from 'htm/react'
import { importAttributionForCatalogSave } from '../lib/catalog-provenance.js'
import { unwrapSettings } from '../lib/settings.js'

export function catalogActionTargets (app) {
  if (!app || typeof app !== 'object') return []
  return [app.id, app.driveKey, app.link].filter(Boolean)
}

export function useMyCatalogWriter (rpc, C) {
  const [catalog, setCatalog] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  const flash = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2200)
  }

  const load = async () => {
    try {
      const settings = unwrapSettings(await rpc.request(C.CMD_USERDATA_GET_SETTINGS).catch(() => ({})))
      const key = typeof settings?.myCatalogKey === 'string' ? settings.myCatalogKey : ''
      if (!key) {
        setCatalog(null)
        setLoaded(true)
        return null
      }
      const cat = await rpc.request(C.CMD_MYCATALOG_GET, { keyHex: key }).catch(() => null)
      setCatalog(cat)
      setLoaded(true)
      return cat
    } catch (e) {
      setErr(e.message || 'catalog unavailable')
      setLoaded(true)
      return null
    }
  }

  useEffect(() => { load() }, [rpc, C])

  const ensureCatalog = async () => {
    if (catalog) return catalog
    const created = await rpc.request(C.CMD_MYCATALOG_CREATE, { name: 'My Catalog' }, 60000)
    await rpc.request(C.CMD_USERDATA_SET_SETTINGS, { updates: { myCatalogKey: created.keyHex } }).catch(() => {})
    setCatalog(created)
    return created
  }

  const hasApp = (app) => {
    const targets = catalogActionTargets(app)
    if (!catalog || !Array.isArray(catalog.apps) || !targets.length) return false
    return catalog.apps.some((row) => targets.some((target) => row.id === target || row.driveKey === target || row.link === target))
  }

  const add = async (app) => {
    if (!app) return null
    const id = app.id || app.driveKey || app.link || 'app'
    setErr('')
    setBusy(`catalog:${id}`)
    try {
      const cat = await ensureCatalog()
      if (!cat.writable) throw new Error('This catalog is not editable on this device.')
      const res = await rpc.request(C.CMD_MYCATALOG_ADD_APP, {
        keyHex: cat.keyHex,
        app: importAttributionForCatalogSave(app)
      }, 60000)
      setCatalog(res)
      flash(`Saved ${app.name || app.title || 'item'} to My Catalog.`)
      return res
    } catch (e) {
      setErr(e.message || 'add to catalog failed')
      return null
    } finally {
      setBusy(null)
    }
  }

  return { catalog, loaded, busy, err, notice, add, hasApp, reload: load }
}

export function AddToCatalogButton ({ catalogActions, app, className = 'btn small subtle', label = '+ Catalog' }) {
  if (!catalogActions || !app) return null
  const id = app.id || app.driveKey || app.link || 'app'
  const saved = catalogActions.hasApp(app)
  const busy = catalogActions.busy === `catalog:${id}`
  return html`
    <button
      className=${className}
      title=${saved ? 'Already in My Catalog' : 'Add to My Catalog'}
      onClick=${() => catalogActions.add(app)}
      disabled=${saved || busy || !catalogActions.loaded}
    >
      ${busy ? 'Saving...' : (saved ? 'Saved' : label)}
    </button>
  `
}
