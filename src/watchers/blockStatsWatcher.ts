import type { RpcClient, WatcherStopFn } from "../utils/types.js";

export type BlockStats = {
  blockNumber: bigint;
};

export const watchBlockStats = async (
  client: RpcClient,
  onUpdate: (stats: BlockStats) => void,
): Promise<WatcherStopFn> => {
  const current = await client.getBlockNumber();
  onUpdate({ blockNumber: current });
  const stop: WatcherStopFn = () => {};
  return stop;
};
