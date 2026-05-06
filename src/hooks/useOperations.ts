import { useState, useCallback } from 'react'
import {
  getOperations,
  upsertOperation,
  updateOperation,
  type StoredOperation,
} from '../lib/storage'

export function useOperations(chainId: number | null, timelockAddress: `0x${string}` | null) {
  const [operations, setOperations] = useState<StoredOperation[]>(() => {
    if (!chainId || !timelockAddress) return []
    return getOperations(chainId, timelockAddress)
  })

  const refresh = useCallback(() => {
    if (!chainId || !timelockAddress) return
    setOperations(getOperations(chainId, timelockAddress))
  }, [chainId, timelockAddress])

  const addOperation = useCallback(
    (op: StoredOperation) => {
      upsertOperation(op)
      refresh()
    },
    [refresh],
  )

  const patchOperation = useCallback(
    (id: `0x${string}`, patch: Partial<StoredOperation>) => {
      if (!chainId || !timelockAddress) return
      updateOperation(chainId, timelockAddress, id, patch)
      refresh()
    },
    [chainId, timelockAddress, refresh],
  )

  return { operations, refresh, addOperation, patchOperation }
}
