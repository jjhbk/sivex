/**
 * Built-in Agent Functionalities
 *
 * Practical tools that agents can execute to accomplish real tasks.
 * These demonstrate the full range of capabilities the system supports.
 */

import { registerTool } from './tool-manager';

// ============================================================================
// DATA PROCESSING TOOLS
// ============================================================================

registerTool({
  name: 'data-aggregation',
  description: 'Aggregate and summarize multiple data sources into a single report',
  execute: async (input: string) => {
    try {
      const data = JSON.parse(input);
      const sources = data.sources || [];

      if (sources.length === 0) {
        return 'Error: No data sources provided';
      }

      const summary = {
        totalSources: sources.length,
        datapointsProcessed: sources.reduce((sum: number, s: any) => sum + (s.count || 0), 0),
        aggregatedAt: new Date().toISOString(),
        sources: sources.map((s: any) => ({
          name: s.name,
          count: s.count || 0,
          quality: s.quality || 'unknown',
        })),
      };

      return JSON.stringify(summary, null, 2);
    } catch {
      return 'Error: Invalid input format. Expected JSON with sources array';
    }
  },
});

registerTool({
  name: 'data-validation',
  description: 'Validate data quality, completeness, and format compliance',
  execute: async (input: string) => {
    try {
      const data = JSON.parse(input);
      const issues: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      if (!data.id) issues.push('Missing required field: id');
      if (!data.timestamp) warnings.push('Missing timestamp field');
      if (!data.value && data.value !== 0) issues.push('Missing or invalid value field');

      // Check data types
      if (data.timestamp && isNaN(new Date(data.timestamp).getTime())) {
        issues.push('Invalid timestamp format');
      }

      // Check value ranges
      if (typeof data.value === 'number') {
        if (data.value < 0) warnings.push('Value is negative');
        if (data.value > 1000000) warnings.push('Value exceeds typical range');
      }

      const result = {
        valid: issues.length === 0,
        issuesCount: issues.length,
        warningsCount: warnings.length,
        issues,
        warnings,
        checkedAt: new Date().toISOString(),
      };

      return JSON.stringify(result, null, 2);
    } catch (err) {
      return 'Error: Invalid JSON input';
    }
  },
});

// ============================================================================
// TEXT ANALYSIS TOOLS
// ============================================================================

registerTool({
  name: 'text-analysis',
  description: 'Analyze text for sentiment, keywords, and readability metrics',
  execute: async (input: string) => {
    const text = input || '';

    const analysis = {
      length: text.length,
      wordCount: text.split(/\s+/).filter((w) => w.length > 0).length,
      sentenceCount: (text.match(/[.!?]+/g) || []).length,
      paragraphCount: text.split('\n\n').filter((p) => p.trim().length > 0).length,
      averageWordLength: 0,
      sentiment: 'neutral' as const,
      keywordsFound: [] as string[],
    };

    // Calculate average word length
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 0) {
      analysis.averageWordLength = Math.round((words.reduce((sum, w) => sum + w.length, 0) / words.length) * 100) / 100;
    }

    // Simple sentiment analysis
    const positiveWords = text.match(/good|great|excellent|amazing|wonderful|perfect|awesome/gi) || [];
    const negativeWords = text.match(/bad|terrible|awful|horrible|poor|failed|error|failed/gi) || [];

    if (positiveWords.length > negativeWords.length) {
      analysis.sentiment = 'positive';
    } else if (negativeWords.length > positiveWords.length) {
      analysis.sentiment = 'negative';
    }

    // Extract potential keywords (words > 5 chars, case-insensitive)
    const keywords = words.filter((w) => w.length > 5 && !['about', 'their', 'which', 'would', 'could', 'should', 'these'].includes(w.toLowerCase()));
    analysis.keywordsFound = keywords.slice(0, 10);

    return JSON.stringify(analysis, null, 2);
  },
});

