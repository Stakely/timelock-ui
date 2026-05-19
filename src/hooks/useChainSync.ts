import { useState, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import {
  upsertOperation,
  getOperations,
  getSyncCursor,
  setSyncCursor,
  type StoredOperation,
} from '../lib/storage'

const CALL_SCHEDULED_EVENT = parseAbiItem(
  'event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)',
)

// Conservative chunk size: public RPCs commonly reject getLogs ranges above
// ~10k blocks ("Missing or invalid parameters" / "range too wide"). 2k stays
// well under all the providers we've seen and only adds a handful of round
// trips per scan.
const CHUNK_SIZE = 2_000n

// Load-balanced RPCs (e.g. publicnode, ethpandaops) route each request to a
// different backend, and one of them may temporarily reject the range while
// the rest accept it. Retrying usually lands on a healthier node.
const MAX_ATTEMPTS = 3

export interface SyncResult {
  found: number
  added: number
  fromBlock: number
  toBlock: number
}

// Maps the various ways a flaky RPC manifests (viem TypeErrors from parsing a
// malformed response, JSON-RPC errors like "Requested resource not found",
// HTTP/timeout failures) into a single user-facing message. Anything that
// doesn't look RPC-shaped falls through with its raw message so we don't hide
// genuine bugs.
function formatSyncError(e: unknown): string {
  const err = e as { message?: string; shortMessage?: string; name?: string } | null
  const msg = err?.shortMessage ?? err?.message ?? ''
  const name = err?.name ?? ''
  const looksLikeRpcIssue =
    e instanceof TypeError ||
    name === 'HttpRequestError' ||
    name === 'RpcRequestError' ||
    name === 'TimeoutError' ||
    /resource not found|invalid parameters|query range|timeout|network|fetch failed|aborted/i.test(msg)
  if (looksLikeRpcIssue) {
    return 'RPC connection issue — please try Scan again.'
  }
  return msg || 'Unknown error'
}

export function useChainSync(
  timelockAddress: `0x${string}` | null,
  chainId: number | undefined,
  onSynced: () => void,
) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const client = usePublicClient({ chainId })

  // Current cursor stored in localStorage
  const cursor = timelockAddress && chainId
    ? getSyncCursor(chainId, timelockAddress)
    : 0

  const sync = useCallback(async () => {
    if (!timelockAddress || !chainId || !client) return
    setIsSyncing(true)
    setSyncError(null)
    setSyncResult(null)
    setProgress(null)

    try {
      const latestBlock = await client.getBlockNumber()
      const fromBlock = BigInt(getSyncCursor(chainId, timelockAddress))
      const toBlockFinal = latestBlock

      if (fromBlock > toBlockFinal) {
        setSyncResult({ found: 0, added: 0, fromBlock: Number(fromBlock), toBlock: Number(toBlockFinal) })
        onSynced()
        return
      }

      const existingOps = getOperations(chainId, timelockAddress)
      const existingIds = new Set(existingOps.map((op) => op.id.toLowerCase()))

      const seen = new Set<string>()
      let added = 0
      let chunkStart = fromBlock

      const fetchLogsWithRetry = async (from: bigint, to: bigint) => {
        let lastError: unknown
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          setProgress(
            attempt === 1
              ? `Scanning ${from.toLocaleString()} → ${to.toLocaleString()} / ${toBlockFinal.toLocaleString()}`
              : `Retrying (${attempt}/${MAX_ATTEMPTS}) · ${from.toLocaleString()} → ${to.toLocaleString()}`,
          )
          try {
            return await client.getLogs({
              address: timelockAddress,
              event: CALL_SCHEDULED_EVENT,
              fromBlock: from,
              toBlock: to,
            })
          } catch (e) {
            lastError = e
            console.warn(`[chain-sync] attempt ${attempt}/${MAX_ATTEMPTS} failed for ${from}-${to}`, e)
            if (attempt < MAX_ATTEMPTS) {
              // Small backoff (200ms, 400ms). Gives the load balancer a chance
              // to route the retry to a different backend.
              await new Promise((r) => setTimeout(r, 200 * attempt))
            }
          }
        }
        throw lastError
      }

      while (chunkStart <= toBlockFinal) {
        const chunkEnd = chunkStart + CHUNK_SIZE - 1n < toBlockFinal
          ? chunkStart + CHUNK_SIZE - 1n
          : toBlockFinal

        const logs = await fetchLogsWithRetry(chunkStart, chunkEnd)

        for (const log of logs) {
          const { id, index, target, value, data, predecessor, delay } = log.args as {
            id: `0x${string}`
            index: bigint
            target: `0x${string}`
            value: bigint
            data: `0x${string}`
            predecessor: `0x${string}`
            delay: bigint
          }

          if (index !== 0n) continue
          if (seen.has(id.toLowerCase())) continue
          seen.add(id.toLowerCase())

          if (!existingIds.has(id.toLowerCase())) {
            const op: StoredOperation = {
              id,
              timelockAddress,
              chainId,
              target,
              value: value.toString(),
              data,
              predecessor,
              salt: undefined,
              delay: delay.toString(),
              label: '',
              source: 'chain',
              scheduledAt: 0,
              scheduleTxHash: log.transactionHash ?? undefined,
            }
            upsertOperation(op)
            existingIds.add(id.toLowerCase())
            added++
          }
        }

        // Save the cursor after each chunk to allow resuming if interrupted
        setSyncCursor(chainId, timelockAddress, Number(chunkEnd) + 1)
        chunkStart = chunkEnd + 1n
      }

      setProgress(null)
      setSyncResult({
        found: seen.size,
        added,
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlockFinal),
      })
      onSynced()
    } catch (e: unknown) {
      setProgress(null)
      console.error('[chain-sync] sync failed', e)
      setSyncError(formatSyncError(e))
    } finally {
      setIsSyncing(false)
    }
  }, [timelockAddress, chainId, client, onSynced])

  return { sync, isSyncing, syncResult, syncError, progress, cursor }
}
