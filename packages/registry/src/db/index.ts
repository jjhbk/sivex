import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.REGISTRY_DB_PATH
  ? path.resolve(process.cwd(), process.env.REGISTRY_DB_PATH)
  : path.resolve(__dirname, '../../registry.db');

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { logger: false });

// Bootstrap: create tables if they don't exist (no migration runner needed for dev)
import { agents, tasks, bids, reputationScores, reputationEvents } from './schema';

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      mcp_endpoint TEXT NOT NULL,
      registered_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      heartbeat_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      description TEXT NOT NULL,
      required_capabilities TEXT NOT NULL,
      budget TEXT NOT NULL,
      success_criteria TEXT NOT NULL,
      verification_method TEXT NOT NULL DEFAULT 'human',
      status TEXT NOT NULL DEFAULT 'open',
      creator_wallet TEXT NOT NULL,
      assigned_agent_id TEXT,
      result TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      agent_id TEXT NOT NULL REFERENCES agents(id),
      proposed_cost TEXT NOT NULL,
      confidence REAL NOT NULL,
      strategy TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS reputation_scores (
      agent_id TEXT PRIMARY KEY REFERENCES agents(id),
      score REAL NOT NULL DEFAULT 100,
      last_updated INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS reputation_events (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      task_id TEXT NOT NULL REFERENCES tasks(id),
      type TEXT NOT NULL,
      score_delta REAL NOT NULL,
      verified_by TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);
}

export { agents, tasks, bids, reputationScores, reputationEvents };
