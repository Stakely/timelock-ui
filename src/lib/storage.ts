// Typed layer over localStorage. All accesses are guarded with a
// `typeof window !== 'undefined'` check in case the UI is embedded in a
// windowless environment (e.g. future SSR or Node tests).

export interface StoredNetwork {
  chainId: number
  name: string
  rpcUrl: string
  currencySymbol: string
  explorerUrl: string  // Base explorer URL, e.g. https://etherscan.io
}

export interface StoredTimelock {
  address: `0x${string}`
  name: string
  chainId: number
  // Block where the contract was deployed. Detected via getCode binary search
  // when the timelock is saved. Used as the initial sync cursor so we don't
  // scan from genesis. May be absent if the RPC didn't support historical state.
  deployBlock?: number
}

// On-chain state: 0=Unset, 1=Waiting, 2=Ready, 3=Done
export type OperationState = 0 | 1 | 2 | 3

export interface StoredOperation {
  id: `0x${string}`            // hashOperation result
  timelockAddress: `0x${string}`
  chainId: number
  // operation parameters
  target: `0x${string}`
  value: string                // bigint serialized as string
  data: `0x${string}`
  predecessor: `0x${string}`
  salt?: `0x${string}`         // undefined if discovered on-chain without a salt
  delay: string                // bigint serialized as string
  // metadatos UI
  label: string
  source: 'local' | 'chain'   // 'local' = scheduled from this UI, 'chain' = discovered via getLogs
  methodSignature?: string     // e.g. "grantRole(bytes32,address)"
  scheduledAt: number          // JS timestamp (ms) when scheduled (0 if from chain)
  scheduleTxHash?: `0x${string}`
  executeTxHash?: `0x${string}`
  cancelTxHash?: `0x${string}`
}

// ─── Storage keys ───────────────────────────────────────────────────────────

const KEYS = {
  networks: 'tl-ui:networks',
  activeNetwork: 'tl-ui:active-network',
  timelocks: 'tl-ui:timelocks',
  activeTimelock: 'tl-ui:active-timelock',
  operations: (chainId: number, address: string) =>
    `tl-ui:operations:${chainId}:${address.toLowerCase()}`,
  syncCursor: (chainId: number, address: string) =>
    `tl-ui:sync-cursor:${chainId}:${address.toLowerCase()}`,
} as const

// ─── Internal helpers ───────────────────────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function remove(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

// ─── Networks ──────────────────────────────────────────────────────────────

const DEFAULT_NETWORKS: StoredNetwork[] = [
  {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://ethereum-json-rpc.stakely.io',
    currencySymbol: 'ETH',
    explorerUrl: 'https://etherscan.io',
  },
  {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    currencySymbol: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  {
    chainId: 560048,
    name: 'Hoodi',
    rpcUrl: 'https://rpc.hoodi.ethpandaops.io',
    currencySymbol: 'ETH',
    explorerUrl: 'https://hoodi.ethpandaops.io',
  },
]

export function getNetworks(): StoredNetwork[] {
  const stored = read<StoredNetwork[]>(KEYS.networks, [])
  // If nothing is stored, return the defaults
  return stored.length > 0 ? stored : DEFAULT_NETWORKS
}

export function saveNetworks(networks: StoredNetwork[]): void {
  write(KEYS.networks, networks)
}

export function getActiveChainId(): number | null {
  return read<number | null>(KEYS.activeNetwork, null)
}

export function setActiveChainId(chainId: number): void {
  write(KEYS.activeNetwork, chainId)
}

// ─── Timelocks ──────────────────────────────────────────────────────────────

export function getTimelocks(): StoredTimelock[] {
  return read<StoredTimelock[]>(KEYS.timelocks, [])
}

export function saveTimelocks(timelocks: StoredTimelock[]): void {
  write(KEYS.timelocks, timelocks)
}

export function getActiveTimelockAddress(): `0x${string}` | null {
  return read<`0x${string}` | null>(KEYS.activeTimelock, null)
}

export function setActiveTimelockAddress(address: `0x${string}` | null): void {
  if (address === null) {
    remove(KEYS.activeTimelock)
  } else {
    write(KEYS.activeTimelock, address)
  }
}

// ─── Operations ──────────────────────────────────────────────────────────────

export function getOperations(chainId: number, timelockAddress: string): StoredOperation[] {
  return read<StoredOperation[]>(KEYS.operations(chainId, timelockAddress), [])
}

export function saveOperations(
  chainId: number,
  timelockAddress: string,
  operations: StoredOperation[],
): void {
  write(KEYS.operations(chainId, timelockAddress), operations)
}

export function upsertOperation(op: StoredOperation): void {
  const ops = getOperations(op.chainId, op.timelockAddress)
  const idx = ops.findIndex((o) => o.id === op.id)
  if (idx >= 0) {
    const existing = ops[idx]
    // Do not overwrite rich local data with sparse chain data
    ops[idx] = {
      ...existing,
      ...op,
      // If the existing entry has a salt and the new one doesn't, keep it
      salt: op.salt ?? existing.salt,
      // Keep local label and source if they are richer
      label: op.label || existing.label,
      source: existing.source === 'local' ? 'local' : op.source,
    }
  } else {
    ops.unshift(op)
  }
  saveOperations(op.chainId, op.timelockAddress, ops)
}

export function updateOperation(
  chainId: number,
  timelockAddress: string,
  id: `0x${string}`,
  patch: Partial<StoredOperation>,
): void {
  const ops = getOperations(chainId, timelockAddress)
  const idx = ops.findIndex((o) => o.id === id)
  if (idx >= 0) {
    ops[idx] = { ...ops[idx], ...patch }
    saveOperations(chainId, timelockAddress, ops)
  }
}

// ─── Sync cursor ─────────────────────────────────────────────────────────────
// Stores the last scanned block to resume incremental syncs.

export function getSyncCursor(chainId: number, timelockAddress: string): number {
  return read<number>(KEYS.syncCursor(chainId, timelockAddress), 0)
}

export function setSyncCursor(chainId: number, timelockAddress: string, block: number): void {
  write(KEYS.syncCursor(chainId, timelockAddress), block)
}

export function resetSyncCursor(chainId: number, timelockAddress: string): void {
  remove(KEYS.syncCursor(chainId, timelockAddress))
}
