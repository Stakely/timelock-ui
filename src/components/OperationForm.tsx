import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { isAddress } from 'viem'
import { Info } from 'lucide-react'
import { timelockAbi } from '../abis/timelock'
import { hashOperation, generateSalt, formatDelay } from '../lib/timelock'
import { parseMethodSignature, encodeCalldata, type ParsedParam } from '../lib/abi-parser'
import { upsertOperation, type StoredOperation } from '../lib/storage'
import { Toast } from './Toast'

interface Props {
  timelockAddress: `0x${string}`
  chainId: number
  minDelay: bigint
  onScheduled: () => void
  onCancel: () => void
}

export function OperationForm({ timelockAddress, chainId, minDelay, onScheduled, onCancel }: Props) {
  const { address: userAddress } = useAccount()
  const client = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()

  // ─── Form state ───────────────────────────────────────────────────────────
  const [target, setTarget] = useState('')
  const [rawMode, setRawMode] = useState(false)
  const [signature, setSignature] = useState('')
  const [rawCalldata, setRawCalldata] = useState('')
  const [argValues, setArgValues] = useState<string[]>([])
  const [parsedParams, setParsedParams] = useState<ParsedParam[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [ethValue, setEthValue] = useState('0')
  const [predecessor, setPredecessor] = useState('0x0000000000000000000000000000000000000000000000000000000000000000')
  const [salt, setSalt] = useState(() => generateSalt())
  const [delay, setDelay] = useState(() => minDelay.toString())
  const [label, setLabel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  // Update minimum delay when the timelock changes
  useEffect(() => {
    setDelay(minDelay.toString())
  }, [minDelay])

  // Parse the signature when it changes
  useEffect(() => {
    if (!signature.trim() || rawMode) return
    const parsed = parseMethodSignature(signature.trim())
    if (!parsed) {
      setParseError('Invalid signature. E.g.: transfer(address,uint256)')
      setParsedParams([])
      setArgValues([])
    } else {
      setParseError(null)
      setParsedParams(parsed.params)
      setArgValues(new Array(parsed.params.length).fill(''))
    }
  }, [signature, rawMode])

  function getCalldata(): `0x${string}` | null {
    if (rawMode) {
      const raw = rawCalldata.trim()
      if (!raw.startsWith('0x')) return null
      return raw as `0x${string}`
    }
    if (!signature.trim()) return '0x'
    return encodeCalldata(signature.trim(), argValues)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTxError(null)

    if (!isAddress(target)) {
      setTxError('Invalid target address')
      return
    }
    const calldata = getCalldata()
    if (calldata === null) {
      setTxError('Invalid calldata. Check the signature and arguments.')
      return
    }

    const valueBig = BigInt(ethValue || '0')
    const predecessorBytes = predecessor as `0x${string}`
    const saltBytes = salt as `0x${string}`
    const delayBig = BigInt(delay)

    if (delayBig < minDelay) {
      setTxError(`Minimum delay is ${minDelay.toString()} seconds (${formatDelay(minDelay)})`)
      return
    }

    const opId = hashOperation(target as `0x${string}`, valueBig, calldata, predecessorBytes, saltBytes)

    setIsSubmitting(true)
    try {
      const hash = await writeContractAsync({
        address: timelockAddress,
        abi: timelockAbi,
        functionName: 'schedule',
        args: [target as `0x${string}`, valueBig, calldata, predecessorBytes, saltBytes, delayBig],
      })

      const op: StoredOperation = {
        id: opId,
        timelockAddress,
        chainId,
        target: target as `0x${string}`,
        value: valueBig.toString(),
        data: calldata,
        predecessor: predecessorBytes,
        salt: saltBytes,
        delay: delayBig.toString(),
        label,
        source: 'local',
        methodSignature: rawMode ? undefined : signature,
        scheduledAt: Date.now(),
        scheduleTxHash: hash,
      }

      upsertOperation(op)
      await client?.waitForTransactionReceipt({ hash })
      onScheduled()
    } catch (e: any) {
      setTxError(e?.shortMessage ?? e?.message ?? 'Unknown error')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Target */}
      <Field label="Target address">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0x..."
          className={inputCls}
          required
        />
        {target && !isAddress(target) && (
          <p className="text-red-400 text-xs mt-1">Invalid address</p>
        )}
      </Field>

      {/* Method / Calldata */}
      <Field
        label="Calldata"
        aside={
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={rawMode}
              onChange={(e) => setRawMode(e.target.checked)}
              className="accent-indigo-500"
            />
            Raw calldata
          </label>
        }
      >
        {rawMode ? (
          <textarea
            value={rawCalldata}
            onChange={(e) => setRawCalldata(e.target.value)}
            placeholder="0x..."
            rows={3}
            className={`${inputCls} font-mono text-xs resize-none`}
          />
        ) : (
          <>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="grantRole(bytes32,address)"
              className={`${inputCls} font-mono`}
            />
            {parseError && <p className="text-red-400 text-xs mt-1">{parseError}</p>}
            {parsedParams.length > 0 && (
              <div className="mt-2 space-y-2">
                {parsedParams.map((p, i) => (
                  <div key={i}>
                    <label className="text-xs text-gray-400">
                      {p.name} <span className="text-gray-600">({p.type})</span>
                    </label>
                    <input
                      type="text"
                      value={argValues[i] ?? ''}
                      onChange={(e) => {
                        const next = [...argValues]
                        next[i] = e.target.value
                        setArgValues(next)
                      }}
                      placeholder={p.type}
                      className={`${inputCls} mt-1 font-mono text-sm`}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Field>

      {/* Value */}
      <Field label="Value (wei)">
        <input
          type="number"
          min="0"
          value={ethValue}
          onChange={(e) => setEthValue(e.target.value)}
          className={inputCls}
        />
      </Field>

      {/* Predecessor */}
      <Field label="Predecessor" hint="0x000...0 if there is no dependency on another operation">
        <input
          type="text"
          value={predecessor}
          onChange={(e) => setPredecessor(e.target.value)}
          className={`${inputCls} font-mono text-xs`}
        />
      </Field>

      {/* Salt */}
      <Field label="Salt">
        <div className="flex gap-2">
          <input
            type="text"
            value={salt}
            onChange={(e) => setSalt(e.target.value as `0x${string}`)}
            className={`${inputCls} font-mono text-xs flex-1`}
          />
          <button
            type="button"
            onClick={() => setSalt(generateSalt())}
            className="px-3 py-2 border border-gray-600 rounded text-xs text-gray-400 hover:text-gray-200 hover:border-gray-400 shrink-0"
          >
            Regenerate
          </button>
        </div>
      </Field>

      {/* Delay */}
      <Field label={`Delay (seconds) — minimum: ${minDelay.toString()} (${formatDelay(minDelay)})`}>
        <input
          type="number"
          min={minDelay.toString()}
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          className={inputCls}
          required
        />
      </Field>

      {/* Label */}
      <div>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label / description"
          className={inputCls}
        />
      </div>

      {txError && (
        <Toast message={txError} type="error" onDismiss={() => setTxError(null)} />
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !userAddress}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium"
        >
          {isPending ? 'Signing…' : isSubmitting ? 'Confirming…' : 'Schedule operation'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500'

function Field({
  label,
  hint,
  children,
  aside,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-gray-300 flex items-center gap-1">
          {label}
          {hint && (
            <span title={hint} className="text-gray-600 cursor-help">
              <Info size={12} />
            </span>
          )}
        </label>
        {aside}
      </div>
      {children}
    </div>
  )
}
