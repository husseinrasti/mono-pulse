export type Hex = `0x${string}`;
export type Address = Hex;

export type ProviderName = "auto" | "ws";

export type LogTopic = Hex | Hex[] | null;

export interface LogFilter {
  address?: Address | Address[];
  topics?: [LogTopic?, LogTopic?, LogTopic?, LogTopic?];
  fromBlock?: bigint;
  toBlock?: bigint;
}

export interface MonoPulseOptions {
  provider: ProviderName;
  rpcUrl?: string;
  logger?: {
    level?: "silent" | "error" | "warn" | "info" | "debug";
  };
  // Advanced: dependency injection for testing
  overrides?: {
    eventProvider?: EventProvider;
    rpcClient?: RpcClient;
  };
}

export interface EventUnsubscribeFn {
  (): void;
}

export interface EventProvider {
  readonly name: string;

  onNewBlock: (handler: (blockNumber: bigint) => void) => EventUnsubscribeFn;
  onLogs: (
    filter: LogFilter,
    handler: (logs: readonly ProviderLog[]) => void,
  ) => EventUnsubscribeFn;
  onPendingTransactions: (handler: (txHashes: readonly Hex[]) => void) => EventUnsubscribeFn;
  onTransactionsForAddress: (
    address: Address,
    handler: (tx: ObservedTransaction) => void,
  ) => EventUnsubscribeFn;
}

export interface ProviderLog {
  address: Address;
  topics: Hex[];
  data: Hex;
  blockNumber?: bigint | null;
  transactionHash?: Hex | null;
}

export interface ObservedTransaction {
  hash: Hex;
  from?: Address | null;
  to?: Address | null;
  value?: bigint | null;
}

export type MulticallCall = {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
};

export type MulticallResult<T = unknown> = {
  success: boolean;
  result?: T;
  error?: unknown;
};

export interface MulticallOptions {
  maxBatchSize?: number;
  allowFailure?: boolean;
}

export interface RpcClient {
  getChainId: () => Promise<number>;
  getBlockNumber: () => Promise<bigint>;
  getNativeBalance: (address: Address) => Promise<bigint>;
  readContract: <T = unknown>(call: MulticallCall) => Promise<T>;
  multicall: <T = unknown>(
    calls: MulticallCall[],
    opts?: MulticallOptions,
  ) => Promise<MulticallResult<T>[]>;
}

export type BalancesMap = {
  native: bigint;
  tokens: Record<Address, bigint>;
};

export type WatcherStopFn = () => void;
