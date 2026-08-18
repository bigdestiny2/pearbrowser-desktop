/**
 * PearBrowser — Bare Worklet Backend
 *
 * The P2P engine that powers PearBrowser. Runs inside a Bare worklet
 * on the phone. Manages Hyperswarm connections, app store catalog,
 * site publishing, and the HTTP proxy for WebView content.
 */

const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const Hyperdrive = require('hyperdrive')
const b4a = require('b4a')
const z32 = require('z32')
const fs = require('bare-fs')
const crypto = require('bare-crypto')

// Normalize a Hyperdrive key from either 64-char hex or
// 52-char z-base-32 (Vinjari-style) into lowercase hex.
// Unknown formats pass through so existing errors still fire.
function normalizeDriveKey (raw) {
  if (!raw) return raw
  if (/^[0-9a-f]{64}$/i.test(raw)) return raw.toLowerCase()
  if (/^[13-9a-km-uw-z]{52}$/i.test(raw)) {
    try { return Buffer.from(z32.decode(raw.toLowerCase())).toString('hex') }
    catch { return raw }
  }
  return raw
}
const { WorkletRPC } = require('./rpc.js')
const { HyperProxy } = require('./hyper-proxy.js')
const { TabRuntime } = require('./tab-runtime.js')
const { RelayClient } = require('./relay-client.js')
const { CatalogManager } = require('./catalog-manager.js')
const communitySubmit = require('./community-submit.cjs')
const { AppManager } = require('./app-manager.js')
const { SiteManager } = require('./site-manager.js')
const { PearBridge, PEAR_SWARM_V1_SHIM, PEAR_SYNC_SHIM, PEAR_ANONGPT_SHIM, PEAR_WALLET_V1_SHIM } = require('./pear-bridge.js')
const { HttpBridge } = require('./http-bridge.js')
const { AskBrowserService } = require('./ai/ask-browser-service.cjs')
const { ContentShield } = require('./content-shield.cjs')
const { ShieldListSync } = require('./shield-list-sync.cjs')
const { PluginDriveLoader } = require('./plugin-drive-loader.cjs')
const { PluginCatalog } = require('./plugin-catalog.cjs')
const { PearPluginRegistry } = require('./pear-plugins.cjs')
const { SessionBridge } = require('./session-bridge.cjs')
const {
  normalizePrivacySettings,
  mergeSettingsWithPrivacyDefaults,
  isHistoryEnabled,
  isSearchIndexEnabled,
  DEFAULT_PRIVACY
} = require('./privacy-policy.cjs')
const { AnongptBuyer } = require('./anongpt-buyer.js')
const { UserData } = require('./user-data.js')
const { Identity, validateMnemonic } = require('./identity.js')
const { Profile } = require('./profile.js')
const { Contacts } = require('./contacts.js')
const { Names } = require('./names.cjs')
const { resolveName } = require('./resolve-name.cjs')
const { NameRegistry } = require('./name-registry-store.cjs')
const { NostrEventStore } = require('./nostr-events-store.cjs')
const { createSearchHandler } = require('./search-handler.js')
const { PersonalIndex } = require('./personal-index.cjs')
const { SwarmBridge } = require('./swarm-bridge.js')
const { SwarmGrants } = require('./swarm-grants.js')
const { WalletService } = require('./wallet/wallet-service.cjs')
const { WalletJournal } = require('./wallet/wallet-journal.cjs')
const { WdkEngineAdapter } = require('./wallet/wdk-engine.cjs')
const { WalletConsentBroker } = require('./wallet/wallet-consent.cjs')
const {
  normalizeListLimit,
  projectJournalEntries,
  balancesUnavailable
} = require('./wallet/wallet-chrome-reads.cjs')
const C = require('./constants.js')

const { IPC } = BareKit
const storagePath = Bare.argv[0] || './pearbrowser-storage'
const ENV = (typeof Bare !== 'undefined' && Bare.env) ||
  (typeof process !== 'undefined' && process.env) || {}
const ENABLE_DEV_CATALOGUE = ENV.PEARBROWSER_DEV_CATALOGUE === '1'
const ENABLE_RELAY_INDEX_ROOMS = ENV.PEARBROWSER_RELAY_INDEX_ROOMS === '1'
// Browser origin isolation is a security boundary, not an experiment: without
// it, one drive can same-origin read another drive's injected page/API tokens.
// Keep an explicit emergency rollback while shipping the safe posture by
// default.
const ENABLE_PER_DRIVE_ORIGINS = ENV.PEARBROWSER_PER_DRIVE_ORIGINS !== '0'

// Swallow benign races that would otherwise crash Bare with an
// unhandled rejection — most commonly `Corestore is closed` from
// a swarm connection that arrives mid-shutdown, or from inside
// p2p-hiverelay's connection handler after a drive is deleted.
Bare.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err && err.stack || err)
})
// Bare doesn't fire unhandledRejection by default; wrap with a
// process-level listener where available.
try {
  if (typeof process !== 'undefined' && process.on) {
    process.on('unhandledRejection', (err) => {
      console.error('[unhandledRejection]', err && err.stack || err)
    })
  }
} catch {}

// --- Storage Limits ---
const {
  DEFAULT_STORAGE_LIMIT: STORAGE_LIMIT,
  DEFAULT_EVICT_THRESHOLD: EVICT_THRESHOLD,
  shouldCleanupStorage,
  cleanupBrowseStorage
} = require('./storage-quota.cjs')
const STORAGE_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

// --- State ---

let swarm = null
let store = null
let proxy = null
let tabRuntime = null
let catalogManager = null
let personalIndex = null // Lighthouse Phase-0 local self-search (search-core)
let appManager = null
let siteManager = null
let pearBridge = null
let relayClient = null
let hiveRelay = null // p2p-hiverelay HiveRelayClient — always-on pinning
let userData = null
let identity = null
let profile = null
let contacts = null
let identityBindingPublisher = null // Lighthouse Phase 2 — root→search-key binding publish/resolve
let nostrBindingStore = null // NOSTR2 Phase 1 — local cross-curve binding state (npub + epoch)
let nostrEventStore = null // NOSTR Phase 2 — the user's own NIP-01 event log; null until first publish
let queryPlanner = null // Lighthouse Phase 2 — federated query orchestration (local-first + peer fan-out)
let names = null // naming Phase N1 — local petname store (names.cjs); null until ready
let nameRegistry = null // naming Phase N5 — multi-writer Autobase name registry; null until first use
let federatedNameResolver = null // naming Phase N5 — resolve contacts' names across their registries
let federatedNostrFeed = null // NOSTR Phase 3 — surface contacts' attested events in the feed
let swarmBridge = null
let swarmGrants = null
let aiService = null
let contentShield = null // Content Shield — request filter + cosmetic hiding (BROWSER_PARITY_PLAN.md)
let pearPlugins = null // Pear Plugins registry (Phase 3)
let shieldListSync = null // P2P filter-list subscriptions (Phase 2 gate)
let pluginDriveLoader = null // Plugin installs from drives (Phase 3 gate)
let pluginCatalog = null // Plugin discovery: builtin seed + subscribed catalogue drives
let sessionBridge = null // Clearnet session bridge facade (Phase 4)
let privacySettings = { ...DEFAULT_PRIVACY }
/** Map<requestId, { resolve, reject, timer }> for login() ceremonies. */
const pendingLogins = new Map()
/** Map<requestId, { resolve, reject, timer }> for swarm.join() consent ceremonies. */
const pendingSwarmConsents = new Map()
const SWARM_CONSENT_TIMEOUT_MS = 2 * 60 * 1000  // 2 minutes
// WDK wallet preview (docs/WDK_WALLET_V0.9_SPEC.md). walletConsent owns the
// pending-prompt map (keyed by intentId) — see backend/wallet/wallet-consent.cjs.
let wdkEngine = null // WdkEngineAdapter — spawns the EVM worklet on demand
let walletJournal = null // WalletJournal — sanitized lifecycle log on the shared Corestore
let walletService = null // WalletService — chrome-owned wallet orchestrator
let walletConsent = null // WalletConsentBroker — parks prompts for chrome approval
let peerCount = 0
let browseDrives = new Map() // keyHex → Hyperdrive (for ad-hoc browsing)
let storageTimer = null // handle for the periodic storage-quota check

// Resolves when boot() finishes setting up all managers. Handlers that
// need managers await this so RPC calls issued during the 1–2s boot
// window queue instead of crashing with `null.X`.
let bootResolve, bootReject
const bootReady = new Promise((res, rej) => { bootResolve = res; bootReject = rej })
async function whenReady () { return bootReady }

// --- RPC ---

const rpc = new WorkletRPC(IPC)
const askBrowserService = new AskBrowserService({
  getAiService: () => aiService,
  loadContext: async (page) => ({
    context: page,
    source: { kind: page?.text || page?.selection ? 'active-page' : 'metadata' }
  }),
  emit: (payload) => rpc.event(C.EVT_ASK_BROWSER_STREAM, payload)
})

// Browser commands
rpc.handle(C.CMD_NAVIGATE, async (data = {}) => {
  await whenReady()
  let navUrl = typeof data.url === 'string' ? data.url : ''
  if (!navUrl) throw new Error('url required')

  // Phase 4 clearnet / loopback / hyper routing via SessionBridge when ready.
  if (sessionBridge) {
    const resolved = sessionBridge.resolveNavigation(navUrl)
    if (resolved.kind === 'clearnet') {
      return {
        localUrl: resolved.localUrl,
        key: null,
        path: '/',
        apiToken: null,
        contextToken: null,
        kind: 'clearnet',
        url: resolved.url,
        mode: resolved.mode,
        upgraded: !!resolved.upgraded,
        stripped: resolved.stripped || [],
        shieldActive: !!resolved.shieldActive
      }
    }
    if (resolved.kind === 'loopback') {
      const proxyDriveKey = driveKeyFromProxyUrl(resolved.url)
      const contextToken = proxyDriveKey && proxy?.pageContextToken
        ? proxy.pageContextToken(proxyDriveKey)
        : tabRuntime?.contextTokenForUrl?.(resolved.url) || null
      return {
        localUrl: resolved.localUrl,
        key: proxyDriveKey || null,
        path: new URL(resolved.url).pathname || '/',
        apiToken: null,
        contextToken,
        kind: 'loopback',
        url: resolved.url
      }
    }
    if (resolved.kind === 'hyper') navUrl = resolved.url
  }

  const parsed = new URL(navUrl)
  // The run-in-tab wrapper is served by tab-runtime on a loopback http(s) port
  // (whitelisted in pear.json links) — load it directly, not via /hyper/<key>.
  if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) {
    const proxyDriveKey = driveKeyFromProxyUrl(navUrl)
    const contextToken = proxyDriveKey && proxy?.pageContextToken
      ? proxy.pageContextToken(proxyDriveKey)
      : tabRuntime?.contextTokenForUrl?.(navUrl) || null
    return { localUrl: navUrl, key: proxyDriveKey || null, path: parsed.pathname || '/', apiToken: null, contextToken, kind: 'loopback' }
  }
  // Non-loopback http(s) without session bridge: refuse rather than map host → drive key
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    throw new Error('Clearnet navigation requires session bridge (still booting?)')
  }
  const key = normalizeDriveKey(parsed.hostname)
  const path = parsed.pathname || '/'
  const validKey = /^[0-9a-f]{64}$/i.test(key)

  // Start loading the drive in the background — don't wait for sync.
  // The proxy will handle waiting for content when WebView requests it.
  // This makes NAVIGATE instant while the drive syncs behind the scenes.
  ensureBrowseDrive(key).catch((err) => {
    console.error('Failed to load browse drive:', err.message)
  })

  const pathAndSearch = `${path}${parsed.search || ''}`
  const localUrl = validKey && proxy?.localUrlForDrive
    ? await proxy.localUrlForDrive(key, 'hyper', pathAndSearch)
    : `http://127.0.0.1:${proxy.port}/hyper/${key}${pathAndSearch}`
  const apiToken = validKey && proxy?.issueApiToken
    ? proxy.issueApiToken(key, { origin: localUrl })
    : null
  const contextToken = validKey && proxy?.pageContextToken
    ? proxy.pageContextToken(key)
    : null

  return {
    localUrl,
    key,
    path,
    apiToken,
    contextToken,
    kind: 'hyper',
    url: navUrl
  }
})

rpc.handle(C.CMD_GET_STATUS, async () => {
  let storageSize = 0
  try {
    storageSize = await getStorageSize(storagePath)
  } catch {}

  return {
    dhtConnected: swarm !== null,
    peerCount,
    browseDrives: browseDrives?.size || 0,
    installedApps: appManager?.installed?.size || 0,
    publishedSites: siteManager?.sites?.size || 0,
    proxyPort: proxy?.port || 0,
    hiveRelays: hiveRelay?.getRelays ? hiveRelay.getRelays().length : 0,
    storageUsed: storageSize,
    storageLimit: STORAGE_LIMIT,
    storagePercent: Math.round((storageSize / STORAGE_LIMIT) * 100)
  }
})

rpc.handle(C.CMD_GET_DRIVE_INFO, async (data = {}) => {
  await whenReady()
  const keyHex = normalizeDriveKey(data.keyHex || driveKeyFromUrl(data.url))
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
    throw new Error('Invalid drive key format')
  }

  const drive = await getDriveForProxy(keyHex)
  registerHiveRelayDrive(keyHex, drive)
  await updateDriveBestEffort(drive)

  const peers = getDrivePeerSnapshot(drive)
  const bytes = getDriveByteSnapshot(drive)

  return {
    keyHex,
    discoveryKey: drive?.discoveryKey ? b4a.toString(drive.discoveryKey, 'hex') : null,
    version: Number.isFinite(drive?.version) ? drive.version : null,
    writable: !!drive?.writable,
    ...peers,
    ...bytes,
    relay: getRelayPinSnapshot(keyHex, drive),
    updatedAt: Date.now()
  }
})

rpc.handle(C.CMD_RELEASE_ORIGIN, async (data = {}) => {
  await whenReady()
  const keyHex = normalizeDriveKey(data.keyHex || driveKeyFromProxyUrl(data.url) || driveKeyFromUrl(data.url))
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
    return { ok: false, released: false, reason: 'invalid-drive-key' }
  }
  const released = proxy?.releaseDriveOrigin ? await proxy.releaseDriveOrigin(keyHex) : false
  return { ok: true, released, keyHex: keyHex.toLowerCase() }
})

// Ask Browser is browser-chrome-owned. Hyperdrive pages use the separately
// token/manifest-gated /api/ai/* surface and cannot invoke these RPC commands.
rpc.handle(C.CMD_ASK_BROWSER_CAPABILITIES, async () => {
  await whenReady()
  return askBrowserService.capabilities()
})

rpc.handle(C.CMD_ASK_BROWSER_START, async (data = {}) => {
  await whenReady()
  return askBrowserService.start(data)
})

rpc.handle(C.CMD_ASK_BROWSER_CANCEL, async (data = {}) => {
  return { ok: await askBrowserService.cancel(data) }
})

// Content Shield live status for the Settings card + urlbar chip.
// Toggle / allowlist / strict / lists persist via user-data settings.
rpc.handle(C.CMD_SHIELD_STATUS, async (data = {}) => {
  await whenReady()
  if (!contentShield) {
    return {
      enabled: false, blocked: 0, allowed: 0, blockRules: 0, exceptionRules: 0,
      cosmeticRules: 0, scriptletRules: 0, lists: [], listDetails: [],
      allowlist: [], strict: [], plugins: {}, topRules: []
    }
  }
  const stats = contentShield.stats()
  const driveKey = typeof data.driveKey === 'string' ? data.driveKey.trim().toLowerCase() : ''
  if (driveKey && /^[0-9a-f]{64}$/.test(driveKey)) {
    stats.driveKey = driveKey
    stats.driveAllowlisted = contentShield.isAllowlisted(driveKey)
    stats.driveStrict = contentShield.isStrict(driveKey)
  }
  stats.subscriptions = shieldListSync ? shieldListSync.subscriptions() : []
  return stats
})

rpc.handle(C.CMD_SHIELD_LOAD_LIST, async (data = {}) => {
  await whenReady()
  if (!contentShield) throw new Error('Content Shield not available')
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name || name === 'builtin' || name.startsWith('plugin:')) {
    throw new Error('invalid list name')
  }
  const result = contentShield.addList(name, data.text == null ? '' : String(data.text))
  await persistShieldState()
  return result
})

rpc.handle(C.CMD_SHIELD_REMOVE_LIST, async (data = {}) => {
  await whenReady()
  if (!contentShield) throw new Error('Content Shield not available')
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name || name === 'builtin') throw new Error('invalid list name')
  const removed = contentShield.removeList(name)
  await persistShieldState()
  return { removed, name }
})

rpc.handle(C.CMD_SHIELD_SET_ALLOW, async (data = {}) => {
  await whenReady()
  if (!contentShield) throw new Error('Content Shield not available')
  const driveKey = typeof data.driveKey === 'string' ? data.driveKey.trim().toLowerCase() : ''
  if (!/^[0-9a-f]{64}$/.test(driveKey)) throw new Error('driveKey must be 64-char hex')
  if (data.allow) contentShield.allowlistDrive(driveKey)
  else contentShield.removeAllowlistDrive(driveKey)
  await persistShieldState()
  return {
    driveKey,
    allowlisted: contentShield.isAllowlisted(driveKey),
    allowlist: contentShield.allowlist()
  }
})

rpc.handle(C.CMD_SHIELD_SET_STRICT, async (data = {}) => {
  await whenReady()
  if (!contentShield) throw new Error('Content Shield not available')
  const driveKey = typeof data.driveKey === 'string' ? data.driveKey.trim().toLowerCase() : ''
  if (!/^[0-9a-f]{64}$/.test(driveKey)) throw new Error('driveKey must be 64-char hex')
  contentShield.setStrictDrive(driveKey, !!data.strict)
  await persistShieldState()
  return {
    driveKey,
    strict: contentShield.isStrict(driveKey),
    strictDrives: contentShield.strictDrives()
  }
})

rpc.handle(C.CMD_PLUGIN_LIST, async () => {
  await whenReady()
  return { plugins: pearPlugins ? pearPlugins.list() : [] }
})

rpc.handle(C.CMD_PLUGIN_SET_ENABLED, async (data = {}) => {
  await whenReady()
  if (!pearPlugins) throw new Error('Plugin registry not available')
  const result = pearPlugins.setEnabled(data.id, data.enabled !== false)
  await persistShieldState()
  return result
})

rpc.handle(C.CMD_PLUGIN_REGISTER, async (data = {}) => {
  await whenReady()
  if (!pearPlugins) throw new Error('Plugin registry not available')
  const result = pearPlugins.register({
    id: data.id,
    manifest: data.manifest,
    contribution: data.contribution,
    enabled: data.enabled !== false
  })
  if (result && result.ok) rememberPluginPayload(data)
  await persistShieldState()
  return result
})

async function persistShieldState () {
  if (!contentShield || !userData) return
  try {
    const state = contentShield.exportListState()
    // Sync enable flags from registry into durable state.
    if (pearPlugins) {
      for (const p of pearPlugins.list()) {
        state.plugins[p.id] = p.enabled
        if (persistShieldState._pluginPayloads[p.id]) {
          persistShieldState._pluginPayloads[p.id].enabled = p.enabled
        }
      }
    }
    await userData.setSettings({
      contentShieldState: state,
      contentShieldPlugins: { ...persistShieldState._pluginPayloads },
      contentShieldAllow: state.allowlist,
      contentShieldStrict: state.strict
    })
  } catch (err) {
    console.warn('[content-shield] persist failed:', err && err.message)
  }
}

// Remember last-known plugin register payloads so restart can rehydrate.
persistShieldState._pluginPayloads = {}
function rememberPluginPayload (data) {
  if (!data || !data.id) return
  const id = String(data.id).trim().toLowerCase()
  persistShieldState._pluginPayloads[id] = {
    id,
    manifest: data.manifest,
    contribution: data.contribution,
    enabled: data.enabled !== false
  }
}

// --- P2P distribution: filter-list drives + plugin drives ---
//
// Rule text and plugin payloads are durable through persistShieldState();
// these commands own the drive-sourced lifecycle (subscribe/refresh/install/
// update) so lists and plugins keep working offline after first sync and
// hot-swap when their drives update.

rpc.handle(C.CMD_SHIELD_SUBSCRIBE_LIST, async (data = {}) => {
  await whenReady()
  if (!shieldListSync) throw new Error('Shield list sync not available')
  const result = await shieldListSync.subscribe(data.driveKey)
  await persistShieldState()
  return { ...result, subscriptions: shieldListSync.subscriptions() }
})

rpc.handle(C.CMD_SHIELD_UNSUBSCRIBE_LIST, async (data = {}) => {
  await whenReady()
  if (!shieldListSync) throw new Error('Shield list sync not available')
  const result = await shieldListSync.unsubscribe(data.driveKey)
  await persistShieldState()
  return { ...result, subscriptions: shieldListSync.subscriptions() }
})

rpc.handle(C.CMD_SHIELD_REFRESH_LISTS, async (data = {}) => {
  await whenReady()
  if (!shieldListSync) throw new Error('Shield list sync not available')
  const outcomes = data.driveKey
    ? [{ driveKey: String(data.driveKey).toLowerCase(), ok: true, ...(await shieldListSync.refresh(data.driveKey, { force: !!data.force })) }]
    : await shieldListSync.refreshAll({ force: !!data.force })
  await persistShieldState()
  return { outcomes, subscriptions: shieldListSync.subscriptions() }
})

rpc.handle(C.CMD_PLUGIN_INSTALL_DRIVE, async (data = {}) => {
  await whenReady()
  if (!pluginDriveLoader) throw new Error('Plugin drive loader not available')
  const result = await pluginDriveLoader.installFromDrive(data.driveKey, {
    grantedCapabilities: data.granted,
    reviewedFingerprint: data.reviewedFingerprint
  })
  await persistShieldState()
  return result
})

rpc.handle(C.CMD_PLUGIN_UPDATE_DRIVE, async (data = {}) => {
  await whenReady()
  if (!pluginDriveLoader) throw new Error('Plugin drive loader not available')
  const result = await pluginDriveLoader.updateFromDrive(data.driveKey, {
    grantedCapabilities: data.granted,
    reviewedFingerprint: data.reviewedFingerprint
  })
  await persistShieldState()
  return result
})

