export class MockRpcClient {
  constructor(options = {}) {
    this.options = options;
  }
  async getChainId() {
    return this.options.chainId ?? 1;
  }
  async getBlockNumber() {
    return this.options.blockNumber ?? 123n;
  }
  async getNativeBalance() {
    return this.options.nativeBalance ?? 42n;
  }
  async readContract() {
    return this.options.readContractResult ?? 1;
  }
  async multicall(calls) {
    if (this.options.multicallResults) {
      return this.options.multicallResults;
    }
    // Default: return incremental bigint results
    return calls.map((_, i) => ({ success: true, result: BigInt(i + 1) }));
  }
}
//# sourceMappingURL=mocks.js.map
