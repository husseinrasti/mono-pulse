import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const quicknodeWsUrl = process.env.QUICKNODE_WS_URL || process.env.QUICKNODE_RPC_URL;
  const quicknodeApiKey = process.env.QUICKNODE_API_KEY;
  if (!quicknodeWsUrl) throw new Error("QUICKNODE_WS_URL or QUICKNODE_RPC_URL is required");

  // Initialize against QuickNode WS Streams endpoint
  const sdk = new MonoPulse({ provider: "quicknode", rpcUrl: quicknodeWsUrl, quicknodeApiKey });
  console.log("[QuickNode] Connecting…", { endpoint: quicknodeWsUrl });

  // Subscribe to ERC20 Transfer updates by polling contract data as state changes
  const token = process.env.TOKEN_ADDRESS as `0x${string}` | undefined;
  const user = process.env.USER_ADDRESS as `0x${string}` | undefined;

  const stopBlock = await sdk.watchBlockStats((stats) => {
    console.log("[QuickNode] New block:", stats.blockNumber.toString());
  });

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
    const stop = await sdk.watchContractData(
      token,
      erc20Abi,
      ["symbol", { functionName: "balanceOf", args: [user] }],
      (data) => {
        const symbol = data.symbol as string | null;
        const balance = (data.balanceOf as bigint | null)?.toString();
        console.log("[QuickNode] ERC20 Transfer state →", { token, symbol, user, balance });
      },
    );
    setTimeout(() => {
      stop();
      stopBlock();
      console.log("[QuickNode] Stopped.");
    }, 30_000);
    return;
  }

  // If no token/user provided, just block subscription for 30s
  setTimeout(() => {
    stopBlock();
    console.log("[QuickNode] Stopped.");
  }, 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
