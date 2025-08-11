## 1.0.1 - Watchers realtime polling, stop behavior, and tests

- Enhanced `watchBalances`, `watchNFTs`, `watchContractData`, and `watchBlockStats` to support realtime updates via lightweight polling tied to new block detection.
- Added proper `stop()` behavior across watchers to clear timers and avoid further updates.
- Kept TypeScript typings strict and consistent with existing architecture.
- Extended `tests/watchers.test.ts` to cover:
  - initial fetch emissions
  - realtime updates when block number changes (simulated)
  - proper stop behavior (no emissions after stopping)
- Left `watchTransactions` and `watchPendingTxs` as placeholders returning a functional `stop()` for MVP parity, ready to be wired to provider events in a future update.

Notes:

- WebSocket provider in `WsProvider` remains a stub; realtime behavior is currently delivered via HTTP/WebSocket RPC polling of `getBlockNumber` followed by targeted reads, serving as a robust fallback path.
