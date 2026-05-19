// Helpers for detecting Safe (smart-contract multisig) sessions.
//
// Why this matters: when the user pays Safe to "schedule" a transaction, the
// hash returned by writeContract is a Safe-tx-hash, NOT an Ethereum tx hash.
// Querying eth_getTransactionReceipt with it never resolves until enough
// signers approve and someone broadcasts. We detect Safe to skip the receipt
// wait and tell the user to finish signing in app.safe.global.

interface WalletMetadata {
  name?: string
  url?: string
}

// Pure check for a WalletConnect peer metadata object — kept separate so it
// can be unit tested without spinning up a wagmi connector. Match rules,
// designed to exclude unrelated wallets that happen to have "safe" in their
// name (SafePal, SafeMoon, Safeguard, etc.):
//
//   - url hosted under safe.global (or its subdomains) — strong signal,
//     hard to spoof since the domain is controlled by Safe.
//   - OR a name that exactly matches one of Safe's published wallet names
//     (current "Safe{Wallet}", legacy "Safe Wallet", short "Safe", and the
//     legacy "Safe Multisig" / "Gnosis Safe").
//
// Substring "safe" alone is NOT enough — it produced false positives for
// SafePal & friends, which are EOAs and shouldn't skip receipt polling.
const SAFE_NAME_PATTERN = /^(safe(\s*\{wallet\}|\s+wallet|\s+multisig)?|gnosis\s+safe)$/i

// Hostname check rather than a substring match: rejects safe.global.attacker.com
// while still accepting any subdomain Safe owns (app.safe.global, staging…).
function isSafeGlobalUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase()
    return host === 'safe.global' || host.endsWith('.safe.global')
  } catch {
    return false
  }
}

export function isSafeByMetadata(meta: WalletMetadata | null | undefined): boolean {
  if (!meta) return false
  const name = meta.name?.trim() ?? ''
  if (meta.url && isSafeGlobalUrl(meta.url)) return true
  return SAFE_NAME_PATTERN.test(name)
}

// Synchronous fast path. Catches:
//   1. The wagmi Safe connector (id 'safe'), used when our dApp is embedded
//      inside app.safe.global as a Safe App.
//   2. Any connector whose own .name happens to report as Safe.
// Does NOT catch Safe-over-WalletConnect — for that case the WC peer metadata
// lives behind connector.getProvider() and must be read asynchronously. See
// useIsSafeWallet().
export function isSafeConnectorSync(
  connector: { id?: string; name?: string } | null | undefined,
): boolean {
  if (!connector) return false
  if (connector.id?.toLowerCase() === 'safe') return true
  return isSafeByMetadata({ name: connector.name })
}

// Safety-net timeout for waitForTransactionReceipt with EOAs. A normal mainnet
// TX confirms in seconds; if we're still waiting after 5 minutes something is
// stuck (RPC issue, dropped TX, undetected smart-contract wallet) and it's
// better to release the UI than freeze on a spinner.
export const RECEIPT_TIMEOUT_MS = 5 * 60 * 1000
