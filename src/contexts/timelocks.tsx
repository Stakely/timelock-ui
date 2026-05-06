import { createContext, useContext, type ReactNode } from 'react'
import { useTimelocks } from '../hooks/useTimelocks'

type TimelockStore = ReturnType<typeof useTimelocks>

const TimelockContext = createContext<TimelockStore | null>(null)

export function TimelockProvider({ children }: { children: ReactNode }) {
  const store = useTimelocks()
  return <TimelockContext.Provider value={store}>{children}</TimelockContext.Provider>
}

export function useTimelockStore(): TimelockStore {
  const ctx = useContext(TimelockContext)
  if (!ctx) throw new Error('useTimelockStore must be used within TimelockProvider')
  return ctx
}
