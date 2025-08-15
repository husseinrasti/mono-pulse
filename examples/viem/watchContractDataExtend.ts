import dotenv from "dotenv";
import { createClient, webSocket as ws, publicActions } from "viem";

import { watchContractDataExtend } from "monopulse/viemExtends";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const client = createClient({ transport: ws(rpcUrl) }).extend(publicActions);

  const extended = client.extend(watchContractDataExtend);

  const contract = process.env.CONTRACT_ADDRESS as `0x${string}`;
  if (!contract) throw new Error("CONTRACT_ADDRESS is required (set it in .env or .env.local)");

  const userAddress = process.env.USER_ADDRESS as `0x${string}`;
  if (!userAddress) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");

  const abi = [
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

  const stop = await extended.watchContractData(
    contract,
    abi,
    ["totalSupply", "symbol", { functionName: "balanceOf", args: [userAddress] }],
    (data) => console.warn("Contract data:", data),
    { pollIntervalMs: 5000 },
  );

  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  setTimeout(() => stop(), DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
