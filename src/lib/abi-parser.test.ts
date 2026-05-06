import { describe, it, expect } from 'vitest'
import { parseMethodSignature, encodeCalldata } from './abi-parser'

describe('parseMethodSignature', () => {
  it('parses a simple ERC20 transfer signature', () => {
    const parsed = parseMethodSignature('transfer(address to, uint256 amount)')
    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe('transfer')
    expect(parsed!.params).toHaveLength(2)
    expect(parsed!.params[0]).toMatchObject({ name: 'to', type: 'address' })
    expect(parsed!.params[1]).toMatchObject({ name: 'amount', type: 'uint256' })
  })

  it('falls back to "argN" when params are unnamed', () => {
    const parsed = parseMethodSignature('transfer(address,uint256)')
    expect(parsed).not.toBeNull()
    expect(parsed!.params[0].name).toBe('arg0')
    expect(parsed!.params[1].name).toBe('arg1')
  })

  it('parses functions with no arguments', () => {
    const parsed = parseMethodSignature('pause()')
    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe('pause')
    expect(parsed!.params).toHaveLength(0)
  })

  it('returns null for invalid signatures', () => {
    expect(parseMethodSignature('not a signature')).toBeNull()
    expect(parseMethodSignature('transfer(')).toBeNull()
    expect(parseMethodSignature('')).toBeNull()
  })
})

describe('encodeCalldata', () => {
  it('encodes ERC20 transfer with the canonical 4-byte selector 0xa9059cbb', () => {
    const calldata = encodeCalldata('transfer(address,uint256)', [
      '0x000000000000000000000000000000000000dEaD',
      '1000000000000000000',
    ])
    expect(calldata).not.toBeNull()
    // The selector for transfer(address,uint256) is well-known
    expect(calldata!.slice(0, 10)).toBe('0xa9059cbb')
    // Total: 4-byte selector + 2 × 32-byte words = 4 + 64 = 68 bytes => 138 chars (incl 0x)
    expect(calldata!.length).toBe(138)
  })

  it('encodes grantRole(bytes32,address)', () => {
    const calldata = encodeCalldata('grantRole(bytes32,address)', [
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x000000000000000000000000000000000000bEEF',
    ])
    expect(calldata).not.toBeNull()
    expect(calldata!.slice(0, 10)).toBe('0x2f2ff15d')
  })

  it('returns null for an invalid signature', () => {
    expect(encodeCalldata('not a signature', [])).toBeNull()
  })

  it('returns null when an argument is malformed', () => {
    // uint256 expects a numeric string parseable as BigInt
    const calldata = encodeCalldata('transfer(address,uint256)', [
      '0x000000000000000000000000000000000000dEaD',
      'not-a-number',
    ])
    expect(calldata).toBeNull()
  })
})