registerTool({
  name: 'content-summarization',
  description: 'Summarize long content into key points and actionable insights',
  execute: async (input: string) => {
    const text = input || '';
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Extract key sentences (longer ones tend to have more info)
    const keySentences = sentences
      .map((s, i) => ({ text: s.trim(), length: s.trim().length, index: i }))
      .sort((a, b) => b.length - a.length)
      .slice(0, Math.min(3, Math.ceil(sentences.length / 3)))
      .sort((a, b) => a.index - b.index)
      .map((s) => s.text);

    const summary = {
      originalLength: text.length,
      originalSentences: sentences.length,
      summaryPoints: keySentences,
      compressionRatio: keySentences.length > 0 ? Math.round((1 - keySentences.join(' ').length / text.length) * 100) : 0,
      actionItems: keySentences.filter((s) => /should|must|need|require|implement|create|update/.test(s)),
    };

    return JSON.stringify(summary, null, 2);
  },
});

registerTool({
  name: 'content-creation',
  description: 'Create, generate, or transform content based on specifications and templates',
  execute: async (input: string) => {
    try {
      const spec = JSON.parse(input);
      const contentType = spec.type || 'document';
      const topic = spec.topic || 'General Content';
      const style = spec.style || 'professional';
      const length = spec.length || 'medium';

      const templates: Record<string, string[]> = {
        blog: [
          `# ${topic}`,
          ``,
          `## Introduction`,
          `This article explores key aspects of ${topic} in a ${style} manner.`,
          ``,
          `## Main Points`,
          `1. Understanding the fundamentals of ${topic}`,
          `2. Best practices and approaches`,
          `3. Real-world applications and examples`,
          `4. Future trends and opportunities`,
          ``,
          `## Conclusion`,
          `${topic} continues to evolve with new opportunities emerging regularly.`,
        ],
        email: [
          `Subject: ${topic}`,
          ``,
          `Dear Recipient,`,
          ``,
          `I hope this message finds you well. I wanted to reach out regarding ${topic}.`,
          ``,
          `Key points:`,
          `- Relevant information about ${topic}`,
          `- Action items or next steps`,
          `- Any important deadlines`,
          ``,
          `Please let me know if you have any questions.`,
          ``,
          `Best regards`,
        ],
        report: [
          `# Report: ${topic}`,
          ``,
          `**Date:** ${new Date().toISOString().split('T')[0]}`,
          `**Style:** ${style}`,
          ``,
          `## Executive Summary`,
          `This report covers ${topic} in detail.`,
          ``,
          `## Background`,
          `Understanding the context is essential for ${topic}.`,
          ``,
          `## Findings`,
          `Key findings related to ${topic} include important insights.`,
          ``,
          `## Recommendations`,
          `1. Further investigation needed`,
          `2. Implementation of findings`,
          `3. Follow-up monitoring`,
          ``,
          `## Appendices`,
          `Supporting data and references available upon request.`,
        ],
      };

      const template = templates[contentType] || templates.document || templates.blog;
      const content = template.join('\n');

      return JSON.stringify({
        contentType,
        topic,
        style,
        generatedAt: new Date().toISOString(),
        contentLength: content.length,
        wordCount: content.split(/\s+/).length,
        content: content,
        metadata: {
          type: contentType,
          hasSections: content.includes('#'),
          hasStructure: content.includes('-') || content.match(/^\d+\./m),
        },
      }, null, 2);
    } catch {
      return 'Error: Invalid input. Expected JSON with type, topic, style fields';
    }
  },
});

// ============================================================================
// METRICS & ANALYTICS TOOLS
// ============================================================================

registerTool({
  name: 'metrics-calculation',
  description: 'Calculate statistics and metrics from numerical data',
  execute: async (input: string) => {
    try {
      const data = JSON.parse(input);
      const values = Array.isArray(data) ? data : data.values || [];

      if (!Array.isArray(values) || values.length === 0) {
        return 'Error: Expected array of numbers';
      }

      const numericValues = values.filter((v) => typeof v === 'number');
      if (numericValues.length === 0) {
        return 'Error: No numeric values found';
      }

      // Calculate metrics
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const mean = sum / numericValues.length;
      const sorted = [...numericValues].sort((a, b) => a - b);
      const median = numericValues.length % 2 === 0 ? (sorted[numericValues.length / 2 - 1] + sorted[numericValues.length / 2]) / 2 : sorted[Math.floor(numericValues.length / 2)];
      const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length;
      const stdDev = Math.sqrt(variance);

      const metrics = {
        count: numericValues.length,
        sum: Math.round(sum * 100) / 100,
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        range: Math.max(...numericValues) - Math.min(...numericValues),
        standardDeviation: Math.round(stdDev * 100) / 100,
        variance: Math.round(variance * 100) / 100,
      };

      return JSON.stringify(metrics, null, 2);
    } catch {
      return 'Error: Invalid input. Expected JSON array or object with values array';
    }
  },
});

