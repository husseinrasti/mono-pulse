type Listener<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private listeners: Map<keyof Events, Set<Listener<unknown>>> = new Map();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = (this.listeners.get(event) ?? new Set<Listener<unknown>>()) as Set<
      Listener<Events[K]>
    >;
    set.add(listener);
    this.listeners.set(event, set as unknown as Set<Listener<unknown>>);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(listener as unknown as Listener<unknown>);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set as Set<Listener<Events[K]>>) {
      try {
        listener(payload);
      } catch {
        // ignore listener errors
      }
    }
  }
}
