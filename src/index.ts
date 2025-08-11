import { DataFetcher } from "./core/dataFetcher.js";
import { ViemRpcClient } from "./core/rpcClient.js";
import { ProviderManager } from "./providers/providerManager.js";
import { Logger } from "./utils/logger.js";
import type { MonoPulseOptions, RpcClient, WatcherStopFn, Address } from "./utils/types.js";
import { watchBalances } from "./watchers/balancesWatcher.js";
import { watchBlockStats } from "./watchers/blockStatsWatcher.js";
import { watchContractData } from "./watchers/contractWatcher.js";
import { watchNFTs } from "./watchers/nftWatcher.js";
import { watchPendingTxs } from "./watchers/pendingTxWatcher.js";
import { watchTransactions } from "./watchers/transactionsWatcher.js";

export class MonoPulse {
  private readonly logger: Logger;
  private readonly rpc: RpcClient;
  private readonly providers: ProviderManager;
  private readonly fetcher: DataFetcher;

  constructor(private readonly options: MonoPulseOptions) {
    this.logger = new Logger(options.logger?.level ?? "info");
    if (!options.overrides?.rpcClient) {
      if (!options.rpcUrl) throw new Error("rpcUrl is required to initialize MonoPulse");
    }
    this.rpc = options.overrides?.rpcClient ?? new ViemRpcClient(options.rpcUrl!);
    this.providers = new ProviderManager(options);
    this.fetcher = new DataFetcher(this.rpc);
  }

  async getChainId(): Promise<number> {
    return this.rpc.getChainId();
  }

  async watchBalances(
    address: Address,
    tokens: Address[],
    onUpdate: (b: { native: bigint; tokens: Record<Address, bigint> }) => void,
  ): Promise<WatcherStopFn> {
    return watchBalances(this.rpc, address, tokens, onUpdate);
  }

  async watchContractData(
    address: Address,
    abi: readonly unknown[],
    functions: string[],
    onUpdate: (data: Record<string, unknown>) => void,
  ): Promise<WatcherStopFn> {
    return watchContractData(this.rpc, address, abi, functions, onUpdate);
  }

  async watchNFTs(
    owner: Address,
    contracts: Address[],
    onUpdate: (data: Record<Address, bigint>) => void,
  ) {
    return watchNFTs(this.rpc, owner, contracts, onUpdate);
  }

  async watchTransactions(address: Address, onUpdate: (txs: readonly string[]) => void) {
    return watchTransactions(
      this.rpc,
      address,
      onUpdate as (txs: readonly `0x${string}`[]) => void,
    );
  }

  async watchPendingTxs(address: Address, onUpdate: (txs: readonly string[]) => void) {
    return watchPendingTxs(this.rpc, address, onUpdate as (txs: readonly `0x${string}`[]) => void);
  }

  async watchBlockStats(onUpdate: (stats: { blockNumber: bigint }) => void) {
    return watchBlockStats(this.rpc, onUpdate);
  }
}

export type { MonoPulseOptions } from "./utils/types.js";
