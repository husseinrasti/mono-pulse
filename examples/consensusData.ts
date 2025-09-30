import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";
import type { FeedType } from "../src/utils/types.js";

/**
 * Comprehensive Example: Monad Consensus Data Monitoring
 *
 * This example demonstrates how to use MonoPulse to extract complete
 * consensus-level data from Monad's monadNewHeads subscription, which provides:
 *
 * - Block proposals with proposer information
 * - Quorum Certificate (QC) data with all validator signatures
 * - Consensus state progression (Proposed → Voted → Finalized → Verified)
 *
 * All validator and consensus data is available in the block headers - no need
 * for separate log subscriptions!
 *
 * Use cases:
 * - Build real-time consensus state timelines
 * - Track validator participation and performance (proposals + votes)
 * - Visualize consensus progression and validator graphs
 * - Monitor network health and QC completion rates
 * - Create interactive consensus explorers
 */

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const feed: FeedType = process.env.FEED_MODE === "finalized" ? "finalized" : "speculative";
  console.log("\n" + "=".repeat(80));
  console.log("🔍 Monad Consensus Data Monitor");
  console.log("=".repeat(80));
  console.log(`Feed Mode: ${feed}`);
  console.log(`RPC: ${rpcUrl.slice(0, 40)}...`);
  console.log("=".repeat(80) + "\n");

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });

  // Track validator activity
  const validatorActivity = new Map();

  console.log("📡 Subscribing to monadNewHeads (consensus data)...\n");

  const stopBlockStats = await sdk.watchBlockStats(
    (stats) => {
      const blockNumber = stats.blockNumber;
      const blockId = stats.blockId;
      const commitState = stats.commitState;
      const proposer = stats.proposer;
      const qc = stats.qc;

      console.log("─".repeat(80));
      console.log(
        `📦 Block #${blockNumber.toString()} ${commitState ? `[${commitState}]` : "[finalized]"}`,
      );
      console.log(`   Block ID: ${blockId ?? "N/A"}`);

      if (proposer) {
        console.log(`   👤 Proposer: ${proposer}`);

        // Track proposer activity
        const activity = validatorActivity.get(proposer) || { proposals: 0, votes: 0 };
        activity.proposals += 1;
        validatorActivity.set(proposer, activity);
      }

      if (qc && qc.signers.length > 0) {
        console.log(`   ✅ QC Signers: ${qc.signers.length}`);
        console.log(`   🔏 QC Signatures: ${qc.signatures.length}`);

        // Show first few signers
        qc.signers.slice(0, 3).forEach((signer, i) => {
          console.log(`      ${i + 1}. ${signer.slice(0, 10)}...${signer.slice(-8)}`);

          // Track signer/voter activity
          const activity = validatorActivity.get(signer) || { proposals: 0, votes: 0 };
          activity.votes += 1;
          validatorActivity.set(signer, activity);
        });
        if (qc.signers.length > 3) {
          console.log(`      ... and ${qc.signers.length - 3} more`);
        }
      }

      // Show raw header availability for debugging
      if (stats.rawHeader) {
        const keys = Object.keys(stats.rawHeader);
        console.log(`   🔍 Raw header fields: ${keys.length} (${keys.slice(0, 5).join(", ")}...)`);
      }
    },
    { feed },
  );

  // Periodic summary
  const summaryInterval = setInterval(() => {
    console.log("\n" + "=".repeat(80));
    console.log("📊 CONSENSUS STATE SUMMARY");
    console.log("=".repeat(80));

    console.log("\n👥 Top Validators by Activity:");
    const entries = Array.from(validatorActivity.entries());
    const sorted = entries
      .sort((a, b) => {
        const aTotal = a[1].proposals + a[1].votes;
        const bTotal = b[1].proposals + b[1].votes;
        return bTotal - aTotal;
      })
      .slice(0, 10);

    sorted.forEach((entry, i) => {
      const address = entry[0];
      const activity = entry[1];
      const total = activity.proposals + activity.votes;
      console.log(
        `   ${i + 1}. ${address.slice(0, 10)}...${address.slice(-8)} - ` +
          `Proposals: ${activity.proposals}, Votes: ${activity.votes}, Total: ${total}`,
      );
    });

    console.log("=".repeat(80) + "\n");
  }, 30000);

  // Cleanup
  const DURATION_MS = Number(process.env.DURATION_MS || 120000);
  console.log(`\n⏱️  Monitoring for ${DURATION_MS / 1000}s...\n`);

  setTimeout(() => {
    console.log("\n✅ Stopping consensus data monitor...");
    stopBlockStats();
    clearInterval(summaryInterval);
    console.log("✅ Consensus data monitoring stopped\n");
    process.exit(0);
  }, DURATION_MS);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
