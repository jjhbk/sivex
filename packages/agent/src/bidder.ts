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
  // Soft gate: agent must have at least one required capability
  // (can delegate missing capabilities with Phase 4 P2P delegation)
  const matchedCapabilities = task.requiredCapabilities.filter(cap => agentCapabilities.includes(cap));
  if (matchedCapabilities.length === 0) return null;

  const budget = BigInt(task.budget);

  // Bid 80% of budget
  const proposedCost = (budget * 80n) / 100n;

  // Confidence: base 0.3, increases with capability match ratio
  // Full match (100%) → 0.8, Half match (50%) → 0.55, One match (1 of many) → lower
  const capabilityRatio = matchedCapabilities.length / task.requiredCapabilities.length;
  const baseConfidence = 0.3 + 0.5 * capabilityRatio; // Range: 0.3 to 0.8

  // Bonus for extra capabilities beyond required
  const extraCaps = agentCapabilities.filter(cap => !task.requiredCapabilities.includes(cap)).length;
  const confidence = clamp(baseConfidence + 0.05 * extraCaps, 0, 0.95);

  // Matched capabilities for strategy description
  const missingCaps = task.requiredCapabilities.filter(cap => !agentCapabilities.includes(cap));
  let strategy = `Will execute using: ${matchedCapabilities.join(', ')}`;
  if (missingCaps.length > 0) {
    strategy += `; Will delegate: ${missingCaps.join(', ')}`;
  }

  return {
    proposedCost: proposedCost.toString(),
    confidence,
    strategy,
  };
}
