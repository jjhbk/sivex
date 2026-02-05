'use client';

import { useState, useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { fetchTask, assignTask, verifyTask, disputeTask, fetchReputation } from '@/api/client';
import type { ApiTask, ApiBid } from '@/api/client';

function formatWei(wei: string): string {
  const num = Number(BigInt(wei)) / 1e18;
  return num.toFixed(4) + ' ETH';
}

interface BidWithScore extends ApiBid {
  score: number;
  reputationScore: number;
}

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<ApiTask | null>(null);
  const [bidsWithScores, setBidsWithScores] = useState<BidWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTask = async () => {
    try {
      const data = await fetchTask(params.id);
      setTask(data);

      // Initialize bids without scores
      if (data.bids && data.bids.length > 0) {
        const initialBids = data.bids.map((bid) => ({
          ...bid,
          score: 0,
          reputationScore: 0,
        }));
        setBidsWithScores(initialBids);

        // Load reputation scores in background
        data.bids.forEach((bid) => {
          fetchReputation(bid.agentId)
            .then((rep) => {
              const budget = BigInt(data.budget);
              const cost = BigInt(bid.proposedCost);
              const costRatio = Number(cost) / Number(budget);
              const score = rep.score * bid.confidence * (1 - costRatio);
              setBidsWithScores((prev) =>
                prev.map((b) =>
                  b.id === bid.id
                    ? { ...b, score, reputationScore: rep.score }
                    : b
                )
              );
            })
            .catch(() => {
              // On error, just leave score as 0
            });
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [params.id]);

  useEvents((event) => {
    if (event.type === 'task.updated') {
      const payload = event.payload as { id: string };
      if (payload.id === params.id) loadTask();
    }
  });

  const handleAssign = async () => {
    try {
      await assignTask(params.id);
      loadTask();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Assign failed');
    }
  };

  const handleVerify = async (approved: boolean) => {
    try {
      await verifyTask(params.id, approved);
      loadTask();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Verify failed');
    }
  };

  const handleDispute = async () => {
    try {
      await disputeTask(params.id);
      loadTask();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Dispute failed');
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (error) return <div className="text-destructive">{error}</div>;
  if (!task) return <div className="text-muted-foreground">Task not found</div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => window.history.back()} className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
          {task.status}
        </span>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Objective</h3>
            <p className="text-foreground">{task.objective}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Budget</h3>
            <p className="text-foreground">{formatWei(task.budget)}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</h3>
            <p className="text-foreground">{task.description}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Success Criteria</h3>
            <p className="text-foreground">{task.successCriteria}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Required Capabilities</h3>
            <div className="flex gap-1 flex-wrap">
              {task.requiredCapabilities.map((cap) => (
                <span key={cap} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{cap}</span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Verification</h3>
            <p className="text-foreground capitalize">{task.verificationMethod}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Creator Wallet</h3>
            <p className="text-foreground text-sm truncate">{task.creatorWallet}</p>
          </div>
          {task.assignedAgentId && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Assigned Agent</h3>
              <p className="text-primary">{task.assignedAgentId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bids */}
      {//task?.bids && task.bids.length > 0 && (
      (  <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-3">Bids ({task.bids.length})</h2>
          <div className="space-y-2">
            {task.bids
              .map((bid) => {
                const bidWithScore = bidsWithScores.find((b) => b.id === bid.id);
                return (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between rounded p-3 bg-secondary hover:bg-secondary/80"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">{bid.agentId}</p>
                      <p className="text-xs text-muted-foreground">{bid.strategy}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-foreground">{formatWei(bid.proposedCost)}</p>
                      <p className="text-xs text-muted-foreground">Confidence: {(bid.confidence * 100).toFixed(0)}%</p>
                      {bidWithScore && bidWithScore.reputationScore > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground">Rep: {bidWithScore.reputationScore.toFixed(1)}</p>
                          <p className="text-xs font-medium text-foreground">Score: {bidWithScore.score.toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Result */}
      {task.result && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-2">Result</h2>
          <pre className="text-sm text-foreground whitespace-pre-wrap">{task.result}</pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {(task.status === 'open' || task.status === 'bidding') && (
          <button onClick={handleAssign} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            Assign Winner
          </button>
        )}
        {task.status === 'pending_review' && (
          <>
            <button onClick={() => handleVerify(true)} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Approve
            </button>
            <button onClick={() => handleVerify(false)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Reject
            </button>
          </>
        )}
        {(task.status === 'assigned' || task.status === 'pending_review') && (
          <button onClick={handleDispute} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            Dispute
          </button>
        )}
      </div>
    </div>
  );
}
