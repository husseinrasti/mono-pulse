import { watchBalances } from "../src/watchers/balancesWatcher";
import { watchContractData } from "../src/watchers/contractWatcher";
import { watchNFTs } from "../src/watchers/nftWatcher";
import { watchBlockStats } from "../src/watchers/blockStatsWatcher";
import { MockRpcClient } from "./mocks.js";
const ZERO = "0x0000000000000000000000000000000000000000";
describe("watchers (MVP)", () => {
  test("watchBalances returns initial balances", async () => {
    const client = new MockRpcClient({ nativeBalance: 100n });
    const updates = [];
    const stop = await watchBalances(client, ZERO, [ZERO], (b) => updates.push(b));
    expect(updates.length).toBe(1);
    expect(updates[0].native).toBe(100n);
    stop();
  });
  test("watchContractData returns map of results", async () => {
    const client = new MockRpcClient({ readContractResult: 7n });
    const updates = [];
    const stop = await watchContractData(client, ZERO, [], ["totalSupply"], (d) => updates.push(d));
    expect(updates.length).toBe(1);
    expect(updates[0].totalSupply).toBeDefined();
    stop();
  });
  test("watchNFTs returns balances per contract", async () => {
    const client = new MockRpcClient();
    const updates = [];
    const stop = await watchNFTs(client, ZERO, [ZERO], (d) => updates.push(d));
    expect(updates.length).toBe(1);
    expect(Object.keys(updates[0]).length).toBe(1);
    stop();
  });

  test("watchBlockStats emits current block number once", async () => {
    const client = new MockRpcClient({ blockNumber: 999n });
    const updates = [];
    const stop = await watchBlockStats(client, (stats) => updates.push(stats));
    expect(updates.length).toBe(1);
    const first = updates[0];
    expect(first.blockNumber).toBe(999n);
    stop();
  });
});
//# sourceMappingURL=watchers.test.js.map
