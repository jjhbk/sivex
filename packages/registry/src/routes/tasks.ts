import type { FastifyInstance } from 'fastify';
import { CreateTaskInput, CreateBidInput, SubmitResultInput, VerifyTaskInput } from '@sivex/core';
import { createTask, getTask, getTasks, assignTask, submitResult, verifyTask, disputeTask } from '../services/task-service';
import { submitBid, getBidsForTask } from '../services/bid-service';

export function registerTaskRoutes(fastify: FastifyInstance) {
  // POST /tasks — create a new task
  fastify.post('/tasks', async (request, reply) => {
    const parsed = CreateTaskInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    try {
      const task = await createTask(parsed.data);
      return reply.status(201).send({
        ...task,
        requiredCapabilities: JSON.parse(task.requiredCapabilities as string),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // GET /tasks — list tasks (filterable)
  fastify.get('/tasks', async (request, reply) => {
    const query = request.query as { status?: string; capabilities?: string };
    const tasks = await getTasks(query);
    return reply.send(tasks);
  });

  // GET /tasks/:id — get task detail with bids
  fastify.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await getTask(id);
    if (!task) return reply.status(404).send({ error: 'Task not found' });

    const bids = await getBidsForTask(id);
    return reply.send({ ...task, bids });
  });

  // POST /tasks/:id/bids — agent submits a bid
  fastify.post('/tasks/:id/bids', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = CreateBidInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const result = await submitBid(
      id,
      parsed.data.agentId,
      parsed.data.proposedCost,
      parsed.data.confidence,
      parsed.data.strategy,
    );

    if ('error' in result) {
      return reply.status(400).send(result);
    }

    return reply.status(201).send(result);
  });

  // POST /tasks/:id/assign — trigger bid selection + assignment
  fastify.post('/tasks/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await assignTask(id);

    if ('error' in result) {
      return reply.status(400).send(result);
    }

    return reply.status(200).send(result);
  });

  // PUT /tasks/:id/result — agent submits execution result
  fastify.put('/tasks/:id/result', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = SubmitResultInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const result = await submitResult(id, parsed.data.agentId, parsed.data.result);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ ok: true });
  });

  // PUT /tasks/:id/verify — human approves or rejects
  fastify.put('/tasks/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = VerifyTaskInput.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const result = await verifyTask(id, parsed.data.approved, parsed.data.reviewedBy);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ ok: true });
  });

  // PUT /tasks/:id/dispute — flag task for human review
  fastify.put('/tasks/:id/dispute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await disputeTask(id);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ ok: true });
  });
}
