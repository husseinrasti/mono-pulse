# MonoPulse SDK

Real-time Monad data fetching with smart batching and multicall. MonoPulse provides a simple, consistent TypeScript API to subscribe to blockchain changes and efficiently read on-chain state.

- Easy to use, inspired by ethers.js and viem
- Multicall with intelligent batching and fail-skip behavior
- Real-time updates via provider subscriptions (new heads, logs)
- Monad speculative feeds: `monadNewHeads`, `monadLogs`
- Commit state tracking for heads/logs: `Proposed → Voted → Finalized → Verified`
- Selectable feed modes: finalized-only or speculative
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

## Using with viem extends

MonoPulse provides extend functions that allow you to integrate watchers into an existing viem `PublicClient` without replacing your client setup. These helpers are perfect for projects that already use viem and want to add real-time Monad data monitoring capabilities.

### Purpose

The extend functions (`watchBalancesExtend`, `watchContractDataExtend`, `watchNFTsExtend`, `watchBlockStatsExtend`) allow developers to:

- Keep their existing viem client configuration
- Add MonoPulse watchers as methods on their client
- Choose between polling and real-time updates
- Maintain the same API surface as direct SDK watchers

### Basic Usage (Polling Mode)

```ts
import { createClient, publicActions, webSocket } from "viem";
import { watchBlockStatsExtend } from "monopulse/viemExtends";

const client = createClient({ transport: webSocket(rpcUrl) }).extend(publicActions);
const extended = client.extend(watchBlockStatsExtend);

const stop = await extended.watchBlockStats((stats) => console.log(`Block #${stats.blockNumber}`), {
  pollIntervalMs: 5000,
});
```

### Real-time Updates with Event Provider

For real-time updates using Monad's speculative feeds (`monadNewHeads` / `monadLogs`), you must provide an `eventProvider` in the options. This enables real-time streaming instead of polling.

```ts
import { createClient, publicActions, webSocket } from "viem";
import { watchBlockStatsExtend } from "monopulse/viemExtends";
import { WsProvider } from "monopulse/providers";

const client = createClient({ transport: webSocket(rpcUrl) }).extend(publicActions);
const extended = client.extend(watchBlockStatsExtend);
const eventProvider = new WsProvider(rpcUrl);

const stop = await extended.watchBlockStats(
  (stats) => console.log(`Block #${stats.blockNumber} state=${stats.commitState}`),
  { feed: "speculative", eventProvider },
);
```

## Speculative vs Finalized feeds

Monad exposes speculative feeds that stream block proposals before they are finalized. MonoPulse supports both modes:

- Finalized mode (default): only finalized blocks/logs. Lowest reorg risk, slightly higher latency.
- Speculative mode: includes proposals with commit states. Fastest updates with eventual re-emits as blocks advance through `Proposed → Voted → Finalized → Verified`.

When to use which:

- Use finalized for user-visible balances, accounting, or any state requiring stability.
- Use speculative for trading UIs, mempool-like dashboards, or latency-sensitive experiences where brief reordering is acceptable.

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
- Watcher options (all watchers): `{ pollIntervalMs?: number, feed?: "finalized" | "speculative", verifiedOnly?: boolean }`
  - `feed`: select finalized-only or speculative feeds.
  - `verifiedOnly`: in speculative mode, only emit when `commitState` is `Verified`.

## API Reference

All watcher methods return a function `() => void` to stop the subscription.
All watchers accept an optional options object. In addition to `{ pollIntervalMs?: number }`, Monad speculative feed options are supported across the SDK: `feed?: "finalized" | "speculative"`, `verifiedOnly?: boolean`.

### sdk.watchBalances(address, tokens, onUpdate)

- **address**: `0x…` user address
- **tokens**: `Address[]` list of ERC20 token addresses
- **onUpdate**: `(balances) => void`
- **options** (optional): `{ pollIntervalMs?: number, feed?: "finalized" | "speculative", verifiedOnly?: boolean }`

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
- **options** (optional): `{ pollIntervalMs?: number, feed?: "finalized" | "speculative", verifiedOnly?: boolean }`

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
- **options** (optional): `{ pollIntervalMs?: number, feed?: "finalized" | "speculative", verifiedOnly?: boolean }`

Example:

```ts
const stop = await sdk.watchNFTs(
  "0xUser…",
  ["0xNftContract1", "0xNftContract2"],
  (nfts) => console.log(nfts),
  { pollIntervalMs: 7500 },
);
```

### sdk.watchBlockStats(onUpdate, options)

- **onUpdate**: `(stats: { blockNumber: bigint, blockId?: string | null, commitState?: "Proposed" | "Voted" | "Finalized" | "Verified" | null }) => void`
- **options**: `{ pollIntervalMs?: number, feed?: "finalized" | "speculative", verifiedOnly?: boolean }`

Example (speculative):

```ts
const stop = await sdk.watchBlockStats(
  (stats) => console.log(stats.blockNumber, stats.commitState),
  {
    pollIntervalMs: 5000,
    feed: "speculative",
    verifiedOnly: false,
  },
);

