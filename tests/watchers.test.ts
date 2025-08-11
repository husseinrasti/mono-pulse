import { watchBalances } from "../src/watchers/balancesWatcher";
import { watchContractData } from "../src/watchers/contractWatcher";
import { watchNFTs } from "../src/watchers/nftWatcher";
import { watchTransactions } from "../src/watchers/transactionsWatcher";
import { watchPendingTxs } from "../src/watchers/pendingTxWatcher";
import { watchBlockStats } from "../src/watchers/blockStatsWatcher";
import type { Address } from "../src/utils/types";
import { MockRpcClient } from "./mocks.js";

const ZERO: Address = "0x0000000000000000000000000000000000000000";

describe("watchers (MVP)", () => {
  test("watchBalances returns initial balances", async () => {
    const client = new MockRpcClient({ nativeBalance: 100n });
    const updates: unknown[] = [];
    const stop = await watchBalances(client, ZERO, [ZERO], (b) => updates.push(b));
    expect(updates.length).toBe(1);
    expect((updates[0] as any).native).toBe(100n);
    stop();
  });

  test("watchContractData returns map of results", async () => {
    const client = new MockRpcClient({ readContractResult: 7n });
    const updates: unknown[] = [];
    const stop = await watchContractData(client, ZERO, [], ["totalSupply"], (d) => updates.push(d));
    expect(updates.length).toBe(1);
    expect((updates[0] as any).totalSupply).toBeDefined();
    stop();
  });

  test("watchNFTs returns balances per contract", async () => {
    const client = new MockRpcClient();
    const updates: unknown[] = [];
    const stop = await watchNFTs(client, ZERO, [ZERO], (d) => updates.push(d));
    expect(updates.length).toBe(1);
    expect(Object.keys(updates[0] as object).length).toBe(1);
    stop();
  });

  test("watchTransactions returns a stop function and does not emit initially (MVP)", async () => {
    const client = new MockRpcClient();
    const updates: unknown[] = [];
    const stop = await watchTransactions(client, ZERO, (txs) => updates.push(txs));
    expect(typeof stop).toBe("function");
    expect(updates.length).toBe(0);
    stop();
  });

  test("watchPendingTxs returns a stop function and does not emit initially (MVP)", async () => {
    const client = new MockRpcClient();
    const updates: unknown[] = [];
    const stop = await watchPendingTxs(client, ZERO, (txs) => updates.push(txs));
    expect(typeof stop).toBe("function");
    expect(updates.length).toBe(0);
    stop();
  });

  test("watchBlockStats emits current block number once", async () => {
    const client = new MockRpcClient({ blockNumber: 999n });
    const updates: Array<{ blockNumber: bigint }> = [];
    const stop = await watchBlockStats(client, (stats) => updates.push(stats));
    expect(updates.length).toBe(1);
    const first = updates[0]!;
    expect(first.blockNumber).toBe(999n);
    stop();
  });

  test("watchBlockStats polls and stops correctly", async () => {
    class TestClient extends MockRpcClient {
      private current: bigint = 1n;
      async getBlockNumber(): Promise<bigint> {
        return this.current;
      }
      bump() {
        this.current += 1n;
      }
    }
    const client = new TestClient();
    const updates: Array<{ blockNumber: bigint }> = [];
    const stop = await watchBlockStats(client, (s) => updates.push(s), { pollIntervalMs: 20 });
    expect(updates.length).toBe(1);
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBeGreaterThanOrEqual(2);
    stop();
    const len = updates.length;
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBe(len);
  });

  test("watchBalances refreshes on new block and stops correctly", async () => {
    class TestClient extends MockRpcClient {
      private bn: bigint = 1n;
      async getBlockNumber(): Promise<bigint> {
        return this.bn;
      }
      bump() {
        this.bn += 1n;
      }
    }
    const client = new TestClient({ nativeBalance: 10n });
    const updates: any[] = [];
    const stop = await watchBalances(client, ZERO, [ZERO], (b) => updates.push(b), {
      pollIntervalMs: 20,
    });
    expect(updates.length).toBe(1);
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBeGreaterThanOrEqual(2);
    stop();
    const len = updates.length;
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBe(len);
  });

  test("watchContractData refreshes on new block and stops correctly", async () => {
    class TestClient extends MockRpcClient {
      private bn: bigint = 1n;
      async getBlockNumber(): Promise<bigint> {
        return this.bn;
      }
      bump() {
        this.bn += 1n;
      }
    }
    const client = new TestClient({ readContractResult: 123n });
    const updates: any[] = [];
    const stop = await watchContractData(
      client,
      ZERO,
      [],
      ["totalSupply"],
      (d) => updates.push(d),
      { pollIntervalMs: 20 },
    );
    expect(updates.length).toBe(1);
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBeGreaterThanOrEqual(2);
    stop();
    const len = updates.length;
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBe(len);
  });

  test("watchNFTs refreshes on new block and stops correctly", async () => {
    class TestClient extends MockRpcClient {
      private bn: bigint = 1n;
      async getBlockNumber(): Promise<bigint> {
        return this.bn;
      }
      bump() {
        this.bn += 1n;
      }
    }
    const client = new TestClient();
    const updates: any[] = [];
    const stop = await watchNFTs(client, ZERO, [ZERO], (d) => updates.push(d), {
      pollIntervalMs: 20,
    });
    expect(updates.length).toBe(1);
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBeGreaterThanOrEqual(2);
    stop();
    const len = updates.length;
    client.bump();
    await new Promise((r) => setTimeout(r, 50));
    expect(updates.length).toBe(len);
  });
});
