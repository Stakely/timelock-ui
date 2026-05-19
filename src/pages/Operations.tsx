import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, CloudDownload, Layers, Network, HelpCircle } from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'
import { OperationCard } from '../components/OperationCard'
import { Toast } from '../components/Toast'
import { useOperations } from '../hooks/useOperations'
import { useTimelockStore } from '../contexts/timelocks'
import { useNetworks } from '../hooks/useNetworks'
import { useTimelockRoles } from '../hooks/useTimelockRoles'
import { useChainSync } from '../hooks/useChainSync'
import { formatDelay } from '../lib/timelock'
import type { StoredOperation } from '../lib/storage'

export function Operations() {
  const navigate = useNavigate()
  const location = useLocation()
  const { address: userAddress } = useAccount()
  const walletChainId = useChainId()
  const { timelocks, activeTimelock } = useTimelockStore()
  const { networks, activeNetwork } = useNetworks()

  // Ignorar el timelock activo si no pertenece a la red actual
  const timelock = activeTimelock?.chainId === walletChainId ? activeTimelock : null

  const { operations, refresh, patchOperation } = useOperations(
    timelock?.chainId ?? null,
    timelock?.address ?? null,
  )
  const { roles, minDelay, isLoading: rolesLoading } = useTimelockRoles(
    timelock?.address ?? null,
    userAddress,
    timelock?.chainId,
  )
  const { sync, isSyncing, syncResult, syncError, progress, cursor } = useChainSync(
    timelock?.address ?? null,
    timelock?.chainId,
    refresh,
  )

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (location.state?.scheduledOk) {
      const needsSafe = Boolean(location.state.needsSafeSignatures)
      setToast({
        message: needsSafe
          ? 'Operation sent to Safe. Confirm signatures at app.safe.global to schedule on-chain.'
          : 'Operation scheduled successfully',
        type: needsSafe ? 'info' : 'success',
      })
      navigate('/', { replace: true, state: {} })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!syncResult || isSyncing) return
    const msg = syncResult.added > 0
      ? `Synced ${syncResult.fromBlock.toLocaleString()} → ${syncResult.toBlock.toLocaleString()} · ${syncResult.added} new operation${syncResult.added > 1 ? 's' : ''}`
      : `Synced ${syncResult.fromBlock.toLocaleString()} → ${syncResult.toBlock.toLocaleString()} · no changes`
    setToast({ message: msg, type: syncResult.added > 0 ? 'success' : 'info' })
  }, [syncResult, isSyncing])

  useEffect(() => {
    if (syncError) setToast({ message: syncError, type: 'error' })
  }, [syncError])

  if (!timelock) {
    const networkName = networks.find((n) => n.chainId === walletChainId)?.name ?? `Chain ${walletChainId}`
    const hasTimelocksOnOtherChains = timelocks.some((t) => t.chainId !== walletChainId)
    const hasAny = timelocks.length > 0

    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
        <div className="p-4 rounded-full bg-gray-800/60 border border-gray-700">
          {hasAny ? (
            <Network size={32} className="text-gray-500" />
          ) : (
            <Layers size={32} className="text-gray-500" />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-gray-200 font-medium text-lg">
            {hasAny ? `No timelocks on ${networkName}` : 'No timelocks configured'}
          </p>
          <p className="text-gray-500 text-sm max-w-xs">
            {hasAny && hasTimelocksOnOtherChains
              ? 'Switch to another network in the selector above, or add a timelock for this network.'
              : 'Go to Settings to add a TimelockController address.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors"
          >
            Go to Settings
          </button>
          <button
            onClick={() => navigate('/about')}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 rounded text-sm font-medium transition-colors"
          >
            <HelpCircle size={14} />
            Help
          </button>
        </div>
      </div>
    )
  }

  const explorerUrl = activeNetwork?.explorerUrl ?? ''

  return (
    <div className="space-y-6">
      {/* Active timelock info */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 border-b border-gray-800">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Timelock</p>
          <p className="text-sm font-mono text-gray-300">{timelock.address}</p>
        </div>
        {!rolesLoading && minDelay !== null && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Min Delay</p>
            <p className="text-sm text-gray-300">{minDelay.toString()}s ({formatDelay(minDelay)})</p>
          </div>
        )}
        {!rolesLoading && userAddress && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Your roles</p>
            <div className="flex gap-1 flex-wrap">
              {roles.isAdmin && <RolePill label="ADMIN" />}
              {roles.isProposer && <RolePill label="PROPOSER" />}
              {roles.isExecutor && <RolePill label="EXECUTOR" />}
              {roles.isCanceller && <RolePill label="CANCELLER" />}
              {!roles.isAdmin && !roles.isProposer && !roles.isExecutor && !roles.isCanceller && (
                <span className="text-xs text-gray-600 italic">No roles</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* List header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-100">
          Operations{' '}
          <span className="text-gray-500 text-sm font-normal">({operations.length})</span>
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={sync}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-700 hover:border-indigo-600 text-gray-400 hover:text-indigo-300 disabled:opacity-50 rounded text-sm"
            >
              <CloudDownload size={13} />
              {isSyncing ? 'Scanning…' : 'Scan operations'}
            </button>
            {isSyncing && progress && (
              <p className="text-xs font-mono text-gray-500">{progress}</p>
            )}
            {!isSyncing && cursor > 0 && (
              <p className="text-xs text-gray-600">
                Last scanned: block {cursor.toLocaleString()}
              </p>
            )}
          </div>
          {roles.isProposer && (
            <button
              onClick={() => navigate('/new')}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm"
            >
              <Plus size={14} />
              New operation
            </button>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Lista */}
      {operations.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p>No operations saved for this timelock.</p>
          {roles.isProposer && (
            <button
              onClick={() => navigate('/new')}
              className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm underline"
            >
              Create the first operation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {operations.map((op) => (
            <OperationCard
              key={op.id}
              operation={op}
              explorerUrl={explorerUrl}
              onPatched={(id, patch) => patchOperation(id, patch as Partial<StoredOperation>)}
              onToast={setToast}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RolePill({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 bg-indigo-900/50 border border-indigo-700 text-indigo-300 rounded text-xs font-mono">
      {label}
    </span>
  )
}
