import { DataFetcher } from "../core/dataFetcher.js";
import type {
  Address,
  BalancesMap,
  MulticallCall,
  RpcClient,
  WatcherStopFn,
} from "../utils/types.js";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

export const watchBalances = async (
  client: RpcClient,
  address: Address,
  tokenAddresses: Address[],
  onUpdate: (balances: BalancesMap) => void,
  options?: { pollIntervalMs?: number },
): Promise<WatcherStopFn> => {
  const fetcher = new DataFetcher(client);
  const pollIntervalMs = options?.pollIntervalMs ?? 5_000;

  const fetchAll = async () => {
    const calls: MulticallCall[] = tokenAddresses.map((token) => ({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }));

    const [native, tokenResults] = await Promise.all([
      client.getNativeBalance(address),
      fetcher.fetchMany<bigint>(calls, { allowFailure: true }),
    ]);

    const tokens: Record<Address, bigint> = {};
    for (let i = 0; i < tokenAddresses.length; i++) {
      const token = tokenAddresses[i];
      if (!token) continue;
      const res = tokenResults[i];
      tokens[token] = res && res.success ? ((res.result as bigint) ?? 0n) : 0n;
    }
    return { native, tokens } satisfies BalancesMap;
  };

  let stopped = false;
  let lastBlock: bigint | null = null;
  let interval: NodeJS.Timeout | null = null;

  // initial emit
  onUpdate(await fetchAll());

  // poll for new blocks and refresh balances when block changes
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

  // seed lastBlock and start the loop
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
