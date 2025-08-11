import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });
  const stop = await sdk.watchPendingTxs(
    (process.env.CONTRACT_ADDRESS as `0x${string}`) ??
      ("0x0000000000000000000000000000000000000000" as const),
    (txs) => {
      console.log("Pending TXs:", txs);
    },
  );

  setTimeout(() => stop(), 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
