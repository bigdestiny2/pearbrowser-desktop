/**
 * AnongptBuyer — page-scoped private buyer for the anonGPT app.
 *
 * Implements the runtime side of the PearBrowser anonGPT dev bridge
 * described in anongpt/docs/spec/02-pearbrowser-dev-bridge.md.
 *
 * The page-side surface is exactly one method:
 *
 *   await window.pear.anongpt.infer({
 *     input,           // user prompt
 *     sellerPubkey,    // 64-hex transport key of the HiveMind seller
 *     options,         // { maxTokens: 160 }
 *     rateCard         // { perCall, perInputToken, perOutputToken }
 *   })
 *
 * Privacy contract (anongpt/docs/spec/01-privacy-by-design.md):
 *   - never expose generic DHT/fs/shell APIs to the page
 *   - never expose buyer or seller private keys to the page
 *   - dial the seller directly over Hyperswarm and call ai.infer
 *   - verify the signed receipt locally before returning
 *   - return the answer text + signed receipt + verify result
 *   - fail closed if any of the above can't be honored
 *
 * Implementation status:
 *
 *   PHASE 1a (this file as shipped) — implements the real seller dial.
 *     Each call spins up a per-request Hyperswarm + ServiceProtocol,
 *     joins the seller's transport-key topic, awaits channel-open,
 *     and calls `ai.infer`. Returns the seller's actual text + signed
 *     receipt to the page. The `verify` field is returned as
 *     { ok: false, reason: 'verifyReceipt port pending Phase 1b' } so
 *     the page's privacy guard still treats the answer as untrusted
 *     and must surface that explicitly. This is fail-closed by design.
 *
 *   PHASE 1b (next commit) — ports HiveMind's verifyReceipt() + its
 *     canonical.js / identity.js deps using Bare-compatible crypto.
 *     Once that lands, `verify.ok = true` becomes possible and the
 *     UI can show the answer as trusted.
 *
 *   PHASE 2 (future) — Offer-based seller discovery (signed offer in
 *     place of pasted sellerPubkey), CircuitRelay fallback when
 *     direct dial fails.
 *
 * Per-call swarm trade-off: Phase 1a creates a fresh Hyperswarm per
 * infer call so the buyer state stays isolated (no leftover channel
 * subscriptions between calls). This is the same pattern HiveMind's
 * own reference buyer in bin/buyer.js uses. Phase 2 will optimize
 * to a long-lived swarm + protocol with topic add/remove.
 */

const DEFAULT_INFER_TIMEOUT_MS = 60_000
const DEFAULT_DIAL_TIMEOUT_MS = 20_000

class AnongptBuyer {
  constructor (opts = {}) {
    this._maxInputBytes = opts.maxInputBytes || 32 * 1024
    this._inferTimeoutMs = opts.inferTimeoutMs || DEFAULT_INFER_TIMEOUT_MS
    this._dialTimeoutMs = opts.dialTimeoutMs || DEFAULT_DIAL_TIMEOUT_MS
    // Statically-imported ESM modules injected from the root index.js.
    // See backend/pear-adapter.cjs bootBackend() — the root passes
    // { ServiceRegistry, ServiceProtocol } down because dynamic
    // import() from a CommonJS file in Bare has no referrer URL and
    // can't resolve any specifier form.
    this._services = opts.services || null
  }

  /**
   * Resolve ServiceRegistry / ServiceProtocol / Hyperswarm / b4a once.
   * The ESM bits come from the injected `services` object; the CJS bits
   * (hyperswarm, b4a) are loaded with plain require().
   */
  _resolveModules () {
    if (this._mods) return this._mods
    if (!this._services || !this._services.ServiceRegistry || !this._services.ServiceProtocol) {
      const err = new Error('AnongptBuyer: ServiceRegistry/ServiceProtocol not provided (root index.js must pass them via bootBackend({ esmModules }))')
      err.code = 'modules-unavailable'
      throw err
    }
    const Hyperswarm = require('hyperswarm')
    const b4a = require('b4a')
    this._mods = {
      ServiceRegistry: this._services.ServiceRegistry,
      ServiceProtocol: this._services.ServiceProtocol,
      Hyperswarm,
      b4a
    }
    return this._mods
  }

