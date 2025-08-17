import type { PublicClient } from "viem";

import type { Address, EventProvider, FeedType, RpcClient, WatcherStopFn } from "./utils/types.js";
import { watchBalances } from "./watchers/balancesWatcher.js";
import { watchBlockStats, type BlockStats } from "./watchers/blockStatsWatcher.js";
import { watchContractData } from "./watchers/contractWatcher.js";
import { watchNFTs } from "./watchers/nftWatcher.js";

class ViemClientAdapter implements RpcClient {
  constructor(private readonly client: PublicClient) {}

  async getChainId(): Promise<number> {
    return this.client.getChainId();
  }

  async getBlockNumber(): Promise<bigint> {
    return this.client.getBlockNumber();
  }

  async getNativeBalance(address: Address): Promise<bigint> {
    return this.client.getBalance({ address });
  }

  async readContract<T = unknown>(call: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<T> {
    const result = await this.client.readContract({
      address: call.address,
      abi: call.abi as readonly unknown[],
      functionName: call.functionName as unknown as string,
      args: (call.args ?? []) as readonly unknown[],
    });
    return result as T;
  }

  async multicall<T = unknown>(
    calls: {
      address: Address;
      abi: readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
    }[],
    opts?: { maxBatchSize?: number; allowFailure?: boolean },
  ) {
    const allowFailure = opts?.allowFailure ?? true;
    const maxBatchSize = opts?.maxBatchSize ?? 50;

    const batches: (typeof calls)[] = [];
    for (let i = 0; i < calls.length; i += maxBatchSize) {
      batches.push(calls.slice(i, i + maxBatchSize));
    }

    const out: Array<{ success: boolean; result?: T; error?: unknown }> = [];
    for (const batch of batches) {
      const res = await Promise.all(
        batch.map(async (c) => {
          try {
            const r = await this.readContract<T>(c);
            return { success: true, result: r } as const;
          } catch (error) {
            if (allowFailure) return { success: false, error } as const;
            throw error;
          }
        }),
      );
      out.push(...res);
    }
    return out;
  }
}

export const watchBalancesExtend = (client: PublicClient) => {
  const adapter = new ViemClientAdapter(client);
  return {
    watchBalances: async (
      address: Address,
      tokens: Address[],
      onUpdate: (b: { native: bigint; tokens: Record<Address, bigint> }) => void,
      opts?: {
        pollIntervalMs?: number;
        eventProvider?: EventProvider;
        feed?: FeedType;
        verifiedOnly?: boolean;
      },
    ): Promise<WatcherStopFn> => {
      return watchBalances(adapter, address, tokens, onUpdate, opts);
    },
  } as const;
};

export const watchContractDataExtend = (client: PublicClient) => {
  const adapter = new ViemClientAdapter(client);
  return {
    watchContractData: async (
      address: Address,
      abi: readonly unknown[],
      functions: (string | { functionName: string; args?: readonly unknown[] })[],
      onUpdate: (data: Record<string, unknown>) => void,
      opts?: {
        pollIntervalMs?: number;
        eventProvider?: EventProvider;
        feed?: FeedType;
        verifiedOnly?: boolean;
      },
    ): Promise<WatcherStopFn> => {
      return watchContractData(adapter, address, abi, functions, onUpdate, opts);
    },
  } as const;
};

export const watchNFTsExtend = (client: PublicClient) => {
  const adapter = new ViemClientAdapter(client);
  return {
    watchNFTs: async (
      owner: Address,
      contracts: Address[],
      onUpdate: (data: Record<Address, bigint>) => void,
      opts?: {
        pollIntervalMs?: number;
        eventProvider?: EventProvider;
        feed?: FeedType;
        verifiedOnly?: boolean;
      },
    ): Promise<WatcherStopFn> => {
      return watchNFTs(adapter, owner, contracts, onUpdate, opts);
    },
  } as const;
};

export const watchBlockStatsExtend = (client: PublicClient) => {
  const adapter = new ViemClientAdapter(client);
  return {
    watchBlockStats: async (
      onUpdate: (stats: BlockStats) => void,
      opts?: {
        pollIntervalMs?: number;
        eventProvider?: EventProvider;
        feed?: FeedType;
        verifiedOnly?: boolean;
      },
    ): Promise<WatcherStopFn> => {
      return watchBlockStats(adapter, onUpdate, opts);
    },
  } as const;
};
