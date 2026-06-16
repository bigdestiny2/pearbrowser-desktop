/**
 * RPC commands and events — shared between React Native and worklet.
 *
 * Uses simple numeric IDs for framed-stream message routing.
 * Commands flow RN → worklet, events flow worklet → RN.
 */

// --- Commands (RN → Worklet) ---

// Browser
const CMD_NAVIGATE = 1
const CMD_GET_STATUS = 2
const CMD_GET_DRIVE_INFO = 3

// App Store
const CMD_LOAD_CATALOG = 10
const CMD_LOAD_CATALOG_BEE = 16  // Phase 1 ticket 1 — Hyperbee catalog
const CMD_INSTALL_APP = 11
const CMD_UNINSTALL_APP = 12
const CMD_LAUNCH_APP = 13
const CMD_LIST_INSTALLED = 14
const CMD_CHECK_UPDATES = 15
const CMD_GET_CATALOG_APPS = 17  // aggregated apps across all loaded catalogs
const CMD_UNLOAD_CATALOG = 18    // drop one catalog from the aggregated set
const CMD_LOAD_CATALOG_AUTOBEE = 19  // Phase 2 — Autobase collaborative catalog (feature-flagged)
// schema-sheets catalogue (the 4th source) — load a room by z32 link, query it
// with JMESPath. See docs/HIVERELAY-SCHEMA-SHEETS-DESIGN.md.
const CMD_SHEETS_LOAD = 170
const CMD_SHEETS_LIST = 171
const CMD_SHEETS_LIST_SCHEMAS = 175
const CMD_LOAD_CATALOG_INDEX = 176 // Phase 5 — load catalogue from a relay's index room (hiveindex://)

// Site Builder
const CMD_CREATE_SITE = 20
const CMD_UPDATE_SITE = 21
const CMD_PUBLISH_SITE = 22
const CMD_UNPUBLISH_SITE = 23
const CMD_LIST_SITES = 24
const CMD_DELETE_SITE = 25
const CMD_LOAD_TEMPLATE = 26
const CMD_GET_SITE_BLOCKS = 27
const CMD_LAUNCH_PEAR_LINK = 28
const CMD_RESET_APP = 29
const CMD_CLEAR_CACHE = 30
const CMD_RUN_APP_IN_TAB = 201 // run a pear-request app headless, streamed into a browser tab
const CMD_GET_IDENTITY = 31

// Relay configuration (Phase 0 ticket 2 — remove hardcoded relay)
const CMD_GET_RELAYS = 40
const CMD_SET_RELAYS = 41
const CMD_SET_RELAY_ENABLED = 42

// User data — bookmarks + history + settings in Hyperbee (Phase 1 ticket 2)
const CMD_USERDATA_LIST_BOOKMARKS = 50
const CMD_USERDATA_ADD_BOOKMARK = 51
const CMD_USERDATA_REMOVE_BOOKMARK = 52
const CMD_USERDATA_LIST_HISTORY = 53
const CMD_USERDATA_ADD_HISTORY = 54
const CMD_USERDATA_CLEAR_HISTORY = 55
const CMD_USERDATA_GET_SETTINGS = 56
const CMD_USERDATA_SET_SETTINGS = 57
const CMD_USERDATA_GET_SESSION = 58
const CMD_USERDATA_SAVE_SESSION = 59
const CMD_USERDATA_IMPORT = 60

// Identity — seed phrase export/import/rotate (Phase 1 ticket 3)
const CMD_IDENTITY_EXPORT_PHRASE = 70
const CMD_IDENTITY_IMPORT_PHRASE = 71
const CMD_IDENTITY_ROTATE = 72
const CMD_IDENTITY_VALIDATE_PHRASE = 73
const CMD_IDENTITY_SIGN = 74
const CMD_IDENTITY_VERIFY = 75  // Phase P0 — verify an ed25519 signature (renderer-callable)

// Profile + grants (Identity Plan Phase B)
const CMD_PROFILE_GET = 80
const CMD_PROFILE_UPDATE = 81
const CMD_PROFILE_CLEAR = 82

// Login consent ceremony (Identity Plan Phase C)
const CMD_LOGIN_LIST_GRANTS = 83
const CMD_LOGIN_REVOKE_GRANT = 84
const CMD_LOGIN_REVOKE_ALL = 85
/** Resolve a pending login consent — sent by the UI after user decides. */
const CMD_LOGIN_RESOLVE = 86

// Contacts (Identity Plan Phase D)
const CMD_CONTACTS_LIST = 90
const CMD_CONTACTS_LOOKUP = 91
const CMD_CONTACTS_ADD = 92
const CMD_CONTACTS_UPDATE = 93
const CMD_CONTACTS_REMOVE = 94

