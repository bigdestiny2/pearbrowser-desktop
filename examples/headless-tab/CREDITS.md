# Credits & attribution

The "run a P2P app headless in a tab" capability in pearbrowser-desktop is built
on prior work by **Drache93**. Full credit to:

- **[Drache93/pear-browser](https://github.com/Drache93/pear-browser)** — the
  reference Pear browser that pioneered running P2P apps *in a tab* instead of a
  separate window, via `Pear.worker.run` + an XHR-over-pipe shim + htmx. It also
  originated the **app-type model** we adopted (`hypersite` apps render inline in
  a tab; `standalone` apps open in their own window). Our `FEATURED_APPS` `type`
  field and the window-vs-tab button gating come directly from it.

- **[Drache93/pear-request](https://github.com/Drache93/pear-request)**
  (npm: [`pear-request`](https://www.npmjs.com/package/pear-request), Apache-2.0)
  — the `XMLHttpRequest` implementation for Pear workers with htmx support. We
  use its client (`createPearRequest`) and server (`PearRequestRouter`) verbatim
  for the demo app and the in-process router.

- **[htmx](https://htmx.org/)** (`htmx.org`) — the hypermedia library that makes
  the streamed-fragment UI work.

## What we changed / added

Drache93's pear-browser runs the worker and hooks `globalThis.XMLHttpRequest`
**directly in the single renderer**, rendering the app inline (shadow DOM). Our
pearbrowser-desktop has a separate Bare backend worklet, so we instead:

- spawn the worker via `pear-run` in the **backend** (`backend/tab-runtime.js`),
- bridge it over a **`bare-ws`** WebSocket into an **isolated `<iframe>` tab**
  (per-app isolation — each app gets its own browsing context, which ties into
  the origin-per-app sandbox direction), and
- serve a tiny wrapper page + the injected client over **`bare-http1`**.

So: same mechanism (htmx + pear-request worker), different host integration —
trading Drache93's simplicity for stronger per-tab isolation.
