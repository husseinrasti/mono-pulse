import type {
  Address,
  MulticallCall,
  MulticallOptions,
  MulticallResult,
  RpcClient,
} from "../src/utils/types.js";

export class MockRpcClient implements RpcClient {
  constructor(
    private readonly options: {
      nativeBalance?: bigint;
      multicallResults?: Array<MulticallResult<unknown>>;
      readContractResult?: unknown;
      blockNumber?: bigint;
      chainId?: number;
    } = {},
  ) {}

  async getChainId(): Promise<number> {
    return this.options.chainId ?? 1;
  }

  async getBlockNumber(): Promise<bigint> {
    return this.options.blockNumber ?? 123n;
  }

  async getNativeBalance(_address: Address): Promise<bigint> {
    return this.options.nativeBalance ?? 42n;
  }

  async readContract<T = unknown>(_call: MulticallCall): Promise<T> {
    return (this.options.readContractResult as T) ?? (1 as unknown as T);
  }

  async multicall<T = unknown>(
    calls: MulticallCall[],
    _opts?: MulticallOptions,
  ): Promise<MulticallResult<T>[]> {
    if (this.options.multicallResults) {
      return this.options.multicallResults as MulticallResult<T>[];
    }
    // Default: return incremental bigint results
    return calls.map((_, i) => ({ success: true, result: BigInt(i + 1) as unknown as T }));
  }
}
