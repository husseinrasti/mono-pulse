import dotenv from "dotenv";
import { createClient, publicActions, webSocket } from "viem";

import { watchBalancesExtend } from "monopulse/viemExtends";
import { WsProvider } from "monopulse/providers";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.WS_RPC_URL || process.env.RPC_URL;
  if (!rpcUrl) throw new Error("WS_RPC_URL is required (set it in .env or .env.local)");

  const client = createClient({ transport: webSocket(rpcUrl) }).extend(publicActions);
  const extended = client.extend(watchBalancesExtend);

  const eventProvider = new WsProvider(rpcUrl);

  const userAddress = process.env.USER_ADDRESS as `0x${string}`;
  if (!userAddress) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");

  const tokenCsv =
    process.env.TOKENS ?? process.env.TOKEN ?? "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea";
  const tokens = tokenCsv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean) as `0x${string}`[];

  const feed: "finalized" | "speculative" =
    process.env.FEED_MODE === "finalized" ? "finalized" : "speculative";
  const verifiedOnly = String(process.env.VERIFIED_ONLY ?? "false").toLowerCase() === "true";

  const stop = await extended.watchBalances(
    userAddress,
    tokens,
    (balances) => {
      console.log("balances:", {
        native: balances.native.toString(),
        tokens: Object.fromEntries(
          Object.entries(balances.tokens).map(([k, v]) => [k, v.toString()]),
        ),
      });
    },
    { feed, verifiedOnly, eventProvider },
  );

  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  console.log(`watchBalances: mode=${feed} verifiedOnly=${verifiedOnly} duration=${DURATION_MS}ms`);
  setTimeout(() => {
    stop();
    try {
      (eventProvider as any)?.close?.();
    } catch {}
    console.log("watchBalances: stopped");
  }, DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
