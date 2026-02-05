import { walletAddress } from './wallet';
import { registerAgent, connectSSE, sendHeartbeat, submitBid } from './registry-client';
import { evaluateBid } from './bidder';
import { runTask } from './task-runner';
import { AgentMcpServer } from './mcp-server';
import { getToolNames } from './tool-manager.js';

const AGENT_ID = process.env.AGENT_ID || 'agent-' + Date.now();
const AGENT_NAME = process.env.AGENT_NAME || 'UnnamedAgent';
const AGENT_PORT = Number(process.env.AGENT_PORT) || 3001;

// Get capabilities from tool manager (which includes built-in + registered tools)
// Fall back to environment variable if explicitly set
const AGENT_CAPABILITIES = process.env.AGENT_CAPABILITIES
  ? (process.env.AGENT_CAPABILITIES || 'general').split(',').map(c => c.trim())
  : getToolNames();

// Track assigned tasks to avoid re-bidding
const assignedTasks = new Set<string>();

async function main() {
  console.log(`[agent] Starting ${AGENT_NAME} (${AGENT_ID})`);
  console.log(`[agent] Capabilities: ${AGENT_CAPABILITIES.join(', ')}`);
  console.log(`[agent] Wallet: ${walletAddress}`);

  // 1. Start MCP server
  const mcpServer = new AgentMcpServer();
  await mcpServer.start();

  // 2. Register with registry
  const mcpEndpoint = `http://localhost:${AGENT_PORT}/mcp`;
  const registered = await registerAgent({
    id: AGENT_ID,
    name: AGENT_NAME,
    walletAddress,
    capabilities: AGENT_CAPABILITIES,
    mcpEndpoint,
  });
  console.log(`[agent] Registered with id: ${registered.id}`);

  // 3. Connect to SSE stream
  connectSSE((type, payload) => {
    handleEvent(type, payload);
  });

  // 4. Heartbeat loop (every 30s)
  setInterval(async () => {
    await sendHeartbeat(AGENT_ID);
  }, 30_000);

  console.log(`[agent] ${AGENT_NAME} ready, listening for tasks...`);
}

async function handleEvent(type: string, payload: unknown) {
  switch (type) {
    case 'task.created':
      await handleTaskCreated(payload as TaskCreatedPayload);
      break;
    case 'task.updated':
      await handleTaskUpdated(payload as TaskUpdatedPayload);
      break;
    default:
      break;
  }
}

interface TaskCreatedPayload {
  id: string;
  requiredCapabilities: string[];
  budget: string;
  status: string;
}

interface TaskUpdatedPayload {
  id: string;
  status: string;
  assignedAgentId?: string;
  title?: string;
  objective?: string;
  description?: string;
  successCriteria?: string;
  requiredCapabilities?: string[];
}

async function handleTaskCreated(task: TaskCreatedPayload) {
  if (task.status !== 'open' && task.status !== 'bidding') return;
  if (assignedTasks.has(task.id)) return;

  console.log(`[agent] New task available: ${task.id}`);

  const bid = evaluateBid(
    { id: task.id, requiredCapabilities: task.requiredCapabilities, budget: task.budget },
    AGENT_CAPABILITIES,
  );

  if (!bid) {
    console.log(`[agent] Cannot bid on task ${task.id} — missing capabilities`);
    return;
  }

  console.log(`[agent] Submitting bid for task ${task.id}: cost=${bid.proposedCost}, confidence=${bid.confidence}`);

  const result = await submitBid(task.id, {
    agentId: AGENT_ID,
    proposedCost: bid.proposedCost,
    confidence: bid.confidence,
    strategy: bid.strategy,
  });

  if ('error' in result) {
    console.error(`[agent] Bid failed: ${result.error}`);
  } else {
    console.log(`[agent] Bid submitted: id=${result.id}, score=${result.score}`);
  }
}

async function handleTaskUpdated(task: TaskUpdatedPayload) {
  // If we were assigned this task, execute it
  if (task.status === 'assigned' && task.assignedAgentId === AGENT_ID) {
    assignedTasks.add(task.id);

    console.log(`[agent] Assigned to task ${task.id}! Starting execution...`);

    try {
      await runTask(
        {
          id: task.id,
          title: task.title || '',
          objective: task.objective || '',
          description: task.description || '',
          successCriteria: task.successCriteria || '',
          assignedAgentId: AGENT_ID,
          requiredCapabilities: task.requiredCapabilities || [],
        },
        AGENT_ID,
        AGENT_CAPABILITIES,
      );
    } catch (err) {
      console.error(`[agent] Task execution failed:`, err);
    }
  }
}

main().catch(err => {
  console.error('[agent] Fatal:', err);
  process.exit(1);
});
