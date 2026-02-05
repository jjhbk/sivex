import type { ServerResponse } from 'node:http';

interface SSEClient {
  res: ServerResponse;
  id: string;
}

const clients = new Set<SSEClient>();

export function addSSEClient(res: ServerResponse, clientId: string) {
  const client: SSEClient = { res, id: clientId };
  clients.add(client);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send heartbeat comment to keep connection alive
  res.write(': heartbeat\n\n');

  // Handle client disconnect
  res.on('close', () => {
    clients.delete(client);
  });

  return client;
}

export function broadcastEvent(type: string, payload: unknown) {
  const data = JSON.stringify({ type, payload });
  const message = `event: ${type}\ndata: ${data}\n\n`;

  const dead = new Set<SSEClient>();

  for (const client of clients) {
    try {
      if (!client.res.writableEnded) {
        client.res.write(message);
      } else {
        dead.add(client);
      }
    } catch {
      dead.add(client);
    }
  }

  // Clean up dead connections
  for (const client of dead) {
    clients.delete(client);
  }
}

export function getConnectedClients(): number {
  return clients.size;
}
