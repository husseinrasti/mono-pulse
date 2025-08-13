import WebSocket from "ws";

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
} from "../utils/types.js";

type ActiveSubscription = {
  id: number;
  unsubscribe: () => void;
  routeId?: string | number;
  kind: "heads" | "logs" | "other";
  handler: (result: unknown) => void;
  pendingUnsubscribe?: boolean;
};

type JsonRpcMessage = {
  id?: number;
  method?: string;
  params?: { subscription: string | number; result: unknown };
  result?: unknown;
};

export class WsProvider implements EventProvider {
  readonly name = "ws";
  private ws: WebSocket;
  private nextId = 1;
  private idToSub = new Map<number, ActiveSubscription>();
  private routeToSub = new Map<string | number, ActiveSubscription>();
  private sendQueue: string[] = [];
  private activeCount = 0;

  constructor(private readonly url: string) {
    this.ws = new WebSocket(url);
    this.ws.on("open", () => this.flushQueue());
    this.ws.on("message", (raw: WebSocket.RawData) => this.handleMessage(String(raw)));
  }

  private send(method: string, params: unknown[]): number {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.sendQueue.push(payload);
    }
    return id;
  }

  private flushQueue(): void {
    if (this.sendQueue.length === 0) return;
    if (this.ws.readyState !== WebSocket.OPEN) return;
    for (const p of this.sendQueue) {
      try {
        this.ws.send(p);
      } catch {
        // ignore send errors on flush
      }
    }
    this.sendQueue = [];
  }

  private handleMessage(raw: string): void {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(raw) as JsonRpcMessage;
    } catch {
      return;
    }
    if (msg.method === "eth_subscription" && msg.params) {
      const sub = this.routeToSub.get(msg.params.subscription);
      if (!sub) return;
      try {
        sub.handler(msg.params.result);
      } catch {
        // ignore
      }
      return;
    }
    if (msg.id && this.idToSub.has(msg.id)) {
      const sub = this.idToSub.get(msg.id)!;
      const routeId = (msg.result as any) ?? msg.id;
      sub.routeId = routeId as string | number;
      this.routeToSub.set(routeId as string | number, sub);
      this.idToSub.delete(msg.id);
      // If unsubscribe was requested before we received the route id, perform it now
      if (sub.pendingUnsubscribe) {
        this.performUnsubscribe(sub);
      }
    }
  }

  onNewBlock(
    handler: (block: BlockHeaderEvent) => void,
    options?: { feed?: FeedType; verifiedOnly?: boolean },
  ): EventUnsubscribeFn {
    const feed = options?.feed ?? "finalized";
    const subName = feed === "speculative" ? "monadNewHeads" : "newHeads";
    const id = this.send("eth_subscribe", [subName]);
    const active: ActiveSubscription = {
      id,
      kind: "heads",
      handler: (result: any) => {
        const numHex: string | undefined = result?.number ?? result?.blockNumber;
        if (!numHex) return;
        const blockNumber = BigInt(numHex);
        const evt: BlockHeaderEvent = {
          blockNumber,
          hash: (result?.hash ?? null) as Hex | null,
          blockId: (result?.blockId ?? null) as string | null,
          commitState: (result?.commitState ?? null) as CommitState | null,
        };
        if (options?.verifiedOnly && evt.commitState !== "Verified") return;
        handler(evt);
      },
      unsubscribe: () => this.requestUnsubscribe(active),
    };
    this.idToSub.set(id, active);
    this.activeCount += 1;
    return () => {
      active.unsubscribe();
    };
  }

  onLogs(
    filter: LogFilter,
    handler: (logs: readonly ProviderLog[]) => void,
    options?: { feed?: FeedType; verifiedOnly?: boolean },
  ): EventUnsubscribeFn {
    const feed = options?.feed ?? "finalized";
    const subName = feed === "speculative" ? "monadLogs" : "logs";
    const id = this.send("eth_subscribe", [subName, this.encodeFilter(filter)]);
    const active: ActiveSubscription = {
      id,
      kind: "logs",
      handler: (result: any) => {
        const arr: any[] = Array.isArray(result) ? result : [result];
        const parsed: ProviderLog[] = arr.map((r) => {
          const bn = r?.blockNumber ? BigInt(r.blockNumber) : null;
          return {
            address: r?.address as Address,
            topics: (r?.topics ?? []) as Hex[],
            data: (r?.data ?? "0x") as Hex,
            blockNumber: bn,
            transactionHash: (r?.transactionHash ?? null) as Hex | null,
            blockId: (r?.blockId ?? null) as string | null,
            commitState: (r?.commitState ?? null) as CommitState | null,
          } as ProviderLog;
        });
        const filtered = options?.verifiedOnly
          ? parsed.filter((l) => l.commitState === "Verified")
          : parsed;
        if (filtered.length > 0) handler(filtered);
      },
      unsubscribe: () => this.requestUnsubscribe(active),
    };
    this.idToSub.set(id, active);
    this.activeCount += 1;
    return () => {
      active.unsubscribe();
    };
  }

  onPendingTransactions(_handler: (txHashes: readonly Hex[]) => void): EventUnsubscribeFn {
    const id = this.send("eth_subscribe", ["newPendingTransactions"]);
    const active: ActiveSubscription = {
      id,
      kind: "other",
      handler: () => {},
      unsubscribe: () => this.requestUnsubscribe(active),
    };
    this.idToSub.set(id, active);
    this.activeCount += 1;
    return () => {
      active.unsubscribe();
    };
  }

  onTransactionsForAddress(
    _address: Address,
    _handler: (tx: { hash: Hex }) => void,
  ): EventUnsubscribeFn {
    const noop = () => {};
    return noop;
  }

  private encodeFilter(filter: LogFilter): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (filter.address) out.address = filter.address;
    if (filter.topics) out.topics = filter.topics;
    if (filter.fromBlock) out.fromBlock = "0x" + filter.fromBlock.toString(16);
    if (filter.toBlock) out.toBlock = "0x" + filter.toBlock.toString(16);
    return out;
  }

  private requestUnsubscribe(active: ActiveSubscription): void {
    if (active.routeId !== undefined) {
      this.performUnsubscribe(active);
      return;
    }
    // route id not known yet; mark pending
    active.pendingUnsubscribe = true;
  }

  private performUnsubscribe(active: ActiveSubscription): void {
    try {
      const rid = active.routeId ?? active.id;
      this.send("eth_unsubscribe", [rid]);
    } finally {
      if (active.routeId !== undefined) this.routeToSub.delete(active.routeId);
      // Also remove from id map if present
      for (const [id, sub] of this.idToSub.entries()) {
        if (sub === active) this.idToSub.delete(id);
      }
      this.activeCount = Math.max(0, this.activeCount - 1);
      if (this.activeCount === 0) {
        try {
          this.ws.close();
        } catch {
          // ignore
        }
      }
    }
  }
}
