import { DataFetcher } from "../core/dataFetcher.js";
import type { MulticallCall, RpcClient, WatcherStopFn } from "../utils/types.js";

type ContractCallDescriptor = { functionName: string; args?: readonly unknown[] };

export const watchContractData = async (
  client: RpcClient,
  contractAddress: `0x${string}`,
  abi: readonly unknown[],
  functions: (string | ContractCallDescriptor)[],
  onUpdate: (data: Record<string, unknown>) => void,
  options?: { pollIntervalMs?: number },
): Promise<WatcherStopFn> => {
  const fetcher = new DataFetcher(client);
  const pollIntervalMs = options?.pollIntervalMs ?? 5_000;

  const fetchAll = async () => {
    const calls: MulticallCall[] = functions.map((fn) => {
      if (typeof fn === "string") {
        return { address: contractAddress, abi, functionName: fn } satisfies MulticallCall;
      }
      return {
        address: contractAddress,
        abi,
        functionName: fn.functionName,
        args: fn.args ?? [],
      } satisfies MulticallCall;
    });
    const results = await fetcher.fetchMany(calls, { allowFailure: true });
    const map: Record<string, unknown> = {};
    for (let i = 0; i < functions.length; i++) {
      const entry = functions[i]!;
      const name = typeof entry === "string" ? entry : entry.functionName;
      if (!name) continue;
      const res = results[i];
      map[name] = res && res.success ? res.result : null;
    }
    return map;
  };

  let stopped = false;
  let lastBlock: bigint | null = null;
  let interval: NodeJS.Timeout | null = null;

  onUpdate(await fetchAll());

  const startPolling = () => {
    interval = setInterval(async () => {
      if (stopped) return;
      try {
        const current = await client.getBlockNumber();
        if (lastBlock === null || current !== lastBlock) {
          lastBlock = current;
          onUpdate(await fetchAll());
        }
      } catch {
        // ignore polling errors
      }
    }, pollIntervalMs);
  };

  try {
    lastBlock = await client.getBlockNumber();
  } catch {
    lastBlock = null;
  }
  startPolling();

  const stop: WatcherStopFn = () => {
    stopped = true;
    if (interval) clearInterval(interval);
  };
  return stop;
};
