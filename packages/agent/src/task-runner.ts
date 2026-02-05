import { submitResult } from './registry-client';

export interface TaskAssignment {
  id: string;
  title: string;
  objective: string;
  description: string;
  successCriteria: string;
  assignedAgentId: string;
}

export async function runTask(task: TaskAssignment, agentId: string): Promise<string> {
  console.log(`[agent] Executing task: ${task.title} (${task.id})`);
  console.log(`[agent]   Objective: ${task.objective}`);
  console.log(`[agent]   Success Criteria: ${task.successCriteria}`);

  // v1: Deterministic stub execution.
  // In production, this would invoke an LLM or tool chain.
  const result = `Task "${task.title}" completed.\n` +
    `Objective: ${task.objective}\n` +
    `Approach: Executed per success criteria: ${task.successCriteria}\n` +
    `Status: Done`;

  console.log(`[agent] Task ${task.id} execution complete, submitting result...`);

  const submitRes = await submitResult(task.id, agentId, result);
  if (!submitRes.ok) {
    console.error(`[agent] Failed to submit result: ${submitRes.error}`);
    throw new Error(submitRes.error || 'Result submission failed');
  }

  console.log(`[agent] Result submitted for task ${task.id}`);
  return result;
}
