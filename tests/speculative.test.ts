import { watchBlockStats } from "../src/watchers/blockStatsWatcher.js";
import { MockRpcClient } from "./mocks.js";
import type {
  Address,
  BlockHeaderEvent,
  CommitState,
  EventProvider,
  EventUnsubscribeFn,
  FeedType,
  Hex,
  LogFilter,
  ProviderLog,
} from "../src/utils/types.js";

class MockEventProvider implements EventProvider {
  readonly name = "mock";
  private headListeners: Array<{
    handler: (e: BlockHeaderEvent) => void;
    options?: { feed?: FeedType; verifiedOnly?: boolean };
  }> = [];

  onNewBlock(
    handler: (block: BlockHeaderEvent) => void,
    options?: { feed?: FeedType; verifiedOnly?: boolean },
  ): EventUnsubscribeFn {
    const entry = options ? { handler, options } : { handler };
    this.headListeners.push(entry);
    return () => {
      const idx = this.headListeners.indexOf(entry as any);
      if (idx >= 0) this.headListeners.splice(idx, 1);
    };
  }

  onLogs(
    _filter: LogFilter,
    _handler: (logs: readonly ProviderLog[]) => void,
    _options?: { feed?: FeedType; verifiedOnly?: boolean },
  ): EventUnsubscribeFn {
    return () => {};
  }

  onPendingTransactions(_handler: (txHashes: readonly Hex[]) => void): EventUnsubscribeFn {
    return () => {};
  }

  onTransactionsForAddress(
    _address: Address,
    _handler: (tx: { hash: Hex }) => void,
  ): EventUnsubscribeFn {
    return () => {};
  }

  emitHead(num: bigint, state: CommitState | null = null, blockId: string | null = null) {
    const evt: BlockHeaderEvent = { blockNumber: num, commitState: state, blockId };
    for (const l of this.headListeners) {
      if (l.options?.verifiedOnly && evt.commitState !== "Verified") continue;
      l.handler(evt);
    }
  }
}

describe("speculative feeds", () => {
  test("watchBlockStats emits in-order and re-emits on commitState upgrades", async () => {
    const provider = new MockEventProvider();
    const client = new MockRpcClient({ blockNumber: 0n });
    const updates: Array<{
      blockNumber: bigint;
      blockId?: string | null;
      commitState?: CommitState | null;
    }> = [];
    const stop = await watchBlockStats(client, (s) => updates.push(s), {
      eventProvider: provider,
      feed: "speculative",
    });

    // Emit out of order proposals
    provider.emitHead(100n, "Proposed", "b100a");
    provider.emitHead(101n, "Proposed", "b101a");
    // Upgrade 100 to Finalized -> should re-emit 100
    provider.emitHead(100n, "Finalized", "b100a");
    // Introduce competing proposal for 101 then verify canonical
    provider.emitHead(101n, "Proposed", "b101b");
    provider.emitHead(101n, "Verified", "b101a");

    // small wait to allow async callbacks
    await new Promise((r) => setTimeout(r, 10));

    // We expect: 100 Proposed, 101 Proposed (in order), 100 Finalized re-emit, 101 Verified re-emit
    expect(updates.length).toBeGreaterThanOrEqual(4);
    expect(updates[0]!.blockNumber).toBe(100n);
    expect(updates[1]!.blockNumber).toBe(101n);
    const hasFinalized100 = updates.some(
      (u) => u.blockNumber === 100n && u.commitState === "Finalized",
    );
    const hasVerified101 = updates.some(
      (u) => u.blockNumber === 101n && u.commitState === "Verified",
    );
    expect(hasFinalized100).toBe(true);
    expect(hasVerified101).toBe(true);
    stop();
  });

  test("verifiedOnly mode only emits Verified heads", async () => {
    const provider = new MockEventProvider();
    const client = new MockRpcClient({ blockNumber: 0n });
    const updates: Array<{ blockNumber: bigint; commitState?: CommitState | null }> = [];
    const stop = await watchBlockStats(client, (s) => updates.push(s), {
      eventProvider: provider,
      feed: "speculative",
      verifiedOnly: true,
    });

    provider.emitHead(200n, "Proposed", "x");
    provider.emitHead(200n, "Voted", "x");
    provider.emitHead(200n, "Verified", "x");
    await new Promise((r) => setTimeout(r, 10));

    // Only the Verified emission should be seen
    expect(updates.length).toBe(1);
    expect(updates[0]!.blockNumber).toBe(200n);
    expect(updates[0]!.commitState).toBe("Verified");
    stop();
  });
});
