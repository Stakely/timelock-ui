import { useEffect, useState } from 'react'
import { useReadContracts } from 'wagmi'
import { timelockAbi } from '../abis/timelock'
import { ROLE_HASHES, type RoleName } from '../lib/timelock'

export interface TimelockRoles {
  isProposer: boolean
  isExecutor: boolean
  isCanceller: boolean
  isAdmin: boolean
}

const EMPTY_ROLES: TimelockRoles = {
  isProposer: false,
  isExecutor: false,
  isCanceller: false,
  isAdmin: false,
}

type ReadResult = ReadonlyArray<{ status: 'success' | 'failure'; result?: unknown }> | undefined

// Pure merge — exported for unit testing. For each field, return the
// successful read; on failure, fall back to the previous latched value.
export function deriveRoles(prev: TimelockRoles, data: ReadResult): TimelockRoles {
  if (!data) return prev
  return {
    isProposer: data[0]?.status === 'success' ? (data[0].result as boolean) : prev.isProposer,
    isExecutor: data[1]?.status === 'success' ? (data[1].result as boolean) : prev.isExecutor,
    isCanceller: data[2]?.status === 'success' ? (data[2].result as boolean) : prev.isCanceller,
    isAdmin: data[3]?.status === 'success' ? (data[3].result as boolean) : prev.isAdmin,
  }
}

function deriveMinDelay(prev: bigint | null, data: ReadResult): bigint | null {
  if (!data) return prev
  return data[4]?.status === 'success' ? (data[4].result as bigint) : prev
}

function rolesEqual(a: TimelockRoles, b: TimelockRoles): boolean {
  return (
    a.isProposer === b.isProposer &&
    a.isExecutor === b.isExecutor &&
    a.isCanceller === b.isCanceller &&
    a.isAdmin === b.isAdmin
  )
}

export function useTimelockRoles(
  timelockAddress: `0x${string}` | null,
  userAddress: `0x${string}` | undefined,
  chainId?: number,
): { roles: TimelockRoles; isLoading: boolean; minDelay: bigint | null } {
  const enabled = Boolean(timelockAddress && userAddress)

  const roleNames: RoleName[] = ['PROPOSER_ROLE', 'EXECUTOR_ROLE', 'CANCELLER_ROLE', 'TIMELOCK_ADMIN_ROLE']

  const { data, isLoading } = useReadContracts({
    contracts: enabled
      ? [
          ...roleNames.map((role) => ({
            address: timelockAddress!,
            abi: timelockAbi,
            functionName: 'hasRole' as const,
            args: [ROLE_HASHES[role], userAddress!] as [`0x${string}`, `0x${string}`],
            chainId,
          })),
          {
            address: timelockAddress!,
            abi: timelockAbi,
            functionName: 'getMinDelay' as const,
            args: [] as [],
            chainId,
          },
        ]
      : [],
    query: { enabled },
  })

  // Per-field latch scoped to (user, timelock, chain). A failed re-read after
  // a successful one preserves the prior value — keeps the New operation /
  // Execute / Cancel buttons from flickering when the RPC hiccups.
  const sessionKey = `${userAddress ?? ''}|${timelockAddress ?? ''}|${chainId ?? ''}`
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey)
  const [latchedRoles, setLatchedRoles] = useState<TimelockRoles>(EMPTY_ROLES)
  const [latchedMinDelay, setLatchedMinDelay] = useState<bigint | null>(null)
  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey)
    setLatchedRoles(EMPTY_ROLES)
    setLatchedMinDelay(null)
  }

  // Derive in render — the very first render after `data` arrives must
  // already reflect the successful reads. Computing only in useEffect would
  // leave one render where roles look empty, briefly hiding role-gated UI
  // (New operation / Execute / Cancel) on the path users see most often.
  const liveRoles = deriveRoles(latchedRoles, data)
  const liveMinDelay = deriveMinDelay(latchedMinDelay, data)

  // Persist the latch for subsequent renders. The render-time `liveRoles`
  // already shows the right value; this effect just keeps the latch in sync
  // for when `data` later becomes undefined or partially fails.
  useEffect(() => {
    if (!data) return
    setLatchedRoles((prev) => {
      const next = deriveRoles(prev, data)
      return rolesEqual(prev, next) ? prev : next
    })
    setLatchedMinDelay((prev) => deriveMinDelay(prev, data))
  }, [data])

  if (!enabled) {
    return { roles: EMPTY_ROLES, isLoading, minDelay: null }
  }

  return { roles: liveRoles, isLoading, minDelay: liveMinDelay }
}
