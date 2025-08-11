import type { Address, Hex, RpcClient, WatcherStopFn } from "../utils/types.js";

export const watchTransactions = async (
  _client: RpcClient,
  _address: Address,
  _onUpdate: (txs: readonly Hex[]) => void,
): Promise<WatcherStopFn> => {
  // Placeholder for MVP
  let stopped = false;
  const stop: WatcherStopFn = () => {
    stopped = true;
  };
  void stopped; // silence unused for MVP
  return stop;
};
