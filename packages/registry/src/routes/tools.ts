import type { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { sql } from 'drizzle-orm';

// Register tools route for agents to register custom tools/capabilities
export function registerToolRoutes(fastify: FastifyInstance) {
  // POST /tools/register — agent registers a new tool/capability
  fastify.post<{ Body: { agentId: string; toolName: string; description: string; inputSchema?: object } }>(
    '/tools/register',
    async (request, reply) => {
      const { agentId, toolName, description, inputSchema } = request.body;

      if (!agentId || !toolName || !description) {
        return reply.status(400).send({ error: 'agentId, toolName, and description required' });
      }

      try {
        // Store tool registration in a JSON field or separate table
        // For now, we'll just return success
        // In production, you'd store this in the database
        console.log(`[tools] Agent ${agentId} registered tool: ${toolName}`);

        return reply.status(201).send({
          success: true,
          agentId,
          toolName,
          message: 'Tool registered successfully',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ error: message });
      }
    },
  );

  // GET /tools — list all available tools/capabilities across all agents
  fastify.get('/tools', async (request, reply) => {
    // This would return all registered tools
    // For now, return a sample response
    return reply.send({
      tools: [
        {
          name: 'research',
          agents: ['agent-1'],
          description: 'Research capability',
        },
        {
          name: 'data-analysis',
          agents: ['agent-b'],
          description: 'Data analysis capability',
        },
      ],
    });
  });

  // GET /agents/:agentId/tools — list tools for a specific agent
  fastify.get<{ Params: { agentId: string } }>('/agents/:agentId/tools', async (request, reply) => {
    const { agentId } = request.params;

    return reply.send({
      agentId,
      tools: [
        // Would be populated from registered tools
        { name: 'research', description: 'Research capability' },
      ],
    });
  });
}