rpc.handle(C.CMD_PLUGIN_UNINSTALL, async (data = {}) => {
  await whenReady()
  if (!pluginDriveLoader) throw new Error('Plugin drive loader not available')
  const result = await pluginDriveLoader.uninstall(data.driveKey)
  if (result.driveKey) delete persistShieldState._pluginPayloads[result.driveKey]
  await persistShieldState()
  return result
})

// Plugin discovery. The catalogue is metadata-only: installing still runs
// through the drive loader's grant + escalation path, and `kind: "app"`
// entries (anonGPT) simply open as hyper:// apps.
rpc.handle(C.CMD_PLUGIN_CATALOG, async () => {
  await whenReady()
  if (!pluginCatalog) return { entries: [], sources: [] }
  const installed = new Set(pearPlugins ? pearPlugins.list().map(p => p.id) : [])
  return {
    entries: pluginCatalog.entries().map(entry => ({
      ...entry,
      installed: !!(entry.driveKey && installed.has(entry.driveKey))
    })),
    sources: pluginCatalog.sources()
  }
})

rpc.handle(C.CMD_PLUGIN_CATALOG_LOAD_DRIVE, async (data = {}) => {
  await whenReady()
  if (!pluginCatalog) throw new Error('Plugin catalogue not available')
  const result = await pluginCatalog.loadFromDrive(data.driveKey)
  await persistPluginCatalog()
  return { ...result, sources: pluginCatalog.sources() }
})

rpc.handle(C.CMD_PLUGIN_CATALOG_REMOVE_SOURCE, async (data = {}) => {
  await whenReady()
  if (!pluginCatalog) throw new Error('Plugin catalogue not available')
  const removed = pluginCatalog.removeSource(data.driveKey)
  await persistPluginCatalog()
  return { removed, sources: pluginCatalog.sources() }
})

function persistPluginCatalog () {
  if (!pluginCatalog || !userData) return Promise.resolve()
  return userData.setSettings({ contentShieldPluginCatalog: pluginCatalog.exportState() }).catch(() => {})
}

function persistPluginInstallRecords () {
  if (!pluginDriveLoader || !userData) return Promise.resolve()
  const records = {}
  for (const record of pluginDriveLoader.installs()) {
    records[record.driveKey] = {
      granted: record.granted,
      version: record.version,
      installedAt: record.installedAt,
      escalated: record.escalated
    }
  }
  return userData.setSettings({ contentShieldPluginInstalls: records }).catch(() => {})
}

rpc.handle(C.CMD_GET_IDENTITY, async () => {
  return {
    publicKey: swarm ? swarm.keyPair.publicKey.toString('hex') : null,
    // Identity metadata for the Settings "My Identity" panel
    hasBackupPhrase: !!identity,
    mnemonicWordCount: identity ? identity.getMnemonic().split(' ').length : 0,
  }
})

// App Store commands
rpc.handle(C.CMD_LOAD_CATALOG, async (data) => {
  await whenReady()
  return await catalogManager.loadCatalog(normalizeDriveKey(data.keyHex))
})

// Phase 1 ticket 1 — Hyperbee-backed catalog (pre-positioning; relay
// publishes Hyperdrive catalogs today. Once a Hyperbee catalog exists,
// ExploreScreen can switch by sending `hyperbee://<key>` URLs.)
rpc.handle(C.CMD_LOAD_CATALOG_BEE, async (data) => {
  await whenReady()
  return await catalogManager.loadCatalogBee(normalizeDriveKey(data.keyHex))
})

// Phase 2 — Autobase collaborative catalog ("Autobee"). EXPERIMENTAL and
// OFF BY DEFAULT: the flag is enforced here (server-side) so a stale or
// tampered renderer can't enable the experiment. Toggle via the
// `experimentalAutobeeCatalogs` user-data setting. See AUTOBEE-RESEARCH.md.
rpc.handle(C.CMD_LOAD_CATALOG_AUTOBEE, async (data) => {
  await whenReady()
  await requireAutobee()
  return await catalogManager.loadCatalogAutobee(normalizeDriveKey(data.keyHex))
})

// schema-sheets catalogue (the 4th source). Takes a z32 room LINK (key, or
// key+encryptionKey) — NOT a normalized hex drive key. Pins best-effort so the
// catalogue survives writers going offline. Coexists with the other formats.
rpc.handle(C.CMD_SHEETS_LOAD, async (data) => {
  await whenReady()
  const link = String((data && data.link) || '').trim()
  if (!link) throw new Error('sheets catalogue link required')
  const result = await catalogManager.loadCatalogSheets(link)
  try {
    const { decodeSheetsLink } = require('./sheets-catalog')
    const { keyHex } = decodeSheetsLink(link)
    const entry = catalogManager.catalogs.get(`sheets:${keyHex}`)
    const dk = entry && entry.sheets && entry.sheets.discoveryKey()
    if (dk) await pinDriveBestEffort(keyHex, dk)
  } catch (err) { console.error('[sheets] pin best-effort failed:', err && err.message) }
  return result
})

// Phase 5 — load a catalogue from a relay's index room (hiveindex://). Takes a
// z32 indexRoom LINK (from the relay's capability doc / catalog.json). The relay
// hosts its own index room, so no client-side pin is needed (unlike a
// user-shared sheets catalogue). Coexists with the other sources.
rpc.handle(C.CMD_LOAD_CATALOG_INDEX, async (data) => {
  await whenReady()
  const link = String((data && data.link) || '').trim()
  if (!link) throw new Error('index-room link required')
  return await catalogManager.loadCatalogIndexRoom(link)
})

// Re-query a loaded sheets catalogue with a JMESPath filter (powers search).
// The query is validated against a whitelist in SheetsCatalog.listApps; the
// length cap here is an early-reject defense-in-depth (Risk #2 / #9).
rpc.handle(C.CMD_SHEETS_LIST, async (data) => {
  await whenReady()
  const link = String((data && data.link) || '').trim()
  if (!link) throw new Error('sheets catalogue link required')
  const query = data && data.query != null ? String(data.query) : undefined
  if (query && query.length > 512) throw new Error('Search query too long')
  return await catalogManager.querySheetsCatalog(link, query)
})

rpc.handle(C.CMD_SHEETS_LIST_SCHEMAS, async (data) => {
  await whenReady()
  const link = String((data && data.link) || '').trim()
  if (!link) throw new Error('sheets catalogue link required')
  return { schemas: await catalogManager.listSheetsSchemas(link) }
})

rpc.handle(C.CMD_INSTALL_APP, async (data) => {
  await whenReady()
  const result = await appManager.install(data, (progress) => {
    rpc.event(C.EVT_INSTALL_PROGRESS, { appId: data.id, progress })
  })
  persistState()
  return result
})

rpc.handle(C.CMD_UNINSTALL_APP, async (data) => {
  const result = await appManager.uninstall(data.id)
  persistState()
  return result
})

rpc.handle(C.CMD_LAUNCH_APP, async (data) => {
  const app = appManager.installed.get(data.id)
  if (!app) throw new Error('App not installed: ' + data.id)

  // Ensure the app drive is loaded in the proxy
  await appManager.getDrive(app.driveKey)
  const driveKey = normalizeDriveKey(app.driveKey)
  const localUrl = proxy?.localUrlForDrive
    ? await proxy.localUrlForDrive(driveKey, 'app', '/index.html')
    : `http://127.0.0.1:${proxy.port}/app/${driveKey}/index.html`

  return {
    localUrl,
    appId: data.id,
    name: app.name,
    driveKey,
    apiToken: proxy?.issueApiToken ? proxy.issueApiToken(driveKey, { origin: localUrl }) : null,
    contextToken: proxy?.pageContextToken ? proxy.pageContextToken(driveKey) : null
  }
})

rpc.handle(C.CMD_LIST_INSTALLED, () => {
  if (!appManager) return []
  return appManager.listInstalled()
})

rpc.handle(C.CMD_CHECK_UPDATES, async () => {
  const allApps = catalogManager.getAllApps()
  return await appManager.checkUpdates(allApps)
})

// Aggregated catalog-of-catalogs view: every app across every loaded
// catalog, de-duplicated, plus the list of loaded catalogs for facets.
rpc.handle(C.CMD_GET_CATALOG_APPS, () => {
  if (!catalogManager) return { apps: [], catalogs: [] }
  return {
    apps: catalogManager.getAggregatedApps(),
    catalogs: catalogManager.listCatalogs(),
  }
})

rpc.handle(C.CMD_UNLOAD_CATALOG, async (data) => {
  if (!catalogManager) return false
  return await catalogManager.unloadCatalog(normalizeDriveKey(data.keyHex))
})

// --- Lighthouse P2P search (Phase 0 — local self-search) ---
// Query / feed the personal index. Querying is fully local (no network);
// indexing is best-effort and never throws to the caller.
// Local-first + optional background federate (Lighthouse Phase 2). handleSearch
// (search-handler.js) returns local hop-0 results synchronously and, when
// data.federated is set and a planner exists, pushes EVT_SEARCH_FEDERATED later
// with the enriched trusted-peer set (queryId-correlated, stale-suppressed). The
// reply shape is the old { results, stats } plus additive { phase, federating,
// queryId } — so existing renderers keep working unchanged.
const handleSearch = createSearchHandler({
  getPersonalIndex: () => personalIndex,
  getQueryPlanner: () => queryPlanner,
  emit: (payload) => rpc.event(C.EVT_SEARCH_FEDERATED, payload),
})
rpc.handle(C.CMD_SEARCH, async (data) => {
  await whenReady()
  return handleSearch(data)
})

rpc.handle(C.CMD_SEARCH_FEDERATED, async (data = {}) => {
  await whenReady()
  return handleSearch({ ...data, federated: true })
})

// Lighthouse Phase 2 — publish/refresh our IdentityBinding on demand (e.g. a
// Settings "rotate search key" action), and resolve a contact's current search
// pubkey from the DHT (verified against their Contacts-held root).
rpc.handle(C.CMD_IDENTITY_BINDING_PUBLISH, async (data) => {
  await whenReady()
  if (!identityBindingPublisher) throw new Error('binding publisher unavailable')
  return await identityBindingPublisher.publish({ rotate: !!(data && data.rotate) })
})

rpc.handle(C.CMD_IDENTITY_BINDING_RESOLVE, async (data) => {
  await whenReady()
  if (!identityBindingPublisher) throw new Error('binding publisher unavailable')
  if (!data || !data.contactPubkey || !data.dhtPubkey) throw new Error('contactPubkey + dhtPubkey required')
  const resolved = await identityBindingPublisher.resolve({
    contactPubkey: String(data.contactPubkey), dhtPubkey: String(data.dhtPubkey),
  })
  return resolved || { searchPubkey: null, indexKey: null }
})

rpc.handle(C.CMD_SEARCH_INDEX, async (data) => {
  await whenReady()
  // Privacy-first: local page indexing is opt-in (searchIndexEnabled).
  if (!personalIndex || !data || !data.driveKey) return { ok: false, indexed: false }
  try {
    const settings = userData ? await userData.getSettings() : {}
    if (!isSearchIndexEnabled(settings)) {
      return { ok: true, indexed: false, reason: 'search-index-disabled' }
    }
    const docId = await personalIndex.indexDoc({
      driveKey: normalizeDriveKey(data.driveKey),
      path: data.path || '/',
      title: data.title || '',
      body: data.text || data.body || '',
      publishedAt: Number.isFinite(data.publishedAt) ? data.publishedAt : 0,
    })
    return { ok: !!docId, docId, indexed: !!docId }
  } catch (err) {
    console.error('[search] index failed')
    return { ok: false, indexed: false }
  }
})

// --- Catalog authoring (your own publishable catalog) ---
// Each mutation re-pins the catalog drive to the HiveRelay backbone so the
// new content is durable and discoverable even when this device is offline.

rpc.handle(C.CMD_MYCATALOG_GET, async (data) => {
  await whenReady()
  return await catalogManager.getMyCatalog(normalizeDriveKey(data.keyHex))
})

rpc.handle(C.CMD_MYCATALOG_CREATE, async (data) => {
  await whenReady()
  const result = await catalogManager.createMyCatalog(data && data.name)
  await pinDriveBestEffort(result.keyHex, catalogManager.myCatalogDiscoveryKey(result.keyHex))
  return result
})

rpc.handle(C.CMD_MYCATALOG_ADD_APP, async (data) => {
  await whenReady()
  const keyHex = normalizeDriveKey(data.keyHex)
  const result = await catalogManager.addAppToCatalog(keyHex, data.app)
  await pinDriveBestEffort(keyHex, catalogManager.myCatalogDiscoveryKey(keyHex))
  return result
})

rpc.handle(C.CMD_MYCATALOG_REMOVE_APP, async (data) => {
  await whenReady()
  const keyHex = normalizeDriveKey(data.keyHex)
  const result = await catalogManager.removeAppFromCatalog(keyHex, data.id)
  await pinDriveBestEffort(keyHex, catalogManager.myCatalogDiscoveryKey(keyHex))
  return result
})

rpc.handle(C.CMD_MYCATALOG_RENAME, async (data) => {
  await whenReady()
  const keyHex = normalizeDriveKey(data.keyHex)
  const result = await catalogManager.renameMyCatalog(keyHex, data.name)
  await pinDriveBestEffort(keyHex, catalogManager.myCatalogDiscoveryKey(keyHex))
  return result
})

rpc.handle(C.CMD_MYCATALOG_UPDATE_APP, async (data) => {
  await whenReady()
  const keyHex = normalizeDriveKey(data.keyHex)
  const result = await catalogManager.updateAppInCatalog(keyHex, data.id, data.app)
  await pinDriveBestEffort(keyHex, catalogManager.myCatalogDiscoveryKey(keyHex))
  return result
})

// ─── Community app submission + moderation (2026-06-22) ──────────────────────
// Anyone can submit their app to the COMMUNITY catalogue; the relay queues a pin
// request in `review` mode; an operator-gated in-app moderator panel reviews the
// queue and approves/rejects via the relay management API. Pure projection +
// request shaping live in backend/community-submit.cjs (unit-tested). See the
// catalogue-unified memory for the two-list (curated f5fb7500 / community
// 5d961fdc) architecture.

// Operator's relay management endpoint + API key (set via the moderator panel,
// persisted in userdata settings). Empty until configured.
const moderationPendingByKey = new Map()
const moderationReviewCache = new Map()
let moderationPendingMode = null
let moderationPendingLoadedAt = 0
const MODERATION_REVIEW_CACHE_MS = 5 * 60 * 1000
const MAX_REVIEW_INDEX_BYTES = communitySubmit.MAX_INDEX_BYTES
const MAX_REVIEW_MANIFEST_BYTES = 256 * 1024
const MAX_RELAY_MANAGE_RESPONSE_BYTES = 2 * 1024 * 1024

async function getModSettings () {
  try {
    const s = (await requireUserData().getSettings()) || {}
    return {
      baseUrl: s.relayManageUrl || '',
      apiKey: s.relayManageKey || '',
      audit: Array.isArray(s.communityReviewAudit) ? s.communityReviewAudit.slice(0, 50) : []
    }
  } catch { return { baseUrl: '', apiKey: '', audit: [] } }
}

function withReviewTimeout (promise, ms, label) {
  let timer
  const guard = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(label + ' timed out')), ms)
  })
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer))
}

function boundedReviewText (value, max = 1000) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

async function readBoundedReviewFile (drive, path, maxBytes, timeoutMs, label) {
  const entry = await withReviewTimeout(drive.entry(path, { wait: true }), timeoutMs, label + ' metadata fetch')
  const blob = entry && entry.value && entry.value.blob
  if (!blob) return { buffer: null, byteLength: 0, tooLarge: false }

  const byteLength = Number(blob.byteLength) || 0
  if (byteLength > maxBytes) return { buffer: null, byteLength, tooLarge: true }

  const buffer = await withReviewTimeout(drive.get(path, { wait: true }), timeoutMs, label + ' fetch')
  const actualByteLength = buffer ? buffer.length : 0
  return {
    buffer: actualByteLength > maxBytes ? null : buffer,
    byteLength: actualByteLength,
    tooLarge: actualByteLength > maxBytes
  }
}

async function appendCommunityReviewAudit (entry) {
  const store = requireUserData()
  const settings = (await store.getSettings()) || {}
  const previous = Array.isArray(settings.communityReviewAudit) ? settings.communityReviewAudit : []
  const record = {
    appKey: boundedReviewText(entry.appKey, 64).toLowerCase(),
    publisherPubkey: boundedReviewText(entry.publisherPubkey, 64).toLowerCase(),
    action: entry.action === 'approve' ? 'approve' : 'reject',
    reason: boundedReviewText(entry.reason, 500),
    note: boundedReviewText(entry.note, 1000),
    reviewStatus: boundedReviewText(entry.reviewStatus, 40),
    summary: entry.summary && typeof entry.summary === 'object'
      ? {
          pass: Number(entry.summary.pass) || 0,
          warning: Number(entry.summary.warning) || 0,
          block: Number(entry.summary.block) || 0
        }
      : null,
    decidedAt: Date.now()
  }
  await store.setSettings({ communityReviewAudit: [record, ...previous].slice(0, 100) })
  return record
}

async function appendCommunityReviewAuditSafely (entry) {
  try {
    return { audit: await appendCommunityReviewAudit(entry), auditWarning: '' }
  } catch (err) {
    const auditWarning = 'Relay decision succeeded, but the local audit record could not be saved: ' + boundedReviewText(err && err.message, 300)
    console.error('[mod] ' + auditWarning)
    return { audit: null, auditWarning }
  }
}

async function reviewPendingSubmission (appKey, pending = {}, opts = {}) {
  const normalizedKey = normalizeDriveKey(String(appKey || ''))
  if (!/^[0-9a-f]{64}$/i.test(normalizedKey)) throw new Error('Due diligence needs a valid 64-hex appKey.')
  const cached = moderationReviewCache.get(normalizedKey)
  if (!opts.force && cached && Date.now() - cached.checkedAt < MODERATION_REVIEW_CACHE_MS) return cached

  let receiptDriveVersion = 0
  let targetDriveVersion = 0
  let targetDriveKey = ''
  let indexBuf = null
  let indexBytes = 0
  let manifestBuf = null
  let manifest = null
  let manifestError = ''
  let receiptFetchError = ''
  let targetFetchError = ''

  try {
    const receiptDrive = await withReviewTimeout(ensureBrowseDrive(normalizedKey), 12000, 'Receipt drive open')
    try { await withReviewTimeout(receiptDrive.update({ wait: true }), 10000, 'Receipt drive update') } catch (_) {}
    receiptDriveVersion = Number(receiptDrive.version) || 0
    try {
      const manifestFile = await readBoundedReviewFile(receiptDrive, '/manifest.json', MAX_REVIEW_MANIFEST_BYTES, 8000, 'Receipt manifest')
      manifestBuf = manifestFile.buffer
      if (manifestFile.tooLarge) {
        manifestBuf = null
        manifestError = `/manifest.json exceeds the ${MAX_REVIEW_MANIFEST_BYTES}-byte review cap.`
      }
    } catch (err) {
      if (!/timed out/i.test(err && err.message)) manifestError = err && err.message ? err.message : String(err)
    }
  } catch (err) { receiptFetchError = err && err.message ? err.message : String(err) }

  if (manifestBuf) {
    if (manifestBuf.length > MAX_REVIEW_MANIFEST_BYTES) {
      manifestError = `/manifest.json exceeds the ${MAX_REVIEW_MANIFEST_BYTES}-byte review cap.`
    } else {
      try { manifest = safeJSONParse(Buffer.from(manifestBuf).toString('utf8')) } catch (err) {
        manifestError = err && err.message ? err.message : String(err)
      }
    }
  }

  if (manifest && manifest.submissionKind === 'hyper') {
    const target = communitySubmit.deriveKeyAndLink(manifest.link || manifest.driveKey, normalizeDriveKey)
    if (target.error) {
      targetFetchError = target.error
    } else {
      targetDriveKey = target.driveKey
      try {
        const targetDrive = await withReviewTimeout(ensureBrowseDrive(targetDriveKey), 12000, 'Target drive open')
        try { await withReviewTimeout(targetDrive.update({ wait: true }), 10000, 'Target drive update') } catch (_) {}
        targetDriveVersion = Number(targetDrive.version) || 0
        const indexFile = await readBoundedReviewFile(targetDrive, '/index.html', MAX_REVIEW_INDEX_BYTES, 12000, 'Target index.html')
        indexBuf = indexFile.buffer
        indexBytes = indexFile.byteLength
        if (indexFile.tooLarge) indexBytes = Math.max(indexBytes, MAX_REVIEW_INDEX_BYTES + 1)
      } catch (err) { targetFetchError = err && err.message ? err.message : String(err) }
    }
  }

  const duplicates = catalogManager
    ? catalogManager.getAggregatedApps().filter((app) => {
        if (manifest && manifest.submissionKind === 'pear-v3') {
          const submitted = communitySubmit.normalizePearInstallLink(manifest.nativeDelivery && manifest.nativeDelivery.installLink)
          const existing = communitySubmit.normalizePearInstallLink(app && app.nativeDelivery && app.nativeDelivery.installLink)
          return !submitted.error && !existing.error && submitted.installLink === existing.installLink
        }
        const driveKey = normalizeDriveKey(String((app && app.driveKey) || ''))
        const linkKey = driveKeyFromUrl(app && app.link)
        return !!targetDriveKey && (driveKey === targetDriveKey || linkKey === targetDriveKey)
      })
    : []

  const report = communitySubmit.buildReviewReport({
    appKey: normalizedKey,
    pending,
    manifest,
    manifestError,
    indexText: indexBuf ? Buffer.from(indexBuf).toString('utf8') : '',
    indexBytes,
    receiptDriveVersion,
    targetDriveVersion,
    targetDriveKey,
    duplicates,
    receiptFetchError,
    targetFetchError,
    normalizeKey: normalizeDriveKey
  }, Date.now())
  moderationReviewCache.set(normalizedKey, report)
  return report
}

