import bareProcess from 'bare-process'
import os from 'bare-os'
import path from 'bare-path'
import { createLazyQvacService } from '../backend/ai/qvac-host.mjs'

if (!globalThis.process) globalThis.process = bareProcess

const origin = 'pear://pearbrowser-qvac-native-smoke'
const prompt = process.argv.slice(2).join(' ') || 'Reply with exactly: QVAC native smoke passed.'
const smokeHome = process.env.QVAC_SMOKE_HOME || path.join(os.tmpdir(), 'pearbrowser-qvac-native-smoke')
const localModelPath = process.env.QVAC_SMOKE_MODEL_PATH
const modelAlias = localModelPath ? 'local-model' : 'pear-small-chat'
const device = process.env.QVAC_SMOKE_DEVICE || 'cpu'
const models = localModelPath
  ? {
      [modelAlias]: {
        modelSrc: localModelPath,
        modelType: 'llamacpp-completion',
        modelConfig: {
          device,
          gpu_layers: device === 'gpu' ? 99 : 0,
          ctx_size: 1024
        }
      }
    }
  : undefined
const service = createLazyQvacService({
  homeDir: smokeHome,
  models,
  maxOutputTokens: 32
})

let shuttingDown = false
async function shutdown (code) {
  if (shuttingDown) return
  shuttingDown = true
  try { await service.close() } catch (err) { console.error('[qvac-smoke] cleanup failed:', err?.message || err) }
  if (globalThis.Pear?.exit) Pear.exit(code)
  else process.exit(code)
}

if (globalThis.Pear?.teardown) Pear.teardown(() => shutdown(0))

try {
  console.log(`[qvac-smoke] runtime=Pear/Bare model=${modelAlias} device=${device}`)
  if (localModelPath) console.log(`[qvac-smoke] model-path=${localModelPath}`)
  console.log(`[qvac-smoke] storage=${smokeHome}`)
  if (!localModelPath) console.log('[qvac-smoke] first run downloads about 386 MB; later runs use QVAC cache')
  const run = service.complete({
    origin,
    model: modelAlias,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 32,
    temperature: 0
  })

  let lastPercentage = -1
  for await (const event of run.events) {
    if (event.type === 'model-progress') {
      const percentage = event.progress?.percentage
      const rounded = Number.isFinite(percentage) ? Math.round(percentage) : -1
      if (rounded !== -1 && rounded !== lastPercentage) {
        lastPercentage = rounded
        process.stdout.write(`\r[qvac-smoke] model ${rounded}%`)
      }
    } else if (event.type === 'text') {
      process.stdout.write(event.delta)
    } else if (event.type === 'stats') {
      console.log(`\n[qvac-smoke] stats ${JSON.stringify(event.stats)}`)
    }
  }
  const result = await run.final
  console.log(`\n[qvac-smoke] PASS finish=${result.finishReason} chars=${result.text.length}`)
  await shutdown(0)
} catch (err) {
  console.error('\n[qvac-smoke] FAIL', err?.stack || err)
  await shutdown(1)
}
