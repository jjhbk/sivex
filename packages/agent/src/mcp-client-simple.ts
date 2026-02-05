// Simple HTTP-based MCP client for peer-to-peer delegation
// Bypasses the StreamableHTTPClientTransport which has compatibility issues

export interface McpToolResult {
  success: boolean;
  content: string;
  error?: string;
}

export async function callPeerTool(
  endpoint: string,
  toolName: string,
  input: string,
  timeoutMs: number = 30_000,
): Promise<McpToolResult> {
  try {
    console.log(`[mcp-http] Calling ${toolName} on peer at ${endpoint}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.random().toString(36).slice(2, 11),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: { input },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text();
        console.error(`[mcp-http] HTTP ${response.status}: ${body}`);
        return {
          success: false,
          content: '',
          error: `HTTP ${response.status}: ${body}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('text/event-stream')) {
        // Parse SSE response format
        const text = await response.text();
        const lines = text.split('\n');
        let jsonStr = '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            jsonStr = line.substring(6);
            break;
          }
        }

        if (!jsonStr) {
          throw new Error('No data in SSE response');
        }

        data = JSON.parse(jsonStr);
      } else {
        // Regular JSON response
        data = await response.json();
      }

      // Handle JSON-RPC error response
      if (data.error) {
        console.warn(`[mcp-http] Tool error: ${data.error.message}`);
        return {
          success: false,
          content: '',
          error: data.error.message,
        };
      }

      // Extract result
      if (data.result && data.result.content) {
        const textContent = data.result.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');

        return {
          success: !data.result.isError,
          content: textContent,
          error: data.result.isError ? 'Tool returned error' : undefined,
        };
      }

      return {
        success: false,
        content: '',
        error: 'Invalid response format',
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          content: '',
          error: `Timeout after ${timeoutMs}ms`,
        };
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[mcp-http] Request failed: ${errorMsg}`);
      return {
        success: false,
        content: '',
        error: errorMsg,
      };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[mcp-http] Unexpected error: ${errorMsg}`);
    return {
      success: false,
      content: '',
      error: errorMsg,
    };
  }
}
