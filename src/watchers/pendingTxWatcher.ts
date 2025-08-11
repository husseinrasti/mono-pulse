import type { Address, Hex, RpcClient, WatcherStopFn } from "../utils/types.js";

export const watchPendingTxs = async (
  _client: RpcClient,
  _addressOrContract: Address,
  _onUpdate: (pending: readonly Hex[]) => void,
): Promise<WatcherStopFn> => {
  // Placeholder: wire to provider pending tx stream in future
  let stopped = false;
  const stop: WatcherStopFn = () => {
    stopped = true;
  };
  void stopped; // silence unused for MVP
  return stop;
};
