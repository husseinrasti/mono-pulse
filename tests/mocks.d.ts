import type {
  Address,
  MulticallCall,
  MulticallOptions,
  MulticallResult,
  RpcClient,
} from "../src/utils/types.js";
export declare class MockRpcClient implements RpcClient {
  private readonly options;
  constructor(options?: {
    nativeBalance?: bigint;
    multicallResults?: Array<MulticallResult<unknown>>;
    readContractResult?: unknown;
    blockNumber?: bigint;
    chainId?: number;
  });
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  getNativeBalance(_address: Address): Promise<bigint>;
  readContract<T = unknown>(_call: MulticallCall): Promise<T>;
  multicall<T = unknown>(
    calls: MulticallCall[],
    _opts?: MulticallOptions,
  ): Promise<MulticallResult<T>[]>;
}
//# sourceMappingURL=mocks.d.ts.map
