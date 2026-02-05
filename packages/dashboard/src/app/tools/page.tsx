'use client';

import { useState, useEffect } from 'react';
import { fetchTools, registerTool, fetchAgents } from '@/api/client';
import type { ApiAgent } from '@/api/client';

interface Tool {
  name: string;
  agents: string[];
  description: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [agents, setAgents] = useState<ApiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [formData, setFormData] = useState({
    agentId: '',
    toolName: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [toolsData, agentsData] = await Promise.all([
        fetchTools(),
        fetchAgents(),
      ]);
      setTools(toolsData);
      setAgents(agentsData);
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agentId || !formData.toolName || !formData.description) {
      alert('Please fill in all fields');
      return;
    }

    setRegistering(true);
    try {
      await registerTool({
        agentId: formData.agentId,
        toolName: formData.toolName,
        description: formData.description,
      });

      alert('Tool registered successfully!');
      setFormData({ agentId: '', toolName: '', description: '' });
      setShowRegister(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to register tool');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading tools...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Agent Tools</h1>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          {showRegister ? 'Cancel' : 'Register Tool'}
        </button>
      </div>

      {showRegister && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4">Register New Tool</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Agent</label>
              <select
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm"
              >
                <option value="">Select an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Tool Name</label>
              <input
                type="text"
                value={formData.toolName}
                onChange={(e) => setFormData({ ...formData, toolName: e.target.value })}
                placeholder="e.g., sentiment-analysis"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this tool do?"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={registering}
              className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {registering ? 'Registering...' : 'Register Tool'}
            </button>
          </form>
        </div>
      )}

      {tools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tools registered yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tools.map((tool) => (
            <div key={tool.name} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground">{tool.name}</h3>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  {tool.agents.length} agent{tool.agents.length !== 1 ? 's' : ''}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Available on</p>
                <div className="flex flex-wrap gap-1">
                  {tool.agents.map((agentId) => {
                    const agent = agents.find((a) => a.id === agentId);
                    return (
                      <span key={agentId} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        {agent?.name || agentId}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
