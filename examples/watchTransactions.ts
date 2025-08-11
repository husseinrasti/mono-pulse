import "dotenv/config";
import { MonoPulse } from "../src/index.js";

async function main() {
  const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL ?? "" });
  const stop = await sdk.watchTransactions(
    (process.env.USER_ADDRESS as `0x${string}`) ??
      ("0x0000000000000000000000000000000000000000" as const),
    (txs) => {
      console.log("New transactions:", txs);
    },
  );

  setTimeout(() => stop(), 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
