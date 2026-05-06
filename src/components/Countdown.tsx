import { useEffect, useState } from 'react'
import { timeUntilReady, formatCountdown } from '../lib/timelock'

interface Props {
  readyAt: bigint   // unix timestamp in seconds
  onReady?: () => void
}

export function Countdown({ readyAt, onReady }: Props) {
  const [remaining, setRemaining] = useState(() => timeUntilReady(readyAt))

  useEffect(() => {
    if (remaining <= 0) {
      onReady?.()
      return
    }
    const interval = setInterval(() => {
      const r = timeUntilReady(readyAt)
      setRemaining(r)
      if (r <= 0) {
        clearInterval(interval)
        onReady?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [readyAt, onReady, remaining])

  if (remaining <= 0) return <span className="text-green-400 font-mono text-sm">Ready!</span>

  return (
    <span className="text-yellow-300 font-mono text-sm" title={`Ready at ${new Date(Number(readyAt) * 1000).toLocaleString()}`}>
      {formatCountdown(remaining)}
    </span>
  )
}
