'use client';

export function ReputationBadge({ score }: { score: number }) {
  let color = 'text-muted-foreground';
  if (score >= 500) color = 'text-accent';
  else if (score >= 200) color = 'text-primary';
  else if (score >= 100) color = 'text-secondary-foreground';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Rep</span>
      <span className={`text-sm font-bold ${color}`}>{score.toFixed(0)}</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.min((score / 1000) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
