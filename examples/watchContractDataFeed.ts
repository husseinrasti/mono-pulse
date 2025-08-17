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

  const contract = requireEnv("CONTRACT_ADDRESS") as Address;
  console.warn("Contract address:", contract);
  if (!contract) throw new Error("CONTRACT_ADDRESS is required (set it in .env or .env.local)");

  const user = requireEnv("USER_ADDRESS") as Address;
  console.warn("User address:", user);
  if (!user) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });

  // Minimal ABI for demo
  const abi = [
    {
      type: "function",
      name: "symbol",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "string" }],
    },
    {
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

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

  const stop = await sdk.watchContractData(
    contract,
    abi as unknown as readonly unknown[],
    [{ functionName: "balanceOf", args: [user] }, "symbol"],
    (data) => {
      const prefix =
        feed === "speculative" ? `[${latestCommitState ?? "final"}:${latestBlockId ?? "-"}] ` : "";
      console.log(`${prefix}contract: symbol=${data.symbol} balanceOf=${data.balanceOf}`);
    },
    { feed },
  );

  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  console.log(
    `watchContractDataNew: mode=${feed} contract=${contract} user=${user} duration=${DURATION_MS}ms`,
  );
  setTimeout(() => {
    stop();
    stopHeads();
    console.log("watchContractDataNew: stopped");
  }, DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
