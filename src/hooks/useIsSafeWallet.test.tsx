import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockUseAccount = vi.fn()
const mockUseConnections = vi.fn()
vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useConnections: () => mockUseConnections(),
}))

import { useIsSafeWallet } from './useIsSafeWallet'

function liveConnector(opts: {
  id: string
  name: string
  type?: string
  uid?: string
  provider?: any
  getProvider?: () => Promise<any>
}) {
  return {
    id: opts.id,
    name: opts.name,
    type: opts.type ?? opts.id,
    uid: opts.uid ?? 'uid-test',
    getProvider:
      opts.getProvider ??
      (async () => opts.provider ?? { session: { peer: { metadata: {} } } }),
  }
}

describe('useIsSafeWallet', () => {
  beforeEach(() => {
    mockUseAccount.mockReset()
    mockUseConnections.mockReset()
    mockUseConnections.mockReturnValue([])
  })

  it('is false when no wallet is connected', () => {
    mockUseAccount.mockReturnValue({ connector: undefined })
    const { result } = renderHook(() => useIsSafeWallet())
    expect(result.current).toBe(false)
  })

  it('is true synchronously for the Safe Apps SDK connector (id "safe")', () => {
    const safe = { id: 'safe', name: 'Safe', type: 'safe', uid: 'uid-safe' }
    mockUseAccount.mockReturnValue({ connector: safe })
    mockUseConnections.mockReturnValue([{ connector: safe }])
    const { result } = renderHook(() => useIsSafeWallet())
    expect(result.current).toBe(true)
  })

  it('stays false for a plain EOA over WalletConnect', async () => {
    const conn = liveConnector({
      id: 'walletConnect',
      name: 'WalletConnect',
      uid: 'uid-wc',
      provider: { session: { peer: { metadata: { name: 'Rainbow', url: 'https://rainbow.me' } } } },
    })
    mockUseAccount.mockReturnValue({ connector: { id: 'walletConnect', name: 'WalletConnect', uid: 'uid-wc' } })
    mockUseConnections.mockReturnValue([{ connector: conn }])
    const { result } = renderHook(() => useIsSafeWallet())
    expect(result.current).toBe(false)
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toBe(false)
  })

  it('flips to true once Safe is detected via WalletConnect peer metadata', async () => {
    const conn = liveConnector({
      id: 'walletConnect',
      name: 'WalletConnect',
      uid: 'uid-wc',
      provider: {
        session: {
          peer: { metadata: { name: 'Safe{Wallet}', url: 'https://app.safe.global' } },
        },
      },
    })
    mockUseAccount.mockReturnValue({ connector: { id: 'walletConnect', name: 'WalletConnect', uid: 'uid-wc' } })
    mockUseConnections.mockReturnValue([{ connector: conn }])
    const { result } = renderHook(() => useIsSafeWallet())
    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('rejects SafePal even over WC (no false positive on look-alikes)', async () => {
    const conn = liveConnector({
      id: 'walletConnect',
      name: 'WalletConnect',
      uid: 'uid-wc',
      provider: { session: { peer: { metadata: { name: 'SafePal', url: 'https://safepal.com' } } } },
    })
    mockUseAccount.mockReturnValue({ connector: { id: 'walletConnect', name: 'WalletConnect', uid: 'uid-wc' } })
    mockUseConnections.mockReturnValue([{ connector: conn }])
    const { result } = renderHook(() => useIsSafeWallet())
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toBe(false)
  })

  it('picks the connection that matches the active account uid', async () => {
    // Two simultaneous connections: an injected EOA and a Safe-over-WC. The
    // active account is the WC one — we must read THAT peer metadata, not
    // the injected one's.
    const injected = liveConnector({
      id: 'injected',
      name: 'MetaMask',
      uid: 'uid-injected',
      provider: { session: { peer: { metadata: { name: 'MetaMask' } } } },
    })
    const safeWc = liveConnector({
      id: 'walletConnect',
      name: 'WalletConnect',
      uid: 'uid-safe-wc',
      provider: {
        session: {
          peer: { metadata: { name: 'Safe{Wallet}', url: 'https://app.safe.global' } },
        },
      },
    })
    mockUseAccount.mockReturnValue({
      connector: { id: 'walletConnect', name: 'WalletConnect', uid: 'uid-safe-wc' },
    })
    mockUseConnections.mockReturnValue([{ connector: injected }, { connector: safeWc }])
    const { result } = renderHook(() => useIsSafeWallet())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('does not crash if the live connector lacks getProvider (descriptor only)', async () => {
    mockUseAccount.mockReturnValue({
      connector: { id: 'walletConnect', name: 'WalletConnect', uid: 'uid-wc' },
    })
    mockUseConnections.mockReturnValue([
      {
        connector: {
          id: 'walletConnect',
          name: 'WalletConnect',
          type: 'walletConnect',
          uid: 'uid-wc',
        },
      },
    ])
    const { result } = renderHook(() => useIsSafeWallet())
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toBe(false)
  })

  it('does not crash if getProvider throws', async () => {
    const conn = liveConnector({
      id: 'walletConnect',
      name: 'WalletConnect',
      uid: 'uid-wc',
      getProvider: async () => {
        throw new Error('provider not ready')
      },
    })
    mockUseAccount.mockReturnValue({ connector: { id: 'walletConnect', name: 'WalletConnect', uid: 'uid-wc' } })
    mockUseConnections.mockReturnValue([{ connector: conn }])
    const { result } = renderHook(() => useIsSafeWallet())
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toBe(false)
  })
})
