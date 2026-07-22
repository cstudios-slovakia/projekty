import React, { useState, useEffect } from 'react';
import { Briefcase, Code, DollarSign, Users, FileText, ArrowUpRight, Search, RefreshCw, ShieldCheck, Archive, ArchiveRestore, TrendingDown, Plus, X, CheckSquare, Edit2, Check, ChevronDown, ChevronUp, Layers, CheckCircle2, RotateCcw } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { ActiveDevDetailModal } from './ActiveDevDetailModal';
import { BudgetBurndownChart } from './BudgetBurndownChart';

interface ActiveDevRowProps {
  project: any;
  developers: any[];
  onSelect: (project: any) => void;
  onToggleArchive: (project: any, e: React.MouseEvent) => void;
  onSyncClickup: (project: any, e: React.MouseEvent) => void;
  onUpdateProject: (id: number, updates: any) => void;
  isSyncing: boolean;
  onCollapse?: () => void;
}

function MiniProjectRow({ project, developers: _developers, onSelect, onToggleArchive, onSyncClickup, onUpdateProject, isSyncing }: ActiveDevRowProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.project_name || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!titleInput.trim()) return;
    await onUpdateProject(project.id, { project_name: titleInput, name: titleInput });
    setIsEditingTitle(false);
  };

  const totTasks = parseInt(project.total_subtasks || 0);
  const compTasks = parseInt(project.completed_subtasks || 0);
  const overallPct = totTasks > 0 ? Math.round((compTasks / totTasks) * 100) : 0;

  if (isExpanded) {
    return (
      <ActiveDevRow
        project={project}
        developers={_developers}
        onSelect={onSelect}
        onToggleArchive={onToggleArchive}
        onSyncClickup={onSyncClickup}
        onUpdateProject={onUpdateProject}
        isSyncing={isSyncing}
        onCollapse={() => setIsExpanded(false)}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <select
          value={project.project_category || 'miniproject'}
          onChange={(e) => onUpdateProject(project.id, { project_category: e.target.value })}
          className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 py-1 cursor-pointer focus:outline-none flex-shrink-0"
        >
          <option value="project">Standard Project</option>
          <option value="miniproject">Mini-project (Fixes/Updates)</option>
        </select>

        {isEditingTitle ? (
          <form onSubmit={handleSaveTitle} className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="px-3 py-1 border border-purple-400 rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
              autoFocus
            />
            <button type="submit" className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
              <Check size={14} />
            </button>
            <button type="button" onClick={() => setIsEditingTitle(false)} className="p-1.5 bg-gray-200 text-gray-700 rounded-xl">
              <X size={14} />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 min-w-0 group">
            <h3
              onClick={() => onSelect(project)}
              className="text-base font-black text-gray-900 truncate hover:text-[var(--color-primary)] cursor-pointer"
            >
              {project.project_name}
            </h3>
            <button
              onClick={() => setIsEditingTitle(true)}
              className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-purple-600 transition-all"
              title="Edit project title"
            >
              <Edit2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
        {project.dev_name && (
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
            <Code size={12} /> {project.dev_name}
          </span>
        )}

        <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold">
          {compTasks}/{totTasks} tasks ({overallPct}%)
        </span>

        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1"
          title="Expand to full project view"
        >
          <ChevronDown size={16} />
          <span>Expand</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            const isComp = project.is_completed || project.project_status === 'Completed';
            onUpdateProject(project.id, {
              is_completed: isComp ? 0 : 1,
              project_status: isComp ? 'Price Offer Accepted' : 'Completed'
            });
          }}
          className={`p-1.5 rounded-xl transition-all ${
            project.is_completed || project.project_status === 'Completed'
              ? 'text-purple-600 hover:bg-purple-50'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
          title={project.is_completed || project.project_status === 'Completed' ? "Re-open Project" : "Mark as Completed"}
        >
          {project.is_completed || project.project_status === 'Completed' ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
        </button>

        <button
          onClick={(e) => onSyncClickup(project, e)}
          disabled={isSyncing}
          className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold shadow-2xs"
          title="Sync ClickUp"
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
        </button>

        <button
          onClick={() => onSelect(project)}
          className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
        >
          <span>Manage</span>
          <ArrowUpRight size={13} />
        </button>

        <button
          onClick={(e) => onToggleArchive(project, e)}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100"
          title={project.is_archived ? "Unarchive Project" : "Archive Project"}
        >
          {project.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
        </button>
      </div>
    </div>
  );
}

function ActiveDevRow({ project, developers, onSelect, onToggleArchive, onSyncClickup, onUpdateProject, isSyncing, onCollapse }: ActiveDevRowProps) {
  const [manualExpenses, setManualExpenses] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.project_name || '');

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!titleInput.trim()) return;
    await onUpdateProject(project.id, { project_name: titleInput, name: titleInput });
    setIsEditingTitle(false);
  };

  useEffect(() => {
    fetchChartData();
  }, [
    project.project_id,
    project.updated_at,
    project.budget,
    project.dev_budget,
    project.start_date,
    project.soft_deadline,
    project.hard_deadline,
    project.deadline,
    project.total_manual_expenses,
    project.total_time_log_expenses,
    project.total_invoiced,
    project.total_paid
  ]);

  const fetchChartData = async () => {
    try {
      const [expRes, logsRes, invRes] = await Promise.all([
        fetch(`/api/manual_expenses.php?project_id=${project.project_id}`).then(r => r.json()),
        fetch(`/api/time_logs.php?project_id=${project.project_id}`).then(r => r.json()),
        fetch(`/api/invoices.php?project_id=${project.project_id}`).then(r => r.json())
      ]);
      if (expRes.status === 'success') setManualExpenses(expRes.data || []);
      if (logsRes.status === 'success') setTimeLogs(logsRes.data || []);
      if (invRes.status === 'success') setInvoices(invRes.data || []);
    } catch (e) {
      console.error('Failed to load chart data for project', project.project_id, e);
    }
  };

  const devBud = parseFloat(project.dev_budget || 0);
  const totalBudget = parseFloat(project.budget || 0);
  const totalExp = parseFloat(project.total_manual_expenses || 0) + parseFloat(project.total_time_log_expenses || 0);
  const remainingBudget = totalBudget - totalExp;
  const dangerThreshold = Math.max(0, totalBudget - devBud);
  const isOvershot = devBud > 0 && remainingBudget < dangerThreshold;

  return (
    <div className={`bg-white rounded-3xl border p-6 transition-all ${isOvershot ? 'border-amber-200/80 shadow-md shadow-amber-500/5' : 'border-gray-200/80 shadow-sm hover:shadow-md'}`}>
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* LEFT HALF: Budget Burndown Chart (50% Width) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between space-y-2 border-b lg:border-b-0 lg:border-r border-gray-100 pr-0 lg:pr-6 pb-6 lg:pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={18} className="text-purple-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">Budget &amp; Income Chart</h4>
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              Limit: €{dangerThreshold.toLocaleString()}
            </span>
          </div>

          <BudgetBurndownChart
            budget={totalBudget}
            devBudget={devBud}
            startDate={project.accepted_date || project.created_at?.split(' ')[0]}
            softDeadline={project.soft_deadline}
            hardDeadline={project.hard_deadline || project.deadline}
            deadline={project.deadline}
            manualExpenses={manualExpenses}
            timeLogs={timeLogs}
            invoices={invoices}
            developers={developers}
            height={190}
          />
        </div>

        {/* RIGHT HALF: All KPIs, Team Badges, Task Progress & Actions (50% Width) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between space-y-4 pl-0 lg:pl-2">
          {/* Header Row: Status, Title, Action Buttons */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={project.project_category || 'project'}
                  onChange={(e) => onUpdateProject(project.id, { project_category: e.target.value })}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 py-0.5 cursor-pointer focus:outline-none"
                >
                  <option value="project">Standard Project</option>
                  <option value="miniproject">Mini-project (Fixes/Updates)</option>
                </select>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  project.is_archived
                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {project.project_status || 'Accepted'}
                </span>

                {isOvershot && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                    Dev Budget Overshot
                  </span>
                )}
              </div>

              {isEditingTitle ? (
                <form onSubmit={handleSaveTitle} className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="px-3 py-1 border border-purple-400 rounded-xl text-base font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                    autoFocus
                  />
                  <button type="submit" className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                    <Check size={16} />
                  </button>
                  <button type="button" onClick={() => setIsEditingTitle(false)} className="p-1.5 bg-gray-200 text-gray-700 rounded-xl">
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h3
                    onClick={() => onSelect(project)}
                    className="text-xl font-black text-gray-900 tracking-tight hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                  >
                    {project.project_name}
                  </h3>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-purple-600 transition-all"
                    title="Edit project title"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isComp = project.is_completed || project.project_status === 'Completed';
                  onUpdateProject(project.id, {
                    is_completed: isComp ? 0 : 1,
                    project_status: isComp ? 'Price Offer Accepted' : 'Completed'
                  });
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                  project.is_completed || project.project_status === 'Completed'
                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
                title={project.is_completed || project.project_status === 'Completed' ? "Re-open Project" : "Mark as Completed"}
              >
                {project.is_completed || project.project_status === 'Completed' ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                <span>{project.is_completed || project.project_status === 'Completed' ? 'Re-open' : 'Complete'}</span>
              </button>

              {onCollapse && (
                <button
                  onClick={onCollapse}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                  title="Collapse to compact mini-project row"
                >
                  <ChevronUp size={14} />
                  <span>Collapse</span>
                </button>
              )}

              <button
                onClick={(e) => onSyncClickup(project, e)}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                title="Sync subtasks from ClickUp"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                <span>{isSyncing ? 'Syncing...' : 'Sync ClickUp'}</span>
              </button>

              <button
                onClick={() => onSelect(project)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <span>Manage</span>
                <ArrowUpRight size={14} />
              </button>

              <button
                onClick={(e) => onToggleArchive(project, e)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                title={project.is_archived ? "Unarchive Project" : "Archive Project"}
              >
                {project.is_archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
              </button>
            </div>
          </div>

          {/* Team Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {project.client_name && (
              <span className="px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.client_color || '#3b82f6' }}></span>
                {project.client_name}
              </span>
            )}
            {project.pm_name && (
              <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold flex items-center gap-1.5">
                <Users size={13} /> PM: {project.pm_name}
              </span>
            )}
            {project.dev_name && (
              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                <Code size={13} /> Dev: {project.dev_name}
              </span>
            )}
          </div>

          {/* Project Progress & Assignees Task Completion */}
          {(() => {
            const totTasks = parseInt(project.total_subtasks || 0);
            const compTasks = parseInt(project.completed_subtasks || 0);
            const overallPct = totTasks > 0 ? Math.round((compTasks / totTasks) * 100) : 0;
            const assignees = Array.isArray(project.assignee_subtasks_breakdown) ? project.assignee_subtasks_breakdown : [];

            return (
              <div className="p-3.5 bg-gray-50/90 rounded-2xl border border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-purple-600" />
                    <span className="text-[10px] font-black uppercase text-gray-700 tracking-wider">Project Progress</span>
                    <button
                      onClick={(e) => onSyncClickup(project, e)}
                      disabled={isSyncing}
                      className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100/60 rounded-lg transition-all ml-1"
                      title="Sync ClickUp subtasks"
                    >
                      <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                    </button>
                  </div>
                  <span className="text-xs font-black text-purple-700">
                    {overallPct}% ({compTasks}/{totTasks} tasks)
                  </span>
                </div>

                {/* Overall Progress Bar */}
                <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${overallPct}%` }}
                  ></div>
                </div>

                {/* Assignees Tasks Breakdown */}
                {assignees.length > 0 && (
                  <div className="pt-2 space-y-1.5 border-t border-gray-200/60">
                    <span className="text-[10px] font-bold text-gray-400 block">Assignee Breakdown:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assignees.map((a: any, idx: number) => {
                        const tot = parseInt(a.total_tasks || 0);
                        const comp = parseInt(a.completed_tasks || 0);
                        const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
                        return (
                          <div key={idx} className="bg-white px-2.5 py-1.5 rounded-xl border border-gray-200/80 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color || '#3b82f6' }}></span>
                              <span className="font-bold text-gray-800 text-[11px] truncate">{a.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] font-extrabold text-gray-600">{comp}/{tot} ({pct}%)</span>
                              <div className="w-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Financial KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block">Total Budget</span>
              <span className="font-black text-gray-900">&euro;{totalBudget.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block">Dev Budget</span>
              <span className="font-black text-purple-700">&euro;{devBud.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block">Expenses Burned</span>
              <span className={`font-black ${isOvershot ? 'text-amber-600' : 'text-emerald-600'}`}>&euro;{totalExp.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block">Invoiced / Paid</span>
              <span className="font-black text-gray-900">&euro;{parseFloat(project.total_paid || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActiveDevelopmentView() {
  const { t } = useTranslation();
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [allNonArchivedProjects, setAllNonArchivedProjects] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [statusTab, setStatusTab] = useState<'active' | 'completed' | 'archived'>('active');

  // Sync state
  const [syncingProjectId, setSyncingProjectId] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // New Active Project Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientId, setNewClientId] = useState<number | string>('');
  const [newPmId, setNewPmId] = useState<number | string>('');
  const [newDevId, setNewDevId] = useState<number | string>('');
  const [newBudget, setNewBudget] = useState<number | string>('');
  const [newDevBudget, setNewDevBudget] = useState<number | string>('');
  const [newSoftDeadline, setNewSoftDeadline] = useState('');
  const [newHardDeadline, setNewHardDeadline] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchActiveProjects();
    fetchKpiProjects();
    fetchEntities();
  }, [statusTab]);

  const fetchActiveProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/active_development.php?status_tab=${statusTab}`);
      const data = await res.json();
      if (data.status === 'success') {
        setActiveProjects(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch active development projects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKpiProjects = async () => {
    try {
      const res = await fetch('/api/active_development.php?status_tab=all_non_archived');
      const data = await res.json();
      if (data.status === 'success') {
        setAllNonArchivedProjects(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch KPI projects:', e);
    }
  };

  const handleSyncClickupRow = async (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSyncingProjectId(project.project_id);
      setSyncMessage(null);
      const res = await fetch('/api/clickup.php?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.project_id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSyncMessage(`Successfully synced ${data.synced_count || 0} subtasks for "${project.project_name}"`);
        fetchActiveProjects();
      } else {
        alert(`Sync error: ${data.message || 'Failed to sync ClickUp subtasks'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error connecting to ClickUp sync endpoint');
    } finally {
      setSyncingProjectId(null);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleToggleArchive = async (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const willArchive = !project.is_archived;
    if (!window.confirm(willArchive ? t('projects.confirm_archive') || 'Archive this project?' : 'Unarchive this project?')) {
      return;
    }
    try {
      const res = await fetch(`/api/active_development.php?id=${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: willArchive })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchActiveProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProject = async (id: number, updates: any) => {
    try {
      const res = await fetch(`/api/active_development.php?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchActiveProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [isMiniProjectsOpen, setIsMiniProjectsOpen] = useState(true);

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

  const handleCreateActiveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setIsCreating(true);

      const projRes = await fetch('/api/projects.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          status: 'Price Offer Accepted',
          total_value: parseFloat(String(newBudget || 0)),
          dev_budget: parseFloat(String(newDevBudget || 0)),
          client_id: newClientId || null,
          pm_id: newPmId || null,
          dev_id: newDevId || null,
          soft_deadline: newSoftDeadline || null,
          hard_deadline: newHardDeadline || null,
          deadline: newHardDeadline || null,
          accepted_date: new Date().toISOString().split('T')[0]
        })
      });
      const projData = await projRes.json();

      if (projData.status === 'success' && projData.id) {
        await fetch('/api/active_development.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projData.id,
            client_id: newClientId || null,
            pm_id: newPmId || null,
            dev_id: newDevId || null,
            budget: parseFloat(String(newBudget || 0)),
            dev_budget: parseFloat(String(newDevBudget || 0))
          })
        });

        setShowCreateModal(false);
        setNewProjectName('');
        setNewClientId('');
        setNewPmId('');
        setNewDevId('');
        setNewBudget('');
        setNewDevBudget('');
        setNewSoftDeadline('');
        setNewHardDeadline('');
        fetchActiveProjects();
      }
    } catch (err) {
      console.error('Failed to create active project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const clients = entities.filter(e => e.type === 'client');
  const pms = entities.filter(e => e.type === 'pm');
  const developers = entities.filter(e => e.type === 'developer' || e.type === 'member');

  const filteredProjects = activeProjects.filter(p =>
    (p.project_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.dev_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const standardProjects = filteredProjects.filter(p => (p.project_category || 'project') === 'project');
  const miniProjects = filteredProjects.filter(p => p.project_category === 'miniproject');

  // Overall KPI aggregates (Counts both Active AND Completed projects, excluding only Archived)
  const totalActiveProjectsCount = allNonArchivedProjects.length;
  const totalBudgetSum = allNonArchivedProjects.reduce((sum, p) => sum + parseFloat(p.budget || 0), 0);
  const totalDevBudgetSum = allNonArchivedProjects.reduce((sum, p) => sum + parseFloat(p.dev_budget || 0), 0);
  const totalInvoicedSum = allNonArchivedProjects.reduce((sum, p) => sum + parseFloat(p.total_invoiced || 0), 0);
  const totalPaidSum = allNonArchivedProjects.reduce((sum, p) => sum + parseFloat(p.total_paid || 0), 0);
  const totalExpensesSum = allNonArchivedProjects.reduce((sum, p) => sum + (parseFloat(p.total_manual_expenses || 0) + parseFloat(p.total_time_log_expenses || 0)), 0);

  return (
    <div className="space-y-8">
      {/* Sync Banner Notification */}
      {syncMessage && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-2xl text-xs font-bold shadow-md animate-fade-in">
          <ShieldCheck size={18} className="text-purple-600 flex-shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Top Header & Overview KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Code size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('active_dev.title')}</h1>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{t('active_dev.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Active Project</span>
          </button>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              onClick={() => setStatusTab('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusTab('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusTab === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusTab('archived')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusTab === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Archived
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('projects.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] shadow-sm"
            />
          </div>
          <button
            onClick={fetchActiveProjects}
            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
            title={t('common.refresh')}
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Active Dev Projects</span>
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 font-bold">
              <Briefcase size={18} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">{totalActiveProjectsCount}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Signed &amp; Live</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Dev Budget</span>
            <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 font-bold">
              <Code size={18} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">&euro;{totalDevBudgetSum.toLocaleString()}</span>
            <span className="text-xs font-bold text-gray-400">Total: &euro;{totalBudgetSum.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Invoiced</span>
            <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 font-bold">
              <FileText size={18} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">&euro;{totalInvoicedSum.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Paid: &euro;{totalPaidSum.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Expenses &amp; Work Spent</span>
            <span className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 font-bold">
              <DollarSign size={18} />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">&euro;{totalExpensesSum.toLocaleString()}</span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Burned</span>
          </div>
        </div>
      </div>

      {/* Projects Rows List */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xl shadow-gray-100/50 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-lg font-black text-gray-900">{t('active_dev.no_active_projects')}</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            Click &quot;New Active Project&quot; above to create a project directly or mark an existing project as Accepted.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gray-900 text-white text-xs font-bold shadow-md hover:bg-gray-800 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Create New Active Project</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Standard Projects */}
          {standardProjects.length > 0 && (
            <div className="space-y-4">
              {standardProjects.map((p) => (
                <ActiveDevRow
                  key={`${p.id}-${p.updated_at || ''}-${p.budget}-${p.dev_budget}-${p.soft_deadline || ''}-${p.hard_deadline || ''}`}
                  project={p}
                  developers={developers}
                  onSelect={setSelectedProject}
                  onToggleArchive={handleToggleArchive}
                  onSyncClickup={handleSyncClickupRow}
                  onUpdateProject={handleUpdateProject}
                  isSyncing={syncingProjectId === p.project_id}
                />
              ))}
            </div>
          )}

          {/* Mini-projects (Fixes / Updates) Collapsible Section */}
          {miniProjects.length > 0 && (
            <div className="pt-4 border-t border-gray-200/80 space-y-3">
              <div
                onClick={() => setIsMiniProjectsOpen(!isMiniProjectsOpen)}
                className="flex items-center justify-between p-3.5 bg-gray-100/90 hover:bg-gray-200/70 rounded-2xl cursor-pointer transition-all border border-gray-200/70 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-xl bg-blue-100 text-blue-700 font-bold">
                    <Layers size={16} />
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    Mini-projects &bull; Fixes &amp; Updates ({miniProjects.length})
                  </h3>
                  <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full shadow-2xs border border-gray-200">
                    Compact Rows
                  </span>
                </div>
                <button className="p-1 text-gray-500 hover:text-gray-900 rounded-lg">
                  {isMiniProjectsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {isMiniProjectsOpen && (
                <div className="space-y-2.5">
                  {miniProjects.map((p) => (
                    <MiniProjectRow
                      key={p.id}
                      project={p}
                      developers={developers}
                      onSelect={setSelectedProject}
                      onToggleArchive={handleToggleArchive}
                      onSyncClickup={handleSyncClickupRow}
                      onUpdateProject={handleUpdateProject}
                      isSyncing={syncingProjectId === p.project_id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create New Active Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-black tracking-tight">Create New Active Project</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActiveProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. E-Commerce Redesign 2026"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Client</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  >
                    <option value="">-- None --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Project Manager</label>
                  <select
                    value={newPmId}
                    onChange={(e) => setNewPmId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  >
                    <option value="">-- None --</option>
                    {pms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Primary Dev</label>
                  <select
                    value={newDevId}
                    onChange={(e) => setNewDevId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  >
                    <option value="">-- None --</option>
                    {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Budget (&euro;)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dev Budget (&euro;)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="4000"
                    value={newDevBudget}
                    onChange={(e) => setNewDevBudget(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-600 mb-1">Soft Deadline</label>
                  <input
                    type="date"
                    value={newSoftDeadline}
                    onChange={(e) => setNewSoftDeadline(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Hard Deadline *</label>
                  <input
                    type="date"
                    value={newHardDeadline}
                    onChange={(e) => setNewHardDeadline(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50 shadow-md"
                >
                  {isCreating ? 'Creating...' : 'Create Active Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Slideout */}
      {selectedProject && (
        <ActiveDevDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={() => {
            fetchActiveProjects();
            fetch(`/api/active_development.php?id=${selectedProject.id}`)
              .then(res => res.json())
              .then(data => {
                if (data.status === 'success' && data.data) setSelectedProject(data.data);
              });
          }}
          clients={clients}
          pms={pms}
          developers={developers}
        />
      )}
    </div>
  );
}
