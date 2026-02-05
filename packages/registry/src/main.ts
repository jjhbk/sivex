import Fastify from 'fastify';
import { initDb } from './db/index';
import { registerAgentRoutes } from './routes/agents';
import { registerTaskRoutes } from './routes/tasks';
import { registerReputationRoutes } from './routes/reputation';
import { registerEventRoutes } from './routes/events';

const PORT = Number(process.env.REGISTRY_PORT) || 3000;

const fastify = Fastify({ logger: true });

// CORS — allow all origins for local dev
fastify.addHook('onRequest', async (_request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
});

// Handle OPTIONS preflight
fastify.options('/*', async (_request, reply) => {
  return reply.status(200).send();
});

// Initialize database
initDb();

// Register routes
registerAgentRoutes(fastify);
registerTaskRoutes(fastify);
registerReputationRoutes(fastify);
registerEventRoutes(fastify);

// Health check
fastify.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: Date.now() });
});

// Start
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`[registry] Sivex Registry running on port ${PORT}`);
});

export default fastify;
