# MonoPulse SDK - Product Requirements Document

## Overview

MonoPulse is a TypeScript SDK designed to simplify **real-time blockchain data fetching** and **batch read optimization** for developers building on Monad.
It combines **Smart Batch + Multicall** with **Real-time Event Streaming** from multiple providers (Allium, Goldsky, QuickNode Streams, WebSocket RPC) to deliver fast, developer-friendly APIs.

---

## Goals

- Provide an easy-to-use API for real-time data monitoring.
- Minimize RPC calls using intelligent batching and multicall techniques.
- Offer multiple streaming provider integrations with automatic fallback.
- Support a wide range of watchers for common dApp use cases.

---

## Features

### 1. **Core Layer**

- **rpcClient**: Unified interface for sending RPC and batch requests.
- **multicall**: Smart multicall execution with:
  - Automatic grouping of calls
  - Fail-skip mode for partial failures

- **eventBus**: Internal pub/sub for watcher updates.
- **dataFetcher**: Abstracted fetch logic (single/multicall).

### 2. **Providers Layer**

Supported streaming/event sources:

- **AlliumProvider**
- **GoldskyProvider**
- **QuickNodeProvider**
- **WsProvider** (direct WebSocket RPC fallback)
- **providerManager** for selecting the best provider and handling failover.

### 3. **Watchers Layer**

APIs for real-time tracking:

1. **watchBalances** – ERC20 & native MON balances for addresses.
2. **watchContractData** – Any readonly smart contract methods.
3. **watchNFTs** – ERC721 & ERC1155 ownership for an address.
4. **watchTransactions** – Incoming/outgoing transactions for an address.
5. **watchPendingTxs** – Pending transactions in the mempool.
6. **watchBlockStats** – Live block metrics (timestamp, gas used, tx count).

All watchers:

- Fetch initial data via multicall.
- Subscribe to related events via the selected provider.
- Trigger callbacks only when data changes.

### 4. **Utilities**

- **types.ts**: Shared TypeScript type definitions.
- **logger.ts**: Structured logging.
- **helpers.ts**: Common helper functions.

---

## API Design

### Initialization

```ts
import { MonoPulse } from "monopulse";

const sdk = new MonoPulse({
  provider: "auto", // auto, allium, goldsky, quicknode, ws
  alliumApiKey: "...",
  goldskyApiKey: "...",
  quicknodeApiKey: "...",
  rpcUrl: "wss://monad-testnet-rpc.com",
});
```

### Watch Balances

```ts
sdk.watchBalances("0x1234...abcd", ["0xTokenAddr1", "0xTokenAddr2"], (balances) => {
  console.log("Updated balances:", balances);
});
```

### Watch Contract Data

```ts
sdk.watchContractData("0xContractAddr", abi, ["totalSupply", "owner"], (data) => {
  console.log("Contract data updated:", data);
});
```

### Watch NFTs

```ts
sdk.watchNFTs("0xUserAddress", (nfts) => {
  console.log("Updated NFTs:", nfts);
});
```

### Watch Transactions

```ts
sdk.watchTransactions("0xUserAddress", (txs) => {
  console.log("New transactions:", txs);
});
```

### Watch Pending Transactions

```ts
sdk.watchPendingTxs("0xContractAddress", (pendingTxs) => {
  console.log("Pending TXs:", pendingTxs);
});
```

### Watch Block Stats

```ts
sdk.watchBlockStats((stats) => {
  console.log("Block stats:", stats);
});
```

---

## Architecture

```
src/
  core/
    rpcClient.ts
    multicall.ts
    eventBus.ts
    dataFetcher.ts
  providers/
    alliumProvider.ts
    goldskyProvider.ts
    quicknodeProvider.ts
    wsProvider.ts
    providerManager.ts
  watchers/
    balancesWatcher.ts
    contractWatcher.ts
    nftWatcher.ts
    transactionsWatcher.ts
    pendingTxWatcher.ts
    blockStatsWatcher.ts
  utils/
    types.ts
    logger.ts
    helpers.ts
  index.ts
examples/
  watchBalances.ts
  watchContractData.ts
  watchNFTs.ts
  watchTransactions.ts
  watchPendingTxs.ts
  watchBlockStats.ts
```

---

## Success Criteria

- **Ease of Use**: Developers can integrate in under 5 minutes.
- **Performance**: Reduce RPC calls by at least 60% vs naive implementation.
- **Reliability**: Automatic provider fallback ensures 99%+ uptime.
- **Extensibility**: New watchers or providers can be added without changing existing APIs.

---

## Next Steps

1. Implement Core Layer (rpcClient, multicall, eventBus, dataFetcher).
2. Add Allium, Goldsky, QuickNode, and WebSocket providers.
3. Build watchBalances and watchContractData as MVP.
4. Expand watchers to NFTs, Transactions, PendingTxs, and BlockStats.
5. Write documentation and examples.
