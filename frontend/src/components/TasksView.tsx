import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, ListTodo, RefreshCw, Search, ExternalLink, Clock, CheckCircle2, CircleDot, EyeOff } from 'lucide-react';

interface Subtask {
  id: number;
  project_id: number;
  project_name: string;
  client_id?: number;
  client_name?: string;
  client_color?: string;
  title: string;
  status: 'to do' | 'in progress' | 'complete' | string;
  clickup_id?: string;
  clickup_assignee_id?: string;
  assignee_id?: number;
  assignee_name?: string;
  assignee_color?: string;
  due_date?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
}

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Subtask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchEntities();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/subtasks.php?project_id=all');
      const data = await res.json();
      if (data.status === 'success') {
        setTasks(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects.php');
      const data = await res.json();
      if (data.status === 'success') {
        setProjects(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }
  };

  const fetchEntities = async () => {
    try {
      const res = await fetch('/api/settings.php');
      const data = await res.json();
      if (data.status === 'success') {
        setEntities(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch entities:', e);
    }
  };

  const handleSyncAllClickUp = async () => {
    try {
      setIsSyncingAll(true);
      setSyncMessage(null);

      // Fetch active development projects to sync each configured project
      const adRes = await fetch('/api/active_development.php');
      const adData = await adRes.json();
      const activeProjs = adData.data || [];

      let totalSyncedCount = 0;
      for (const p of activeProjs) {
        if (p.clickup_list_id || p.clickup_task_id) {
          const res = await fetch('/api/clickup.php?action=sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: p.project_id })
          });
          const resData = await res.json();
          if (resData.status === 'success') {
            totalSyncedCount += (resData.synced_count || 0);
          }
        }
      }

      setSyncMessage(`Synced ${totalSyncedCount} tasks across all projects from ClickUp`);
      fetchTasks();
    } catch (e) {
      console.error('Sync all error:', e);
      alert('Error syncing all ClickUp tasks');
    } finally {
      setIsSyncingAll(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/subtasks.php?id=${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      }
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  };

  const handleUpdateAssignee = async (taskId: number, assigneeId: number | null) => {
    try {
      const res = await fetch(`/api/subtasks.php?id=${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: assigneeId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        const dev = developers.find(d => d.id === assigneeId);
        setTasks(prev => prev.map(t => t.id === taskId ? {
          ...t,
          assignee_id: assigneeId || undefined,
          assignee_name: dev?.name,
          assignee_color: dev?.color
        } : t));
      }
    } catch (e) {
      console.error('Failed to update assignee:', e);
    }
  };

  const clients = entities.filter(e => e.type === 'client');
  const developers = entities.filter(e => e.type === 'developer' || e.type === 'member');

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.project_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.assignee_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClient = selectedClientId === 'all' || String(t.client_id) === selectedClientId;
      const matchesProject = selectedProjectId === 'all' || String(t.project_id) === selectedProjectId;
      const matchesAssignee = selectedAssigneeId === 'all' || String(t.assignee_id) === selectedAssigneeId;
      const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
      const matchesCompleted = !hideCompleted || t.status !== 'complete';

      return matchesSearch && matchesClient && matchesProject && matchesAssignee && matchesStatus && matchesCompleted;
    });
  }, [tasks, searchQuery, selectedClientId, selectedProjectId, selectedAssigneeId, selectedStatus, hideCompleted]);

  // KPI Calculations
  const totalCount = tasks.length;
  const todoCount = tasks.filter(t => t.status === 'to do').length;
  const inProgressCount = tasks.filter(t => t.status === 'in progress').length;
  const completedCount = tasks.filter(t => t.status === 'complete').length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return (
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Complete
          </span>
        );
      case 'in progress':
        return (
          <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-wider border border-purple-200 inline-flex items-center gap-1">
            <Clock size={12} /> In Progress
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-wider border border-gray-200 inline-flex items-center gap-1">
            <CircleDot size={12} /> To Do
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {syncMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-purple-50 border border-purple-200 text-purple-900 rounded-2xl text-xs font-bold shadow-lg animate-fade-in">
          <CheckCircle2 size={18} className="text-purple-600 flex-shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <ListTodo size={26} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">ClickUp Tasks</h1>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                Unified task view synced directly from ClickUp across all active projects and clients
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncAllClickUp}
            disabled={isSyncingAll}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncingAll ? "animate-spin" : ""} />
            <span>{isSyncingAll ? 'Syncing All Projects...' : 'Sync All ClickUp Tasks'}</span>
          </button>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Kanban Board
            </button>
          </div>

          <button
            onClick={fetchTasks}
            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
            title="Refresh Tasks"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Tasks</span>
            <span className="p-2 rounded-2xl bg-gray-100 text-gray-600 font-bold">
              <CheckSquare size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">{totalCount}</span>
            <span className="text-xs font-bold text-gray-500">synced subtasks</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">To Do</span>
            <span className="p-2 rounded-2xl bg-amber-50 text-amber-600 font-bold">
              <CircleDot size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 tracking-tight">{todoCount}</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">In Progress</span>
            <span className="p-2 rounded-2xl bg-purple-50 text-purple-600 font-bold">
              <Clock size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-600 tracking-tight">{inProgressCount}</span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Active</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Completed</span>
            <span className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 font-bold">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">{completedCount}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{completionRate}% Done</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search task, client, project, assignee..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Client Filter */}
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
          >
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssigneeId}
            onChange={e => setSelectedAssigneeId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
          >
            <option value="all">All Assignees</option>
            {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="to do">To Do</option>
            <option value="in progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>

          {/* Hide Completed Toggle */}
          <button
            type="button"
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              hideCompleted
                ? 'bg-purple-50 text-purple-700 border-purple-300 ring-2 ring-purple-500/10 shadow-xs'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
            title="Toggle visibility of completed tasks"
          >
            <EyeOff size={14} className={hideCompleted ? 'text-purple-600' : 'text-gray-400'} />
            <span>{hideCompleted ? 'Hide Completed (ON)' : 'Hide Completed'}</span>
          </button>
        </div>
      </div>

      {/* MAIN TASK VIEW MODE */}
      {viewMode === 'list' ? (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Task Title</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">ClickUp Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 font-bold">
                      No subtasks found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(t => (
                    <tr key={t.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <select
                          value={t.status}
                          onChange={e => handleUpdateStatus(t.id, e.target.value)}
                          className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="to do">To Do</option>
                          <option value="in progress">In Progress</option>
                          <option value="complete">Complete</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-gray-900 max-w-md truncate" title={t.title}>
                        {t.title}
                      </td>

                      <td className="py-3.5 px-4">
                        {t.client_name ? (
                          <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.client_color || '#3b82f6' }}></span>
                            {t.client_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-purple-700">
                        {t.project_name}
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={t.assignee_id || ''}
                          onChange={e => handleUpdateAssignee(t.id, e.target.value ? Number(e.target.value) : null)}
                          className="bg-transparent font-bold text-gray-800 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Unassigned --</option>
                          {developers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-gray-500">
                        {t.due_date || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {t.clickup_id ? (
                          <a
                            href={`https://app.clickup.com/t/${t.clickup_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-[10px] font-black uppercase tracking-wider transition-all border border-purple-200"
                          >
                            <span>ClickUp</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['to do', 'in progress', 'complete'].map(colStatus => {
            const colTasks = filteredTasks.filter(t => t.status === colStatus);
            return (
              <div key={colStatus} className="bg-gray-50/80 rounded-3xl p-4 border border-gray-200/80 flex flex-col space-y-3 min-h-[500px]">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(colStatus)}
                  </div>
                  <span className="text-xs font-black text-gray-400 bg-white px-2.5 py-0.5 rounded-full border border-gray-200">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2.5 hover:shadow-md transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {t.client_name && (
                            <span className="text-[10px] font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.client_color || '#3b82f6' }}></span>
                              {t.client_name}
                            </span>
                          )}
                          <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            {t.project_name}
                          </span>
                        </div>

                        {t.clickup_id && (
                          <a
                            href={`https://app.clickup.com/t/${t.clickup_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-purple-600 transition-colors"
                            title="Open in ClickUp"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-3">
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.assignee_color || '#94a3b8' }}></span>
                          <span className="font-bold text-gray-700">{t.assignee_name || 'Unassigned'}</span>
                        </div>

                        <select
                          value={t.status}
                          onChange={e => handleUpdateStatus(t.id, e.target.value)}
                          className="bg-gray-100 text-gray-800 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none"
                        >
                          <option value="to do">To Do</option>
                          <option value="in progress">In Progress</option>
                          <option value="complete">Complete</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
