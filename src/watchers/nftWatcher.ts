import { DataFetcher } from "../core/dataFetcher.js";
import type { Address, MulticallCall, RpcClient, WatcherStopFn } from "../utils/types.js";

const ERC721_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

export const watchNFTs = async (
  client: RpcClient,
  owner: Address,
  contracts: Address[],
  onUpdate: (nfts: Record<Address, bigint>) => void,
  options?: { pollIntervalMs?: number },
): Promise<WatcherStopFn> => {
  const fetcher = new DataFetcher(client);
  const pollIntervalMs = options?.pollIntervalMs ?? 7_500;

  const fetchAll = async () => {
    const calls: MulticallCall[] = contracts.map((c) => ({
      address: c,
      abi: ERC721_ABI,
      functionName: "balanceOf",
      args: [owner],
    }));
    const results = await fetcher.fetchMany<bigint>(calls, { allowFailure: true });
    const map: Record<Address, bigint> = {} as Record<Address, bigint>;
    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i];
      if (!contract) continue;
      const res = results[i];
      map[contract] = res && res.success ? ((res.result as bigint) ?? 0n) : 0n;
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
