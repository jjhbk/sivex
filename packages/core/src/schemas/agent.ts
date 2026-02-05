import { z } from 'zod';

export const CreateAgentInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  capabilities: z.array(z.string().min(1)).min(1),
  mcpEndpoint: z.string().url(),
});

export const HeartbeatInput = z.object({
  id: z.string(),
});

export type CreateAgentInputType = z.infer<typeof CreateAgentInput>;
export type HeartbeatInputType = z.infer<typeof HeartbeatInput>;