  /**
   * Handle one infer call from the page.
   *
   * Phase 1a flow:
   *   1. validate request shape (cheap — pre-network)
   *   2. require sellerPubkey (Phase 2 will accept signed Offers)
   *   3. lazy-load ServiceRegistry/ServiceProtocol/Hyperswarm
   *   4. open a per-call Hyperswarm + ServiceProtocol
   *   5. swarm.join(sellerKey, { client: true })
   *   6. await channel-open from the seller (with dial timeout)
   *   7. protocol.request('ai', 'infer', { input, options })
   *      (with inference timeout)
   *   8. cleanup swarm/protocol regardless of outcome
   *   9. return { ok, result, verify, route } in the dev-bridge shape
   *
   * Phase 1b will replace the verify stub with real verifyReceipt().
   */
  async infer (req) {
    const validation = this._validate(req)
    if (!validation.ok) return validation
    if (!req.sellerPubkey) {
      return {
        ok: false,
        code: 'missing-seller',
        message: 'sellerPubkey is required (Offer-based discovery is Phase 2).',
        route: { kind: 'none' }
      }
    }
    const sellerHex = req.sellerPubkey.toLowerCase()
    let mods
    try {
      mods = this._resolveModules()
    } catch (e) {
      return {
        ok: false,
        code: e.code || 'modules-unavailable',
        message: e && e.message,
        route: { kind: 'none' }
      }
    }
    const { ServiceRegistry, ServiceProtocol, Hyperswarm, b4a } = mods
    const sellerKey = b4a.from(sellerHex, 'hex')

    const registry = new ServiceRegistry()
    const protocol = new ServiceProtocol(registry)
    const swarm = new Hyperswarm()

    // Wire connection → protocol BEFORE joining so we don't miss the
    // first peer arriving while listeners aren't attached yet.
    swarm.on('connection', (conn) => {
      try { protocol.attach(conn) } catch (_) {}
    })

    let dialTimer = null
    let inferTimer = null
    const cleanup = async () => {
      if (dialTimer) clearTimeout(dialTimer)
      if (inferTimer) clearTimeout(inferTimer)
      try { protocol.destroy() } catch (_) {}
      try { await swarm.destroy() } catch (_) {}
    }

    try {
      // Wait for the seller's channel to open. We resolve only when
      // the remotePubkey of the channel matches sellerHex — anyone
      // else who happens to peer with us is ignored.
      const channelOpened = new Promise((resolve, reject) => {
        const onChannelOpen = (info) => {
          if (info && info.remotePubkey === sellerHex) {
            protocol.removeListener('channel-open', onChannelOpen)
            resolve()
          }
        }
        protocol.on('channel-open', onChannelOpen)
        dialTimer = setTimeout(() => {
          protocol.removeListener('channel-open', onChannelOpen)
          reject(new Error('dial-timeout: no channel from ' + sellerHex.slice(0, 12) + '… within ' + (this._dialTimeoutMs / 1000) + 's'))
        }, this._dialTimeoutMs)
      })

      swarm.join(sellerKey, { client: true, server: false })

      try {
        await channelOpened
      } catch (err) {
        await cleanup()
        return {
          ok: false,
          code: 'dial-failed',
          message: err.message,
          route: { kind: 'none' }
        }
      }

      // Channel open — call ai.infer with the user's payload. Bound by
      // a separate inference timeout because real model calls can take
      // tens of seconds.
      const inferPayload = { input: req.input }
      if (req.options && typeof req.options === 'object') {
        inferPayload.options = req.options
      }

      let serverResult
      try {
        serverResult = await Promise.race([
          protocol.request(sellerHex, 'ai', 'infer', inferPayload),
          new Promise((_, reject) => {
            inferTimer = setTimeout(
              () => reject(new Error('infer-timeout: seller did not return within ' + (this._inferTimeoutMs / 1000) + 's')),
              this._inferTimeoutMs
            )
          })
        ])
      } catch (err) {
        await cleanup()
        return {
          ok: false,
          code: 'infer-failed',
          message: err && err.message,
          route: { kind: 'direct-p2p', sellerPubkey: sellerHex }
        }
      }

      await cleanup()

      if (!serverResult || typeof serverResult !== 'object') {
        return {
          ok: false,
          code: 'infer-bad-response',
          message: 'seller returned a non-object response',
          route: { kind: 'direct-p2p', sellerPubkey: sellerHex }
        }
      }

      // Phase 1a: return the answer + receipt as-is, with verify stub.
      // Privacy contract: verify.ok = false means UI must show the
      // answer as untrusted (or refuse to show it). The receipt is
      // preserved so a Phase 1b client can later replay verification.
      return {
        ok: true,
        result: {
          text: serverResult.text,
          promptTokens: serverResult.promptTokens,
          tokens: serverResult.tokens,
          tokensPerSecond: serverResult.tokensPerSecond,
          backendDevice: serverResult.backendDevice,
          receipt: serverResult.receipt
        },
        verify: {
          ok: false,
          reason: 'verifyReceipt-port-pending-phase-1b',
          detail: 'PearBrowser received a signed receipt but does not yet locally verify it. UI must surface this as "answer present, NOT trusted".'
        },
        route: { kind: 'direct-p2p', sellerPubkey: sellerHex }
      }
    } catch (err) {
      // Anything truly unexpected — emit a generic error and ensure
      // the swarm is torn down.
      await cleanup()
      return {
        ok: false,
        code: 'buyer-error',
        message: err && err.message,
        route: { kind: 'none' }
      }
    }
  }

  /**
   * Shape validation for the infer request body. Cheap; runs before
   * any network/crypto so a malformed page can't tie up resources.
   */
  _validate (req) {
    if (!req || typeof req !== 'object') {
      return { ok: false, code: 'invalid-request', message: 'request body must be an object' }
    }
    const { input, sellerPubkey } = req
    if (typeof input !== 'string' || input.length === 0) {
      return { ok: false, code: 'invalid-request', message: '`input` must be a non-empty string' }
    }
    if (Buffer.byteLength(input, 'utf-8') > this._maxInputBytes) {
      return {
        ok: false,
        code: 'input-too-large',
        message: '`input` exceeds maxInputBytes (' + this._maxInputBytes + ')'
      }
    }
    if (sellerPubkey != null) {
      if (typeof sellerPubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(sellerPubkey)) {
        return {
          ok: false,
          code: 'invalid-request',
          message: '`sellerPubkey` must be 64-char hex if provided'
        }
      }
    }
    return { ok: true }
  }
}

module.exports = { AnongptBuyer }
