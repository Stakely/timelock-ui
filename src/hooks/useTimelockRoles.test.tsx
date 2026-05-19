import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockUseReadContracts = vi.fn()
vi.mock('wagmi', () => ({
  useReadContracts: () => mockUseReadContracts(),
}))

import { useTimelockRoles } from './useTimelockRoles'

const ADDR_TIMELOCK = '0x1111111111111111111111111111111111111111' as `0x${string}`
const ADDR_USER = '0x2222222222222222222222222222222222222222' as `0x${string}`
const ADDR_OTHER_USER = '0x3333333333333333333333333333333333333333' as `0x${string}`

function successData(
  proposer: boolean,
  executor: boolean,
  canceller: boolean,
  admin: boolean,
  minDelay: bigint,
) {
  return [
    { status: 'success', result: proposer },
    { status: 'success', result: executor },
    { status: 'success', result: canceller },
    { status: 'success', result: admin },
    { status: 'success', result: minDelay },
  ]
}

function allFailures() {
  return [0, 1, 2, 3, 4].map(() => ({ status: 'failure', error: new Error('rpc dropped') }))
}

describe('useTimelockRoles', () => {
  beforeEach(() => {
    mockUseReadContracts.mockReset()
  })

  it('returns all-false when no user is connected', () => {
    mockUseReadContracts.mockReturnValue({ data: undefined, isLoading: false })
    const { result } = renderHook(() => useTimelockRoles(ADDR_TIMELOCK, undefined))
    expect(result.current.roles).toEqual({
      isProposer: false,
      isExecutor: false,
      isCanceller: false,
      isAdmin: false,
    })
    expect(result.current.minDelay).toBe(null)
  })

  it('exposes confirmed roles on a successful read', () => {
    mockUseReadContracts.mockReturnValue({
      data: successData(true, false, true, false, 120n),
      isLoading: false,
    })
    const { result } = renderHook(() => useTimelockRoles(ADDR_TIMELOCK, ADDR_USER))
    expect(result.current.roles).toEqual({
      isProposer: true,
      isExecutor: false,
      isCanceller: true,
      isAdmin: false,
    })
    expect(result.current.minDelay).toBe(120n)
  })

  it('preserves the last successful read when a later read fails (the latch)', () => {
    mockUseReadContracts.mockReturnValue({
      data: successData(true, false, false, false, 60n),
      isLoading: false,
    })
    const { result, rerender } = renderHook(() => useTimelockRoles(ADDR_TIMELOCK, ADDR_USER))
    expect(result.current.roles.isProposer).toBe(true)
    expect(result.current.minDelay).toBe(60n)

    // RPC hiccups — without the latch this would flip isProposer back to
    // false and the New operation / Execute / Cancel buttons would disappear.
    mockUseReadContracts.mockReturnValue({ data: allFailures(), isLoading: false })
    rerender()
    expect(result.current.roles.isProposer).toBe(true)
    expect(result.current.minDelay).toBe(60n)
  })

  it('updates per field — failed reads keep prev, successful reads win', () => {
    mockUseReadContracts.mockReturnValue({
      data: successData(true, false, false, false, 60n),
      isLoading: false,
    })
    const { result, rerender } = renderHook(() => useTimelockRoles(ADDR_TIMELOCK, ADDR_USER))
    expect(result.current.roles.isProposer).toBe(true)
    expect(result.current.roles.isExecutor).toBe(false)

    mockUseReadContracts.mockReturnValue({
      data: [
        { status: 'failure', error: new Error('rpc') }, // proposer read fails → keep prev (true)
        { status: 'success', result: true },             // executor now true
        { status: 'failure', error: new Error('rpc') },
        { status: 'failure', error: new Error('rpc') },
        { status: 'failure', error: new Error('rpc') }, // minDelay read fails → keep 60n
      ],
      isLoading: false,
    })
    rerender()
    expect(result.current.roles.isProposer).toBe(true)
    expect(result.current.roles.isExecutor).toBe(true)
    expect(result.current.minDelay).toBe(60n)
  })

  it('resets the latch when the user/timelock/chain session changes', () => {
    mockUseReadContracts.mockReturnValue({
      data: successData(true, true, true, true, 60n),
      isLoading: false,
    })
    const { result, rerender } = renderHook(
      ({ user }: { user: `0x${string}` | undefined }) =>
        useTimelockRoles(ADDR_TIMELOCK, user),
      { initialProps: { user: ADDR_USER } },
    )
    expect(result.current.roles.isProposer).toBe(true)

    // A different wallet must not inherit the previous one's roles even if
    // the next read fails — different AccessControl context entirely.
    mockUseReadContracts.mockReturnValue({ data: allFailures(), isLoading: false })
    rerender({ user: ADDR_OTHER_USER })
    expect(result.current.roles.isProposer).toBe(false)
    expect(result.current.minDelay).toBe(null)
  })

  it('honors a true → false transition when the read is successful (role revoked)', () => {
    mockUseReadContracts.mockReturnValue({
      data: successData(true, false, false, false, 60n),
      isLoading: false,
    })
    const { result, rerender } = renderHook(() => useTimelockRoles(ADDR_TIMELOCK, ADDR_USER))
    expect(result.current.roles.isProposer).toBe(true)

    // We only refuse to overwrite on failed reads. A confirmed false read
    // (role revoked on-chain) must propagate.
    mockUseReadContracts.mockReturnValue({
      data: successData(false, false, false, false, 60n),
      isLoading: false,
    })
    rerender()
    expect(result.current.roles.isProposer).toBe(false)
  })
})