// Minimal JSON HTTP(S) round-trip for the relay management API. bare-http1 has
// no TLS, so https:// relays go through bare-https (wraps bare-tls). Returns
// { status, json, text }.
function relayManageHttp (spec, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let settled = false
    let timer
    const fail = (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(err)
    }
    let u
    try { u = new URL(spec.url) } catch { return fail(new Error('Bad relay URL: ' + spec.url)) }
    const isHttps = u.protocol === 'https:'
    let lib
    try { lib = isHttps ? require('bare-https') : require('bare-http1') } catch (e) {
      return fail(new Error('HTTP client unavailable: ' + (e && e.message)))
    }
    const req = lib.request({
      method: spec.method || 'GET',
      hostname: u.hostname,
      port: u.port ? parseInt(u.port) : (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      headers: spec.headers || {}
    }, (res) => {
      const chunks = []
      let bytes = 0
      res.on('data', (c) => {
        if (settled) return
        bytes += c.length
        if (bytes > MAX_RELAY_MANAGE_RESPONSE_BYTES) {
          try { req.destroy() } catch {}
          fail(new Error('Relay management response exceeded the 2 MB safety limit.'))
          return
        }
        chunks.push(c)
      })
      res.on('end', () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const text = Buffer.concat(chunks).toString('utf8')
        let json = null
        try { json = text ? JSON.parse(text) : null } catch {}
        resolve({ status: res.statusCode, json, text })
      })
      res.on('error', fail)
    })
    timer = setTimeout(() => { try { req.destroy() } catch {} ; fail(new Error('Relay request timed out')) }, timeoutMs)
    req.on('error', fail)
    if (spec.body) req.write(spec.body)
    req.end()
  })
}

// Promote an approved app into the published community Hyperbee (5d961fdc) so
// desktop community-list readers see it. Deliberately NOT done from the worklet:
//   1. The community bee's writer secret lives in the source tree
//      (03-sites/pearbrowser-publishers/community-catalog), which a
//      released/staged app does not ship, and the worklet has no source-tree
//      path primitive (no __dirname / Pear.config.dir in use here).
//   2. The relay pin-queue carries only { appKey, publisherPubkey } — no app
//      name/description — so an approve alone can't synthesise a rich entry.
// The authoritative moderation action (pin approve/reject) runs relay-side and
// is fully wired. To surface an approved app in everyone's Community list, the
// operator republishes the community bee from its source via the proven secret-
// holding path:  node scripts/publish-catalog-bee.js \
//   ../../../03-sites/pearbrowser-publishers/community-catalog-source/catalog.json \
//   --storage ../../../03-sites/pearbrowser-publishers/community-catalog
// (A future enhancement could mirror approved apps into an app-OWNED bee via the
// CMD_MYCATALOG_* machinery + auto-load its key, sidestepping the external
// secret — see communitySubmit.communityBeeEntry() for the entry shape.)
async function promoteToCommunityCatalogue (manifest) {
  return { ok: false, deferred: true, reason: 'Approved + pinned on relays. Republish the community bee (scripts/publish-catalog-bee.js) to list it for everyone.' }
}

rpc.handle(C.CMD_SUBMIT_APP, async (data = {}) => {
  await whenReady()
  if (!hiveRelay || typeof hiveRelay.publish !== 'function') {
    throw new Error('Relay client is still starting — try submitting again in a few seconds.')
  }
  const submittedBy = (swarm && swarm.keyPair) ? swarm.keyPair.publicKey.toString('hex') : null
  const built = communitySubmit.buildSubmissionManifest(data, {
    submittedBy, now: Date.now(), normalizeKey: normalizeDriveKey
  })
  if (built.error) throw new Error(built.error)
  const { manifest, id, kind, driveKey, installLink, receiptId } = built

  // Publish exactly one bounded receipt drive and put that receipt in the relay
  // review queue. The receipt references either separately seeded Hyper content
  // or a Pear v3 production identity. It never asks HiveRelay to pin native
  // release bytes, and it avoids the old double-queue where moderators saw the
  // target drive but could not retrieve the separately published form metadata.
  let manifestKey = null
  let acceptances = 0
  const seedDenials = []
  const onSeedDenied = (event = {}) => {
    const rawKey = Buffer.isBuffer(event.appKey) ? event.appKey.toString('hex') : String(event.appKey || '')
    const appKey = normalizeDriveKey(rawKey)
    if (!appKey) return
    seedDenials.push({
      appKey,
      relay: boundedReviewText(event.relay, 64),
      reasonCode: boundedReviewText(event.reasonCode, 128),
      terminal: event.terminal !== false
    })
  }
  if (typeof hiveRelay.on === 'function') hiveRelay.on('seed-denied', onSeedDenied)
  try {
    const mdrive = await hiveRelay.publish(
      [{ path: '/manifest.json', content: JSON.stringify(manifest, null, 2) }],
      { appId: receiptId, seed: true, replicas: 3, ttlDays: 365, timeout: 15000 }
    )
    if (mdrive && mdrive.key) {
      manifestKey = normalizeDriveKey(Buffer.isBuffer(mdrive.key) ? mdrive.key.toString('hex') : String(mdrive.key))
    }
    acceptances = Number(mdrive && mdrive.replicas && mdrive.replicas.accepted) || 0
  } catch (err) {
    console.error('[submit] publish manifest failed:', err && err.message)
    throw new Error('The catalogue receipt could not be published: ' + boundedReviewText(err && err.message, 300))
  } finally {
    if (typeof hiveRelay.removeListener === 'function') hiveRelay.removeListener('seed-denied', onSeedDenied)
  }
  if (!manifestKey) throw new Error('The catalogue receipt publisher returned no valid drive key.')

  const denials = seedDenials.filter((denial) => denial.appKey === manifestKey)
  const relayOutcome = communitySubmit.submissionRelayOutcome({ acceptances, denials })
  const receiptWarning = relayOutcome.status !== 'awaiting-relay'
    ? ''
    : 'No relay acknowledged the review receipt yet; keep this browser online and retry if it does not appear in the operator queue.'
  console.log(`[submit] "${manifest.name}" (${id}) kind=${kind} receipt=${manifestKey.slice(0, 8)} status=${relayOutcome.status} acceptances=${relayOutcome.acceptances} queued=${relayOutcome.queuedForReview}`)
  return {
    ok: true,
    id,
    driveKey,
    installLink,
    kind,
    manifestKey,
    receiptPublished: true,
    receiptWarning,
    acceptances: relayOutcome.acceptances,
    queuedForReview: relayOutcome.queuedForReview,
    terminalDenials: relayOutcome.terminalDenials,
    status: relayOutcome.status,
    manifest
  }
})

rpc.handle(C.CMD_MOD_PENDING, async () => {
  await whenReady()
  const { baseUrl, apiKey, audit } = await getModSettings()
  const spec = communitySubmit.manageRequest('pending', { baseUrl, apiKey })
  if (spec.error) throw new Error(spec.error)
  const res = await relayManageHttp(spec)
  if (res.status === 401) throw new Error('Relay rejected the moderator API key (401). Check it in the Moderator panel.')
  if (res.status >= 400 || !res.json) throw new Error('Relay pending request failed (HTTP ' + res.status + ').')
  const requests = Array.isArray(res.json.requests) ? res.json.requests : []
  const toHex = (v) => typeof v === 'string' ? v : (v ? Buffer.from(v.data || v).toString('hex') : '')
  const pending = requests.map((r) => ({
    appKey: normalizeDriveKey(toHex(r.appKey)),
    publisherPubkey: toHex(r.publisherPubkey),
    discoveredAt: r.discoveredAt || null,
    ttlSeconds: r.ttlSeconds || null,
    currentRelays: r.currentRelays || 0,
    replicationFactor: r.replicationFactor || null,
    source: boundedReviewText(r.source, 80),
    contentType: boundedReviewText(r.contentType || r.type, 80),
    appId: boundedReviewText(r.appId || r.id, 80),
    name: boundedReviewText(r.name, 160),
    author: boundedReviewText(r.author, 160),
    version: boundedReviewText(r.version, 40),
    categories: Array.isArray(r.categories) ? r.categories.map((value) => boundedReviewText(value, 80)).filter(Boolean).slice(0, 12) : [],
    privacyTier: boundedReviewText(r.privacyTier, 40),
    storageClass: boundedReviewText(r.storageClass, 40),
    availabilityClass: boundedReviewText(r.availabilityClass, 40),
    blind: r.blind === true
  }))
  moderationPendingMode = boundedReviewText(res.json.mode, 40) || null
  moderationPendingLoadedAt = Date.now()
  moderationPendingByKey.clear()
  moderationReviewCache.clear()
  for (const request of pending) if (request.appKey) moderationPendingByKey.set(request.appKey, request)
  return { ok: true, mode: moderationPendingMode, count: pending.length, pending, audit }
})

rpc.handle(C.CMD_MOD_REVIEW, async (data = {}) => {
  await whenReady()
  const appKey = normalizeDriveKey(String(data.appKey || data.driveKey || ''))
  const pending = moderationPendingByKey.get(appKey)
  if (!pending) throw new Error('This app is not in the loaded relay queue. Refresh pending submissions before reviewing it.')
  return await reviewPendingSubmission(appKey, pending, { force: data.force === true })
})

rpc.handle(C.CMD_MOD_APPROVE, async (data = {}) => {
  await whenReady()
  const appKey = normalizeDriveKey(String(data.appKey || data.driveKey || ''))
  if (moderationPendingMode !== 'review') throw new Error('Relay decisions require a freshly loaded queue from a relay in review mode.')
  if (Date.now() - moderationPendingLoadedAt > MODERATION_REVIEW_CACHE_MS) throw new Error('The relay queue is stale. Refresh pending submissions before approving.')
  const pending = moderationPendingByKey.get(appKey)
  if (!pending) throw new Error('This app is not in the loaded relay queue. Refresh pending submissions before approving it.')
  const cachedReview = moderationReviewCache.get(appKey)
  const reviewedReceiptDriveVersion = Number(data.reviewedReceiptDriveVersion)
  const reviewedTargetDriveVersion = Number(data.reviewedTargetDriveVersion || 0)
  if (!communitySubmit.reviewEvidenceMatches(data, cachedReview)) {
    throw new Error('The due-diligence evidence does not match this approval. Re-run the review before approving.')
  }
  const review = await reviewPendingSubmission(appKey, pending, { force: true })
  if (review.evidence.receiptDriveVersion !== reviewedReceiptDriveVersion ||
      review.evidence.targetDriveVersion !== reviewedTargetDriveVersion) {
    throw new Error('The receipt or target content changed after review. Inspect the refreshed evidence before approving.')
  }
  if (!review.approvalAllowed) {
    const blockers = review.checks.filter((check) => check.status === 'block').map((check) => check.label).join(', ')
    throw new Error('Due diligence blocked approval: ' + (blockers || 'review evidence failed') + '.')
  }
  if (review.requiresAcknowledgement && data.acknowledged !== true) {
    throw new Error('A reviewer must complete the human release review and acknowledge the due-diligence warnings before approval.')
  }
  const note = boundedReviewText(data.note, 1000)
  if (!note) throw new Error('Record a reviewer note describing the due diligence performed before approval.')
  const { baseUrl, apiKey } = await getModSettings()
  const spec = communitySubmit.manageRequest('approve', { baseUrl, apiKey, appKey })
  if (spec.error) throw new Error(spec.error)
  const res = await relayManageHttp(spec)
  if (res.status === 401) throw new Error('Relay rejected the moderator API key (401).')
  if (res.status >= 400) throw new Error('Relay approve failed (HTTP ' + res.status + ').')
  // Report the separate catalogue-publication gate; this currently performs no
  // write because the secret-holding publisher is intentionally out-of-process.
  let promoted = null
  if (review.manifest) {
    try { promoted = await promoteToCommunityCatalogue(review.manifest) } catch (err) {
      console.error('[mod] community-bee write failed:', err && err.message)
      promoted = { ok: false, error: err && err.message }
    }
  }
  const { audit, auditWarning } = await appendCommunityReviewAuditSafely({
    appKey,
    publisherPubkey: review.publisherPubkey,
    action: 'approve',
    note,
    reviewStatus: review.status,
    summary: review.summary
  })
  moderationPendingByKey.delete(appKey)
  moderationReviewCache.delete(appKey)
  return { ok: true, appKey, promoted, review, audit, auditWarning }
})

rpc.handle(C.CMD_MOD_REJECT, async (data = {}) => {
  await whenReady()
  const appKey = normalizeDriveKey(String(data.appKey || data.driveKey || ''))
  const reason = boundedReviewText(data.reason, 500)
  if (!reason) throw new Error('A rejection reason is required for the moderation audit trail.')
  if (moderationPendingMode !== 'review') throw new Error('Relay decisions require a freshly loaded queue from a relay in review mode.')
  if (Date.now() - moderationPendingLoadedAt > MODERATION_REVIEW_CACHE_MS) throw new Error('The relay queue is stale. Refresh pending submissions before rejecting.')
  const pending = moderationPendingByKey.get(appKey)
  if (!pending) throw new Error('This app is not in the loaded relay queue. Refresh pending submissions before rejecting it.')
  const { baseUrl, apiKey } = await getModSettings()
  const spec = communitySubmit.manageRequest('reject', { baseUrl, apiKey, appKey })
  if (spec.error) throw new Error(spec.error)
  const res = await relayManageHttp(spec)
  if (res.status === 401) throw new Error('Relay rejected the moderator API key (401).')
  if (res.status >= 400) throw new Error('Relay reject failed (HTTP ' + res.status + ').')
  const { audit, auditWarning } = await appendCommunityReviewAuditSafely({
    appKey,
    publisherPubkey: pending.publisherPubkey,
    action: 'reject',
    reason,
    note: data.note,
    reviewStatus: moderationReviewCache.get(appKey)?.status || 'not-run',
    summary: moderationReviewCache.get(appKey)?.summary || null
  })
  moderationPendingByKey.delete(appKey)
  moderationReviewCache.delete(appKey)
  return { ok: true, appKey, audit, auditWarning }
})

// Collaborative (Autobee) catalog authoring — Rollout Phase 3. All gated by
// the experimentalAutobeeCatalogs flag (server-side, fails closed). NOTE:
// these deliberately do NOT pin on HiveRelay — the doc's "Do Not Do Yet"
// defers Autobee relay durability until all its cores are understood. Owned
// catalogs are served over the swarm (server:true) while the app runs.
rpc.handle(C.CMD_AUTOBEE_CREATE, async (data) => {
  await whenReady()
  await requireAutobee()
  return await catalogManager.createAutobeeCatalog(data && data.name)
})

rpc.handle(C.CMD_AUTOBEE_GET, async (data) => {
  await whenReady()
  await requireAutobee()
  return await catalogManager.getAutobeeCatalog(normalizeDriveKey(data.keyHex))
})

rpc.handle(C.CMD_AUTOBEE_ADD_APP, async (data) => {
  await whenReady()
  await requireAutobee()
  return await catalogManager.autobeeAddApp(normalizeDriveKey(data.keyHex), data.app)
})

rpc.handle(C.CMD_AUTOBEE_REMOVE_APP, async (data) => {
  await whenReady()
  await requireAutobee()
  return await catalogManager.autobeeRemoveApp(normalizeDriveKey(data.keyHex), data.id)
})

rpc.handle(C.CMD_AUTOBEE_RENAME, async (data) => {
  await whenReady()
  await requireAutobee()
  return await catalogManager.autobeeRename(normalizeDriveKey(data.keyHex), data.name)
})

rpc.handle(C.CMD_AUTOBEE_ADD_WRITER, async (data) => {
  await whenReady()
  await requireAutobee()
  // data.writerKey is a 64-hex Autobase writer key, not a drive key.
  return await catalogManager.autobeeAddWriter(normalizeDriveKey(data.keyHex), data.writerKey)
})

// Site Builder commands
const SITE_TEMPLATES = {
  blank: { id: 'blank', name: 'Blank', blocks: [], theme: null },
  simple: {
    id: 'simple',
    name: 'Simple page',
    blocks: [
      { type: 'heading', level: 1, text: 'New site' },
      { type: 'text', text: 'Write something worth sharing.' }
    ],
    theme: null
  },
  links: {
    id: 'links',
    name: 'Link page',
    blocks: [
      { type: 'heading', level: 1, text: 'Links' },
      { type: 'link', href: 'https://', text: 'Add a link' },
      { type: 'divider' },
      { type: 'text', text: 'A small page of useful places.' }
    ],
    theme: null
  }
}

function cloneSiteTemplate (template) {
  return JSON.parse(JSON.stringify(template))
}

rpc.handle(C.CMD_CREATE_SITE, async (data) => {
  await whenReady()
  console.log('[create-site] start:', data?.name)
  const t0 = Date.now()
  const result = await siteManager.createSite(data.name)
  console.log('[create-site] done in', Date.now() - t0, 'ms:', result?.siteId)
  persistState()
  return result
})

