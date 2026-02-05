'use client';

import { useState, useEffect } from 'react';
import { AgentCard } from '@/components/AgentCard';
import { ReputationBadge } from '@/components/ReputationBadge';
import { useEvents } from '@/hooks/useEvents';
import { fetchAgents, fetchReputation } from '@/api/client';
import type { ApiAgent, ApiReputation } from '@/api/client';

export default function AgentsPage() {
  const [agents, setAgents] = useState<ApiAgent[]>([]);
  const [reputations, setReputations] = useState<Record<string, ApiReputation>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);

      for (const agent of data) {
        try {
          const rep = await fetchReputation(agent.id);
          setReputations(prev => ({ ...prev, [agent.id]: rep }));
        } catch {
          // no reputation yet
        }
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEvents((event) => {
    if (event.type === 'agent.registered' || event.type === 'reputation.updated') {
      loadData();
    }
  });

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <p className="text-muted-foreground">Network participants and their reputation scores</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="cursor-pointer"
            onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
          >
            <AgentCard
              agent={agent}
              reputation={reputations[agent.id]?.score}
            />
            {selectedAgent === agent.id && reputations[agent.id] && (
              <div className="bg-card border border-border border-t-0 rounded-b-lg p-4 -mt-1">
                <ReputationBadge score={reputations[agent.id].score} />
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Reputation History</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {reputations[agent.id].events.map((evt) => (
                      <div key={evt.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{evt.type.replace('_', ' ')}</span>
                        <span className={evt.scoreDelta >= 0 ? 'text-accent' : 'text-destructive'}>
                          {evt.scoreDelta >= 0 ? '+' : ''}{evt.scoreDelta}
                        </span>
                      </div>
                    ))}
                    {reputations[agent.id].events.length === 0 && (
                      <p className="text-xs text-muted-foreground">No events yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <p className="text-muted-foreground">No agents registered. Start an agent to see it appear here.</p>
      )}
    </div>
  );
}
