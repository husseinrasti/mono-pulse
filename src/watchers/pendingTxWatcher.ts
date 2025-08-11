import type { Address, Hex, RpcClient, WatcherStopFn } from "../utils/types.js";

export const watchPendingTxs = async (
  _client: RpcClient,
  _addressOrContract: Address,
  _onUpdate: (pending: readonly Hex[]) => void,
): Promise<WatcherStopFn> => {
  const stop: WatcherStopFn = () => {};
  return stop;
};
