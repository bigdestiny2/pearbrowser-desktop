# Ask Browser

Status: experimental desktop MVP  
Implemented: 2026-07-11

Ask Browser is a browser-owned side panel for asking a local QVAC model about
the active PearBrowser tab. Open a `hyper://` page, click **✦ Ask** in the URL
toolbar, choose a model, and ask a question. The panel streams the answer,
supports cancellation and short multi-turn follow-ups, reports native runtime
stats, and keeps a visible source card for the active tab.

## The Local AI widget

The blank new-tab surface (`⌘T`) hosts the **QVAC Local AI widget**, a
chrome-owned quick-ask card. It shares the same browser-internal RPC contract
as the side panel (`CMD_ASK_BROWSER_CAPABILITIES`, `CMD_ASK_BROWSER_START`,
`CMD_ASK_BROWSER_CANCEL`, `EVT_ASK_BROWSER_STREAM`) but **never captures page
context** — its request builder pins `page: {}` so a quick ask is a plain
question to a browser-approved local model, streamed on-device with model
download/load progress, cancellation, short follow-up history, and native
runtime stats. Pure widget logic lives in `ui/lib/qvac-widget.js`
(`summarizeAiCapabilities`, `pickQuickAskModel`, `describeAiStatus`,
`buildQuickAskRequest`) with unit tests in `test/qvac-widget.test.js`; the
component is `QvacWidget` in `ui/shell.js`. The Ask side panel remains the
page-context surface, so the two never disagree about provenance.

## Local models

The built-in `pear-small-chat` alias remains the fast fallback. At desktop
startup PearBrowser also reads local Ollama manifests from
`~/.ollama/models/manifests/registry.ollama.ai`, verifies that each candidate
has a complete local GGUF blob and a Qwen family/config, and adds host-owned
aliases such as:

```text
ollama:qwen3:32b
ollama:huihui_ai/qwen3.5-abliterated:latest
```

Only the alias and public model metadata reach the renderer. Neither a page nor
the Ask panel can submit an arbitrary path. Set
`PEARBROWSER_QVAC_OLLAMA=0` to disable Ollama discovery. The optional
`PEARBROWSER_QVAC_DEVICE=gpu` requests GPU offload, although the currently
installed macOS prebuild falls back to CPU because it has no usable Metal
backend. `OLLAMA_MODELS` is honored for a custom Ollama model root. Pulling a
new model while PearBrowser is already running requires a restart so startup
discovery can approve its alias.

## Data flow

```text
active iframe
  -> authenticated, one-shot MessageChannel context snapshot
  -> PearBrowser renderer (trusted URL/tab provenance)
  -> browser-internal framed RPC
  -> AskBrowserService
  -> browser-owned QVAC service
  -> streamed RPC events
  -> side-panel transcript
```

The browser RPC contract is:

- `CMD_ASK_BROWSER_CAPABILITIES`
- `CMD_ASK_BROWSER_START`
- `CMD_ASK_BROWSER_CANCEL`
- `EVT_ASK_BROWSER_STREAM`

This is intentionally separate from `/api/ai/*`. Hyperdrive applications must
still declare `pear.ai.infer` and use their page token; they cannot call the
browser-chrome commands or cancel an Ask Browser request.

The renderer WebSocket is authenticated with Pear's per-launch `startId`.
`/status-smoke` is response-demultiplexed and permits only `CMD_GET_STATUS`
unless the native operator starts PearBrowser with a random
`PEARBROWSER_RPC_DIAGNOSTIC_TOKEN` and supplies the same token to the release
story smoke. Diagnostic sockets never receive browser events or other callers'
replies.

## Context and prompt safety

- Context capture happens only after the user sends a question.
- Each drive gets a random, least-privilege page-context token separate from
  its API bearer token.
- Drive-scoped loopback origins are enabled by default, so one Hyperdrive page
  cannot same-origin read another drive's DOM or injected tokens. The emergency
  compatibility rollback is `PEARBROWSER_PER_DRIVE_ORIGINS=0`.
- Requests are bound to the active iframe, its load epoch, a caller nonce, an
  exact target origin, and a transferred `MessagePort`.
- URL, tab id, and source title come from browser state rather than the page's
  response.
- Passwords and form values are never read. Hidden/script/style/template nodes
  and form controls are excluded.
- Context is UTF-8 bounded; the final prompt is conservatively capped at 7 KiB,
  model contexts are configured to 8192 tokens, and 256 output tokens remain
  reserved. Ask requests disable hidden Qwen reasoning so that budget produces
  a visible answer instead of being consumed by a stripped `<think>` block.
- The backend supplies the system instruction and marks all page material as
  untrusted evidence. Pages cannot inject a system role.
- Model `<think>` blocks are filtered from the visible transcript and follow-up
  history.

An injected bridge runs in a page's main JavaScript world, so a hostile page can
lie about its own visible text. PearBrowser treats that text as untrusted and
never lets it authorize tools or side effects. Tamper-resistant DOM capture
would require a future Electron isolated-world/WebContents integration.

## Verification

Focused tests:

```sh
node --test \
  test/ask-browser-service.test.js \
  test/ask-browser-ui.test.js \
  test/page-context-bridge.test.js \
  test/qvac-ollama-catalog.test.js \
  test/tab-runtime-context.test.js \
  test/ask-browser-packaging.test.js
```

Run the complete desktop suite with `npm test`.

Exercise the complete Ask broker through native QVAC inference (auto-selecting
a local Ollama Qwen model when one is installed):

```sh
npm run smoke:ask-browser:native
```

Render and interact with the production side-panel component in a deterministic
browser fixture with `npm run smoke:ask-browser:ui`.

## Next slices

The MVP asks about one active tab. Semantic search across history, bookmarks,
downloads, repositories, and Hyperdrives is a separate consented indexing
slice requiring `@qvac/embed-llamacpp`, a dedicated embedding GGUF, QVAC RAG,
and per-source index permissions. Builder/testing tools should likewise use
typed browser-owned capabilities with explicit confirmation for writes or
execution; model text alone never grants authority.
