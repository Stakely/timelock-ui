import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { getNetworks, type StoredNetwork } from './storage'

export const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID ?? ''
// RainbowKit v2 aborts on an empty projectId even when WalletConnect is unused,
// so feed it a non-empty placeholder when the env var is missing.
const RK_PROJECT_ID = WC_PROJECT_ID || 'walletconnect-disabled'

if (!WC_PROJECT_ID && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '[timelock-ui] VITE_WC_PROJECT_ID is missing — only the injected (browser) wallet is enabled. Get a free Project ID at https://cloud.reown.com.',
  )
}

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

  // Without a WalletConnect Project ID we can only safely expose the injected
  // (browser) wallet. The MetaMask/Coinbase/Rainbow connectors all build a WC
  // QR for their mobile flow, which crashes with "invalid border=0" when the
  // projectId is fake.
  const wallets = WC_PROJECT_ID
    ? [metaMaskWallet, walletConnectWallet, coinbaseWallet, rainbowWallet]
    : [injectedWallet]

  const connectors = connectorsForWallets(
    [{ groupName: 'Recommended', wallets }],
    {
      appName: 'Timelock UI',
      projectId: RK_PROJECT_ID,
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