rpc.handle(C.CMD_UPDATE_SITE, async (data) => {
  await whenReady()
  // Allow rename independently of blocks/files.
  if (typeof data.name === 'string' && data.name.trim()) {
    const site = siteManager.sites.get(data.siteId)
    if (site) site.name = data.name.trim().slice(0, 100).replace(/[<>"'`]/g, '')
  }
  let result = { siteId: data.siteId }
  if (data.blocks) {
    result = await siteManager.buildFromBlocks(data.siteId, data.blocks, data.theme)
  } else if (data.files) {
    result = await siteManager.updateSite(data.siteId, data.files)
  }
  persistState()
  return result
})

rpc.handle(C.CMD_PUBLISH_SITE, async (data) => {
  await whenReady()
  const result = await siteManager.publishSite(data.siteId)
  persistState()

  // Pin to the HiveRelay network (p2p-hiverelay) — Protomux-based
  // Ed25519-signed seed requests broadcast to all connected relays.
  // Failure is non-fatal; drive stays P2P-seeded locally regardless.
  let pin = { ok: false, acceptances: 0, connectedRelays: 0, replicatedPeers: 0, replicationTimedOut: false }
  try {
    const keyHex = result?.keyHex
    const site = siteManager.sites.get(data.siteId)
    if (keyHex && hiveRelay && typeof hiveRelay.seed === 'function') {
      registerHiveRelayDrive(keyHex, site?.drive)
      const connectedRelays = hiveRelay.getRelays ? hiveRelay.getRelays().length : 0
      console.log(`[publish] pinning ${keyHex.slice(0, 8)} to ${connectedRelays} HiveRelay(s)`)
      // Pass `discoveryKey` explicitly so relays always announce the exact
      // Hypercore/HiveRelay topic this drive uses. This avoids depending on
      // SDK-side default derivation if the relay stack evolves again.
      const acceptances = await hiveRelay.seed(keyHex, {
        replicas: 3,
        timeout: 10000,
        discoveryKey: site?.drive?.discoveryKey
      })
      const acceptCount = Array.isArray(acceptances) ? acceptances.length : 0
      pin = { ok: acceptCount > 0, acceptances: acceptCount, connectedRelays, replicatedPeers: 0, replicationTimedOut: false }

      // Canonical waitForDurable() API from current p2p-hiverelay clients.
      // Returns once at least `minPeers` relays have caught up, or throws on
      // timeout. The drive.core.peers polling path below remains as a safety
      // net for older SDKs encountered in the wild.
      if (acceptCount > 0 && typeof hiveRelay.waitForDurable === 'function') {
        try {
          console.log(`[publish] waitForDurable() available — using canonical API`)
          const status = await hiveRelay.waitForDurable(keyHex, { timeoutMs: 30000, minPeers: 1 })
          pin.replicatedPeers = status?.activePeers ?? 0
          pin.durable = !!status?.durable
          if (!status?.durable) pin.replicationTimedOut = true
          console.log(`[publish] durable=${status?.durable} peers=${pin.replicatedPeers}`)
        } catch (err) {
          console.error('[publish] waitForDurable failed:', err && err.message)
          pin.replicationTimedOut = true
        }
      } else if (site?.drive?.core && acceptCount > 0) {
        // Legacy fallback: poll drive.core.peers for remote peers that
        // reach remoteLength >= localLength. Only fires against older SDKs
        // that don't expose waitForDurable().
        const core = site.drive.core
        const startLen = core.length
        const REPL_TIMEOUT = 30000
        console.log(`[publish] waiting up to ${REPL_TIMEOUT / 1000}s for replication (length=${startLen})`)
        const t0 = Date.now()
        await new Promise((resolve) => {
          const check = () => {
            const peers = core.peers || []
            const synced = peers.filter((p) => {
              const rl = p.remoteLength ?? p.length ?? 0
              return rl >= startLen
            })
            if (synced.length >= 1) {
              pin.replicatedPeers = synced.length
              console.log(`[publish] replicated to ${synced.length} peer(s) in ${Date.now() - t0}ms`)
              clearInterval(timer)
              resolve()
            } else if (Date.now() - t0 > REPL_TIMEOUT) {
              pin.replicationTimedOut = true
              pin.replicatedPeers = peers.length
              console.log(`[publish] replication timeout after ${REPL_TIMEOUT}ms — ${peers.length} peer(s) connected but not yet synced`)
              clearInterval(timer)
              resolve()
            }
          }
          const timer = setInterval(check, 500)
          check()
        })
      }
    }
  } catch (err) {
    console.error('[publish] HiveRelay pin failed:', err && err.message)
  }

  const payload = { ...result, pin }
  rpc.event(C.EVT_SITE_PUBLISHED, payload)
  return payload
})

rpc.handle(C.CMD_UNPUBLISH_SITE, async (data) => {
  await whenReady()
  const result = await siteManager.unpublishSite(data.siteId)
  persistState()
  return result
})

rpc.handle(C.CMD_LIST_SITES, () => {
  if (!siteManager) return []
  return siteManager.listSites()
})

rpc.handle(C.CMD_LOAD_TEMPLATE, async ({ id } = {}) => {
  await whenReady()
  const key = String(id || 'blank').trim().toLowerCase()
  const template = SITE_TEMPLATES[key] || SITE_TEMPLATES.blank
  return {
    template: cloneSiteTemplate(template),
    templates: Object.values(SITE_TEMPLATES).map(({ blocks, theme, ...meta }) => meta)
  }
})

rpc.handle(C.CMD_GET_SITE_BLOCKS, async (data) => {
  if (!siteManager) return { blocks: [], theme: null }
  return await siteManager.getSiteBlocks(data.siteId)
})

// Resolve a published app/site icon for display: fetch the declared iconRef (a
// path inside the drive) or a well-known icon path, inline as a data URI. This
// wires the desktop icon-fetch for the sheets/index-room/seed catalogue path
// (previously only the legacy catalog.json path inlined icons — see PBACS
// §"Icon resolution"). Best-effort + cached; null → the UI shows a letter glyph.
rpc.handle(C.CMD_GET_APP_ICON, async ({ driveKey, iconRef } = {}) => {
  return { iconData: await resolveAppIcon(driveKey, iconRef) }
})

// Upload/set the icon for one of YOUR sites — writes /icon.<ext> into the site's
// drive (peers replicate it; no re-publish needed for an already-seeded drive).
rpc.handle(C.CMD_SET_SITE_ICON, async ({ siteId, dataUrl } = {}) => {
  if (!siteManager) throw new Error('site manager not available')
  const res = await siteManager.setIcon(siteId, dataUrl)
  if (res && res.keyHex) for (const k of [..._iconCache.keys()]) if (k.startsWith(res.keyHex + '|')) _iconCache.delete(k)
  return res
})

rpc.handle(C.CMD_RESET_APP, async () => {
  // Safely tear down: (1) unseed every pinned site so the publisher
  // keypair still matches, (2) shutdown managers, (3) wipe storage,
  // (4) exit — the user relaunches and starts fresh.
  const report = { unseeded: [], failed: [] }
  try {
    if (siteManager && hiveRelay && typeof hiveRelay.unseed === 'function') {
      for (const [, site] of siteManager.sites) {
        if (site.published && site.keyHex) {
          try {
            await hiveRelay.unseed(site.keyHex)
            report.unseeded.push(site.keyHex)
          } catch (err) {
            report.failed.push({ keyHex: site.keyHex, error: err && err.message })
          }
        }
      }
    }
  } catch (err) {
    console.error('[reset] unseed loop failed:', err && err.message)
  }

  try { await shutdown() } catch {}

  try {
    fs.rmSync(storagePath, { recursive: true, force: true })
  } catch (err) {
    console.error('[reset] wipe failed:', err && err.message)
  }

  // Give the reply a tick to reach the UI before we exit.
  setTimeout(() => {
    try { Bare.exit?.() } catch {}
  }, 200)

  return report
})

rpc.handle(C.CMD_LEGACY_APP_MIGRATION, async (data) => {
  const legacyMigrationId = String(data?.legacyMigrationId || '').trim().toLowerCase()
  if (!/^[13-9a-km-uw-z]{52}$/.test(legacyMigrationId)) {
    throw new Error('legacy migration id must be a 52-character z-base-32 identifier')
  }
  return {
    action: 'legacy-migration-required',
    legacyMigrationId,
    message: 'This legacy Pear app cannot be launched by PearBrowser v3. Install a verified native v3 package when its publisher provides one.'
  }
})

// Runs only the in-process demo router headlessly in a browser tab. Remote
// application workers require a signed native v3 package and are never fetched
// or executed from a browser catalog.
rpc.handle(C.CMD_RUN_APP_IN_TAB, async (data) => {
  const link = String(data?.link || 'demo').trim()
  if (!tabRuntime) throw new Error('tab runtime is not available')
  if (link !== 'demo') {
    return {
      action: 'legacy-migration-required',
      link,
      message: 'This legacy app needs a verified v3 package before it can run in a PearBrowser tab.'
    }
  }
  const res = tabRuntime.open(link)
  console.log('[tab-runtime] run-in-tab')
  return res
})

rpc.handle(C.CMD_DELETE_SITE, async (data) => {
  await whenReady()
  // If published, ask HiveRelay to unseed first. Ed25519-signed with
  // our client keypair — only the original publisher (us) can unseed.
  let unseed = { ok: false, relays: 0 }
  try {
    const site = siteManager?.sites?.get?.(data.siteId)
    const keyHex = site?.keyHex
    if (keyHex && site?.published && hiveRelay && typeof hiveRelay.unseed === 'function') {
      console.log(`[delete] unseeding ${keyHex.slice(0, 8)} from HiveRelay`)
      const res = await hiveRelay.unseed(keyHex)
      unseed = { ok: (res?.relays ?? 0) > 0, relays: res?.relays ?? 0 }
    }
  } catch (err) {
    console.error('[delete] unseed failed:', err && err.message)
  }

  const result = await siteManager.deleteSite(data.siteId)
  persistState()
  return { ...(typeof result === 'object' ? result : { ok: !!result }), unseed }
})

// Pear Bridge — WebView apps call P2P APIs via this relay
rpc.handle(C.CMD_BRIDGE, async (data) => {
  const { method, args } = data
  if (!pearBridge) throw new Error('Bridge not initialized')

  switch (method) {
    case 'sync.create':
      return await pearBridge.createSyncGroup(args.appId)
    case 'sync.join':
      return await pearBridge.joinSyncGroup(args.appId, args.inviteKey)
    case 'sync.append':
      return await pearBridge.append(args.appId, args.op)
    case 'sync.get':
      return await pearBridge.get(args.appId, args.key)
    case 'sync.list':
      return await pearBridge.list(args.appId, args.prefix, args.opts)
    case 'sync.status':
      return pearBridge.getSyncStatus(args.appId)
    case 'identity.getPublicKey':
      return { publicKey: swarm ? swarm.keyPair.publicKey.toString('hex') : null }
    case 'navigate':
      // RN handles this directly
      return { ok: true }
    default:
      throw new Error('Unknown bridge method: ' + method)
  }
})

// System
rpc.handle(C.CMD_STOP, async () => {
  await shutdown()
  return { ok: true }
})

rpc.handle(C.CMD_CLEAR_CACHE, async () => {
  let cleared = 0

  // Clear proxy cache
  if (proxy) {
    const cacheStats = proxy.getCacheStats?.()
    proxy.clearCache?.()
    cleared += cacheStats?.size || 0
  }

  // Clear browse drives cache
  for (const [key, { drive }] of browseDrives) {
    try { await drive.clear?.() } catch {}
  }

  return { cleared, message: 'Cache cleared successfully' }
})

// --- Relay configuration (Phase 0 ticket 2) ---
// Replaces the previously hardcoded relay list in boot().
// Settings UI writes through these handlers; state is persisted in
// pearbrowser-state.json so the config survives restarts.

rpc.handle(C.CMD_GET_RELAYS, async () => {
  if (!relayClient) return { relays: [], enabled: false, configured: false }
  return { ...relayClient.getConfig(), configured: true }
})

rpc.handle(C.CMD_SET_RELAYS, async ({ relays } = {}) => {
  if (!relayClient) throw new Error('Relay client not initialised')
  if (!Array.isArray(relays)) throw new Error('relays must be an array of URLs')
  const ok = relayClient.setRelays(relays)
  if (!ok) throw new Error('No valid http(s) relay URLs provided')
  persistState()
  return { ok: true, relays: relayClient.relays }
})

rpc.handle(C.CMD_SET_RELAY_ENABLED, async ({ enabled } = {}) => {
  if (!relayClient) throw new Error('Relay client not initialised')
  if (typeof enabled !== 'boolean') throw new Error('enabled must be boolean')
  relayClient.setEnabled(enabled)
  persistState()
  return { ok: true, enabled: relayClient.enabled }
})

rpc.handle(C.CMD_CHECK_RELAY_CAPABILITY, async ({ url } = {}) => {
  if (!relayClient) return { ok: false, error: 'Relay client not initialised' }
  const clean = typeof url === 'string' ? url.trim().replace(/\/+$/, '') : ''
  const configured = new Set(relayClient.relays.map((relayUrl) => relayUrl.replace(/\/+$/, '')))
  if (!configured.has(clean)) return { ok: false, error: 'relay is not configured' }
  return relayClient.checkCapability(clean)
})

// --- User data (Phase 1 ticket 2) ---
// Hyperbee-backed bookmarks, history, settings, session, tabs.
// Replaces AsyncStorage usage in the RN layer.

function requireUserData () {
  if (!userData) throw new Error('User data not available — worklet still booting')
  return userData
}

// Experimental-feature gate for Autobee collaborative catalogs (Phase 2).
// Off unless the user has set `experimentalAutobeeCatalogs` in settings;
// failures (no user data yet, etc.) fail closed.
async function isAutobeeEnabled () {
  try {
    const s = await requireUserData().getSettings()
    return !!(s && s.experimentalAutobeeCatalogs)
  } catch { return false }
}

async function requireAutobee () {
  if (!(await isAutobeeEnabled())) {
    throw new Error('Collaborative (Autobee) catalogs are experimental — enable them in Settings first.')
  }
}

// --- Multi-device browser-state sync (encrypted) — Rollout Phase 4 ---------
// EXPERIMENTAL, off by default. One encrypted Autobase per user holding their
// own bookmark edits, replicated across their paired devices. The encryption
// key + bootstrap key + writer key form the pairing invite. The instance is
// owned here and lazily (re)opened from persisted settings (syncKey/syncEncKey).
let browserSync = null

async function requireSync () {
  let on = false
  try { on = !!(await requireUserData().getSettings()).experimentalDeviceSync } catch {}
  if (!on) throw new Error('Device sync is experimental — enable it in Settings first.')
}

// Reopen the user's existing sync base from persisted settings, if paired.
// Returns the live instance or null (not paired yet).
async function ensureBrowserSync () {
  const s = await requireUserData().getSettings()
  const key = typeof s.syncKey === 'string' && /^[0-9a-f]{64}$/i.test(s.syncKey) ? s.syncKey : null
  const enc = typeof s.syncEncKey === 'string' && /^[0-9a-f]{64}$/i.test(s.syncEncKey) ? s.syncEncKey : null
  if (!key || !enc) return null
  if (browserSync && browserSync.key === key) return browserSync
  if (browserSync) { try { await browserSync.close() } catch {} browserSync = null }
  const { BrowserStateSync } = require('./browser-state-sync.cjs')
  browserSync = await new BrowserStateSync(store, { bootstrap: key, encryptionKey: enc }).ready()
  if (browserSync.discoveryKey) swarm.join(browserSync.discoveryKey, { server: true, client: true })
  return browserSync
}

rpc.handle(C.CMD_SYNC_STATUS, async () => {
  await whenReady(); await requireSync()
  const sy = await ensureBrowserSync()
  if (!sy) return { enabled: true, paired: false }
  const st = await sy.state()
  const s = await requireUserData().getSettings()
  return { enabled: true, paired: true, key: sy.key, encKey: s.syncEncKey, writerKey: sy.localKey, writable: sy.writable, count: st.count, bookmarks: st.bookmarks }
})

// Enable + create a fresh encrypted sync base (this device becomes the first
// writer). Returns the pairing invite: { key, encKey, writerKey }.
rpc.handle(C.CMD_SYNC_CREATE, async () => {
  await whenReady(); await requireSync()
  const existing = await ensureBrowserSync()
  if (existing) {
    const st = await existing.state()
    const s = await requireUserData().getSettings()
    return { key: existing.key, encKey: s.syncEncKey, writerKey: existing.localKey, writable: existing.writable, ...st }
  }
  const { BrowserStateSync } = require('./browser-state-sync.cjs')
  const encKey = crypto.randomBytes(32).toString('hex')
  // Mint the autobase key, then reopen by key (mirrors ensureNameRegistry). The
  // store is namespaced inside BrowserStateSync by a FIXED substore, so mint and
  // reopen-by-key share that substore (reopen stays writable) and mint.close()
  // frees only the sync substore — never the shared root Corestore.
  const mint = await new BrowserStateSync(store, { bootstrap: null, encryptionKey: encKey }).ready()
  const key = mint.key
  await mint.close()
  await requireUserData().setSettings({ syncKey: key, syncEncKey: encKey })
  browserSync = await new BrowserStateSync(store, { bootstrap: key, encryptionKey: encKey }).ready()
  if (browserSync.discoveryKey) swarm.join(browserSync.discoveryKey, { server: true, client: true })
  const st = await browserSync.state()
  return { key, encKey, writerKey: browserSync.localKey, writable: browserSync.writable, ...st }
})

// Pair THIS device using an invite from another device: { key, encKey }. The
// device is read-only until the inviting device adds its writerKey.
rpc.handle(C.CMD_SYNC_JOIN, async (data) => {
  await whenReady(); await requireSync()
  const key = normalizeDriveKey(String((data && data.key) || ''))
  const encKey = String((data && data.encKey) || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/i.test(key) || !/^[0-9a-f]{64}$/i.test(encKey)) throw new Error('Invalid pairing invite (need a 64-hex key and encryption key).')
  if (browserSync) { try { await browserSync.close() } catch {} browserSync = null }
  await requireUserData().setSettings({ syncKey: key, syncEncKey: encKey })
  const { BrowserStateSync } = require('./browser-state-sync.cjs')
  browserSync = await new BrowserStateSync(store, { bootstrap: key, encryptionKey: encKey }).ready()
  if (browserSync.discoveryKey) swarm.join(browserSync.discoveryKey, { server: true, client: true })
  const st = await browserSync.state()
  return { key, encKey, writerKey: browserSync.localKey, writable: browserSync.writable, ...st }
})

// Add another device as a writer (paste the writerKey it showed you).
rpc.handle(C.CMD_SYNC_ADD_WRITER, async (data) => {
  await whenReady(); await requireSync()
  const sy = await ensureBrowserSync()
  if (!sy) throw new Error('Sync is not set up on this device yet.')
  if (!sy.writable) throw new Error('Only a writer can add another writer.')
  const writerKey = String((data && data.writerKey) || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/i.test(writerKey)) throw new Error('Invalid writer key (need 64-hex).')
  await sy.addWriter(writerKey)
  return { ok: true, writerKey }
})

rpc.handle(C.CMD_SYNC_GET_BOOKMARKS, async () => {
  await whenReady(); await requireSync()
  const sy = await ensureBrowserSync()
  if (!sy) return { paired: false, bookmarks: [] }
  return { paired: true, writable: sy.writable, ...(await sy.state()) }
})

rpc.handle(C.CMD_SYNC_ADD_BOOKMARK, async (data) => {
  await whenReady(); await requireSync()
  const sy = await ensureBrowserSync()
  if (!sy) throw new Error('Sync is not set up on this device yet.')
  if (!sy.writable) throw new Error('This device is read-only — ask another device to add it as a writer.')
  await sy.addBookmark({ url: String((data && data.url) || ''), title: String((data && data.title) || ''), addedAt: Date.now() })
  return await sy.state()
})

rpc.handle(C.CMD_SYNC_REMOVE_BOOKMARK, async (data) => {
  await whenReady(); await requireSync()
  const sy = await ensureBrowserSync()
  if (!sy) throw new Error('Sync is not set up on this device yet.')
  if (!sy.writable) throw new Error('This device is read-only.')
  await sy.removeBookmark(String((data && data.url) || ''))
  return await sy.state()
})

// Push this device's LOCAL bookmarks into the synced set (one-way import).
rpc.handle(C.CMD_SYNC_PUSH_LOCAL, async () => {
  await whenReady(); await requireSync()
  const sy = await ensureBrowserSync()
  if (!sy) throw new Error('Sync is not set up on this device yet.')
  if (!sy.writable) throw new Error('This device is read-only.')
  const local = await requireUserData().listBookmarks().catch(() => [])
  let pushed = 0
  for (const b of (Array.isArray(local) ? local : [])) {
    if (!b || !b.url) continue
    await sy.addBookmark({ url: String(b.url), title: String(b.title || ''), addedAt: Number.isFinite(b.addedAt) ? b.addedAt : Date.now() })
    pushed++
  }
  return { pushed, ...(await sy.state()) }
})

rpc.handle(C.CMD_USERDATA_LIST_BOOKMARKS, async () => {
  if (!userData) return { bookmarks: [] }
  return { bookmarks: await userData.listBookmarks() }
})

rpc.handle(C.CMD_USERDATA_ADD_BOOKMARK, async ({ url, title } = {}) => {
  await whenReady()
  const result = await requireUserData().addBookmark({ url, title })
  return { bookmark: result }
})

rpc.handle(C.CMD_USERDATA_REMOVE_BOOKMARK, async ({ url } = {}) => {
  const removed = await requireUserData().removeBookmark(url)
  return { removed }
})

rpc.handle(C.CMD_USERDATA_LIST_HISTORY, async ({ limit } = {}) => {
  if (!userData) return { history: [], historyEnabled: false }
  const settings = await userData.getSettings()
  const enabled = isHistoryEnabled(settings)
  // When history is off, never surface stored visits (and clear any leftovers).
  if (!enabled) {
    try { await userData.clearHistory() } catch {}
    return { history: [], historyEnabled: false }
  }
  return { history: await userData.listHistory({ limit }), historyEnabled: true }
})

rpc.handle(C.CMD_USERDATA_ADD_HISTORY, async ({ url, title } = {}) => {
  await whenReady()
  // Privacy-first: visit history is opt-in. Default OFF — refuse silently.
  const settings = userData ? await userData.getSettings() : {}
  if (!isHistoryEnabled(settings)) {
    return { ok: true, recorded: false, reason: 'history-disabled' }
  }
  await requireUserData().addHistory({ url, title })
  return { ok: true, recorded: true }
})

rpc.handle(C.CMD_USERDATA_CLEAR_HISTORY, async () => {
  const cleared = await requireUserData().clearHistory()
  return { cleared }
})

rpc.handle(C.CMD_USERDATA_GET_SETTINGS, async () => {
  const stored = userData ? await requireUserData().getSettings() : {}
  return { settings: mergeSettingsWithPrivacyDefaults(stored) }
})

rpc.handle(C.CMD_USERDATA_SET_SETTINGS, async ({ updates } = {}) => {
  // Telemetry can never be turned on.
  if (updates && typeof updates === 'object') {
    updates = { ...updates, telemetryEnabled: false }
  }
  const settings = await requireUserData().setSettings(updates || {})
  // Apply the Content Shield toggle live — default ON; only explicit false disables.
  if (contentShield) contentShield.setEnabled(settings.contentShield !== false)
  // Allowlist / strict arrays can also be written as settings for simpler UI paths.
  if (contentShield && updates && typeof updates === 'object') {
    if (Array.isArray(updates.contentShieldAllow)) {
      for (const key of contentShield.allowlist()) contentShield.removeAllowlistDrive(key)
      for (const key of updates.contentShieldAllow) contentShield.allowlistDrive(key)
    }
    if (Array.isArray(updates.contentShieldStrict)) {
      for (const key of contentShield.strictDrives()) contentShield.setStrictDrive(key, false)
      for (const key of updates.contentShieldStrict) contentShield.setStrictDrive(key, true)
    }
  }
  // Turning history off wipes any previously stored visits.
  if (updates && updates.historyEnabled === false && userData) {
    try { await userData.clearHistory() } catch {}
  }
  // Privacy ladder + clearnet mode — apply live to proxy + session bridge.
  applyPrivacyFromSettings(settings)
  return { settings: mergeSettingsWithPrivacyDefaults(settings) }
})

function applyPrivacyFromSettings (settings) {
  const merged = mergeSettingsWithPrivacyDefaults(settings || {})
  privacySettings = normalizePrivacySettings(merged)
  if (proxy && typeof proxy.setPrivacySettings === 'function') {
    proxy.setPrivacySettings(privacySettings)
  }
  // WDK wallet preview flag (spec §5 gate 1): pushed live so toggling it in
  // Settings takes effect on the next HTML response without a restart.
  if (proxy && typeof proxy.setWalletEnabled === 'function') {
    proxy.setWalletEnabled(merged.experimentalWalletWdk === true)
  }
  if (contentShield && typeof merged.contentShield === 'boolean') {
    contentShield.setEnabled(merged.contentShield !== false)
  }
}

rpc.handle(C.CMD_PRIVACY_STATUS, async () => {
  await whenReady()
  const stored = userData ? await userData.getSettings() : {}
  const merged = mergeSettingsWithPrivacyDefaults(stored)
  return {
    privacy: {
      ...privacySettings,
      historyEnabled: merged.historyEnabled === true,
      searchIndexEnabled: merged.searchIndexEnabled === true,
      telemetryEnabled: false,
      contentShield: merged.contentShield !== false
    },
    dataCollection: {
      telemetry: false,
      history: merged.historyEnabled === true,
      searchIndex: merged.searchIndexEnabled === true,
      remoteAnalytics: false,
      note: 'PearBrowser does not ship telemetry. History and local search indexing are opt-in only.'
    },
    session: sessionBridge ? sessionBridge.status() : { nativeBridge: false, hasNativeHook: false }
  }
})

rpc.handle(C.CMD_USERDATA_GET_SESSION, async () => {
  return { session: await requireUserData().getSession() }
})

rpc.handle(C.CMD_USERDATA_SAVE_SESSION, async ({ state } = {}) => {
  await requireUserData().saveSession(state || {})
  return { ok: true }
})

rpc.handle(C.CMD_USERDATA_IMPORT, async ({ dump } = {}) => {
  const imported = await requireUserData().importDump(dump || {})
  return { imported }
})

// --- Identity (Phase 1 ticket 3) ---

function requireIdentity () {
  if (!identity) throw new Error('Identity not available — worklet still booting')
  return identity
}

rpc.handle(C.CMD_IDENTITY_EXPORT_PHRASE, async () => {
  return { mnemonic: requireIdentity().getMnemonic() }
})

rpc.handle(C.CMD_IDENTITY_IMPORT_PHRASE, async ({ mnemonic } = {}) => {
  if (typeof mnemonic !== 'string') throw new Error('mnemonic must be a string')
  if (!validateMnemonic(mnemonic)) throw new Error('Invalid seed phrase — check each word and try again')
  await requireIdentity().restoreFromMnemonic(mnemonic)
  // Caller MUST restart the worklet for the new identity to take effect
  return { ok: true, restartRequired: true }
})

rpc.handle(C.CMD_IDENTITY_ROTATE, async () => {
  await requireIdentity().rotate()
  return { ok: true, restartRequired: true }
})

rpc.handle(C.CMD_IDENTITY_VALIDATE_PHRASE, async ({ mnemonic } = {}) => {
  return { valid: validateMnemonic(mnemonic || '') }
})

// --- Device linking (blind-pairing) ----------------------------------------
// Port of hyper-identity's DeviceLinker, hardened: minting an invite is an
// explicit user action on the SOURCE device, and the root seed is only revealed
// to a device that pairs with THAT single-use invite (see backend/device-linker.js).
let _deviceLinker = null
function getDeviceLinker () {
  if (!swarm) throw new Error('swarm not ready — cannot link devices yet')
  if (!_deviceLinker) {
    const { DeviceLinker } = require('./device-linker.js')
    // autoAccept: the user explicitly initiated linking on THIS device and will
    // only hand the single-use invite to their own new device (e.g. via QR).
    _deviceLinker = new DeviceLinker(swarm, { identity: requireIdentity(), autoAccept: true, log: (m) => console.log(m) })
  }
  return _deviceLinker
}

rpc.handle(C.CMD_DEVICE_LINK_CREATE_INVITE, async () => {
  const { invite, discoveryKey, done } = await getDeviceLinker().createInvite()
  done.then((r) => console.log('[device-link] linked ' + ((r && r.device && r.device.device) || 'device')))
    .catch((e) => console.warn('[device-link] failed:', e && e.message))
  return { invite, discoveryKey }
})

rpc.handle(C.CMD_DEVICE_LINK_JOIN, async ({ invite, device } = {}) => {
  if (typeof invite !== 'string' || !invite) throw new Error('invite required')
  if (!swarm) throw new Error('swarm not ready — cannot link devices yet')
  const { DeviceLinker } = require('./device-linker.js')
  const linker = new DeviceLinker(swarm, { identity: requireIdentity() })
  await linker.joinWithInvite(invite, { device: device || 'this device' })
  // identity.json was rewritten — every store must re-open under the linked seed
  return { ok: true, restartRequired: true }
})

rpc.handle(C.CMD_IDENTITY_SIGN, async ({ payload, driveKey } = {}) => {
  if (payload === undefined || payload === null) throw new Error('payload required')
  const id = requireIdentity()
  // If driveKey is provided, sign with the per-app sub-key (Phase A).
  // Otherwise fall back to the root (kept for backward compat — the
  // "browser" context on Settings screens uses this).
  if (typeof driveKey === 'string' && driveKey.length > 0) {
    return id.signForApp(driveKey, payload)
  }
  return id.sign(typeof payload === 'string' ? payload : Buffer.from(payload))
})

// Phase P0 — verify an ed25519 detached signature. With a driveKey, verifies
// a per-app signForApp() signature (reconstructs the domain-separator tag);
// otherwise a plain verify against the provided publicKey. Backend consumers
// (naming/payments/nostr verify-and-drop) call identity.verify() directly;
// this command exposes the same primitive to the renderer.
rpc.handle(C.CMD_IDENTITY_VERIFY, async ({ payload, signature, publicKey, driveKey, namespace } = {}) => {
  if (payload === undefined || payload === null) throw new Error('payload required')
  const id = requireIdentity()
  const ok = (typeof driveKey === 'string' && driveKey.length > 0)
    ? id.verifyForApp(driveKey, payload, namespace || '', { signature, publicKey })
    : id.verify(payload, signature, publicKey)
  return { ok: !!ok, algorithm: 'ed25519' }
})

// --- Profile (Identity Plan Phase B) ---

function requireProfile () {
  if (!profile) throw new Error('Profile not available — worklet still booting')
  return profile
}

rpc.handle(C.CMD_PROFILE_GET, async () => {
  return { profile: await requireProfile().getAll() }
})

rpc.handle(C.CMD_PROFILE_UPDATE, async ({ updates } = {}) => {
  return { profile: await requireProfile().update(updates || {}) }
})

rpc.handle(C.CMD_PROFILE_CLEAR, async () => {
  await requireProfile().clear()
  return { ok: true }
})

// --- Login ceremony (Identity Plan Phase C) ---
//
// Flow:
//   1. Page calls window.pear.login(opts)
//   2. http-bridge POST /api/login calls ctx.requestLogin(args)
//      → openLoginCeremony() below
//   3. We return the EXISTING grant if one is valid.
//      Otherwise we fire EVT_LOGIN_REQUEST to the RN/Native shell and
//      park the pending promise in `pendingLogins`.
//   4. User decides in a native consent sheet → shell calls
//      CMD_LOGIN_RESOLVE with { requestId, approved, scopes }
//   5. We record the grant in profile.bee, produce the signed
//      attestation, resolve the pending promise → http-bridge returns
//      the attestation to the page.

const LOGIN_TIMEOUT_MS = 2 * 60 * 1000
const LOGIN_DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000

async function openLoginCeremony ({ driveKeyHex, scopes = [], appName = null, reason = null }) {
  if (!identity) throw new Error('Identity not available')
  if (!profile) throw new Error('Profile not available')

  // Reuse an existing valid grant covering ALL requested scopes.
  const existing = await profile.getGrant(driveKeyHex)
  if (existing && scopes.every((s) => existing.scopes.includes(s))) {
    return buildAttestation(driveKeyHex, existing)
  }

  // Fresh consent — park, ask UI, wait.
  const requestId = crypto.randomBytes(16).toString('hex')
  const payload = {
    requestId,
    driveKey: driveKeyHex,
    scopes,
    appName,
    reason,
    currentGrant: existing || null,
  }

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pendingLogins.has(requestId)) {
        pendingLogins.delete(requestId)
        reject(new Error('Login request timed out (user did not respond in 2 minutes)'))
      }
    }, LOGIN_TIMEOUT_MS)
    pendingLogins.set(requestId, {
      resolve, reject, timer,
      driveKeyHex,
      requestedScopes: scopes,
      requestedAppName: appName,
    })
    rpc.event(C.EVT_LOGIN_REQUEST, payload)
  })
}

