import { QvacService } from './qvac-service.mjs'
import { QVAC_MODEL_CATALOG } from './qvac-model-catalog.mjs'

/**
 * Create the browser service without loading any QVAC/native-addon module.
 * The first approved model operation performs the import from this ESM file,
 * which gives Bare a valid referrer while preserving normal browser startup
 * when AI is unused or unavailable.
 */
export function createLazyQvacService (opts = {}) {
  let adapterPromise = null
  const getAdapter = async () => {
    if (!adapterPromise) {
      adapterPromise = import('./qvac-runtime.mjs')
        .then(mod => mod.createQvacAdapter({ homeDir: opts.homeDir }))
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

