import { type StoredTimelock } from '../lib/storage'
import { shortHex } from '../lib/timelock'

interface Props {
  timelocks: StoredTimelock[]
  activeAddress: `0x${string}` | null
  onSelect: (address: `0x${string}`) => void
}

export function TimelockSelector({ timelocks, activeAddress, onSelect }: Props) {
  return (
    <select
      value={activeAddress ?? ''}
      onChange={(e) => onSelect(e.target.value as `0x${string}`)}
      disabled={timelocks.length === 0}
      className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed max-w-[260px] min-w-0"
    >
      {timelocks.length === 0 ? (
        <option value="">No timelocks on this network</option>
      ) : (
        timelocks.map((tl) => (
          <option key={tl.address} value={tl.address}>
            {tl.name} ({shortHex(tl.address)})
          </option>
        ))
      )}
    </select>
  )
}
