import "dotenv/config";
import { MonoPulse } from "../src/index.js";

async function main() {
  const sdk = new MonoPulse({ provider: "ws", rpcUrl: process.env.RPC_URL ?? "" });
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
  ] as const;
  const stop = await sdk.watchContractData(
    (process.env.CONTRACT_ADDRESS as `0x${string}`) ??
      ("0x0000000000000000000000000000000000000000" as const),
    abi,
    ["totalSupply", "symbol"],
    (data) => {
      console.log("Contract data updated:", data);
    },
  );

  setTimeout(() => stop(), 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
