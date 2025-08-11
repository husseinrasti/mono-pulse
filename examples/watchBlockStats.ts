import "dotenv/config";
import { MonoPulse } from "../src/index.js";

async function main() {
  const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL ?? "" });
  const stop = await sdk.watchBlockStats((stats) => {
    console.log("Block stats:", stats);
  });

  setTimeout(() => stop(), 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
