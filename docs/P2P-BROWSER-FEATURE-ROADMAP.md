# P2P Browser Feature Roadmap

Research synthesis for expanding PearBrowser Desktop from a working
`hyper://` browser, app catalog, and site publisher into a stronger
P2P-native browser.

## Current Shape

PearBrowser already has the right substrate for browser-grade features:

- Desktop shell: `index.js` starts `pear-electron`, boots the Bare backend,
  and exposes a local WebSocket RPC bridge.
- Renderer: `ui/shell.js` is React + htm with Browse, Apps, Sites, Library,
  and Settings surfaces.
- Browsing: tabs are iframe-backed, with per-tab history, keyboard shortcuts,
  URL normalization, autocomplete, bookmarks, and session persistence.
- P2P content: `backend/hyper-proxy.js` maps `hyper://<key>/<path>` to a
  localhost HTTP origin backed by Hyperdrive, relay fetch, and direct P2P.
- User data: `backend/user-data.js` stores bookmarks, history, settings,
  session, and tabs in Hyperbee cores.
- Identity and grants: `backend/identity.js`, `backend/profile.js`,
  `backend/contacts.js`, and `backend/swarm-grants.js` provide per-app
  identity, profile grants, contacts, and swarm-topic permissions.
- App APIs: `backend/http-bridge.js` and `backend/pear-bridge.js` expose
  identity signing, login, Autobase sync, and `window.pear.swarm.v1`.
- Publishing: `backend/site-manager.js` creates writable Hyperdrives and
  the publish path pins via HiveRelay durability hooks.

## Stack Capabilities

| Capability | Stack pieces | Browser payoff |
|---|---|---|
| P2P sites and apps | Hyperdrive, Hypercore, Corestore | Versioned sites, app installs, offline cache, publish rollback, reproducible app links |
| Indexed browser data | Hyperbee, Corestore | Bookmarks, history, settings, permissions, profiles, local search |
| Multi-device and shared state | Autobase, Hyperbee views | Serverless sync, shared workspaces, collaborative catalogs, shared site editing |
| Peer discovery | Hyperswarm, HyperDHT | Direct app channels, live presence, peer sharing, multiplayer/collab pages |
| Secure peer protocols | Secretstream, Protomux, Protomux RPC | Multiplexed app protocols, relay control, richer browser diagnostics |
| Local file workflows | Localdrive, Hyperdrive | Import/export sites, folder publishing, downloads, local previews |
| Runtime packaging | Pear, Bare, pear-electron | P2P distribution, desktop shell, background networking and storage |

## Prioritized Feature Tracks

### P0 - Browser Reliability and Trust

1. **Drive intelligence panel**
   - Expand "About this site" with drive version, key encodings, cached bytes,
     peer count, relay availability, pin state, writable/read-only state, and
     last successful fetch.
   - Backend: add `CMD_DRIVE_INFO`, likely in `backend/constants.js`,
     `backend/index.js`, and `backend/hyper-proxy.js`.
   - UI: extend `AboutSite` in `ui/shell.js`.

2. **Permission center**
   - Unify login grants, swarm topic grants, contact access, profile fields,
     and active page tokens into one Settings view.
   - Backend already has Profile, Contacts, and SwarmGrants managers.
   - UI should make P2P-specific permissions as visible as camera/location
     permissions are in normal browsers.

3. **Session restore hardening**
   - Persist full per-tab history stack, active history index, pinned tabs,
     and closed-tab stack for reopen.
   - Current settings persistence stores only the URL-ish tab snapshot.

4. **Security baseline audit**
   - Keep raw keys and sockets backend-only.
   - Continue opaque page handles for swarm channels.
   - Review iframe sandbox, token lifetime, origin handling, permission
     prompts, and Electron/Pear embedding defaults.

### P1 - P2P-Native Browser Differentiation