// swarm.v1 — direct swarm access for hyper:// pages.
// See docs/SWARM-V1.md.
//   CMD_SWARM_RESOLVE — UI replies to a Tier C consent ceremony
//   CMD_SWARM_LIST_GRANTS — list all (driveKey, topic) grants
//   CMD_SWARM_REVOKE_GRANT — drop a single (driveKey, topic) grant
//   CMD_SWARM_REVOKE_ALL_FOR_APP — drop every grant for one app
const CMD_SWARM_RESOLVE = 120
const CMD_SWARM_LIST_GRANTS = 121
const CMD_SWARM_REVOKE_GRANT = 122
const CMD_SWARM_REVOKE_ALL_FOR_APP = 123

// Catalog authoring — your own publishable catalog
const CMD_MYCATALOG_GET = 150
const CMD_MYCATALOG_CREATE = 151
const CMD_MYCATALOG_ADD_APP = 152
const CMD_MYCATALOG_REMOVE_APP = 153
const CMD_MYCATALOG_RENAME = 154
const CMD_MYCATALOG_UPDATE_APP = 155

// Collaborative (Autobee) catalog authoring — Rollout Phase 3 (feature-flagged)
const CMD_AUTOBEE_CREATE = 160
const CMD_AUTOBEE_GET = 161
const CMD_AUTOBEE_ADD_APP = 162
const CMD_AUTOBEE_REMOVE_APP = 163
const CMD_AUTOBEE_RENAME = 164
const CMD_AUTOBEE_ADD_WRITER = 165

// Multi-device browser-state sync (encrypted) — Rollout Phase 4 (feature-flagged)
const CMD_SYNC_STATUS = 180
const CMD_SYNC_CREATE = 181
const CMD_SYNC_JOIN = 182
const CMD_SYNC_ADD_WRITER = 183
const CMD_SYNC_GET_BOOKMARKS = 184
const CMD_SYNC_ADD_BOOKMARK = 185
const CMD_SYNC_REMOVE_BOOKMARK = 186
const CMD_SYNC_PUSH_LOCAL = 187

// Pear Bridge (WebView → worklet via RN relay)
const CMD_BRIDGE = 200

// System
const CMD_STOP = 99

// --- Events (Worklet → RN) ---
const EVT_READY = 100
const EVT_PEER_COUNT = 101
const EVT_ERROR = 102
const EVT_INSTALL_PROGRESS = 103
const EVT_SITE_PUBLISHED = 104
const EVT_BOOT_PROGRESS = 105
/** A WebView called window.pear.login() — show the consent sheet.
 *  Payload: { requestId, driveKey, appName, reason, scopes, currentGrant } */
const EVT_LOGIN_REQUEST = 106

/** A WebView called window.pear.swarm.v1.join() with an arbitrary
 *  (Tier C) topic and the worklet wants user consent before joining.
 *  Payload: { requestId, driveKey, appName, reason, topicHex, protocol } */
const EVT_SWARM_REQUEST = 107

// --- anonGPT bridge (Phase 0 plumbing — see backend/anongpt-buyer.js) ---

/**
 * The single Hyperdrive key allowed to receive the window.pear.anongpt
 * shim. anonGPT is published as a Hyperdrive from the anongpt repo:
 *   https://github.com/bigdestiny2/anongpt
 *
 * Privacy contract (see anongpt/docs/spec/01-privacy-by-design.md):
 * the shim is injected ONLY when the loaded drive key matches this
 * constant AND the drive's manifest.json declares the four required
 * privacy claims (storesPrompts=false, remoteHttpInference=forbidden,
 * requiresLocalRuntime=true, pear.anongpt.infer declared). Any other
 * drive sees no anonGPT API and must fail closed if it depends on one.
 *
 * The key is hardcoded for the first cut. A future iteration will read
 * it from a signed PearBrowser app-allowlist, or resolve it from the
 * featured-apps catalog with a manifest-signature check.
 */
const ANONGPT_DRIVE_KEY = 'e3cf8b6fae6260608cbfcdf6b82d985c65f5ad1b9c85e777e296e7c521213abc'

// Phase 5 — well-known bootstrap relays the client self-populates its relay
// directory from, replacing the single hardcoded gateway. Each seed is
// { gatewayUrl?, indexRoom?, pubkey? }:
//   - pubkey (relay identity, 64-hex) is the PREFERRED bootstrap: the client
//     resolves the relay's CURRENT gatewayUrl + indexRoom from the DHT
//     (RelayClient.bootstrapFromDht → resolveRelayRecord), signature-verified
//     by hyperdht. With a pubkey you don't hardcode the address at all — the
//     relay's signed DHT record carries it. (iroh adoption Phase 1.)
//   - gatewayUrl / indexRoom are the static fallback when no pubkey is given
//     or DHT resolution fails; the client can also bootstrap over HTTP
//     (RelayClient.listRelays → GET <gateway>/index/relays).
// Production: add a fleet relay's `pubkey` here once it runs the index sidecar;
// gateway + index room then resolve themselves over the DHT.
const BOOTSTRAP_RELAYS = [
  { gatewayUrl: 'http://127.0.0.1:9100', indexRoom: null, pubkey: null }
]

