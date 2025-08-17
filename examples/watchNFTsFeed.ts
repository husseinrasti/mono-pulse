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

  const owner = requireEnv("USER_ADDRESS") as Address;
  console.warn("User address:", owner);
  if (!owner) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");

  const contractsCsv = requireEnv("NFT_CONTRACT_ADDRESSES");
  console.warn("NFT contracts:", contractsCsv);
  if (!contractsCsv)
    throw new Error("NFT_CONTRACT_ADDRESSES is required (set it in .env or .env.local)");

  const contracts = contractsCsv.split(",").map((s) => s.trim() as Address);
  console.warn("NFT contracts:", contracts);
  if (contracts.length === 0)
    throw new Error("NFT_CONTRACT_ADDRESSES must contain at least one contract");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });

  let latestCommitState: string | null = null;
  let latestBlockId: string | null = null;
  const stopHeads = await sdk.watchBlockStats(
    (s) => {
      if (feed === "speculative") {
        latestCommitState = (s.commitState as string) ?? null;
        latestBlockId = (s.blockId as string) ?? null;
        console.log(
          `head: #${s.blockNumber.toString()} state=${s.commitState ?? "-"} id=${s.blockId ?? "-"}`,
        );
      }
    },
    { feed },
  );

  const stop = await sdk.watchNFTs(
    owner,
    contracts,
    (nfts) => {
      const prefix =
        feed === "speculative" ? `[${latestCommitState ?? "final"}:${latestBlockId ?? "-"}] ` : "";
      const nftsAsString: Record<string, string> = Object.fromEntries(
        Object.entries(nfts).map(([k, v]) => [k, (v as bigint).toString()]),
      );
      console.log(`${prefix}nfts: ${JSON.stringify(nftsAsString)}`);
    },
    { feed },
  );

  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  console.log(
    `watchNFTsNew: mode=${feed} owner=${owner} contracts=${contracts.length} duration=${DURATION_MS}ms`,
  );
  setTimeout(() => {
    stop();
    stopHeads();
    console.log("watchNFTsNew: stopped");
  }, DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
