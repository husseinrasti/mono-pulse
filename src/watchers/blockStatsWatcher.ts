import type {
  Address,
  BlockHeaderEvent,
  CommitState,
  EventProvider,
  FeedType,
  QuorumCertificate,
  RpcClient,
  WatcherStopFn,
} from "../utils/types.js";

export type BlockStats = {
  blockNumber: bigint;
  blockId?: string | null;
  commitState?: CommitState | null;
  // Monad consensus data
  proposer?: Address | null;
  qc?: QuorumCertificate | null;
  rawHeader?: Record<string, any>;
};

export const watchBlockStats = async (
  client: RpcClient,
  onUpdate: (stats: BlockStats) => void,
  options?: {
    pollIntervalMs?: number;
    eventProvider?: EventProvider;
    feed?: FeedType;
    verifiedOnly?: boolean;
  },
): Promise<WatcherStopFn> => {
  const pollIntervalMs = options?.pollIntervalMs ?? 5_000;

  // If an event provider is provided, prefer event-driven mode for real-time ordering
  if (options?.eventProvider) {
    const provider = options.eventProvider;

    let stopped = false;
    let lastEmitted: bigint | null = null;

    // Track proposals per blockNumber
    type Proposal = {
      blockId: string | null;
      state: CommitState | null;
      proposer?: Address | null;
      qc?: QuorumCertificate | null;
      rawHeader?: Record<string, any> | undefined;
    };
    const numToProposals = new Map<bigint, Map<string | null, Proposal>>();
    const stateRank: Record<CommitState, number> = {
      Proposed: 1,
      Voted: 2,
      Finalized: 3,
      Verified: 4,
    };

    const chooseCanonical = (num: bigint): Proposal | undefined => {
      const m = numToProposals.get(num);
      if (!m || m.size === 0) return undefined;
      // Prefer highest commit state; if Finalized or Verified exists, keep only that one
      let best: Proposal | undefined;
      for (const p of m.values()) {
        if (!best) {
          best = p;
          continue;
        }
        const br = p.state ? stateRank[p.state] : 0;
        const cr = best.state ? stateRank[best.state] : 0;
        if (br > cr) best = p;
      }
      if (best && (best.state === "Finalized" || best.state === "Verified")) {
        // prune others
        const only = new Map<string | null, Proposal>();
        only.set(best.blockId ?? null, best);
        numToProposals.set(num, only);
      }
      return best;
    };

    const tryEmitInOrder = () => {
      if (stopped) return;
      // if we haven't emitted anything yet, pick the smallest available number
      if (lastEmitted === null) {
        const nums = [...numToProposals.keys()].sort((a, b) => (a < b ? -1 : 1));
        if (nums.length === 0) return;
        const first = nums[0]!;
        const best = chooseCanonical(first);
        if (!best) return;
        onUpdate({
          blockNumber: first,
          blockId: best.blockId,
          commitState: best.state,
          proposer: best.proposer ?? null,
          qc: best.qc ?? null,
          ...(best.rawHeader !== undefined && { rawHeader: best.rawHeader }),
        });
        lastEmitted = first;
      }
      // emit contiguously
      while (true) {
        const next = (lastEmitted! + 1n) as bigint;
        if (!numToProposals.has(next)) break;
        const best = chooseCanonical(next);
        if (!best) break;
        onUpdate({
          blockNumber: next,
          blockId: best.blockId,
          commitState: best.state,
          proposer: best.proposer ?? null,
          qc: best.qc ?? null,
          ...(best.rawHeader !== undefined && { rawHeader: best.rawHeader }),
        });
        lastEmitted = next;
      }
    };

    const handleHead = (e: BlockHeaderEvent) => {
      const num = e.blockNumber;
      const byId = numToProposals.get(num) ?? new Map<string | null, Proposal>();
      const id = e.blockId ?? null;
      const existing = byId.get(id) ?? {
        blockId: id,
        state: null,
        proposer: e.proposer ?? null,
        qc: e.qc ?? null,
        rawHeader: e.rawHeader,
      };
      // update state if advanced
      const prevRank = existing.state ? stateRank[existing.state] : 0;
      const nextRank = e.commitState ? stateRank[e.commitState] : 0;
      if (nextRank >= prevRank) existing.state = e.commitState ?? existing.state;
      // Update consensus fields if they're present
      if (e.proposer !== undefined) existing.proposer = e.proposer;
      if (e.qc !== undefined) existing.qc = e.qc;
      if (e.rawHeader !== undefined) existing.rawHeader = e.rawHeader;
      byId.set(id, existing);
      numToProposals.set(num, byId);

      // If this is a commitState update for an already emitted blockNumber, re-emit
      if (lastEmitted !== null && num <= lastEmitted) {
        const best = chooseCanonical(num);
        if (best)
          onUpdate({
            blockNumber: num,
            blockId: best.blockId,
            commitState: best.state,
            proposer: best.proposer ?? null,
            qc: best.qc ?? null,
            ...(best.rawHeader !== undefined && { rawHeader: best.rawHeader }),
          });
        return;
      }

      tryEmitInOrder();
    };

    const evOpts: { feed?: FeedType; verifiedOnly?: boolean } = {};
    if (options.feed) evOpts.feed = options.feed;
    if (options.verifiedOnly !== undefined) evOpts.verifiedOnly = options.verifiedOnly;
    const unsubscribe = provider.onNewBlock(handleHead, evOpts);

    const stop: WatcherStopFn = () => {
      stopped = true;
      unsubscribe();
    };
    return stop;
  }

  // Fallback to polling mode
  let stopped = false;
  let lastBlock: bigint | null = null;
  let interval: NodeJS.Timeout | null = null;

  const emitCurrent = async () => {
    const current = await client.getBlockNumber();
    onUpdate({ blockNumber: current });
    lastBlock = current;
  };

  await emitCurrent();

  interval = setInterval(async () => {
    if (stopped) return;
    try {
      const bn = await client.getBlockNumber();
      if (lastBlock === null || bn !== lastBlock) {
        lastBlock = bn;
        onUpdate({ blockNumber: bn });
      }
    } catch {
      // ignore polling errors
    }
  }, pollIntervalMs);

  const stop: WatcherStopFn = () => {
    stopped = true;
    if (interval) clearInterval(interval);
  };
  return stop;
};
