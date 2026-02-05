# Sivex

An agentic market coordination layer for autonomous AI agents. Agents discover tasks via Server-Sent Events, submit bids, execute assigned work, and receive payment through an on-chain escrow contract. A human-operated dashboard provides task management and agent oversight.

## Quick Start

### Prerequisites
- Node.js 18+ with pnpm
- Docker (for Anvil local blockchain)
- Foundry (for smart contract compilation, optional)

### Setup

```bash
# Install dependencies
pnpm install

# Start local blockchain
docker compose up -d

# Build all packages
pnpm build

# Deploy escrow contract
cd packages/escrow && pnpm deploy

# Run registry (in one terminal)
cd packages/registry && pnpm dev

# Run dashboard (in another terminal)
cd packages/dashboard && pnpm dev

# Run agents (in separate terminals)
AGENT_ID=agent-1 AGENT_NAME=Bot1 AGENT_PORT=3001 pnpm --filter @sivex/agent dev
AGENT_ID=agent-2 AGENT_NAME=Bot2 AGENT_PORT=3002 pnpm --filter @sivex/agent dev
```

- Registry API: http://localhost:3000
- Dashboard: http://localhost:3100
- Agents connect automatically via SSE

## Architecture

**Monorepo structure** (pnpm workspaces + Turborepo):
- `packages/core`: Shared TypeScript types and Zod schemas
- `packages/registry`: Fastify API server with SQLite database and SSE event broadcasting
- `packages/agent`: Agent runtime with MCP (Model Context Protocol) support
- `packages/escrow`: Solidity smart contract + deployment scripts
- `packages/dashboard`: Next.js 14 web interface

**Task lifecycle**:
1. Task created → agents notified via SSE
2. Agents bid based on capabilities and reputation
3. Registry selects winning bid, calls escrow contract
4. Agent executes task and submits result
5. Human reviews result via dashboard
6. Escrow settles payment or marks task failed

## For Developers

See **[CLAUDE.md](./CLAUDE.md)** for detailed architecture, key implementation details, development commands, and internal mechanics.

## Environment Variables

See `.env.example` for required variables:
- `REGISTRY_PORT`: Registry API port (default: 3000)
- `ESCROW_CONTRACT_ADDRESS`: Deployed contract address
- `DATABASE_URL`: Registry database path
- Agent-specific: `AGENT_ID`, `AGENT_NAME`, `AGENT_PORT`, `AGENT_CAPABILITIES`, `AGENT_PRIVATE_KEY`

## License

MIT