function buildAttestation (driveKeyHex, grant) {
  // The attestation is:
  //   pear.login.v1:<driveKey>:<appPubkey>:<scopes-joined>:<expiresAt>
  // signed with the per-app sub-key. Apps + third parties can verify
  // by recomputing the app sub-pubkey from the user's root pubkey
  // (but since root never leaves the device, they verify the
  // attestation directly with appPubkey which is embedded).
  const keypair = identity.getAppKeypair(driveKeyHex)
  const appPubkey = keypair.publicKey.toString('hex')
  const payload = `pear.login.v1:${driveKeyHex}:${appPubkey}:${grant.scopes.join(',')}:${grant.expiresAt}`
  const signed = identity.signForApp(driveKeyHex, payload, 'login')
  return {
    appPubkey,
    scopes: grant.scopes,
    expiresAt: grant.expiresAt,
    grantedAt: grant.grantedAt,
    loginProof: signed.signature,
    tag: signed.tag,
  }
}

rpc.handle(C.CMD_LOGIN_RESOLVE, async ({ requestId, approved, scopes, ttlMs } = {}) => {
  const pending = pendingLogins.get(requestId)
  if (!pending) throw new Error('No pending login with that id (timed out?)')
  pendingLogins.delete(requestId)
  clearTimeout(pending.timer)

  if (!approved) {
    pending.reject(new Error('User declined'))
    return { ok: true, approved: false }
  }

  // UI decides which scopes to grant (can narrow from what was requested).
  // Fall back to whatever the page asked for if the UI doesn't echo it.
  const finalScopes = Array.isArray(scopes) && scopes.length > 0
    ? scopes.map(String)
    : pending.requestedScopes
  const expiresAt = Date.now() + (typeof ttlMs === 'number' ? ttlMs : LOGIN_DEFAULT_TTL)

  const grant = await profile.setGrant(pending.driveKeyHex, {
    scopes: finalScopes,
    appName: pending.requestedAppName,
    expiresAt,
  })
  const attestation = buildAttestation(pending.driveKeyHex, grant)
  pending.resolve(attestation)
  return { ok: true, approved: true, driveKey: pending.driveKeyHex, scopes: finalScopes }
})

rpc.handle(C.CMD_LOGIN_LIST_GRANTS, async () => {
  return { grants: await requireProfile().listGrants() }
})

rpc.handle(C.CMD_LOGIN_REVOKE_GRANT, async ({ driveKeyHex } = {}) => {
  if (typeof driveKeyHex !== 'string') throw new Error('driveKeyHex required')
  await requireProfile().revokeGrant(driveKeyHex)
  return { ok: true }
})

rpc.handle(C.CMD_LOGIN_REVOKE_ALL, async () => {
  const n = await requireProfile().revokeAllGrants()
  return { ok: true, revoked: n }
})

// --- Contacts (Identity Plan Phase D) ---

function requireContacts () {
  if (!contacts) throw new Error('Contacts not available — worklet still booting')
  return contacts
}

rpc.handle(C.CMD_CONTACTS_LIST, async ({ limit } = {}) => {
  return { contacts: await requireContacts().list({ limit }) }
})

rpc.handle(C.CMD_CONTACTS_LOOKUP, async ({ pubkey } = {}) => {
  return { contact: await requireContacts().lookup(pubkey) }
})

rpc.handle(C.CMD_CONTACTS_ADD, async (input = {}) => {
  return { contact: await requireContacts().add(input) }
})

// Build our own shareable contact invite: pk + display name + a root signature
// over `pear.contact:<pk>:<name>` (what add() verifies) + our lighthouse-binding
// DHT key (bk), so whoever adds us can resolve our binding for federated search.
rpc.handle(C.CMD_CONTACTS_MY_INVITE, async () => {
  await whenReady()
  const id = requireIdentity()
  const rootHex = b4a.toString(id.getSigningKeypair().publicKey, 'hex')
  let displayName = ''
  try { displayName = String((await requireProfile().get('displayName')) || '').trim().slice(0, 128) } catch {}
  const bindingKey = b4a.toString(id.getAppKeypair('lighthouse-binding').publicKey, 'hex')
  // sign name AND binding key, so neither can be swapped in transit (add() binds both)
  const sig = id.sign(`pear.contact:${rootHex}:${displayName}:${bindingKey}`).signature
  const url = `p2p-contact://invite?pk=${rootHex}&name=${encodeURIComponent(displayName)}&sig=${sig}&bk=${bindingKey}`
  return { url, pubkey: rootHex, displayName, bindingKey }
})

// Add a contact from a pasted invite URL. parseInviteURL extracts pk/name/sig/bk;
// add() fail-closed verifies the signature (rejecting a tampered invite).
rpc.handle(C.CMD_CONTACTS_ADD_INVITE, async ({ url } = {}) => {
  await whenReady()
  const parsed = Contacts.parseInviteURL(String(url || ''))
  if (!parsed) throw new Error('not a valid contact invite URL')
  return { contact: await requireContacts().add(parsed) }
})

rpc.handle(C.CMD_CONTACTS_UPDATE, async ({ pubkey, updates } = {}) => {
  return { contact: await requireContacts().update(pubkey, updates || {}) }
})

// --- Naming (Phase N1) — petnames + curated bootstrap resolver ---
//
// Local Hyperbee petname store (Tier 0) + the pure tiered resolver
// (names.cjs / resolve-name.cjs, both Node-tested). Gated behind the
// experimentalNaming user-data flag, modelled on requireAutobee: disabled ⇒
// CMD_NAME_RESOLVE answers null and the URL bar behaves EXACTLY as before, so
// the flag-off path has no boot/navigation impact. Mutations fail closed.

function requireNames () {
  if (!names) throw new Error('Names not available — worklet still booting')
  return names
}

async function isNamingEnabled () {
  try {
    const s = await requireUserData().getSettings()
    return !!(s && s.experimentalNaming)
  } catch { return false }
}

async function requireNaming () {
  if (!(await isNamingEnabled())) {
    throw new Error('Naming (petnames) is experimental — enable it in Settings first.')
  }
}

// The owner identity for the user's name claims: their stable ROOT ed25519 key.
// ownerSign signs the registry's domain-tagged canonical bytes (NOT page-supplied
// bytes — the canon is built backend-side in name-registry-ops), so a claim can
// never be coerced into signing attacker-chosen content. Mirrors the publisher's
// _rootSign / _rootPubkeyHex (identity-binding-publisher.js).
function nameRegSigner () {
  const id = requireIdentity()
  return {
    owner: b4a.toString(id.getSigningKeypair().publicKey, 'hex'),
    ownerSign: (msg) => id.sign(msg).signature,
  }
}

// Open the user's OWN name registry, minting it on first claim. Mirrors
// ensureBrowserSync: mint under a throwaway namespace, persist the key + a fresh
// encryption key, then always reopen by bootstrap (so the per-user Autobase has a
// stable identity on the shared Corestore). Returns the live registry or null.
// Serialize ensureNameRegistry so two concurrent first-time claims can't both
// enter the create branch (which would double-mint + race setSettings, orphaning
// one base). The second caller awaits the first, then sees the persisted key and
// reopens the same registry. Mirrors PersonalIndex._serialize.
let _nameRegChain = Promise.resolve()
function ensureNameRegistry (opts = {}) {
  const run = _nameRegChain.then(() => _ensureNameRegistryImpl(opts), () => _ensureNameRegistryImpl(opts))
  _nameRegChain = run.then(() => {}, () => {}) // the lock never rejects
  return run
}
async function _ensureNameRegistryImpl ({ create = false } = {}) {
  const s = await requireUserData().getSettings()
  const key = (typeof s.nameRegKey === 'string' && /^[0-9a-f]{64}$/i.test(s.nameRegKey)) ? s.nameRegKey : null
  if (key) {
    if (nameRegistry && nameRegistry.key === key) return nameRegistry
    if (nameRegistry) { try { await nameRegistry.close() } catch {} nameRegistry = null }
    nameRegistry = await new NameRegistry(store, { bootstrap: key, encryptionKey: null }).ready()
    if (nameRegistry.discoveryKey && swarm) swarm.join(nameRegistry.discoveryKey, { server: true, client: true })
    return nameRegistry
  }
  if (!create) return null
  // Create the user's registry ONCE and KEEP it (no close-then-reopen on the
  // shared store). UNENCRYPTED so trusted contacts can replicate + resolve the
  // user's PUBLIC name claims — integrity is the per-claim owner signature, not
  // secrecy. Anyone the user shares the key with (their contacts) can resolve it.
  const reg = await new NameRegistry(store, { bootstrap: null, encryptionKey: null }).ready()
  await requireUserData().setSettings({ nameRegKey: reg.key })
  nameRegistry = reg
  if (nameRegistry.discoveryKey && swarm) swarm.join(nameRegistry.discoveryKey, { server: true, client: true })
  // Advertise the registry key on our self-certifying binding so contacts can
  // discover + replicate it (best-effort; rides the lighthouse-binding rail).
  if (identityBindingPublisher) identityBindingPublisher.publish().catch(() => {})
  return nameRegistry
}

// Read-only, cached, replicating views of CONTACTS' registries (federation). Each
// gets its OWN substore (keyed by bootstrap) so they never collide with the user's
// own registry or each other on the shared store. Keyed by the CONTACT root (one
// registry per contact): when a contact rotates their advertised key we tear down
// the stale base + leave its swarm topic, and the map is capped + LRU-evicted, so
// a verified contact churning their key can't leak unbounded substores/topics.
const MAX_CONTACT_REGISTRIES = 128
const _contactRegistries = new Map() // contactRoot hex -> { keyHex, reg }
async function _closeContactReg (entry) {
  try { if (entry.reg.discoveryKey && swarm) swarm.leave(entry.reg.discoveryKey) } catch {}
  try { await entry.reg.close() } catch {}
}
async function openContactRegistry (keyHex, contactRoot) {
  if (typeof keyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(keyHex)) return null
  const rootKey = (typeof contactRoot === 'string' && contactRoot) ? contactRoot.toLowerCase() : keyHex
  const cached = _contactRegistries.get(rootKey)
  if (cached) {
    if (cached.keyHex === keyHex) return cached.reg
    _contactRegistries.delete(rootKey) // contact rotated their key — drop the stale base
    await _closeContactReg(cached)
  }
  while (_contactRegistries.size >= MAX_CONTACT_REGISTRIES) { // bound + LRU-evict (insertion order)
    const oldestKey = _contactRegistries.keys().next().value
    const oldest = _contactRegistries.get(oldestKey)
    _contactRegistries.delete(oldestKey)
    await _closeContactReg(oldest)
  }
  const reg = await new NameRegistry(store, { bootstrap: keyHex, encryptionKey: null, storeNamespace: 'eab-name-registry-c-' + keyHex }).ready()
  if (reg.discoveryKey && swarm) swarm.join(reg.discoveryKey, { server: false, client: true })
  _contactRegistries.set(rootKey, { keyHex, reg })
  return reg
}

// Read-only, cached, replicating views of CONTACTS' Nostr event stores (Phase 3).
// Same discipline as openContactRegistry: own substore per store, keyed by contact
// root, close/leave on key-rotate, cap + LRU-evict.
const _contactEventStores = new Map() // contactRoot hex -> { keyHex, store }
async function _closeContactEventStore (entry) {
  try { if (entry.store.discoveryKey && swarm) swarm.leave(entry.store.discoveryKey) } catch {}
  try { await entry.store.close() } catch {}
}
async function openContactEventStore (keyHex, contactRoot) {
  if (typeof keyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(keyHex)) return null
  const rootKey = (typeof contactRoot === 'string' && contactRoot) ? contactRoot.toLowerCase() : keyHex
  const cached = _contactEventStores.get(rootKey)
  if (cached) {
    if (cached.keyHex === keyHex) return cached.store
    _contactEventStores.delete(rootKey)
    await _closeContactEventStore(cached)
  }
  while (_contactEventStores.size >= MAX_CONTACT_REGISTRIES) {
    const oldestKey = _contactEventStores.keys().next().value
    const oldest = _contactEventStores.get(oldestKey)
    _contactEventStores.delete(oldestKey)
    await _closeContactEventStore(oldest)
  }
  const es = await new NostrEventStore(store, { bootstrap: keyHex, encryptionKey: null, storeNamespace: 'eab-nostr-events-c-' + keyHex }).ready()
  if (es.discoveryKey && swarm) swarm.join(es.discoveryKey, { server: false, client: true })
  _contactEventStores.set(rootKey, { keyHex, store: es })
  return es
}

// Resolve a typed word against the local petname store (Tier 0, wins) + the
// curated NAME_ALIASES floor (Tier 3). Never throws for the disabled/unknown
// case — returns { resolved: null } so the UI falls through to plain URL
// handling. Tiers 1/2 (contacts, followed rooms) slot in at N3/N4.
rpc.handle(C.CMD_NAME_RESOLVE, async ({ name } = {}) => {
  await whenReady()
  if (!(await isNamingEnabled())) return { resolved: null, enabled: false }
  const petnames = names ? await names.petnameMap() : {}
  // Tier 2a — the user's OWN registry (reopened if it exists; never minted by a
  // read). Best-effort: a registry failure must not break petname/curated.
  let registry = {}
  try { const reg = await ensureNameRegistry({ create: false }); if (reg) registry = await reg.activeMap() } catch {}
  // Resolve highest tiers first WITHOUT the curated floor: petname (0) + own
  // registry (2a). If those miss, try federation (2b) before falling to curated.
  let resolved = resolveName(name, { petnames, registry, aliases: false })
  if (!resolved && federatedNameResolver) {
    // Tier 2b — trusted contacts' registries (cross-user federation).
    let fed = null
    try { fed = await federatedNameResolver.resolve(name) } catch {}
    if (fed) resolved = { name: fed.name, key: fed.key || null, link: fed.link || null, target: fed.target || fed.link || fed.key || null, label: fed.name, provenance: 'contact', source: fed.source, candidates: fed.candidates }
  }
  // Tier 3 — curated bootstrap floor (lowest authority).
  if (!resolved) resolved = resolveName(name, { aliases: true })
  return { resolved, enabled: !!names }
})

rpc.handle(C.CMD_NAME_PETNAME_LIST, async ({ limit } = {}) => {
  await whenReady()
  if (!names || !(await isNamingEnabled())) return { petnames: [] }
  return { petnames: await requireNames().list({ limit }) }
})

rpc.handle(C.CMD_NAME_PETNAME_SET, async ({ name, key, link, label } = {}) => {
  await whenReady()
  await requireNaming()
  return { petname: await requireNames().setPetname({ name, key, link, label }) }
})

rpc.handle(C.CMD_NAME_PETNAME_REMOVE, async ({ name } = {}) => {
  await whenReady()
  await requireNaming()
  await requireNames().removePetname(name)
  return { ok: true }
})

// --- Name registry (Phase N5) — owner-signed multi-writer claims --------------
// Claims auto-create the user's own registry; the owner is their root identity,
// signed backend-side (the page supplies only name+target, never signable bytes).
function requireNameRegistryCreated () {
  if (!nameRegistry) throw new Error('No name registry yet — claim a name to create one.')
  return nameRegistry
}

rpc.handle(C.CMD_NAMEREG_STATUS, async () => {
  await whenReady()
  if (!(await isNamingEnabled())) return { enabled: false, created: false }
  const reg = await ensureNameRegistry({ create: false })
  if (!reg) return { enabled: true, created: false }
  const { owner } = nameRegSigner()
  return { enabled: true, created: true, key: reg.key, owner, writable: reg.writable, writerKey: reg.localKey }
})

rpc.handle(C.CMD_NAMEREG_LIST, async () => {
  await whenReady()
  if (!(await isNamingEnabled())) return { names: [] }
  const reg = await ensureNameRegistry({ create: false })
  return { names: reg ? await reg.list() : [] }
})

rpc.handle(C.CMD_NAMEREG_RESOLVE, async ({ name } = {}) => {
  await whenReady()
  if (!(await isNamingEnabled())) return { resolved: null }
  const reg = await ensureNameRegistry({ create: false })
  return { resolved: reg ? await reg.resolve(name) : null }
})

