import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { getNetworks, type StoredNetwork } from './storage'

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID ?? ''

function storedNetworkToChain(n: StoredNetwork) {
  return {
    id: n.chainId,
    name: n.name,
    nativeCurrency: { name: n.currencySymbol, symbol: n.currencySymbol, decimals: 18 },
    rpcUrls: { default: { http: [n.rpcUrl] } },
    blockExplorers: n.explorerUrl
      ? { default: { name: 'Explorer', url: n.explorerUrl } }
      : undefined,
  } as const
}

// Builds the wagmi config by reading networks from localStorage at runtime.
// Called once on app start (and can be re-called if the user edits networks).
export function buildWagmiConfig() {
  const stored = getNetworks()

  // Chains for wagmi: always include mainnet as a fallback so
  // RainbowKit doesn't complain if the array is empty.
  const customChains = stored.map(storedNetworkToChain)
  const chains = customChains.length > 0 ? customChains : [mainnet, sepolia]

  const connectors = connectorsForWallets(
    [
      {
        groupName: 'Recommended',
        wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet],
      },
    ],
    {
      appName: 'Timelock UI',
      projectId: WC_PROJECT_ID,
    },
  )

  // Transports: one per chain
  const transports = Object.fromEntries(chains.map((c) => [c.id, http()]))

  return createConfig({
    chains: chains as any,
    transports,
    connectors,
  })
}
