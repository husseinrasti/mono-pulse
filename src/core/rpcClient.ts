import { createPublicClient, http, webSocket } from "viem";

import type { Address } from "../utils/types.js";
import type {
  MulticallCall,
  MulticallOptions,
  MulticallResult,
  RpcClient,
} from "../utils/types.js";

export class ViemRpcClient implements RpcClient {
  private client: ReturnType<typeof createPublicClient>;

  constructor(rpcUrl: string) {
    const isWs = rpcUrl.startsWith("ws://") || rpcUrl.startsWith("wss://");
    this.client = createPublicClient({ transport: isWs ? webSocket(rpcUrl) : http(rpcUrl) });
  }

  async getChainId(): Promise<number> {
    return this.client.getChainId();
  }

  async getBlockNumber(): Promise<bigint> {
    return this.client.getBlockNumber();
  }

  async getNativeBalance(address: Address): Promise<bigint> {
    return this.client.getBalance({ address });
  }

  async readContract<T = unknown>(call: MulticallCall): Promise<T> {
    const { address, abi, functionName, args } = call;
    const result = await this.client.readContract({
      address,
      abi: abi as readonly unknown[],

      functionName: functionName as unknown as string,
      args: (args ?? []) as readonly unknown[],
    });
    return result as T;
  }

  async multicall<T = unknown>(
    calls: MulticallCall[],
    opts?: MulticallOptions,
  ): Promise<MulticallResult<T>[]> {
    const allowFailure = opts?.allowFailure ?? true;
    const maxBatchSize = opts?.maxBatchSize ?? 50;

    const batches: MulticallCall[][] = [];
    for (let i = 0; i < calls.length; i += maxBatchSize) {
      batches.push(calls.slice(i, i + maxBatchSize));
    }

    const results: MulticallResult<T>[] = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (call) => {
          try {
            const output = await this.readContract<T>(call);
            return { success: true, result: output } as MulticallResult<T>;
          } catch (error) {
            if (allowFailure) {
              return { success: false, error } as MulticallResult<T>;
            }
            throw error;
          }
        }),
      );
      results.push(...batchResults);
    }
    return results;
  }
}
