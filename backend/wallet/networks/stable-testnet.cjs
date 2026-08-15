'use strict'

function deepFreeze (value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

const PAYMENT_PROXY = '0x78Cf24370174180738C5B8E352B6D14c83a6c9A9'

// Release-owned network data. Runtime configuration may not replace any of
// these values. Update this file only through a dedicated WDK compatibility
// change with fresh two-provider evidence from scripts/check-wdk-network.mjs.
const STABLE_TESTNET = {
  manifestVersion: 1,
  evidenceDate: '2026-08-14',
  releasePosture: 'testnet-preview',
  networkId: 'stable-testnet',
  chain: {
    name: 'Stable Testnet',
    caip2: 'eip155:2201',
    idDecimal: 2201,
    idHex: '0x899',
    explorerUrl: 'https://testnet.stablescan.xyz'
  },
  providers: [
    {
      id: 'stable-official',
      operator: 'Stable',
      role: 'broadcast-and-read',
      url: 'https://rpc.testnet.stable.xyz'
    },
    {
      id: 'thirdweb-public',
      operator: 'thirdweb',
      role: 'independent-read',
      url: 'https://2201.rpc.thirdweb.com/'
    }
  ],
  nativeFeeAsset: {
    id: 'stable-testnet-native-usdt0',
    symbol: 'USDT0',
    decimals: 18,
    maxFeeAtomic: '100000000000000000'
  },
  paymentAsset: {
    id: 'stable-testnet-usdt0',
    symbol: 'USD₮0',
    transferMode: 'erc20',
    decimals: 6,
    maxPaymentAtomic: '10000000',
    proxyAddress: PAYMENT_PROXY,
    implementationAddress: '0x3f9E27457ac494fC729beB50e6af04Ec34e3828E',
    eip1967ImplementationSlot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
    proxyRuntimeCodeBytes: 2667,
    proxyRuntimeCodeKeccak256: '0x63ed5c26f94e91b94fc139f7fdcbb971b27954b8310ec79a3c17b46565fd28d0',
    implementationRuntimeCodeBytes: 17861,
    implementationRuntimeCodeKeccak256: '0x61466328a9d17e782f4a37d32db189f981ce32e45de6a4668c3f7bb1cd8d49ae'
  },
  transferPolicy: {
    accountIndex: 0,
    transactionType: 'eip1559',
    transactionTypeValue: 2,
    transactionTarget: PAYMENT_PROXY,
    transactionValueAtomic: '0',
    calldataSelector: '0xa9059cbb',
    maxPriorityFeePerGasAtomic: '0'
  },
  finality: {
    model: 'single-slot',
    minimumConfirmations: 1,
    providerQuorum: 2,
    maximumProviderHeadLag: 5,
    maximumBlockAgeSeconds: 120,
    maximumFutureClockSkewSeconds: 30,
    requireReceiptSuccess: true,
    requireTransferEvent: true,
    requireCommonBlockHash: true
  }
}

module.exports = deepFreeze(STABLE_TESTNET)
