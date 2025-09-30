import dotenv from "dotenv";
import { MonoPulse } from "../src/index.js";
import type { FeedType } from "../src/utils/types.js";

/**
 * Example: Tracking Validator Consensus Data
 *
 * This example demonstrates how to use MonoPulse to extract validator-level
 * consensus data from Monad's speculative block headers. This data can be used
 * to build real-time visualizations of:
 * - Block proposers
 * - QC signers (voters)
 * - Consensus state transitions (Proposed → Voted → Finalized → Verified)
 * - Finalizer and verifier sets
 *
 * Use case: Feed this data into a graph visualization (e.g., D3.js, vis.js)
 * to show validator participation, consensus flow, and network health.
 */

async function main() {
  dotenv.config();
  dotenv.config({ path: ".env.local" });

  const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required (set it in .env or .env.local)");

  const feed: FeedType = process.env.FEED_MODE === "finalized" ? "finalized" : "speculative";
  console.log(`\n🔍 Monitoring validator consensus data (feed: ${feed})\n`);

  const sdk = new MonoPulse({ provider: "ws", rpcUrl });

  // Track validator activity over time
  const validatorStats = new Map<string, { proposalCount: number; voteCount: number }>();

  const stop = await sdk.watchBlockStats(
    (stats) => {
      // Extract validator data from block header
      const { blockNumber, blockId, commitState, proposer, qc } = stats;

      console.log("─".repeat(80));
      console.log(`📦 Block #${blockNumber.toString()}`);
      console.log(`   Block ID: ${blockId ?? "N/A"}`);
      console.log(`   Commit State: ${commitState ?? "finalized"}`);

      // Proposer information
      if (proposer) {
        console.log(`   👤 Proposer: ${proposer}`);

        // Track proposer activity
        const pStats = validatorStats.get(proposer) ?? { proposalCount: 0, voteCount: 0 };
        pStats.proposalCount += 1;
        validatorStats.set(proposer, pStats);
      }

      // QC Signers (Validators who signed the Quorum Certificate)
      if (qc && qc.signers.length > 0) {
        console.log(`   ✅ QC Signers (${qc.signers.length}):`);
        console.log(`   🔏 QC Signatures: ${qc.signatures.length}`);
        qc.signers.slice(0, 5).forEach((signer, i) => {
          console.log(`      ${i + 1}. ${signer}`);

          // Track voter activity
          const vStats = validatorStats.get(signer) ?? { proposalCount: 0, voteCount: 0 };
          vStats.voteCount += 1;
          validatorStats.set(signer, vStats);
        });
        if (qc.signers.length > 5) {
          console.log(`      ... and ${qc.signers.length - 5} more`);
        }
      }

      // Example: How to use this data in a graph visualization
      // In a real app, you would:
      // 1. Build a graph structure: nodes = validators, edges = votes
      // 2. Update node colors/sizes based on activity (proposalCount, voteCount)
      // 3. Animate state transitions (Proposed → Voted → Finalized → Verified)
      // 4. Highlight the current proposer and active voters
      //
      // const graphData = {
      //   nodes: Array.from(validatorStats.entries()).map(([address, stats]) => ({
      //     id: address,
      //     label: address.slice(0, 10) + "...",
      //     proposals: stats.proposalCount,
      //     votes: stats.voteCount,
      //     size: stats.proposalCount + stats.voteCount,
      //   })),
      //   edges: qc?.signers.map((signer) => ({
      //     from: signer,
      //     to: proposer,
      //     label: "voted",
      //   })) ?? [],
      // };
      // updateVisualization(graphData);
    },
    { feed },
  );

  // Show accumulated stats periodically
  setInterval(() => {
    console.log("\n" + "=".repeat(80));
    console.log("📊 Validator Activity Summary:");
    const sorted = Array.from(validatorStats.entries())
      .sort((a, b) => b[1].proposalCount + b[1].voteCount - (a[1].proposalCount + a[1].voteCount))
      .slice(0, 10);

    sorted.forEach(([address, stats], i) => {
      const total = stats.proposalCount + stats.voteCount;
      console.log(
        `   ${i + 1}. ${address.slice(0, 10)}...${address.slice(-8)} - ` +
          `Proposals: ${stats.proposalCount}, Votes: ${stats.voteCount} (Total: ${total})`,
      );
    });
    console.log("=".repeat(80) + "\n");
  }, 30_000);

  const DURATION_MS = Number(process.env.DURATION_MS ?? 120_000);
  console.log(`\n⏱️  Running for ${DURATION_MS / 1000}s...\n`);

  setTimeout(() => {
    stop();
    console.log("\n✅ Validator data monitoring stopped");
    process.exit(0);
  }, DURATION_MS);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
