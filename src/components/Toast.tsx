import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'info' | 'success' | 'error'
  duration?: number
  onDismiss: () => void
}

export function Toast({ message, type = 'info', duration = 4500, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const enter = setTimeout(() => setVisible(true), 10)
    const exit = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)
    return () => { clearTimeout(enter); clearTimeout(exit) }
  }, [duration, onDismiss])

  const dismiss = () => { setVisible(false); setTimeout(onDismiss, 300) }

  const accent =
    type === 'error' ? 'border-red-700' :
    type === 'success' ? 'border-green-700' :
    'border-gray-700'

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-lg border bg-gray-800 shadow-xl text-sm max-w-sm transition-all duration-300 ${accent} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <span className={`flex-1 ${type === 'error' ? 'text-red-300' : type === 'success' ? 'text-green-300' : 'text-gray-300'}`}>
        {message}
      </span>
      <button onClick={dismiss} className="text-gray-500 hover:text-gray-300 shrink-0 mt-0.5">
        <X size={14} />
      </button>
    </div>
  )
}
