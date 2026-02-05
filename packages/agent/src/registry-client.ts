import { EventSource } from 'undici';

const REGISTRY_URL = process.env.REGISTRY_URL ?? 'http://localhost:3000';

export interface AgentRegistration {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  mcpEndpoint: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

export async function registerAgent(
  agent: AgentRegistration,
): Promise<{ id: string }> {
  const res = await fetch(`${REGISTRY_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Register failed ${res.status}: ${body}`);
  }

  return parseJson<{ id: string }>(res);
}

export async function sendHeartbeat(agentId: string): Promise<void> {
  const res = await fetch(
    `${REGISTRY_URL}/agents/${agentId}/heartbeat`,
    { method: 'PUT' },
  );

  if (!res.ok) {
    console.warn(`[agent] Heartbeat failed: ${res.status}`);
  }
}

export async function submitBid(
  taskId: string,
  bid: {
    agentId: string;
    proposedCost: string;
    confidence: number;
    strategy: string;
  },
): Promise<{ id: string; score: number } | { error: string }> {
  const res = await fetch(
    `${REGISTRY_URL}/tasks/${taskId}/bids`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bid),
    },
  );

  return parseJson(res);
}

export async function submitResult(
  taskId: string,
  agentId: string,
  result: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(
    `${REGISTRY_URL}/tasks/${taskId}/result`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, result }),
    },
  );

  return parseJson(res);
}

export function connectSSE(
  onEvent: (type: string, payload: unknown) => void,
): EventSource {
  const es = new EventSource(`${REGISTRY_URL}/events`);

const bind = (type: string) =>
  es.addEventListener(type, (e: Event) => {
    try {
      const me = e as MessageEvent;
      onEvent(type, JSON.parse(me.data));
    } catch {
      console.warn(`[agent] Failed to parse SSE payload for ${type}`);
    }
  });


  bind('task.created');
  bind('task.updated');
  bind('bid.submitted');
  bind('agent.registered');
  bind('reputation.updated');

  es.onerror = () => {
    console.warn('[agent] SSE connection error — will auto-reconnect');
  };

  return es;
}
