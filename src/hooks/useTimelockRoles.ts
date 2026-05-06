import { useReadContracts } from 'wagmi'
import { timelockAbi } from '../abis/timelock'
import { ROLE_HASHES, type RoleName } from '../lib/timelock'

export interface TimelockRoles {
  isProposer: boolean
  isExecutor: boolean
  isCanceller: boolean
  isAdmin: boolean
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

  if (!data || !enabled) {
    return {
      roles: { isProposer: false, isExecutor: false, isCanceller: false, isAdmin: false },
      isLoading,
      minDelay: null,
    }
  }

  const [proposer, executor, canceller, admin, minDelayResult] = data

  return {
    roles: {
      isProposer: proposer?.status === 'success' ? (proposer.result as boolean) : false,
      isExecutor: executor?.status === 'success' ? (executor.result as boolean) : false,
      isCanceller: canceller?.status === 'success' ? (canceller.result as boolean) : false,
      isAdmin: admin?.status === 'success' ? (admin.result as boolean) : false,
    },
    isLoading,
    minDelay:
      minDelayResult?.status === 'success' ? (minDelayResult.result as bigint) : null,
  }
}
