# Native QVAC AI in PearBrowser Desktop

Status: experimental desktop integration  
Implemented: 2026-07-11

PearBrowser runs QVAC in its browser-owned Bare backend and exposes a narrow,
origin-scoped API to Hyperdrive applications as `window.pear.ai`. QVAC and its
native llama.cpp addon are loaded lazily on the first approved request, so
ordinary browsing does not initialize AI or load a model.

PearBrowser's own chrome also provides the **Ask Browser** side panel. That
surface uses a separate browser-internal RPC stream, can discover host-approved
local Ollama Qwen GGUFs, and captures bounded active-page context only when the
user sends a question. See [ASK_BROWSER.md](./ASK_BROWSER.md).

## App permission

The app's `/manifest.json` must opt in:

```json
{
  "name": "My local AI app",
  "permissions": ["pear.ai.infer"]
}
```

The nested form `pear.ai.infer: true` is also accepted. Permission is checked
against the drive key bound to the page's browser-issued API token. Missing,
malformed, unreachable, or unapproved manifests fail closed.

## Page API

Feature-detect the bridge:

```js
if (!window.pear?.ai) throw new Error('Native local AI is unavailable')

const capabilities = await window.pear.ai.capabilities()
if (!capabilities.available || !capabilities.allowed) {
  throw new Error('This app cannot use local AI')
}

const run = await window.pear.ai.complete({
  model: 'pear-small-chat',
  messages: [{ role: 'user', content: 'Explain Hypercore in one sentence.' }],
  maxTokens: 96,
  temperature: 0.3
})

let answer = ''
for await (const event of run.events) {
  if (event.type === 'model-progress') {
    console.log('model', event.progress)
  } else if (event.type === 'text') {
    answer += event.delta
  } else if (event.type === 'stats') {
    console.log(event.stats)
  } else if (event.type === 'done') {
    console.log('finished', event.finishReason)
  } else if (event.type === 'error') {
    throw new Error(event.message)
  }
}

// Optional while a request is active:
await run.cancel()
```

The initial model alias is `pear-small-chat`, pinned to QVAC's
`SMOLLM2_360M_INST_Q8` registry descriptor and checksum. Pages cannot supply a
path, URL, registry endpoint, addon name, or native llama.cpp configuration.

## Security and resource rules

- Every route requires the page's per-origin `X-Pear-Token`.
- `pear.ai.infer` is checked from the token-bound drive's manifest.
- Request ownership is bound to the drive, including cancellation.
- Input is capped at 32 KiB and output at 512 tokens.
- Temperature is clamped to 0–2.
- Only one native inference runs at a time; the global queue is bounded.
- Model loads are deduplicated and browser-owned.
- An in-flight cancellation is delivered to the native addon exactly once.
- Idle models are unloaded after a quiet window (default 15 minutes) so a
  large GGUF does not hold RAM between sessions of use. Configure with
  `PEARBROWSER_QVAC_IDLE_UNLOAD_MS`; `0` disables. The next request reloads
  the model through the normal progress-reporting path.
- Pages may pass `reasoningBudget` (clamped to the output-token cap; `-1`
  means unlimited, `0` disables hidden reasoning) for reasoning-capable
  models; the browser still strips nothing from the raw stream.
- Shutdown cancels work, unloads models, and closes QVAC.
- Streaming uses same-origin NDJSON; there is no unauthenticated localhost
  OpenAI endpoint.

## Developer verification

Focused tests:

```sh
node --test \
  test/qvac-service.test.js \
  test/qvac-http-bridge.test.js \
  test/qvac-native-packaging.test.js
```

Native Bare smoke:

```sh
npm run smoke:qvac:native
```

The first run downloads about 386 MB through QVAC's distributed registry into
the operating system temporary directory. Override it with
`QVAC_SMOKE_HOME=/path/to/storage`. Subsequent runs prove cached/offline model
loading. The smoke loads the same lazy service path as the browser, generates a
short response on CPU, reports native stats, unloads, and closes.

An existing local GGUF can be bound to the smoke-only `local-model` alias
without copying it or exposing its filesystem path to a page:

```sh
QVAC_SMOKE_MODEL_PATH=/absolute/path/to/model.gguf \
  QVAC_SMOKE_DEVICE=cpu \
  npm run smoke:qvac:native
```

The browser smoke starts a loopback page with the production
`window.pear.ai` shim, authenticated HTTP routes, permission check, and native
QVAC service. Open the printed URL in a browser and use **Run locally**:

```sh
QVAC_SMOKE_MODEL_PATH=/absolute/path/to/model.gguf \
  QVAC_SMOKE_DEVICE=cpu \
  npm run smoke:qvac:browser
```

This local path is host configuration for the diagnostic fixture only. An app
still chooses a browser-approved alias and can never submit a path to QVAC.

`npm run smoke:qvac:pear` is retained as a compatibility alias for the native
Bare-worker smoke. PearBrowser's Electron host owns the embedded Pear OTA
worker; it never uses a CLI launcher for this check.

## Current proof

On macOS arm64, Bare 1.30.3 with `@qvac/bare-sdk` 0.14.1 and
`@qvac/llm-llamacpp` 0.36.3:

- downloaded and checksum-validated the 386,404,992-byte registry model;
- loaded the GGUF through the native addon;
- generated the expected completion at roughly 156–159 tokens/second on CPU;
- unloaded and shut down cleanly;
- repeated from cache without network access;
- loaded the existing 20,201,240,160-byte Ollama Qwen 3 32B Q4_K_M GGUF
  directly, without conversion or copying;
- streamed Qwen through a real loopback browser page using `window.pear.ai`,
  including the manifest permission gate and NDJSON bridge;
- passed the complete 532-test desktop suite.

The installed macOS arm64 QVAC prebuild reported no usable GPU and fell back to
CPU even when the smoke requested `device=gpu`. Qwen 3 produced roughly
3.4–3.8 tokens/second on that CPU path. A Metal-enabled addon build, smaller
interactive models, and the mobile BareKit integration remain separate
follow-up gates.
