import type { FastifyInstance } from 'fastify';
import { addSSEClient } from '../sse';
import { v4 as uuidv4 } from 'uuid';

export function registerEventRoutes(fastify: FastifyInstance) {
  // GET /events — SSE stream
  fastify.get('/events', async (request, reply) => {
    const clientId = uuidv4();
    addSSEClient(reply.raw, clientId);

    // Send initial connection event
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    // Keep the connection open — Fastify won't auto-close it.
    // The response stays open until the client disconnects.
    return new Promise<void>(() => {
      // Never resolve — connection stays open
    });
  });
}
