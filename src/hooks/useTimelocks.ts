import { useState, useCallback } from 'react'
import {
  getTimelocks,
  saveTimelocks,
  getActiveTimelockAddress,
  setActiveTimelockAddress,
  type StoredTimelock,
} from '../lib/storage'

export function useTimelocks() {
  const [timelocks, setTimelocks] = useState<StoredTimelock[]>(() => getTimelocks())
  const [activeAddress, setActiveAddressState] = useState<`0x${string}` | null>(
    () => getActiveTimelockAddress(),
  )

  const save = useCallback((updated: StoredTimelock[]) => {
    saveTimelocks(updated)
    setTimelocks(updated)
  }, [])

  const addTimelock = useCallback(
    (tl: StoredTimelock) => {
      const updated = [
        ...timelocks.filter(
          (t) => t.address.toLowerCase() !== tl.address.toLowerCase(),
        ),
        tl,
      ]
      save(updated)
    },
    [timelocks, save],
  )

  const updateTimelock = useCallback(
    (address: `0x${string}`, patch: Partial<StoredTimelock>) => {
      const updated = timelocks.map((t) =>
        t.address.toLowerCase() === address.toLowerCase() ? { ...t, ...patch } : t,
      )
      save(updated)
    },
    [timelocks, save],
  )

  const removeTimelock = useCallback(
    (address: `0x${string}`) => {
      const updated = timelocks.filter(
        (t) => t.address.toLowerCase() !== address.toLowerCase(),
      )
      save(updated)
      if (activeAddress?.toLowerCase() === address.toLowerCase()) {
        const next = (updated[0]?.address ?? null) as `0x${string}` | null
        setActiveTimelockAddress(next)
        setActiveAddressState(next)
      }
    },
    [timelocks, save, activeAddress],
  )

  const selectTimelock = useCallback((address: `0x${string}` | null) => {
    setActiveTimelockAddress(address)
    setActiveAddressState(address)
  }, [])

  const activeTimelock =
    timelocks.find((t) => t.address.toLowerCase() === activeAddress?.toLowerCase()) ?? null

  return {
    timelocks,
    activeAddress,
    activeTimelock,
    addTimelock,
    updateTimelock,
    removeTimelock,
    selectTimelock,
  }
}
