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

  // Per-field latch: each role/minDelay keeps its last *successful* read.
  // A failed re-read (RPC hiccup, common on mainnet with Safe) leaves the
  // latch untouched instead of flipping a confirmed-true role to false and
  // making the New operation / Execute / Cancel buttons flicker out.
  // The latch is scoped to (user, timelock, chain) and reset when that tuple
  // changes, since a different access-control context is a different question.
  const sessionKey = `${userAddress ?? ''}|${timelockAddress ?? ''}|${chainId ?? ''}`
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey)
  const [latchedRoles, setLatchedRoles] = useState<TimelockRoles>(EMPTY_ROLES)
  const [latchedMinDelay, setLatchedMinDelay] = useState<bigint | null>(null)
  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey)
    setLatchedRoles(EMPTY_ROLES)
    setLatchedMinDelay(null)
  }

  useEffect(() => {
    if (!data) return
    setLatchedRoles((prev) => {
      const next: TimelockRoles = {
        isProposer: data[0]?.status === 'success' ? (data[0].result as boolean) : prev.isProposer,
        isExecutor: data[1]?.status === 'success' ? (data[1].result as boolean) : prev.isExecutor,
        isCanceller: data[2]?.status === 'success' ? (data[2].result as boolean) : prev.isCanceller,
        isAdmin: data[3]?.status === 'success' ? (data[3].result as boolean) : prev.isAdmin,
      }
      if (
        next.isProposer === prev.isProposer &&
        next.isExecutor === prev.isExecutor &&
        next.isCanceller === prev.isCanceller &&
        next.isAdmin === prev.isAdmin
      ) {
        return prev
      }
      return next
    })
    if (data[4]?.status === 'success') {
      setLatchedMinDelay(data[4].result as bigint)
    }
  }, [data])

  if (!enabled) {
    return { roles: EMPTY_ROLES, isLoading, minDelay: null }
  }

  return {
    roles: latchedRoles,
    isLoading,
    minDelay: latchedMinDelay,
  }
}
