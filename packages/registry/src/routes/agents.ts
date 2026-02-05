import type { FastifyInstance } from 'fastify';
import { db, agents } from '../db/index';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CreateAgentInput } from '@sivex/core';
import { broadcastEvent } from '../sse';
import { getOrCreateScore } from '../services/reputation-service';

export function registerAgentRoutes(fastify: FastifyInstance) {
  // POST /agents — register a new agent (idempotent on id)
  fastify.post('/agents', async (request, reply) => {
    const parsed = CreateAgentInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const input = parsed.data;
    const id = input.id || uuidv4();
    const now = Date.now();

    // Idempotent: if agent exists, update heartbeat
    const existing = await db.select().from(agents).where(eq(agents.id, id)).get();
    if (existing) {
      await db.update(agents)
        .set({ heartbeatAt: now, status: 'idle' })
        .where(eq(agents.id, id));

      const updated = await db.select().from(agents).where(eq(agents.id, id)).get();
      return reply.status(200).send(serializeAgent(updated!));
    }

    await db.insert(agents).values({
      id,
      name: input.name,
      walletAddress: input.walletAddress,
      capabilities: JSON.stringify(input.capabilities),
      status: 'idle',
      mcpEndpoint: input.mcpEndpoint,
      registeredAt: now,
      heartbeatAt: now,
    });

    // Initialize reputation score
    await getOrCreateScore(id);

    const agent = await db.select().from(agents).where(eq(agents.id, id)).get();
    if (!agent) return reply.status(500).send({ error: 'Failed to create agent' });

    const serialized = serializeAgent(agent);
    broadcastEvent('agent.registered', serialized);

    return reply.status(201).send(serialized);
  });

  // GET /agents — list all agents
  fastify.get('/agents', async (_request, reply) => {
    const allAgents = await db.select().from(agents);
    return reply.send(allAgents.map(serializeAgent));
  });

  // GET /agents/:id — get single agent
  fastify.get('/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = await db.select().from(agents).where(eq(agents.id, id)).get();
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    return reply.send(serializeAgent(agent));
  });

  // PUT /agents/:id/heartbeat — update liveness
  fastify.put('/agents/:id/heartbeat', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = await db.select().from(agents).where(eq(agents.id, id)).get();
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });

    await db.update(agents)
      .set({ heartbeatAt: Date.now() })
      .where(eq(agents.id, id));

    return reply.status(200).send({ ok: true });
  });
}

function serializeAgent(agent: typeof agents.$inferSelect) {
  return {
    id: agent.id,
    name: agent.name,
    walletAddress: agent.walletAddress,
    capabilities: JSON.parse(agent.capabilities as string),
    status: agent.status,
    mcpEndpoint: agent.mcpEndpoint,
    registeredAt: agent.registeredAt,
    heartbeatAt: agent.heartbeatAt,
  };
}
