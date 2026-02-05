import Fastify from 'fastify';
import { initDb } from './db/index';
import { registerAgentRoutes } from './routes/agents';
import { registerTaskRoutes } from './routes/tasks';
import { registerReputationRoutes } from './routes/reputation';
import { registerEventRoutes } from './routes/events';
import { registerToolRoutes } from './routes/tools';

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

// Health check
fastify.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: Date.now() });
});

// Register routes
registerAgentRoutes(fastify);
registerTaskRoutes(fastify);
registerReputationRoutes(fastify);
registerEventRoutes(fastify);
registerToolRoutes(fastify);

// Start server with async initialization
async function start() {
  // Initialize database first
  await initDb();
  console.log('[registry] Database initialized');

  // Then start server
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[registry] Sivex Registry running on port ${PORT}`);
  } catch (err) {
    console.error('[registry] Failed to start:', err);
    process.exit(1);
  }
}

start();

export default fastify;
