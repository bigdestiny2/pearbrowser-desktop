# PearBrowser App Compatibility Standard (PBACS) v0.1

**Status:** Draft standard, v0.1. Grounded against the live PearBrowser desktop fork (`/Users/localllm/Desktop/pearbrowser-desktop/`) and mobile app (`/Users/localllm/Desktop/PearBrowser/`) as of 2026-06. Requirements that describe **behavior not present in current code** are explicitly tagged **PROPOSED** and are non-binding until implemented.

---

## 1. Purpose

PearBrowser is a peer-to-peer browser that can host Pear apps. It decides — **purely from catalogue/app metadata, never from runtime probing** — whether your app renders **inline in a browser tab** or opens in **its own OS window**. This standard tells a Pear app author exactly what to do **at release time** so their app is *maximally PearBrowser-compatible*: ideally runs inline in a tab on **both desktop and mobile**, declares itself honestly to the catalogue, degrades gracefully when capabilities are absent, respects the browser's permission/consent and layout model, and — where inline hosting is impossible — releases for the best window/launcher experience and declares that truthfully.

### TL;DR for app authors

- **Ship a static Hyperdrive with `/index.html` at the root.** It is the *only* shape that runs inline in a tab on **both** desktop and mobile. This is the universal compatibility floor (Tier A).
- **Set `type` explicitly** in your catalogue row to `standalone` or `hypersite` — never rely on inference. Desktop gates tab-vs-window entirely on this field; mobile ignores it.
- **Author to the strictest target.** Use relative URLs only, external (not inline) JS/CSS, mapped file extensions, hash-based routing, and self-impose the strict mobile CSP via a `<meta>` tag so desktop and mobile behave identically.
- **Feature-detect every capability** (`if (window.pear?.swarm?.v1)`). The bridge differs by platform, is absent on untrusted origins, and is *not* the Pear Runtime global.
- **Route all durable state** through Hypercore/Hyperbee/Hyperdrive or the token-authenticated `/api/*` bridge — **never** `localStorage`/cookies (shared across all apps on one loopback origin, ephemeral, XSS-exposed).
- **Handle consent denial and timeout** for `pear.login()` and arbitrary-topic `swarm.v1.join()` — never spin forever or loop the prompt.
- **Keep your drive seeded and online** after publishing, or the listing degrades to "Unknown App" / missing icon / a stalled install.
- **Full-GUI / Keet-class apps are window-only.** Declare them `standalone`; never mark them `hypersite` (that produces a permanently blank tab).

---

## 2. Compatibility Tiers

PearBrowser apps fall into three deployable shapes. The single number that matters is **how many of {desktop-in-tab, mobile-in-tab, own-window}** your app reaches. Pick a tier, ship the matching artifacts, and declare honestly.

| Tier | Name | Runs where | Required shape | Catalogue declaration |
|------|------|-----------|----------------|----------------------|
| **A** | **Universal (in-tab, both platforms)** | Desktop tab **and** mobile tab | Static Hyperdrive (`driveKey` + root `/index.html`). *Optionally also* a `hypersite` worker build for richer desktop UX. | `type` set explicitly; `driveKey` present; root `index.html` exists; mobile `manifest.json` with `name`+`entry:"/index.html"`. |
| **B** | **Desktop-inline (hypersite)** | Desktop tab only | pear-request/htmx headless worker (`pear.type:"terminal"`, `Pear.worker.pipe()` + `PearRequestRouter`). | `type:"hypersite"`; launch `link` is `pear://` or `file://`. Mobile: unreachable unless you *also* ship a Tier-A static drive. |
| **C** | **Window-only (standalone)** | Own OS window (desktop); **unreachable on mobile** | Full Bare/Pear GUI app (ships its own runtime, `Pear.worker.run` + FramedStream IPC, renders its own window — e.g. Keet). | `type:"standalone"` with a launch `link` and **no** `driveKey`. |

**Tier criteria & honest declaration:**

- **Tier A is the floor for any app claiming mobile support.** Mobile has no `type` handling, no `pear://` launch, and no headless-worker tab host; it serves every app as a static Hyperdrive at `/app/<key>/index.html`. If you have no static drive with a root `index.html`, you have **no mobile experience at all**.
- **Tier B (`hypersite`) runs inline on desktop only.** The desktop "Run in tab" action exists *if and only if* `type === 'hypersite'`. There is no mobile worker-IPC host, so a hypersite cannot run in a mobile tab.
- **Tier C (`standalone`) cannot be embedded anywhere.** It opens in its own window on desktop and fails on mobile. Declaring it `hypersite` to force a "Run in tab" button yields a **permanently blank tab** — the app does not speak the pear-request wire protocol the tab host streams.
- **There is no fourth launch path** and **no in-tab embedding of a foreign full-GUI app** (no working iframe/`Pear.View` host exists for foreign GUIs in current code). The only two in-tab shapes are static Hyperdrive and hypersite worker.

> **PROPOSED — Machine-readable tier self-declaration.** A future catalogue/manifest block letting an app declare its tier and transports machine-readably, e.g.:
> ```jsonc
> "pearbrowser": {
>   "tier": "A",                       // A | B | C
>   "runIn": "tab",                    // "tab" | "window"
>   "transport": "hyperdrive-static",  // "hyperdrive-static" | "pear-request"
>   "platforms": ["desktop", "mobile"],
>   "entry": "/index.html"
> }
> ```
> No code reads such a block today. Until it lands, declare your tier honestly in human-readable `name`/`description`/`categories` and set `type` correctly.

---

## 3. App Type Model & Tab-ability

**Applies to:** desktop (gating); mobile (static-only). PearBrowser decides tab-vs-window purely from metadata.

### Requirements

- **PB-TYPEMODEL-1 (MUST, both).** Classify your app at release into exactly one of the three deployable shapes (Tier A static drive / Tier B hypersite / Tier C standalone) and ship the matching artifacts. There is no fourth launch path.

- **PB-TYPEMODEL-2 (MUST, desktop).** To render **inline in a desktop tab**, build a pear-request worker and set `type` to exactly `'hypersite'`. `'hypersite'` is the **only** value that surfaces the "Run in tab" action.
  *Rationale:* the Run-in-tab affordance is gated solely on `type === 'hypersite'`; any other value yields Open/Install instead.

- **PB-TYPEMODEL-3 (MUST, desktop).** A hypersite app's UI MUST stream entirely over the worker pipe and MUST NOT require its own window/GUI surface, DOM bootstrap, or any client code beyond what the runtime injects (wrapper page + htmx + pear-request client). An app expecting a window surface loads a blank tab.

- **PB-TYPEMODEL-4 (MUST, desktop).** A hypersite app's launch link MUST be a `pear://` or `file://` link. The run-in-tab handler rejects any other scheme (including `hyper://` and `http(s)://`) with *"Only the demo, or pear:// / file:// apps, can run in a tab."* (`'demo'` is reserved for the built-in router.)

- **PB-TYPEMODEL-5 (MUST, desktop).** A full-GUI / worker-class app (Keet-style: own Pear runtime, `Pear.worker.run` + FramedStream IPC) MUST be declared `type:'standalone'` (equivalently: a launch `link` and **no** `driveKey`). It opens in its own window. **Do NOT** declare it `hypersite` — that surfaces a "Run in tab" button that loads a permanently blank tab.
  *Note:* the window-launch branch is gated on `link && !driveKey`; `type:'standalone'` is the catalogue-level declaration that produces this shape. PearBrowser does not "crash" a misdeclared app — the tab simply stays blank and the host logs a worker error.

- **PB-TYPEMODEL-6 (MUST, mobile).** To run on mobile you MUST ship a browsable static Hyperdrive: a 64-hex `driveKey` with `/index.html` at the root. Mobile has no `pear://` launch, no headless-worker tab, and reads no `type` field. Do not rely on `type:'hypersite'` or a `pear://` link for any mobile experience.

- **PB-TYPEMODEL-7 (SHOULD, both).** For maximal reach, ship **both** a static Hyperdrive (mobile + universal tab floor) **and** — where you want richer desktop-inline UX — a hypersite build, on the **same catalogue row** (`driveKey` for static, `link`+`type:'hypersite'` for the worker). The static drive guarantees the app is never unrunnable on a platform.

- **PB-TYPEMODEL-8 (MUST, both).** Your static Hyperdrive MUST contain `/index.html` at the drive root, served read-only over the loopback proxy at `/app/<driveKey>/index.html` (desktop) or `/hyper/<driveKey>/` (mobile).
  *Corrected failure mode:* a **directory** request (`/` or `<dir>/`) with no `index.html` yields an auto-generated **directory listing**, not a 404 — which breaks your page and leaks file structure. An explicit `/index.html` URL whose file is genuinely absent returns 404. On mobile, the installer polls `drive.entry('/index.html')` for up to 30s and then **resolves anyway** into a broken "File not found" app (it does not hang indefinitely or reject); a drive that already has any content (`version > 0`) skips the check and installs instantly-but-broken.

- **PB-TYPEMODEL-9 (MUST, desktop).** Set `type` **explicitly**; never rely on inference. A link-only row with no `type` auto-defaults to `'standalone'` (window-only). No inference path ever yields `'hypersite'`.

- **PB-TYPEMODEL-10 (MUST, desktop).** Your catalogue row MUST satisfy `APPS_SCHEMA`: `type` ∈ {`'standalone'`, `'hypersite'`}; `name` and `type` required; at least one of `driveKey` (`^[0-9a-f]{64}$`) or `link`. A row with an unknown/missing `type`, or with neither identifier, fails validation and **never enters the catalogue**.

