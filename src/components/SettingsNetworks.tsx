import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import type { StoredNetwork } from '../lib/storage'
import { useAnalytics } from '../analytics/analytics'

interface Props {
  networks: StoredNetwork[]
  onAdd: (n: StoredNetwork) => void
  onUpdate: (chainId: number, patch: Partial<StoredNetwork>) => void
  onRemove: (chainId: number) => void
}

const EMPTY: StoredNetwork = {
  chainId: 0,
  name: '',
  rpcUrl: '',
  currencySymbol: 'ETH',
  explorerUrl: '',
}

export function SettingsNetworks({ networks, onAdd, onUpdate, onRemove }: Props) {
  const {sendEvent} = useAnalytics();

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<StoredNetwork>(EMPTY)

  function openAdd() {
    sendEvent('add_network_button_clicked');
    setForm(EMPTY)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(n: StoredNetwork) {
    setForm(n)
    setEditId(n.chainId)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
  }

  function handleSave() {
    if (!form.name || !form.rpcUrl || form.chainId <= 0) return
    
    sendEvent('save_network_button_clicked');

    if (editId !== null) {
      onUpdate(editId, form)
    } else {
      onAdd(form)
    }
    closeForm()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-100">Networks</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Switch networks using the chain selector in your wallet (top right button).
      </p>

      {showForm && (
        <NetworkForm
          form={form}
          isEdit={editId !== null}
          onChange={setForm}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      <div className="space-y-2">
        {networks.length === 0 && (
          <p className="text-gray-500 italic text-sm">No networks configured.</p>
        )}
        {networks.map((n) => (
          <div
            key={n.chainId}
            className="flex items-center gap-3 p-3 rounded border border-gray-700 bg-gray-900"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-100 text-sm">{n.name}</p>
              <p className="text-xs text-gray-500 font-mono truncate">
                chainId: {n.chainId} · {n.rpcUrl}
              </p>
            </div>
            <button
              onClick={() => openEdit(n)}
              className="p-1.5 text-gray-500 hover:text-gray-300 shrink-0"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onRemove(n.chainId)}
              className="p-1.5 text-gray-500 hover:text-red-400 shrink-0"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function NetworkForm({
  form,
  isEdit,
  onChange,
  onSave,
  onClose,
}: {
  form: StoredNetwork
  isEdit: boolean
  onChange: (n: StoredNetwork) => void
  onSave: () => void
  onClose: () => void
}) {
  const set = (k: keyof StoredNetwork) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [k]: k === 'chainId' ? Number(e.target.value) : e.target.value })

  return (
    <div className="border border-indigo-700 bg-indigo-950/20 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-indigo-300">{isEdit ? 'Edit network' : 'New network'}</p>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Name" value={form.name} onChange={set('name')} placeholder="Ethereum Mainnet" />
        <FormInput label="Chain ID" type="number" value={form.chainId || ''} onChange={set('chainId')} placeholder="1" />
        <FormInput label="RPC URL" value={form.rpcUrl} onChange={set('rpcUrl')} placeholder="https://eth.llamarpc.com" className="col-span-2" />
        <FormInput label="Currency symbol" value={form.currencySymbol} onChange={set('currencySymbol')} placeholder="ETH" />
        <FormInput label="Explorer URL" value={form.explorerUrl} onChange={set('explorerUrl')} placeholder="https://etherscan.io" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="flex items-center gap-1 px-3 py-1.5 border border-gray-600 text-gray-400 hover:text-gray-200 rounded text-sm">
          <X size={14} /> Cancel
        </button>
        <button onClick={onSave} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm">
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  )
}

function FormInput({
  label, value, onChange, placeholder, type = 'text', className = '',
}: {
  label: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}
