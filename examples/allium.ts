import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const alliumRpcUrl = process.env.ALLIUM_WS_URL || process.env.ALLIUM_RPC_URL;
  const alliumApiKey = process.env.ALLIUM_API_KEY;
  if (!alliumRpcUrl) throw new Error("ALLIUM_WS_URL or ALLIUM_RPC_URL is required");

  const userAddress = process.env.USER_ADDRESS as `0x${string}` | undefined;
  if (!userAddress) throw new Error("USER_ADDRESS is required (set it in .env or .env.local)");

  // Initialize SDK against Allium's WebSocket RPC (passed as rpcUrl)
  const sdk = new MonoPulse({ provider: "allium", rpcUrl: alliumRpcUrl, alliumApiKey });

  console.log("[Allium] Connecting…", { endpoint: alliumRpcUrl });
  const chainId = await sdk.getChainId();
  console.log("[Allium] chainId:", chainId);

  // Fetch on-chain data: latest block, then watch balances
  const stopBlock = await sdk.watchBlockStats((stats) => {
    console.log("[Allium] Latest block:", stats.blockNumber.toString());
  });

  // Optional: comma-separated ERC20 token addresses via TOKEN_ADDRESSES
  const tokenAddresses = (process.env.TOKEN_ADDRESSES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as `0x${string}`[];

  const stopBalances = await sdk.watchBalances(userAddress, tokenAddresses, (balances) => {
    const native = balances.native.toString();
    const tokens = Object.fromEntries(
      Object.entries(balances.tokens).map(([addr, v]) => [addr, v.toString()]),
    );
    console.log("[Allium] Balances →", { native, tokens });
  });

  // Graceful shutdown after 30s for demo purposes
  const shutdown = () => {
    stopBlock();
    stopBalances();
    console.log("[Allium] Stopped.");
  };
  setTimeout(shutdown, 30_000);
  process.once("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
