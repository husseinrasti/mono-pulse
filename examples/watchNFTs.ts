import dotenv from "dotenv";

import { MonoPulse } from "../src/index.js";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });
  const userAddress = process.env.USER_ADDRESS as `0x${string}`;
  console.warn("User address:", userAddress);
  if (!userAddress) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");
  const stop = await sdk.watchNFTs(
    userAddress,
    [
      "0x1bBeB83F089253719D235Aa12754040Cd4214c6A", // NFT contracts here
    ],
    (nfts) => {
      console.warn("Updated NFTs:", nfts);
    },
  );
  const DURATION_MS = Number(process.env.DURATION_MS ?? 30_000);
  setTimeout(() => stop(), DURATION_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