// Verified-only example
await sdk.watchBlockStats((s) => console.log("Verified:", s.blockNumber), {
  feed: "speculative",
  verifiedOnly: true,
});

// Balances using speculative heads
await sdk.watchBalances("0x1234...abcd", ["0xTokenAddr1"], (b) => console.log(b), {
  feed: "speculative",
});

// Contract data using speculative heads
await sdk.watchContractData("0xContract…", [], ["totalSupply"], (d) => console.log(d), {
  feed: "speculative",
});
```

### Commit state model

`commitState` reflects Monad’s real-time consensus progression for speculative feeds:

- `Proposed`: a candidate block was proposed.
- `Voted`: the proposal received votes and gained confidence.
- `Finalized`: accepted by consensus; stable for most applications.
- `Verified`: cryptographically verified and canonical.

In speculative mode, MonoPulse may re-emit a blockNumber when its `commitState` advances (e.g., from `Proposed` to `Finalized`), optionally with a `blockId` identifying the proposal.

## Consensus & Validator Data

MonoPulse provides **full access to Monad's consensus layer** via `monadNewHeads` subscriptions. All validator and consensus data is available directly in block headers - including proposer information, complete QC (Quorum Certificate) data with all validator signatures, and consensus state progression.

### Data Source

**`monadNewHeads`** provides complete consensus data in each block header:

- Block proposer address
- Quorum Certificate (QC) with all validator signatures
- Consensus state (Proposed → Voted → Finalized → Verified)
- Raw header for custom parsing

### Monad → MonoPulse Field Mapping

The table below shows how Monad's `monadNewHeads` data maps to MonoPulse's TypeScript types:

| Monad Field              | MonoPulse Field | Type                                                         | Description                              |
| ------------------------ | --------------- | ------------------------------------------------------------ | ---------------------------------------- |
| `number` / `blockNumber` | `blockNumber`   | `bigint`                                                     | Block number                             |
| `hash`                   | `hash`          | `Hex \| null`                                                | Block hash                               |
| `blockId`                | `blockId`       | `string \| null`                                             | Unique proposal ID                       |
| `commitState`            | `commitState`   | `"Proposed" \| "Voted" \| "Finalized" \| "Verified" \| null` | Consensus state                          |
| `proposer` / `miner`     | `proposer`      | `Address \| null`                                            | Block proposer address                   |
| `qc.signers`             | `qc.signers`    | `Address[]`                                                  | Validator addresses who signed the QC    |
| `qc.signatures`          | `qc.signatures` | `Hex[]`                                                      | Cryptographic signatures from validators |
| _(entire response)_      | `rawHeader`     | `Record<string, any>`                                        | Full raw header for custom parsing       |

### TypeScript Types

```ts
// Block header from monadNewHeads (via watchBlockStats)
interface BlockStats {
  blockNumber: bigint;
  hash?: Hex | null;
  blockId?: string | null;
  commitState?: "Proposed" | "Voted" | "Finalized" | "Verified" | null;

  // Monad consensus data
  proposer?: Address | null;
  qc?: QuorumCertificate | null;
  rawHeader?: Record<string, any>;
}

// Quorum Certificate structure
interface QuorumCertificate {
  signers: Address[]; // Validators who signed this QC
  signatures: Hex[]; // Cryptographic signatures
}
```

### Usage Example

```ts
import { MonoPulse } from "monopulse";

const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL! });

