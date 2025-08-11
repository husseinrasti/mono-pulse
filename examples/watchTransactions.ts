import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });
  const userAddress = process.env.USER_ADDRESS as `0x${string}`;
  console.log("User address:", userAddress);
  if (!userAddress) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");
  const stop = await sdk.watchTransactions(userAddress, (txs) => {
    console.log("New transactions:", txs);
  });

  setTimeout(() => stop(), 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
