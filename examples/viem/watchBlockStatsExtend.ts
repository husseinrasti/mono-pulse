import dotenv from "dotenv";
import { createClient, publicActions, webSocket } from "viem";
import { watchBlockStatsExtend } from "monopulse/viemExtends";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const feed = process.env.FEED_MODE === "speculative" ? "speculative" : "finalized";
  console.warn("Feed mode:", feed);

  const verifiedOnly = String(process.env.VERIFIED_ONLY ?? "false").toLowerCase() === "true";

  const client = createClient({ transport: webSocket(rpcUrl) }).extend(publicActions);

  const extended = client.extend(watchBlockStatsExtend);
  const seenStates = new Map<bigint, string | null>();

  const stop = await extended.watchBlockStats(
    (s) => {
      if (feed === "speculative") {
        const prev = seenStates.get(s.blockNumber) ?? null;
        if (prev !== s.commitState) {
          seenStates.set(s.blockNumber, (s.commitState as string) ?? null);
          console.log(
            `head: #${s.blockNumber.toString()} state=${s.commitState ?? "-"} id=${s.blockId ?? "-"}`,
          );
        }
      } else {
        console.log(`head: #${s.blockNumber.toString()}`);
      }
    },
    { feed, verifiedOnly },
  );

  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  console.log(
    `watchBlockStatsNew: mode=${feed} verifiedOnly=${verifiedOnly} duration=${DURATION_MS}ms`,
  );
  setTimeout(() => {
    stop();
    console.log("watchBlockStatsNew: stopped");
  }, DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
