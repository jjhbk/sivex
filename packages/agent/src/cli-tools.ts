#!/usr/bin/env node

// CLI tool to add custom tools to an agent
// Usage: npx ts-node src/cli-tools.ts add <name> <description> [handlerUrl]

import { registerTool, registerExternalTool, getAllTools, getToolNames } from './tool-manager.js';

const command = process.argv[2];

async function main() {
  if (command === 'add') {
    const name = process.argv[3];
    const description = process.argv[4];
    const handlerUrl = process.argv[5];

    if (!name || !description) {
      console.error('Usage: cli-tools add <name> <description> [handlerUrl]');
      process.exit(1);
    }

    if (handlerUrl) {
      await registerExternalTool(name, description, handlerUrl);
      console.log(`✓ External tool registered: ${name}`);
    } else {
      registerTool({
        name,
        description,
        execute: async (input: string) => {
          return `Tool "${name}" executed with input: ${input}`;
        },
      });
      console.log(`✓ Tool registered: ${name}`);
    }
  } else if (command === 'list') {
    const tools = getAllTools();
    console.log(`\n${tools.length} tools registered:\n`);
    tools.forEach((tool) => {
      console.log(`  • ${tool.name} - ${tool.description}`);
    });
    console.log();
  } else if (command === 'export') {
    // Export capabilities as environment variable
    const capabilities = getToolNames().join(',');
    console.log(`\nSet this as AGENT_CAPABILITIES:\n`);
    console.log(`AGENT_CAPABILITIES="${capabilities}"\n`);
  } else {
    console.log(`
Agent Tool Manager CLI

Commands:
  add <name> <desc> [url]  - Add a new tool
  list                     - List all registered tools
  export                   - Export capabilities for env var

Examples:
  npx ts-node src/cli-tools.ts add sentiment-analysis "Analyze sentiment of text"
  npx ts-node src/cli-tools.ts list
`);
  }
}

main().catch(err => {
  console.error('[cli-tools] Error:', err);
  process.exit(1);
});
