import { useEffect, useState } from 'react'
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

  // Latch: once we've confirmed the wallet has PROPOSER_ROLE and read a
  // minDelay, hold on to those values. A flaky RPC can make hasRole/getMinDelay
  // briefly return error/false on a refetch, and we don't want that to unmount
  // the form (which would wipe everything the user typed).
  const [confirmedProposer, setConfirmedProposer] = useState(false)
  const [stableMinDelay, setStableMinDelay] = useState<bigint | null>(null)

  // The latch is scoped to (wallet, timelock, chain). When any of those change
  // the previous confirmation no longer applies — a different wallet may not
  // have the role, a different timelock has its own AccessControl state, and
  // a different chain queries a different contract entirely. Reset during
  // render so the next paint already reflects the new session.
  const sessionKey = `${userAddress ?? ''}|${activeTimelock?.address ?? ''}|${activeTimelock?.chainId ?? ''}`
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey)
  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey)
    setConfirmedProposer(false)
    setStableMinDelay(null)
  }

  useEffect(() => {
    if (roles.isProposer) setConfirmedProposer(true)
  }, [roles.isProposer])

  useEffect(() => {
    if (minDelay !== null) setStableMinDelay(minDelay)
  }, [minDelay])

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

  // Don't show the "no PROPOSER_ROLE" warning while we're still loading, and
  // don't show it after a successful confirmation — only show it if we've
  // received a response and it confirmed the role is missing.
  if (isLoading && !confirmedProposer) {
    return (
      <div className="py-8">
        <p className="text-gray-400">Checking permissions…</p>
      </div>
    )
  }

  if (!roles.isProposer && !confirmedProposer) {
    return (
      <div className="py-8">
        <p className="text-yellow-400">
          Your wallet does not have the <code className="text-yellow-300">PROPOSER_ROLE</code> in this
          timelock and cannot schedule operations.
        </p>
      </div>
    )
  }

  const effectiveMinDelay = stableMinDelay ?? minDelay

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
            {effectiveMinDelay !== null
              ? `minDelay: ${effectiveMinDelay}s (${formatDelay(effectiveMinDelay)})`
              : '…'}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <OperationForm
          timelockAddress={activeTimelock.address}
          chainId={activeTimelock.chainId}
          minDelay={effectiveMinDelay ?? 0n}
          onScheduled={() => navigate('/', { state: { scheduledOk: true } })}
          onCancel={() => navigate('/')}
        />
      </div>
    </div>
  )
}
