'use client';

import type { ApiTask } from '@/api/client';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-accent text-accent-foreground',
  bidding: 'bg-primary text-primary-foreground',
  assigned: 'bg-primary text-primary-foreground',
  executing: 'bg-primary text-primary-foreground',
  pending_review: 'bg-secondary text-secondary-foreground',
  completed: 'bg-accent text-accent-foreground',
  failed: 'bg-destructive text-destructive-foreground',
  disputed: 'bg-secondary text-secondary-foreground',
};

function formatWei(wei: string): string {
  const num = Number(BigInt(wei)) / 1e18;
  return num.toFixed(4) + ' ETH';
}

export function TaskCard({ task, onClick }: { task: ApiTask; onClick?: () => void }) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-foreground">{task.title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] || STATUS_COLORS.open}`}>
          {task.status}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.objective}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {task.requiredCapabilities.map((cap) => (
          <span key={cap} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
            {cap}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Budget: {formatWei(task.budget)}</span>
        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
