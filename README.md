# Timelock UI

An open-source web app to operate any [OpenZeppelin TimelockController](https://docs.openzeppelin.com/contracts/5.x/api/governance#TimelockController) contract from the browser.

Built and maintained by [Stakely](https://stakely.io).

## What it does

Schedule, monitor and execute timelocked operations on any EVM chain. Connect your wallet, paste a contract address, and you're ready to go. No backend, no setup, no vendor lock-in.

- **Any network.** Works on any EVM-compatible chain (Mainnet, Sepolia, Hoodi, custom RPCs, L2s, devnets).
- **Any contract.** Paste any TimelockController address, no hardcoded deployments.
- **No backend.** Everything runs in the browser, data is persisted in `localStorage`.
- **Non-custodial.** Your wallet signs every transaction, the app never touches your keys.
- **Wallet-agnostic.** Supports MetaMask, Coinbase, Rainbow and WalletConnect (any Safe via WalletConnect).

## How it works

The classic timelock flow: `schedule → wait → execute`.

1. **Schedule.** Submit a `schedule()` transaction with the target contract, calldata, and a delay. The operation is queued on-chain and a countdown starts.
2. **Wait.** The operation stays in `Waiting` state until the delay passes. Once it does, it becomes `Ready`.
3. **Execute.** Any account with `EXECUTOR_ROLE` can call `execute()` to apply the queued action. Any account with `CANCELLER_ROLE` can call `cancel()` instead.

The UI also picks up operations scheduled outside of it. The `Sync chain` button scans `CallScheduled` events on the contract, so you can use it to monitor a Timelock you don't control.

## Stack

- Vite + React + TypeScript
- wagmi v2 + viem for on-chain interaction
- RainbowKit for wallet connection
- TailwindCSS v4 for styling
- localStorage for persistence (no database, no backend)

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the build
```

## WalletConnect

The app ships with a public WalletConnect Project ID for convenience. If you fork this for production use, replace it with your own in `src/lib/wagmi.ts` (free at [cloud.reown.com](https://cloud.reown.com)).

## Storage

All state lives in `localStorage` under the `tl-ui:*` namespace:

| Key | Contents |
|-----|----------|
| `tl-ui:networks` | Configured networks (chainId, RPC, explorer) |
| `tl-ui:timelocks` | Configured timelock contracts |
| `tl-ui:active-timelock` | Currently selected timelock address |
| `tl-ui:operations:<chainId>:<address>` | Operations per timelock |
| `tl-ui:sync-cursor:<chainId>:<address>` | Last block scanned for incremental sync |

Clearing site data resets the app.

## Contributing

Pull requests welcome. The codebase is small and self-contained: no Solidity, no backend, just a frontend talking to the chain through viem.

If you find a bug or want to suggest a feature, open an issue at [github.com/stakely/timelock-ui/issues](https://github.com/stakely/timelock-ui/issues).

## License

MIT
