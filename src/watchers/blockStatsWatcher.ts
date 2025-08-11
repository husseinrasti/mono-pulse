import type { RpcClient, WatcherStopFn } from "../utils/types.js";

export type BlockStats = {
  blockNumber: bigint;
};

export const watchBlockStats = async (
  client: RpcClient,
  onUpdate: (stats: BlockStats) => void,
  options?: { pollIntervalMs?: number },
): Promise<WatcherStopFn> => {
  const pollIntervalMs = options?.pollIntervalMs ?? 5_000;

  let stopped = false;
  let lastBlock: bigint | null = null;
  let interval: NodeJS.Timeout | null = null;

  const emitCurrent = async () => {
    const current = await client.getBlockNumber();
    onUpdate({ blockNumber: current });
    lastBlock = current;
  };

  await emitCurrent();

  interval = setInterval(async () => {
    if (stopped) return;
    try {
      const bn = await client.getBlockNumber();
      if (lastBlock === null || bn !== lastBlock) {
        lastBlock = bn;
        onUpdate({ blockNumber: bn });
      }
    } catch {
      // ignore polling errors
    }
  }, pollIntervalMs);

  const stop: WatcherStopFn = () => {
    stopped = true;
    if (interval) clearInterval(interval);
  };
  return stop;
};
