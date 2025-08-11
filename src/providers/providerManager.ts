import { WsProvider } from "./wsProvider.js";
import type { EventProvider, MonoPulseOptions, ProviderName } from "../utils/types.js";

export class ProviderManager {
  private selected?: EventProvider;

  constructor(private readonly options: MonoPulseOptions) {}

  getProvider(): EventProvider {
    if (this.selected) return this.selected;
    const choice = this.options.provider;
    this.selected = this.createProvider(choice);
    return this.selected;
  }

  private createProvider(name: ProviderName): EventProvider {
    // For MVP we wire only WsProvider; others are added as stubs
    if (name === "ws" || name === "auto") {
      const url = this.options.rpcUrl;
      if (!url) throw new Error("rpcUrl is required for ws provider");
      return new WsProvider(url);
    }
    // TODO: Implement: allium, goldsky, quicknode
    // For now, fallback to ws when explicit provider not yet implemented
    const url = this.options.rpcUrl;
    if (!url) throw new Error("rpcUrl is required for fallback ws provider");
    return new WsProvider(url);
  }
}
