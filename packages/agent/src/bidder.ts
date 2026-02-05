interface TaskInfo {
  id: string;
  requiredCapabilities: string[];
  budget: string; // wei as string
}

export interface BidResult {
  proposedCost: string;
  confidence: number;
  strategy: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function evaluateBid(task: TaskInfo, agentCapabilities: string[]): BidResult | null {
  // Hard gate: agent must have ALL required capabilities
  const hasAll = task.requiredCapabilities.every(cap => agentCapabilities.includes(cap));
  if (!hasAll) return null;

  const budget = BigInt(task.budget);

  // Bid 80% of budget
  const proposedCost = (budget * 80n) / 100n;

  // Confidence: 0.5 base + 0.1 per extra capability beyond required
  const extraCaps = agentCapabilities.filter(cap => !task.requiredCapabilities.includes(cap)).length;
  const confidence = clamp(0.5 + 0.1 * extraCaps, 0, 0.95);

  // Matched capabilities for strategy description
  const matched = agentCapabilities.filter(cap => task.requiredCapabilities.includes(cap));
  const strategy = `Will execute using capabilities: ${matched.join(', ')}`;

  return {
    proposedCost: proposedCost.toString(),
    confidence,
    strategy,
  };
}
