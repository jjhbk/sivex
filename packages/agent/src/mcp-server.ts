import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import http from 'node:http';

const AGENT_NAME = process.env.AGENT_NAME || 'UnnamedAgent';
const AGENT_PORT = Number(process.env.AGENT_PORT) || 3001;
const AGENT_CAPABILITIES = (process.env.AGENT_CAPABILITIES || 'general')
  .split(',')
  .map(c => c.trim());

export class AgentMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: AGENT_NAME,
      version: '0.1.0',
    });

    this.registerTools();
  }

  private registerTools() {
    for (const cap of AGENT_CAPABILITIES) {
      this.server.tool(
        cap,
        { input: z.string().describe('The input/prompt for this capability') },
        async ({ input }) => ({
          content: [
            { type: 'text' as const, text: `[${cap}] Processed: ${input}` },
          ],
        }),
      );
    }

    this.server.tool(
      'list_capabilities',
      { input: z.string().optional().describe('Unused') },
      async () => ({
        content: [
          { type: 'text' as const, text: JSON.stringify(AGENT_CAPABILITIES) },
        ],
      }),
    );

    this.server.tool(
      'verify_result',
      {
        result: z.string(),
        criteria: z.string(),
      },
      async ({ result, criteria }) => ({
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              passed: result.length > 0,
              criteria,
              resultLength: result.length,
            }),
          },
        ],
      }),
    );
  }

  async start(): Promise<void> {
    const transport = new StreamableHTTPServerTransport();

    await this.server.connect(transport);

    const server = http.createServer((req, res) => {
      // ✅ ROUTING BELONGS HERE (not in the transport)
      if (req.url?.startsWith('/mcp')) {
        transport.handleRequest(req, res);
        return;
      }

      res.statusCode = 404;
      res.end('Not found');
    });

    server.listen(AGENT_PORT, () => {
      console.log(
        `[mcp] ${AGENT_NAME} MCP server listening on http://localhost:${AGENT_PORT}/mcp`,
      );
    });
  }
}