rpc.handle(C.CMD_NAMEREG_CLAIM, async ({ name, target } = {}) => {
  await whenReady(); await requireNaming()
  // Pre-validate BEFORE minting, so garbage input never creates a registry or
  // appends a dead op. A name that normalizes to empty (all-invisible) or exceeds
  // MAX_NAME would be silently dropped by the reducer → a confusing {ok, null}.
  const { normalize } = require('./name-normalize.cjs')
  const { MAX_NAME, TARGET_ERROR, normalizeTarget } = require('./name-registry-ops.cjs')
  if (typeof name !== 'string' || !name.trim()) throw new Error('name required')
  if (name.length > MAX_NAME || !normalize(name)) throw new Error('invalid name (too long, or empty after normalization)')
  const cleanTarget = normalizeTarget(target)
  if (!cleanTarget) throw new Error(TARGET_ERROR)
  const reg = await ensureNameRegistry({ create: true })
  const { owner, ownerSign } = nameRegSigner()
  await reg.claim({ name, target: cleanTarget.target, owner }, ownerSign)
  const resolved = await reg.resolve(name)
  // A null resolve after a well-formed claim means the reducer rejected it —
  // homograph-blocked or already held by someone else. Report it honestly.
  if (!resolved) throw new Error('Name unavailable — already held or blocked as a look-alike of an existing name.')
  return { ok: true, resolved }
})

rpc.handle(C.CMD_NAMEREG_ROTATE, async ({ name, target } = {}) => {
  await whenReady(); await requireNaming()
  const { TARGET_ERROR, normalizeTarget } = require('./name-registry-ops.cjs')
  const cleanTarget = normalizeTarget(target)
  if (!cleanTarget) throw new Error(TARGET_ERROR)
  const reg = requireNameRegistryCreated()
  const cur = await reg.resolve(name)
  if (!cur) throw new Error('You don\'t hold that name (claim it first).')
  const { owner, ownerSign } = nameRegSigner()
  if (cur.owner !== owner) throw new Error('You don\'t own that name.')
  await reg.rotate({ name, target: cleanTarget.target, owner, version: cur.version + 1 }, ownerSign)
  return { ok: true, resolved: await reg.resolve(name) }
})

rpc.handle(C.CMD_NAMEREG_RELEASE, async ({ name } = {}) => {
  await whenReady(); await requireNaming()
  const reg = requireNameRegistryCreated()
  const { owner, ownerSign } = nameRegSigner()
  await reg.release({ name, owner }, ownerSign)
  return { ok: true }
})

rpc.handle(C.CMD_NAMEREG_REVOKE, async ({ name } = {}) => {
  await whenReady(); await requireNaming()
  const reg = requireNameRegistryCreated()
  const { owner, ownerSign } = nameRegSigner()
  await reg.revoke({ name, owner }, ownerSign)
  return { ok: true }
})

// --- swarm.v1 — swarm consent ceremony + grants management ---
//
// When http-bridge → swarm-bridge sees a Tier C topic-join request,
// it calls requestConsent(args) which routes through openSwarmConsent
// below. Mirrors the login ceremony shape: park a pending promise,
// fire EVT_SWARM_REQUEST to the UI, the UI calls CMD_SWARM_RESOLVE
// once the user decides.

async function openSwarmConsent ({ driveKeyHex, appName, reason, topicHex, protocol }) {
  return await new Promise((resolve, reject) => {
    const requestId = crypto.randomBytes(16).toString('hex')
    const timer = setTimeout(() => {
      if (pendingSwarmConsents.has(requestId)) {
        pendingSwarmConsents.delete(requestId)
        reject(new Error('Swarm consent timed out (no response within 2 minutes)'))
      }
    }, SWARM_CONSENT_TIMEOUT_MS)
    pendingSwarmConsents.set(requestId, { resolve, reject, timer })
    rpc.event(C.EVT_SWARM_REQUEST, {
      requestId,
      driveKey: driveKeyHex,
      topicHex,
      protocol,
      appName,
      reason,
    })
  })
}

rpc.handle(C.CMD_SWARM_RESOLVE, async ({ requestId, approved } = {}) => {
  const pending = pendingSwarmConsents.get(requestId)
  if (!pending) throw new Error('No pending swarm consent with that id (timed out?)')
  pendingSwarmConsents.delete(requestId)
  clearTimeout(pending.timer)
  pending.resolve(!!approved)
  return { ok: true, approved: !!approved }
})

rpc.handle(C.CMD_SWARM_LIST_GRANTS, async ({ driveKey } = {}) => {
  if (!swarmGrants) return { grants: [] }
  const grants = driveKey
    ? await swarmGrants.listForApp(driveKey)
    : await swarmGrants.list()
  return { grants }
})

rpc.handle(C.CMD_SWARM_REVOKE_GRANT, async ({ driveKey, topicHex } = {}) => {
  if (!swarmGrants) throw new Error('SwarmGrants not available')
  const result = await swarmGrants.remove(driveKey, topicHex)
  return { ok: true, ...result }
})

rpc.handle(C.CMD_SWARM_REVOKE_ALL_FOR_APP, async ({ driveKey } = {}) => {
  if (!swarmGrants) throw new Error('SwarmGrants not available')
  const n = await swarmGrants.removeAllForApp(driveKey)
  return { ok: true, revoked: n }
})

rpc.handle(C.CMD_CONTACTS_REMOVE, async ({ pubkey } = {}) => {
  await requireContacts().remove(pubkey)
  return { ok: true }
})

// --- WDK wallet preview (docs/WDK_WALLET_V0.9_SPEC.md) ----------------------
//
// Chrome-only RPC: Hyperdrive pages never reach these commands — Phase D
// wires them to the HTTP bridge contract (spec §4) and enters the consent
// flow through requestWalletConsent(). Coded service errors follow the
// existing RPC convention: rpc.js serializes handler errors as err.message;
// the stable err.code vocabulary stays in-process for Phase D's HTTP routes.
//
// Passphrases cross as JSON strings — managed, immutable copies that cannot
// be zeroed; the spec (§3.1) accepts those managed-string copies inside the
// trusted chrome ceremony for the testnet preview.

function walletError (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

function requireWalletService () {
  if (!walletService) throw walletError('not-found', 'wallet is not available — worklet still booting')
  return walletService
}

function requireWalletConsent () {
  if (!walletConsent) throw walletError('not-found', 'wallet consent is not available — worklet still booting')
  return walletConsent
}

// Phase D's HTTP wallet routes call this to request chrome consent for a
// pending wallet prompt. Returns a Promise of the resolution result (the
// walletService.resolvePrompt() outcome for payment/sign-app, the connect
// result for connect). See backend/wallet/wallet-consent.cjs.
function requestWalletConsent (prompt, tuple) {
  return requireWalletConsent().request(prompt, tuple)
}

// Phase D installs the real document-token registry through this setter;
// until then every page-facing wallet call fails closed with not-authorized.
let walletDocumentTokenVerifier = async () => false
function setWalletDocumentTokenVerifier (fn) {
  walletDocumentTokenVerifier = typeof fn === 'function' ? fn : async () => false
  if (walletService) walletService.setDocumentTokenVerifier(walletDocumentTokenVerifier)
}

rpc.handle(C.CMD_WALLET_STATUS, async () => {
  return requireWalletService().status()
})

rpc.handle(C.CMD_WALLET_CREATE, async ({ passphrase } = {}) => {
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw walletError('bad-request', 'passphrase must be a non-empty string')
  }
  return requireWalletService().createWallet(passphrase)
})

rpc.handle(C.CMD_WALLET_IMPORT, async ({ passphrase, mnemonicB64 } = {}) => {
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw walletError('bad-request', 'passphrase must be a non-empty string')
  }
  if (typeof mnemonicB64 !== 'string' || mnemonicB64.length === 0) {
    throw walletError('bad-request', 'mnemonicB64 must be a base64 string')
  }
  // The RPC frame is JSON-only (backend/rpc.js), so the restore mnemonic
  // crosses as base64 and is decoded into a mutable buffer here. The engine
  // overwrites the caller's buffer before its ceremony settles; we zero our
  // copy in finally for the error paths.
  let mnemonic = null
  try {
    mnemonic = b4a.from(mnemonicB64, 'base64')
    return await requireWalletService().restoreWallet(passphrase, mnemonic)
  } finally {
    try { if (mnemonic) mnemonic.fill(0) } catch {}
  }
})

// One command for the two-step backup challenge (spec allocation 303):
//   { phase: 'begin',  passphrase }          → { ceremonyId, mnemonicB64 }
//   { phase: 'finish', ceremonyId, outcome } → { completed: true }
// The mnemonic Buffer crosses to the trusted chrome ceremony as base64 (the
// frame is JSON-only) and our copy is zeroed immediately after encoding.
rpc.handle(C.CMD_WALLET_BACKUP, async (data = {}) => {
  const svc = requireWalletService()
  if (data.phase === 'begin') {
    if (typeof data.passphrase !== 'string' || data.passphrase.length === 0) {
      throw walletError('bad-request', 'passphrase must be a non-empty string')
    }
    const begun = await svc.backupWallet(data.passphrase)
    let mnemonicB64
    try {
      mnemonicB64 = b4a.toString(begun.mnemonic, 'base64')
    } finally {
      try { begun.mnemonic.fill(0) } catch {}
    }
    return { ceremonyId: begun.ceremonyId, mnemonicB64 }
  }
  if (data.phase === 'finish') {
    return svc.finishBackup({ ceremonyId: data.ceremonyId, outcome: data.outcome })
  }
  throw walletError('bad-request', 'phase must be begin or finish')
})

rpc.handle(C.CMD_WALLET_UNLOCK, async ({ passphrase } = {}) => {
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw walletError('bad-request', 'passphrase must be a non-empty string')
  }
  return requireWalletService().unlock(passphrase)
})

rpc.handle(C.CMD_WALLET_LOCK, async () => {
  // Reject parked chrome prompts first; lock() cancels the service-side
  // pending prompt and revokes every connection.
  if (walletConsent) walletConsent.rejectAll('wallet-lock')
  return requireWalletService().lock()
})

rpc.handle(C.CMD_WALLET_CONNECTIONS_LIST, async () => {
  return { connections: requireWalletService().listConnections() }
})

rpc.handle(C.CMD_WALLET_CONNECTION_REVOKE, async ({ browserSessionId, tabId, driveKey } = {}) => {
  // Chrome-driven revoke: the trusted chrome path holds no document token,
  // so it uses the service's chrome-only revokeConnection() — never the
  // page-facing disconnect().
  return requireWalletService().revokeConnection({ browserSessionId, tabId, driveKey })
})

rpc.handle(C.CMD_WALLET_CONNECT_RESOLVE, async ({ intentId, approved } = {}) => {
  if (typeof intentId !== 'string') throw walletError('bad-request', 'intentId must be a string')
  return requireWalletConsent().resolve(intentId, approved === true, 'connect')
})

rpc.handle(C.CMD_WALLET_PAYMENT_RESOLVE, async ({ intentId, approved } = {}) => {
  if (typeof intentId !== 'string') throw walletError('bad-request', 'intentId must be a string')
  return requireWalletConsent().resolve(intentId, approved === true, ['payment', 'sign-app'])
})

// Chrome-owned read commands (spec §10 allocations 306–308). Pages never
// reach this RPC channel; only the trusted settings UI calls these.
rpc.handle(C.CMD_WALLET_ADDRESS, async () => {
  const status = await requireWalletService().status()
  if (status.state !== 'unlocked' || typeof status.address !== 'string') {
    throw walletError('wallet-locked', 'wallet is locked — unlock it to read the address')
  }
  return { address: status.address }
})

rpc.handle(C.CMD_WALLET_BALANCES, async () => {
  const status = await requireWalletService().status()
  if (status.state !== 'unlocked') {
    throw walletError('wallet-locked', 'wallet is locked — unlock it to read balances')
  }
  // The balance read goes through the live chain RPC; when the network is
  // down degrade to { unavailable: true, code } instead of failing the
  // settings screen.
  try {
    return await wdkEngine.getBalances()
  } catch (err) {
    return balancesUnavailable(err)
  }
})

rpc.handle(C.CMD_WALLET_TRANSACTIONS, async ({ limit } = {}) => {
  requireWalletService()
  const normalized = normalizeListLimit(limit)
  if (normalized === null) throw walletError('bad-request', 'limit must be an integer between 1 and 200')
  const entries = walletJournal ? await walletJournal.listRecent(normalized) : []
  return { transactions: projectJournalEntries(entries) }
})

// Spec §10 allocation 313: reconcile ships with a later phase. Registered so
// the chrome mirror is complete; fails closed until implemented.
rpc.handle(C.CMD_WALLET_RECONCILE, async () => {
  throw walletError('not-implemented', 'CMD_WALLET_RECONCILE is reserved and not implemented in v0.9')
})


// --- Nostr identity (Phase 1) — npub + cross-curve binding (NOSTR0-2) -------
// GET_IDENTITY/BIND/REVOKE take NO page-controlled payload: the signed canonical
// bytes are built backend-side (identity.makeNostrBinding/makeNostrRevocation),
// so a page can trigger a bind/revoke but can never get the root key to sign
// attacker-chosen bytes (threat #10). The nsec never leaves the worklet.
function requireNostrIdentity () {
  if (!nostrBindingStore) throw new Error('Nostr identity not available — worklet still booting')
  return nostrBindingStore
}
rpc.handle(C.CMD_NOSTR_GET_IDENTITY, async () => {
  await whenReady()
  return requireNostrIdentity().getState()
})
rpc.handle(C.CMD_NOSTR_BIND, async () => {
  await whenReady()
  const state = await requireNostrIdentity().bind()
  // re-advertise our (now-linked) nostr-bind so contacts can author-verify our notes
  if (identityBindingPublisher) identityBindingPublisher.publish().catch(() => {})
  return state
})
rpc.handle(C.CMD_NOSTR_REVOKE, async () => {
  await whenReady()
  const state = await requireNostrIdentity().revoke()
  // Re-advertise after unlinking so contacts stop trusting the last published
  // nostrBind instead of waiting for an unrelated future binding refresh.
  if (identityBindingPublisher) identityBindingPublisher.publish().catch(() => {})
  return state
})

// --- Nostr event store (Phase 2) — author + read your own NIP-01 events --------
// The user's OWN event log: UNENCRYPTED + create-and-keep (public, signature-
// integrity, contact-replicable in a later phase), serialized so two concurrent
// first publishes can't double-mint. Mirrors ensureNameRegistry.
let _nostrEvChain = Promise.resolve()
function ensureNostrEventStore (opts = {}) {
  const run = _nostrEvChain.then(() => _ensureNostrEventStoreImpl(opts), () => _ensureNostrEventStoreImpl(opts))
  _nostrEvChain = run.then(() => {}, () => {})
  return run
}
async function _ensureNostrEventStoreImpl ({ create = false } = {}) {
  const s = await requireUserData().getSettings()
  const key = (typeof s.nostrEventKey === 'string' && /^[0-9a-f]{64}$/i.test(s.nostrEventKey)) ? s.nostrEventKey : null
  if (key) {
    if (nostrEventStore && nostrEventStore.key === key) return nostrEventStore
    if (nostrEventStore) { try { await nostrEventStore.close() } catch {} nostrEventStore = null }
    nostrEventStore = await new NostrEventStore(store, { bootstrap: key, encryptionKey: null }).ready()
    if (nostrEventStore.discoveryKey && swarm) swarm.join(nostrEventStore.discoveryKey, { server: true, client: true })
    return nostrEventStore
  }
  if (!create) return null
  const es = await new NostrEventStore(store, { bootstrap: null, encryptionKey: null }).ready()
  await requireUserData().setSettings({ nostrEventKey: es.key })
  nostrEventStore = es
  if (nostrEventStore.discoveryKey && swarm) swarm.join(nostrEventStore.discoveryKey, { server: true, client: true })
  // advertise the event-store key on our binding so contacts can replicate our feed
  if (identityBindingPublisher) identityBindingPublisher.publish().catch(() => {})
  return nostrEventStore
}

// Sign a NIP-01 event with the user's Nostr key (trusted chrome only — the page-
// facing signer with a kind-whitelist is a later phase) and store it. created_at
// is the event's claimed wall-clock (part of the signed content + NIP-01); the
// store's reducer never orders by it.
rpc.handle(C.CMD_NOSTR_PUBLISH, async ({ kind, content, tags, created_at } = {}) => {
  await whenReady()
  const id = requireIdentity()
  const { MAX_CONTENT, MAX_TAGS, MAX_EVENT_BYTES } = require('./nostr-events-ops.cjs')
  if (!Number.isInteger(kind) || kind < 0) throw new Error('kind must be a non-negative integer')
  if (typeof content !== 'string') throw new Error('content must be a string')
  if (content.length > MAX_CONTENT) throw new Error('content is too large')
  const safeTags = Array.isArray(tags)
    ? tags.filter((t) => Array.isArray(t) && t.every((x) => typeof x === 'string')).slice(0, MAX_TAGS)
    : []
  const nowSec = Math.floor(Date.now() / 1000)
  const ts = Number.isInteger(created_at) && created_at > 0 ? created_at : nowSec
  // reject a future-dated note (anti-spam: keeps your own + contacts' feeds honest
  // once events become contact-replicable; the reducer itself stays clock-free)
  if (ts > nowSec + 900) throw new Error('created_at is too far in the future')
  try {
    const draft = { id: '0'.repeat(64), pubkey: id.getNostrPublicKey(), created_at: ts, kind, tags: safeTags, content, sig: '0'.repeat(128) }
    if (JSON.stringify(draft).length > MAX_EVENT_BYTES) throw new Error('event is too large')
  } catch (err) {
    if (err && err.message === 'event is too large') throw err
    throw new Error('event could not be serialized')
  }
  const ev = id.nostrSignEvent({ kind, created_at: ts, tags: safeTags, content })
  const { verifyEvent } = require('./nostr-events-apply.cjs')
  if (!verifyEvent(ev).ok) throw new Error('event failed NIP-01 validation (content/tags too large?)')
  const es = await ensureNostrEventStore({ create: true })
  await es.addEvent(ev)
  return { ok: true, event: ev }
})

// Query your own feed; with { federated:true }, also merge TRUSTED contacts'
// attested events (each tagged `_via` with the source contact). Best-effort: a
// corrupt store / a slow contact degrades to fewer events, never an RPC reject.
const MAX_FEED_EVENTS = 500
rpc.handle(C.CMD_NOSTR_QUERY, async ({ filter, federated } = {}) => {
  await whenReady()
  const { queryEvents } = require('./nostr-query.cjs')
  let own = []
  try { const es = await ensureNostrEventStore({ create: false }); if (es) own = (await es.listEvents()).map((ev) => ({ ...ev, _via: null })) } catch {}
  let contactEvents = []
  let hidden = null
  if (federated && federatedNostrFeed) {
    try {
      if (typeof federatedNostrFeed.eventsWithDiagnostics === 'function') {
        const res = await federatedNostrFeed.eventsWithDiagnostics()
        contactEvents = Array.isArray(res?.events) ? res.events : []
        hidden = res?.hidden || null
      } else {
        contactEvents = await federatedNostrFeed.events()
      }
    } catch {}
  }
  const byId = new Map()
  for (const ev of own) byId.set(ev.id, ev) // own wins on id collision
  for (const ev of contactEvents) if (!byId.has(ev.id)) byId.set(ev.id, ev)
  const cap = Math.min((filter && Number.isInteger(filter.limit) && filter.limit > 0) ? filter.limit : MAX_FEED_EVENTS, MAX_FEED_EVENTS)
  return { events: queryEvents([...byId.values()], { ...(filter || {}), limit: cap }), hidden }
})


// Also enrich the existing CMD_GET_IDENTITY response with mnemonic hint
// (without exposing the phrase itself) so the UI can show identity status.

// --- Drive Management ---

const MAX_BROWSE_DRIVES = 20
const driveInfoUpdates = new WeakMap()

function safeJSONParse (str) {
  const obj = JSON.parse(str)
  if (obj && typeof obj === 'object') {
    delete obj.__proto__
    delete obj.constructor
  }
  return obj
}

async function ensureBrowseDrive (keyHex) {
  // Validate drive key format
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
    throw new Error('Invalid drive key format')
  }

  if (browseDrives.has(keyHex)) {
    const entry = browseDrives.get(keyHex)
    entry.lastAccess = Date.now()
    // Re-sync on navigation so a RE-PUBLISHED drive (advanced to a new version)
    // is picked up on reload. Without this, a cached session stays pinned to the
    // version it first saw: the page's index.html still loads but its newer
    // sub-resources (js/app.js …) read a stale file index and 404. Best-effort +
    // debounced; if the version actually moves we drop the proxy's per-file cache
    // for this drive so stale bytes can't mask the new release.
    reSyncBrowseDrive(entry.drive, keyHex)
    return entry.drive
  }

  // Evict the least-recently-used drive if at capacity. We track
  // lastAccess on every hit, so evict by that — not by Map insertion order
  // (keys().next()), which would drop a frequently-used drive just because
  // it was opened first. Matches the LRU policy in cleanupOldData().
  if (browseDrives.size >= MAX_BROWSE_DRIVES) {
    let oldest = null
    let oldestAccess = Infinity
    for (const [key, entry] of browseDrives) {
      const access = entry.lastAccess || 0
      if (access < oldestAccess) { oldestAccess = access; oldest = key }
    }
    const oldEntry = browseDrives.get(oldest)
    browseDrives.delete(oldest)
    unregisterHiveRelayDrive(oldest, oldEntry.drive)
    try { await swarm.leave(oldEntry.drive.discoveryKey) } catch (err) {
      console.error('Failed to leave swarm:', err.message)
    }
    try { await oldEntry.drive.close() } catch (err) {
      console.error('Failed to close drive:', err.message)
    }
  }

  const drive = new Hyperdrive(store, Buffer.from(keyHex, 'hex'))
  await drive.ready()
  // Tell Hypercore that peer discovery is in progress so {wait:true} reads BLOCK
  // until a peer is actually found, instead of returning empty / timing out on a
  // cold drive. Without this, the proxy's drive.update (8s) + drive.get (15s) wait
  // out their timeouts with nobody to ask → multi-minute "Loading" stall / bogus
  // directory-listing fallback. verify-pin is fast for exactly this reason.
  const donePeers = drive.findingPeers()
  const discovery = swarm.join(drive.discoveryKey, { server: false, client: true })
  discovery.flushed().then(donePeers, donePeers)
  // Prefetch the entrypoint so the block the proxy will request is already in
  // flight — overlaps DHT discovery with the block fetch (best-effort).
  drive.get('/index.html', { wait: true }).catch(() => {})
  browseDrives.set(keyHex, {
    drive,
    lastAccess: Date.now()
  })
  registerHiveRelayDrive(keyHex, drive)
  return drive
}

