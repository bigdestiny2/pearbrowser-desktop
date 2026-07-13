import bareProcess from 'bare-process'
import env from 'bare-env'
import { close, plugins } from '@qvac/bare-sdk'
import { llmPlugin } from '@qvac/bare-sdk/llamacpp-completion/plugin'

// QVAC's Bare quickstart requires the process compatibility global. Pear's
// runtime may already provide it; never replace a host-provided implementation.
if (!globalThis.process) globalThis.process = bareProcess

const api = plugins([llmPlugin])

export function createQvacAdapter (opts = {}) {
  if (opts.homeDir) env.HOME = opts.homeDir
  return {
    loadModel: api.loadModel,
    completion: api.completion,
    cancel: api.cancel,
    unloadModel: api.unloadModel,
    close
  }
}
