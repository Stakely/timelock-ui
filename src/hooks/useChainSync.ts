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

const CHUNK_SIZE = 5_000n

export interface SyncResult {
  found: number
  added: number
  fromBlock: number
  toBlock: number
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

      while (chunkStart <= toBlockFinal) {
        const chunkEnd = chunkStart + CHUNK_SIZE - 1n < toBlockFinal
          ? chunkStart + CHUNK_SIZE - 1n
          : toBlockFinal

        setProgress(`Scanning ${chunkStart.toLocaleString()} → ${chunkEnd.toLocaleString()} / ${toBlockFinal.toLocaleString()}`)

        const logs = await client.getLogs({
          address: timelockAddress,
          event: CALL_SCHEDULED_EVENT,
          fromBlock: chunkStart,
          toBlock: chunkEnd,
        })

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
    } catch (e: any) {
      setProgress(null)
      setSyncError(e?.shortMessage ?? e?.message ?? 'Unknown error')
    } finally {
      setIsSyncing(false)
    }
  }, [timelockAddress, chainId, client, onSynced])

  return { sync, isSyncing, syncResult, syncError, progress, cursor }
}
