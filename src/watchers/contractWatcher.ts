import { DataFetcher } from "../core/dataFetcher.js";
import type { MulticallCall, RpcClient, WatcherStopFn } from "../utils/types.js";

export const watchContractData = async (
  client: RpcClient,
  contractAddress: `0x${string}`,
  abi: readonly unknown[],
  functionNames: string[],
  onUpdate: (data: Record<string, unknown>) => void,
): Promise<WatcherStopFn> => {
  const fetcher = new DataFetcher(client);
  const calls: MulticallCall[] = functionNames.map((fn) => ({
    address: contractAddress,
    abi,
    functionName: fn,
  }));

  const results = await fetcher.fetchMany(calls, { allowFailure: true });
  const map: Record<string, unknown> = {};
  for (let i = 0; i < functionNames.length; i++) {
    const name = functionNames[i];
    const res = results[i];
    map[name] = res?.success ? res.result : null;
  }
  onUpdate(map);

  const stop: WatcherStopFn = () => {};
  return stop;
};
