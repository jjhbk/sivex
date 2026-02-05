'use client';

import { useState, useEffect } from 'react';
import { StatsBar } from '@/components/StatsBar';
import { TaskCard } from '@/components/TaskCard';
import { AgentCard } from '@/components/AgentCard';
import { useEvents } from '@/hooks/useEvents';
import { fetchTasks, fetchAgents, fetchReputation } from '@/api/client';
import type { ApiTask, ApiAgent } from '@/api/client';

export default function OverviewPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [agents, setAgents] = useState<ApiAgent[]>([]);
  const [reputations, setReputations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([fetchTasks(), fetchAgents()]);
      setTasks(tasksRes);
      setAgents(agentsRes);

      // Load reputations for all agents
      const repMap: Record<string, number> = {};
      for (const agent of agentsRes) {
        try {
          const rep = await fetchReputation(agent.id);
          repMap[agent.id] = rep.score;
        } catch {
          repMap[agent.id] = 100;
        }
      }
      setReputations(repMap);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEvents((event) => {
    if (event.type === 'task.created' || event.type === 'task.updated') {
      loadData();
    } else if (event.type === 'agent.registered') {
      loadData();
    } else if (event.type === 'reputation.updated') {
      const payload = event.payload as { agentId: string; score: number };
      setReputations(prev => ({ ...prev, [payload.agentId]: payload.score }));
    }
  });

  const stats = [
    { label: 'Total Tasks', value: tasks.length },
    { label: 'Active Agents', value: agents.filter(a => a.status !== 'offline').length },
    { label: 'Open Tasks', value: tasks.filter(t => t.status === 'open' || t.status === 'bidding').length },
    { label: 'Pending Review', value: tasks.filter(t => t.status === 'pending_review').length },
  ];

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sivex Network Overview</h1>
        <p className="text-muted-foreground">Agentic market coordination layer</p>
      </div>

      <StatsBar stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Tasks</h2>
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => window.location.href = `/tasks/${task.id}`} />
            ))}
            {tasks.length === 0 && (
              <p className="text-muted-foreground text-sm">No tasks yet. Create one from the Tasks page.</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Active Agents</h2>
          <div className="space-y-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} reputation={reputations[agent.id]} />
            ))}
            {agents.length === 0 && (
              <p className="text-muted-foreground text-sm">No agents registered yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
