import { useCallback, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { Settings2, List, Info, Wallet } from 'lucide-react'
import { Operations } from './pages/Operations'
import { NewOperation } from './pages/NewOperation'
import { Settings } from './pages/Settings'
import { About } from './pages/About'
import { NetworkSelector } from './components/NetworkSelector'
import { TimelockSelector } from './components/TimelockSelector'
import { useTimelockStore } from './contexts/timelocks'
import { useNetworks } from './hooks/useNetworks'
import { useAnalytics } from './analytics/analytics'

function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain

        return (
          <div aria-hidden={!mounted} className={!mounted ? 'opacity-0 pointer-events-none' : undefined}>
            {connected ? (
              <button
                onClick={openAccountModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-100 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                {account.ensName ?? account.displayName}
              </button>
            ) : (
              <button
                onClick={openConnectModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-100 transition-colors"
              >
                <Wallet size={14} />
                Connect
              </button>
            )}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

export default function App() {
  const { timelocks, activeAddress, selectTimelock } = useTimelockStore()
  const {address} = useAccount();
  const { networks } = useNetworks()
  const walletChainId = useChainId()
  const { switchChain } = useSwitchChain()
  const {sendEvent} = useAnalytics();

  const visibleTimelocks = timelocks.filter((t) => t.chainId === walletChainId)

  // On network change, auto-select the first available timelock (or clear)
  useEffect(() => {
    const activeIsValid = visibleTimelocks.some(
      (t) => t.address.toLowerCase() === activeAddress?.toLowerCase(),
    )
    if (!activeIsValid) {
      selectTimelock((visibleTimelocks[0]?.address ?? null) as `0x${string}` | null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletChainId])

  useEffect(() => {
    if (!address) {
      return;
    }

    sendEvent('wallet_connected');
  }, [address]);

  const handleSelectNetwork = useCallback(
    (chainId: number) => switchChain({ chainId }),
    [switchChain],
  )

  const handleSelectTimelock = useCallback(
    (address: `0x${string}`) => selectTimelock(address),
    [selectTimelock],
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/" className="font-bold text-indigo-400 shrink-0 hover:text-indigo-300 transition-colors">⏱ Timelock UI</a>

          <div className="flex gap-2 flex-1 min-w-0 overflow-hidden">
            <NetworkSelector
              networks={networks}
              activeChainId={walletChainId}
              onSelect={handleSelectNetwork}
            />
            <TimelockSelector
              timelocks={visibleTimelocks}
              activeAddress={activeAddress}
              onSelect={handleSelectTimelock}
            />
          </div>

          <nav className="flex items-center gap-1 shrink-0">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                  isActive ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              <List size={15} />
              Operations
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                  isActive ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              <Settings2 size={15} />
              Settings
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                  isActive ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              <Info size={15} />
              About
            </NavLink>
          </nav>

          <a
              href="https://github.com/Stakely/timelock-ui"
              target="_blank"
              rel="noopener noreferrer"
              title="Source code on GitHub"
              className="text-gray-400 hover:text-gray-200 transition-colors shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
            </a>

          <WalletButton />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Operations />} />
          <Route path="/new" element={<NewOperation />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-800 py-5 text-sm text-gray-400">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between gap-4 flex-wrap">
          <a href="https://stakely.io" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity shrink-0">
            <img src="https://img.stakely.io/brand-kit/full-logo/dark/full_logo_dark.svg" alt="Stakely" className="h-5" />
          </a>
          <div className="flex items-center gap-5 flex-wrap">
            <NavLink to="/about" className={({ isActive }) => isActive ? 'text-gray-200' : 'hover:text-gray-200 transition-colors'}>
              About
            </NavLink>
            <a
              href="https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-200 transition-colors"
            >
              OZ Docs
            </a>
            <a
              href="https://github.com/Stakely/timelock-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-200 transition-colors"
            >
              Contribute on GitHub
            </a>
            <a
              href="https://stakely.io/resources/contact-us"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-200 transition-colors"
            >
              Get in touch
            </a>
            <a
              href={`https://github.com/Stakely/timelock-ui/releases/tag/v${__APP_VERSION__}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View release on GitHub"
              className="text-gray-500 hover:text-gray-300 font-mono text-xs transition-colors"
            >
              v{__APP_VERSION__}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
