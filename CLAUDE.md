# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Sivex Is

An agentic market coordination layer: autonomous AI agents discover tasks via SSE, bid, get assigned, execute, submit results, and get paid through an on-chain escrow. The registry is the central authority (trusted oracle for settlement in v1). Humans supervise via a Next.js dashboard.

## Monorepo Layout

pnpm workspaces + Turborepo. Build order is enforced by `turbo.json` (`^build` = build deps first): `core` → `escrow` → `registry` + `agent` → `dashboard`.

| Package | Role | Port |
|---|---|---|
| `packages/core` | Shared TS types + Zod schemas. Zero runtime deps except `zod`. Consumed by everything. | — |
| `packages/registry` | Fastify API server. SQLite via Drizzle + better-sqlite3. SSE broadcaster. Reputation engine. Calls escrow contract for settlement. | 3000 |
| `packages/agent` | Agent runtime. MCP server (StreamableHTTP). Registers with registry, listens on SSE, auto-bids, auto-executes on assignment. | 3001+ |
| `packages/escrow` | Solidity contract (`TaskEscrow.sol`) + viem client + deploy script. | — (targets Anvil :8545) |
| `packages/dashboard` | Next.js 14 App Router. Dark-themed Tailwind UI. Consumes registry REST + SSE. | 3100 |

## Commands

```bash
# Install
pnpm install

# Build all (respects dep order via turbo)
pnpm build

# Run individual packages in dev (tsx, no compile step)
cd packages/registry   && pnpm dev    # starts Fastify on :3000
cd packages/agent      && pnpm dev    # starts one agent (env-configured)
cd packages/dashboard  && pnpm dev    # starts Next.js on :3100

# Start compiled versions
cd packages/registry   && pnpm start  # node dist/main.js
cd packages/agent      && pnpm start

# Anvil local chain (prerequisite for escrow interaction)
docker compose up -d

# Escrow contract
cd packages/escrow && pnpm compile   # forge compile (needs foundry installed)
cd packages/escrow && pnpm deploy    # deploys to Anvil, writes deploy.json

# Registry DB migration (drizzle-kit)
cd packages/registry && pnpm db:migrate
```

## Running Multiple Agents

Each agent instance is the same binary, differentiated entirely by environment variables. Run two agents in separate terminals:

```bash
# Terminal 1
AGENT_ID=agent-1 AGENT_NAME=ResearchBot AGENT_PORT=3001 AGENT_CAPABILITIES=research,summarization AGENT_PRIVATE_KEY=0x59c6... pnpm --filter @sivex/agent dev

# Terminal 2
AGENT_ID=agent-2 AGENT_NAME=CodeBot AGENT_PORT=3002 AGENT_CAPABILITIES=code_review,summarization AGENT_PRIVATE_KEY=0xac09... pnpm --filter @sivex/agent dev
```

## Key Architecture Details

### Data flow (one task, end to end)
1. POST `/tasks` → registry creates task row, broadcasts `task.created` on SSE
2. All connected agents receive SSE event, capability-gate in `bidder.ts`, POST `/tasks/:id/bids`
3. POST `/tasks/:id/assign` → `bid-service.selectWinner()` scores bids (reputation × confidence × (1 − costRatio)), registry calls escrow `assignTask()`, broadcasts `task.updated` with `status: assigned`
4. Assigned agent receives SSE update, `task-runner.ts` executes (v1: deterministic stub), PUTs result to `/tasks/:id/result`
5. Human reviews on dashboard or via PUT `/tasks/:id/verify` → registry calls escrow `completeTask()` or `failTask()`, records reputation events

### Registry internals
- **DB bootstrap**: `initDb()` in `db/index.ts` runs raw `CREATE TABLE IF NOT EXISTS` on startup. No migration files needed for dev. WAL mode + foreign keys enabled.
- **SSE**: `sse.ts` holds a `Set` of live `ServerResponse` objects. `broadcastEvent(type, payload)` is called from every service on state change. Dead connections are pruned on each write.
- **Settlement**: `settlement-service.ts` gracefully no-ops when `ESCROW_CONTRACT_ADDRESS` is unset. This lets the full task lifecycle run without Anvil during dev/test.
- **Reputation decay**: Applied lazily on read (not on a cron). `getOrCreateScore()` computes `score * (1 - 0.005)^daysSince` before returning.

### Agent internals
- `wallet.ts` throws at module load if `AGENT_PRIVATE_KEY` is missing — fail fast.
- `main.ts` bootstrap: MCP server start → register with registry → connect SSE → heartbeat interval. The SSE `EventSource` auto-reconnects on its own.
- `bidder.ts` is pure/synchronous — easy to replace with LLM-based estimation later. Current logic: bid 80% of budget, confidence = clamp(0.5 + 0.1 × extraCaps, 0, 0.95).
- `mcp-server.ts` registers each capability string as an MCP tool via `server.tool()`. Also exposes `list_capabilities` and `verify_result` meta-tools for peer agents to call.

### Escrow contract
- `registry` address is the trusted settlement oracle (set at deploy time via constructor). Only it can call `assignTask`, `completeTask`, `failTask`.
- Task IDs on-chain are `keccak256` of the UUID string (bytes32). `taskIdToBytes32()` in both `escrow/src/client.ts` and `registry/src/services/settlement-service.ts`.
- `artifacts/TaskEscrow.json` is a hand-maintained ABI file. If you recompile with `forge`, copy the ABI from `out/` into this file.

### Dashboard
- All pages are `'use client'` — they fetch data on mount and subscribe to SSE via the `useEvents` hook.
- `useEvents` auto-reconnects with a 3s delay on error. Components call `loadData()` inside the SSE callback to refresh.
- The API client lives in `src/api/client.ts`; all fetch calls go through typed wrapper functions there.
- No build-time data fetching (no `getServerSideProps` / `generateStaticParams`). Everything is client-side hydrated.

## Bigint Handling

`budget` and `proposedCost` are `bigint` in the TS types but stored as strings everywhere (DB columns, JSON payloads, Zod schemas). Convert with `BigInt(str)` when doing arithmetic, `.toString()` when persisting. The dashboard's `formatWei()` helper converts wei strings to ETH display.

## What's Not Yet Implemented

- **Phase 4 P2P delegation**: Each agent has an MCP server and the registry exposes `mcpEndpoint`, but `task-runner.ts` does not yet call other agents' tools to delegate subtasks. The plumbing is there; the orchestration loop is not.
- **Forge-compiled bytecode**: `deploy.ts` has a `0x` bytecode placeholder. Run `forge compile` and paste the bytecode from the forge output to get a real deployable contract.
- **Tests**: No test files exist yet. `vitest` is the intended runner (referenced in turbo.json).
