import { db, reputationScores, reputationEvents } from '../db/index';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from '../sse';
import type { ReputationEventType } from '@sivex/core';

const COLD_START_SCORE = 100;
const DECAY_RATE_PER_DAY = 0.005; // 0.5% per day
const MS_PER_DAY = 86400000;

const DELTA_MAP: Record<ReputationEventType, number> = {
  completion: 10,
  human_verified: 15,
  failure: -25,
  dispute_won: 5,
  dispute_lost: -30,
  slash: -25,
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function applyDecay(score: number, lastUpdated: number): number {
  const now = Date.now();
  const daysSince = (now - lastUpdated) / MS_PER_DAY;
  const decayed = score * Math.pow(1 - DECAY_RATE_PER_DAY, daysSince);
  return clamp(decayed, 0, 1000);
}

export async function getOrCreateScore(agentId: string): Promise<{ score: number; lastUpdated: number }> {
  const row = await db.select().from(reputationScores).where(eq(reputationScores.agentId, agentId)).get();

  if (!row) {
    const now = Date.now();
    await db.insert(reputationScores).values({
      agentId,
      score: COLD_START_SCORE,
      lastUpdated: now,
    });
    return { score: COLD_START_SCORE, lastUpdated: now };
  }

  // Apply lazy decay
  const decayedScore = applyDecay(row.score, row.lastUpdated);
  const now = Date.now();
  if (decayedScore !== row.score) {
    await db.update(reputationScores)
      .set({ score: decayedScore, lastUpdated: now })
      .where(eq(reputationScores.agentId, agentId));
  }

  return { score: decayedScore, lastUpdated: now };
}

export async function recordEvent(
  agentId: string,
  taskId: string,
  type: ReputationEventType,
  verifiedBy: string,
  budgetWei?: string,
  avgBudgetWei?: string,
): Promise<{ newScore: number; delta: number }> {
  const { score } = await getOrCreateScore(agentId);

  let delta = DELTA_MAP[type];

  // Scale completion bonus by budget ratio, capped at +30
  if (type === 'completion' && budgetWei && avgBudgetWei) {
    const budget = Number(BigInt(budgetWei));
    const avg = Number(BigInt(avgBudgetWei));
    if (avg > 0) {
      delta = Math.min(30, Math.round(10 * (budget / avg)));
    }
  }

  const newScore = clamp(score + delta, 0, 1000);
  const now = Date.now();

  await db.update(reputationScores)
    .set({ score: newScore, lastUpdated: now })
    .where(eq(reputationScores.agentId, agentId));

  await db.insert(reputationEvents).values({
    id: uuidv4(),
    agentId,
    taskId,
    type,
    scoreDelta: delta,
    verifiedBy,
    timestamp: now,
  });

  broadcastEvent('reputation.updated', { agentId, score: newScore });

  return { newScore, delta };
}

export async function getReputationHistory(agentId: string) {
  const { score } = await getOrCreateScore(agentId);
  const events = await db.select().from(reputationEvents)
    .where(eq(reputationEvents.agentId, agentId))
    .orderBy(reputationEvents.timestamp);

  return { score, events };
}
