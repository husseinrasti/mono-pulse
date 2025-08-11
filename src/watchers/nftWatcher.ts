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
): Promise<WatcherStopFn> => {
  const fetcher = new DataFetcher(client);
  const calls: MulticallCall[] = contracts.map((c) => ({
    address: c,
    abi: ERC721_ABI as const,
    functionName: "balanceOf",
    args: [owner],
  }));
  const results = await fetcher.fetchMany<bigint>(calls, { allowFailure: true });
  const map: Record<Address, bigint> = {} as Record<Address, bigint>;
  for (let i = 0; i < contracts.length; i++)
    map[contracts[i]] = results[i]?.success ? (results[i].result as bigint) : 0n;
  onUpdate(map);

  const stop: WatcherStopFn = () => {};
  return stop;
};