registerTool({
  name: 'trend-analysis',
  description: 'Analyze trends in time-series data to identify patterns and directions',
  execute: async (input: string) => {
    try {
      const data = JSON.parse(input);
      const points = Array.isArray(data) ? data : data.points || [];

      if (points.length < 2) {
        return 'Error: Need at least 2 data points for trend analysis';
      }

      const values = points.map((p: any) => (typeof p === 'number' ? p : p.value)).filter((v: any) => typeof v === 'number');

      if (values.length < 2) {
        return 'Error: Could not extract numeric values';
      }

      // Calculate trend
      const n = values.length;
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((a, b) => a + b, 0) / n;

      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (values[i] - yMean);
        denominator += Math.pow(i - xMean, 2);
      }

      const slope = denominator === 0 ? 0 : numerator / denominator;
      const intercept = yMean - slope * xMean;

      const trend = {
        direction: slope > 0.1 ? 'upward' : slope < -0.1 ? 'downward' : 'stable',
        slope: Math.round(slope * 1000) / 1000,
        strength: Math.round(Math.abs(slope) * 100),
        dataPoints: n,
        forecast: {
          next: Math.round((intercept + slope * n) * 100) / 100,
          twoAhead: Math.round((intercept + slope * (n + 1)) * 100) / 100,
        },
      };

      return JSON.stringify(trend, null, 2);
    } catch {
      return 'Error: Invalid input format';
    }
  },
});

// ============================================================================
// COMPARISON & RANKING TOOLS
// ============================================================================

registerTool({
  name: 'comparative-analysis',
  description: 'Compare multiple items and rank them by various metrics',
  execute: async (input: string) => {
    try {
      const data = JSON.parse(input);
      const items = data.items || data;

      if (!Array.isArray(items) || items.length === 0) {
        return 'Error: Expected array of items to compare';
      }

      // Score each item
      const scored = items.map((item: any, index: number) => {
        let score = 0;

        if (typeof item.value === 'number') score += item.value * 0.4;
        if (typeof item.quality === 'number') score += item.quality * 0.3;
        if (typeof item.relevance === 'number') score += item.relevance * 0.3;

        return {
          name: item.name || `Item ${index + 1}`,
          originalData: item,
          calculatedScore: Math.round(score * 100) / 100,
        };
      });

      // Sort by score
      const ranked = scored.sort((a, b) => b.calculatedScore - a.calculatedScore);

      const comparison = {
        itemsCompared: items.length,
        topRanked: ranked[0],
        rankings: ranked.map((item, idx) => ({
          rank: idx + 1,
          name: item.name,
          score: item.calculatedScore,
        })),
      };

      return JSON.stringify(comparison, null, 2);
    } catch {
      return 'Error: Invalid input format';
    }
  },
});

// ============================================================================
// REPORT GENERATION TOOLS
// ============================================================================

registerTool({
  name: 'report-generation',
  description: 'Generate structured reports from analyzed data',
  execute: async (input: string) => {
    try {
      const data = JSON.parse(input);

      const report = {
        title: data.title || 'Generated Report',
        generatedAt: new Date().toISOString(),
        sections: [
          {
            title: 'Executive Summary',
            content: data.summary || 'Report generated from provided data',
          },
          {
            title: 'Key Findings',
            findings: Array.isArray(data.findings) ? data.findings : [data.findings || 'Data analysis completed'],
          },
          {
            title: 'Recommendations',
            recommendations: Array.isArray(data.recommendations) ? data.recommendations : [data.recommendations || 'Review findings and take appropriate action'],
          },
          {
            title: 'Next Steps',
            steps: [
              'Review all findings and recommendations',
              'Prioritize action items',
              'Schedule follow-up analysis',
              'Implement recommended changes',
            ],
          },
        ],
        metadata: {
          dataSource: data.source || 'Unknown',
          confidenceLevel: data.confidence || 0.8,
          reviewRequired: !data.verified,
        },
      };

      return JSON.stringify(report, null, 2);
    } catch {
      return 'Error: Invalid input format';
    }
  },
});

console.log('[builtin-functionalities] Loaded 9 built-in agent functionalities');
