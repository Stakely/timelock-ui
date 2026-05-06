import { useState, useCallback } from 'react'
import {
  getNetworks,
  saveNetworks,
  getActiveChainId,
  setActiveChainId,
  type StoredNetwork,
} from '../lib/storage'

export function useNetworks() {
  const [networks, setNetworks] = useState<StoredNetwork[]>(() => getNetworks())
  const [activeChainId, setActiveChainIdState] = useState<number | null>(() => {
    const stored = getActiveChainId()
    // If no active network is stored, use the first available
    return stored ?? getNetworks()[0]?.chainId ?? null
  })

  const save = useCallback((updated: StoredNetwork[]) => {
    saveNetworks(updated)
    setNetworks(updated)
  }, [])

  const addNetwork = useCallback(
    (network: StoredNetwork) => {
      const updated = [...networks.filter((n) => n.chainId !== network.chainId), network]
      save(updated)
    },
    [networks, save],
  )

  const updateNetwork = useCallback(
    (chainId: number, patch: Partial<StoredNetwork>) => {
      const updated = networks.map((n) => (n.chainId === chainId ? { ...n, ...patch } : n))
      save(updated)
    },
    [networks, save],
  )

  const removeNetwork = useCallback(
    (chainId: number) => {
      const updated = networks.filter((n) => n.chainId !== chainId)
      save(updated)
      if (activeChainId === chainId) {
        const next = updated[0]?.chainId ?? null
        if (next) setActiveChainId(next)
        setActiveChainIdState(next)
      }
    },
    [networks, save, activeChainId],
  )

  const selectNetwork = useCallback((chainId: number) => {
    setActiveChainId(chainId)
    setActiveChainIdState(chainId)
  }, [])

  const activeNetwork = networks.find((n) => n.chainId === activeChainId) ?? networks[0] ?? null

  return { networks, activeChainId, activeNetwork, addNetwork, updateNetwork, removeNetwork, selectNetwork }
}
