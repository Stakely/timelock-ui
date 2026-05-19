import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockUseAccount = vi.fn()
const mockUseConnections = vi.fn()
vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useConnections: () => mockUseConnections(),
}))

import { useIsSafeWallet } from './useIsSafeWallet'

// Returns a fake "live" connector — the kind useConnections() yields once a
// wallet is connected, including the getProvider instance method.
function liveConnector(opts: {
  id: string
  name: string
  type?: string
  provider?: any
  getProvider?: () => Promise<any>
}) {
  return {
    id: opts.id,
    name: opts.name,
    type: opts.type ?? opts.id,
    uid: 'uid-test',
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
    mockUseAccount.mockReturnValue({
      connector: { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' },
    })
    mockUseConnections.mockReturnValue([
      {
        connector: liveConnector({
          id: 'walletConnect',
          name: 'WalletConnect',
          provider: {
            session: { peer: { metadata: { name: 'Rainbow', url: 'https://rainbow.me' } } },
          },
        }),
      },
    ])
    const { result } = renderHook(() => useIsSafeWallet())
    expect(result.current).toBe(false)
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toBe(false)
  })

  it('flips to true once Safe is detected via WalletConnect peer metadata', async () => {
    mockUseAccount.mockReturnValue({
      connector: { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' },
    })
    mockUseConnections.mockReturnValue([
      {
        connector: liveConnector({
          id: 'walletConnect',
          name: 'WalletConnect',
          provider: {
            session: {
              peer: {
                metadata: { name: 'Safe{Wallet}', url: 'https://app.safe.global' },
              },
            },
          },
        }),
      },
    ])
    const { result } = renderHook(() => useIsSafeWallet())
    expect(result.current).toBe(false) // sync answer before the async probe lands
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('detects Safe even when only the metadata url gives it away', async () => {
    mockUseAccount.mockReturnValue({
      connector: { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' },
    })
    mockUseConnections.mockReturnValue([
      {
        connector: liveConnector({
          id: 'walletConnect',
          name: 'WalletConnect',
          provider: {
            session: { peer: { metadata: { name: 'Unknown', url: 'https://app.safe.global' } } },
          },
        }),
      },
    ])
    const { result } = renderHook(() => useIsSafeWallet())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('does not crash if the live connector lacks getProvider (descriptor only)', async () => {
    mockUseAccount.mockReturnValue({
      connector: { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' },
    })
    mockUseConnections.mockReturnValue([
      {
        connector: {
          id: 'walletConnect',
          name: 'WalletConnect',
          type: 'walletConnect',
          uid: 'uid-x',
        },
      },
    ])
    const { result } = renderHook(() => useIsSafeWallet())
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toBe(false)
  })

  it('does not crash if getProvider throws', async () => {
    mockUseAccount.mockReturnValue({
      connector: { id: 'walletConnect', name: 'WalletConnect', type: 'walletConnect' },
    })
    mockUseConnections.mockReturnValue([
      {
        connector: liveConnector({
          id: 'walletConnect',
          name: 'WalletConnect',
          getProvider: async () => {
            throw new Error('provider not ready')
          },
        }),
      },
    ])
    const { result } = renderHook(() => useIsSafeWallet())
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current).toBe(false)
  })
})
