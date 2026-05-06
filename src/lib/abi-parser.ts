import { parseAbiItem, encodeAbiParameters, keccak256, toBytes, type AbiFunction } from 'viem'

export interface ParsedParam {
  name: string
  type: string
  components?: ParsedParam[]
}

export interface ParsedMethod {
  name: string
  params: ParsedParam[]
  abiFunction: AbiFunction
}

// Parses a signature like "transfer(address,uint256)" using viem
export function parseMethodSignature(signature: string): ParsedMethod | null {
  try {
    const item = parseAbiItem(`function ${signature}`) as AbiFunction
    const params = item.inputs.map((inp, i) => ({
      name: inp.name || `arg${i}`,
      type: inp.type,
      components: (inp as any).components,
    }))
    return { name: item.name, params, abiFunction: item }
  } catch {
    return null
  }
}

// Encodes arguments according to the signature and raw form values
export function encodeCalldata(
  signature: string,
  argValues: string[],
): `0x${string}` | null {
  try {
    const parsed = parseMethodSignature(signature)
    if (!parsed) return null

    const { abiFunction } = parsed
    const selector = getFunctionSelector(abiFunction)

    const encoded = encodeAbiParameters(
      abiFunction.inputs,
      argValues.map((v, i) => coerceArg(v, abiFunction.inputs[i].type)),
    )

    return (selector + encoded.slice(2)) as `0x${string}`
  } catch {
    return null
  }
}

// 4-byte selector computed with keccak256 via viem
function getFunctionSelector(fn: AbiFunction): string {
  const sig = `${fn.name}(${fn.inputs.map((i) => i.type).join(',')})`
  return keccak256(toBytes(sig)).slice(0, 10)
}

// Converts the input string to the type expected by viem
function coerceArg(value: string, type: string): unknown {
  const v = value.trim()
  if (type === 'bool') return v === 'true' || v === '1'
  if (type.startsWith('uint') || type.startsWith('int')) return BigInt(v)
  if (type === 'bytes32') return v as `0x${string}`
  if (type === 'bytes') return v as `0x${string}`
  if (type.endsWith('[]')) {
    const inner = v.replace(/^\[|\]$/g, '')
    const baseType = type.slice(0, -2)
    return inner.split(',').map((x) => coerceArg(x.trim(), baseType))
  }
  return v
}
