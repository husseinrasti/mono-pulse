import { executeMulticall } from "./multicall.js";
import type { MulticallCall, MulticallOptions, RpcClient } from "../utils/types.js";

export class DataFetcher {
  constructor(private readonly client: RpcClient) {}

  async fetchSingle<T>(call: MulticallCall): Promise<T> {
    return this.client.readContract<T>(call);
  }

  async fetchMany<T>(calls: MulticallCall[], options?: MulticallOptions) {
    return executeMulticall<T>(this.client, calls, options);
  }
}
