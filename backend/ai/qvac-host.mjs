import { QvacService } from './qvac-service.mjs'
import { QVAC_MODEL_CATALOG } from './qvac-model-catalog.mjs'
import { createQvacAdapter } from './qvac-runtime.mjs'

/**
 * Create the browser service with lazy adapter and model initialization.
 *
 * Keep qvac-runtime as a static ESM dependency. Pear's Bare host can crash in
 * bare_module__on_dynamic_import when the first Ask request dynamically loads
 * this module, which takes the browser backend down and strands the renderer
 * in its reconnect screen. Static linkage avoids that host callback while the
 * adapter itself and its model remain lazy until the first approved operation.
 */
export function createLazyQvacService (opts = {}) {
  let adapterPromise = null
  const getAdapter = async () => {
    if (!adapterPromise) {
      adapterPromise = Promise.resolve()
        .then(() => createQvacAdapter({ homeDir: opts.homeDir }))
        .catch(err => {
          adapterPromise = null
          throw err
        })
    }
    return adapterPromise
  }

  const adapter = {
    async loadModel (params) { return (await getAdapter()).loadModel(params) },
    async completion (params) { return (await getAdapter()).completion(params) },
    async cancel (params) { return (await getAdapter()).cancel(params) },
    async unloadModel (params) { return (await getAdapter()).unloadModel(params) },
    async close () {
      if (!adapterPromise) return
      return (await adapterPromise).close()
    }
  }

  return new QvacService({
    adapter,
    models: opts.models || QVAC_MODEL_CATALOG,
    maxInputBytes: opts.maxInputBytes,
    maxOutputTokens: opts.maxOutputTokens,
    maxQueue: opts.maxQueue,
    idleUnloadMs: opts.idleUnloadMs
  })
}
