import { describe, it, expect } from 'vitest'
import { isSafeByMetadata, isSafeConnectorSync } from './connectors'

describe('isSafeByMetadata', () => {
  it('returns false for null / undefined', () => {
    expect(isSafeByMetadata(null)).toBe(false)
    expect(isSafeByMetadata(undefined)).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(isSafeByMetadata({})).toBe(false)
  })

  it('matches name "Safe{Wallet}" (current Safe branding)', () => {
    expect(isSafeByMetadata({ name: 'Safe{Wallet}' })).toBe(true)
  })

  it('matches legacy "Safe Wallet" name', () => {
    expect(isSafeByMetadata({ name: 'Safe Wallet' })).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isSafeByMetadata({ name: 'SAFE{WALLET}' })).toBe(true)
    expect(isSafeByMetadata({ name: 'safe' })).toBe(true)
  })

  it('matches when only the url points to safe.global', () => {
    expect(isSafeByMetadata({ name: 'Unknown', url: 'https://app.safe.global' })).toBe(true)
  })

  it('matches any subdomain of safe.global', () => {
    expect(isSafeByMetadata({ url: 'https://staging.safe.global' })).toBe(true)
  })

  it('does not match unrelated wallets', () => {
    expect(isSafeByMetadata({ name: 'MetaMask', url: 'https://metamask.io' })).toBe(false)
    expect(isSafeByMetadata({ name: 'Rainbow', url: 'https://rainbow.me' })).toBe(false)
    expect(isSafeByMetadata({ name: 'WalletConnect' })).toBe(false)
  })
})

describe('isSafeConnectorSync', () => {
  it('returns false for null / undefined', () => {
    expect(isSafeConnectorSync(null)).toBe(false)
    expect(isSafeConnectorSync(undefined)).toBe(false)
  })

  it('matches the dedicated Safe connector by id', () => {
    expect(isSafeConnectorSync({ id: 'safe', name: 'Safe' })).toBe(true)
  })

  it('matches a connector whose name contains "safe"', () => {
    expect(isSafeConnectorSync({ id: 'custom', name: 'Safe{Wallet}' })).toBe(true)
  })

  it('does NOT match plain WalletConnect (the Safe-over-WC case needs peer metadata)', () => {
    expect(isSafeConnectorSync({ id: 'walletConnect', name: 'WalletConnect' })).toBe(false)
  })

  it('does not match common EOA connectors', () => {
    expect(isSafeConnectorSync({ id: 'metaMask', name: 'MetaMask' })).toBe(false)
    expect(isSafeConnectorSync({ id: 'injected', name: 'Browser Wallet' })).toBe(false)
    expect(isSafeConnectorSync({ id: 'coinbaseWallet', name: 'Coinbase Wallet' })).toBe(false)
  })
})
