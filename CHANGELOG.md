# Changelog

## v0.2.0 — 2026-04-28

A focused "ship hard" release that closes major UX gaps and lights up backend
features that were already plumbed but had no UI.

### New

- **Multi-tab browsing.** Real Chrome-style tab strip above the URL bar.
  Each tab keeps its own back/forward history, URL bar value, and iframe
  state. Inactive tabs stay alive (hidden via `visibility: hidden`) so
  state survives switches.
- **Keyboard shortcuts** while the Browse pane is mounted:
  `⌘T` new tab · `⌘W` close tab · `⌘L` focus URL bar · `⌘R` reload ·
  `⌘⇧I` / `⌘⌥I` open devtools · `⌘1`–`⌘9` switch tabs.
- **Devtools button** in the URL bar (and `⌘⇧I`) — opens devtools for the
  active tab's iframe via `Pear.Window.openDevTools()` when the runtime
  exposes it. Falls back to a hint if not.
- **Login consent dialog.** When a `hyper://` page calls
  `window.pear.login()` the worklet fires `EVT_LOGIN_REQUEST`; the UI now
  shows a modal with the app name + drive key + (optional) reason, with
  per-scope toggles so you can narrow what's granted. Approve / Cancel
  resolves via `CMD_LOGIN_RESOLVE`.
- **Settings → Profile editor.** Display name, bio, avatar URL, website,
  email — what apps see when you grant a sign-in. Each field is opt-in.
- **Settings → Connected Apps.** Lists every login grant the user has
  issued, with scopes + expiry. Per-row "Revoke" or bulk "Revoke all".
- **Settings → Relays.** Add / remove / mark-primary relay URLs. Toggle
  hybrid-fetch mode on/off (pure-P2P fallback).
- **Settings → Restore from phrase.** Pairs with the existing Backup
  Phrase reveal. Validates the BIP-39 mnemonic via
  `CMD_IDENTITY_VALIDATE_PHRASE` first, gates the destructive call
  behind a confirm, then fires `CMD_IDENTITY_IMPORT_PHRASE`.
- **Apps → catalog persistence.** The most recently loaded catalog
  auto-loads on next launch. Recently-used catalog keys appear as
  one-click chips under the input. Visible loading spinner while a
  catalog is fetching, friendly empty-state when nothing loads.

### Fixed

- **Clean boot — no more uncaught exception.** `pear-electron`'s
  `runtime.start()` return shape changed; the bare `pipe.on('close', ...)`
  calls threw `[uncaughtException]` every boot. Now we detect what we got
  and only attach listeners that exist.

### Internal

- New components: `LoginConsent`, `ProfileSection`, `ConnectedAppsSection`,
  `RelaysSection`, plus a rewritten `Browse` with multi-tab state.
- New CSS for modal overlay, login-consent layout, tab strip, recent-catalog
  chips, restore form, settings-pill, danger button variant.

---

## v0.1.0 — 2026-04-20

Initial public commit of the desktop fork (forked from
[bigdestiny2/PearBrowser](https://github.com/bigdestiny2/PearBrowser),
the mobile-focused project).
