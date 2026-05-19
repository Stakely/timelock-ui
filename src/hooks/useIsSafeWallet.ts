import { useEffect, useState } from 'react'
import { useAccount, useConnections } from 'wagmi'
import { isSafeByMetadata, isSafeConnectorSync } from '../lib/connectors'

// Returns true when the connected wallet is Safe (the multisig). Covers two
// paths:
//
//   1. Synchronously: the dedicated Safe connector (id 'safe', used when the
//      dApp is loaded as a Safe App) or any connector that names itself Safe.
//
//   2. Asynchronously: a WalletConnect session whose peer.metadata identifies
//      itself as Safe — this is how Safe actually shows up when the user
//      scans the WC QR from app.safe.global. wagmi reports the connector as
//      "WalletConnect", so the sync check misses it; we read the WC provider's
//      session metadata to recover the real wallet identity.
//
// Implementation note: useAccount().connector exposes a thin descriptor
// (id/name/type/uid) without instance methods. The real connector — the one
// that owns getProvider() and the live WC session — lives in the active
// connection object returned by useConnections(). The connection sometimes
// arrives shallow first and gets re-emitted with the full instance, which is
// fine: the effect re-runs and picks up the provider on the second pass.
export function useIsSafeWallet(): boolean {
  const { connector: accountConnector } = useAccount()
  const connections = useConnections()
  // Match the active account's connector by uid. wagmi can hold multiple
  // connections simultaneously (e.g. an injected wallet plus a WC session),
  // so picking connections[0] would risk reading the wrong one.
  const liveConnector =
    connections.find((c) => c.connector.uid === accountConnector?.uid)?.connector ??
    accountConnector

  const [isSafe, setIsSafe] = useState<boolean>(() => isSafeConnectorSync(accountConnector))

  useEffect(() => {
    const syncAnswer = isSafeConnectorSync(liveConnector)
    setIsSafe(syncAnswer)

    if (!liveConnector) return
    if (syncAnswer) return

    const id = liveConnector.id?.toLowerCase() ?? ''
    const type = (liveConnector as any).type?.toLowerCase() ?? ''
    if (!id.includes('walletconnect') && !type.includes('walletconnect')) return

    let cancelled = false
    ;(async () => {
      try {
        const getProvider = (liveConnector as any).getProvider
        if (typeof getProvider !== 'function') return
        const provider: any = await getProvider.call(liveConnector)
        if (cancelled) return
        if (isSafeByMetadata(provider?.session?.peer?.metadata)) setIsSafe(true)
      } catch {
        // Provider not ready or failed to read — the receipt-wait timeout in
        // the schedule/execute/cancel flows is the safety net.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [liveConnector])

  return isSafe
}
