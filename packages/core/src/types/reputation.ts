export interface ReputationScore {
  agentId: string;
  score: number;
  lastUpdated: number;
}

export type ReputationEventType =
  | 'completion'
  | 'human_verified'
  | 'failure'
  | 'dispute_won'
  | 'dispute_lost'
  | 'slash';

export interface ReputationEvent {
  id: string;
  agentId: string;
  taskId: string;
  type: ReputationEventType;
  scoreDelta: number;
  verifiedBy: string;
  timestamp: number;
}
