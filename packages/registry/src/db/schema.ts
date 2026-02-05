import { integer, text, real, sqliteTable } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const agents = sqliteTable('agents', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  walletAddress: text('wallet_address').notNull(),
  capabilities:  text('capabilities').notNull(),
  status:        text('status').notNull().default('idle'),
  mcpEndpoint:   text('mcp_endpoint').notNull(),
  registeredAt:  integer('registered_at').notNull().default(sql`(unixepoch() * 1000)`),
  heartbeatAt:   integer('heartbeat_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export const tasks = sqliteTable('tasks', {
  id:                   text('id').primaryKey(),
  title:                text('title').notNull(),
  objective:            text('objective').notNull(),
  description:          text('description').notNull(),
  requiredCapabilities: text('required_capabilities').notNull(),
  budget:               text('budget').notNull(),
  successCriteria:      text('success_criteria').notNull(),
  verificationMethod:   text('verification_method').notNull().default('human'),
  status:               text('status').notNull().default('open'),
  creatorWallet:        text('creator_wallet').notNull(),
  assignedAgentId:      text('assigned_agent_id'),
  result:               text('result'),
  createdAt:            integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt:            integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export const bids = sqliteTable('bids', {
  id:           text('id').primaryKey(),
  taskId:       text('task_id').notNull().references(() => tasks.id),
  agentId:      text('agent_id').notNull().references(() => agents.id),
  proposedCost: text('proposed_cost').notNull(),
  confidence:   real('confidence').notNull(),
  strategy:     text('strategy').notNull(),
  createdAt:    integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export const reputationScores = sqliteTable('reputation_scores', {
  agentId:     text('agent_id').primaryKey().references(() => agents.id),
  score:       real('score').notNull().default(100),
  lastUpdated: integer('last_updated').notNull().default(sql`(unixepoch() * 1000)`),
});

export const reputationEvents = sqliteTable('reputation_events', {
  id:         text('id').primaryKey(),
  agentId:    text('agent_id').notNull().references(() => agents.id),
  taskId:     text('task_id').notNull().references(() => tasks.id),
  type:       text('type').notNull(),
  scoreDelta: real('score_delta').notNull(),
  verifiedBy: text('verified_by').notNull(),
  timestamp:  integer('timestamp').notNull().default(sql`(unixepoch() * 1000)`),
});