5. **P2P workspaces**
   - Save named tab groups with bookmarks, notes, and optional files.
   - Phase 1: local Hyperbee workspaces.
   - Phase 2: share/export a workspace as a Hyperdrive.
   - Phase 3: live multiwriter workspace with Autobase.

6. **Opt-in encrypted sync**
   - Sync tabs, bookmarks, history, profile, settings, and contacts across
     the user's devices without a cloud account.
   - The roadmap note in `backend/user-data.js` already points toward
     Autobase for multi-device convergence.

7. **Trust center for apps and sites**
   - Show publisher identity, manifest permissions, release/update history,
     relay/pin durability, known contacts, and local block/revoke controls.
   - Makes `pear://` and `hyper://` feel inspectable rather than opaque.

8. **Local-first sharing**
   - Share a page, selected text, bookmark folder, workspace, or site draft
     directly to a contact over a P2P channel.
   - Uses contacts, per-app identity, swarm topics, and signed payloads.

### P2 - Power Features

9. **Downloads manager with seeding**
   - Download from Hyperdrive or HTTP(S), verify and resume where possible,
     then optionally seed/share as Hyperdrive content.

10. **Site asset/file manager**
    - Expose raw file upload/edit/delete for user sites.
    - `SiteManager` already has raw file writing capability.

11. **Hyperbee catalog UX**
    - Backend supports Hyperbee catalogs; Apps UI can expose them as a faster,
      queryable app-discovery mode.

12. **Developer diagnostics**
    - Inspect active drives, swarm channels, relay health, sync groups,
      Autobase writers, API tokens, and page grants.

13. **Reader/offline save**
    - Save readable page snapshots into a private or shared Hyperdrive.

14. **Command palette**
    - Fast access to browser actions and P2P actions: open drive, copy key,
      pin site, share workspace, inspect grants, clear site data.

## Quick Wins Found During Research

- `CMD_USERDATA_GET_SETTINGS` returns `{ settings }` in the backend, while
  several UI callers appear to expect settings directly. Normalize this before
  building more settings-backed features.
- Profile storage uses `displayName`, while the UI field list uses `name`.
  Align this before extending profile/contact sharing.
- Default catalog key is declared in `ui/shell.js`; verify auto-load behavior
  and wire it if it is not actually loading on first Apps visit.
- Contacts backend exists, but there is no obvious full contacts Settings UI.
- `AboutSite` already has a placeholder for live metadata, making drive
  intelligence the cleanest first feature slice.
- Root repo has no automated test script yet. Add small module tests or smoke
  scripts around RPC framing, URL normalization, user-data settings, and swarm
  grant policy before broad refactors.

## Recommended First Slice

Build **Drive Intelligence v1**.

Why this first:

- It is visible, useful, and browser-native.
- It exercises the P2P stack without changing trust boundaries.
- It builds foundation for the later trust center.
- It is scoped enough for one implementation pass.

Proposed deliverables:

1. Add `CMD_DRIVE_INFO`.
2. Track browse drive metadata in the backend: drive key, discovery key,
   current version/length where available, writable/readable state, peer
   count if available, relay/hybrid fetch mode, and last error.
3. Extend `AboutSite` with a live metadata section.
4. Add copy buttons for `hyper://`, hex key, z-base-32 key, and discovery key.
5. Add a small manual verification checklist in docs until automated tests
   exist.

## Source Anchors

- Pear docs: https://docs.pears.com/
- Hypercore: https://github.com/holepunchto/hypercore
- Hyperbee: https://github.com/holepunchto/hyperbee
- Hyperdrive: https://github.com/holepunchto/hyperdrive
- Autobase: https://github.com/holepunchto/autobase
- Hyperswarm: https://github.com/holepunchto/hyperswarm
- Corestore: https://github.com/holepunchto/corestore
- Localdrive: https://github.com/holepunchto/localdrive
- Protomux: https://github.com/holepunchto/protomux
- Chrome profiles baseline: https://support.google.com/chrome/answer/2364824
- Chrome tab baseline: https://support.google.com/chrome/answer/2391819
- Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security
