import { useEffect, useState } from 'react'
import { html } from 'htm/react'
import { formatBytes, formatSyncInvite, parseSyncInvite, shortKey } from '../lib/keys.js'
import { serializeTab } from '../lib/tabs.js'

// Multi-device browser-state sync settings surface.
//
// Pairing (two of your own devices):
//   Device A: Set up sync, copy the invite.
//   Device B: paste the invite, pair, copy B's writer key.
//   Device A: paste B's writer key, add device. B becomes a writer on sync.
export function DeviceSync ({ rpc, C, currentTabs = [], activeId = '', onOpenTab }) {
  const [status, setStatus] = useState(null) // null = still loading
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [writerInput, setWriterInput] = useState('')
  const [copied, setCopied] = useState('')
  const [inviteSecret, setInviteSecret] = useState('')
  const [inviteRevealed, setInviteRevealed] = useState(false)

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 2200) }
  const copy = (text, what) => { if (!text) return; try { navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500) } catch {} }
  const clearInvite = () => { setInviteSecret(''); setInviteRevealed(false) }

  const loadStatus = async () => {
    setErr('')
    try {
      const next = await rpc.request(C.CMD_SYNC_STATUS)
      setStatus(next)
      if (!next?.paired) clearInvite()
    } catch (e) { setErr(e.message); setStatus({ enabled: true, paired: false }); clearInvite() }
  }
  useEffect(() => { loadStatus() }, [])

  const refresh = async () => { setBusy('refresh'); try { await loadStatus() } finally { setBusy(null) } }

  const create = async () => {
    setErr(''); setBusy('create')
    try { clearInvite(); await rpc.request(C.CMD_SYNC_CREATE, {}, 60000); await loadStatus(); flash('Sync is on - this device is the first writer.') }
    catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const join = async () => {
    const parsed = parseSyncInvite(joinInput)
    if (!parsed) { setErr('That is not a valid sync invite - expected sync://<64-hex>:<64-hex>.'); return }
    setErr(''); setBusy('join')
    try {
      clearInvite()
      await rpc.request(C.CMD_SYNC_JOIN, parsed, 60000)
      setJoinInput(''); await loadStatus()
      flash("Paired. Copy this device's writer key below, then add it from a writer device.")
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const addWriter = async () => {
    const writerKey = (parseSyncInvite(writerInput)?.key || writerInput).trim().toLowerCase()
    setErr(''); setBusy('writer')
    try {
      await rpc.request(C.CMD_SYNC_ADD_WRITER, { writerKey }, 60000)
      setWriterInput(''); flash('Device added - it becomes a writer once it syncs.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const pushLocal = async () => {
    setErr(''); setBusy('push')
    try {
      const res = await rpc.request(C.CMD_SYNC_PUSH_LOCAL, {}, 60000)
      await loadStatus(); flash(`Imported ${res?.pushed ?? 0} local bookmark(s) into the synced set.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const loadInvite = async () => {
    if (inviteSecret) return inviteSecret
    const res = await rpc.request(C.CMD_SYNC_GET_INVITE, {}, 60000)
    const next = res?.invite || formatSyncInvite(res?.key, res?.encKey)
    if (!next) throw new Error('Pairing invite is unavailable on this device.')
    setInviteSecret(next)
    if (res?.keyAudit) setStatus((prev) => prev ? { ...prev, keyAudit: res.keyAudit } : prev)
    return next
  }

  const revealInvite = async () => {
    if (inviteRevealed) { setInviteRevealed(false); return }
    setErr(''); setBusy('invite')
    try { await loadInvite(); setInviteRevealed(true) }
    catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const copyInvite = async () => {
    setErr(''); setBusy('invite-copy')
    try {
      const next = await loadInvite()
      copy(next, 'invite')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const currentSessionPayload = () => {
    const tabs = (Array.isArray(currentTabs) ? currentTabs : [])
      .map((tab) => serializeTab(tab, activeId))
      .filter((tab) => tab && (tab.url || tab.displayUrl))
    const activeUrl = tabs.find((tab) => tab.active)?.url || tabs[0]?.url || ''
    return { label: 'This device', tabs, activeUrl }
  }

  const syncTabs = async () => {
    const { tabs, activeUrl } = currentSessionPayload()
    if (!tabs.length) { setErr('No open tabs to sync yet.'); return }
    setErr(''); setBusy('tabs')
    try {
      await rpc.request(C.CMD_SYNC_PUT_SESSION, { label: 'This device', tabs, activeUrl }, 60000)
      await loadStatus(); flash(`Synced ${tabs.length} open tab${tabs.length === 1 ? '' : 's'}.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const pushSettings = async () => {
    setErr(''); setBusy('settings-push')
    try {
      const res = await rpc.request(C.CMD_SYNC_PUT_SETTINGS, {}, 60000)
      await loadStatus(); flash(`Synced ${res?.pushed ?? 0} setting${res?.pushed === 1 ? '' : 's'} from this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const applySettings = async () => {
    setErr(''); setBusy('settings-apply')
    try {
      const res = await rpc.request(C.CMD_SYNC_APPLY_SETTINGS, {}, 60000)
      await loadStatus(); flash(`Applied ${res?.applied ?? 0} synced setting${res?.applied === 1 ? '' : 's'} to this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const pushProfile = async () => {
    setErr(''); setBusy('profile-push')
    try {
      const res = await rpc.request(C.CMD_SYNC_PUT_PROFILE, {}, 60000)
      await loadStatus(); flash(`Synced ${res?.pushed ?? 0} profile field${res?.pushed === 1 ? '' : 's'} from this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const applyProfile = async () => {
    setErr(''); setBusy('profile-apply')
    try {
      const res = await rpc.request(C.CMD_SYNC_APPLY_PROFILE, {}, 60000)
      await loadStatus(); flash(`Applied ${res?.applied ?? 0} synced profile field${res?.applied === 1 ? '' : 's'} to this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const pushHistory = async () => {
    setErr(''); setBusy('history-push')
    try {
      const res = await rpc.request(C.CMD_SYNC_PUT_HISTORY, {}, 60000)
      await loadStatus(); flash(`Synced ${res?.pushed ?? 0} history entr${res?.pushed === 1 ? 'y' : 'ies'} from this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const applyHistory = async () => {
    setErr(''); setBusy('history-apply')
    try {
      const res = await rpc.request(C.CMD_SYNC_APPLY_HISTORY, {}, 60000)
      await loadStatus(); flash(`Applied ${res?.applied ?? 0} synced history entr${res?.applied === 1 ? 'y' : 'ies'} to this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const pushContacts = async () => {
    setErr(''); setBusy('contacts-push')
    try {
      const res = await rpc.request(C.CMD_SYNC_PUT_CONTACTS, {}, 60000)
      await loadStatus(); flash(`Synced ${res?.pushed ?? 0} contact${res?.pushed === 1 ? '' : 's'} from this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const applyContacts = async () => {
    setErr(''); setBusy('contacts-apply')
    try {
      const res = await rpc.request(C.CMD_SYNC_APPLY_CONTACTS, {}, 60000)
      await loadStatus(); flash(`Applied ${res?.applied ?? 0} synced contact${res?.applied === 1 ? '' : 's'} to this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const pushAppGrants = async () => {
    setErr(''); setBusy('grants-push')
    try {
      const res = await rpc.request(C.CMD_SYNC_PUT_APP_GRANTS, {}, 60000)
      await loadStatus(); flash(`Synced ${res?.pushed ?? 0} app grant${res?.pushed === 1 ? '' : 's'} from this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const applyAppGrants = async () => {
    setErr(''); setBusy('grants-apply')
    try {
      const res = await rpc.request(C.CMD_SYNC_APPLY_APP_GRANTS, {}, 60000)
      await loadStatus(); flash(`Applied ${res?.applied ?? 0} synced app grant${res?.applied === 1 ? '' : 's'} to this device.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const forgetSync = async () => {
    const ok = typeof window === 'undefined' || window.confirm('Forget this sync group on this device? Local browser data stays here, but this device will no longer know the saved sync keys.')
    if (!ok) return
    setErr(''); setBusy('forget')
    try {
      await rpc.request(C.CMD_SYNC_FORGET, {}, 60000)
      clearInvite(); setJoinInput(''); setWriterInput(''); await loadStatus()
      flash('Forgot this sync group on this device.')
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const rotateSync = async () => {
    const ok = typeof window === 'undefined' || window.confirm('Rotate to a new encrypted sync group? This carries this device state forward and leaves old paired devices on the old group.')
    if (!ok) return
    setErr(''); setBusy('rotate')
    try {
      clearInvite()
      const res = await rpc.request(C.CMD_SYNC_ROTATE, currentSessionPayload(), 60000)
      const seeded = res?.seeded || {}
      const total = (seeded.bookmarks || 0) + (seeded.settings || 0) + (seeded.profile || 0) +
        (seeded.history || 0) + (seeded.contacts || 0) + (seeded.loginGrants || 0) +
        (seeded.swarmGrants || 0) + (seeded.sessionTabs || 0)
      await loadStatus()
      flash(`Rotated sync group and carried forward ${total} item${total === 1 ? '' : 's'}. Share the new invite with devices you still trust.`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const compactSync = async () => {
    setErr(''); setBusy('compact')
    try {
      const res = await rpc.request(C.CMD_SYNC_COMPACT, {}, 60000)
      await loadStatus()
      const retained = res?.retentionAudit?.retainedOps
      flash(`Compacted sync log${Number.isFinite(retained) ? `; retaining ${retained} operation${retained === 1 ? '' : 's'} locally.` : '.'}`)
    } catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  const removeBookmark = async (url) => {
    setErr(''); setBusy('rm:' + url)
    try { await rpc.request(C.CMD_SYNC_REMOVE_BOOKMARK, { url }, 60000); await loadStatus() }
    catch (e) { setErr(e.message) } finally { setBusy(null) }
  }

  if (status === null) return html`<div className="settings-card"><div className="settings-subtle">Loading...</div></div>`

  const paired = !!status.paired
  const writable = !!status.writable
  const inviteAvailable = paired && !!(status.inviteAvailable || status.key)
  const invitePreview = inviteRevealed && inviteSecret
    ? inviteSecret
    : (status.key ? `sync://${shortKey(status.key)}:<hidden encryption key>` : '(unavailable)')
  const bookmarks = Array.isArray(status.bookmarks) ? status.bookmarks : []
  const sessions = Array.isArray(status.sessions) ? status.sessions : []
  const syncedHistory = Array.isArray(status.history) ? status.history : []
  const syncedContacts = Array.isArray(status.contacts) ? status.contacts : []
  const syncedAppGrants = status.appGrants && typeof status.appGrants === 'object' ? status.appGrants : {}
  const syncedLoginGrants = Array.isArray(syncedAppGrants.login) ? syncedAppGrants.login : []
  const syncedSwarmGrants = Array.isArray(syncedAppGrants.swarm) ? syncedAppGrants.swarm : []
  const syncedSettings = status.settings && typeof status.settings === 'object' ? status.settings : {}
  const syncedProfile = status.profile && typeof status.profile === 'object' ? status.profile : {}
  const count = (status.count && Number.isFinite(status.count.bookmarks)) ? status.count.bookmarks : bookmarks.length
  const sessionCount = (status.count && Number.isFinite(status.count.sessions)) ? status.count.sessions : sessions.length
  const historyCount = (status.count && Number.isFinite(status.count.history)) ? status.count.history : syncedHistory.length
  const contactsCount = (status.count && Number.isFinite(status.count.contacts)) ? status.count.contacts : syncedContacts.length
  const loginGrantCount = (status.count && Number.isFinite(status.count.loginGrants)) ? status.count.loginGrants : syncedLoginGrants.length
  const swarmGrantCount = (status.count && Number.isFinite(status.count.swarmGrants)) ? status.count.swarmGrants : syncedSwarmGrants.length
  const appGrantCount = loginGrantCount + swarmGrantCount
  const settingsCount = (status.count && Number.isFinite(status.count.settings)) ? status.count.settings : Object.keys(syncedSettings).length
  const profileCount = (status.count && Number.isFinite(status.count.profile)) ? status.count.profile : Object.keys(syncedProfile).length
  const storageAudit = status.storageAudit && typeof status.storageAudit === 'object' ? status.storageAudit : null
  const storageAuditRows = Array.isArray(storageAudit?.rows) ? storageAudit.rows : []
  const storageAuditOk = storageAudit ? storageAudit.ok !== false : true
  const storageAuditBytes = Number.isFinite(storageAudit?.snapshotBytes) ? formatBytes(storageAudit.snapshotBytes) : ''
  const keyAudit = status.keyAudit && typeof status.keyAudit === 'object' ? status.keyAudit : null
  const keyAuditRows = Array.isArray(keyAudit?.rows) ? keyAudit.rows : []
  const keyAuditOk = keyAudit ? keyAudit.ok !== false : true
  const retentionAudit = status.retentionAudit && typeof status.retentionAudit === 'object' ? status.retentionAudit : null
  const retentionAuditRows = Array.isArray(retentionAudit?.rows) ? retentionAudit.rows : []
  const retentionAuditOk = retentionAudit ? retentionAudit.ok !== false : true

  return html`
    <div className="settings-card">
      ${err && html`<div className="apps-error">${err}</div>`}
      ${notice && html`<div className="apps-ok">${notice}</div>`}

      ${!paired && html`<div className="sync-setup">
        <div className="settings-row">
          <div>
            <div className="settings-label">Set up sync on this device</div>
            <div className="settings-subtle">Creates a private, encrypted browser-state store. This device becomes the first writer; pair your other devices to it.</div>
          </div>
          <button className="btn primary" onClick=${create} disabled=${busy === 'create'}>${busy === 'create' ? 'Setting up...' : 'Set up sync'}</button>
        </div>
        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">...or pair this device with another</div>
            <input className="profile-input" placeholder="sync://<key>:<encryption-key>" value=${joinInput}
                   onInput=${(e) => setJoinInput(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && join()} />
          </div>
          <button className="btn" onClick=${join} disabled=${busy === 'join' || !joinInput.trim()}>${busy === 'join' ? 'Pairing...' : 'Pair'}</button>
        </div>
      </div>`}

      ${paired && html`<div className="sync-paired">
        <div className="settings-row">
          <div>
            <div className="settings-label">Syncing ${writable ? '' : html`<span className="settings-subtle">- read-only on this device</span>`}</div>
            <div className="settings-subtle">${count} bookmark(s) - ${sessionCount} session${sessionCount === 1 ? '' : 's'} - ${historyCount} history entr${historyCount === 1 ? 'y' : 'ies'} - ${contactsCount} contact${contactsCount === 1 ? '' : 's'} - ${appGrantCount} app grant${appGrantCount === 1 ? '' : 's'} - ${settingsCount} setting${settingsCount === 1 ? '' : 's'} - ${profileCount} profile field${profileCount === 1 ? '' : 's'}</div>
          </div>
          <div className="settings-row-actions">
            <button className="btn subtle small" onClick=${refresh} disabled=${busy === 'refresh'} title="Re-check sync status (e.g. after another device added this one as a writer)">${busy === 'refresh' ? 'Refreshing...' : 'Refresh'}</button>
            ${writable && html`<button className="btn subtle" onClick=${pushLocal} disabled=${busy === 'push'}>${busy === 'push' ? 'Importing...' : 'Import local bookmarks'}</button>`}
            ${writable && html`<button className="btn subtle" onClick=${syncTabs} disabled=${busy === 'tabs'}>${busy === 'tabs' ? 'Syncing...' : 'Sync open tabs'}</button>`}
            ${writable && html`<button className="btn subtle" onClick=${pushHistory} disabled=${busy === 'history-push'}>${busy === 'history-push' ? 'Syncing...' : 'Sync history'}</button>`}
            <button className="btn subtle" onClick=${applyHistory} disabled=${busy === 'history-apply' || historyCount === 0}>${busy === 'history-apply' ? 'Applying...' : 'Apply history'}</button>
            ${writable && html`<button className="btn subtle" onClick=${pushContacts} disabled=${busy === 'contacts-push'}>${busy === 'contacts-push' ? 'Syncing...' : 'Sync contacts'}</button>`}
            <button className="btn subtle" onClick=${applyContacts} disabled=${busy === 'contacts-apply' || contactsCount === 0}>${busy === 'contacts-apply' ? 'Applying...' : 'Apply contacts'}</button>
            ${writable && html`<button className="btn subtle" onClick=${pushAppGrants} disabled=${busy === 'grants-push'}>${busy === 'grants-push' ? 'Syncing...' : 'Sync app grants'}</button>`}
            <button className="btn subtle" onClick=${applyAppGrants} disabled=${busy === 'grants-apply' || appGrantCount === 0}>${busy === 'grants-apply' ? 'Applying...' : 'Apply app grants'}</button>
            ${writable && html`<button className="btn subtle" onClick=${pushSettings} disabled=${busy === 'settings-push'}>${busy === 'settings-push' ? 'Syncing...' : 'Sync settings'}</button>`}
            <button className="btn subtle" onClick=${applySettings} disabled=${busy === 'settings-apply' || settingsCount === 0}>${busy === 'settings-apply' ? 'Applying...' : 'Apply settings'}</button>
            ${writable && html`<button className="btn subtle" onClick=${pushProfile} disabled=${busy === 'profile-push'}>${busy === 'profile-push' ? 'Syncing...' : 'Sync profile'}</button>`}
            <button className="btn subtle" onClick=${applyProfile} disabled=${busy === 'profile-apply' || profileCount === 0}>${busy === 'profile-apply' ? 'Applying...' : 'Apply profile'}</button>
          </div>
        </div>

        ${storageAudit && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Sync storage bounds</div>
              <div className="settings-subtle">
                ${storageAuditOk ? 'Current synced snapshots are within bounded limits.' : 'One or more synced snapshots exceed their safety limits.'}
                ${storageAuditBytes ? ` Materialized snapshot: ${storageAuditBytes}.` : ''}
              </div>
              <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                ${storageAuditRows.map((row) => html`
                  <span
                    className=${`src-badge ${row.ok === false ? 'danger' : (row.near ? 'other' : 'self')}`}
                    key=${row.key}
                    title=${row.label}
                  >${row.count}/${row.max} ${row.key}</span>
                `)}
              </div>
            </div>
          </div>
        `}

        ${keyAudit && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Sync key handling</div>
              <div className="settings-subtle">
                ${keyAuditOk ? 'Pairing secrets are stored locally and hidden from regular status refreshes.' : 'One or more sync key-handling checks need attention.'}
              </div>
              <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                ${keyAuditRows.map((row) => html`
                  <span
                    className=${`src-badge ${row.ok === false ? 'danger' : 'self'}`}
                    key=${row.key}
                    title=${row.detail || row.label}
                  >${row.key}</span>
                `)}
              </div>
            </div>
          </div>
        `}

        ${retentionAudit && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Sync log retention</div>
              <div className="settings-subtle">
                ${retentionAuditOk ? 'Local sync history is within retention bounds.' : 'This device should compact its local sync view.'}
                ${Number.isFinite(retentionAudit.compactedOps) && retentionAudit.compactedOps > 0 ? ` ${retentionAudit.compactedOps} older operation${retentionAudit.compactedOps === 1 ? '' : 's'} covered by checkpoints.` : ''}
              </div>
              <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                ${retentionAuditRows.map((row) => html`
                  <span
                    className=${`src-badge ${row.ok === false ? 'danger' : (row.near ? 'other' : 'self')}`}
                    key=${row.key}
                    title=${row.label}
                  >${row.count}/${row.max} ${row.key}</span>
                `)}
              </div>
            </div>
            ${writable && html`<button className="btn small subtle" onClick=${compactSync} disabled=${busy === 'compact'}>${busy === 'compact' ? 'Compacting...' : 'Compact sync log'}</button>`}
          </div>
        `}

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">Pairing invite - open this on another device to sync it</div>
            <code className="settings-code">${invitePreview}</code>
            <div className="settings-subtle">Hidden until you reveal or copy it. The full invite carries your encryption key - treat it like a password.</div>
          </div>
          <div className="settings-row-actions">
            <button className="btn small" onClick=${revealInvite} disabled=${!inviteAvailable || busy === 'invite'}>
              ${busy === 'invite' ? 'Loading...' : (inviteRevealed ? 'Hide' : 'Reveal')}
            </button>
            <button className="btn small" onClick=${copyInvite} disabled=${!inviteAvailable || busy === 'invite-copy'}>
              ${copied === 'invite' ? 'Copied' : (busy === 'invite-copy' ? 'Copying...' : 'Copy')}
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="profile-field">
            <div className="settings-label">This device's writer key${writable ? '' : ' - give it to a writer device to be added'}</div>
            <code className="settings-code">${status.writerKey || '(unavailable)'}</code>
          </div>
          <button className="btn small" onClick=${() => copy(status.writerKey, 'writer')} disabled=${!status.writerKey}>${copied === 'writer' ? 'Copied' : 'Copy'}</button>
        </div>

        ${writable && html`
          <div className="settings-row">
            <div className="profile-field">
              <div className="settings-label">Add another device (paste its writer key)</div>
              <input className="profile-input" placeholder="64-hex writer key" value=${writerInput}
                     onInput=${(e) => setWriterInput(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && addWriter()} />
            </div>
            <button className="btn" onClick=${addWriter} disabled=${busy === 'writer' || !writerInput.trim()}>${busy === 'writer' ? 'Adding...' : 'Add device'}</button>
          </div>
        `}

        ${!writable && html`<div className="settings-subtle">This device is read-only until a writer device adds the key above. Synced bookmarks still replicate here in the meantime.</div>`}

        <div className="settings-row">
          <div>
            <div className="settings-label">Recovery and revocation</div>
            <div className="settings-subtle">Rotate creates a fresh encrypted group and carries this device state forward. Old paired devices keep the old group but stop receiving future updates from this one. Forget only removes this device's saved sync keys.</div>
          </div>
          <div className="settings-row-actions">
            <button className="btn subtle" onClick=${rotateSync} disabled=${busy === 'rotate'}>${busy === 'rotate' ? 'Rotating...' : 'Rotate sync group'}</button>
            <button className="btn subtle danger" onClick=${forgetSync} disabled=${busy === 'forget'}>${busy === 'forget' ? 'Forgetting...' : 'Forget this group'}</button>
          </div>
        </div>

        ${settingsCount > 0 && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Synced settings snapshot</div>
              <div className="settings-subtle">${Object.keys(syncedSettings).slice(0, 8).join(', ')}${settingsCount > 8 ? `, +${settingsCount - 8} more` : ''}</div>
            </div>
          </div>
        `}

        ${profileCount > 0 && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Synced profile snapshot</div>
              <div className="settings-subtle">${Object.keys(syncedProfile).slice(0, 8).join(', ')}${profileCount > 8 ? `, +${profileCount - 8} more` : ''}</div>
            </div>
          </div>
        `}

        ${historyCount > 0 && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Synced history snapshot</div>
              <div className="settings-subtle">${syncedHistory.slice(0, 5).map((h) => h.title || h.url).join(', ')}${historyCount > 5 ? `, +${historyCount - 5} more` : ''}</div>
            </div>
          </div>
        `}

        ${contactsCount > 0 && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Synced contacts snapshot</div>
              <div className="settings-subtle">${syncedContacts.slice(0, 5).map((c) => c.displayName || shortKey(c.pubkey)).join(', ')}${contactsCount > 5 ? `, +${contactsCount - 5} more` : ''}</div>
            </div>
          </div>
        `}

        ${appGrantCount > 0 && html`
          <div className="settings-row">
            <div>
              <div className="settings-label">Synced app grants snapshot</div>
              <div className="settings-subtle">${loginGrantCount} sign-in grant${loginGrantCount === 1 ? '' : 's'} - ${swarmGrantCount} swarm topic${swarmGrantCount === 1 ? '' : 's'}</div>
            </div>
          </div>
        `}

        ${sessions.length > 0 && html`<div className="sync-bookmarks">
          <div className="settings-row"><div className="settings-label">Synced open tabs</div></div>
          ${sessions.map((session) => html`
            <div className="settings-row" key=${session.deviceId}>
              <div>
                <div className="settings-label">${session.label || 'Device'}${session.deviceId === status.writerKey ? ' - this device' : ''}</div>
                <div className="settings-subtle">${(session.tabs || []).length} tab${(session.tabs || []).length === 1 ? '' : 's'}${session.updatedAt ? ` - ${new Date(session.updatedAt).toLocaleString()}` : ''}</div>
                <div className="sync-tabs-list">
                  ${(session.tabs || []).slice(0, 8).map((tab) => html`
                    <button className="sync-tab-link" key=${tab.url + tab.title} onClick=${() => onOpenTab?.(tab.url)}>
                      <span>${tab.title || tab.url}</span>
                      <small>${tab.url}</small>
                    </button>
                  `)}
                </div>
              </div>
            </div>
          `)}
        </div>`}

        ${bookmarks.length > 0 && html`<div className="sync-bookmarks">
          <div className="settings-row"><div className="settings-label">Synced bookmarks</div></div>
          ${bookmarks.map((b) => html`
            <div className="settings-row" key=${b.url}>
              <div>
                <div className="settings-label">${b.title || b.url}</div>
                <div className="settings-subtle">${b.url}</div>
              </div>
              ${writable && html`<button className="btn small subtle" onClick=${() => removeBookmark(b.url)} disabled=${busy === 'rm:' + b.url}>Remove</button>`}
            </div>
          `)}
        </div>`}
      </div>`}
    </div>
  `
}
