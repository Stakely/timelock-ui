import { useReadContracts } from 'wagmi'
import { timelockAbi } from '../abis/timelock'
import type { OperationStateValue } from '../lib/timelock'

interface OperationOnChain {
  state: OperationStateValue
  readyAt: bigint
}

export function useOperationState(
  timelockAddress: `0x${string}` | null,
  operationId: `0x${string}` | null,
  chainId?: number,
): { data: OperationOnChain | null; isLoading: boolean; refetch: () => void } {
  const enabled = Boolean(timelockAddress && operationId)

  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? [
          {
            address: timelockAddress!,
            abi: timelockAbi,
            functionName: 'getOperationState',
            args: [operationId!],
            chainId,
          },
          {
            address: timelockAddress!,
            abi: timelockAbi,
            functionName: 'getTimestamp',
            args: [operationId!],
            chainId,
          },
        ]
      : [],
    query: { enabled, refetchInterval: 15_000 },
  })

  if (!data || !enabled) return { data: null, isLoading, refetch }

  const stateResult = data[0]
  const tsResult = data[1]

  if (!stateResult || !tsResult || stateResult.status !== 'success' || tsResult.status !== 'success') {
    return { data: null, isLoading, refetch }
  }

  return {
    data: {
      state: Number(stateResult.result) as OperationStateValue,
      readyAt: tsResult.result as bigint,
    },
    isLoading,
    refetch,
  }
}
