import { SettingsNetworks } from '../components/SettingsNetworks'
import { SettingsTimelocks } from '../components/SettingsTimelocks'
import { useNetworks } from '../hooks/useNetworks'
import { useTimelockStore } from '../contexts/timelocks'

export function Settings() {
  const { networks, addNetwork, updateNetwork, removeNetwork } = useNetworks()
  const { timelocks, activeAddress, addTimelock, updateTimelock, removeTimelock, selectTimelock } = useTimelockStore()

  return (
    <div className="space-y-10 py-8">
      <h1 className="text-2xl font-bold text-gray-100">Settings</h1>

      <section>
        <SettingsNetworks
          networks={networks}
          onAdd={addNetwork}
          onUpdate={updateNetwork}
          onRemove={removeNetwork}
        />
      </section>

      <div className="border-t border-gray-800" />

      <section>
        <SettingsTimelocks
          timelocks={timelocks}
          networks={networks}
          activeAddress={activeAddress}
          onAdd={addTimelock}
          onUpdate={updateTimelock}
          onRemove={removeTimelock}
          onSelect={selectTimelock}
        />
      </section>
    </div>
  )
}
