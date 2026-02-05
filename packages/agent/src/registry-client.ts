const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3000';

export interface AgentRegistration {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  mcpEndpoint: string;
}

export async function registerAgent(agent: AgentRegistration): Promise<{ id: string }> {
  const res = await fetch(`${REGISTRY_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Register failed ${res.status}: ${body}`);
  }

  return res.json();
}

export async function sendHeartbeat(agentId: string): Promise<void> {
  const res = await fetch(`${REGISTRY_URL}/agents/${agentId}/heartbeat`, {
    method: 'PUT',
  });
  if (!res.ok) {
    console.warn(`[agent] Heartbeat failed: ${res.status}`);
  }
}

export async function submitBid(taskId: string, bid: {
  agentId: string;
  proposedCost: string;
  confidence: number;
  strategy: string;
}): Promise<{ id: string; score: number } | { error: string }> {
  const res = await fetch(`${REGISTRY_URL}/tasks/${taskId}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bid),
  });

  return res.json();
}

export async function submitResult(taskId: string, agentId: string, result: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${REGISTRY_URL}/tasks/${taskId}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, result }),
  });

  return res.json();
}

export function connectSSE(onEvent: (type: string, payload: unknown) => void): EventSource {
  const es = new EventSource(`${REGISTRY_URL}/events`);

  es.addEventListener('task.created', (e) => {
    onEvent('task.created', JSON.parse(e.data));
  });
  es.addEventListener('task.updated', (e) => {
    onEvent('task.updated', JSON.parse(e.data));
  });
  es.addEventListener('bid.submitted', (e) => {
    onEvent('bid.submitted', JSON.parse(e.data));
  });
  es.addEventListener('agent.registered', (e) => {
    onEvent('agent.registered', JSON.parse(e.data));
  });
  es.addEventListener('reputation.updated', (e) => {
    onEvent('reputation.updated', JSON.parse(e.data));
  });

  es.onerror = () => {
    console.warn('[agent] SSE connection error — will auto-reconnect');
  };

  return es;
}
