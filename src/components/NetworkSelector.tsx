import { type StoredNetwork } from '../lib/storage'

interface Props {
  networks: StoredNetwork[]
  activeChainId: number | null
  onSelect: (chainId: number) => void
}

export function NetworkSelector({ networks, activeChainId, onSelect }: Props) {
  if (networks.length === 0) return null

  return (
    <select
      value={activeChainId ?? ''}
      onChange={(e) => onSelect(Number(e.target.value))}
      className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 max-w-[160px]"
    >
      {networks.map((n) => (
        <option key={n.chainId} value={n.chainId}>
          {n.name}
        </option>
      ))}
    </select>
  )
}
