import { db, tasks, agents } from '../db/index';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from '../sse';
import { selectWinner } from './bid-service';
import { settle } from './settlement-service';
import { recordEvent } from './reputation-service';
import type { TaskStatus } from '@sivex/core';

// Optional escrow support - imported lazily
async function getEscrowStatus(taskId: string) {
  try {
    const escrowModule = await import('@sivex/escrow/client');
    return await escrowModule.getTask(taskId);
  } catch {
    return null;
  }
}

export async function createTask(input: {
  title: string;
  objective: string;
  description: string;
  requiredCapabilities: string[];
  budget: string;
  successCriteria: string;
  verificationMethod: string;
  creatorWallet: string;
}): Promise<typeof tasks.$inferSelect> {
  const id = uuidv4();
  const now = Date.now();

  await db.insert(tasks).values({
    id,
    title: input.title,
    objective: input.objective,
    description: input.description,
    requiredCapabilities: JSON.stringify(input.requiredCapabilities),
    budget: input.budget,
    successCriteria: input.successCriteria,
    verificationMethod: input.verificationMethod,
    status: 'open',
    creatorWallet: input.creatorWallet,
    createdAt: now,
    updatedAt: now,
  });

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw new Error('Failed to insert task');

  broadcastEvent('task.created', serializeTask(task));
  return task;
}

export async function assignTask(taskId: string): Promise<{ agentId: string } | { error: string }> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { error: 'Task not found' };
  if (task.status !== 'open' && task.status !== 'bidding') return { error: 'Task not in biddable state' };

  const winnerId = await selectWinner(taskId);
  if (!winnerId) return { error: 'No bids to select from' };

  const agent = await db.select().from(agents).where(eq(agents.id, winnerId)).get();
  if (!agent) return { error: 'Winning agent not found' };

  // Call escrow assignTask
  const escrowResult = await settle('assign', taskId, agent.walletAddress);
  if (!escrowResult.ok) return { error: `Escrow assign failed: ${escrowResult.error}` };

  const now = Date.now();
  await db.update(tasks)
    .set({ status: 'assigned', assignedAgentId: winnerId, updatedAt: now })
    .where(eq(tasks.id, taskId));

  await db.update(agents)
    .set({ status: 'busy' })
    .where(eq(agents.id, winnerId));

  const updated = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  broadcastEvent('task.updated', updated ? serializeTask(updated) : null);

  return { agentId: winnerId };
}

export async function submitResult(taskId: string, agentId: string, result: string): Promise<{ ok: boolean; error?: string }> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { ok: false, error: 'Task not found' };
  if (task.status !== 'assigned') return { ok: false, error: 'Task is not in assigned state' };
  if (task.assignedAgentId !== agentId) return { ok: false, error: 'Not the assigned agent' };

  const now = Date.now();
  await db.update(tasks)
    .set({ status: 'pending_review', result, updatedAt: now })
    .where(eq(tasks.id, taskId));

  const updated = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  broadcastEvent('task.updated', updated ? serializeTask(updated) : null);

  return { ok: true };
}

export async function verifyTask(taskId: string, approved: boolean, reviewedBy: string): Promise<{ ok: boolean; error?: string }> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { ok: false, error: 'Task not found' };
  if (task.status !== 'pending_review') return { ok: false, error: 'Task is not pending review' };

  const assignedAgentId = task.assignedAgentId;
  if (!assignedAgentId) return { ok: false, error: 'No assigned agent' };

  const agent = await db.select().from(agents).where(eq(agents.id, assignedAgentId)).get();
  if (!agent) return { ok: false, error: 'Assigned agent not found' };

  const newStatus: TaskStatus = approved ? 'completed' : 'failed';
  const action = approved ? 'complete' : 'fail';

  const escrowResult = await settle(action, taskId, agent.walletAddress);
  if (!escrowResult.ok) return { ok: false, error: `Escrow ${action} failed: ${escrowResult.error}` };

  const now = Date.now();
  await db.update(tasks)
    .set({ status: newStatus, updatedAt: now })
    .where(eq(tasks.id, taskId));

  await db.update(agents)
    .set({ status: 'idle' })
    .where(eq(agents.id, assignedAgentId));

  // Record reputation events
  if (approved) {
    await recordEvent(assignedAgentId, taskId, 'completion', reviewedBy, task.budget);
    if (reviewedBy === 'human') {
      await recordEvent(assignedAgentId, taskId, 'human_verified', reviewedBy, task.budget);
    }
  } else {
    await recordEvent(assignedAgentId, taskId, 'failure', reviewedBy);
  }

  const updated = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  broadcastEvent('task.updated', updated ? serializeTask(updated) : null);

  return { ok: true };
}

export async function disputeTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { ok: false, error: 'Task not found' };
  if (task.status !== 'assigned' && task.status !== 'pending_review') {
    return { ok: false, error: 'Can only dispute assigned or pending_review tasks' };
  }

  const now = Date.now();
  await db.update(tasks)
    .set({ status: 'disputed', updatedAt: now })
    .where(eq(tasks.id, taskId));

  const updated = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  broadcastEvent('task.updated', updated ? serializeTask(updated) : null);

  return { ok: true };
}

function serializeTask(task: typeof tasks.$inferSelect) {
  return {
    ...task,
    requiredCapabilities: JSON.parse(task.requiredCapabilities as string),
  };
}

export async function getTask(taskId: string) {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return null;

  const serialized = serializeTask(task);

  // Fetch escrow status from blockchain if available
  const escrowTask = await getEscrowStatus(taskId);
  if (escrowTask) {
    (serialized as any).escrowStatus = {
      state: escrowTask.state,
      assignee: escrowTask.assignee,
      amount: escrowTask.amount.toString(),
    };
  }

  return serialized;
}

export async function getTasks(filters?: { status?: string; capabilities?: string }) {
  let query = db.select().from(tasks);

  if (filters?.status) {
    query = query.where(eq(tasks.status, filters.status));
  }

  const results = await query;

  let filtered = results.map(serializeTask);

  if (filters?.capabilities) {
    const requiredCaps = filters.capabilities.split(',').map(c => c.trim());
    filtered = filtered.filter(t =>
      requiredCaps.every(cap => (t.requiredCapabilities as string[]).includes(cap))
    );
  }

  // Add escrow status to all tasks (non-blocking)
  const withEscrow = await Promise.all(
    filtered.map(async (task) => {
      const escrowTask = await getEscrowStatus(task.id);
      if (escrowTask) {
        (task as any).escrowStatus = {
          state: escrowTask.state,
          assignee: escrowTask.assignee,
          amount: escrowTask.amount.toString(),
        };
      }
      return task;
    })
  );

  return withEscrow;
}
