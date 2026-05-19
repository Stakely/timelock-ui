import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { OperationForm } from '../components/OperationForm'
import { useTimelockStore } from '../contexts/timelocks'
import { useNetworks } from '../hooks/useNetworks'
import { useTimelockRoles } from '../hooks/useTimelockRoles'
import { useAccount } from 'wagmi'
import { formatDelay } from '../lib/timelock'

export function NewOperation() {
  const navigate = useNavigate()
  const { activeTimelock } = useTimelockStore()
  useNetworks() // keeps the network context for future iterations
  const { address: userAddress } = useAccount()
  const { roles, minDelay, isLoading } = useTimelockRoles(
    activeTimelock?.address ?? null,
    userAddress,
    activeTimelock?.chainId,
  )

  if (!activeTimelock) {
    return (
      <div className="py-8">
        <p className="text-gray-400">
          No timelock selected. Go to{' '}
          <button onClick={() => navigate('/settings')} className="text-indigo-400 underline">
            Settings
          </button>{' '}
          to configure one.
        </p>
      </div>
    )
  }

  if (!userAddress) {
    return (
      <div className="py-8">
        <p className="text-gray-400">Connect your wallet to create operations.</p>
      </div>
    )
  }

  if (isLoading && !roles.isProposer) {
    return (
      <div className="py-8">
        <p className="text-gray-400">Checking permissions…</p>
      </div>
    )
  }

  if (!roles.isProposer) {
    return (
      <div className="py-8">
        <p className="text-yellow-400">
          Your wallet does not have the <code className="text-yellow-300">PROPOSER_ROLE</code> in this
          timelock and cannot schedule operations.
        </p>
      </div>
    )
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 text-gray-500 hover:text-gray-300"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-100">New operation</h1>
          <p className="text-sm text-gray-500">
            {activeTimelock.name} ·{' '}
            {minDelay !== null
              ? `minDelay: ${minDelay}s (${formatDelay(minDelay)})`
              : '…'}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <OperationForm
          timelockAddress={activeTimelock.address}
          chainId={activeTimelock.chainId}
          minDelay={minDelay ?? 0n}
          onScheduled={(opts) =>
            navigate('/', {
              state: {
                scheduledOk: true,
                needsSafeSignatures: opts?.needsSafeSignatures ?? false,
                receiptPending: opts?.receiptPending ?? false,
              },
            })
          }
          onCancel={() => navigate('/')}
        />
      </div>
    </div>
  )
}
