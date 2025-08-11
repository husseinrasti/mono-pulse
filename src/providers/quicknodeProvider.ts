import type {
  Address,
  EventProvider,
  EventUnsubscribeFn,
  Hex,
  LogFilter,
  ProviderLog,
} from "../utils/types.js";

export class QuickNodeProvider implements EventProvider {
  readonly name = "quicknode";

  onNewBlock(_handler: (blockNumber: bigint) => void): EventUnsubscribeFn {
    return () => {};
  }
  onLogs(_filter: LogFilter, _handler: (logs: readonly ProviderLog[]) => void): EventUnsubscribeFn {
    return () => {};
  }
  onPendingTransactions(_handler: (txHashes: readonly Hex[]) => void): EventUnsubscribeFn {
    return () => {};
  }
  onTransactionsForAddress(
    _address: Address,
    _handler: (tx: { hash: Hex }) => void,
  ): EventUnsubscribeFn {
    return () => {};
  }
}
