import WebSocket from "ws";

import type {
  Address,
  EventProvider,
  EventUnsubscribeFn,
  Hex,
  LogFilter,
  ProviderLog,
} from "../utils/types.js";

type Subscription = {
  id: number;
  unsubscribe: () => void;
};

export class WsProvider implements EventProvider {
  readonly name = "ws";
  private ws: WebSocket;
  private nextId = 1;
  private subscriptions = new Map<number, Subscription>();

  constructor(private readonly url: string) {
    this.ws = new WebSocket(url);
    this.ws.on("message", (raw: WebSocket.RawData) => this.handleMessage(String(raw)));
  }

  private send(method: string, params: unknown[]): number {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    this.ws.send(payload);
    return id;
  }

  private handleMessage(_raw: string): void {
    // In a real implementation, we'd route messages by id and emit to handlers.
    // For MVP, no-op to keep stubs lightweight until watchers are built.
  }

  onNewBlock(_handler: (blockNumber: bigint) => void): EventUnsubscribeFn {
    const id = this.send("eth_subscribe", ["newHeads"]);
    const sub: Subscription = {
      id,
      unsubscribe: () => this.send("eth_unsubscribe", [id]),
    };
    this.subscriptions.set(id, sub);
    // Note: message routing omitted in this MVP
    return () => {
      sub.unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  onLogs(_filter: LogFilter, _handler: (logs: readonly ProviderLog[]) => void): EventUnsubscribeFn {
    const id = this.send("eth_subscribe", ["logs"]);
    const sub: Subscription = {
      id,
      unsubscribe: () => this.send("eth_unsubscribe", [id]),
    };
    this.subscriptions.set(id, sub);
    return () => {
      sub.unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  onPendingTransactions(_handler: (txHashes: readonly Hex[]) => void): EventUnsubscribeFn {
    const id = this.send("eth_subscribe", ["newPendingTransactions"]);
    const sub: Subscription = {
      id,
      unsubscribe: () => this.send("eth_unsubscribe", [id]),
    };
    this.subscriptions.set(id, sub);
    return () => {
      sub.unsubscribe();
      this.subscriptions.delete(id);
    };
  }

  onTransactionsForAddress(
    _address: Address,
    _handler: (tx: { hash: Hex }) => void,
  ): EventUnsubscribeFn {
    // No native subscription; would filter from pending and blocks in a complete impl.
    const noop = () => {};
    return noop;
  }
}
