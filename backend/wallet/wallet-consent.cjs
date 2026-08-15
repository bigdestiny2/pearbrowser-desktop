'use strict'

// WalletConsentBroker — parks wallet prompts that need browser-chrome
// approval and bridges them to the chrome UI over WorkletRPC events, mirroring
// the login/swarm consent ceremonies in backend/index.js. Kept out of
// index.js so the parking machinery is testable without booting the backend.
//
// Phase D's HTTP wallet routes call request(prompt, tuple) after the wallet
// service has opened a pending prompt (payment / sign-app) or validated a
// connect request. The broker:
//   1. parks the prompt in _pending keyed by intentId,
//   2. emits the consent event to the chrome UI with a SAFE payload (identity
//      and display fields only — never tokens, manifests or secrets),
//   3. starts a timeout that auto-rejects with `prompt-expired`,
//   4. returns a Promise of the service's resolution result.
// The chrome UI resolves through resolve() (wired to CMD_WALLET_CONNECT_RESOLVE
// / CMD_WALLET_PAYMENT_RESOLVE), which re-checks expiresAt server-side before
// touching the service. Wallet lock, tab close and browser shutdown reject
// every parked prompt via rejectAll().

const DEFAULT_TIMEOUT_MS = 120 * 1000
const PROMPT_TYPES = Object.freeze(['connect', 'payment', 'sign-app'])

function fail (code, message) {
  const err = new Error(message || code)
  err.code = code
  return err
}

class WalletConsentBroker {
  /**
   * @param {object} opts
   * @param {WalletService} opts.walletService
   * @param {Function} opts.emit — (evt, safePayload) push to the chrome UI
   * @param {object} opts.events — { connect, payment, txUpdate } numeric event IDs
   * @param {number} [opts.timeoutMs] — default 120s, matching the service prompt TTL
   * @param {Function} [opts.now]
   */
  constructor (opts = {}) {
    if (!opts || typeof opts !== 'object') throw new Error('WalletConsentBroker requires options')
    if (!opts.walletService || typeof opts.walletService !== 'object') {
      throw new Error('WalletConsentBroker requires a WalletService')
    }
    if (typeof opts.emit !== 'function') throw new Error('WalletConsentBroker requires an emit function')
    const events = opts.events || {}
    for (const key of ['connect', 'payment', 'txUpdate']) {
      if (!Number.isSafeInteger(events[key])) throw new Error(`WalletConsentBroker requires events.${key}`)
    }
    if (opts.now !== undefined && typeof opts.now !== 'function') throw new Error('now must be a function')
    this._service = opts.walletService
    this._emit = opts.emit
    this._events = Object.freeze({ ...events })
    this._now = typeof opts.now === 'function' ? opts.now : Date.now
    this._timeoutMs = Number.isSafeInteger(opts.timeoutMs) && opts.timeoutMs > 0
      ? opts.timeoutMs
      : DEFAULT_TIMEOUT_MS
    this._pending = new Map()
  }

  get pendingCount () { return this._pending.size }

  // The event payload is the ONLY thing the chrome UI (and any observer of
  // the RPC stream) ever sees: display fields projected from the canonical
  // intent. tuple, token, manifest and idempotency material stay parked
  // server-side and never cross.
  _safePayload (prompt) {
    const intent = prompt.intent || {}
    const payload = {
      intentId: prompt.intentId,
      type: prompt.type,
      driveKey: typeof intent.driveKey === 'string' ? intent.driveKey : null,
      manifestSha256: typeof intent.manifestSha256 === 'string' ? intent.manifestSha256 : null,
      expiresAt: prompt.expiresAt
    }
    // Display-only app name: payment/sign prompts carry it on the prompt
    // (from the connection record); connect intents carry it on the intent.
    const appName = typeof prompt.appName === 'string' && prompt.appName.length > 0
      ? prompt.appName
      : intent.appName
    if (typeof appName === 'string' && appName.length > 0) payload.appName = appName
    if (prompt.type === 'payment') {
      payload.recipient = intent.recipient || null
      payload.amountAtomic = intent.amountAtomic || null
      if (typeof intent.reference === 'string') payload.reference = intent.reference
      // Pre-approval fee quote (display fields only; all 18-decimal native
      // atomic strings computed by the wallet service).
      const quote = prompt.quote
      if (quote && typeof quote === 'object' && !Array.isArray(quote)) {
        if (typeof quote.estimatedFeeAtomic === 'string') payload.estimatedFeeAtomic = quote.estimatedFeeAtomic
        if (typeof quote.maxFeeAtomic === 'string') payload.maxFeeAtomic = quote.maxFeeAtomic
        if (typeof quote.maxTotalDebitAtomic === 'string') payload.maxTotalDebitAtomic = quote.maxTotalDebitAtomic
      }
    } else if (prompt.type === 'sign-app') {
      payload.payloadHash = intent.payloadHash || null
    } else {
      payload.chainId = intent.chainId || null
      payload.assetId = intent.assetId || null
      // Granted capabilities, so the connect prompt can say what the app
      // will be allowed to do (pay / sign-app), not just "connect".
      if (prompt.permissions && typeof prompt.permissions === 'object') {
        payload.permissions = Object.freeze({
          pay: prompt.permissions.pay === true,
          signApp: prompt.permissions.signApp === true
        })
      }
    }
    return payload
  }

