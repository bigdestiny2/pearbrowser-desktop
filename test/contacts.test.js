// Tests for backend/contacts.js — invite signature verification at import.
//
// Exercises the REAL Contacts class against a real on-disk Corestore (runs
// under node, like names.test.js). The injected verifier mirrors
// backend/identity.js verify() EXACTLY (same sodium-universal ed25519 detached
// verify), so these tests lock the security contract: add() must reject
// tampered / forged / malformed invite signatures and fail closed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Corestore from 'corestore'
import sodium from 'sodium-universal'
import b4a from 'b4a'
import contactsMod from '../backend/contacts.js'
const { Contacts } = contactsMod

const NOW = 1700000000000

// --- mirror of backend/identity.js verify() (real ed25519) -----------------
function verify (payload, signatureHex, publicKeyHex) {
  try {
    const signature = b4a.from(String(signatureHex), 'hex')
    const publicKey = b4a.from(String(publicKeyHex), 'hex')
    if (signature.length !== sodium.crypto_sign_BYTES) return false
    if (publicKey.length !== sodium.crypto_sign_PUBLICKEYBYTES) return false
    const message = typeof payload === 'string' ? b4a.from(payload, 'utf-8') : b4a.from(payload || [])
    if (message.length === 0) return false
    return sodium.crypto_sign_verify_detached(signature, message, publicKey)
  } catch {
    return false
  }
}

// --- helpers: mint a real ed25519 keypair + sign the canonical invite -------
function newKeypair () {
  const pk = b4a.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const sk = b4a.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_keypair(pk, sk)
  return { pubHex: b4a.toString(pk, 'hex'), sk }
}
function signMsg (message, sk) {
  const sig = b4a.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(sig, b4a.from(message, 'utf-8'), sk)
  return b4a.toString(sig, 'hex')
}
// must match backend/contacts.js add(): `pear.contact:<lowercased-pubkey>:<trimmedName>`
function inviteMessage (pubHex, displayName) {
  return `pear.contact:${pubHex.toLowerCase()}:${displayName}`
}

async function withContacts (opts, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'contacts-test-'))
  try {
    const store = new Corestore(dir)
    await store.ready()
    const contacts = new Contacts(store, { now: () => NOW, ...opts })
    await contacts.ready()
    await fn(contacts)
    await contacts.close()
    await store.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('valid invite signature is accepted and recorded as verified', async () => {
  await withContacts({ verify }, async (contacts) => {
    const { pubHex, sk } = newKeypair()
    const signature = signMsg(inviteMessage(pubHex, 'Alice'), sk)
    const rec = await contacts.add({ pubkey: pubHex, displayName: 'Alice', signature })
    assert.equal(rec.pubkey, pubHex.toLowerCase())
    assert.equal(rec.displayName, 'Alice')
    assert.equal(rec.signature, signature.toLowerCase())
    assert.equal(rec.verifiedAt, NOW)
    // persisted through a fresh read
    const got = await contacts.lookup(pubHex)
    assert.equal(got.verifiedAt, NOW)
    assert.equal(got.signature, signature.toLowerCase())
  })
})

test('tampered displayName (sig minted over a different name) is rejected', async () => {
  await withContacts({ verify }, async (contacts) => {
    const { pubHex, sk } = newKeypair()
    const signature = signMsg(inviteMessage(pubHex, 'Alice'), sk)
    await assert.rejects(
      () => contacts.add({ pubkey: pubHex, displayName: 'Mallory', signature }),
      /signature invalid/
    )
    assert.equal(await contacts.lookup(pubHex), null) // nothing persisted
  })
})

test('tampered signature bytes are rejected', async () => {
  await withContacts({ verify }, async (contacts) => {
    const { pubHex, sk } = newKeypair()
    const sig = signMsg(inviteMessage(pubHex, 'Alice'), sk)
    const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
    await assert.rejects(
      () => contacts.add({ pubkey: pubHex, displayName: 'Alice', signature: flipped }),
      /signature invalid/
    )
  })
})

test('signature by the wrong key (impersonation) is rejected', async () => {
  await withContacts({ verify }, async (contacts) => {
    const victim = newKeypair()
    const attacker = newKeypair()
    // attacker signs the victim's canonical invite message with their own key
    const signature = signMsg(inviteMessage(victim.pubHex, 'Alice'), attacker.sk)
    await assert.rejects(
      () => contacts.add({ pubkey: victim.pubHex, displayName: 'Alice', signature }),
      /signature invalid/
    )
  })
})

test('malformed (non-hex) signature is rejected before verify', async () => {
  await withContacts({ verify }, async (contacts) => {
    const { pubHex } = newKeypair()
    await assert.rejects(
      () => contacts.add({ pubkey: pubHex, displayName: 'Alice', signature: 'not-hex!!' }),
      /malformed/
    )
  })
})

test('signed invite is refused when no verifier is configured (fail closed)', async () => {
  await withContacts({ /* no verify */ }, async (contacts) => {
    const { pubHex, sk } = newKeypair()
    const signature = signMsg(inviteMessage(pubHex, 'Alice'), sk)
    await assert.rejects(
      () => contacts.add({ pubkey: pubHex, displayName: 'Alice', signature }),
      /no verifier is configured/
    )
  })
})

test('unsigned invite is still accepted (backward compatible) and marked unverified', async () => {
  await withContacts({ verify }, async (contacts) => {
    const { pubHex } = newKeypair()
    const rec = await contacts.add({ pubkey: pubHex, displayName: 'Bob' })
    assert.equal(rec.displayName, 'Bob')
    assert.equal(rec.signature, null)
    assert.equal(rec.verifiedAt, null)
  })
})

test('update() cannot forge verification state', async () => {
  await withContacts({ verify }, async (contacts) => {
    const { pubHex } = newKeypair()
    await contacts.add({ pubkey: pubHex, displayName: 'Bob' }) // unverified
    const updated = await contacts.update(pubHex, {
      displayName: 'Bobby', verifiedAt: NOW, signature: 'deadbeef',
    })
    assert.equal(updated.displayName, 'Bobby')
    assert.equal(updated.verifiedAt, null) // not forgeable via update()
    assert.equal(updated.signature, null)
  })
})
