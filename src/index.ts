import { DataFetcher } from "./core/dataFetcher.js";
import { ViemRpcClient } from "./core/rpcClient.js";
import { ProviderManager } from "./providers/providerManager.js";
import { Logger } from "./utils/logger.js";
import type {
  Address,
  FeedType,
  MonoPulseOptions,
  RpcClient,
  WatcherStopFn,
} from "./utils/types.js";
import { watchBalances } from "./watchers/balancesWatcher.js";
import { watchBlockStats } from "./watchers/blockStatsWatcher.js";
import { watchContractData } from "./watchers/contractWatcher.js";
import { watchNFTs } from "./watchers/nftWatcher.js";

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
    opts?: { pollIntervalMs?: number; feed?: FeedType; verifiedOnly?: boolean },
  ): Promise<WatcherStopFn> {
    const provider = this.options.overrides?.eventProvider ?? this.providers.getProvider();
    const wOpts: {
      pollIntervalMs?: number;
      eventProvider?: any;
      feed?: FeedType;
      verifiedOnly?: boolean;
    } = {
      eventProvider: provider,
    };
    if (opts?.pollIntervalMs !== undefined) wOpts.pollIntervalMs = opts.pollIntervalMs;
    if (opts?.feed) wOpts.feed = opts.feed;
    if (opts?.verifiedOnly !== undefined) wOpts.verifiedOnly = opts.verifiedOnly;
    return watchBalances(this.rpc, address, tokens, onUpdate, wOpts);
  }

  async watchContractData(
    address: Address,
    abi: readonly unknown[],
    functions: (string | { functionName: string; args?: readonly unknown[] })[],
    onUpdate: (data: Record<string, unknown>) => void,
    opts?: { pollIntervalMs?: number; feed?: FeedType; verifiedOnly?: boolean },
  ): Promise<WatcherStopFn> {
    const provider = this.options.overrides?.eventProvider ?? this.providers.getProvider();
    const wOpts: {
      pollIntervalMs?: number;
      eventProvider?: any;
      feed?: FeedType;
      verifiedOnly?: boolean;
    } = {
      eventProvider: provider,
    };
    if (opts?.pollIntervalMs !== undefined) wOpts.pollIntervalMs = opts.pollIntervalMs;
    if (opts?.feed) wOpts.feed = opts.feed;
    if (opts?.verifiedOnly !== undefined) wOpts.verifiedOnly = opts.verifiedOnly;
    return watchContractData(this.rpc, address, abi, functions, onUpdate, wOpts);
  }

  async watchNFTs(
    owner: Address,
    contracts: Address[],
    onUpdate: (data: Record<Address, bigint>) => void,
    opts?: { pollIntervalMs?: number; feed?: FeedType; verifiedOnly?: boolean },
  ) {
    const provider = this.options.overrides?.eventProvider ?? this.providers.getProvider();
    const wOpts: {
      pollIntervalMs?: number;
      eventProvider?: any;
      feed?: FeedType;
      verifiedOnly?: boolean;
    } = {
      eventProvider: provider,
    };
    if (opts?.pollIntervalMs !== undefined) wOpts.pollIntervalMs = opts.pollIntervalMs;
    if (opts?.feed) wOpts.feed = opts.feed;
    if (opts?.verifiedOnly !== undefined) wOpts.verifiedOnly = opts.verifiedOnly;
    return watchNFTs(this.rpc, owner, contracts, onUpdate, wOpts);
  }

  async watchBlockStats(
    onUpdate: (stats: { blockNumber: bigint }) => void,
    opts?: { pollIntervalMs?: number; feed?: FeedType; verifiedOnly?: boolean },
  ) {
    const provider = this.options.overrides?.eventProvider ?? this.providers.getProvider();
    const wOpts: {
      pollIntervalMs?: number;
      eventProvider?: any;
      feed?: FeedType;
      verifiedOnly?: boolean;
    } = {
      eventProvider: provider,
    };
    if (opts?.pollIntervalMs !== undefined) wOpts.pollIntervalMs = opts.pollIntervalMs;
    if (opts?.feed) wOpts.feed = opts.feed;
    if (opts?.verifiedOnly !== undefined) wOpts.verifiedOnly = opts.verifiedOnly;
    return watchBlockStats(this.rpc, onUpdate, wOpts);
  }
}

export type { MonoPulseOptions } from "./utils/types.js";
