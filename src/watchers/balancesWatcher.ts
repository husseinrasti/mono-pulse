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
): Promise<WatcherStopFn> => {
  const fetcher = new DataFetcher(client);

  const initialCalls: MulticallCall[] = tokenAddresses.map((token) => ({
    address: token,
    abi: ERC20_ABI as const,
    functionName: "balanceOf",
    args: [address],
  }));

  const [native, tokenResults] = await Promise.all([
    client.getNativeBalance(address),
    fetcher.fetchMany<bigint>(initialCalls, { allowFailure: true }),
  ]);

  const tokens: Record<Address, bigint> = {};
  for (let i = 0; i < tokenAddresses.length; i++) {
    const token = tokenAddresses[i];
    const res = tokenResults[i];
    tokens[token] = res?.success ? (res.result as bigint) : 0n;
  }

  onUpdate({ native, tokens });

  // Real-time updates will integrate provider events; for MVP return a no-op stop fn
  const stop: WatcherStopFn = () => {};
  return stop;
};
