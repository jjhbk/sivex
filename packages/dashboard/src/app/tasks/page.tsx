'use client';

import { useState, useEffect } from 'react';
import { TaskCard } from '@/components/TaskCard';
import { useEvents } from '@/hooks/useEvents';
import { fetchTasks, createTask } from '@/api/client';
import type { ApiTask } from '@/api/client';

export default function TasksPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Form state
  const [form, setForm] = useState({
    title: '',
    objective: '',
    description: '',
    requiredCapabilities: '',
    budget: '1000000000000000000', // 1 ETH default
    successCriteria: '',
    verificationMethod: 'human',
    creatorWallet: '0x0000000000000000000000000000000000000001',
  });

  const loadTasks = async () => {
    try {
      const filters = statusFilter ? { status: statusFilter } : undefined;
      const data = await fetchTasks(filters);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  useEvents((event) => {
    if (event.type === 'task.created' || event.type === 'task.updated') {
      loadTasks();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask({
        ...form,
        requiredCapabilities: form.requiredCapabilities.split(',').map(s => s.trim()).filter(Boolean),
      });
      setShowForm(false);
      setForm({ title: '', objective: '', description: '', requiredCapabilities: '', budget: '1000000000000000000', successCriteria: '', verificationMethod: 'human', creatorWallet: '0x0000000000000000000000000000000000000001' });
      loadTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Failed to create task. Check console for details.');
    }
  };

  const statuses = ['', 'open', 'bidding', 'assigned', 'executing', 'pending_review', 'completed', 'failed', 'disputed'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">Manage and monitor tasks in the network</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4">Create Task</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Capabilities (comma-separated)</label>
                <input
                  type="text"
                  required
                  value={form.requiredCapabilities}
                  onChange={e => setForm(f => ({ ...f, requiredCapabilities: e.target.value }))}
                  placeholder="research,summarization"
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Objective</label>
              <input
                type="text"
                required
                value={form.objective}
                onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Description</label>
              <textarea
                required
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Budget (wei)</label>
                <input
                  type="text"
                  required
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Success Criteria</label>
                <input
                  type="text"
                  required
                  value={form.successCriteria}
                  onChange={e => setForm(f => ({ ...f, successCriteria: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Verification</label>
                <select
                  value={form.verificationMethod}
                  onChange={e => setForm(f => ({ ...f, verificationMethod: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                >
                  <option value="human">Human</option>
                  <option value="peer">Peer</option>
                  <option value="automated">Automated</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Creator Wallet</label>
              <input
                type="text"
                required
                value={form.creatorWallet}
                onChange={e => setForm(f => ({ ...f, creatorWallet: e.target.value }))}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
              />
            </div>
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Create Task
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => window.location.href = `/tasks/${task.id}`} />
          ))}
          {tasks.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full">No tasks match this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
