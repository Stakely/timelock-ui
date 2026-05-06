import { describe, it, expect } from 'vitest'
import {
  ROLE_HASHES,
  STATE_LABELS,
  OperationState,
  hashOperation,
  generateSalt,
  formatDelay,
  formatCountdown,
  shortHex,
  explorerTxUrl,
  explorerAddressUrl,
  timeUntilReady,
} from './timelock'

describe('ROLE_HASHES', () => {
  it('matches the keccak256 of the role names used by OZ TimelockController', () => {
    expect(ROLE_HASHES.PROPOSER_ROLE).toBe(
      '0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1',
    )
    expect(ROLE_HASHES.EXECUTOR_ROLE).toBe(
      '0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63',
    )
    expect(ROLE_HASHES.CANCELLER_ROLE).toBe(
      '0xfd643c72710c63c0180259aba6b2d05451e3591a24e58b62239378085726f783',
    )
    expect(ROLE_HASHES.TIMELOCK_ADMIN_ROLE).toBe(
      '0x5f58e3a2316349923ce3780f8d587db2d72378aed66a8261c916544fa6846ca5',
    )
  })
})

describe('STATE_LABELS / OperationState', () => {
  it('maps each state value to its label', () => {
    expect(STATE_LABELS[OperationState.Unset]).toBe('Unset')
    expect(STATE_LABELS[OperationState.Waiting]).toBe('Waiting')
    expect(STATE_LABELS[OperationState.Ready]).toBe('Ready')
    expect(STATE_LABELS[OperationState.Done]).toBe('Done')
  })
})

describe('hashOperation', () => {
  it('is deterministic — same inputs yield same hash', () => {
    const target = '0x000000000000000000000000000000000000dEaD' as `0x${string}`
    const data = '0xdeadbeef' as `0x${string}`
    const predecessor =
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
    const salt =
      '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`

    const a = hashOperation(target, 0n, data, predecessor, salt)
    const b = hashOperation(target, 0n, data, predecessor, salt)

    expect(a).toBe(b)
    expect(a).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('changes when any input changes', () => {
    const target = '0x000000000000000000000000000000000000dEaD' as `0x${string}`
    const data = '0xdeadbeef' as `0x${string}`
    const predecessor =
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
    const salt1 =
      '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`
    const salt2 =
      '0x0000000000000000000000000000000000000000000000000000000000000002' as `0x${string}`

    expect(hashOperation(target, 0n, data, predecessor, salt1)).not.toBe(
      hashOperation(target, 0n, data, predecessor, salt2),
    )
    expect(hashOperation(target, 0n, data, predecessor, salt1)).not.toBe(
      hashOperation(target, 1n, data, predecessor, salt1),
    )
  })
})

describe('generateSalt', () => {
  it('returns a 0x-prefixed 32-byte hex string', () => {
    const salt = generateSalt()
    expect(salt).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('returns a different value on each call', () => {
    expect(generateSalt()).not.toBe(generateSalt())
  })
})

describe('formatDelay', () => {
  it('formats minutes only when below an hour', () => {
    expect(formatDelay(0n)).toBe('0m')
    expect(formatDelay(59n)).toBe('0m')
    expect(formatDelay(60n)).toBe('1m')
    expect(formatDelay(120n)).toBe('2m')
  })

  it('formats hours and minutes, omitting zero components', () => {
    expect(formatDelay(3600n)).toBe('1h')
    expect(formatDelay(3660n)).toBe('1h 1m')
  })

  it('formats days, hours and minutes, omitting zero components', () => {
    expect(formatDelay(86400n)).toBe('1d')
    expect(formatDelay(86400n + 3600n + 60n)).toBe('1d 1h 1m')
    expect(formatDelay(2n * 86400n)).toBe('2d')
  })
})

describe('formatCountdown', () => {
  it('returns "0s" when seconds are non-positive', () => {
    expect(formatCountdown(0)).toBe('0s')
    expect(formatCountdown(-10)).toBe('0s')
  })

  it('formats small remaining seconds', () => {
    expect(formatCountdown(5)).toBe('5s')
    expect(formatCountdown(65)).toBe('1m 5s')
  })

  it('formats days/hours/minutes/seconds', () => {
    expect(formatCountdown(86400 + 3600 + 60 + 1)).toBe('1d 1h 1m 1s')
  })
})

describe('shortHex', () => {
  it('shortens long hex strings', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    expect(shortHex(addr)).toBe('0x123456…345678')
  })

  it('keeps short strings unchanged', () => {
    expect(shortHex('0xabcd')).toBe('0xabcd')
  })
})

describe('explorer URL helpers', () => {
  it('handles trailing slashes in the base URL', () => {
    expect(explorerTxUrl('https://etherscan.io/', '0xaaa')).toBe('https://etherscan.io/tx/0xaaa')
    expect(explorerAddressUrl('https://etherscan.io', '0xbbb')).toBe(
      'https://etherscan.io/address/0xbbb',
    )
  })
})

describe('timeUntilReady', () => {
  it('returns 0 for past timestamps', () => {
    const past = BigInt(Math.floor(Date.now() / 1000) - 3600)
    expect(timeUntilReady(past)).toBe(0)
  })

  it('returns a positive number for future timestamps', () => {
    const future = BigInt(Math.floor(Date.now() / 1000) + 60)
    const remaining = timeUntilReady(future)
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(60)
  })
})
