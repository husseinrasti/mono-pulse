import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";
import type { FeedType } from "../src/utils/types.js";

const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing required env var ${name}`);
  return v.trim();
};

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const feed: FeedType = process.env.FEED_MODE === "speculative" ? "speculative" : "finalized";
  console.warn("Feed mode:", feed);

  const verifiedOnly = String(process.env.VERIFIED_ONLY ?? "false").toLowerCase() === "true";

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });
  const seenStates = new Map<bigint, string | null>();

  const stop = await sdk.watchBlockStats(
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