- **PB-TYPEMODEL-16 (MUST→forks only, desktop).** If you fork/ship a PearBrowser build, keep `http`/`ws` to `127.0.0.1` and `localhost` whitelisted in `pear.links`. Run-in-tab and the static proxy serve over loopback `http`/`ws`; removing those origins breaks correctly-declared apps. (Note: the whitelist is `http`/`ws` only — `https` is not in it.)

- **PB-TYPEMODEL-17 (SHOULD, both).** Serve **all your own bytes** from your own Hyperdrive (static) or worker (hypersite). PearBrowser proxies static drives unchanged and runs hypersite workers as separate processes; it does not bundle/ingest foreign app code. (Exception: on the `hyper://` ad-hoc hosting path the proxy *does* inject `window.pear.*` shims — but never your dependencies or your own bytes.)

> **NOT CURRENTLY ENFORCED (aspirational / PROPOSED) — app lifecycle & launcher management.** The following describe behavior **not present** in current code (no `CMD_QUIT_PEAR_APP`, `CMD_FOCUS_PEAR_APP`, `launchedPearApps` registry, `EVT_PEAR_APP_EXITED`, launcher card, "Open in tab"/`openInTab()`, `kind:'pear'` tab, or `Pear.View` embedding spike exist). `CMD_LAUNCH_PEAR_LINK` is **fire-and-forget**: it spawns via pear-run, captures no pid, and cannot terminate or focus the app.
> - *(PROPOSED)* A standalone app should be externally terminable (exit on pipe-destroy/SIGTERM, no detached children) so a future launcher can manage it.
> - *(PROPOSED)* A standalone app should let window close/crash propagate so a future launcher card can flip to "stopped".
> - *(PROPOSED)* A `pear://` standalone could expose a launcher-card "Open in tab" handle.
> - *(PROPOSED)* Workflows must not depend on launcher-tab persistence across restart.
>
> Authors: design your app to **exit cleanly on process termination and keep all session state inside the app**, which satisfies these proposals if/when they land, but do not rely on PearBrowser managing your window today.

### Anti-patterns

- Marking a Keet-style full-GUI app `hypersite` → permanently blank tab + host worker-error log.
- Marking a headless pear-request worker `standalone` (or giving it a non-`pear://` link) → user gets "Open", a windowless process spawns, nothing visible happens.
- Shipping **only** a `pear://`/hypersite app with no `driveKey` and expecting mobile to work → mobile `handleVisit` cannot form `hyper://<driveKey>` → "Invalid drive key"; a bogus driveKey makes the proxy fetch a nonexistent drive → directory-listing/hang. (This is the documented mobile "blank tab + WorkerError" for worker-class apps.)
- Omitting `type` and assuming tab behavior → link-only rows silently become `standalone`; an invalid/extra field fails the schema and the app never appears.
- Assuming a foreign windowed GUI can be iframed/`Pear.View`-embedded inline → no such host path exists.

---

## 4. Manifest, Entry Point & Packaging

**Applies to:** both. PearBrowser **never parses your `pear` block or `package.json`** when serving you in a tab. The entry is resolved by convention; all display metadata comes from the catalogue row.

### Requirements

- **PB-MANIFEST-1 (MUST, both).** Ship a file literally named `index.html` at the drive root (`/index.html`). Both proxies rewrite a directory request to `<dir>index.html`, and the launcher hardcodes `/app/<driveKey>/index.html`. Do **not** rely on `pear.main`, `package.json#main`, a custom entry filename, or a nested entry (`/public/`, `/dist/`, `/web/`).

- **PB-MANIFEST-2 (MUST, mobile).** Guarantee `/index.html` is present **and replicable from a cold node** before publishing. Mobile install gates on `drive.entry('/index.html')` (30s timeout that resolves anyway; a drive with `version > 0` short-circuits the check). A missing/misnamed entry yields a broken "installed" app.

- **PB-MANIFEST-3 (MUST, both).** Use **relative** URLs (`href="style.css"`, `src="./app.js"`) for all assets and links. **Never** use root-absolute paths (`/style.css`). The proxy injects `<base href="http://localhost:PORT/app/<driveKey>/">`; absolute-root URLs escape your prefix and 404. *(The injected base origin is `localhost`, not `127.0.0.1`; both loopback variants are allowed.)*

- **PB-MANIFEST-4 (MUST, both).** Make every navigable route a real file in the drive, or use hash routing (`#/route`). The only rewrite is trailing-slash/empty → `index.html`; there is **no SPA catch-all**. Extensionless server-style paths (`/settings`) 404 on deep-link/refresh.

- **PB-MANIFEST-5 (MUST, both).** Declare display metadata (name, icon, version, author, categories, description) in the **catalogue row**, not in a drive manifest. No `package.json`/`pear` block is parsed in the serving path.

- **PB-MANIFEST-6 (MUST, desktop).** The catalogue row MUST satisfy `APPS_SCHEMA` (`name`+`type` required; ≥1 of `driveKey`|`link`; `driveKey` matches `^[0-9a-f]{64}$`). *(Same constraint as PB-TYPEMODEL-10 / PB-DISCOVERYCATALOGUE-1 — one rule, three IDs retained for traceability.)*

- **PB-MANIFEST-7 (MUST, desktop).** Tab-ability is decided **only** by the catalogue row's `type` enum, never by your own `pear.type`/`pear.gui`/any in-drive field. Set `type:'hypersite'` for an inline worker, or supply a `driveKey` static drive for a tab-served static site.
  *Correction:* only `type:'hypersite'` renders a literal **"Run in tab"** button (→ `CMD_RUN_APP_IN_TAB`, passing `app.link`). A `driveKey` static drive instead renders **Install → Launch** (→ `CMD_LAUNCH_APP`, opening `localUrl` in a Browse tab). **Both end up in a tab via different affordances** — do not expect a static drive to show "Run in tab."

- **PB-MANIFEST-8 (MUST, both).** Publish an installable static site with a `driveKey`, not only a `link`. A `link`-only row with no `type` infers `standalone` (window-only, no install/tab path) and is **unreachable on mobile**.

- **PB-MANIFEST-9 (SHOULD, desktop).** A hypersite app SHOULD be a `pear.type:'terminal'` Pear app depending on `pear-request` + htmx, emitting HTML fragments over its worker pipe. The tab runtime bridges only the worker pipe; it hosts no GUI window. *(Confidence: medium on the exact pear-request dependency contract — see §6.)*

- **PB-MANIFEST-10 (MUST, desktop).** A full-GUI / `pear.type:'desktop'` app MUST be declared `type:'standalone'` with a `pear://` `link`. Do not tag it `hypersite` or publish it as an installable static `driveKey` expecting a tab.

- **PB-MANIFEST-11 (MUST, mobile).** Mobile compatibility = "ships a root `/index.html` static drive," period. No window launcher, no run-in-tab, no `type` field. A `link`-only or worker-class app has no mobile launch path.

- **PB-MANIFEST-12 (SHOULD, desktop window path).** For standalone apps, set a valid `pear.name`: lowercase, one word, matching `^[@/a-z0-9-_]+$`. An invalid name throws `ERR_INVALID_APP_NAME` and the window launch fails. (Irrelevant to static-drive tab serving.)

- **PB-MANIFEST-13 (MAY, both).** Provide `iconRef` (path into your drive, ≤300 chars) and `version` (string) for display. See **PB-DISCOVERYCATALOGUE-9** for the important caveat that a sheets-row drive-hosted icon **does not currently render on desktop**.

- **PB-MANIFEST-14 (split by platform — host CSP differs).** Every drive shares one loopback origin `http://127.0.0.1:PORT`; there is **no per-app origin isolation** (cookies/storage shared) on **both** platforms.
  - **Mobile (enforced):** the proxy sets a strict CSP on **every** HTML response: `default-src 'self'; script-src 'self'; connect-src 'self' http://127.0.0.1:PORT http://localhost:PORT; object-src 'none'; base-uri 'self'`. Design within it: no inline/remote scripts, styles, fonts, or images; no `eval`; connect only to the loopback proxy.
  - **Desktop (NOT enforced):** the proxy sets **no** CSP header. It only rewrites a CSP **you** ship in a `<meta http-equiv>` tag (to authorize its injected shim hashes) and is a no-op when you ship none. A desktop static app runs under whatever CSP it ships, or none.
  - **NORMATIVE RULE (this standard):** **self-impose the mobile CSP** via `<meta http-equiv="Content-Security-Policy">` so behavior is identical on both platforms (see §8, PB-STATICHYPERDRIVE-9/10).
  - *Note:* the hypersite tab-runtime path renders into an **isolated iframe** — a separate serving path from the shared-origin static proxy.

- **PB-MANIFEST-15 (MAY → advisory provenance, both).** You MAY include `manifestHash` (`^[0-9a-f]{64}$`) and `verification` (`unverified`|`relay-listed`|`author-signed`). No code verifies drive contents against `manifestHash` today; treat both as advisory and declare honestly (see PB-DISCOVERYCATALOGUE-10). **PROPOSED:** the canonicalization used to compute `manifestHash` is undefined (which bytes, what ordering) — do not assume any future verifier will accept a value you compute now.

### Anti-patterns

