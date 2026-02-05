'use client';

import { useState, useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { fetchTasks, verifyTask, disputeTask } from '@/api/client';
import type { ApiTask } from '@/api/client';

function formatWei(wei: string): string {
  const num = Number(BigInt(wei)) / 1e18;
  return num.toFixed(4) + ' ETH';
}

export default function ReviewPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const data = await fetchTasks({ status: 'pending_review' });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEvents((event) => {
    if (event.type === 'task.updated') {
      loadTasks();
    }
  });

  const handleApprove = async (taskId: string) => {
    try {
      await verifyTask(taskId, true);
      loadTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      await verifyTask(taskId, false);
      loadTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reject failed');
    }
  };

  const handleDispute = async (taskId: string) => {
    try {
      await disputeTask(taskId);
      loadTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Dispute failed');
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
        <p className="text-muted-foreground">Tasks awaiting human verification</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No tasks pending review. The queue is clear.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{task.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{task.objective}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatWei(task.budget)}</span>
              </div>

              {task.assignedAgentId && (
                <p className="text-xs text-muted-foreground mb-2">
                  Assigned to: <span className="text-primary">{task.assignedAgentId}</span>
                </p>
              )}

              {task.result && (
                <div className="bg-secondary rounded p-3 mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Agent Result</h4>
                  <pre className="text-sm text-foreground whitespace-pre-wrap">{task.result}</pre>
                </div>
              )}

              <div className="bg-secondary rounded p-3 mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Success Criteria</h4>
                <p className="text-sm text-foreground">{task.successCriteria}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(task.id)}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(task.id)}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleDispute(task.id)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Dispute
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
