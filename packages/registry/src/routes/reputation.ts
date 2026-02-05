import type { FastifyInstance } from 'fastify';
import { getReputationHistory } from '../services/reputation-service';

export function registerReputationRoutes(fastify: FastifyInstance) {
  // GET /reputation/:agentId — current score + event history
  fastify.get('/reputation/:agentId', async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const { score, events } = await getReputationHistory(agentId);
    return reply.send({ agentId, score, events });
  });
}
