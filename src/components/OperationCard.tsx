import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { ChevronDown, ChevronUp, ExternalLink, Play, X, KeyRound, Copy, Loader2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { Countdown } from './Countdown'
import { useOperationState } from '../hooks/useOperationState'
import { useTimelockRoles } from '../hooks/useTimelockRoles'
import { timelockAbi } from '../abis/timelock'
import { OperationState, shortHex, explorerTxUrl, explorerAddressUrl, hashOperation } from '../lib/timelock'
import type { StoredOperation } from '../lib/storage'

interface Props {
  operation: StoredOperation
  explorerUrl: string
  onPatched: (id: `0x${string}`, patch: Partial<StoredOperation>) => void
  onToast: (t: { message: string; type: 'info' | 'success' | 'error' }) => void
}

export function OperationCard({ operation, explorerUrl, onPatched, onToast }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [txPending, setTxPending] = useState(false)
  const [saltInput, setSaltInput] = useState('')
  const [saltError, setSaltError] = useState<string | null>(null)
  const { address: userAddress } = useAccount()
  const client = usePublicClient({ chainId: operation.chainId })

  const { data: onChain, isLoading, refetch } = useOperationState(
    operation.timelockAddress,
    operation.id,
    operation.chainId,
  )
  const { roles } = useTimelockRoles(operation.timelockAddress, userAddress, operation.chainId)
  const { writeContractAsync, isPending } = useWriteContract()

  const state = onChain?.state ?? 0
  const readyAt = onChain?.readyAt ?? 0n
  const hasSalt = Boolean(operation.salt)

  function handleSaveSalt() {
    setSaltError(null)
    const s = saltInput.trim() as `0x${string}`
    if (!/^0x[0-9a-fA-F]{64}$/.test(s)) {
      setSaltError('Invalid salt: must be 0x followed by 64 hex characters')
      return
    }
    // Verificar que el salt cuadra con el operation ID
    const computed = hashOperation(
      operation.target,
      BigInt(operation.value),
      operation.data,
      operation.predecessor,
      s,
    )
    if (computed.toLowerCase() !== operation.id.toLowerCase()) {
      setSaltError('Incorrect salt: does not match the on-chain operation ID')
      return
    }
    onPatched(operation.id, { salt: s, source: 'local' })
    setSaltInput('')
  }

  async function handleExecute() {
    if (!operation.salt) return
    try {
      const hash = await writeContractAsync({
        address: operation.timelockAddress,
        abi: timelockAbi,
        functionName: 'execute',
        args: [
          operation.target,
          BigInt(operation.value),
          operation.data,
          operation.predecessor,
          operation.salt,
        ],
        value: BigInt(operation.value),
        chainId: operation.chainId,
      })
      onPatched(operation.id, { executeTxHash: hash })
      setTxPending(true)
      await client?.waitForTransactionReceipt({ hash })
      refetch()
      onToast({ message: 'Operation executed successfully', type: 'success' })
    } catch (e: any) {
      onToast({ message: e?.shortMessage ?? e?.message ?? 'Unknown error', type: 'error' })
    } finally {
      setTxPending(false)
    }
  }

  async function handleCancel() {
    try {
      const hash = await writeContractAsync({
        address: operation.timelockAddress,
        abi: timelockAbi,
        functionName: 'cancel',
        args: [operation.id],
        chainId: operation.chainId,
      })
      onPatched(operation.id, { cancelTxHash: hash })
      setTxPending(true)
      await client?.waitForTransactionReceipt({ hash })
      refetch()
      onToast({ message: 'Operation cancelled', type: 'info' })
    } catch (e: any) {
      onToast({ message: e?.shortMessage ?? e?.message ?? 'Unknown error', type: 'error' })
    } finally {
      setTxPending(false)
    }
  }

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      state === OperationState.Ready
        ? 'border-green-600 bg-green-950/20'
        : 'border-gray-700 bg-gray-900'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge state={state} />
            {!hasSalt && (state === OperationState.Waiting || state === OperationState.Ready) && (
              <span className="px-1.5 py-0.5 bg-yellow-900/40 border border-yellow-700 text-yellow-400 rounded text-xs font-mono">
                no salt
              </span>
            )}
            {operation.source === 'chain' && (
              <span className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 text-gray-500 rounded text-xs">
                Discovered onchain
              </span>
            )}
            {state === OperationState.Waiting && readyAt > 0n && (
              <Countdown readyAt={readyAt} onReady={() => refetch()} />
            )}
          </div>
          <p className="mt-1 font-medium text-gray-100 truncate">
            {operation.label || <span className="text-gray-500 italic">(no label)</span>}
          </p>
          <p className="text-sm text-gray-400 font-mono">
            <a
              href={explorerAddressUrl(explorerUrl, operation.target)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400"
            >
              {shortHex(operation.target)}
            </a>
            {operation.methodSignature && (
              <span className="text-gray-500"> · {operation.methodSignature.split('(')[0]}(…)</span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {state === OperationState.Ready && roles.isExecutor && (
            hasSalt ? (
              <button
                onClick={handleExecute}
                disabled={isPending || txPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded text-sm font-medium"
              >
                {isPending || txPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Play size={14} />
                }
                {isPending ? 'Confirm in wallet…' : txPending ? 'Waiting…' : 'Execute'}
              </button>
            ) : (
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-yellow-700/60 hover:bg-yellow-700 text-yellow-200 rounded text-sm font-medium"
                title="You need the salt to execute"
              >
                <KeyRound size={14} />
                Provide salt
              </button>
            )
          )}
          {(state === OperationState.Waiting || state === OperationState.Ready) && roles.isCanceller && (
            <button
              onClick={handleCancel}
              disabled={isPending || txPending}
              className="flex items-center gap-1.5 px-2 py-1.5 border border-red-700 hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed text-red-400 rounded text-sm"
            >
              {isPending || txPending
                ? <Loader2 size={14} className="animate-spin" />
                : <X size={14} />
              }
              {isPending ? 'Confirm…' : txPending ? 'Waiting…' : 'Cancel'}
            </button>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-gray-500 hover:text-gray-300"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
          {/* Salt input if missing and op is still actionable */}
          {!hasSalt && (state === OperationState.Waiting || state === OperationState.Ready) && (
            <div className="bg-yellow-950/30 border border-yellow-800 rounded p-3 space-y-2">
              <p className="text-yellow-300 text-xs font-medium flex items-center gap-1">
                <KeyRound size={12} />
                Unknown salt — required to execute
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saltInput}
                  onChange={(e) => setSaltInput(e.target.value)}
                  placeholder="0x0000...0000"
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-xs font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-yellow-600"
                />
                <button
                  onClick={handleSaveSalt}
                  disabled={!saltInput}
                  className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white rounded text-xs"
                >
                  Verify & save
                </button>
              </div>
              {saltError && <p className="text-red-400 text-xs">{saltError}</p>}
              <p className="text-gray-500 text-xs">
                The salt is verified by computing hashOperation locally and comparing it with the on-chain ID.
              </p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-2 text-sm">
            <DetailRow label="Operation ID" value={operation.id} mono copyable />
            <DetailRow label="Target" value={operation.target} mono link={explorerAddressUrl(explorerUrl, operation.target)} />
            <DetailRow label="Calldata" value={operation.data} mono expandable copyable />
            <DetailRow label="Value" value={`${operation.value} wei`} mono />
            <DetailRow label="Predecessor" value={operation.predecessor} mono />
            <DetailRow label="Salt" value={operation.salt ?? '(unknown)'} mono copyable={hasSalt} />
            <DetailRow label="Delay" value={`${operation.delay}s`} mono />
            {operation.scheduleTxHash && (
              <DetailRow label="Schedule TX" value={shortHex(operation.scheduleTxHash)} link={explorerTxUrl(explorerUrl, operation.scheduleTxHash)} />
            )}
            {operation.executeTxHash && (
              <DetailRow label="Execute TX" value={shortHex(operation.executeTxHash)} link={explorerTxUrl(explorerUrl, operation.executeTxHash)} />
            )}
            {operation.cancelTxHash && (
              <DetailRow label="Cancel TX" value={shortHex(operation.cancelTxHash)} link={explorerTxUrl(explorerUrl, operation.cancelTxHash)} />
            )}
            {isLoading && <p className="text-gray-500 italic text-xs">Loading on-chain state…</p>}
          </div>
        </div>
      )}
    </div>
  )
}

const CALLDATA_PREVIEW_LEN = 80

function DetailRow({
  label,
  value,
  mono,
  link,
  truncate,
  expandable,
  copyable,
}: {
  label: string
  value: string
  mono?: boolean
  link?: string
  truncate?: boolean
  expandable?: boolean
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [showFull, setShowFull] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const isLong = expandable && value.length > CALLDATA_PREVIEW_LEN
  const displayValue = expandable && isLong && !showFull
    ? value.slice(0, CALLDATA_PREVIEW_LEN) + '…'
    : value

  return (
    <div className="flex gap-2 items-start">
      <span className="text-gray-500 shrink-0 w-32 text-sm">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-gray-300 text-sm ${truncate ? 'truncate max-w-xs' : 'break-all'} flex-1`}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 inline-flex items-center gap-1">
            {value} <ExternalLink size={12} />
          </a>
        ) : displayValue}
        {isLong && (
          <button
            onClick={() => setShowFull((v) => !v)}
            className="ml-2 text-indigo-400 hover:text-indigo-300 text-xs font-sans underline-offset-2 underline"
          >
            {showFull ? 'Collapse' : 'Show all'}
          </button>
        )}
      </span>
      {copyable && (
        <button onClick={copy} className="shrink-0 text-gray-600 hover:text-gray-300 mt-0.5">
          <Copy size={12} />
          {copied && <span className="text-xs text-green-400 ml-1">✓</span>}
        </button>
      )}
    </div>
  )
}
