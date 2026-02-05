import { submitResult, getAgentsByCapability } from './registry-client';
import { callPeerTool } from './mcp-client-simple';

export interface TaskAssignment {
  id: string;
  title: string;
  objective: string;
  description: string;
  successCriteria: string;
  assignedAgentId: string;
  requiredCapabilities?: string[];
}

interface DelegationResult {
  capability: string;
  agentId: string;
  agentName: string;
  success: boolean;
  result: string;
  error?: string;
}

async function delegateCapabilities(
  requiredCapabilities: string[],
  agentCapabilities: string[],
  task: TaskAssignment,
  requestingAgentId: string,
): Promise<DelegationResult[]> {
  const missingCapabilities = requiredCapabilities.filter(
    cap => !agentCapabilities.includes(cap),
  );

  if (missingCapabilities.length === 0) {
    return [];
  }

  console.log(
    `[agent] Task ${task.id} requires capabilities: ${missingCapabilities.join(', ')}`,
  );

  const delegationResults: DelegationResult[] = [];

  for (const capability of missingCapabilities) {
    console.log(`[agent] Discovering agents with capability: ${capability}`);

    const availableAgents = await getAgentsByCapability(capability);
    if (availableAgents.length === 0) {
      console.warn(
        `[agent] No agents available with capability: ${capability}`,
      );
      delegationResults.push({
        capability,
        agentId: '',
        agentName: '',
        success: false,
        result: '',
        error: 'No agents available',
      });
      continue;
    }

    // Pick first available agent (v1: no reputation weighting)
    const targetAgent = availableAgents[0];
    console.log(
      `[agent] Delegating ${capability} to ${targetAgent.name} (${targetAgent.id})`,
    );

    try {
      const delegationInput = JSON.stringify({
        taskId: task.id,
        taskTitle: task.title,
        taskObjective: task.objective,
        taskDescription: task.description,
        successCriteria: task.successCriteria,
        requestingAgent: requestingAgentId,
      });

      const toolResult = await callPeerTool(
        targetAgent.mcpEndpoint,
        capability,
        delegationInput,
        30_000,
      );

      if (toolResult.success) {
        console.log(
          `[agent] Delegation successful: ${capability} completed by ${targetAgent.name}`,
        );
        delegationResults.push({
          capability,
          agentId: targetAgent.id,
          agentName: targetAgent.name,
          success: true,
          result: toolResult.content,
        });
      } else {
        console.warn(
          `[agent] Delegation failed: ${capability} from ${targetAgent.name}: ${toolResult.error}`,
        );
        delegationResults.push({
          capability,
          agentId: targetAgent.id,
          agentName: targetAgent.name,
          success: false,
          result: '',
          error: toolResult.error,
        });
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : String(err);
      console.error(
        `[agent] Error delegating ${capability}: ${errorMsg}`,
      );
      delegationResults.push({
        capability,
        agentId: '',
        agentName: '',
        success: false,
        result: '',
        error: errorMsg,
      });
    }
  }

  return delegationResults;
}

function buildAggregatedResult(
  task: TaskAssignment,
  ownResult: string,
  delegationResults: DelegationResult[],
): string {
  let aggregated = ownResult;

  if (delegationResults.length > 0) {
    aggregated += '\n\n--- Delegated Work ---\n';
    for (const delegation of delegationResults) {
      if (delegation.success) {
        aggregated +=
          `\n[${delegation.capability} by ${delegation.agentName}]\n${delegation.result}`;
      } else {
        aggregated +=
          `\n[${delegation.capability}] FAILED: ${delegation.error || 'Unknown error'}`;
      }
    }
  }

  return aggregated;
}

export async function runTask(
  task: TaskAssignment,
  agentId: string,
  agentCapabilities: string[] = [],
): Promise<string> {
  console.log(`[agent] Executing task: ${task.title} (${task.id})`);
  console.log(`[agent]   Objective: ${task.objective}`);
  console.log(`[agent]   Success Criteria: ${task.successCriteria}`);
  if (agentCapabilities.length > 0) {
    console.log(`[agent]   Agent Capabilities: ${agentCapabilities.join(', ')}`);
  }

  // v1: Deterministic stub execution.
  // In production, this would invoke an LLM or tool chain.
  const ownResult = `Task "${task.title}" completed.\n` +
    `Objective: ${task.objective}\n` +
    `Approach: Executed per success criteria: ${task.successCriteria}\n` +
    `Status: Done`;

  // Check if delegation is needed
  let delegationResults: DelegationResult[] = [];
  if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
    delegationResults = await delegateCapabilities(
      task.requiredCapabilities,
      agentCapabilities,
      task,
      agentId,
    );
  }

  // Aggregate results
  const result = buildAggregatedResult(task, ownResult, delegationResults);

  console.log(`[agent] Task ${task.id} execution complete, submitting result...`);

  const submitRes = await submitResult(task.id, agentId, result);
  if (!submitRes.ok) {
    console.error(`[agent] Failed to submit result: ${submitRes.error}`);
    throw new Error(submitRes.error || 'Result submission failed');
  }

  console.log(`[agent] Result submitted for task ${task.id}`);
  return result;
}
