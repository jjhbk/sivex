/**
 * Example: Custom Agent with Additional Tools
 *
 * This demonstrates how to create an agent with custom tools
 * beyond the built-in set.
 *
 * Usage:
 *   AGENT_ID=agent-custom \
 *   AGENT_NAME=CustomBot \
 *   AGENT_PORT=3001 \
 *   pnpm dev
 *
 * Then import this file in main.ts:
 *   import './examples/custom-agent-setup';
 */

import { registerTool } from '../src/tool-manager';

// Example 1: Simple synchronous tool
registerTool({
  name: 'text-extraction',
  description: 'Extract key information from text',
  execute: async (input: string) => {
    const sentences = input.split('. ');
    const summary = sentences.slice(0, 2).join('. ');
    return `Extracted key info: ${summary}`;
  },
});

// Example 2: Tool with complex logic
registerTool({
  name: 'data-validation',
  description: 'Validate data quality and completeness',
  execute: async (input: string) => {
    try {
      const data = JSON.parse(input);
      const issues: string[] = [];

      // Validation rules
      if (!data.id) issues.push('Missing id field');
      if (!data.timestamp) issues.push('Missing timestamp field');
      if (!data.value && data.value !== 0) issues.push('Missing value field');

      if (issues.length === 0) {
        return 'Data validation: PASSED ✓';
      } else {
        return `Data validation: FAILED\nIssues:\n${issues.map(i => `- ${i}`).join('\n')}`;
      }
    } catch (err) {
      return 'Data validation: FAILED - Invalid JSON format';
    }
  },
});

// Example 3: Tool that makes external API calls
registerTool({
  name: 'weather-analysis',
  description: 'Analyze weather patterns and trends',
  execute: async (input: string) => {
    // In real implementation, call a weather API
    // For demo, return mock data
    const location = input || 'Unknown location';
    return `Weather Analysis for ${location}:
- Temperature: 72°F
- Conditions: Partly cloudy
- Trend: Warming trend expected
- Recommendation: Outdoor activities favorable`;
  },
});

// Example 4: Tool with rate limiting
let translationCount = 0;
const MAX_TRANSLATIONS_PER_HOUR = 100;

registerTool({
  name: 'language-processing',
  description: 'Process and analyze natural language',
  execute: async (input: string) => {
    translationCount++;

    if (translationCount > MAX_TRANSLATIONS_PER_HOUR) {
      return 'Error: Rate limit exceeded (max 100 per hour)';
    }

    const wordCount = input.split(' ').length;
    const charCount = input.length;

    return `Language Analysis:
- Word count: ${wordCount}
- Character count: ${charCount}
- Average word length: ${(charCount / wordCount).toFixed(2)}
- Estimated reading time: ${Math.ceil(wordCount / 200)} min`;
  },
});

// Example 5: External HTTP-based tool
// This tool delegates to an external service
import { registerExternalTool } from '../src/tool-manager';

async function setupExternalTools() {
  // Only register if external service is available
  try {
    // Check if ML service is running
    const response = await fetch('http://localhost:8000/health', {
      method: 'HEAD',
      signal: AbortSignal.timeout(2000),
    });

    if (response.ok) {
      await registerExternalTool(
        'ml-prediction',
        'Run machine learning predictions',
        'http://localhost:8000/predict',
      );
      console.log('[custom-agent] ML prediction tool registered');
    }
  } catch {
    console.log('[custom-agent] ML service not available, skipping ml-prediction tool');
  }
}

// Initialize external tools
setupExternalTools().catch(err => {
  console.warn('[custom-agent] Error setting up external tools:', err);
});

// Export for verification
export const customToolsLoaded = true;
