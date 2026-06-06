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
 * Phase 0 (this file as shipped) implements only the wiring needed for
 * the privacy contract: a structured, honest "buyer not implemented"
 * response. The page's existing UI already feature-detects this and
 * surfaces a "private runtime unavailable" state, so the user is never
 * shown a fake answer. Phase 1 replaces the stub with the real seller
 * dial + receipt verification.
 *
 * Why not just leave window.pear.anongpt unset? Because the privacy
 * gate already validates that the loaded drive matches the anonGPT key
 * AND that manifest.json declares the four required privacy claims.
 * Once those gates pass, the page legitimately expects the API to be
 * present. Returning a structured fail-closed lets the page tell the
 * user "yes PearBrowser supports this, but the seller-dial layer
 * isn't wired yet" rather than "this PearBrowser does not support
 * anonGPT at all" — the former is the truth right now.
 */

class AnongptBuyer {
  constructor (opts = {}) {
    // Phase 1 will accept swarm + identity here. Phase 0 holds nothing.
    this._swarm = opts.swarm || null
    this._identity = opts.identity || null
    this._maxInputBytes = opts.maxInputBytes || 32 * 1024
  }

  /**
   * Handle one infer call from the page.
   *
   * Phase 0 behavior:
   *   - validate the request shape (input is a non-empty string under
   *     the byte cap; sellerPubkey is 64-hex if provided)
   *   - return ok:false with code:'buyer-not-implemented' so the page
   *     surfaces the fail-closed state the privacy contract demands
   *
   * Phase 1 behavior (replaces this body):
   *   - dial sellerPubkey over Hyperswarm (or resolve via signed Offer)
   *   - call ServiceProtocol 'ai.infer' with the request payload
   *   - verify the signed receipt locally via verifyReceipt()
   *   - return ok:true with the full response shape from the
   *     dev-bridge spec section 5
   */
  async infer (req) {
    const validation = this._validate(req)
    if (!validation.ok) return validation

    return {
      ok: false,
      code: 'buyer-not-implemented',
      message:
        'PearBrowser anonGPT bridge is wired and the privacy gate passed, ' +
        'but the seller-dial + receipt-verify layer is Phase 1 (not yet ' +
        'shipped in this PearBrowser). The page should remain in its ' +
        'fail-closed state until a PearBrowser build with the buyer ' +
        'implementation lands. See backend/anongpt-buyer.js.',
      route: { kind: 'none' }
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