  _eventFor (type) {
    return type === 'connect' ? this._events.connect : this._events.payment
  }

  /**
   * Park a prompt for chrome approval.
   * @param {object} prompt — { type, intentId, intent, expiresAt } as returned
   *   by the wallet service; connect prompts additionally carry the validated
   *   { token, manifest } the service needs on approval (never emitted).
   * @param {object} tuple — connection tuple { browserSessionId, tabId, driveKey, walletTabOrigin? }
   * @returns {Promise<object>} the service's resolution result
   */
  request (prompt, tuple) {
    if (!prompt || typeof prompt !== 'object' || Array.isArray(prompt)) {
      throw fail('bad-request', 'wallet prompt must be a record')
    }
    if (!PROMPT_TYPES.includes(prompt.type)) throw fail('bad-request', 'wallet prompt type is invalid')
    if (typeof prompt.intentId !== 'string' || prompt.intentId.length === 0) {
      throw fail('bad-request', 'wallet prompt intentId is invalid')
    }
    if (!Number.isSafeInteger(prompt.expiresAt)) throw fail('bad-request', 'wallet prompt expiresAt is invalid')
    if (this._pending.has(prompt.intentId)) {
      throw fail('wallet-busy', 'a wallet prompt with that intentId is already pending')
    }

    return new Promise((resolve, reject) => {
      // Never outlive the service-side prompt: fire at the earlier of the
      // broker timeout and the prompt's own expiry.
      const ttl = Math.max(1, Math.min(this._timeoutMs, prompt.expiresAt - this._now()))
      const timer = setTimeout(() => { this._expire(prompt.intentId) }, ttl)
      this._pending.set(prompt.intentId, { prompt, tuple, resolve, reject, timer })
      try {
        this._emit(this._eventFor(prompt.type), this._safePayload(prompt))
      } catch {}
    })
  }

  // Timeout path: reject the parked promise with `prompt-expired` and release
  // the service-side prompt best-effort (the service journals its own
  // expired/rejected outcome; either is safe — ambiguity never spends).
  async _expire (intentId) {
    const parked = this._pending.get(intentId)
    if (!parked) return
    this._pending.delete(intentId)
    clearTimeout(parked.timer)
    if (parked.prompt.type !== 'connect') {
      try { await this._service.resolvePrompt(intentId, false) } catch {}
    }
    parked.reject(fail('prompt-expired', 'wallet prompt expired before the user responded'))
  }

  /**
   * Resolve a parked prompt after the chrome user decides.
   * @param {string} intentId
   * @param {boolean} approved
   * @param {string|string[]} [expectedTypes] — guard so the connect resolve
   *   command cannot settle a value prompt and vice versa
   */
  async resolve (intentId, approved, expectedTypes) {
    const parked = this._pending.get(intentId)
    if (!parked) throw fail('not-found', 'no such pending wallet prompt')
    if (expectedTypes !== undefined) {
      const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes]
      if (!types.includes(parked.prompt.type)) {
        throw fail('bad-request', 'wallet prompt type does not match this resolve command')
      }
    }
    if (this._now() > parked.prompt.expiresAt) {
      this._pending.delete(intentId)
      clearTimeout(parked.timer)
      parked.reject(fail('prompt-expired', 'wallet prompt has expired'))
      throw fail('prompt-expired', 'wallet prompt has expired')
    }
    this._pending.delete(intentId)
    clearTimeout(parked.timer)

    let result
    try {
      if (parked.prompt.type === 'connect') {
        result = approved === true
          ? await this._service.connect(parked.tuple, parked.prompt.token, parked.prompt.manifest)
          : Object.freeze({ intentId, state: 'rejected' })
      } else {
        result = await this._service.resolvePrompt(intentId, approved === true)
      }
    } catch (err) {
      parked.reject(err)
      throw err
    }
    if (parked.prompt.type === 'payment') this._emitTxUpdate(result)
    parked.resolve(result)
    return result
  }

  // Sanitized transaction outcome so the chrome UI (and the tab's HTTP
  // handler, via the parked promise) can observe settlement.
  _emitTxUpdate (result) {
    if (!result || typeof result !== 'object') return
    const payload = { intentId: result.intentId, state: result.state }
    if (typeof result.transactionHash === 'string') payload.transactionHash = result.transactionHash
    try {
      this._emit(this._events.txUpdate, payload)
    } catch {}
  }

  // Wallet lock / tab close / browser shutdown: every parked prompt fails
  // closed. The service cancels its own pending prompt on lock/disconnect.
  rejectAll (code = 'cancelled') {
    const err = fail(code, `wallet prompt cancelled: ${code}`)
    for (const parked of this._pending.values()) {
      clearTimeout(parked.timer)
      parked.reject(err)
    }
    this._pending.clear()
  }
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  PROMPT_TYPES,
  WalletConsentBroker
}