module.exports = {
  CMD_LOAD_CATALOG_INDEX, BOOTSTRAP_RELAYS,
  CMD_NAVIGATE, CMD_GET_STATUS, CMD_GET_DRIVE_INFO,
  CMD_LOAD_CATALOG, CMD_LOAD_CATALOG_BEE, CMD_LOAD_CATALOG_AUTOBEE, CMD_INSTALL_APP, CMD_UNINSTALL_APP,
  CMD_LAUNCH_APP, CMD_LIST_INSTALLED, CMD_CHECK_UPDATES,
  CMD_GET_CATALOG_APPS, CMD_UNLOAD_CATALOG,
  CMD_SHEETS_LOAD, CMD_SHEETS_LIST, CMD_SHEETS_LIST_SCHEMAS,
  CMD_CREATE_SITE, CMD_UPDATE_SITE, CMD_PUBLISH_SITE,
  CMD_UNPUBLISH_SITE, CMD_LIST_SITES, CMD_DELETE_SITE, CMD_LOAD_TEMPLATE, CMD_GET_SITE_BLOCKS, CMD_LAUNCH_PEAR_LINK, CMD_RESET_APP,
  CMD_CLEAR_CACHE, CMD_RUN_APP_IN_TAB, CMD_GET_IDENTITY,
  CMD_GET_RELAYS, CMD_SET_RELAYS, CMD_SET_RELAY_ENABLED,
  CMD_USERDATA_LIST_BOOKMARKS, CMD_USERDATA_ADD_BOOKMARK, CMD_USERDATA_REMOVE_BOOKMARK,
  CMD_USERDATA_LIST_HISTORY, CMD_USERDATA_ADD_HISTORY, CMD_USERDATA_CLEAR_HISTORY,
  CMD_USERDATA_GET_SETTINGS, CMD_USERDATA_SET_SETTINGS,
  CMD_USERDATA_GET_SESSION, CMD_USERDATA_SAVE_SESSION, CMD_USERDATA_IMPORT,
  CMD_IDENTITY_EXPORT_PHRASE, CMD_IDENTITY_IMPORT_PHRASE, CMD_IDENTITY_ROTATE,
  CMD_IDENTITY_VALIDATE_PHRASE, CMD_IDENTITY_SIGN, CMD_IDENTITY_VERIFY,
  CMD_PROFILE_GET, CMD_PROFILE_UPDATE, CMD_PROFILE_CLEAR,
  CMD_LOGIN_LIST_GRANTS, CMD_LOGIN_REVOKE_GRANT, CMD_LOGIN_REVOKE_ALL, CMD_LOGIN_RESOLVE,
  CMD_CONTACTS_LIST, CMD_CONTACTS_LOOKUP, CMD_CONTACTS_ADD, CMD_CONTACTS_UPDATE, CMD_CONTACTS_REMOVE,
  CMD_SWARM_RESOLVE, CMD_SWARM_LIST_GRANTS, CMD_SWARM_REVOKE_GRANT, CMD_SWARM_REVOKE_ALL_FOR_APP,
  CMD_MYCATALOG_GET, CMD_MYCATALOG_CREATE, CMD_MYCATALOG_ADD_APP, CMD_MYCATALOG_REMOVE_APP,
  CMD_MYCATALOG_RENAME, CMD_MYCATALOG_UPDATE_APP,
  CMD_AUTOBEE_CREATE, CMD_AUTOBEE_GET, CMD_AUTOBEE_ADD_APP, CMD_AUTOBEE_REMOVE_APP,
  CMD_AUTOBEE_RENAME, CMD_AUTOBEE_ADD_WRITER,
  CMD_SYNC_STATUS, CMD_SYNC_CREATE, CMD_SYNC_JOIN, CMD_SYNC_ADD_WRITER,
  CMD_SYNC_GET_BOOKMARKS, CMD_SYNC_ADD_BOOKMARK, CMD_SYNC_REMOVE_BOOKMARK, CMD_SYNC_PUSH_LOCAL,
  CMD_BRIDGE,
  CMD_STOP,
  EVT_READY, EVT_PEER_COUNT, EVT_ERROR, EVT_INSTALL_PROGRESS, EVT_SITE_PUBLISHED, EVT_BOOT_PROGRESS,
  EVT_LOGIN_REQUEST, EVT_SWARM_REQUEST,
  ANONGPT_DRIVE_KEY,
}
