import dotenv from "dotenv";

import { MonoPulse } from "../src/index.js";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });
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
  const userAddress = process.env.USER_ADDRESS as `0x${string}`;
  console.warn("User address:", userAddress);
  if (!userAddress) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");
  const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
  console.warn("Contract address:", contractAddress);
  if (!contractAddress)
    throw new Error("CONTRACT_ADDRESS is required (set it in .env or .env.local)");
  const stop = await sdk.watchContractData(
    contractAddress,
    abi,
    ["totalSupply", "symbol", { functionName: "balanceOf", args: [userAddress] }],
    (data) => {
      console.warn("Contract data updated:", data);
    },
  );
  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  setTimeout(() => stop(), DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