async function getDriveForProxy (keyHex) {
  // Check browse drives
  if (browseDrives.has(keyHex)) {
    const entry = browseDrives.get(keyHex)
    entry.lastAccess = Date.now()
    return entry.drive
  }
  // Check app drives
  if (appManager && appManager.activeDrives.has(keyHex)) {
    return appManager.activeDrives.get(keyHex)
  }
  // Check site drives
  if (siteManager) {
    for (const [, site] of siteManager.sites) {
      if (site.keyHex === keyHex) return site.drive
    }
  }
  // Load on demand
  return await ensureBrowseDrive(keyHex)
}

// --- App/site icon resolution (CMD_GET_APP_ICON) ---------------------------
const ICON_WELL_KNOWN = ['/icon.svg', '/icon.png', '/icon.jpg', '/icon.jpeg', '/icon.webp', '/favicon.svg', '/favicon.png', '/favicon.ico', '/logo.svg', '/logo.png']
const ICON_MIME = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', ico: 'image/x-icon', gif: 'image/gif' }
const MAX_ICON_BYTES = 512 * 1024
const ICON_TTL_MS = 10 * 60 * 1000      // cache a FOUND icon a while
const ICON_NULL_TTL_MS = 45 * 1000      // retry a MISSING icon soon (drive may still be replicating)
const _iconCache = new Map() // 'driveKey|iconRef' -> { iconData, ts }

function _iconMime (path) {
  const ext = String(path).split('.').pop().toLowerCase()
  return ICON_MIME[ext] || 'image/png'
}

// Open the drive by key and return the first available icon as a data: URI,
// trying the declared iconRef first, then well-known paths. Fail-soft to null.
async function resolveAppIcon (driveKey, iconRef) {
  if (typeof driveKey !== 'string' || !/^[0-9a-f]{64}$/i.test(driveKey)) return null
  const cacheKey = driveKey + '|' + (typeof iconRef === 'string' ? iconRef : '')
  const hit = _iconCache.get(cacheKey)
  if (hit && (Date.now() - hit.ts) < (hit.iconData ? ICON_TTL_MS : ICON_NULL_TTL_MS)) return hit.iconData
  let iconData = null
  try {
    const drive = await getDriveForProxy(driveKey)
    if (drive) {
      const candidates = []
      if (typeof iconRef === 'string' && iconRef && iconRef.length <= 512) {
        candidates.push(iconRef.startsWith('/') ? iconRef : '/' + iconRef)
      }
      for (const p of ICON_WELL_KNOWN) if (!candidates.includes(p)) candidates.push(p)
      for (const p of candidates) {
        const buf = await drive.get(p).catch(() => null)
        if (buf && buf.length && buf.length <= MAX_ICON_BYTES) {
          iconData = 'data:' + _iconMime(p) + ';base64,' + Buffer.from(buf).toString('base64')
          break
        }
      }
    }
  } catch (_) { iconData = null }
  _iconCache.set(cacheKey, { iconData, ts: Date.now() })
  return iconData
}

function driveKeyFromUrl (url) {
  if (typeof url !== 'string' || !url.trim()) return ''
  try {
    const parsed = new URL(url)
    return parsed.hostname || ''
  } catch {
    return ''
  }
}

function driveKeyFromProxyUrl (url) {
  if (typeof url !== 'string' || !url.trim()) return ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' || (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost')) return ''
    const match = parsed.pathname.match(/^\/(?:hyper|app)\/([0-9a-f]{64})(?:\/|$)/i)
    return match ? match[1].toLowerCase() : ''
  } catch {
    return ''
  }
}

function registerHiveRelayDrive (keyHex, drive) {
  if (!keyHex || !drive || !hiveRelay?.drives || typeof hiveRelay.drives.set !== 'function') return
  const existing = hiveRelay.drives.get(keyHex)
  if (!existing || existing === drive || existing.closed || existing.closing) hiveRelay.drives.set(keyHex, drive)
}

function unregisterHiveRelayDrive (keyHex, drive) {
  if (!keyHex || !hiveRelay?.drives || typeof hiveRelay.drives.get !== 'function') return
  if (!drive || hiveRelay.drives.get(keyHex) === drive) hiveRelay.drives.delete(keyHex)
}

async function updateDriveBestEffort (drive, timeoutMs = 2500) {
  if (!drive || typeof drive.update !== 'function') return
  let pending = driveInfoUpdates.get(drive)
  if (!pending) {
    pending = drive.update({ wait: true })
      .catch(() => {})
      .finally(() => driveInfoUpdates.delete(drive))
    driveInfoUpdates.set(drive, pending)
  }
  try {
    await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ])
  } catch {}
}

// Re-advance a cached browse drive to the latest published version and, if the
// version actually moved (the author re-published), invalidate the proxy's
// per-file cache for that drive so a reload serves the new release instead of
// stale bytes. Fire-and-forget so navigation stays instant; the proxy's own
// fetch path also self-heals on a miss (see hyper-proxy _fetchP2P).
function reSyncBrowseDrive (drive, keyHex) {
  if (!drive || typeof drive.update !== 'function') return
  const before = drive.version
  updateDriveBestEffort(drive)
    .then(() => {
      if (drive.version !== before && proxy && typeof proxy.invalidateCache === 'function') {
        proxy.invalidateCache(keyHex)
      }
    })
    .catch(() => {})
}

function getDrivePeerSnapshot (drive) {
  const metadataPeers = peerCollectionSize(drive?.core?.peers)
  const blobPeers = peerCollectionSize(drive?.blobs?.core?.peers)
  return {
    peerCount: Math.max(metadataPeers, blobPeers),
    metadataPeerCount: metadataPeers,
    blobPeerCount: blobPeers
  }
}

function peerCollectionSize (peers) {
  if (!peers) return 0
  if (Number.isFinite(peers.length)) return peers.length
  if (Number.isFinite(peers.size)) return peers.size
  return 0
}

function getDriveByteSnapshot (drive) {
  const metadataBytes = Number.isFinite(drive?.core?.byteLength) ? drive.core.byteLength : 0
  const blobBytes = Number.isFinite(drive?.blobs?.core?.byteLength) ? drive.blobs.core.byteLength : 0
  return {
    byteLength: metadataBytes + blobBytes,
    metadataByteLength: metadataBytes,
    blobByteLength: blobBytes
  }
}

function getRelayPinSnapshot (keyHex, drive) {
  const relays = hiveRelay?.getRelays ? hiveRelay.getRelays() : []
  let seedStatus = null
  let durableStatus = null
  const advertisedRelayPubkeys = new Set()

  try {
    seedStatus = hiveRelay?.getSeedStatus ? hiveRelay.getSeedStatus(keyHex) : null
  } catch {}

  try {
    registerHiveRelayDrive(keyHex, drive)
    durableStatus = hiveRelay?.getDurableStatus ? hiveRelay.getDurableStatus(keyHex) : null
  } catch {}

  try {
    const rows = hiveRelay?.getAvailableApps ? hiveRelay.getAvailableApps() : []
    for (const row of rows || []) {
      const rowKey = String(row?.appKey || row?.driveKey || row?.keyHex || row?.key || '').toLowerCase()
      if (rowKey !== keyHex) continue
      const relayPubkey = row?.source?.relayPubkey || row?.relayPubkey || row?.relay || null
      if (relayPubkey) advertisedRelayPubkeys.add(String(relayPubkey))
      if (Array.isArray(row?.relays)) {
        for (const relay of row.relays) advertisedRelayPubkeys.add(String(relay))
      }
    }
  } catch {}

  const seedRelays = Array.isArray(seedStatus?.relays) ? seedStatus.relays : []
  const seedRelayPubkeys = seedRelays.map((relay) => relay?.pubkey).filter(Boolean).map(String)
  const pinRelayPubkeys = Array.from(new Set([...Array.from(advertisedRelayPubkeys), ...seedRelayPubkeys]))

  return {
    available: !!hiveRelay,
    connectedRelays: relays.length,
    connectedRelayPubkeys: relays.map((r) => r.pubkey).filter(Boolean),
    seedAcceptances: seedStatus?.acceptances || 0,
    seedRelays,
    advertisedRelays: advertisedRelayPubkeys.size,
    advertisedRelayPubkeys: Array.from(advertisedRelayPubkeys),
    pinRelayPubkeys,
    durable: !!durableStatus?.durable,
    activePeers: durableStatus?.activePeers || 0,
    driveOpen: durableStatus?.driveOpen !== false,
    byteLengthLocal: durableStatus?.byteLengthLocal || 0,
    byteLengthRemoteMax: durableStatus?.byteLengthRemoteMax || 0,
    hybridFetchEnabled: relayClient?.enabled !== false,
    gatewayRelays: Array.isArray(relayClient?.relays) ? [...relayClient.relays] : []
  }
}

// Persist app/site state to disk
function persistState () {
  try {
    const state = {
      installedApps: appManager ? appManager.export() : {},
      sites: siteManager ? siteManager.export() : {},
      relayConfig: relayClient ? {
        relays: relayClient.relays,
        enabled: relayClient.enabled,
      } : undefined,
      savedAt: Date.now()
    }
    fs.writeFileSync(storagePath + '/pearbrowser-state.json', JSON.stringify(state))
  } catch (err) {
    console.warn('[persistState] write failed:', err && err.message)
  }
}

// --- Boot ---

