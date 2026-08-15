'use strict'

// Canonical EIP-1559 envelope encoding shared by the WDK engine (host-side
// validation) and the WDK worker (in-worklet intent binding). Both sides must
// agree byte-for-byte on the unsigned transaction encoding, so this module is
// the single implementation.

const b4a = require('b4a')
const { keccak_256: keccak256 } = require('@noble/hashes/sha3.js')
const STABLE_TESTNET = require('./networks/stable-testnet.cjs')

function bytesFromAtomic (value) {
  const amount = BigInt(value)
  if (amount === 0n) return b4a.alloc(0)
  let hex = amount.toString(16)
  if (hex.length % 2 !== 0) hex = '0' + hex
  return b4a.from(hex, 'hex')
}

function encodeLength (length, offset) {
  if (length <= 55) return b4a.from([offset + length])
  const lengthBytes = bytesFromAtomic(String(length))
  return b4a.concat([b4a.from([offset + 55 + lengthBytes.length]), lengthBytes])
}

function rlpEncode (value) {
  if (Array.isArray(value)) {
    const payload = b4a.concat(value.map(rlpEncode))
    return b4a.concat([encodeLength(payload.length, 0xc0), payload])
  }
  const bytes = b4a.from(value)
  if (bytes.length === 1 && bytes[0] < 0x80) return bytes
  return b4a.concat([encodeLength(bytes.length, 0x80), bytes])
}

function hashBytes (value) {
  return '0x' + b4a.toString(keccak256(value), 'hex')
}

function expectedTransferCalldata (recipient, amountAtomic) {
  const addressWord = recipient.slice(2).toLowerCase().padStart(64, '0')
  const amountWord = BigInt(amountAtomic).toString(16).padStart(64, '0')
  return STABLE_TESTNET.transferPolicy.calldataSelector + addressWord + amountWord
}

function unsignedTransactionBytes (intent) {
  return b4a.concat([b4a.from([STABLE_TESTNET.transferPolicy.transactionTypeValue]), rlpEncode([
    bytesFromAtomic(String(intent.chainId)),
    bytesFromAtomic(intent.nonce),
    bytesFromAtomic(intent.maxPriorityFeePerGasAtomic),
    bytesFromAtomic(intent.maxFeePerGasAtomic),
    bytesFromAtomic(intent.gasLimit),
    b4a.from(intent.transactionTarget.slice(2), 'hex'),
    bytesFromAtomic(intent.transactionValueAtomic),
    b4a.from(intent.calldata.slice(2), 'hex'),
    []
  ])])
}

function unsignedTransactionHash (intent) {
  return hashBytes(unsignedTransactionBytes(intent))
}

module.exports = {
  bytesFromAtomic,
  rlpEncode,
  hashBytes,
  expectedTransferCalldata,
  unsignedTransactionBytes,
  unsignedTransactionHash
}
