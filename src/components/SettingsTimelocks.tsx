import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { isAddress, createPublicClient, http, defineChain } from 'viem'
import type { StoredTimelock } from '../lib/storage'
import type { StoredNetwork } from '../lib/storage'
import { setSyncCursor } from '../lib/storage'
import { shortHex, findDeployBlock } from '../lib/timelock'
import { timelockAbi } from '../abis/timelock'

interface Props {
  timelocks: StoredTimelock[]
  networks: StoredNetwork[]
  activeAddress: `0x${string}` | null
  onAdd: (tl: StoredTimelock) => void
  onUpdate: (address: `0x${string}`, patch: Partial<StoredTimelock>) => void
  onRemove: (address: `0x${string}`) => void
  onSelect: (address: `0x${string}`) => void
}

const EMPTY: StoredTimelock = { address: '0x' as `0x${string}`, name: '', chainId: 1 }

export function SettingsTimelocks({
  timelocks,
  networks,
  activeAddress,
  onAdd,
  onUpdate,
  onRemove,
  onSelect,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editAddress, setEditAddress] = useState<`0x${string}` | null>(null)
  const [form, setForm] = useState<StoredTimelock>(EMPTY)
  const [validating, setValidating] = useState(false)
  const [validatingLabel, setValidatingLabel] = useState('Validating…')
  const [validationError, setValidationError] = useState<string | null>(null)

  function openAdd() {
    setForm({ ...EMPTY, chainId: networks[0]?.chainId ?? 1 })
    setEditAddress(null)
    setValidationError(null)
    setShowForm(true)
  }

  function openEdit(tl: StoredTimelock) {
    setForm(tl)
    setEditAddress(tl.address)
    setValidationError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditAddress(null)
    setValidationError(null)
  }

  async function handleSave() {
    if (!form.name || !isAddress(form.address)) return

    let toSave: StoredTimelock = form

    const addressChanged = editAddress === null || editAddress.toLowerCase() !== form.address.toLowerCase()
    if (addressChanged) {
      // The deployBlock currently in `form` belongs to the previous address.
      // Drop it; we'll only re-attach one if detection below succeeds.
      toSave = { ...form, deployBlock: undefined }

      const network = networks.find((n) => n.chainId === form.chainId)
      if (network) {
        setValidating(true)
        setValidationError(null)
        try {
          const chain = defineChain({
            id: network.chainId,
            name: network.name,
            nativeCurrency: { name: network.currencySymbol, symbol: network.currencySymbol, decimals: 18 },
            rpcUrls: { default: { http: [network.rpcUrl] } },
          })
          const client = createPublicClient({ chain, transport: http(network.rpcUrl) })

          setValidatingLabel('Validating contract…')
          await client.readContract({ address: form.address, abi: timelockAbi, functionName: 'getMinDelay' })

          // Locate the deploy block via address-filtered getLogs so the first
          // chain sync doesn't start at 0. Best-effort: if the RPC rejects the
          // wide-range query, findDeployBlock returns null and we proceed
          // without setting a cursor.
          setValidatingLabel('Locating deploy block…')
          const deployBlock = await findDeployBlock(client, form.address)
          if (deployBlock !== null) {
            toSave = { ...form, deployBlock }
            setSyncCursor(form.chainId, form.address, deployBlock)
          }
        } catch {
          setValidationError('Not a valid TimelockController — getMinDelay() reverted or timed out')
          setValidating(false)
          setValidatingLabel('Validating…')
          return
        }
        setValidating(false)
        setValidatingLabel('Validating…')
      }
    }

    if (editAddress !== null) {
      onUpdate(editAddress, toSave)
    } else {
      onAdd(toSave)
    }
    closeForm()
  }

  const networkName = (chainId: number) =>
    networks.find((n) => n.chainId === chainId)?.name ?? `Chain ${chainId}`

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-100">Timelocks</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {showForm && (
        <TimelockForm
          form={form}
          isEdit={editAddress !== null}
          networks={networks}
          validating={validating}
          validatingLabel={validatingLabel}
          validationError={validationError}
          onChange={setForm}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      <div className="space-y-2">
        {timelocks.length === 0 && (
          <p className="text-gray-500 italic text-sm">No timelocks configured.</p>
        )}
        {timelocks.map((tl) => (
          <div
            key={tl.address}
            className={`flex items-center gap-3 p-3 rounded border ${
              tl.address.toLowerCase() === activeAddress?.toLowerCase()
                ? 'border-indigo-600 bg-indigo-950/30'
                : 'border-gray-700 bg-gray-900'
            }`}
          >
            <button onClick={() => onSelect(tl.address)} className="flex-1 text-left">
              <p className="font-medium text-gray-100 text-sm">{tl.name}</p>
              <p className="text-xs text-gray-500 font-mono">
                {shortHex(tl.address)} · {networkName(tl.chainId)}
              </p>
            </button>
            <button onClick={() => openEdit(tl)} className="p-1.5 text-gray-500 hover:text-gray-300">
              <Pencil size={14} />
            </button>
            <button onClick={() => onRemove(tl.address)} className="p-1.5 text-gray-500 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-form ────────────────────────────────────────────────────────────────

function TimelockForm({
  form,
  isEdit,
  networks,
  validating,
  validatingLabel,
  validationError,
  onChange,
  onSave,
  onClose,
}: {
  form: StoredTimelock
  isEdit: boolean
  networks: StoredNetwork[]
  validating: boolean
  validatingLabel: string
  validationError: string | null
  onChange: (tl: StoredTimelock) => void
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="border border-indigo-700 bg-indigo-950/20 rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-indigo-300">{isEdit ? 'Edit timelock' : 'New timelock'}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Name / alias</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Protocol Upgrade Timelock"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Network</label>
          <select
            value={form.chainId}
            onChange={(e) => onChange({ ...form, chainId: Number(e.target.value) })}
            disabled={isEdit}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {networks.map((n) => (
              <option key={n.chainId} value={n.chainId}>
                {n.name} ({n.chainId})
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="text-xs text-gray-500 mt-1">
              Network is fixed. Delete and re-add to point to a different chain.
            </p>
          )}
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400 block mb-1">Contract address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => onChange({ ...form, address: e.target.value as `0x${string}` })}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-100 font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          {form.address && !isAddress(form.address) && (
            <p className="text-red-400 text-xs mt-1">Invalid address</p>
          )}
          {validationError && (
            <p className="text-red-400 text-xs mt-1">{validationError}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} disabled={validating} className="flex items-center gap-1 px-3 py-1.5 border border-gray-600 text-gray-400 hover:text-gray-200 rounded text-sm disabled:opacity-50">
          <X size={14} /> Cancel
        </button>
        <button onClick={onSave} disabled={validating} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {validating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {validating ? validatingLabel : 'Save'}
        </button>
      </div>
    </div>
  )
}
