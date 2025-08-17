import dotenv from "dotenv";
import { createClient, publicActions, webSocket } from "viem";

import { watchContractDataExtend } from "monopulse/viemExtends";
import { WsProvider } from "monopulse/providers";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.WS_RPC_URL || process.env.RPC_URL;
  if (!rpcUrl) throw new Error("WS_RPC_URL is required (set it in .env or .env.local)");

  const client = createClient({ transport: webSocket(rpcUrl) }).extend(publicActions);
  const extended = client.extend(watchContractDataExtend);

  const eventProvider = new WsProvider(rpcUrl);

  const contract = process.env.CONTRACT_ADDRESS as `0x${string}`;
  if (!contract) throw new Error("CONTRACT_ADDRESS is required (set it in .env or .env.local)");

  const userAddress = process.env.USER_ADDRESS as `0x${string}`;
  if (!userAddress) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");

  const abi: readonly unknown[] = [
    {
      type: "function",
      name: "totalSupply",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
    },
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

  const feed: "finalized" | "speculative" =
    process.env.FEED_MODE === "finalized" ? "finalized" : "speculative";
  const verifiedOnly = String(process.env.VERIFIED_ONLY ?? "false").toLowerCase() === "true";

  const stop = await extended.watchContractData(
    contract,
    abi,
    ["totalSupply", "symbol", { functionName: "balanceOf", args: [userAddress] }],
    (data) => console.log("contract:", data),
    { feed, verifiedOnly, eventProvider },
  );

  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  console.log(
    `watchContractData: mode=${feed} verifiedOnly=${verifiedOnly} duration=${DURATION_MS}ms`,
  );
  setTimeout(() => {
    stop();
    try {
      (eventProvider as any)?.close?.();
    } catch {}
    console.log("watchContractData: stopped");
  }, DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
