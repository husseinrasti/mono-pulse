import type { Address, Hex, RpcClient, WatcherStopFn } from "../utils/types.js";

export const watchTransactions = async (
  _client: RpcClient,
  _address: Address,
  _onUpdate: (txs: readonly Hex[]) => void,
): Promise<WatcherStopFn> => {
  // Placeholder: real implementation will wire provider events and fetch details
  const stop: WatcherStopFn = () => {};
  return stop;
};
