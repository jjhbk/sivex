'use client';

interface StatsBarProps {
  stats: {
    label: string;
    value: string | number;
  }[];
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