async function boot () {
  console.log('Boot starting, storagePath:', storagePath)
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'identity-load', message: 'Loading identity...' })

  // Phase 1 ticket 3 — load or generate the user's root identity
  identity = new Identity(storagePath)
  await identity.ready()
  console.log('Identity ready')

  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'corestore-start', message: 'Initializing storage...' })

  // Derive the Corestore from the user's identity seed so rotating the
  // identity gives a clean store. The seed is 32 bytes — exactly what
  // Corestore's primaryKey expects. `unsafe: true` acknowledges that we
  // know what we're doing (corestore >= 7.x guards the primaryKey path
  // because a wrong value destroys existing hypercore data).
  // Corestore manages its own primaryKey (auto-generated + persisted
  // on first open, reused after). Decoupled from identity so identity
  // regeneration / partial writes never cause primaryKey mismatches
  // that require a destructive recovery. Identity exists independently
  // for publisher signing (HiveRelay) and BIP-39 backup.
  // Clear stale rocksdb LOCK from a previous process that didn't shut
  // down cleanly (e.g. SIGKILL, power loss, mid-boot crash). If the
  // lock is truly live, opening it below will still fail and we re-
  // throw. This avoids the common "instant crash on second run after
  // a crash" trap users hit.
  try {
    const lockPath = storagePath + '/db/LOCK'
    if (fs.existsSync(lockPath)) {
      try { fs.unlinkSync(lockPath); console.log('[boot] cleared stale db/LOCK') } catch {}
    }
  } catch {}

  store = new Corestore(storagePath)
  console.log('Corestore created, waiting for ready...')
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'corestore-ready', message: 'Storage ready' })
  await store.ready()
  console.log('Corestore ready')

  console.log('Creating Hyperswarm...')
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'hyperswarm-start', message: 'Starting P2P network...' })
  swarm = new Hyperswarm()
  console.log('Hyperswarm created')
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'hyperswarm-ready', message: 'P2P network ready' })
  swarm.on('connection', (conn) => {
    // Guard against race: incoming connection can land while a drive
    // is closing (e.g. during CMD_DELETE_SITE) and store.replicate()
    // will throw "Corestore is closed", crashing the whole Bare
    // process via the unhandled rejection path. Swallow cleanly.
    if (!store || store.closed || store.closing) {
      try { conn.destroy?.() } catch {}
      return
    }
    try {
      store.replicate(conn)
    } catch (err) {
      console.error('[swarm] replicate failed:', err && err.message)
      try { conn.destroy?.() } catch {}
      return
    }
    peerCount++
    rpc.event(C.EVT_PEER_COUNT, { peerCount })
    conn.on('close', () => {
      peerCount = Math.max(0, peerCount - 1)
      rpc.event(C.EVT_PEER_COUNT, { peerCount })
    })
    conn.on('error', () => {
      peerCount = Math.max(0, peerCount - 1)
      rpc.event(C.EVT_PEER_COUNT, { peerCount })
    })
  })

  // HiveRelay client — shares our swarm + store. Handles auto-discovery
  // of relay nodes (5 live across 2 regions), signed seed requests, and
  // circuit-relay fallbacks for NAT-blocked peers. Non-fatal if init fails.
  //
  // 0.8.5 note: client SDK split out into its own ESM package
  // (`p2p-hiverelay-client`) since 0.5.x. Old `p2p-hiverelay/client`
  // subpath no longer exists. Use dynamic import() because we're in a
  // CommonJS module and the new package is `"type": "module"`.
  try {
    const { HiveRelayClient } = await import('p2p-hiverelay-client')
    hiveRelay = new HiveRelayClient({ swarm, store })
    hiveRelay.on('relay-connected', ({ pubkey }) => {
      console.log('[hiverelay] connected:', pubkey.slice(0, 12) + '…')
    })
    await hiveRelay.start()
    console.log('[hiverelay] client started')
  } catch (err) {
    console.error('[hiverelay] init failed:', err && err.message)
    hiveRelay = null
  }

  // Initialize managers
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'managers-start', message: 'Loading app manager...' })
  catalogManager = new CatalogManager(store, swarm)
  appManager = new AppManager(store, swarm)
  siteManager = new SiteManager(store, swarm)
  pearBridge = new PearBridge(store, swarm)

  // Phase 1 ticket 2 — Hyperbee-backed user data (bookmarks, history, etc.)
  userData = new UserData(store, swarm)
  try {
    await userData.ready()
    console.log('UserData ready')
  } catch (err) {
    console.error('UserData init failed:', err && err.message)
    userData = null
  }

  // Lighthouse Phase 0 — local self-search index over the user's own browsed/
  // bookmarked content (docs/P2P-SEARCH-RESEARCH.md). Each posting is signed by
  // the per-user 'search' subkey (forward-compat with the networked phases);
  // queried fully locally. PersonalIndex is imported in the static dependency
  // block so Pear stages it for the Bare main process.
  try {
    // Sign each posting with the BOUND (rotatable) search key via the binding
    // publisher, so a trusted peer who resolves our search key can verify our
    // postings (Lighthouse Phase 2). The publisher is created just below; this
    // hook runs only when a page is indexed (post-boot), so it's set by then.
    // Fallback to the seed-derived 'search' subkey if the publisher isn't up —
    // those postings stay self-only (hop-0 isn't peer-verified) until re-indexed.
    const sign = (canonDoc) => {
      const payload = JSON.stringify(canonDoc)
      if (identityBindingPublisher) {
        try { return identityBindingPublisher.signDocSync(payload) } catch (_) { /* fall through */ }
      }
      const r = identity.signForApp('search', payload, 'lighthouse-doc-v2')
      return { sig: r.signature, pubkey: r.publicKey }
    }
    personalIndex = await new PersonalIndex(store, { sign }).ready()
    console.log('PersonalIndex ready')
  } catch (err) {
    console.error('PersonalIndex init failed:', err && err.message)
    personalIndex = null
  }

  // Identity Plan Phase B + D — profile attributes + contacts Hyperbees.
  profile = new Profile(store)
  try { await profile.ready(); console.log('Profile ready') }
  catch (err) { console.error('Profile init failed:', err && err.message); profile = null }

  contacts = new Contacts(store, {
    // Verify invite signatures against the contact's own root key. Fails
    // closed: if identity is unavailable, a signed invite is refused.
    verify: (payload, sigHex, pubHex) => {
      if (!identity) throw new Error('identity unavailable for contact verify')
      return identity.verify(payload, sigHex, pubHex)
    }
  })
  try { await contacts.ready(); console.log('Contacts ready') }
  catch (err) { console.error('Contacts init failed:', err && err.message); contacts = null }

  // NOSTR2 Phase 1 — local cross-curve binding state (npub + attested epoch),
  // persisted in the PersonalIndex meta namespace. Initialize this before the
  // Lighthouse binding publisher so boot-time advertisements include any
  // previously linked Nostr binding.
  if (personalIndex && identity) {
    try {
      const { NostrBindingStore } = require('./nostr-binding-store.cjs')
      nostrBindingStore = await new NostrBindingStore({ identity, personalIndex }).ready()
      console.log('NostrBindingStore ready')
    } catch (err) {
      console.error('NostrBindingStore init failed:', err && err.message)
      nostrBindingStore = null
    }
  }

  // Lighthouse Phase 2 — publish our self-certifying IdentityBinding (root →
  // rotatable search subkey) to the DHT + personal index, so trusted peers can
  // resolve and verify our search postings. Best-effort; never blocks boot.
  if (personalIndex && identity) {
    try {
      const { IdentityBindingPublisher } = require('./identity-binding-publisher.js')
      identityBindingPublisher = await new IdentityBindingPublisher({
        ib: require('./identity-binding.cjs'),
        identity, personalIndex, contacts, dht: swarm && swarm.dht,
        // advertise our name-registry key (if created) so contacts can resolve our names
        getNameRegKey: async () => { try { return (await requireUserData().getSettings()).nameRegKey || null } catch { return null } },
        // Nostr Phase 3: advertise our event-store key plus current nostr-bind
        // and revocations so contacts can classify linked/revoked/stale authors.
        getNostrEventKey: async () => { try { return (await requireUserData().getSettings()).nostrEventKey || null } catch { return null } },
        getNostrBind: async () => { try { const st = nostrBindingStore ? await nostrBindingStore.getState() : null; return st ? st.binding : null } catch { return null } },
        getNostrRevocations: async () => { try { return nostrBindingStore ? await nostrBindingStore.getRevocations() : [] } catch { return [] } },
      }).ready()
      identityBindingPublisher.publish().catch((e) => console.error('[binding] publish failed:', e && e.message))
      console.log('IdentityBindingPublisher ready')
    } catch (err) {
      console.error('IdentityBindingPublisher init failed:', err && err.message)
      identityBindingPublisher = null
    }
  }

  // N5 federation — resolve a typed name across TRUSTED contacts' registries.
  // Needs contacts (the trust frontier) + the binding publisher (to find each
  // contact's advertised registry key) + openContactRegistry (to replicate it).
  if (contacts && identityBindingPublisher) {
    try {
      const { FederatedNameResolver } = require('./federated-name-resolver.cjs')
      federatedNameResolver = new FederatedNameResolver({
        listContacts: () => requireContacts().list({ limit: 200 }),
        resolveBinding: (args) => identityBindingPublisher.resolve(args),
        openRegistry: (keyHex, contactRoot) => openContactRegistry(keyHex, contactRoot),
      })
      console.log('FederatedNameResolver ready')
    } catch (err) {
      console.error('FederatedNameResolver init failed:', err && err.message)
      federatedNameResolver = null
    }

    // NOSTR Phase 3 — surface TRUSTED contacts' attested events in the feed.
    try {
      const { FederatedNostrFeed } = require('./federated-nostr-feed.cjs')
      federatedNostrFeed = new FederatedNostrFeed({
        listContacts: () => requireContacts().list({ limit: 200 }),
        resolveBinding: (args) => identityBindingPublisher.resolve(args),
        openEventStore: (keyHex, contactRoot) => openContactEventStore(keyHex, contactRoot),
      })
      console.log('FederatedNostrFeed ready')
    } catch (err) {
      console.error('FederatedNostrFeed init failed:', err && err.message)
      federatedNostrFeed = null
    }
  }

  // Retry Nostr binding setup if the early pre-publisher init failed.
  if (personalIndex && identity && !nostrBindingStore) {
    try {
      const { NostrBindingStore } = require('./nostr-binding-store.cjs')
      nostrBindingStore = await new NostrBindingStore({ identity, personalIndex }).ready()
      console.log('NostrBindingStore ready')
    } catch (err) {
      console.error('NostrBindingStore init failed:', err && err.message)
      nostrBindingStore = null
    }
  }

  // Lighthouse Phase 2 — federated query planner (local-first + trusted-peer
  // fan-out). Degrades to local-only search if it can't construct, matching the
  // existing graceful-degradation pattern.
  if (personalIndex && identity) {
    try {
      const { QueryPlanner, SearchFanoutBudget } = require('./query-planner.js')
      queryPlanner = new QueryPlanner({
        personalIndex, contacts, identity, swarm, store,
        budget: new SearchFanoutBudget(), bindingPublisher: identityBindingPublisher,
      })
      console.log('QueryPlanner ready')
    } catch (err) {
      console.error('QueryPlanner init failed:', err && err.message)
      queryPlanner = null
    }
  }

  // Naming Phase N1 — local petname store (crypto-free Hyperbee). Always
  // inited; the experimentalNaming flag only gates whether the resolver/
  // mutations are reachable, not whether the store opens.
  names = new Names(store)
  try { await names.ready(); console.log('Names ready') }
  catch (err) { console.error('Names init failed:', err && err.message); names = null }

  // swarm.v1 — direct Hyperswarm access for hyper:// pages.
  // SwarmGrants persists Tier C topic-join grants across launches.
  // SwarmBridge multiplexes peer events into per-channel SSE streams.
  swarmGrants = new SwarmGrants(store, swarm)
  try { await swarmGrants.ready(); console.log('SwarmGrants ready') }
  catch (err) { console.error('SwarmGrants init failed:', err && err.message); swarmGrants = null }

  swarmBridge = new SwarmBridge(swarm, {
    identity,
    swarmGrants,
    requestConsent: (args) => openSwarmConsent(args),
  })

  // WDK wallet preview (docs/WDK_WALLET_V0.9_SPEC.md). Chrome-owned stack:
  // WdkEngineAdapter spawns the EVM worklet on demand (default Bare spawner),
  // WalletJournal records sanitized lifecycle entries on the shared
  // Corestore, WalletService orchestrates under <storagePath>/wallet/wdk-v1/,
  // and WalletConsentBroker parks prompts for chrome approval. Best-effort —
  // a wallet init failure must not block browsing; the CMD_WALLET_* handlers
  // then fail closed with not-found.
  try {
    const walletLogger = {
      info: (entry) => console.log('[wallet]', entry.operation, entry.outcomeCode, entry.lifecycleState)
    }
    wdkEngine = new WdkEngineAdapter({ logger: walletLogger })
    walletJournal = new WalletJournal({ store })
    await walletJournal.ready()
    walletService = new WalletService({
      storage: storagePath,
      engine: wdkEngine,
      journal: walletJournal,
      logger: walletLogger,
      // Phase D replaces this deny placeholder through
      // setWalletDocumentTokenVerifier(); until then page-facing calls fail
      // closed with not-authorized.
      verifyDocumentToken: (args) => walletDocumentTokenVerifier(args)
    })
    walletConsent = new WalletConsentBroker({
      walletService,
      emit: (evt, data) => rpc.event(evt, data),
      events: {
        connect: C.EVT_WALLET_CONNECT_REQUEST,
        payment: C.EVT_WALLET_PAYMENT_REQUEST,
        txUpdate: C.EVT_WALLET_TX_UPDATE
      }
    })
    console.log('Wallet service ready')
  } catch (err) {
    console.error('Wallet init failed:', err && err.message)
    wdkEngine = null
    walletJournal = null
    walletService = null
    walletConsent = null
  }

  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'managers-ready', message: 'Managers loaded' })

  // Restore persisted app/site state from disk
  const stateFile = storagePath + '/pearbrowser-state.json'
  let persistedState = {}
  try {
    const raw = fs.readFileSync(stateFile, 'utf-8')
    persistedState = safeJSONParse(raw) || {}
    if (persistedState.installedApps) appManager.import(persistedState.installedApps)
    if (persistedState.sites) await siteManager.import(persistedState.sites)
  } catch (err) {
    // No saved state yet — first run
    if (err.code !== 'ENOENT') {
      console.error('Failed to load state:', err.message)
    }
  }

  // Initialize relay client for hybrid fast-path.
  // Config is user-controllable via CMD_SET_RELAYS / CMD_SET_RELAY_ENABLED
  // and persisted in pearbrowser-state.json alongside apps and sites.
  // Phase 0 ticket 2 completed.
  const DEFAULT_RELAYS = [
    'https://relay-us.p2phiverelay.xyz',
    'https://relay-sg.p2phiverelay.xyz'
  ]
  const savedRelayConfig = persistedState.relayConfig || {}
  relayClient = new RelayClient({
    relays: Array.isArray(savedRelayConfig.relays) && savedRelayConfig.relays.length > 0
      ? savedRelayConfig.relays
      : DEFAULT_RELAYS,
    enabled: savedRelayConfig.enabled !== false,
    timeout: 5000
  })

  // iroh adoption — bootstrap the relay directory + index rooms from
  // DHT-resolvable relay records (resolve each seed's pubkey over swarm.dht,
  // signature-verified by hyperdht). Best-effort + fire-and-forget so it never
  // blocks boot; the static DEFAULT_RELAYS already give a working fallback, and
  // a seed with no pubkey simply no-ops. Completes the Phase-5 bootstrap loop:
  // a baked-in relay pubkey resolves its current gateway + index room with no
  // hardcoded address and no running sidecar.
  ;(async () => {
    try {
      if (!swarm || !swarm.dht || !Array.isArray(C.BOOTSTRAP_RELAYS) || !C.BOOTSTRAP_RELAYS.length) return
      const { indexRooms } = await relayClient.bootstrapFromDht(swarm.dht, C.BOOTSTRAP_RELAYS)
      for (const r of indexRooms) {
        if (!r || !r.indexRoom || !catalogManager) continue
        if (!ENABLE_RELAY_INDEX_ROOMS) continue
        try { await catalogManager.loadCatalogIndexRoom(r.indexRoom) } catch (e) {
          console.error('[iroh] index-room load failed:', e && e.message)
        }
      }
    } catch (err) {
      console.error('[iroh] relay bootstrap failed:', err && err.message)
    }
  })()

  // Start HTTP proxy with hybrid fetching (relay + P2P)
  proxy = new HyperProxy(getDriveForProxy, (path, err) => {
    rpc.event(C.EVT_ERROR, { type: 'proxy-error', path, message: err })
  }, relayClient, {
    perDriveOrigins: ENABLE_PER_DRIVE_ORIGINS
  })

  // swarm.v1 — page-side shim that exposes window.pear.swarm.v1 to every
  // text/html response served by the proxy. Pages get it for free; no
  // <script src> required from the page author. See docs/SWARM-V1.md.
  proxy.setPearSwarmShim(PEAR_SWARM_V1_SHIM)
  proxy.setPearSyncShim(PEAR_SYNC_SHIM)

  // Content Shield — enabled by default, persisted `contentShield: false`
  // turns it off. Phase 2 durable lists / allowlist / strict and Phase 3
  // plugin kill-switches rehydrate from user-data (offline after first save).
  contentShield = new ContentShield()
  pearPlugins = new PearPluginRegistry({ shield: contentShield })
  try {
    const shieldSettings = userData ? await userData.getSettings() : null
    if (shieldSettings && shieldSettings.contentShield === false) contentShield.setEnabled(false)
    if (shieldSettings && shieldSettings.contentShieldState) {
      contentShield.importListState(shieldSettings.contentShieldState)
    }
    // Legacy array keys (settings UI may write these directly).
    if (shieldSettings && Array.isArray(shieldSettings.contentShieldAllow)) {
      for (const key of shieldSettings.contentShieldAllow) contentShield.allowlistDrive(key)
    }
    if (shieldSettings && Array.isArray(shieldSettings.contentShieldStrict)) {
      for (const key of shieldSettings.contentShieldStrict) contentShield.setStrictDrive(key, true)
    }
    if (shieldSettings && shieldSettings.contentShieldPlugins && typeof shieldSettings.contentShieldPlugins === 'object') {
      persistShieldState._pluginPayloads = { ...shieldSettings.contentShieldPlugins }
      for (const payload of Object.values(shieldSettings.contentShieldPlugins)) {
        try { pearPlugins.register(payload) } catch {}
      }
    }

    // P2P distribution (Phase 2/3 gates). Rule text and plugin payloads were
    // already rehydrated above, so both work fully offline; these two own
    // the drive-sourced metadata and the hot-swap lifecycle.
    const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
    const refreshDistributionDrive = async (keyHex) => {
      const drive = await getDriveForProxy(keyHex)
      if (!drive) return
      const before = drive.version
      await updateDriveBestEffort(drive, 8000)
      if (drive.version !== before && proxy && typeof proxy.invalidateCache === 'function') {
        proxy.invalidateCache(keyHex)
      }
    }
    shieldListSync = new ShieldListSync({
      shield: contentShield,
      fetchDriveFile: (keyHex, path) => proxy._hybridFetch(keyHex, path),
      refreshDrive: refreshDistributionDrive,
      sha256Hex,
      persistMeta: async (meta) => {
        if (userData) await userData.setSettings({ contentShieldListSync: meta })
      }
    })
    if (shieldSettings && shieldSettings.contentShieldListSync) {
      shieldListSync.restore(shieldSettings.contentShieldListSync)
    }
    pluginDriveLoader = new PluginDriveLoader({
      registry: pearPlugins,
      fetchDriveFile: (keyHex, path) => proxy._hybridFetch(keyHex, path),
      refreshDrive: refreshDistributionDrive,
      sha256Hex,
      persistInstall: async (id, payload) => {
        if (payload === null) {
          delete persistShieldState._pluginPayloads[id]
        } else if (payload.__recordPatch) {
          const existing = persistShieldState._pluginPayloads[id]
          if (existing) existing.enabled = false // escalation guard disabled it
        } else {
          persistShieldState._pluginPayloads[id] = {
            id,
            manifest: payload.manifest,
            contribution: payload.contribution,
            enabled: payload.enabled !== false
          }
        }
        await persistPluginInstallRecords()
      }
    })
    if (shieldSettings && shieldSettings.contentShieldPluginInstalls) {
      pluginDriveLoader.restore(shieldSettings.contentShieldPluginInstalls)
    }
    pluginCatalog = new PluginCatalog({
      fetchDriveFile: (keyHex, path) => proxy._hybridFetch(keyHex, path),
      refreshDrive: refreshDistributionDrive
    })
    if (shieldSettings && shieldSettings.contentShieldPluginCatalog) {
      pluginCatalog.restore(shieldSettings.contentShieldPluginCatalog)
    }
  } catch {}
  proxy.setContentShield(contentShield)

  // Background list refresh: first sweep shortly after boot (drives need the
  // swarm), then periodic hot-swap checks. Failures never disturb browsing.
  if (shieldListSync) {
    const firstSweep = setTimeout(() => {
      shieldListSync.refreshAll()
        .then((outcomes) => {
          if (outcomes.some(o => o.ok && o.changed)) return persistShieldState()
        })
        .catch(() => {})
    }, 30 * 1000)
    if (typeof firstSweep?.unref === 'function') firstSweep.unref()
    shieldListSync.startAutoRefresh(30 * 60 * 1000)
  }

  // Session bridge + privacy ladder (Phases 4–5). Clearnet navigations route
  // through the browser-owned /clearnet/* proxy by default so Content Shield
  // sees every request. Direct mode (real https load) is a settings opt-in.
  try {
    const bootSettings = userData ? await userData.getSettings() : null
    applyPrivacyFromSettings(bootSettings || {})
  } catch {
    privacySettings = { ...DEFAULT_PRIVACY }
    if (proxy) proxy.setPrivacySettings(privacySettings)
  }
  sessionBridge = new SessionBridge({
    getShield: () => contentShield,
    getPrivacy: () => privacySettings,
    getProxyPort: () => (proxy && proxy.port) || 0
  })
  // Try attaching a native webRequest hook if pear-electron ever injects one.
  try { sessionBridge.attachNativeSession() } catch {}

  // anonGPT — page-side shim that exposes window.pear.anongpt.infer
  // ONLY for the anonGPT drive AND only when that drive's manifest.json
  // declares the required privacy claims. Gating lives in HyperProxy's
  // _shouldInjectAnongptShim(). See backend/anongpt-buyer.js +
  // anongpt/docs/spec/02-pearbrowser-dev-bridge.md.
  //
  // The buyer needs ServiceRegistry + ServiceProtocol (ESM) which the
  // root index.js loaded statically and stashed on globalThis via
  // pear-adapter.cjs. We can't import them here because backend/* is
  // CJS and Bare/Pear's import() has no referrer from this context.
  const anongptBuyer = new AnongptBuyer({
    swarm,
    identity,
    services: globalThis._pearbrowserEsmModules || null
  })
  proxy.setAnongptShim(PEAR_ANONGPT_SHIM)
  proxy.setAnongptDriveKey(C.ANONGPT_DRIVE_KEY)
  aiService = globalThis._pearbrowserEsmModules?.aiService || null

  // WDK wallet preview (spec §4/§5): the shim string, the document-token
  // verifier the wallet service uses for every page-facing call, and the
  // browser-session id that scopes wallet connections to this browser run.
  proxy.setPearWalletShim(PEAR_WALLET_V1_SHIM)
  setWalletDocumentTokenVerifier((args) => proxy.walletDocuments.verify(args))
  const walletBrowserSessionId = crypto.randomBytes(16).toString('hex')

  // Mount direct HTTP bridge (WebView → localhost → Bare, bypasses RN relay)
  const httpBridge = new HttpBridge(pearBridge, swarm, getDriveForProxy, {
    validateToken: (token) => proxy ? proxy.validateApiToken(token) : null,
    identity,
    profile,
    contacts,
    swarmBridge,
    anongptBuyer,
    anongptDriveKey: C.ANONGPT_DRIVE_KEY,
    aiService,
    // WDK wallet routes (spec §4.4): the service, the per-document token
    // registry (owned by the proxy, minted at injection time), the chrome
    // consent broker entry point and the browser-session id for tuples.
    walletService,
    walletDocuments: proxy.walletDocuments,
    requestWalletConsent: (prompt, tuple) => requestWalletConsent(prompt, tuple),
    browserSessionId: walletBrowserSessionId,
    // Login ceremony plumbing — http-bridge calls requestLogin() when a
    // page invokes pear.login(). We fire EVT_LOGIN_REQUEST up to the
    // UI, which calls CMD_LOGIN_RESOLVE after the user decides. See
    // the ceremony handler below.
    requestLogin: (args) => openLoginCeremony(args),
  })
  proxy.setHttpBridge(httpBridge)

  console.log('Starting HTTP proxy...')
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'proxy-start', message: 'Starting HTTP proxy...' })
  const port = await proxy.start()
  console.log('HTTP proxy started on port:', port)
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'proxy-ready', message: 'HTTP proxy ready on port ' + port })

  // Tab runtime: the "run in a tab" path. Serves the headless-app wrapper +
  // bridges each tab's WebSocket to a pear-request worker pipe. Best-effort —
  // a failure here just means the in-tab path is unavailable, not a boot block.
  try {
    tabRuntime = new TabRuntime()
    await tabRuntime.start()
  } catch (err) {
    console.error('[tab-runtime] failed to start:', err && err.message)
    tabRuntime = null
  }

  // Start storage monitoring. Keep the handle so shutdown() can clear it —
  // otherwise the timer keeps firing checkStorageQuota() against a closed
  // store/swarm after teardown.
  storageTimer = setInterval(() => checkStorageQuota(), STORAGE_CHECK_INTERVAL)

  // Seed + load the schema-sheets demo catalogue only when explicitly requested.
  // The release Apps path uses the curated Hyperbee/offline seed; this local
  // demo room is useful for schema-sheets development but must not be able to
  // destabilize a normal browser launch.
  if (ENABLE_DEV_CATALOGUE) {
    ensureDevCatalogue().catch((err) => console.error('[dev-catalogue]', err && err.message))
  }

  // Notify React Native
  console.log('Sending READY event')
  rpc.event(C.EVT_READY, { port })
  bootResolve()
}

// DEV catalogue seed: create + seed a schema-sheets catalogue room locally on
// boot so the Apps store is populated end-to-end from the real sheets read path.
// The same instance is both the writer and the loaded view (registered directly,
// not reopened). Swap for loadCatalogSheets(relayZ32) when the relay ships one.
async function ensureDevCatalogue () {
  const { SheetsCatalog } = require('./sheets-catalog')
  const { SEED_APPS } = require('./catalogue-seed')
  const sc = new SheetsCatalog(store, swarm)
  await sc.open(null)
  await sc.join('pearbrowser')
  await sc.update()
  // Reconcile the room to EXACTLY mirror SEED_APPS by CONTENT (not just identity)
  // so field edits — newly-added inline icons, changed links — actually take
  // effect, and stale/duplicate rows from older boots can't accrete. Earlier
  // identity-only add/prune missed content changes (icon-less rows persisted).
  // Gated on a content signature so a room that already matches is left untouched
  // (no append churn); when it differs we wipe + reseed the whole set.
  let existing = await sc.listApps()
  const sig = JSON.stringify(SEED_APPS.map((a) => [
    a.name || '', a.type || '', a.driveKey || '', a.link || '', a.iconData || '',
    a.author || '', a.description || '', a.homepage || '', a.sourceUrl || '',
    a.license || '', a.verification || '',
    (Array.isArray(a.categories) ? a.categories : []).join(',')
  ]))
  let storedSig = null
  try { const s = await requireUserData().getSettings(); storedSig = s && s.devCatalogueSig } catch {}
  if (storedSig === sig && existing.length === SEED_APPS.length) {
    console.log('[dev-catalogue] up to date (' + existing.length + ' apps)')
  } else {
    for (const row of existing) { try { await sc.deleteApp(row.id) } catch {} }
    if (existing.length) { await sc.update(); await new Promise((r) => setTimeout(r, 200)) }
    const base = Date.now()
    let added = 0
    for (let i = 0; i < SEED_APPS.length; i++) {
      const ts = base - (SEED_APPS.length - i) * 1000
      try { await sc.addApp({ ...SEED_APPS[i], publishedAt: ts }, ts); added++ } catch (e) {
        console.error('[dev-catalogue] seed', SEED_APPS[i].name, e && e.message)
      }
    }
    await sc.update()
    await new Promise((r) => setTimeout(r, 300))
    try { await requireUserData().setSettings({ devCatalogueSig: sig }) } catch {}
    console.log('[dev-catalogue] reseeded ' + added + '/' + SEED_APPS.length + ' apps (content changed)')
  }
  const link = await catalogManager.registerSheetsCatalog(sc, 'PearBrowser Apps')
  console.log('[dev-catalogue] registered ' + (await sc.listApps()).length + ' apps; sheets://' + link)
  try { await pinDriveBestEffort(sc.keyHex(), sc.discoveryKey()) } catch {}
}

async function shutdown () {
  if (storageTimer) { clearInterval(storageTimer); storageTimer = null }
  try { shieldListSync?.stop() } catch {}
  try { await askBrowserService.close() } catch {}
  // Wallet: reject every parked chrome prompt, then lock — this disposes the
  // WDK worklet and revokes connections before the shared Corestore closes.
  if (walletConsent) { try { walletConsent.rejectAll('shutdown') } catch {} walletConsent = null }
  if (walletService) { try { await walletService.lock() } catch {} walletService = null }
  wdkEngine = null
  walletJournal = null
  if (aiService) { try { await aiService.close() } catch {}; aiService = null }
  if (swarmBridge) { try { await swarmBridge.destroy() } catch {} swarmBridge = null }
  if (proxy) { try { await proxy.stop() } catch {} proxy = null }
  if (pearBridge) { try { await pearBridge.close() } catch {} pearBridge = null }
  if (siteManager) { try { await siteManager.close() } catch {} siteManager = null }
  if (appManager) { try { await appManager.close() } catch {} appManager = null }
  if (catalogManager) { try { await catalogManager.close() } catch {} catalogManager = null }
  if (personalIndex) { try { await personalIndex.close() } catch {} personalIndex = null }
  if (browserSync) { try { await browserSync.close() } catch {} browserSync = null }
  if (nameRegistry) { try { await nameRegistry.close() } catch {} nameRegistry = null }
  for (const entry of _contactRegistries.values()) { try { await entry.reg.close() } catch {} }
  _contactRegistries.clear()
  if (nostrEventStore) { try { await nostrEventStore.close() } catch {} nostrEventStore = null }
  for (const entry of _contactEventStores.values()) { try { await entry.store.close() } catch {} }
  _contactEventStores.clear()
  for (const [keyHex, entry] of browseDrives) {
    unregisterHiveRelayDrive(keyHex, entry.drive)
    try { await entry.drive.close() } catch {}
  }
  browseDrives.clear()
  if (swarm) { try { await swarm.destroy() } catch {} swarm = null }
  if (store) { try { await store.close() } catch {} store = null }
}

// Pin a drive to the HiveRelay backbone, best-effort. Never throws — a
// pin failure just means the drive stays locally P2P-seeded. Mirrors the
// seed() call in CMD_PUBLISH_SITE.
async function pinDriveBestEffort (keyHex, discoveryKey) {
  try {
    if (!keyHex || !hiveRelay || typeof hiveRelay.seed !== 'function') return
    await hiveRelay.seed(keyHex, { replicas: 3, timeout: 10000, discoveryKey: discoveryKey || undefined })
  } catch (err) {
    console.error('[pin] best-effort pin failed:', err && err.message)
  }
}

// --- Storage Management ---

async function checkStorageQuota () {
  try {
    const stats = await getStorageSize(storagePath)
    console.log(`Storage usage: ${formatBytes(stats)} / ${formatBytes(STORAGE_LIMIT)}`)

    if (shouldCleanupStorage(stats, { limit: STORAGE_LIMIT, threshold: EVICT_THRESHOLD })) {
      console.log('Storage above threshold, running cleanup...')
      await cleanupOldData()
    }
  } catch (err) {
    console.error('Storage check failed:', err.message)
  }
}

async function getStorageSize (dir) {
  const fs = require('bare-fs')
  const path = require('bare-path')

  let total = 0

  async function calcSize (currentPath) {
    const entries = await fs.promises.readdir(currentPath)
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry)
      const stat = await fs.promises.stat(fullPath)
      if (stat.isDirectory()) {
        await calcSize(fullPath)
      } else {
        total += stat.size
      }
    }
  }

  await calcSize(dir)
  return total
}

function formatBytes (bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function cleanupOldData () {
  const result = await cleanupBrowseStorage({
    browseDrives,
    proxy,
    onEvict: (key) => console.log(`Evicting old browse drive: ${key.slice(0, 8)}...`),
    unregisterDrive: unregisterHiveRelayDrive,
    leaveDiscovery: (discoveryKey) => swarm?.leave(discoveryKey)
  })

  if (result.proxyCacheCleared) {
    console.log('Cleared proxy cache')
  }

  // In future: could also prune old/unused app versions.
}

// --- Lifecycle ---

Bare.on('suspend', () => IPC.unref())
Bare.on('resume', () => IPC.ref())

// When the native host closes the IPC pipe (for example, when its window
// closes), run
// a clean shutdown so Corestore flushes, Hyperswarm closes, and
// rocksdb releases its LOCK. Without this the next launch trips on
// EADDRINUSE or a stale LOCK.
let shuttingDown = false
async function gracefulExit () {
  if (shuttingDown) return
  shuttingDown = true
  try { await shutdown() } catch (err) { console.error('[shutdown]', err && err.message) }
  try { Bare.exit?.() } catch {}
}
try { IPC.on('close', gracefulExit) } catch {}
try { IPC.on('end', gracefulExit) } catch {}
try { Bare.on?.('beforeExit', gracefulExit) } catch {}

// --- Start ---

console.log('Starting boot...')
boot().catch((err) => {
  console.error('Boot failed:', err)
  rpc.event(C.EVT_BOOT_PROGRESS, { stage: 'error', message: err.message, error: err.stack })
  rpc.event(C.EVT_ERROR, { type: 'boot-error', message: err.message, stack: err.stack })
  bootReject(err)
})
