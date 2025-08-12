# MonoPulse SDK

Real-time Monad data fetching with smart batching and multicall. MonoPulse provides a simple, consistent TypeScript API to subscribe to blockchain changes and efficiently read on-chain state.

- Easy to use, inspired by ethers.js and viem
- Multicall with intelligent batching and fail-skip behavior
- Real-time updates via provider subscriptions (new heads, logs, pending txs)
- Pluggable providers with automatic fallback

## Installation

```bash
npm i monopulse
# or
pnpm add monopulse
# or
yarn add monopulse
```

## Quickstart

```ts
import { MonoPulse } from "monopulse";

const sdk = new MonoPulse({
  provider: "ws",
  rpcUrl: process.env.RPC_URL!, // e.g. wss://monad-testnet.example
});

// Watch native + ERC20 balances
const stop = await sdk.watchBalances(
  "0x1234...abcd",
  ["0xTokenAddr1", "0xTokenAddr2"],
  (balances) => {
    console.log("Updated balances:", balances);
  },
);

// Later…
stop();
```

## Initialization

```ts
import { MonoPulse, type MonoPulseOptions } from "monopulse";

const options: MonoPulseOptions = {
  provider: "auto", // "auto" | "ws"
  rpcUrl: "wss://monad-testnet.example", // required for ws
  logger: { level: "info" },
};

const sdk = new MonoPulse(options);
```

### Options

- `provider`: Which streaming provider to use. Use `auto` to pick the best available.
- `rpcUrl`: WebSocket RPC endpoint (required for `ws`).
- `logger.level`: `silent` | `error` | `warn` | `info` | `debug`.

## API Reference

All watcher methods return a function `() => void` to stop the subscription.
All watchers also accept an optional options object `{ pollIntervalMs?: number }` to control how frequently new blocks are polled when provider streaming is unavailable.

### sdk.watchBalances(address, tokens, onUpdate)

- **address**: `0x…` user address
- **tokens**: `Address[]` list of ERC20 token addresses
- **onUpdate**: `(balances) => void`
- **options** (optional): `{ pollIntervalMs?: number }`

Types:

```ts
type Balances = {
  native: bigint;
  tokens: Record<`0x${string}`, bigint>;
};
```

Example:

```ts
const stop = await sdk.watchBalances(
  "0x1234...abcd",
  ["0xTokenAddr1", "0xTokenAddr2"],
  (b) => console.log(b.native, b.tokens),
  { pollIntervalMs: 5000 },
);
```

### sdk.watchContractData(address, abi, functions, onUpdate)

- **address**: contract address
- **abi**: readonly ABI array
- **functions**: array of function names or descriptors with arguments.
- Supported forms:
  - `"totalSupply"`
  - `{ functionName: "balanceOf", args: ["0xUserAddress"] }`
- **onUpdate**: `(data: Record<string, unknown>) => void`
- **options** (optional): `{ pollIntervalMs?: number }`

Example:

```ts
const abi = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
const userAddress = "0xUser…" as const;
const stop = await sdk.watchContractData(
  "0xContract…",
  abi,
  ["totalSupply", "symbol", { functionName: "balanceOf", args: [userAddress] }],
  (data) => console.log(data.totalSupply, data.symbol, data.balanceOf),
  { pollIntervalMs: 5000 },
);
```

### sdk.watchNFTs(owner, contracts, onUpdate)

- **owner**: user address
- **contracts**: ERC721/1155 contract addresses
- **onUpdate**: `(nfts: Record<Address, bigint>) => void`
- **options** (optional): `{ pollIntervalMs?: number }`

Example:

```ts
const stop = await sdk.watchNFTs(
  "0xUser…",
  ["0xNftContract1", "0xNftContract2"],
  (nfts) => console.log(nfts),
  { pollIntervalMs: 7500 },
);
```

### sdk.watchBlockStats(onUpdate)

- **onUpdate**: `(stats: { blockNumber: bigint }) => void`
- **options** (optional): `{ pollIntervalMs?: number }`

Example:

```ts
const stop = await sdk.watchBlockStats((stats) => console.log(stats.blockNumber), {
  pollIntervalMs: 5000,
});
```

## Providers

MonoPulse currently supports a single provider based on WebSocket RPC. Use `provider: 'auto'` to default to `ws`, or set `provider: 'ws'` explicitly.

```ts
const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL! });
```

## Examples

See the `examples/` directory for runnable scripts:

- `examples/watchBalances.ts`
- `examples/watchContractData.ts`
- `examples/watchNFTs.ts`
- `examples/watchBlockStats.ts`

Run with:

```bash
# Provide env vars like RPC_URL, USER_ADDRESS, CONTRACT_ADDRESS
node --loader ts-node/esm examples/watchBalances.ts
```

## Contributing

- Prerequisites: Node.js >= 18, pnpm/npm, git
- Setup:
  ```bash
  npm i
  npm run build
  npm test
  ```
- Development:
  - Lint: `npm run lint`
  - Format: `npm run format`
  - Typecheck: `npm run typecheck`
  - Tests: `npm test` (uses ts-jest with ESM)
- Commit style: Conventional Commits (`feat: …`, `fix: …`, `docs: …`, `test: …`)
- PRs welcome! Please include tests and docs for new features.

## License

MIT © MonoPulse Contributors
