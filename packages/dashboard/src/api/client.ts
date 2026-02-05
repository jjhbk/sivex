const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3000';

export interface ApiAgent {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  status: string;
  mcpEndpoint: string;
  registeredAt: number;
  heartbeatAt: number;
}

export interface ApiTask {
  id: string;
  title: string;
  objective: string;
  description: string;
  requiredCapabilities: string[];
  budget: string;
  successCriteria: string;
  verificationMethod: string;
  status: string;
  creatorWallet: string;
  assignedAgentId: string | null;
  result: string | null;
  createdAt: number;
  updatedAt: number;
  bids?: ApiBid[];
}

export interface ApiBid {
  id: string;
  taskId: string;
  agentId: string;
  proposedCost: string;
  confidence: number;
  strategy: string;
  createdAt: number;
}

export interface ApiReputation {
  agentId: string;
  score: number;
  events: Array<{
    id: string;
    agentId: string;
    taskId: string;
    type: string;
    scoreDelta: number;
    verifiedBy: string;
    timestamp: number;
  }>;
}

// --- Agents ---
export async function fetchAgents(): Promise<ApiAgent[]> {
  const res = await fetch(`${REGISTRY_URL}/agents`);
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  return res.json();
}

export async function fetchAgent(id: string): Promise<ApiAgent> {
  const res = await fetch(`${REGISTRY_URL}/agents/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch agent: ${res.status}`);
  return res.json();
}

// --- Tasks ---
export async function fetchTasks(filters?: { status?: string; capabilities?: string }): Promise<ApiTask[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.capabilities) params.set('capabilities', filters.capabilities);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${REGISTRY_URL}/tasks${query}`);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  return res.json();
}

export async function fetchTask(id: string): Promise<ApiTask> {
  const res = await fetch(`${REGISTRY_URL}/tasks/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.status}`);
  return res.json();
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
}): Promise<ApiTask> {
  const res = await fetch(`${REGISTRY_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create task: ${body}`);
  }
  return res.json();
}

export async function assignTask(id: string): Promise<{ agentId: string }> {
  const res = await fetch(`${REGISTRY_URL}/tasks/${id}/assign`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to assign task: ${body}`);
  }
  return res.json();
}

export async function verifyTask(id: string, approved: boolean): Promise<void> {
  const res = await fetch(`${REGISTRY_URL}/tasks/${id}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, reviewedBy: 'human' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to verify task: ${body}`);
  }
}

export async function disputeTask(id: string): Promise<void> {
  const res = await fetch(`${REGISTRY_URL}/tasks/${id}/dispute`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to dispute task: ${body}`);
  }
}

// --- Reputation ---
export async function fetchReputation(agentId: string): Promise<ApiReputation> {
  const res = await fetch(`${REGISTRY_URL}/reputation/${agentId}`);
  if (!res.ok) throw new Error(`Failed to fetch reputation: ${res.status}`);
  return res.json();
}
