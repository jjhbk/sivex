import { z } from 'zod';

export const CreateTaskInput = z.object({
  title: z.string().min(1).max(200),
  objective: z.string().min(1),
  description: z.string().min(1),
  requiredCapabilities: z.array(z.string().min(1)).min(1),
  budget: z.string().regex(/^[0-9]+$/),  // wei as string (bigint not JSON-safe)
  successCriteria: z.string().min(1),
  verificationMethod: z.enum(['human', 'peer', 'automated']).default('human'),
  creatorWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export const CreateBidInput = z.object({
  agentId: z.string(),
  proposedCost: z.string().regex(/^[0-9]+$/),  // wei as string
  confidence: z.number().min(0).max(1),
  strategy: z.string().min(1),
});

export const SubmitResultInput = z.object({
  agentId: z.string(),
  result: z.string().min(1),
});

export const VerifyTaskInput = z.object({
  approved: z.boolean(),
  reviewedBy: z.string().default('human'),
});

export type CreateTaskInputType = z.infer<typeof CreateTaskInput>;
export type CreateBidInputType = z.infer<typeof CreateBidInput>;
export type SubmitResultInputType = z.infer<typeof SubmitResultInput>;
export type VerifyTaskInputType = z.infer<typeof VerifyTaskInput>;
