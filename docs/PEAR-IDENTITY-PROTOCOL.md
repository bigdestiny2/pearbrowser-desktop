# Pear Identity Protocol (PIP) v1

**Status:** Draft standard, partially implemented in `pearbrowser-desktop` as of 2026-06-24.

PIP defines how one recoverable Pear identity is used across PearBrowser, `hyper://` apps, `pear://` apps, social trust, names, search, and future payments without turning the user's root key into a tracking identifier.

The short version: **one seed, many scoped keys**. The user backs up one phrase. Apps see a stable pairwise key for themselves. Only trust-bearing infrastructure sees root-signed bindings, and only where the user or protocol explicitly needs that relationship.

## 1. Design Sources

PIP borrows proven shapes, but keeps them local/P2P:

- **OpenID Connect pairwise subjects:** apps should receive a stable subject scoped to the relying party, not a universal account id. See OpenID Connect Core 1.0, "Subject Identifier Types" and privacy considerations: https://openid.net/specs/openid-connect-core-1_0.html
- **WebAuthn/passkeys:** authentication should be based on a private key held by the user's device/profile, with challenge/response style proofs and no password equivalent given to the app. See WebAuthn Level 3: https://www.w3.org/TR/webauthn-3/
- **DID Core verification relationships:** a key has a purpose. A key approved for authentication is not automatically approved for every update/signing purpose. See DID Core authentication relationship: https://www.w3.org/TR/did-1.0/#authentication
- **BIP-39 recovery UX:** human-readable backup phrases are still the best recovery primitive for non-custodial identities. See BIP-39: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
- **HKDF-style domain separation:** every derived key must be domain separated by protocol/version/purpose. See RFC 5869: https://www.rfc-editor.org/rfc/rfc5869

PearBrowser already uses a BIP-39 mnemonic/checksum as the backup format. Its internal seed derivation is Pear-specific (`entropyToSeed()`), not wallet-compatible BIP-39 PBKDF2/HMAC-SHA512. Treat the phrase as a Pear identity backup, not as a wallet seed.

## 2. Key Hierarchy

### PIP-KEY-1: Root Seed

The user has one local root entropy value stored in `identity.json`.

- Backup form: 12-word or 24-word BIP-39 mnemonic.
- At-rest protection: `seed-vault.cjs` wraps entropy with Argon2id plus secretbox when the user enables a passphrase.
- Recovery: restoring the phrase on a new device regenerates the same root seed and all deterministic app subjects.

### PIP-KEY-2: Root Ed25519 Key

The root Ed25519 key is derived in the worklet and **never exposed to pages**.

Use it only for:

- contacts and trusted-peer invites,
- root-signed IdentityBinding records,
- naming ownership,
- Nostr cross-curve attestation,
- future root migration and recovery proofs.

Do not use the root public key as a default web login id. That would make every app collude-able by design.

### PIP-KEY-3: App Subject Key

Each app gets a deterministic pairwise Ed25519 key:

```text
appSubkey = ed25519.seed_keypair(SHA-256(rootSeed || "pear-app-v1:" || driveKeyHex))
```

Properties:

- Same user plus same app drive = same `appPubkey` across devices and restores.
- Same user plus different app drive = different `appPubkey`.
- Apps can store accounts against `appPubkey` and recover after mnemonic restore.
- Apps cannot correlate the same human across unrelated apps unless the user grants an explicit binding flow.

### PIP-KEY-4: Purpose Bindings

When a verifier needs to know that a purpose key belongs to a root identity, publish an `IdentityBinding`:

```text
rootPubkey -> purposePubkey, purpose, version, rootSignature
```

Allowed purposes include `search`, `name`, `merchant`, `nostr`, `routing`, `login`, and `launch`. Bindings are purpose-specific and versioned. A binding minted for `search` does not satisfy `login` or `launch`.

Default app login does **not** include a root binding. Root binding is a higher-trust, higher-correlation action.

## 3. Login Protocol

### PIP-LOGIN-1: Page Token

PearBrowser serves app pages through the loopback proxy and injects a short-lived `pear-api-token`.

Apps must:

- read the token from `<meta name="pear-api-token">`,
- send it as `X-Pear-Token` on `/api/*`,
- never persist, log, or share the token.

### PIP-LOGIN-2: Sign-In Without Profile

An app can request sign-in with no scopes. The result is only a stable app subject:

```http
POST /api/login
{
  "scopes": [],
  "appName": "Peerit",
  "reason": "Restore your posts",
  "challenge": "base64url-random-nonce-from-the-app"
}
```

This should be the default for most apps.

The `challenge` field is optional for compatibility, but serious apps should
send a fresh high-entropy nonce for every sign-in attempt and verify that the
same value is present in the signed claims. This makes the attestation a
challenge/response proof instead of only a reusable grant receipt.

### PIP-LOGIN-3: Scoped Profile Grants

Supported scopes:

- `profile:read`
- `profile:name`
- `profile:contact`
- `profile:avatar`
- `profile:email`
- `profile:website`
- `contacts:read`

Unknown scopes are ignored. `pay` is not a live scope in v1.

The user may approve a narrower set than requested, including an empty set. Apps must branch on returned scopes, not requested scopes.

### PIP-LOGIN-4: Pear Passport Attestation

The login response includes the new canonical attestation plus legacy fields:

