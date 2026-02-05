import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const AGENT_NAME = process.env.AGENT_NAME || 'UnnamedAgent';
const AGENT_PORT = Number(process.env.AGENT_PORT) || 3001;
const AGENT_CAPABILITIES = (process.env.AGENT_CAPABILITIES || 'general').split(',').map(c => c.trim());

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
    // Register each capability as an MCP tool
    for (const cap of AGENT_CAPABILITIES) {
      this.server.tool(
        cap,
        { input: z.string().describe('The input/prompt for this capability') },
        async ({ input }) => {
          console.log(`[mcp] Tool "${cap}" called with input: ${input}`);
          return {
            content: [{ type: 'text' as const, text: `[${cap}] Processed: ${input}` }],
          };
        },
      );
    }

    // Meta tool: list capabilities
    this.server.tool(
      'list_capabilities',
      { input: z.string().optional().describe('Unused') },
      async () => {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(AGENT_CAPABILITIES) }],
        };
      },
    );

    // Meta tool: verify subtask result
    this.server.tool(
      'verify_result',
      {
        result: z.string().describe('The result text to verify'),
        criteria: z.string().describe('The success criteria to check against'),
      },
      async ({ result, criteria }) => {
        console.log(`[mcp] Verifying result against criteria: ${criteria}`);
        const passed = result.length > 0;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ passed, criteria, resultLength: result.length }) }],
        };
      },
    );
  }

  async start(): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      port: AGENT_PORT,
      basePath: '/mcp',
    });

    await this.server.connect(transport);

    console.log(`[mcp] ${AGENT_NAME} MCP server listening on port ${AGENT_PORT}/mcp`);
  }
}
