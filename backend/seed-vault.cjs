// seed-vault.cjs — SEC0: encrypt the BIP-39 root entropy AT REST. The seed is
// the keys to the user's identity + (future) funds; today it sits plaintext in
// identity.json. This wraps it in argon2id (sodium.crypto_pwhash) → authenticated
// secretbox (xsalsa20poly1305). Resolves the "which KDF under Bare" question with
// NO new deps and NO native addons (keytar/OS-keychain don't load under Bare):
// sodium-universal is already in the graph and ships argon2id + secretbox.
//
// On-disk vault (replaces the plaintext { entropy } in identity.json):
//   { v: 2, enc: 'argon2id-secretbox',
//     kdf: { salt: hex, opslimit, memlimit, alg: 'argon2id13' },
//     nonce: hex, cipher: hex }            // cipher = secretbox(entropy)
// Fail CLOSED: a wrong passphrase or any tamper makes secretbox_open fail.

const sodium = require('sodium-universal')
const b4a = require('b4a')

const VAULT_VERSION = 2
const ENC = 'argon2id-secretbox'

function deriveKey (passphrase, salt, opslimit, memlimit) {
  const key = b4a.alloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.crypto_pwhash(key, b4a.from(String(passphrase), 'utf8'), salt, opslimit, memlimit, sodium.crypto_pwhash_ALG_ARGON2ID13)
  return key
}

// Encrypt raw entropy (16 or 32 bytes) under a passphrase → the vault object.
function encryptEntropy (entropy, passphrase) {
  if (!b4a.isBuffer(entropy) && !(entropy instanceof Uint8Array)) throw new Error('entropy must be a Buffer')
  if (entropy.length !== 16 && entropy.length !== 32) throw new Error('entropy must be 16 or 32 bytes')
  if (typeof passphrase !== 'string' || passphrase.length === 0) throw new Error('passphrase must be a non-empty string')

  const salt = b4a.alloc(sodium.crypto_pwhash_SALTBYTES); sodium.randombytes_buf(salt)
  const opslimit = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE
  const memlimit = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
  const key = deriveKey(passphrase, salt, opslimit, memlimit)

  const nonce = b4a.alloc(sodium.crypto_secretbox_NONCEBYTES); sodium.randombytes_buf(nonce)
  const cipher = b4a.alloc(entropy.length + sodium.crypto_secretbox_MACBYTES)
  sodium.crypto_secretbox_easy(cipher, entropy, nonce, key)

  return {
    v: VAULT_VERSION,
    enc: ENC,
    kdf: { salt: b4a.toString(salt, 'hex'), opslimit, memlimit, alg: 'argon2id13' },
    nonce: b4a.toString(nonce, 'hex'),
    cipher: b4a.toString(cipher, 'hex'),
  }
}

function isEncryptedVault (obj) {
  return !!(obj && obj.v === VAULT_VERSION && obj.enc === ENC && obj.kdf &&
    typeof obj.kdf.salt === 'string' && Number.isInteger(obj.kdf.opslimit) &&
    Number.isInteger(obj.kdf.memlimit) && typeof obj.nonce === 'string' && typeof obj.cipher === 'string')
}

// Decrypt a vault → the entropy Buffer. Throws (fail-closed) on a wrong passphrase,
// a malformed vault, or any tampering.
function decryptEntropy (vault, passphrase) {
  if (!isEncryptedVault(vault)) throw new Error('not an encrypted seed vault')
  if (typeof passphrase !== 'string' || passphrase.length === 0) throw new Error('passphrase must be a non-empty string')
  let salt, nonce, cipher
  try {
    salt = b4a.from(vault.kdf.salt, 'hex')
    nonce = b4a.from(vault.nonce, 'hex')
    cipher = b4a.from(vault.cipher, 'hex')
  } catch { throw new Error('malformed vault encoding') }
  if (salt.length !== sodium.crypto_pwhash_SALTBYTES) throw new Error('bad salt length')
  if (nonce.length !== sodium.crypto_secretbox_NONCEBYTES) throw new Error('bad nonce length')
  if (cipher.length <= sodium.crypto_secretbox_MACBYTES) throw new Error('bad cipher length')

  const key = deriveKey(passphrase, salt, vault.kdf.opslimit, vault.kdf.memlimit)
  const out = b4a.alloc(cipher.length - sodium.crypto_secretbox_MACBYTES)
  if (!sodium.crypto_secretbox_open_easy(out, cipher, nonce, key)) {
    throw new Error('wrong passphrase or corrupt vault') // FAIL CLOSED
  }
  return out
}

module.exports = { encryptEntropy, decryptEntropy, isEncryptedVault, VAULT_VERSION }
