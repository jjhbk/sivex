import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const clientCache = new Map<string, AgentMcpClient>();

export interface McpToolResult {
  success: boolean;
  content: string;
  error?: string;
}

export class AgentMcpClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;
  private agentId: string;
  private agentName: string;
  private connected = false;

  constructor(agentId: string, agentName: string, mcpEndpoint: string) {
    this.agentId = agentId;
    this.agentName = agentName;
    // StreamableHTTPClientTransport expects URL string and options separately
    this.transport = new StreamableHTTPClientTransport(
      mcpEndpoint,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
      }
    );
    this.client = new Client({
      name: 'sivex-agent',
      version: '0.1.0',
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      console.log(`[mcp-client] Connecting to ${this.agentName} at ${this.transport}`);
      await this.client.connect(this.transport);
      this.connected = true;
      console.log(`[mcp-client] Connected to ${this.agentName} (${this.agentId})`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[mcp-client] Failed to connect to ${this.agentName}: ${errorMsg}`,
      );
      console.error(`[mcp-client] Full error:`, err);
      throw err;
    }
  }

  async callTool(toolName: string, input: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<McpToolResult> {
    if (!this.connected) {
      try {
        await this.connect();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[mcp-client] Connection failed before tool call: ${errorMsg}`);
        return {
          success: false,
          content: '',
          error: `Connection failed: ${errorMsg}`,
        };
      }
    }

    try {
      console.log(`[mcp-client] Calling tool: ${toolName} on ${this.agentName}`);

      // Create a timeout promise
      const timeoutPromise = new Promise<McpToolResult>(() => {
        throw new Error(`Tool call timeout after ${timeoutMs}ms`);
      });

      const actualPromise = (async (): Promise<McpToolResult> => {
        try {
          const response = await this.client.callTool({
            name: toolName,
            arguments: { input },
          });

          // Extract text content from response
          const textContent = (response.content as any)
            .filter((c: any)=> c.type === 'text')
            .map((c: any) => (c as any).text)
            .join('\n');

          if (response.isError) {
            return {
              success: false,
              content: textContent,
              error: `Tool returned error: ${textContent}`,
            };
          }

          return {
            success: true,
            content: textContent,
          };
        } catch (toolErr) {
          const toolErrorMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
          console.error(`[mcp-client] Tool execution error: ${toolErrorMsg}`);
          throw toolErr;
        }
      })();

      // Race the actual call against the timeout
      return await Promise.race([actualPromise, timeoutPromise]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[mcp-client] Tool call failed for ${toolName}: ${errorMsg}`);
      return {
        success: false,
        content: '',
        error: errorMsg,
      };
    }
  }

  async close(): Promise<void> {
    if (this.connected) {
      try {
        await this.client.close();
        this.connected = false;
        console.log(`[mcp-client] Closed connection to ${this.agentName}`);
      } catch (err) {
        console.warn(
          `[mcp-client] Error closing connection: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}

export async function getOrCreateClient(
  agentId: string,
  agentName: string,
  mcpEndpoint: string,
): Promise<AgentMcpClient> {
  const key = agentId;

  if (clientCache.has(key)) {
    const client = clientCache.get(key)!;
    try {
      // Verify connection is still alive
      await client.callTool('list_capabilities', '', 5_000);
      return client;
    } catch {
      // Connection is dead, remove from cache
      clientCache.delete(key);
      console.log(`[mcp-client] Removed stale client for ${agentId}`);
    }
  }

  const newClient = new AgentMcpClient(agentId, agentName, mcpEndpoint);
  await newClient.connect();
  clientCache.set(key, newClient);

  return newClient;
}

export async function closeAllClients(): Promise<void> {
  const closePromises = Array.from(clientCache.values()).map(client => client.close());
  await Promise.all(closePromises);
  clientCache.clear();
  console.log('[mcp-client] Closed all agent connections');
}
