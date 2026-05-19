import { describe, it, expect } from 'vitest'
import { isSafeByMetadata, isSafeConnectorSync } from './connectors'

describe('isSafeByMetadata', () => {
  it('returns false for null / undefined / empty', () => {
    expect(isSafeByMetadata(null)).toBe(false)
    expect(isSafeByMetadata(undefined)).toBe(false)
    expect(isSafeByMetadata({})).toBe(false)
  })

  // --- Matches by name (Safe's published wallet names) ---
  it('matches "Safe{Wallet}" (current Safe branding)', () => {
    expect(isSafeByMetadata({ name: 'Safe{Wallet}' })).toBe(true)
  })

  it('matches "Safe Wallet" (legacy)', () => {
    expect(isSafeByMetadata({ name: 'Safe Wallet' })).toBe(true)
  })

  it('matches plain "Safe"', () => {
    expect(isSafeByMetadata({ name: 'Safe' })).toBe(true)
  })

  it('matches "Safe Multisig" and "Gnosis Safe" (legacy names)', () => {
    expect(isSafeByMetadata({ name: 'Safe Multisig' })).toBe(true)
    expect(isSafeByMetadata({ name: 'Gnosis Safe' })).toBe(true)
  })

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(isSafeByMetadata({ name: 'SAFE{WALLET}' })).toBe(true)
    expect(isSafeByMetadata({ name: '  safe wallet  ' })).toBe(true)
  })

  // --- Matches by url (Safe's official domain) ---
  it('matches app.safe.global url', () => {
    expect(isSafeByMetadata({ name: 'Unknown', url: 'https://app.safe.global' })).toBe(true)
  })

  it('matches any subdomain of safe.global', () => {
    expect(isSafeByMetadata({ url: 'https://staging.safe.global' })).toBe(true)
    expect(isSafeByMetadata({ url: 'https://safe.global' })).toBe(true)
  })

  // --- Rejects look-alikes ---
  it('does NOT match SafePal (a real EOA wallet)', () => {
    expect(isSafeByMetadata({ name: 'SafePal', url: 'https://safepal.com' })).toBe(false)
  })

  it('does NOT match other "safe-*" wallets', () => {
    expect(isSafeByMetadata({ name: 'SafeMoon Wallet' })).toBe(false)
    expect(isSafeByMetadata({ name: 'Safeguard' })).toBe(false)
    expect(isSafeByMetadata({ name: 'Safe Pal' })).toBe(false)
  })

  it('does NOT match phishing-style urls', () => {
    expect(isSafeByMetadata({ url: 'https://safe.global.attacker.com' })).toBe(false)
    expect(isSafeByMetadata({ url: 'https://safeglobal.com' })).toBe(false)
    expect(isSafeByMetadata({ url: 'https://notsafe.global.io' })).toBe(false)
  })

  it('does not match unrelated wallets', () => {
    expect(isSafeByMetadata({ name: 'MetaMask', url: 'https://metamask.io' })).toBe(false)
    expect(isSafeByMetadata({ name: 'Rainbow', url: 'https://rainbow.me' })).toBe(false)
    expect(isSafeByMetadata({ name: 'WalletConnect' })).toBe(false)
  })

  it('handles malformed urls without throwing', () => {
    expect(isSafeByMetadata({ url: 'not a url' })).toBe(false)
    expect(isSafeByMetadata({ name: 'Random', url: '' })).toBe(false)
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

  it('matches a connector whose name is exactly Safe{Wallet}', () => {
    expect(isSafeConnectorSync({ id: 'custom', name: 'Safe{Wallet}' })).toBe(true)
  })

  it('does NOT match plain WalletConnect (Safe-over-WC needs peer metadata)', () => {
    expect(isSafeConnectorSync({ id: 'walletConnect', name: 'WalletConnect' })).toBe(false)
  })

  it('does NOT match SafePal or other look-alikes by name', () => {
    expect(isSafeConnectorSync({ id: 'safepal', name: 'SafePal' })).toBe(false)
    expect(isSafeConnectorSync({ id: 'safemoon', name: 'SafeMoon Wallet' })).toBe(false)
  })

  it('does not match common EOA connectors', () => {
    expect(isSafeConnectorSync({ id: 'metaMask', name: 'MetaMask' })).toBe(false)
    expect(isSafeConnectorSync({ id: 'injected', name: 'Browser Wallet' })).toBe(false)
    expect(isSafeConnectorSync({ id: 'coinbaseWallet', name: 'Coinbase Wallet' })).toBe(false)
  })
})