await sdk.watchBlockStats(
  (stats) => {
    console.log(`Block #${stats.blockNumber}`);
    console.log(`Proposer: ${stats.proposer}`);
    console.log(`State: ${stats.commitState}`);

    if (stats.qc) {
      console.log(`QC Signers: ${stats.qc.signers.length}`);
      console.log(`QC Signatures: ${stats.qc.signatures.length}`);

      // Build validator graph:
      // - Nodes: stats.proposer + stats.qc.signers
      // - Edges: signers → proposer (votes)
      stats.qc.signers.forEach((signer) => {
        console.log(`  ✓ ${signer} voted for ${stats.proposer}`);
      });
    }
  },
  { feed: "speculative" },
);
```

### Complete Example

See `examples/consensusData.ts` for a comprehensive example that:

- Subscribes to `monadNewHeads` for complete consensus data
- Builds a consensus timeline with all blocks
- Tracks validator activity (proposals and votes from QC signatures)
- Shows consensus state progression (Proposed → Voted → Finalized → Verified)
- Demonstrates how to build real-time consensus explorers and validator dashboards

Run with:

```bash
RPC_URL=wss://monad-testnet.example FEED_MODE=speculative node --loader ts-node/esm examples/consensusData.ts
```

### Use Cases

- **Consensus Explorers**: Build interactive timelines showing block proposals and validator votes
- **Validator Dashboards**: Track per-validator performance (proposals, votes via QC signatures, participation rate)
- **Network Health Monitoring**: Visualize consensus liveness, validator uptime, QC completion rates
- **Trading UIs**: Show real-time consensus confidence (QC signer count) before finalization
- **Analytics Tools**: Aggregate validator statistics, identify patterns in consensus behavior
- **Validator Graphs**: Visualize validator relationships (proposer → voters edges from QC data)

### Raw Data Access

Block headers include the **full raw response** for maximum flexibility:

- `BlockStats.rawHeader` - Complete raw block header from `monadNewHeads`

This allows developers to parse additional fields not explicitly exposed by MonoPulse's types.

## Usage examples

### Finalized feed mode

```ts
import { MonoPulse } from "monopulse";

const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL! });

// Heads (finalized-only)
await sdk.watchBlockStats(
  (s) => {
    console.log(`head: #${s.blockNumber.toString()}`);
  },
  { feed: "finalized" },
);

// Balances (finalized-only)
await sdk.watchBalances(
  process.env.USER_ADDRESS as `0x${string}`,
  [process.env.TOKEN_ADDRESSES!.split(",")[0] as `0x${string}`],
  (b) => console.log("balances:", b),
  { feed: "finalized" },
);
```

### Speculative feed mode with commit state logging

```ts
import { MonoPulse } from "monopulse";

const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL! });

let latestCommitState: string | null = null;
let latestBlockId: string | null = null;

await sdk.watchBlockStats(
  (s) => {
    latestCommitState = (s.commitState as string) ?? null;
    latestBlockId = (s.blockId as string) ?? null;
    console.log(
      `head: #${s.blockNumber.toString()} state=${s.commitState ?? "-"} id=${s.blockId ?? "-"}`,
    );
  },
  { feed: "speculative" },
);

await sdk.watchBalances(
  process.env.USER_ADDRESS as `0x${string}`,
  process.env.TOKEN_ADDRESSES!.split(",").map((s) => s.trim() as `0x${string}`),
  (b) => {
    const prefix = `[${latestCommitState ?? "final"}:${latestBlockId ?? "-"}]`;
    console.log(`${prefix} balances: native=${b.native.toString()}`);
  },
  { feed: "speculative" },
);
```

## Providers

MonoPulse currently supports a single provider based on WebSocket RPC. Use `provider: 'auto'` to default to `ws`, or set `provider: 'ws'` explicitly.

Monad real-time extensions are supported:

- Heads: `eth_subscribe` to `monadNewHeads` in speculative mode, `newHeads` in finalized mode
- Logs: `eth_subscribe` to `monadLogs` in speculative mode, `logs` in finalized mode

```ts
const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL! });
```

## Environment setup

Create a `.env` or `.env.local` with the variables relevant to your use case (the SDK reads `RPC_URL` or `WS_RPC_URL`):

```env
# Required
RPC_URL=wss://monad-testnet.example
# or
WS_RPC_URL=wss://monad-testnet.example

# Common
USER_ADDRESS=0xYourUserAddress

# Tokens / Contracts / NFTs
TOKEN_ADDRESSES=0xToken1,0xToken2
CONTRACT_ADDRESS=0xSomeContract
NFT_CONTRACT_ADDRESSES=0xNft1,0xNft2

# Feed tuning (optional)
FEED_MODE=finalized # or speculative
VERIFIED_ONLY=false
DURATION_MS=30000
```

## Examples

See the `examples/` directory for runnable scripts (showing both finalized and speculative modes):

- `examples/watchBalances.ts` - Monitor native and ERC20 token balances
- `examples/watchContractData.ts` - Watch smart contract state changes
- `examples/watchNFTs.ts` - Track NFT ownership
- `examples/watchBlockStats.ts` - Monitor block production
- `examples/consensusData.ts` - **Full consensus monitoring** (monadNewHeads + monadLogs combined)
- `examples/validatorData.ts` - Track validator activity from block headers

Run with:

```bash
# Provide env vars like RPC_URL, USER_ADDRESS, CONTRACT_ADDRESS
node --loader ts-node/esm examples/watchBalances.ts
```

## Links

- GitHub: [mono-pulse](https://github.com/husseinrasti/mono-pulse)
- npm: [`monopulse`](https://www.npmjs.com/package/monopulse)

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
