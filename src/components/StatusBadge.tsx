import { STATE_LABELS, type OperationStateValue } from '../lib/timelock'

const COLORS: Record<number, string> = {
  0: 'bg-gray-700 text-gray-300',
  1: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  2: 'bg-green-900/60 text-green-300 border border-green-600',
  3: 'bg-blue-900/60 text-blue-300 border border-blue-700',
}

interface Props {
  state: OperationStateValue
}

export function StatusBadge({ state }: Props) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${COLORS[state] ?? COLORS[0]}`}>
      {STATE_LABELS[state] ?? 'Unknown'}
    </span>
  )
}
