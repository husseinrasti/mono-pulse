import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";

// Minimal ERC20 Transfer topic for log subscriptions
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const goldskyWsUrl = process.env.GOLDSKY_WS_URL || process.env.GOLDSKY_STREAM_URL;
  const goldskyApiKey = process.env.GOLDSKY_API_KEY;
  if (!goldskyWsUrl) throw new Error("GOLDSKY_WS_URL or GOLDSKY_STREAM_URL is required");

  // The SDK currently polls based on block changes; we still pass the WS URL
  const sdk = new MonoPulse({ provider: "goldsky", rpcUrl: goldskyWsUrl, goldskyApiKey });
  console.log("[Goldsky] Connecting…", { endpoint: goldskyWsUrl });
  console.log("[Goldsky] API key present:", Boolean(goldskyApiKey));

  // Real-time events: For now, emulate via watching block stats and logging new block numbers
  const stopBlock = await sdk.watchBlockStats((stats) => {
    console.log("[Goldsky] New block:", stats.blockNumber.toString());
  });

  // Demonstrate parsing and logging ERC20 Transfer-like updates by using contract watcher
  // If you provide TOKEN_ADDRESS and USER_ADDRESS we can read balanceOf to show updates
  const token = process.env.TOKEN_ADDRESS as `0x${string}` | undefined;
  const user = process.env.USER_ADDRESS as `0x${string}` | undefined;

  if (token && user) {
    const erc20Abi = [
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
    const stopContract = await sdk.watchContractData(
      token,
      erc20Abi,
      ["symbol", { functionName: "balanceOf", args: [user] }],
      (data) => {
        const symbol = data.symbol as string | null;
        const balance = (data.balanceOf as bigint | null)?.toString();
        console.log("[Goldsky] Transfer-suspected state update →", {
          token,
          symbol,
          user,
          balance,
        });
      },
    );

    // Stop after 30s
    setTimeout(() => {
      stopContract();
      stopBlock();
      console.log("[Goldsky] Stopped.");
    }, 30_000);
    return;
  }

  // If no token/user provided, just run blocks for 30s
  setTimeout(() => {
    stopBlock();
    console.log("[Goldsky] Stopped.");
  }, 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