```json
{
  "protocol": "pear-passport-login-v1",
  "version": 1,
  "subject": "<appPubkey>",
  "appPubkey": "<appPubkey>",
  "driveKey": "<driveKeyHex>",
  "scopes": ["profile:name"],
  "grantedAt": 1782285203000,
  "issuedAt": 1782285204000,
  "expiresAt": 1784877204000,
  "claims": {
    "protocol": "pear-passport-login-v1",
    "version": 1,
    "driveKey": "<driveKeyHex>",
    "subject": "<appPubkey>",
    "appPubkey": "<appPubkey>",
    "scopes": ["profile:name"],
    "grantedAt": 1782285203000,
    "issuedAt": 1782285204000,
    "expiresAt": 1784877204000,
    "challenge": "base64url-random-nonce-from-the-app"
  },
  "proof": {
    "type": "PearPassportLoginProof",
    "algorithm": "ed25519",
    "publicKey": "<appPubkey>",
    "namespace": "passport-login",
    "signature": "<128-hex-ed25519-signature>"
  },
  "challenge": "base64url-random-nonce-from-the-app",
  "loginProof": "<legacy-login-signature>",
  "tag": "pear.app.<driveKeyHex>:login:"
}
```

Verification:

1. Check `protocol === "pear-passport-login-v1"` and `version === 1`.
2. Check `claims.driveKey`, `claims.appPubkey`, `subject`, and `proof.publicKey` match.
3. Check `expiresAt > now`.
4. Rebuild the canonical payload with `canonicalLoginPayload(claims)`.
5. If you supplied `challenge`, check `claims.challenge` equals it.
6. Reject unknown fields inside `claims`; unrecognized top-level fields are not
   signed protocol semantics.
7. Verify `proof.signature` against:

```text
"pear.app.<driveKeyHex>:passport-login:" || canonicalLoginPayload(claims)
```

The legacy `loginProof` remains for current apps that already verify the older `pear.app.<driveKey>:login:` proof.

### PIP-LOGIN-5: Grant Lifetime And Revocation

Default grant TTL is 30 days, and hosts should clamp custom UI TTLs to a maximum
of 30 days. Users can revoke per-app grants from Settings -> Permissions. Apps
must treat 401/403, missing grants, expired grants, and revoked grants as normal
recoverable states.

## 4. Launch Protocol

### PIP-LAUNCH-1: Static Hyperdrive Apps

For Tier A `hyper://` apps, the app drive key is the relying-party identifier. The same `driveKeyHex` feeds app subject derivation, login grants, sync namespaces, and swarm Tier-A topics.

### PIP-LAUNCH-2: Standalone `pear://` Apps

Launching a standalone app does not imply identity trust. PearBrowser may open the app in its own Pear window, but the user still sees a standalone prelaunch/trust warning.

Future PIP launch tickets should use the `launch` purpose:

```text
rootPubkey -> launchPubkey, purpose="launch", version, rootSignature
```

The browser can then pass a short-lived launch ticket to a standalone app without exposing the root key or granting ambient authority.

### PIP-LAUNCH-3: No Runtime Global Assumption

Apps must not assume the real Pear Runtime global when running in a browser tab. Use `/api/login`, `/api/identity`, `/api/sync`, and `swarm.v1`, feature-detected at runtime.

## 5. Recovery Protocol

### PIP-RECOVERY-1: User Recovery

The mnemonic is the primary recovery object. Restoring it recreates:

- root Ed25519 key,
- pairwise app subjects,
- Nostr key,
- deterministic invoice/session keys,
- future deterministic launch/login purpose keys.

### PIP-RECOVERY-2: App Account Recovery

Apps should key durable accounts by `appPubkey`, not cookies, localStorage, loopback origin, port, or random browser storage.

If an app also needs data recovery, it should store data in `window.pear.sync` or an app-owned Hypercore/Hyperbee replicated by the user's Pear identity, not in page-local storage.

### PIP-RECOVERY-3: Root Rotation

Changing the root phrase creates a new identity. Existing app subjects are not recoverable from the new root. A future migration flow should publish a root-signed migration:

```text
oldRoot -> newRoot, epoch, oldRootSignature, newRootCountersignature
```

Until that exists, UI must call root rotation "start fresh", not "change password".

## 6. Security Invariants

- Root secret never leaves the worklet.
- Root public key is not exposed to app pages by default.
- App pages receive only pairwise `appPubkey`.
- Every proof is domain separated by protocol, version, drive key, and namespace.
- Scopes are minimum necessary and deniable.
- Unknown scopes are ignored.
- Empty approved scope set is valid sign-in-only approval.
- Profile grants are per app and revocable.
- Page tokens are short-lived and loopback-origin scoped.
- The relay/catalogue/index room is an index, not an authority. Consumers re-verify signatures.

## 7. Implementation Map

| Area | File | Status |
|------|------|--------|
| Root seed, mnemonic, per-app keys | `backend/identity.js` | Implemented |
| At-rest encrypted seed vault | `backend/seed-vault.cjs` | Implemented |
| Canonical login attestation | `backend/identity-protocol.cjs` | Implemented |
| Login consent, grants, profile scopes | `backend/index.js`, `backend/profile.js`, `backend/http-bridge.js` | Implemented |
| Permission center/revocation UI | `ui/shell.js` | Implemented |
| Root-signed purpose bindings | `backend/identity-binding.cjs` | Implemented for current purposes, extended for `login` and `launch` |
| Standalone launch ticket handoff | n/a | Proposed |
| Root migration/recovery binding | n/a | Proposed |

## 8. App Author Checklist

- [ ] Treat `appPubkey` as your account id.
- [ ] Request no scopes for basic sign-in.
- [ ] Request profile/contact scopes only when needed.
- [ ] Verify returned `protocol`, `version`, expiry, `claims`, and `proof`.
- [ ] Handle denied login and expired grants without loops.
- [ ] Store durable account state in Pear sync/Hypercore, not `localStorage`.
- [ ] Never ask users to paste a root phrase into your app.
- [ ] Never infer cross-app identity unless the user completed an explicit binding flow.
