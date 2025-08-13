import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";
import type { Address, FeedType } from "../src/utils/types.js";

const requireEnv = (name: string): string => {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing required env var ${name}`);
  return v.trim();
};

const FEED_MODE = (process.env.FEED_MODE ?? "finalized").toLowerCase();
const feed: FeedType = FEED_MODE === "speculative" ? "speculative" : "finalized";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const user = requireEnv("USER_ADDRESS") as Address;
  console.warn("User address:", user);
  if (!user) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");

  const tokensCsv = requireEnv("TOKEN_ADDRESSES");
  console.warn("Token addresses:", tokensCsv);
  if (!tokensCsv) throw new Error("TOKEN_ADDRESSES is required (set it in .env or .env.local)");

  const tokenAddresses = tokensCsv.split(",").map((s) => s.trim() as Address);
  console.warn("Token addresses:", tokenAddresses);
  if (tokenAddresses.length === 0)
    throw new Error("TOKEN_ADDRESSES must contain at least one token");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });

  // Track latest commit state from block feed for logging
  let latestCommitState: string | null = null;
  let latestBlockId: string | null = null;

  const stopBlockStats = await sdk.watchBlockStats(
    (s) => {
      if (feed === "speculative") {
        latestCommitState = (s.commitState as string) ?? null;
        latestBlockId = (s.blockId as string) ?? null;
        console.log(
          `head: #${s.blockNumber.toString()} state=${s.commitState ?? "-"} id=${s.blockId ?? "-"}`,
        );
      } else {
        console.log(`head: #${s.blockNumber.toString()}`);
      }
    },
    { feed },
  );

  const stopBalances = await sdk.watchBalances(
    user,
    tokenAddresses,
    (b) => {
      const prefix =
        feed === "speculative" ? `[${latestCommitState ?? "final"}:${latestBlockId ?? "-"}] ` : "";
      const tokensAsString: Record<string, string> = Object.fromEntries(
        Object.entries(b.tokens).map(([k, v]) => [k, (v as bigint).toString()]),
      );
      console.log(
        `${prefix}balances: native=${b.native.toString()} tokens=${JSON.stringify(tokensAsString)}`,
      );
    },
    { feed },
  );

  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  console.log(
    `watchBalancesNew: mode=${feed} user=${user} tokens=${tokenAddresses.length} duration=${DURATION_MS}ms`,
  );
  setTimeout(() => {
    stopBalances();
    stopBlockStats();
    console.log("watchBalancesNew: stopped");
  }, DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