- Pointing the entry at `pear.main`/`#main` or nesting under `/public/`, `/dist/`, `/web/`.
- Publishing a Keet-style app as an installable `driveKey` or `hypersite`.
- Assuming any in-drive manifest field makes the app tab-able (only the row's `type` does).
- Root-absolute asset URLs that escape the injected `<base>`.
- Server-style SPA routing with clean URLs (deep-link/refresh 404s).
- Authoring display metadata only inside the drive's `package.json`/`pear` block.

---

## 5. Static Hyperdrive App Contract

**Applies to:** both. Requirements are written against the **strictest (mobile)** behavior as the lowest common denominator.

### Requirements

- **PB-STATICHYPERDRIVE-1 (MUST, both).** Root entry is exactly `/index.html`. Installed apps launch at the hardcoded `/app/<key>/index.html`; no manifest `entry` is read.
- **PB-STATICHYPERDRIVE-2 (MUST, both).** `/index.html` must be published and replicable; install readiness polls that exact path (30s timeout that resolves regardless; `version > 0` short-circuits). Verify from a cold second node before publishing.
- **PB-STATICHYPERDRIVE-3 (MUST, both).** Provide `index.html` in every directory reachable via a **trailing-slash** link. A trailing-slash directory request with no `index.html` returns an auto-generated directory **listing** (a non-slash directory path `/foo` instead 404s). Both outcomes break your app.
- **PB-STATICHYPERDRIVE-4 (MUST, both).** Relative or same-prefix URLs only; never root-absolute (escapes the injected `<base>` → 404).
- **PB-STATICHYPERDRIVE-5 (MUST, both).** Author a literal lowercase `<head>` (or at minimum `<html>`). Injection is `html.includes('<head>') ? replace('<head>',…) : replace(/<html>/i,…)`. A head-less fragment, an uppercase `<HEAD>`, **or `<html lang="en">` with attributes** (the fallback matches only the literal token `<html>`, not `<html lang=…>`) gets **no** injection — breaking relative assets and leaving `window.pear` undefined. *(This `<html attr>` trap is a known footgun — ship a bare `<head>`.)*
- **PB-STATICHYPERDRIVE-6 (MUST, both).** Do not ship your own `<base>` tag; the proxy injects one as the first child of `<head>`.
- **PB-STATICHYPERDRIVE-7 (MUST, both).** Use only mapped extensions: `html htm css js mjs json png jpg jpeg gif svg ico webp woff woff2 ttf mp4 webm mp3 pdf txt md`. Anything else → `application/octet-stream` (browser refuses to run/render).
- **PB-STATICHYPERDRIVE-8 (MUST, both).** Do not ship `.wasm`, `.map`, `.avif`, `.eot`, `.otf`, `.xml`, `.wav`, `.ogg`, `.csv` — all absent from the MIME map. WASM cannot instantiate; OTF/EOT fonts won't load. Use `woff2`, `mp3`/`mp4`, or vendor inline.
- **PB-STATICHYPERDRIVE-9 (MUST, both — via self-imposed CSP).** Author to satisfy the strict mobile CSP (no inline `<script>`, no `on*=` handlers, no inline `style=`/`<style>`, no `eval`, no remote scripts/fonts/images/stylesheets, no remote fetch/XHR/WebSocket). All JS/CSS external; all assets vendored. *(Mobile enforces this; on desktop you must self-impose it — see PB-STATICHYPERDRIVE-10.)*
- **PB-STATICHYPERDRIVE-10 (SHOULD→NORMATIVE, both).** A passing desktop test does **not** prove mobile compatibility: desktop sets no CSP header. **Self-impose** the mobile CSP via `<meta http-equiv="Content-Security-Policy">` matching PB-STATICHYPERDRIVE-9 so the platforms converge.
- **PB-STATICHYPERDRIVE-11 (MUST, both).** No backend, SSR, redirects, custom statuses, or non-GET semantics for your files. The proxy is pure file-GET; the only dynamic endpoint is the browser's own `/api/*`.
- **PB-STATICHYPERDRIVE-12 (MUST, both).** SPA routing must be **hash-based** (`#/route`). No `pushState` clean URLs — there is no catch-all-to-index; reload/deep-link 404s.
- **PB-STATICHYPERDRIVE-13 (MUST, mobile).** Keep primary navigation within the proxy origin (relative/hash/same-prefix). **Correction:** in-tab loading is **not** strictly loopback-only — the mobile navigation guard *also* permits **trusted-relay HTTPS app URLs** (`https://p2phiverelay.xyz` / `https://*.p2phiverelay.xyz` whose path contains `/v1/hyper/`). Any *other* `http(s)://` link is ejected to the system browser (`Linking.openURL`), removing the user from your tab. `hyper://` links are intercepted and re-navigated in-browser (acceptable for cross-app links).
- **PB-STATICHYPERDRIVE-14 (MUST, both).** Treat cookies/`localStorage`/IndexedDB as **shared across all apps** on the single loopback origin — never private, never a real web origin, never the anchor for login/session/auth state. Namespace any non-sensitive keys by your drive key.
- **PB-STATICHYPERDRIVE-15 (MUST, both).** Cross-drive links use the canonical **64-char lowercase hex** key (not 52-char z-base-32). `..` or NUL in a path → 400. **Correction:** the key validator uses `/^[0-9a-f]{64}$/i` (case-**insensitive**) — uppercase hex technically passes — but the browser emits lowercase and z32 keys fail the 64-hex regex (→ 400), so always emit lowercase hex.
- **PB-STATICHYPERDRIVE-16 (SHOULD, both).** Keep first-paint assets small and few. Each asset is a separate lazy P2P fetch with a ~15s timeout (desktop adds an ~8s `drive.update` wait for directory/index resolution). Dozens of serial fetches feel like a hang on cold P2P.
- **PB-STATICHYPERDRIVE-17 (MAY, mobile streaming; range on both).** Range/`206` seek is supported on **both** platforms. **Correction:** direct drive-streaming with backpressure for files >5MB or any ranged request exists **on mobile only** (`STREAM_THRESHOLD = 5MB`); desktop buffers the whole file then slices. On both, files >5MB are **not cached** and are re-fetched every load — keep frequently-loaded assets <5MB.
- **PB-STATICHYPERDRIVE-18 (SHOULD, both).** Treat the injected `window.pear.swarm.v1` shim, the `pear-api-token` meta, and `/api/*` as **progressive enhancement**. Feature-detect `window.pear` and provide a working static fallback; these exist only via the proxy and are token-gated.
- **PB-STATICHYPERDRIVE-19 (MUST, desktop).** The desktop tab is a sandboxed iframe with only `allow-scripts allow-forms allow-same-origin allow-popups allow-pointer-lock`. `window.alert/confirm/prompt`, programmatic downloads, top-frame navigation, and orientation-lock are **not** granted and silently no-op. Use in-page custom UI instead.
- **PB-STATICHYPERDRIVE-20 (MUST, both).** Declare honestly as a static/tab-able Hyperdrive app with `entry:"/index.html"` (any other `entry` value is silently ignored — the launcher hardcodes `/index.html`). A full-GUI/worker-class app MUST NOT be declared tab-able. **Note (PROPOSED):** there is no manifest `type`/`class`/`tab-able` field today; the "honest declaration" is a *convention* this standard introduces, not enforced behavior (see §2 PROPOSED block and the Field-Mapping table in §11).

### Anti-patterns

Shipping a full-GUI app as static/tab-able; non-`/index.html` entry; `pushState` clean URLs; root-absolute asset paths; inline scripts/handlers/styles/`eval` (silently dead on mobile); external CDN/remote assets; unmapped file types (WASM/AVIF/OTF/`.map`); treating storage as per-app/private; assuming a backend; native dialogs/downloads/top-nav; head-less fragment / `<HEAD>` / own `<base>`; heavy many-file first paint over cold P2P.

---

## 6. The Tab-able Worker / pear-request Contract (Tier B)

**Applies to:** desktop (fully live). **Mobile:** no worker-spawn path — a pear-request worker does **not** run in a mobile tab today.

### Requirements

- **PB-WORKERCONTRACT-1 (MUST, both — *eligibility, not enforcement*).** Release as a Pear terminal/worker app: `package.json` declares `pear.type:"terminal"`, no window, no own HTTP server. **Correction:** PearBrowser does **not** read/enforce your `pear.type` to route GUI-vs-tab. `CMD_RUN_APP_IN_TAB` only regex-validates the link scheme; tab-vs-window is a consequence of the **curated catalogue `type:'hypersite'` flag** + pear-run + whether the spawned worker actually speaks pear-request. A non-terminal app pasted into the same path is still spawned via pear-run, not auto-redirected to a window. So: ship a terminal worker because that's what makes `Pear.worker.pipe()` work — not because the runtime detects and reroutes the wrong type.

- **PB-WORKERCONTRACT-2 (MUST).** Obtain the host transport via `const pipe = Pear.worker.pipe()` and treat that single duplex as your only I/O. No sockets, fetch, or HTTP listener.

- **PB-WORKERCONTRACT-3 (MUST).** Construct `new PearRequestRouter(pipe)`, register routes, and wire `pipe.on('data', d => router.processMessage(d))`. Omitting this means `GET /` never replies and the tab hangs on *"connecting to headless worker…"*.

- **PB-WORKERCONTRACT-4 (MUST).** `GET /` returns the whole HTML page (into `<body>`); every other route returns a small HTML **fragment** (not JSON, not a full document) for an htmx swap. Each handler gets `(req, res)` where `req = {method,url,body,id,params}` and MUST set `res.body`. **Underspecified:** `req.body` shape, content-type negotiation, and max worker-frame body size for `POST/PUT/DELETE` are not formally defined; keep request bodies small and self-describing.

- **PB-WORKERCONTRACT-5 (MUST, desktop).** All navigation MUST be same-origin XHR via htmx attributes (`hx-get/hx-post/hx-put/hx-delete`). Only `globalThis.XMLHttpRequest` is hooked — `fetch()`, raw WebSocket, full-page anchor/form navigation, `form method=get`, and absolute `http(s)` URLs bypass the pipe, hit the wrapper origin, and 404.

- **PB-WORKERCONTRACT-6 (MUST, desktop).** The UI MUST bootstrap entirely from the `GET /` fragment via htmx attributes. The host injects **only** htmx + the pear-request client; no inline module script, bundler runtime, or CDN will load.

- **PB-WORKERCONTRACT-7 (MUST, desktop).** Return exactly **one** complete fragment per request id, as a single response. Do not stream/split one logical response across multiple `sendResponse` calls or chunks — the desktop client decodes one length-framed response per data event, then hard-resets its buffer, silently discarding trailing bytes.

- **PB-WORKERCONTRACT-8 (MUST, desktop).** Do **not** use HTTP status for client control flow. The desktop client drops the wire status and hardcodes `200/'OK'`, so htmx never sees 4xx/5xx. Signal errors **in-band** (an error fragment with a recognizable marker).

- **PB-WORKERCONTRACT-9 (MUST, both).** Treat each tab as its own isolated worker process with fresh memory (one worker per socket). Shared/persistent state MUST live in Hypercore/Hyperbee/Hyperdrive, not process-local variables.

- **PB-WORKERCONTRACT-10 (MUST, both).** Only host over a boundary-preserving transport (the PearBrowser WS bridge qualifies). Request frames are **not** length-prefixed (one request == one message); an intermediary that coalesces requests corrupts decoding.

- **PB-WORKERCONTRACT-11 (SHOULD, desktop).** Attach `pipe.on('error', …)` and tolerate `end`/`crash`. The host logs but does **not** restart the worker; an unhandled pipe error blanks the tab with no recovery.

- **PB-WORKERCONTRACT-13 (MUST, mobile).** Do **not** assume a pear-request worker runs in a mobile tab. There is no `Pear.worker` spawn, no WS bridge, and the pear-request client is never loaded on mobile. For mobile, ship a static-file Hyperdrive (Tier A) or declare the app **desktop-tab-only** honestly.

- **PB-WORKERCONTRACT-15 (MAY, both).** The router gives you url-pattern matching, case-insensitive method match, 404 "Not Found", and 500 "Internal Server Error" (text/plain) for free — but per PB-WORKERCONTRACT-8 the desktop client does not surface those statuses to htmx.

> **PB-WORKERCONTRACT-12 (PROPOSED — aspirational author pattern, not current behavior).** Factoring all handling into a single transport-agnostic route table reused by both a desktop `PearRequestRouter` and the mobile in-process `serveRoutes()` is **not realized** in current code, and the two APIs are **shape-incompatible** (desktop `router.get(path,(req,res)=>{res.body=…})` mutate-res vs mobile `serveRoutes` `'METHOD path'` keys returning a `{headers,body}` res). To target both today you must write an **adapter** per transport. Aim for the intersection of behaviors: never depend on desktop-only assumptions (status always 200) nor mobile-only capabilities (real status, streaming, progress events).

> **PB-WORKERCONTRACT-14 (SHOULD, both).** Until a machine-readable self-declaration field exists (PROPOSED, §2), declare your app's class honestly in human-readable `name`/`description`/`categories`. Tab eligibility is currently inferred from a curated `type` flag + a link-scheme regex + whether the spawned worker actually speaks pear-request — never auto-detected from your package.

### Canonical worker shape (Tier B / hypersite)

`package.json`:
```jsonc
{
  "name": "my-hypersite",
  "main": "worker.mjs",
  "pear": { "type": "terminal" }
}
```

`worker.mjs`:
```js
import { PearRequestRouter } from 'pear-request'

const pipe = Pear.worker.pipe()
const router = new PearRequestRouter(pipe)

router.get('/', (req, res) => {
  res.body = `<!doctype html><html><head>
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'">
  </head><body>
    <h1>Count: <span id="n">0</span></h1>
    <button hx-post="/inc" hx-target="#n" hx-swap="innerHTML">+1</button>
  </body></html>`
})

let n = 0 // per-tab process state — NOT shared across tabs; persist to Hyperbee for durability
router.post('/inc', (req, res) => { res.body = String(++n) })

router.get('/whoami', (req, res) => { res.body = `<span>request ${req.id}</span>` })

pipe.on('data', d => router.processMessage(d))
pipe.on('error', () => {}) // tolerate; host does not restart
```

### Anti-patterns

Full-GUI app expecting tab embedding; HTTP status for control flow; multi-frame/streamed single response; `fetch()`/raw WS/absolute-URL/full-page nav instead of htmx XHR; bootstrapping from inline/bundler/CDN scripts; assuming a mobile tab worker; process-memory state across tabs/reopen; forgetting the `processMessage` wiring; inserting a coalescing transport.

---

## 7. Injected `window.pear` Bridge, Capabilities & Consent

**Applies to:** both, with a **large platform asymmetry**. PearBrowser does **not** expose the Pear Runtime global. Mobile injects a full `window.pear` object; **desktop injects only `window.pear.swarm.v1`** (plus a drive-gated `window.pear.anongpt.infer`). For everything else on desktop, call `/api/*` directly.

### Requirements

- **PB-BRIDGECAPABILITIES-1 (MUST, both).** Feature-detect every capability with optional chaining: `if (window.pear?.swarm?.v1) {…}`, `if (window.pear?.login) {…}`. Treat the entire bridge as possibly absent.

- **PB-BRIDGECAPABILITIES-2 (MUST, desktop).** Do **not** depend on the rich object on desktop. Desktop client-side injects only `window.pear.swarm.v1` (+ gated `anongpt.infer`). For sync/identity/login/contacts on desktop, call the `/api/*` REST routes via `fetch()`. Write a `/api/*` fallback for any capability beyond swarm.

- **PB-BRIDGECAPABILITIES-3 (MUST, both).** Read the per-page token from `<meta name="pear-api-token">` and send it as the `X-Pear-Token` header on every `/api/*` call. For the SSE endpoint `/api/swarm/events` only (which cannot set headers), pass `?token=`. Re-read the meta token on every load.

- **PB-BRIDGECAPABILITIES-4 (MUST, both — rationale corrected).** Do **not** persist/cache/hardcode/share the token; acquire it fresh from the meta tag each load. **Correction:** tokens are not only dropped on worklet restart — they carry a **hard 10-minute TTL** and a fresh token is re-minted on **every** HTML response. A reused token 401s after 10 min with no restart. Issue all `/api/*` calls same-origin so the request `Origin` is the loopback proxy origin; a cross-origin `Origin` is rejected 403 *"Invalid origin"* (the check only fires when an `Origin` header is present).

- **PB-BRIDGECAPABILITIES-5 (MUST, mobile).** Serve your app through the loopback proxy/Hyperdrive (or an explicitly trusted relay-app URL) to receive any bridge. Other origins get the no-op `'true;'` and no `window.pear`. Do not expect capabilities on a page loaded from an external HTTPS/non-proxy origin.

- **PB-BRIDGECAPABILITIES-6 (MUST, both).** Do **not** target the real Pear Runtime global. The injected surface is exactly `{sync, identity, bridge, swarm, login, contacts, navigate, share}` (mobile) / `{swarm.v1, anongpt.infer}` (desktop). `Pear.config/updates/teardown/versions/worker/messages` do **not** exist. An app needing the runtime global is window-class and cannot run in a tab.

- **PB-BRIDGECAPABILITIES-7 (MUST, both — `pay` corrected).** Call `await window.pear.login({ scopes, appName, reason })` (or POST `/api/login` on desktop) requesting the **minimal** scopes from: `profile:read`, `profile:name`, `profile:contact`, `profile:avatar`, `profile:email`, `profile:website`, `contacts:read`. Pass human-readable `appName`/`reason`. Empty/omitted `scopes` = sign-in-only (you get your stable per-app pubkey; `profile` stays null). **Correction:** `pay` is **not** an enforced scope — it exists only as a type-level token with no backend enforcement or consent label. Do not request it expecting any capability. *(PROPOSED if/when payments land.)*

- **PB-BRIDGECAPABILITIES-8 (MUST, both).** Treat the returned `attestation.scopes` and `profile` as authoritative — never assume you got everything requested. Desktop consent presents per-scope checkboxes the user can uncheck; mobile is all-or-nothing for the requested set. `profile` is null if no `profile:*` scope was granted. Branch your feature set on `attestation.scopes`.

- **PB-BRIDGECAPABILITIES-9 (MUST, both).** Handle denial (403 *"User declined"*) and timeout (2-minute, *"Login request timed out"*). Catch the rejection, show a fallback, retry only on explicit user action. Do not spin forever or loop the prompt (the host serializes one pending consent at a time).

- **PB-BRIDGECAPABILITIES-10 (MUST, both).** Before `contacts.list()`/`lookup()` (or GET `/api/contacts`), hold a grant including `contacts:read`, else 403 *"contacts:read scope required — call pear.login first"*. Contact pubkeys are the **other** user's stable root pubkey.

- **PB-BRIDGECAPABILITIES-11 (SHOULD, both — TTL corrected).** Check `await window.pear.login.status()` (or GET `/api/login/status`) on load to read `{loggedIn, scopes, expiresAt, profile}` without prompting, and be ready to re-prompt after expiry/revocation. **Correction:** the grant TTL default is **30 days** (uniform on both platforms), **not 7 days** — re-derive any re-prompt timing from 30 days. Grants are per-app (keyed by `driveKey`) and user-revocable. *(Note: the login ceremony passes a 30-day `expiresAt`; treat loss of access as expected/recoverable.)*

- **PB-BRIDGECAPABILITIES-12 (MUST, both).** Do not treat `identity.getPublicKey()` as a cross-app/global user id. It is a per-app ed25519 sub-key = `SHA-256(rootSeed || 'pear-app-v1:' || driveKey)` — stable per user+app, different in every other app. You cannot correlate a human across apps; the root key never leaves the worklet.

- **PB-BRIDGECAPABILITIES-13 (MUST, both).** `identity.sign(payload, namespace)` requires non-empty payload ≤64KB and a stable per-use-case `namespace`. Signatures are domain-separated as `pear.app.<driveKey>:<namespace>:<payload>`; they don't verify outside your app's drive/namespace.

- **PB-BRIDGECAPABILITIES-14 (SHOULD, both).** Prefer **Tier A** swarm joins: `swarm.v1.join(null, { subtopic: 'rooms/lobby', appName, reason })` — derived from your drive key, **no consent prompt**. Reserve arbitrary 64-hex topics (Tier C, consent modal) for genuine cross-app rendezvous. *(Note: passing your own Tier-A topic as a raw 64-hex `topicHex` is NOT recognized as Tier A and triggers consent — use the `subtopic` form.)*

- **PB-BRIDGECAPABILITIES-15 (MUST, both).** Design every `swarm.v1.join()` to **reject**: Tier C rejects `Error('consent-denied')` on denial and `Error('consent-pending')` when another consent is in flight (only one at a time). Don't block the UI or fire concurrent Tier C joins; surface a retry affordance.

- **PB-BRIDGECAPABILITIES-16 (MUST, both).** Respect limits and never trust unauthenticated peer identity: max **8** channels/app, **10** joins/min/app, **64** peers/channel (newest-wins eviction), **~1MB/s** outbound/peer, **1** pending consent. Exceeding rejects `join()` (*"rate-limited: …"*) or emits a channel `'error'`. `peer.pubkey` is **null** until your own handshake — do **not** authenticate/authorize on bridge-supplied identity.

- **PB-BRIDGECAPABILITIES-17 (MUST, both).** Treat wire data as binary `Uint8Array` (the bridge base64s across the boundary). Wire up the full lifecycle — `peer`, `message`, `peer-leave`, `error`, `closed` — and tolerate teardown anytime. **No v1 reconnection:** detach/reattach yields a fresh `channelId`; re-establish state yourself.

- **PB-BRIDGECAPABILITIES-18 (MUST, both).** Sync `appId` matches `^[a-zA-Z0-9_-]{1,64}$`; do not rely on global uniqueness (server-namespaced to `<driveKey>:<appId>`; cross-drive reads are impossible). Don't use reserved `__proto__`/`constructor`/`prototype`.

- **PB-BRIDGECAPABILITIES-20 (MUST, both).** Treat consent/onboarding as PearBrowser's **own** app-shell modals (DOM `.modal-overlay` on desktop, RN `<Modal transparent>` on mobile), not OS dialogs. Never occlude, auto-dismiss, or programmatically answer them. On mobile, do **not** enter native-fullscreen video or push a high-z native overlay while a `pear.*` consent promise is pending — it paints over the modal and the user never sees Allow/Deny (silent 2-minute timeout).

- **PB-BRIDGECAPABILITIES-22 (SHOULD, desktop).** If you ship a CSP, ensure a `<head>` (or `<html>` token) exists so the desktop proxy can inject the swarm shim + meta token, and don't hash-pin `script-src` so tightly that an extra same-origin script breaks. The proxy authorizes only its own shim hashes (never `'unsafe-inline'`); still feature-detect.

- **PB-BRIDGECAPABILITIES-19 (SHOULD, mobile).** `window.pear.navigate(url)` / `share(url)` exist only on mobile and only with a host postMessage hook (`window.ReactNativeWebView` / `window.PearBrowserNative`); they no-op silently otherwise (including on desktop). Provide an in-page fallback (normal link / copy-URL).

- **PB-BRIDGECAPABILITIES-21 (SHOULD, mobile).** Do not reuse the reserved sync `appId` `pear-pos` or depend on `window.posAPI` (a mobile-only POS wrapper that auto-inits a sync group from `?inviteKey=`/localStorage). Generic apps pick their own `appId` and use `window.pear.sync` directly.

- **PB-BRIDGECAPABILITIES-23 (MAY, both).** You MAY use `window.pear.bridge.status()` (mobile) but MUST NOT treat it as a portable capability-negotiation entry point — it is part of the mobile-only object (throws on desktop) and returns only `{ready, port}`. Branch on per-namespace feature-detection (PB-1), not a single status probe.

### Anti-patterns

Targeting the Pear Runtime global; top-of-script `await window.pear.X` with no guard; mobile-only authoring (desktop `window.pear.sync`/`login` throw); token caching/cross-origin replay; scope optimism (reading `profile.email` without checking `scopes`); awaiting consent as guaranteed; cold `contacts.list()`; identity as a global id; trusting `peer.pubkey`; arbitrary-topic-by-default + concurrent Tier C joins; occluding the consent modal; reusing `pear-pos`; shipping a head-less/own-`<base>` page that the proxy can't inject into.

---

## 8. Security, Storage, Single-Instance & Responsive UI

**Applies to:** both.

### Requirements

- **PB-SECURITYSTORAGEUI-1 (MUST, both).** Relative URLs everywhere; never hardcode origin/scheme/port/host/driveKey. The loopback port is ephemeral (`listen(0)`); rely on the injected `<base href>`.
- **PB-SECURITYSTORAGEUI-2 (MUST, both).** Read the token from `<meta name="pear-api-token">` at call time; send `X-Pear-Token` on every privileged `/api/*` call. Do not persist/log/reuse it or send it off-loopback. *(Note: the runtime's own SSE shim passes the token via `?token=` for EventSource — loopback-only and origin-scoped — so the "never in a URL" rule is about **your** code, not the sanctioned SSE path.)*
- **PB-SECURITYSTORAGEUI-3 (MUST, both).** Feature-detect every privileged surface; treat empty/missing token, missing `window.pear.*`, and 401/403 as "runtime unavailable" → render a read-only/offline fallback, never hang.
- **PB-SECURITYSTORAGEUI-4 (MUST, both).** No ambient privilege: `login()` and arbitrary-topic `swarm.v1.join()` surface a deniable consent modal. Always handle denial/cancel and keep functioning. (Tier A/B swarm joins resolve without UI.)
- **PB-SECURITYSTORAGEUI-5 (MUST, both).** Request minimum login scopes and function on a partial/empty grant (the user can deselect scopes before approving).
- **PB-SECURITYSTORAGEUI-6 (MUST, both).** Escape/sandbox all peer/drive/remote content before DOM insertion; never concatenate untrusted HTML. On the shared origin, one XSS steals the live token and reaches other apps.
- **PB-SECURITYSTORAGEUI-7 (SHOULD→NORMATIVE, both).** Ship a strict same-origin CSP via `<meta http-equiv>` — at minimum `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'` — and keep your scripts external. Mobile enforces a strict server CSP (no `'unsafe-inline'`); desktop sets none, so self-imposing converges both.
- **PB-SECURITYSTORAGEUI-8 (MUST, both).** If you set a CSP, allow `'self'` in `connect-src`/`default-src` (for `/api/*` fetch + EventSource) and `'self'` in `script-src`. Don't block the same-origin calls the bridge needs.
- **PB-SECURITYSTORAGEUI-9 (MUST, both).** Route all durable state through the bridge `/api/*`/persistence surfaces, not `localStorage`/`sessionStorage`/IndexedDB/cookies (ephemeral, shared across apps on the loopback origin).
- **PB-SECURITYSTORAGEUI-10 (SHOULD, both).** If you use browser storage for non-durable UI state, namespace every key with your drive key and escape stored values.
- **PB-SECURITYSTORAGEUI-11 (MUST, both).** Reflow at fluid bounds; no fixed window size, no native chrome (titlebar/traffic-lights/OS frame). Use responsive layout (`width:100%`, `max-width`+`margin:0 auto`, media queries, wrapping flex/grid).
- **PB-SECURITYSTORAGEUI-12 (MUST, both).** Include `<meta name="viewport" content="width=device-width,initial-scale=1">` on every page and design mobile-first/single-column at narrow widths. (The proxy ships viewport in its own pages but does **not** inject it into your HTML.)
- **PB-SECURITYSTORAGEUI-13 (MUST — origin clause is desktop-only).** Keep drive keys as bare 64-hex; keep paths free of `..`/NUL (→ 400). **Correction:** "non-loopback origins are 403'd" is **desktop-only** — mobile deliberately allows canonical `http(s)` origins through and defers to token/Origin checks. The traversal/hex-key rules apply on both.
- **PB-SECURITYSTORAGEUI-14 (SHOULD, both).** Keep any single bridge **sync-append** operation under 100KB (enforced on `/api/sync/append`); a separate ~1MB total request-body cap also applies. Chunk/stream larger work.
- **PB-SECURITYSTORAGEUI-15 (SHOULD, both).** Keep any single published file under **10MB** (enforced at write/publish). Reconcile with the 5MB cache/stream threshold (PB-STATICHYPERDRIVE-17): files 5–10MB publish but are never cached and re-fetched every load — prefer <5MB for frequently-loaded assets.
- **PB-SECURITYSTORAGEUI-17 (MUST, both).** A window-class/standalone app MUST declare itself honestly (window/launcher-only) rather than claiming tab-compatibility. Desktop launches it in its own window via `CMD_LAUNCH_PEAR_LINK`; mobile cannot load it (blank tab / WorkerError).
- **PB-SECURITYSTORAGEUI-18 (SHOULD, both).** For a window-class app, design for single-instance: open your store once, close cleanly on teardown, and if a second launch finds the store locked, focus/hand off rather than crash. Don't leave a rocksdb LOCK held or a fixed port bound. *(The host survives this only by hard-exiting to release LOCKs and scanning to the next free port — don't depend on that.)*
- **PB-SECURITYSTORAGEUI-19 (MAY, both).** Prefer the tab-able shapes (pear-request worker or static Hyperdrive) over a full-GUI window app when functionality allows, to be inline-in-tab on both platforms.

> **PB-SECURITYSTORAGEUI-16 (mobile-only; partly PROPOSED).** If your app needs the bridge on a real HTTPS origin (not loopback/`hyper://`), it is injected only when the user has **trusted** that origin in allowlist mode; prompt the user to trust and degrade read-only until granted. Use a stable canonical origin (scheme+host+non-default port) so the trust entry persists/replicates. **Scope correction:** the trusted-origins store exists **only on mobile** (no equivalent on desktop), and the `{allowed:false, reason:'untrusted'}` withholding is implemented at the session-mint layer (described in code comments) rather than in the trust-store module itself. Treat HTTPS-origin trust as a **mobile** concern.

### Anti-patterns

Hardcoding loopback port/origin/dkey; capturing the token once / persisting it; off-origin `/api/*` calls; awaiting consent as guaranteed; requiring the full scope set; unescaped peer/remote HTML; inline `<script>` for app logic (dead on mobile CSP); a CSP omitting `'self'` from `connect-src`/`script-src`; durable state in browser storage / un-namespaced keys; window-class assumptions in a tab build; leaving a LOCK/port held on exit; declaring a window-only app as tab-compatible.

---

## 9. Discovery, Catalogue & Release Registration

**Applies to:** desktop (sheets/index-room) and mobile (relay/manifest). Catalogues from all sources are **merged** into one de-duplicated list, normalized to one DTO — the **weakest record shape drags down rendering everywhere**.

### Requirements

- **PB-DISCOVERYCATALOGUE-1 (MUST, desktop).** Publish a single schema-sheets `apps` row validating against `APPS_SCHEMA` (`name`+`type` required; ≥1 of `driveKey`|`link`). **Important:** validation runs at **autobase apply time**, and the client `addRow` returns a UUID **without awaiting** the apply result — so a rejected row gives the publisher a **false success signal** and silently never appears. **Validate the row against `APPS_SCHEMA` (ajv) locally before publishing** (the live system gives no rejection feedback).
- **PB-DISCOVERYCATALOGUE-2 (MUST, desktop).** Set `type` explicitly to `'hypersite'` (inline tab) or `'standalone'` (own window). Use `hypersite` iff your app speaks `Pear.worker.pipe()`/`PearRequestRouter` (or serves static files) and renders no window.
- **PB-DISCOVERYCATALOGUE-3 (MUST, desktop).** Never rely on `type` inference — the two readers diverge: the **sheets** reader infers `'standalone'` only for link-only rows (else `undefined`); the **relay index-room** reader infers `'standalone'` for driveKey-only rows and `'hypersite'` otherwise. An omitted `type` yields inconsistent (sometimes absent) launch behavior.
- **PB-DISCOVERYCATALOGUE-4 (MUST, both).** Do not publish a full-GUI/worker-class app as `hypersite` — the tab runtime can only host pear-request/static apps, so it renders a blank tab.
- **PB-DISCOVERYCATALOGUE-5 (SHOULD, both).** Author as `hypersite` (or Tier-A static) rather than `standalone` for maximal in-tab reach; standalone opens a separate window on desktop and fails on mobile.
- **PB-DISCOVERYCATALOGUE-6 (SHOULD, desktop).** Supply canonical optional metadata with **exactly** these keys: `description` (≤1000), `author` (≤200), `categories` (array ≤12, each ≤60), `version` (≤40), `iconRef` (≤300), `publishedAt` (epoch-ms integer, also passed as the row time for recency).
- **PB-DISCOVERYCATALOGUE-7 (MUST, desktop).** Include **no** key outside `APPS_SCHEMA` — `additionalProperties:false` rejects the whole row at apply time (silently, per PB-1).
- **PB-DISCOVERYCATALOGUE-8 (MUST, desktop).** `driveKey`/`manifestHash` are lowercase 64-hex (`^[0-9a-f]{64}$`); malformed → silent rejection.
- **PB-DISCOVERYCATALOGUE-10 (SHOULD→honesty, desktop).** Set `verification` only to `'unverified'` (or omit). The attestation machinery is unwired, so `'relay-listed'`/`'author-signed'` set by an author is an **untrusted, unprovable** claim. Leave those to the relay/attestation system.
- **PB-DISCOVERYCATALOGUE-11 (MUST, desktop).** Do **not** mint or set your own `id` on the sheets path — the room assigns a UUID that becomes the stable id and the dedupe key (highest-version-wins). A record with no id is never de-duplicated and appears multiple times.
- **PB-DISCOVERYCATALOGUE-12 (MUST, both).** Keep your drive **online and replicating** after publish. Discovery/listing/icon loading replicate your live drive; an offline drive yields a dropped manifest, "Unknown App", or a missing icon.
- **PB-DISCOVERYCATALOGUE-13 (MUST, desktop).** Share the desktop catalogue **room** as a z32 link of `key32` (52 z32 chars, optionally `sheets://`-prefixed); share only the **key-only public** link (never the encryption key). Pin the room's discoveryKey on a HiveRelay for durability.
- **PB-DISCOVERYCATALOGUE-14 (SHOULD, desktop).** To list via a HiveRelay index room, publish so the relay writes an `app-manifest` row (`name` required; `appId`; ≥1 of driveKey|link; `type`/`launchType`; `publisherPubkey`). Set `type` explicitly — index-room rows that omit it default to `'hypersite'`, mis-gating a standalone app.
- **PB-DISCOVERYCATALOGUE-15 (MUST, mobile).** Ship a `manifest.json` at the drive root with at minimum `name` **and** `entry` (e.g. `"/index.html"`). Missing either → the relay drops it; no manifest at all → "Unknown App".
- **PB-DISCOVERYCATALOGUE-16 (SHOULD, mobile).** Include `version`, `description`, `author`, `icon` (drive path), `categories`, `permissions` alongside `name`/`entry`. Author static HTML served from the drive root (mobile has no `type` concept).
- **PB-DISCOVERYCATALOGUE-17 (SHOULD, mobile).** Register by POSTing `{driveKey}` to a relay's `/v1/register` rather than relying on pure DHT announce — the peer-announce reader is an **unimplemented stub**, so announce alone yields no catalog entry.
- **PB-DISCOVERYCATALOGUE-18 (MUST, desktop tooling).** When publishing an updatable Hyperbee/Hyperdrive catalog (e.g. `publish-catalog-bee`, **desktop-only tool**), always pass a persistent `--storage` path so the key is stable across updates. Without it each run mints a fresh, non-updatable key, orphaning subscribers.
- **PB-DISCOVERYCATALOGUE-19 (SHOULD, mobile — signed catalogs).** If you operate a relay publishing a signed catalog Hyperbee (`catalogBeeKey`), the `'\x00meta'` record MUST carry an Ed25519 signature over `SHA-256(beePubkey || canonicalJSON(meta-minus-signature))` (the bee key IS the publisher pubkey, TOFU). A missing/mismatched signature makes the client **fail closed** and silently fall back to HTTP. **PROPOSED clarification:** the exact `canonicalJSON` algorithm (key ordering, number/unicode normalization) is unspecified — two implementations may disagree and fail closed.
- **PB-DISCOVERYCATALOGUE-20 (MUST, desktop).** Do **not** use the legacy Hyperdrive `catalog.json` shape (`pearLink`/`url`/`homepage`, no `type`). **Correction:** the live default-catalog apps **do** still install/launch because they carry a `driveKey` (routing to Install/Launch); what they lack is the `type` badge and standalone/hypersite gating — they are **un-gatable**, not un-launchable. Use the schema-sheets `apps` shape (`link`/`driveKey` + explicit `type`) so your app gates correctly.
- **PB-DISCOVERYCATALOGUE-21 (SHOULD, both).** Publish one canonical record satisfying the **strictest** reader (sheets `APPS_SCHEMA` with explicit `type`), even for a single channel — all sources merge into one DTO.
- **PB-DISCOVERYCATALOGUE-22 (MAY, desktop — advisory only).** `categories:['featured']` is **not** a curated/trusted signal and is **not read for placement** — featured surfacing is a hardcoded `FEATURED_APPS` array in the UI, independent of `categories` (which only build filter chips). Treat it as a soft, unenforced label.

### Icon resolution (IMPLEMENTED)

**How to give your app/site an icon in the browser: put an icon file in your drive.** When a card renders, the desktop fetches the icon from your live drive over the network and inlines it; if none is found it shows a letter-glyph fallback. This works for **every** catalogue source (sheets room, index room, dev seed, and the legacy `catalog.json` path) — the previous "desktop sheets icon doesn't render" gap is now closed (`backend/index.js` `resolveAppIcon` + `CMD_GET_APP_ICON`, rendered by the `AppIcon` component).

- **PB-ICON-1 (SHOULD, both).** Ship an icon **file in your drive root**. The desktop resolver tries, in order: your declared `iconRef` (if any), then the well-known paths `/icon.svg`, `/icon.png`, `/icon.jpg`, `/icon.jpeg`, `/icon.webp`, `/favicon.svg`, `/favicon.png`, `/favicon.ico`, `/logo.svg`, `/logo.png`. The first one that exists wins. **You do not need a catalogue field** — just include the file. Declaring `iconRef` (a drive path, ≤300 chars) is an optional hint that's tried first.
- **PB-ICON-2 (SHOULD, both).** Recommended: a **square SVG** (crisp at every size, tiny) or a **128–256px PNG**. Hard cap **512 KB**; larger files are ignored (letter-glyph fallback). Allowed MIME: SVG, PNG, JPEG, WebP, ICO.
- **PB-ICON-3 (MUST, both).** **Keep your drive online/seeded** — the icon is fetched from your live drive (or a HiveRelay that has pinned it). An offline, never-pinned drive shows the letter fallback. (See PB-DISCOVERYCATALOGUE-12.) Resolved icons are cached ~10 min per drive.
- **PB-ICON-4 (MAY, both).** Do **not** inline a real raster as a `data:` URI in `iconRef` (300-char cap). Inline SVG favicons in your page `<head>` are **not** used for the listing — ship a real `/icon.svg` (or `/favicon.png`) file.
- **In-app upload (your own builder sites).** In PearBrowser's site editor (P2P Sites → your site → **🖼 Icon**), upload an image; it is written to `/icon.<ext>` in your site's drive (no re-publish needed for an already-seeded site).
- **Mobile** unchanged: the relay fetches the drive `icon`/`manifest.json:icon` and inlines it.

### Canonical catalogue registration record (Tier A)

Desktop schema-sheets `apps` row:
```jsonc
{
  "name": "My Notes",
  "type": "hypersite",                 // or "standalone"; MUST be explicit
  "driveKey": "0123…(64 lowercase hex)",
  "link": "pear://…",                  // present only for hypersite/standalone
  "description": "A peer-to-peer notes app.",
  "author": "alice",
  "categories": ["productivity"],      // use the mobile fixed vocabulary (see §11)
  "version": "1.2.0",
  "iconRef": "/icon.png",              // path inside the drive (≤300 chars)
  "publishedAt": 1718600000000,
  "verification": "unverified"         // do NOT self-assert relay-listed/author-signed
  // NO id (room assigns UUID); NO keys outside APPS_SCHEMA
}
```

Mobile drive-root `manifest.json` (the same logical app, Tier A static side):
```jsonc
{
  "name": "My Notes",
  "entry": "/index.html",              // REQUIRED on mobile; MUST be exactly /index.html
  "version": "1.2.0",
  "description": "A peer-to-peer notes app.",
  "author": "alice",
  "icon": "/icon.png",                 // SAME asset as desktop iconRef
  "categories": ["productivity"],
  "permissions": []                    // reserved / currently a no-op
}
```

---

## 10. App Lifecycle, Versioning, Availability, Errors & A11y (new dimensions)

These dimensions were missing from the drafts. Where a rule reflects current code it is normative; speculative hooks are marked **PROPOSED**.

### 10.1 App Lifecycle, Teardown & State Durability

- **PB-LIFECYCLE-1 (MUST, both).** Keep all durable state in Hypercore/Hyperbee/Hyperdrive or the `/api/*` persistence surface — never process-local or browser storage (consolidates PB-WORKERCONTRACT-9, PB-SECURITYSTORAGEUI-9, PB-STATICHYPERDRIVE-14). Design writes **idempotent**: a hypersite worker's socket close is a **hard kill** with no graceful drain, and the host does **not** restart a crashed worker.
- **PB-LIFECYCLE-2 (SHOULD, both — static apps).** Flush state on `pagehide`/`visibilitychange` rather than relying on a teardown handshake. There is no documented "tab closing → flush" host hook today.
- **PB-LIFECYCLE-3 (SHOULD, desktop — hypersite).** Surface a "reload tab" affordance for the no-restart-on-crash case; do not assume recovery.
- **PB-LIFECYCLE-4 (PROPOSED).** A normative `beforeunload`/`pagehide`/`visibilitychange`/"tab backgrounded"/"tab discarding" lifecycle-signal contract for in-tab apps does not exist; this section is the placeholder for it.

### 10.2 Versioning & Updates

- **PB-VERSION-1 (MUST, both).** A static Hyperdrive **mutates in place under the same 64-hex `driveKey`**; the catalogue `version` string is the **only** user-visible update trigger. **Bump `version` on every content change.**
- **PB-VERSION-2 (MUST, both).** Update detection is **raw string inequality** (`catalogApp.version !== installed.version`), **not** semver ordering — despite docs calling it "Semver". Do not rely on semver precedence; any change to the string triggers the prompt.
- **PB-VERSION-3 (SHOULD, both).** The proxy LRU cache (~5-min TTL, ~50MB, ~5MB/file) can serve **stale bytes** after an update. Provide a cache-busting strategy (e.g. versioned asset filenames) for critical assets.
- **PB-VERSION-4 (PROPOSED).** A normative cache-invalidation / re-replication contract on update is undefined.

### 10.3 Availability & Seeding SLO

- **PB-AVAIL-1 (MUST, both).** Make seeding a **release gate**: pin the drive on at least one always-on node (HiveRelay pin or relay `POST /seed`) before publishing the catalogue row.
- **PB-AVAIL-2 (MUST, both).** **Cold-node verification:** confirm `drive.entry('/index.html')` resolves from a **fresh second node** before publishing, to avoid the 30s mobile install timeout that resolves into a broken app.
- **PB-AVAIL-3 (SHOULD, both).** Size first paint against the **~15s** per-file P2P fetch timeout (desktop adds ~8s for directory/index resolution).

### 10.4 Error, Loading & Empty-State UX

- **PB-ERRORUX-1 (SHOULD, both).** Render a first-paint skeleton from `index.html` / `GET /` alone within the ~15s P2P window.
- **PB-ERRORUX-2 (SHOULD, both).** Provide a connection/timeout fallback with a **retry** control; never show an infinite spinner (generalizes PB-BRIDGECAPABILITIES-9 and PB-SECURITYSTORAGEUI-3).
- **PB-ERRORUX-3 (SHOULD, both).** Visibly distinguish "offline/unreachable" from "app error" so users know whether to retry or report.

### 10.5 Accessibility & Internationalization

- **PB-A11Y-1 (SHOULD, both).** Use semantic HTML + ARIA, full keyboard operability, and WCAG-AA contrast across the desktop iframe and mobile WebView.
- **PB-A11Y-2 (MUST, both — heightened obligation).** Because native `alert/confirm/prompt` are blocked (PB-STATICHYPERDRIVE-19), custom dialogs that replace them MUST be **focus-trapped and Escape-dismissible**.
- **PB-A11Y-3 (SHOULD, both).** Respect `prefers-reduced-motion`.
- **PB-I18N-1 (SHOULD, both).** Declare `<meta charset="utf-8">` and `<html lang="…">`; support `dir="rtl"` where relevant. RTL must coexist with the injected `<base>`/CSP. There is no host-provided locale/timezone API — derive locale client-side.

### 10.6 Deep-Linking & Launch Parameters

- **PB-DEEPLINK-1 (SHOULD, both).** Read inbound parameters from the **hash/query string** on load (the pattern already exists: mobile `posAPI` reads `?inviteKey=`). Validate and tolerate missing/garbage params — never crash.
- **PB-DEEPLINK-2 (PROPOSED).** A canonical, browser-blessed inter-app deep-link contract (construct a shareable link to a hypersite/static app at a specific resource) is undefined; today, use `hyper://` for cross-app navigation (PB-STATICHYPERDRIVE-13) plus your own hash/query convention.

### 10.7 Resource Budgets

- **PB-BUDGET-1 (SHOULD, both).** Single-file limit **10MB** (publish-time, PB-SECURITYSTORAGEUI-15); single sync-append op **<100KB** (PB-SECURITYSTORAGEUI-14). Keep frequently-loaded assets **<5MB** so they cache (PB-STATICHYPERDRIVE-17/VERSION-3). Keep cold-start asset count and total page weight small (PB-STATICHYPERDRIVE-16).

### 10.8 Declared Capabilities (PROPOSED)

- **PB-CAPDECL-1 (PROPOSED).** A machine-readable up-front capabilities declaration (e.g. `pearbrowser.capabilities: ['contacts:read','swarm:arbitrary-topic','swarm:tier-a']`) so users get install-time disclosure and the catalogue can warn/filter does **not** exist; the mobile manifest `permissions` array is a reserved no-op today. Until it lands, request runtime scopes minimally (PB-BRIDGECAPABILITIES-7) and describe capabilities in human-readable metadata.

### 10.9 Telemetry & Privacy (PROPOSED)

- **PB-PRIVACY-1 (informative).** Conventional web analytics is effectively **impossible**: the mobile CSP pins `connect-src` to loopback, and the shared-origin storage limitation makes browser-storage identifiers unreliable and cross-app-leaky. Do not embed third-party telemetry. A normative privacy-disclosure requirement is **PROPOSED**.

---

## 11. Cross-Platform Field Mapping (normative)

Resolves the desktop/mobile conflicts in one table. Set **all** of these for a Tier-A app.

| Logical field | Desktop key (sheets row) | Mobile key (manifest.json) | Canonical rule |
|---|---|---|---|
| App class | `type` ∈ {`standalone`,`hypersite`} — **always explicit** | *(none — mobile ignores `type`)* | Set `type` on desktop; mobile serves every app as a static drive. |
| Entry point | *(hardcoded `/index.html`)* | `entry` (**required**) | `entry` MUST be exactly `"/index.html"`; the file MUST be at the drive root. Any other value is invalid/ignored. |
| Drive identity | `driveKey` (`^[0-9a-f]{64}$`) | *(drive root has `manifest.json`)* | Lowercase 64-hex; root `/index.html` present. Universal floor (Tier A). |
| Icon | `iconRef` (path, ≤300) | `icon` (drive path) | **Set BOTH** to the same in-drive asset. *(Desktop sheets-path icon does not render today — PB-DISCOVERYCATALOGUE-9; mobile renders it.)* |
| Categories | free-form array (≤12, ≤60 each) | fixed enum: `utilities`\|`productivity`\|`communication`\|`games` | **Use the mobile fixed vocabulary** (desktop accepts it as a subset) so cross-platform listing/filtering works. |
| Version | `version` (string ≤40) | `version` | Bump on **every** content change (string-inequality update trigger — PB-VERSION-1/2). |
| Trust | `verification` (`unverified` only) | *(n/a)* | Author sets only `unverified`; relay/attestation owns the rest. |
| Identity/dedupe id | *(room-assigned UUID)* | *(relay-assigned)* | Never mint your own `id`. |

**External-link behavior (single rule):** treat any `http(s)://` link as **leaving your app context** — on mobile it opens in the system browser (except trusted-relay `/v1/hyper/` URLs, which stay in-tab); on desktop the sandboxed iframe blocks top-navigation and opens popups. Use `hyper://` for in-browser cross-app navigation; keep primary navigation relative/hash.

---

## 12. Consolidated Conformance Checklist

Run before release. Grouped by tier; **Tier A items are the universal floor**.

### Universal (all tiers)

- [ ] **Catalogue row validates** against `APPS_SCHEMA` via ajv **locally before publishing** (`name`+`type` present; `type` ∈ {`standalone`,`hypersite`}; ≥1 of `driveKey`(`^[0-9a-f]{64}$`)|`link`; **no extra keys**). *(Live system gives no rejection feedback — PB-DISCOVERYCATALOGUE-1.)*
- [ ] `type` is set **explicitly** (not inferred).
- [ ] `verification` is absent or `'unverified'`.
- [ ] No self-minted `id`.
- [ ] Drive is **pinned/seeded** on an always-on node; `drive.entry('/index.html')` **resolves from a cold second node**.
- [ ] `iconRef` **and** `icon` both set to the same in-drive asset; `categories` use the mobile fixed vocabulary; `version` bumped this release.
- [ ] Every page ships `<meta name="viewport" content="width=device-width,initial-scale=1">`, `<meta charset="utf-8">`, and `<html lang>`.
- [ ] Page ships a strict `<meta http-equiv="Content-Security-Policy">` = `default-src 'self'; script-src 'self'; connect-src 'self' <loopback>; object-src 'none'; base-uri 'self'` (self-imposes mobile parity on desktop).
- [ ] Custom dialogs (replacing blocked native ones) are focus-trapped + Escape-dismissible; WCAG-AA contrast; `prefers-reduced-motion` respected.

### Tier A — Universal static Hyperdrive (in-tab, both platforms)

- [ ] `/index.html` exists at the drive root; `GET /app/<key>/index.html` returns 200 HTML.
- [ ] Every navigable directory link (trailing slash) has an `index.html`.
- [ ] No root-absolute asset URLs (`grep -nE '(src|href)="/[^/]'` is empty); no author `<base>`; literal lowercase `<head>` present (and `<html>` has **no attributes** if relied on for fallback).
- [ ] Only **mapped** extensions; no `.wasm/.map/.avif/.eot/.otf/.xml/.wav/.ogg/.csv`/extensionless.
- [ ] **CSP-clean:** no inline `<script>`/`<style>`, no `on*=` handlers, no inline `style=`, no `eval`, no remote scripts/styles/fonts/images, no remote fetch/XHR/WebSocket (verify with zero CSP violations under the self-imposed CSP).
- [ ] SPA routing is **hash-based**; every deep-link/refresh returns 200.
- [ ] Cross-drive links use 64-hex lowercase keys; paths free of `..`/NUL.
- [ ] Frequently-loaded assets <5MB; no single file >10MB; small critical first paint.
- [ ] No native `alert/confirm/prompt`, programmatic downloads, or top-frame navigation (desktop sandbox).
- [ ] Mobile `manifest.json` present with `name` + `entry:"/index.html"`; mobile install reaches 100% within 30s; (relay path) registered via `POST /v1/register`.
- [ ] Durable state via `/api/*`/Hypercore, never `localStorage`/cookies; browser-storage keys namespaced by drive key.
- [ ] Every `window.pear.*` use is optional-chained with a working fallback (bridge may be absent).

### Tier B — Hypersite worker (desktop in-tab only)

- [ ] `package.json` declares `pear.type === 'terminal'`; no window; no own HTTP server.
- [ ] Worker entry has `Pear.worker.pipe()`, `new PearRequestRouter(pipe)`, and `pipe.on('data', d => router.processMessage(d))`.
- [ ] `GET /` returns a full HTML page; ≥1 sub-route returns an HTML **fragment** (text/html, not JSON, not a full document).
- [ ] Launch `link` matches `^pear://` or `^file://` (never `hyper://`/`http(s)://`).
- [ ] All navigation uses `hx-*` XHR attributes; **no** `fetch()`/raw WS/absolute-URL/full-page anchor/form nav.
- [ ] UI bootstraps from `GET /` with only htmx + pear-request client (no inline module/CDN).
- [ ] Exactly one response frame per request id; no streamed/split responses.
- [ ] Errors signaled **in-band** (desktop client forces status 200).
- [ ] Per-tab state isolation assumed; shared/durable state in Hypercore/Hyperbee.
- [ ] `pipe.on('error', …)` attached; a "reload tab" affordance exists (no host restart).
- [ ] Mobile honesty: ships a Tier-A static drive **or** is declared desktop-tab-only.

### Tier C — Standalone window app

- [ ] Declared `type:'standalone'` with a `link` and **no** `driveKey`; not advertised as tab-able.
- [ ] `pear.name` matches `^[@/a-z0-9-_]+$` (avoids `ERR_INVALID_APP_NAME`).
- [ ] Single-instance: store opened once, closed cleanly on teardown; no held rocksdb LOCK / bound fixed port; second launch focuses/hands off.
- [ ] Honestly declared window/launcher-only (no false tab-compatibility claim); accepts it is unreachable on mobile.

### Bridge & consent (any tier using `window.pear`)

- [ ] `/api/*` calls send `X-Pear-Token` read from the meta tag **at call time** (never cached/persisted); only `/api/swarm/events` uses `?token=`.
- [ ] Login requests **minimal** scopes (no `pay`); functions on partial/empty grant; reads `attestation.scopes`/`profile` (may be null).
- [ ] Login denial (403) and 2-min timeout handled with a retry affordance; no loop/hang.
- [ ] `contacts.*` only after a `contacts:read` grant.
- [ ] Swarm: Tier A `join(null,{subtopic})` for own rooms; arbitrary-topic joins wrapped in try/catch for `consent-denied`/`consent-pending`; no concurrent Tier C joins.
- [ ] `peer.pubkey` never used for auth; all five channel events handled; fresh-`channelId` re-init path on teardown.
- [ ] Sync `appId` matches `^[a-zA-Z0-9_-]{1,64}$`, not reserved, not `pear-pos`.
- [ ] Identity pubkey not treated as a cross-app id; `sign()` payload non-empty and ≤64KB with a stable namespace.
- [ ] Login re-prompt logic derived from a **30-day** TTL (not 7).

---

## 13. Open Questions / Future Work

**PROPOSED browser-side changes (not current behavior):**

1. **Machine-readable tier/self-declaration block** (`pearbrowser: { tier, runIn, transport, platforms, entry }`) and a **conformance badge** with defined semantics and a certifier. Currently tier is inferred from `type` + link regex + whether the worker speaks pear-request.
2. **Declared capabilities / permissions** surfaced at install time (the mobile `permissions` array is a no-op today); runtime scopes should be a subset of declared capabilities.
3. **App lifecycle signal contract** for in-tab apps (`pagehide`/`visibilitychange`/discard/graceful-drain) and **hypersite worker restart-on-crash** supervision.
4. **Desktop sheets-path icon resolution** — wire `iconRef`→drive fetch so sheets-row drive-hosted icons render on desktop (currently only the legacy `catalog.json` path inlines icons).
5. **Update/cache contract** — define cache invalidation and re-replication on `version` bump; replace string-inequality update detection with real semver ordering.
6. **`manifestHash` canonicalization** — define exactly which bytes/ordering produce the hash so a future verifier can accept author-computed values; wire install-time verification.
7. **`canonicalJSON` spec** for signed-catalog Ed25519 verification (key ordering, number/unicode normalization) so independent relays interoperate.
8. **Cross-platform `type` unification** — either teach mobile to honor `type`, or formally bless "mobile ignores `type`, always static-drive" as the contract (this standard currently mandates the latter).
9. **Inter-app deep-link contract** — a canonical way to construct a shareable link to a hypersite/static app at a specific resource (beyond `hyper://` + ad-hoc hash params).
10. **Standalone app management** — a real launcher (terminate/focus/relaunch, exit propagation, launcher-card persistence). `CMD_LAUNCH_PEAR_LINK` is fire-and-forget today; the §3 lifecycle block is entirely aspirational.

**Unresolved/underspecified (need a normative ruling once code stabilizes):**

- Whether a desktop **hypersite** tab exposes `/api/*` and `window.pear` at all (the tab-runtime bridges only the worker pipe + htmx + pear-request client into an isolated iframe; the bridge sections assume the static-proxy page). The bridge surface for hypersite tabs is currently **undefined**.
- Worker request semantics for `HEAD`/`OPTIONS`/range and `POST/PUT/DELETE` body shape/size in the pear-request frame.
- A single reconciled resource-budget number set (drive size cap, asset count, page-weight budget) beyond the scattered 5MB/10MB/100KB limits.
- Telemetry/privacy posture — whether any analytics is permitted and what disclosure is required on the shared loopback origin.
- Tier B (autobase mint-then-rejoin, persisted-grant, no-prompt) swarm path guidance for autobase apps, which the bridge section omits.

---

*End of PBACS v0.1.*
