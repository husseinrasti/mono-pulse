import type {
  MulticallCall,
  MulticallOptions,
  MulticallResult,
  RpcClient,
} from "../utils/types.js";

export const executeMulticall = async <T = unknown>(
  client: RpcClient,
  calls: MulticallCall[],
  options?: MulticallOptions,
): Promise<MulticallResult<T>[]> => {
  if (calls.length === 0) return [];

  const allowFailure = options?.allowFailure ?? true;
  const maxBatchSize = options?.maxBatchSize ?? 50;

  // Group by target address to improve chance of cache hits and provider optimizations
  const groupedByAddress = new Map<string, MulticallCall[]>();
  for (const call of calls) {
    const key = call.address.toLowerCase();
    const list = groupedByAddress.get(key) ?? [];
    list.push(call);
    groupedByAddress.set(key, list);
  }

  const groupedCalls: MulticallCall[] = [];
  for (const [, list] of groupedByAddress) {
    groupedCalls.push(...list);
  }

  // Chunk into batches
  const batches: MulticallCall[][] = [];
  for (let i = 0; i < groupedCalls.length; i += maxBatchSize) {
    batches.push(groupedCalls.slice(i, i + maxBatchSize));
  }

  const results: MulticallResult<T>[] = [];
  for (const batch of batches) {
    const batchResults = await client.multicall<T>(batch, { allowFailure, maxBatchSize });
    results.push(...batchResults);
  }
  return results;
};
