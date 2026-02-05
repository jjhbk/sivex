import { db, bids, tasks } from '../db/index';
import { eq } from 'drizzle-orm';
import { getOrCreateScore } from './reputation-service';
import { broadcastEvent } from '../sse';
import { v4 as uuidv4 } from 'uuid';

const HIGH_BUDGET_THRESHOLD = 10_000_000_000_000_000_000n; // 10 ETH in wei
const MIN_REPUTATION_HIGH_BUDGET = 50;

export function scoreBid(
  proposedCost: bigint,
  budget: bigint,
  confidence: number,
  reputationScore: number,
): number {
  const costRatio = Number(proposedCost) / Number(budget);
  return reputationScore * confidence * (1 - costRatio);
}

export async function submitBid(
  taskId: string,
  agentId: string,
  proposedCost: string,
  confidence: number,
  strategy: string,
): Promise<{ id: string; score: number } | { error: string }> {
  // Load task
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { error: 'Task not found' };
  if (task.status !== 'open' && task.status !== 'bidding') return { error: 'Task is not accepting bids' };

  const budget = BigInt(task.budget);
  const cost = BigInt(proposedCost);

  // Cost must not exceed budget
  if (cost > budget) return { error: 'Proposed cost exceeds task budget' };

  // High-budget reputation threshold
  if (budget >= HIGH_BUDGET_THRESHOLD) {
    const { score } = await getOrCreateScore(agentId);
    if (score < MIN_REPUTATION_HIGH_BUDGET) {
      return { error: `Reputation score ${score} below minimum ${MIN_REPUTATION_HIGH_BUDGET} for high-value tasks` };
    }
  }

  const { score: repScore } = await getOrCreateScore(agentId);
  const bidScore = scoreBid(cost, budget, confidence, repScore);

  const bidId = uuidv4();
  const now = Date.now();

  await db.insert(bids).values({
    id: bidId,
    taskId,
    agentId,
    proposedCost,
    confidence,
    strategy,
    createdAt: now,
  });

  const bidPayload = {
    id: bidId,
    taskId,
    agentId,
    proposedCost,
    confidence,
    strategy,
    createdAt: now,
  };

  broadcastEvent('bid.submitted', bidPayload);

  return { id: bidId, score: bidScore };
}

export async function selectWinner(taskId: string): Promise<string | null> {
  const taskBids = await db.select().from(bids).where(eq(bids.taskId, taskId));
  if (taskBids.length === 0) return null;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return null;

  const budget = BigInt(task.budget);

  let bestBid: (typeof taskBids)[0] | null = null;
  let bestScore = -Infinity;

  for (const bid of taskBids) {
    const { score: repScore } = await getOrCreateScore(bid.agentId);
    const score = scoreBid(BigInt(bid.proposedCost), budget, bid.confidence, repScore);
    if (score > bestScore) {
      bestScore = score;
      bestBid = bid;
    }
  }

  return bestBid?.agentId ?? null;
}

export async function getBidsForTask(taskId: string) {
  return db.select().from(bids).where(eq(bids.taskId, taskId));
}
