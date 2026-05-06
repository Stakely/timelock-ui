import { keccak256, toBytes, encodeAbiParameters, parseAbiParameters } from 'viem'

// On-chain state for the OZ TimelockController
export const OperationState = {
  Unset: 0,
  Waiting: 1,
  Ready: 2,
  Done: 3,
} as const

export type OperationStateValue = (typeof OperationState)[keyof typeof OperationState]

export const STATE_LABELS: Record<number, string> = {
  0: 'Unset',
  1: 'Waiting',
  2: 'Ready',
  3: 'Done',
}

// Role hashes (keccak256 of the name, except DEFAULT_ADMIN_ROLE which is 0x00)
export const ROLE_HASHES = {
  TIMELOCK_ADMIN_ROLE: keccak256(toBytes('TIMELOCK_ADMIN_ROLE')),
  PROPOSER_ROLE: keccak256(toBytes('PROPOSER_ROLE')),
  EXECUTOR_ROLE: keccak256(toBytes('EXECUTOR_ROLE')),
  CANCELLER_ROLE: keccak256(toBytes('CANCELLER_ROLE')),
} as const

export type RoleName = keyof typeof ROLE_HASHES

// Replicates the hashOperation logic from the OZ contract
export function hashOperation(
  target: `0x${string}`,
  value: bigint,
  data: `0x${string}`,
  predecessor: `0x${string}`,
  salt: `0x${string}`,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('address, uint256, bytes, bytes32, bytes32'),
      [target, value, data, predecessor, salt],
    ),
  )
}

// Generates a cryptographically random 32-byte salt
export function generateSalt(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return ('0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}

// Formats seconds to "Xd Xh Xm"
export function formatDelay(seconds: bigint): string {
  const s = Number(seconds)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0 || parts.length === 0) parts.push(`${m}m`)
  return parts.join(' ')
}

// Time remaining until readyAt (unix timestamp in seconds)
export function timeUntilReady(readyAtSeconds: bigint): number {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return Math.max(0, Number(readyAtSeconds) - nowSeconds)
}

// Formats remaining seconds to "Xd Xh Xm Xs"
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

// Shortens an address or bytes32 for display in the UI
export function shortHex(hex: string, chars = 6): string {
  if (hex.length <= chars * 2 + 2) return hex
  return `${hex.slice(0, chars + 2)}…${hex.slice(-chars)}`
}

// Explorer URL for a transaction
export function explorerTxUrl(explorerUrl: string, txHash: string): string {
  return `${explorerUrl.replace(/\/$/, '')}/tx/${txHash}`
}

// Explorer URL for an address
export function explorerAddressUrl(explorerUrl: string, address: string): string {
  return `${explorerUrl.replace(/\/$/, '')}/address/${address}`
}
