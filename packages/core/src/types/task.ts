export type TaskStatus =
  | 'open'
  | 'bidding'
  | 'assigned'
  | 'executing'
  | 'pending_review'
  | 'completed'
  | 'failed'
  | 'disputed';

export type VerificationMethod = 'human' | 'peer' | 'automated';

export interface TaskContract {
  id: string;
  title: string;
  objective: string;
  description: string;
  requiredCapabilities: string[];
  budget: bigint;
  successCriteria: string;
  verificationMethod: VerificationMethod;
  status: TaskStatus;
  creatorWallet: string;
  assignedAgentId: string | null;
  result: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TaskBid {
  id: string;
  taskId: string;
  agentId: string;
  proposedCost: bigint;
  confidence: number;
  strategy: string;
  createdAt: number;
}
