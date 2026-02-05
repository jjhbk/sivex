'use client';

import type { ApiAgent } from '@/api/client';

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-accent text-accent-foreground',
  busy: 'bg-primary text-primary-foreground',
  offline: 'bg-muted text-muted-foreground',
};

export function AgentCard({ agent, reputation }: { agent: ApiAgent; reputation?: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{agent.name}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[agent.status] || STATUS_COLORS.offline}`}>
          {agent.status}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Capabilities</p>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.map((cap) => (
              <span key={cap} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                {cap}
              </span>
            ))}
          </div>
        </div>

        {agent.tools && agent.tools.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tools</p>
            <div className="space-y-1">
              {agent.tools.map((tool) => (
                <div key={tool.name} className="text-xs">
                  <span className="font-medium text-foreground">{tool.name}</span>
                  <p className="text-muted-foreground">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {reputation !== undefined && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Reputation:</span>
            <span className="text-sm font-semibold text-primary">{reputation.toFixed(1)}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground truncate">{agent.walletAddress}</p>
      </div>
    </div>
  );
}
