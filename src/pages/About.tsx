import { Database, Globe, Lock, Code2, ExternalLink } from 'lucide-react'

export function About() {
  return (
    <div className="py-10 space-y-10">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-100">Timelock UI</h1>
        <p className="text-gray-400 leading-relaxed">
          An open-source tool to manage{' '}
          <a
            href="https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5"
          >
            OpenZeppelin TimelockController <ExternalLink size={12} />
          </a>{' '}
          contracts from a browser, with no backend and no setup. Connect your wallet, paste a contract address, and you're ready to schedule, monitor and execute operations.
          Run it locally or{' '}
          <a
            href="https://github.com/stakely/timelock-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5"
          >
            deploy your own instance <ExternalLink size={12} />
          </a>{' '}
          the source code is on GitHub.
        </p>
        <p className="text-gray-500 text-sm leading-relaxed">
          Built and maintained by{' '}
          <a
            href="https://stakely.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Stakely
          </a>
          , a professional staking and infrastructure provider.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card icon={<Globe size={18} />} title="Any network">
          Works on any EVM-compatible chain. You bring the RPC and chain ID, the app adapts.
        </Card>
        <Card icon={<Code2 size={18} />} title="Any contract">
          Just paste a TimelockController address. No hardcoded deployments, no configuration files.
        </Card>
        <Card icon={<Database size={18} />} title="No backend">
          Everything runs in the browser. Operations and settings are stored in{' '}
          <code className="text-xs text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded">localStorage</code>.
          Nothing is sent to any server.
        </Card>
        <Card icon={<Lock size={18} />} title="Non-custodial">
          Every transaction is signed by your wallet. The app has no access to your keys.
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-200">How it works</h2>
        <div className="space-y-3">
          <Step n="1" title="Schedule">
            Submit a <code className="text-xs text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded">schedule()</code> transaction
            with the target contract, calldata, and a delay. The operation is queued on-chain and a countdown starts.
          </Step>
          <Step n="2" title="Wait">
            The operation stays in <span className="text-yellow-400 font-medium">Waiting</span> state until the delay passes.
            Once it does, it becomes <span className="text-green-400 font-medium">Ready</span> and can be executed.
          </Step>
          <Step n="3" title="Execute">
            Any account with the <code className="text-xs text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded">EXECUTOR_ROLE</code> can call{' '}
            <code className="text-xs text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded">execute()</code> to apply the operation on-chain.
          </Step>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-200">The standard</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          TimelockController is part of the{' '}
          <a
            href="https://docs.openzeppelin.com/contracts/5.x/api/governance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            OpenZeppelin Governance
          </a>{' '}
          library and is the most widely adopted timelock implementation in DeFi. Protocols like Compound, Uniswap and Lido use it to enforce governance delays and protect critical operations from being executed without prior notice.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href="https://github.com/stakely/timelock-ui"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-gray-100 rounded text-sm transition-colors"
        >
          <Code2 size={16} />
          Source code on GitHub
        </a>
        <a
          href="https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-gray-100 rounded text-sm transition-colors"
        >
          <ExternalLink size={16} />
          OZ Docs
        </a>
        <a
          href="https://stakely.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-gray-100 rounded text-sm transition-colors"
        >
          <ExternalLink size={16} />
          Stakely
        </a>
      </div>
    </div>
  )
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-700 bg-gray-900 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-indigo-400">{icon}</span>
        <span className="text-sm font-medium text-gray-200">{title}</span>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{children}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-300 text-xs flex items-center justify-center font-mono">
        {n}
      </span>
      <p className="text-sm text-gray-400 leading-relaxed">
        <span className="text-gray-200 font-medium">{title}. </span>
        {children}
      </p>
    </div>
  )
}
