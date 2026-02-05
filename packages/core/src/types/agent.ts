export type AgentStatus = 'idle' | 'busy' | 'offline';

export interface AgentIdentity {
  id: string;
  name: string;
  walletAddress: string;
  capabilities: string[];
  status: AgentStatus;
  mcpEndpoint: string;
  registeredAt: number;
  heartbeatAt: number;
}
