import React, { useState, useEffect } from 'react';
import { Save, Archive, Plus, ChevronDown, ChevronUp, Calendar, Info, Briefcase, User, Palette, Monitor, DollarSign, RefreshCw, Clock, Pencil } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { ExpenseSlideout } from './ExpenseSlideout';
import { ConfirmModal } from './ConfirmModal';

interface Project {
  id: number;
  name: string;
  client_id: number | null;
  status: string;
  accepted_date: string | null;
  design_status: string;
  dev_status: string;
  pm_id: number | null;
  dev_id: number | null;
  designer_id: number | null;
  project_type_id: number | null;
  deadline: string | null;
  est_dev_time: number;
  design_start: string | null;
  design_end: string | null;
  dev_start: string | null;
  dev_end: string | null;
  complexity: number;
  total_value: number;
  already_paid: number;
  dev_budget: number;
  total_spent?: number;
  expenses_breakdown?: string;
  is_archived: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  // joined fields
  client_name?: string;
  client_color?: string;
  dev_name?: string;
  dev_color?: string;
  designer_name?: string;
  designer_color?: string;
  pm_name?: string;
  pm_color?: string;
  project_type_name?: string;
  project_type_color?: string;
}

interface SettingsEntity {
  id: number;
  type: string;
  name: string;
  color: string;
}

interface Props {
  archivedView?: boolean;
}

const statusOptions = ['New Lead', 'Price Offer Sent', 'Price Offer Accepted', 'Price Offer Rejected', 'Price Offer Closed'];
const progressOptions = ['Not Started', 'In Progress', 'Finished'];

export const ProjectsTable: React.FC<Props> = ({ archivedView = false }) => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [entities, setEntities] = useState<SettingsEntity[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState('sort_order');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  
  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPM, setFilterPM] = useState('');
  const [filterDev, setFilterDev] = useState('');
  const [expenseProjectId, setExpenseProjectId] = useState<number | null>(null);
  
  // New Project Form
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState<Partial<Project>>({
    name: '', status: 'New Lead', design_status: 'Not Started', dev_status: 'Not Started', complexity: 3
  });

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void | Promise<void>; 
    confirmText?: string;
    isDestructive?: boolean 
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  useEffect(() => {
    fetchData();
    fetchEntities();
    const handleUpdate = () => fetchData();
    window.addEventListener('projectsUpdated', handleUpdate);
    return () => window.removeEventListener('projectsUpdated', handleUpdate);
  }, [archivedView, sortColumn, sortOrder]);

  const notifyUpdate = () => {
    window.dispatchEvent(new CustomEvent('projectsUpdated'));
  };

  const fetchData = () => {
    fetch(`/api/projects.php?archived=${archivedView}&sort_by=${sortColumn}&sort_order=${sortOrder}`)
      .then(r => r.json())
      .then(res => {
        if(res.status === 'success') setProjects(res.data || []);
      });
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortColumn(col);
      setSortOrder('ASC');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return <ChevronDown size={12} className="opacity-0 group-hover:opacity-40 ml-1" />;
    return sortOrder === 'ASC' ? <ChevronUp size={12} className="ml-1 text-[#e78b01]" /> : <ChevronDown size={12} className="ml-1 text-[#e78b01]" />;
  };

  const fetchEntities = () => {
    fetch('/api/settings.php')
      .then(r => r.json())
      .then(res => {
        if(res.status === 'success') setEntities(res.data || []);
      });
  };

  const designers = entities.filter(e => e.type === 'designer');
  const developers = entities.filter(e => e.type === 'developer');
  const pms = entities.filter(e => e.type === 'pm');
  const projectTypes = entities.filter(e => e.type === 'project_type');

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditForm(p);
    setExpandedId(p.id);
  };

  const handleSave = (id: number) => {
    fetch(`/api/projects.php?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    }).then(r => r.json()).then(res => {
      if(res.status === 'success') {
        setEditingId(null);
        fetchData();
        notifyUpdate();
      }
    });
  };

  const handleCreate = () => {
    if (!newProjectForm.name) return alert(t('projects.name_required') || "Name is required");
    fetch('/api/projects.php', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProjectForm)
    }).then(r => r.json()).then(res => {
      if(res.status === 'success') {
        fetch(`/api/projects.php?id=${res.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProjectForm)
        }).then(() => {
          setIsCreating(false);
          setNewProjectForm({ name: '', status: 'New Lead', design_status: 'Not Started', dev_status: 'Not Started' });
          fetchData();
          notifyUpdate();
        });
      }
    });
  };

  const toggleArchive = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    e.preventDefault();
    const isArchiving = !p.is_archived;
    
    if (isArchiving) {
      setConfirmModal({
        isOpen: true,
        title: t('common.archive') + ' ' + t('nav.projects'),
        message: t('projects.confirm_archive') || `Are you sure you want to archive "${p.name}"? This project will be moved to the archives and hidden from the active pipeline.`,
        confirmText: t('common.archive'),
        onConfirm: () => executeArchive(p.id, true),
        isDestructive: false
      });
    } else {
      executeArchive(p.id, false);
    }
  };

  const executeArchive = (id: number, isArchived: boolean) => {
    return fetch(`/api/projects.php?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: isArchived })
    }).then(() => {
      fetchData();
      notifyUpdate();
    });
  };

  const getRowColor = (p: Partial<Project>) => {
    if (!p.deadline) return 'bg-white';
    
    // Parse deadline string "YYYY-MM-DD" as local date
    const [year, month, day] = p.deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day, 23, 59, 59);
    const currentDate = new Date();
    
    const isFinished = p.dev_status === 'Finished' && p.design_status === 'Finished';
    const isInactive = p.status === 'Price Offer Rejected' || p.status === 'Price Offer Closed';

    if (isInactive) return 'bg-white opacity-80';

    // RED HIGHLIGHT: Overdue and not finished
    if (currentDate > deadlineDate && !isFinished) {
       return 'bg-red-50/80 border-l-4 border-l-red-500 hover:bg-red-100/50';
    }

    // ORANGE HIGHLIGHT: Warning 1 week before deadline
    const warningDate = new Date(deadlineDate);
    warningDate.setDate(warningDate.getDate() - 7);
    warningDate.setHours(0, 0, 0, 0);
    
    if (currentDate >= warningDate && !isFinished) {
      return 'bg-orange-50/60 border-l-4 border-l-orange-400 hover:bg-orange-100/50';
    }
    
    return 'bg-white';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, isNew: boolean = false) => {
    const { name, value } = e.target;
    // @ts-ignore
    const updater = (prev: any) => {
      let updates = { [name]: value };
      if (name === 'status' && (value === 'Price Offer Accepted' || value === 'Price Offer Closed') && !prev.accepted_date) {
         updates.accepted_date = new Date().toISOString().split('T')[0];
      }
      return { ...prev, ...updates };
    };
    if (isNew) setNewProjectForm(updater);
    else setEditForm(updater);
  };

  const filteredProjects = projects.filter(p => {
    return p.name.toLowerCase().includes(filterName.toLowerCase()) &&
           (filterStatus === '' || p.status === filterStatus) &&
           (filterPM === '' || String(p.pm_id) === filterPM) &&
           (filterDev === '' || String(p.dev_id) === filterDev);
  });

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filters */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px] relative">
          <input 
            placeholder={t('projects.search_placeholder')} 
            className="w-full bg-gray-50 text-gray-900 rounded-2xl px-5 py-3 border border-gray-100 focus:bg-white transition-all outline-none"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
          />
        </div>
        <select 
          className="bg-gray-50 text-gray-700 rounded-2xl px-5 py-3 border border-gray-100 outline-none hover:bg-white transition-all cursor-pointer font-medium"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">{t('projects.all_statuses') || 'All Statuses'}</option>
          {statusOptions.map(opt => <option key={opt} value={opt}>{t(`leads.status_${opt.toLowerCase().replace(/ /g, '_')}`) || opt}</option>)}
        </select>
        <select 
          className="bg-gray-50 text-gray-700 rounded-2xl px-5 py-3 border border-gray-100 outline-none hover:bg-white transition-all cursor-pointer font-medium"
          value={filterPM}
          onChange={e => setFilterPM(e.target.value)}
        >
          <option value="">{t('projects.all_pms') || 'All PMs'}</option>
          {pms.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
        </select>
        <select 
          className="bg-gray-50 text-gray-700 rounded-2xl px-5 py-3 border border-gray-100 outline-none hover:bg-white transition-all cursor-pointer font-medium"
          value={filterDev}
          onChange={e => setFilterDev(e.target.value)}
        >
          <option value="">{t('projects.all_devs') || 'All Devs'}</option>
          {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button 
          onClick={fetchData}
          className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 hover:text-[var(--color-primary)] transition-all hover:bg-white active:scale-90"
          title={t('common.refresh')}
        >
          <RefreshCw size={20} />
        </button>
        {!isCreating && !archivedView && (
          <button onClick={() => setIsCreating(true)} className="bg-[var(--color-secondary)] hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-95 ml-auto">
            <Plus size={20} /> {t('projects.new_project')}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden overflow-x-auto md:overflow-visible">
        <table className="w-full text-left text-sm text-gray-600 border-collapse table-auto md:table-fixed">
          <thead className="hidden md:table-header-group bg-[#f8fafc] border-b border-gray-100 uppercase text-[11px] tracking-[0.1em] font-bold text-gray-400 sticky top-[-32px] z-30 shadow-sm">
            <tr>
              <th className="p-5 w-12 text-center"></th>
              <th className="p-5 md:w-1/4 cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('name')}>
                <div className="flex items-center">{t('projects.project_info') || 'Project Info'} <SortIcon col="name" /></div>
              </th>
              <th className="p-5 w-32 text-center cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('deadline')}>
                <div className="flex items-center justify-center">{t('projects.deadline')} <SortIcon col="deadline" /></div>
              </th>
              <th className="p-5 w-44 cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center">{t('projects.workflow') || 'Workflow'} <SortIcon col="status" /></div>
              </th>
              <th className="p-5 w-48">{t('projects.team') || 'Team'}</th>
              <th className="p-5 w-40 text-right cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('total_value')}>
                <div className="flex items-center justify-end">{t('projects.financials') || 'Financials'} <SortIcon col="total_value" /></div>
              </th>
              <th className="p-5 w-24 text-center">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 block md:table-row-group">
            {isCreating && !archivedView && (
              <tr className="bg-gray-50/50 block md:table-row border-b md:border-none p-4 md:p-0">
                <td className="hidden md:table-cell p-5"></td>
                <td className="p-4 md:p-5 block md:table-cell">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('projects.title') || 'Project Title'}</div>
                  <input name="name" placeholder={t('projects.title') || 'Project Title'} className="bg-white border-gray-200 text-gray-900 rounded-xl px-4 py-2 w-full border text-base font-bold shadow-sm" value={newProjectForm.name || ''} onChange={e => handleChange(e, true)} />
                  <select name="status" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs mt-2" value={newProjectForm.status || ''} onChange={e => handleChange(e, true)}>
                    {statusOptions.map(opt => <option key={opt} value={opt}>{t(`leads.status_${opt.toLowerCase().replace(/ /g, '_')}`) || opt}</option>)}
                  </select>
                </td>
                <td className="p-4 md:p-5 text-left md:text-center block md:table-cell border-t md:border-none">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('common.created')}</div>
                  <input type="date" name="accepted_date" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full md:w-auto border text-xs shadow-sm" value={newProjectForm.accepted_date || ''} onChange={e => handleChange(e, true)} />
                </td>
                <td className="p-4 md:p-5 space-y-3 block md:table-cell border-t md:border-none">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('projects.workflow')}</div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400">{t('common.design_tag') || 'DESIGN'}</label>
                    <select name="design_status" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs" value={newProjectForm.design_status || ''} onChange={e => handleChange(e, true)}>
                      {progressOptions.map(opt => <option key={opt} value={opt}>{t(`projects.status_${opt.toLowerCase().replace(/ /g, '_')}`) || opt}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400">{t('common.dev_tag') || 'DEV'}</label>
                    <select name="dev_status" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs" value={newProjectForm.dev_status || ''} onChange={e => handleChange(e, true)}>
                      {progressOptions.map(opt => <option key={opt} value={opt}>{t(`projects.status_${opt.toLowerCase().replace(/ /g, '_')}`) || opt}</option>)}
                    </select>
                  </div>
                </td>
                <td className="p-4 md:p-5 flex flex-col gap-2 block md:table-cell border-t md:border-none">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('projects.team')}</div>
                  <select name="pm_id" className="bg-white border-gray-200 text-gray-700 text-xs rounded-xl px-4 py-2 border w-full" value={newProjectForm.pm_id || ''} onChange={e => handleChange(e, true)}>
                    <option value="">{t('projects.pm')}</option>
                    {pms.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <select name="designer_id" className="bg-white border-gray-200 text-gray-700 text-xs rounded-xl px-4 py-2 border w-full" value={newProjectForm.designer_id || ''} onChange={e => handleChange(e, true)}>
                    <option value="">{t('projects.designer')}</option>
                    {designers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <select name="dev_id" className="bg-white border-gray-200 text-gray-700 text-xs rounded-xl px-4 py-2 border w-full" value={newProjectForm.dev_id || ''} onChange={e => handleChange(e, true)}>
                    <option value="">{t('projects.developer')}</option>
                    {developers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </td>
                <td className="p-4 md:p-5 space-y-4 block md:table-cell border-t md:border-none">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">{t('projects.financials') || 'Financials'}</label>
                    <input type="number" name="total_value" placeholder={t('projects.total_cost_placeholder') || "Total Value €"} className="bg-white border-gray-200 text-gray-900 rounded-xl px-3 py-2 w-full border text-sm font-bold" value={newProjectForm.total_value || ''} onChange={e => handleChange(e, true)} />
                    <input type="number" name="already_paid" placeholder={t('projects.paid') || "Already Paid €"} className="bg-white border-gray-200 text-gray-500 rounded-xl px-3 py-2 w-full border text-xs" value={newProjectForm.already_paid || ''} onChange={e => handleChange(e, true)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">{t('projects.complexity')} (1-7)</label>
                    <select name="complexity" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs font-bold" value={newProjectForm.complexity || 3} onChange={e => handleChange(e, true)}>
                      {[1,2,3,4,5,6,7].map(num => <option key={num} value={num}>{t('projects.level')} {num}</option>)}
                    </select>
                  </div>
                </td>
                <td className="p-4 md:p-5 text-center block md:table-cell border-t md:border-none">
                  <div className="flex justify-center gap-4">
                    <button onClick={handleCreate} className="flex-1 md:flex-none p-4 md:p-3 bg-[#00b800] hover:bg-green-600 rounded-2xl text-white shadow-lg transition-all font-bold flex items-center justify-center gap-2">
                      <Save size={20} /> <span className="md:hidden text-xs font-black uppercase tracking-widest">{t('projects.new_project')}</span>
                    </button>
                    <button onClick={() => setIsCreating(false)} className="px-6 py-4 md:p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-400 transition-all font-blacks md:hidden" title={t('common.cancel')}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {filteredProjects.map((p) => {
              const isEditing = editingId === p.id;
              const isExpanded = expandedId === p.id;
              const rowColorClass = getRowColor(p);

              return (
                <React.Fragment key={p.id}>
                  <tr className={`group transition-all block md:table-row ${rowColorClass} ${isExpanded && !rowColorClass.includes('border-l-') ? 'bg-slate-50' : ''}`}>
                    <td className={`p-3 md:p-5 text-left md:text-center block md:table-cell border-b border-gray-300 ${rowColorClass.includes('border-l-') ? 'border-l-4' : ''} ${rowColorClass.includes('border-l-orange-400') ? 'border-l-orange-400' : rowColorClass.includes('border-l-red-500') ? 'border-l-red-500' : ''}`}>
                      <div className="flex items-center justify-between md:justify-center">
                        <button onClick={() => toggleExpand(p.id)} className="p-2.5 rounded-xl bg-gray-50 md:bg-transparent hover:bg-gray-100 text-gray-500 md:text-gray-400 transition-all flex items-center gap-2">
                          <span className="md:hidden text-[10px] font-black uppercase tracking-wider">{t('projects.slideout.details')}</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <div className="md:hidden flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={(e) => toggleArchive(e, p)} 
                            className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl"
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 md:p-5 block md:table-cell border-b border-gray-300">
                      {isEditing ? (
                        <input name="name" className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2 w-full font-bold text-lg focus:bg-white transition-all shadow-sm" value={editForm.name || ''} onChange={handleChange} autoFocus />
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <div 
                            className="flex items-center gap-2 cursor-pointer group/name" 
                            onClick={() => startEdit(p)}
                            title="Quick Edit Name & Details"
                          >
                            <span className="font-bold text-gray-900 text-lg tracking-tight group-hover/name:text-[#e78b01] transition-colors">{p.name}</span>
                            <Info size={14} className="text-gray-300 opacity-0 group-hover/name:opacity-100 transition-all transform group-hover/name:translate-x-1" />
                            {p.pm_color && (
                              <div 
                                className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" 
                                style={{ backgroundColor: p.pm_color }}
                                title={`PM: ${p.pm_name}`}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const getStatusColor = (s: string) => {
                                switch(s) {
                                  case 'New Lead': return 'bg-blue-50 text-blue-600 border-blue-100';
                                  case 'Price Offer Sent': return 'bg-amber-50 text-amber-600 border-amber-100';
                                  case 'Price Offer Accepted': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                  case 'Price Offer Rejected': return 'bg-red-50 text-red-600 border-red-100';
                                  case 'Price Offer Closed': return 'bg-slate-50 text-slate-600 border-slate-100';
                                  default: return 'bg-gray-50 text-gray-500 border-gray-100';
                                }
                              };
                              return (
                                <select 
                                  className={`text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-[0.1em] border transition-all cursor-pointer outline-none ${getStatusColor(p.status)} hover:shadow-sm`}
                                  value={p.status}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    fetch(`/api/projects.php?id=${p.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: val })
                                    }).then(() => {
                                      fetchData();
                                      notifyUpdate();
                                    });
                                  }}
                                >
                                  {statusOptions.map(opt => <option key={opt} value={opt} className="bg-white text-gray-900 uppercase font-bold">{t(`leads.status_${opt.toLowerCase().replace(/ /g, '_')}`) || opt}</option>)}
                                </select>
                              );
                            })()}
                            {p.project_type_name && (
                              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.project_type_color }} title={p.project_type_name}></span>
                            )}
                            {p.updated_at && (
                                <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                    <Clock size={11} className="opacity-40" />
                                    {new Date(p.updated_at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-4 md:p-5 text-left md:text-center block md:table-cell border-b border-gray-300 border-t border-gray-300 md:border-t-0">
                        <div className="flex items-center justify-between md:flex-col md:items-center">
                          <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('projects.deadline')}</span>
                          {isEditing ? (
                            <input type="date" name="deadline" className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-2 py-1.5 w-40 md:w-full text-xs font-bold" value={editForm.deadline || ''} onChange={handleChange} />
                          ) : (
                            <div className="flex items-center gap-2 md:flex-col md:items-center text-gray-600 cursor-pointer" onClick={() => startEdit(p)}>
                              <Calendar size={14} className="opacity-40 text-[#e78b01]" />
                              <span className="text-sm font-black tracking-tight">{p.deadline ? new Date(p.deadline).toLocaleDateString('sk-SK') : '-'}</span>
                            </div>
                          )}
                        </div>
                    </td>

                    <td className="p-4 md:p-5 space-y-2 block md:table-cell border-b border-gray-300 border-t border-gray-300 md:border-t-0">
                      <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('projects.workflow')}</div>
                      <div className="flex flex-col gap-1 cursor-pointer" onClick={() => startEdit(p)}>
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{t('common.design_tag') || 'Design'}</span>
                          {!isEditing && <span className={`text-[10px] font-bold ${p.design_status === 'Finished' ? 'text-green-500' : 'text-gray-400'}`}>{t(`projects.status_${p.design_status.toLowerCase().replace(/ /g, '_')}`) || p.design_status}</span>}
                        </div>
                        {isEditing ? (
                          <select name="design_status" className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-2 py-1.5 w-full text-xs" value={editForm.design_status || ''} onChange={handleChange}>
                            {progressOptions.map(opt => <option key={opt} value={opt}>{t(`projects.status_${opt.toLowerCase().replace(/ /g, '_')}`) || opt}</option>)}
                          </select>
                        ) : (
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${p.design_status === 'Finished' ? 'w-full bg-green-500' : p.design_status === 'In Progress' ? 'w-1/2 bg-[#e78b01]' : 'w-0'}`}></div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{t('common.dev_tag') || 'Development'}</span>
                          {!isEditing && <span className={`text-[10px] font-bold ${p.dev_status === 'Finished' ? 'text-green-500' : 'text-gray-400'}`}>{t(`projects.status_${p.dev_status.toLowerCase().replace(/ /g, '_')}`) || p.dev_status}</span>}
                        </div>
                        {isEditing ? (
                          <select name="dev_status" className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-2 py-1.5 w-full text-xs" value={editForm.dev_status || ''} onChange={handleChange}>
                            {progressOptions.map(opt => <option key={opt} value={opt}>{t(`projects.status_${opt.toLowerCase().replace(/ /g, '_')}`) || opt}</option>)}
                          </select>
                        ) : (
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${p.dev_status === 'Finished' ? 'w-full bg-green-500' : p.dev_status === 'In Progress' ? 'w-1/2 bg-[#e78b01]' : 'w-0'}`}></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 md:p-5 block md:table-cell border-b border-gray-300 border-t border-gray-300 md:border-t-0">
                      <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('projects.team')}</div>
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <select name="pm_id" className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-1.5" value={editForm.pm_id || ''} onChange={handleChange}>
                            <option value="">{t('projects.pm') || 'PM'}</option>
                            {pms.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                          <div className="bg-white rounded-lg p-2 border border-gray-100 flex flex-col gap-1">
                            <select name="designer_id" className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-1.5" value={editForm.designer_id || ''} onChange={handleChange}>
                              <option value="">{t('projects.designer') || 'Designer'}</option>
                              {designers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            {editForm.designer_id && (
                              <div className="flex items-center gap-1">
                                <input type="date" name="design_start" className="bg-gray-50 border border-gray-200 text-gray-700 rounded text-[10px] px-1 py-1 w-full" value={editForm.design_start ? editForm.design_start.split(' ')[0] : ''} onChange={handleChange} title="Design Start" />
                                <span className="text-[10px] text-gray-300">-</span>
                                <input type="date" name="design_end" className="bg-gray-50 border border-gray-200 text-gray-700 rounded text-[10px] px-1 py-1 w-full" value={editForm.design_end ? editForm.design_end.split(' ')[0] : ''} onChange={handleChange} title="Design End" />
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-white rounded-lg p-2 border border-gray-100 flex flex-col gap-1">
                            <select name="dev_id" className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-1.5" value={editForm.dev_id || ''} onChange={handleChange}>
                              <option value="">{t('projects.developer') || 'Dev'}</option>
                              {developers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            {editForm.dev_id && (
                              <div className="flex items-center gap-1">
                                <input type="date" name="dev_start" className="bg-gray-50 border border-gray-200 text-gray-700 rounded text-[10px] px-1 py-1 w-full" value={editForm.dev_start ? editForm.dev_start.split(' ')[0] : ''} onChange={handleChange} title="Dev Start" />
                                <span className="text-[10px] text-gray-300">-</span>
                                <input type="date" name="dev_end" className="bg-gray-50 border border-gray-200 text-gray-700 rounded text-[10px] px-1 py-1 w-full" value={editForm.dev_end ? editForm.dev_end.split(' ')[0] : ''} onChange={handleChange} title="Dev End" />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 cursor-pointer" onClick={() => startEdit(p)}>
                          {p.pm_name && (
                            <span className="bg-blue-50 text-blue-600 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5" title={t('projects.pm')}>
                              <User size={12} /> {p.pm_name}
                            </span>
                          )}
                          {p.designer_name && (
                            <span className="bg-purple-50 text-purple-600 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-purple-100 flex items-center gap-1.5" title={t('projects.designer')}>
                              <Palette size={12} /> {p.designer_name}
                            </span>
                          )}
                          {p.dev_name && (
                            <span className="bg-emerald-50 text-emerald-600 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5" title={t('projects.developer')}>
                              <Monitor size={12} /> {p.dev_name}
                            </span>
                          )}
                          {!p.pm_name && !p.designer_name && !p.dev_name && <span className="text-gray-300 italic text-xs">{t('leads.unassigned')}</span>}
                        </div>
                      )}
                    </td>

                    <td className="p-4 md:p-5 text-left md:text-right block md:table-cell border-b border-gray-300 border-t border-gray-300 md:border-t-0">
                      <div className="flex items-center justify-between md:flex-col md:items-end">
                        <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('projects.financials')}</span>
                        {isEditing ? (
                          <div className="flex flex-col gap-1 w-40 md:w-full">
                            <input type="number" name="total_value" className="bg-gray-50 border border-gray-200 text-gray-900 text-right rounded-xl px-3 py-1.5 w-full text-sm font-bold" value={editForm.total_value || 0} onChange={handleChange} />
                            <input type="number" name="already_paid" className="bg-gray-50 border border-gray-200 text-gray-400 text-right rounded-xl px-3 py-1.5 w-full text-xs" value={editForm.already_paid || 0} onChange={handleChange} />
                          </div>
                        ) : (
                          <div 
                            className="flex items-center justify-end gap-3 md:gap-4 cursor-pointer"
                            onClick={() => startEdit(p)}
                          >
                            {(() => {
                              const devBudget = Number(p.dev_budget) || 0;
                              const totalSpent = Number(p.total_spent) || 0;
                              const percentBurned = devBudget > 0 ? Math.round((totalSpent / devBudget) * 100) : 0;
                              let expensesBreakdown: { color: string; cost: number }[] = [];
                              try { if (p.expenses_breakdown) expensesBreakdown = JSON.parse(p.expenses_breakdown); } catch (e) {}
                              return (
                                <div className="flex flex-col items-end flex-shrink-0" title="Budget Burn Rate">
                                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex transform translate-y-0.5">
                                    {devBudget > 0 ? expensesBreakdown.map((exp, i) => (
                                      <div key={i} style={{ width: `${(exp.cost / devBudget) * 100}%`, backgroundColor: exp.color }} className="h-full border-r border-[#ffffff20] last:border-0" />
                                    )) : <div className="w-full h-full bg-gray-100" />}
                                  </div>
                                  <span className={`text-[9px] font-black mt-1 ${percentBurned > 100 ? 'text-red-500' : 'text-gray-400'}`}>{percentBurned}% {t('projects.burned')}</span>
                                </div>
                              );
                            })()}
                            <div className="flex flex-col text-right">
                              <span className="text-gray-900 font-black text-xl md:text-xl block leading-none tracking-tight">€{Number(p.total_value).toLocaleString()}</span>
                              {Number(p.already_paid) > 0 && <span className="text-green-500 text-[11px] font-bold mt-1.5 uppercase tracking-wider">€{Number(p.already_paid).toLocaleString()} {t('projects.paid')}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4 md:p-5 text-center block md:table-cell border-b border-gray-300 border-t border-gray-300 md:border-t-0">
                      <div className="hidden md:flex justify-center gap-2">
                        {isEditing ? (
                          <button onClick={() => handleSave(p.id)} className="p-3 bg-[#00b800] hover:bg-green-600 text-white rounded-xl shadow-lg transition-all transform active:scale-95">
                            <Save size={18} />
                          </button>
                        ) : (
                          <>
                            <button 
                              type="button"
                              onClick={() => startEdit(p)} 
                              className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-500 rounded-xl transition-all shadow-sm" 
                              title="Edit Details"
                            >
                               <Pencil size={18} />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => toggleArchive(e, p)} 
                              className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-500 rounded-xl transition-all shadow-sm" 
                              title={p.is_archived ? "Unarchive" : "Archive"}
                            >
                               <Archive size={18} />
                            </button>
                          </>
                        )}
                      </div>
                      {/* Mobile Actions (Visible Only in Editing) */}
                      {isEditing && (
                         <div className="md:hidden flex justify-center mt-2">
                            <button onClick={() => handleSave(p.id)} className="w-full flex justify-center items-center gap-2 p-3 bg-[#00b800] text-white rounded-2xl shadow-lg font-bold">
                              <Save size={18} /> SAVE CHANGES
                            </button>
                         </div>
                      )}
                    </td>
                  </tr>

                  {/* Accordion Row / Expanded View */}
                  {isExpanded && (
                    <tr className={`${rowColorClass} border-b border-gray-300 block md:table-row ${isExpanded && !rowColorClass.includes('border-l-') ? 'bg-slate-50' : ''}`}>
                      <td colSpan={7} className={`p-4 md:p-8 pt-0 block md:table-cell border-b border-gray-300 ${rowColorClass.includes('border-l-4') ? 'border-l-4' : ''} ${rowColorClass.includes('border-l-orange-400') ? 'border-l-orange-400' : rowColorClass.includes('border-l-red-500') ? 'border-l-red-500' : (isExpanded && !rowColorClass.includes('border-l-') ? 'border-l-4 border-l-[#e78b01]' : '')}`}>
                        <div className="bg-white/60 border border-gray-100 rounded-[28px] p-5 md:p-8 shadow-inner-sm animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            {/* Project Type & Complexity */}
                            <div className="space-y-6">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Briefcase size={14} /> {t('projects.metadata') || 'Project Metadata'}
                              </h4>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black text-gray-500 ml-1 uppercase tracking-wider">{t('projects.complexity') || 'WORK COMPLEXITY'}</label>
                                  {isEditing ? (
                                    <div className="flex items-center gap-4">
                                      <input type="range" name="complexity" min="1" max="7" className="flex-1 accent-[#e78b01]" value={editForm.complexity || 1} onChange={handleChange} />
                                      <div className="flex flex-col items-center">
                                        <span className="font-bold text-[#e78b01] bg-orange-50 px-3 py-1 rounded-lg">{t('projects.level')} {editForm.complexity}</span>
                                        {(() => {
                                          const x = Number(editForm.complexity) || 1;
                                          return <span className="text-[10px] font-black text-orange-300 mt-1 uppercase">{Math.round((25/9)*Math.pow(x,2)+(25/9)*x+400/9)} PTS</span>;
                                        })()}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {[1, 2, 3, 4, 5, 6, 7].map(level => (
                                        <div key={level} className={`h-2 flex-1 rounded-full ${level <= (p.complexity || 0) ? 'bg-[#e78b01]' : 'bg-gray-100 opacity-50'}`}></div>
                                      ))}
                                      <div className="flex flex-col ml-3">
                                        <span className="text-xs font-bold text-gray-500">{t('projects.level_short') || 'Lvl'} {p.complexity}</span>
                                        {(() => {
                                           const x = Number(p.complexity) || 1;
                                           return <span className="text-[10px] font-black text-gray-300 uppercase leading-none">{Math.round((25/9)*Math.pow(x,2)+(25/9)*x+400/9)}pts impact</span>;
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black text-gray-500 ml-1 uppercase tracking-wider">{t('projects.types') || 'PROJECT TYPE'}</label>
                                  {isEditing ? (
                                    <select name="project_type_id" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm" value={editForm.project_type_id || ''} onChange={handleChange}>
                                      <option value="">{t('projects.select_category') || 'Select Category...'}</option>
                                      {projectTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                                    </select>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.project_type_color }}></div>
                                      <span className="font-bold text-gray-800">{p.project_type_name || t('projects.uncategorized')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Scheduling & Intervals */}
                            <div className="space-y-6">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar size={14} /> {t('calendar.milestones') || 'Milestones'}
                              </h4>
                              <div className="space-y-5">
                                <div className="space-y-2">
                                  <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">{t('projects.design_phase')} (From - To)</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input 
                                      type="date" 
                                      name="design_start" 
                                      className={`bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs ${!isEditing ? 'pointer-events-none opacity-60' : ''}`}
                                      value={(isEditing ? editForm.design_start : p.design_start) || ''}
                                      onChange={handleChange}
                                    />
                                    <input 
                                      type="date" 
                                      name="design_end" 
                                      className={`bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs ${!isEditing ? 'pointer-events-none opacity-60' : ''}`}
                                      value={(isEditing ? editForm.design_end : p.design_end) || ''}
                                      onChange={handleChange}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">{t('projects.dev_phase')} (From - To)</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input 
                                      type="date" 
                                      name="dev_start" 
                                      className={`bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs ${!isEditing ? 'pointer-events-none opacity-60' : ''}`}
                                      value={(isEditing ? editForm.dev_start : p.dev_start) || ''}
                                      onChange={handleChange}
                                    />
                                    <input 
                                      type="date" 
                                      name="dev_end" 
                                      className={`bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs ${!isEditing ? 'pointer-events-none opacity-60' : ''}`}
                                      value={(isEditing ? editForm.dev_end : p.dev_end) || ''}
                                      onChange={handleChange}
                                    />
                                  </div>
                                </div>
                                <div className="pt-2">
                                  <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">{t('projects.hard_deadline')}</label>
                                  <input 
                                    type="date" 
                                    name="deadline" 
                                    className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs mt-1 ${!isEditing ? 'pointer-events-none opacity-60 font-black' : ''}`}
                                    value={(isEditing ? editForm.deadline : p.deadline) || ''}
                                    onChange={handleChange}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Internal Notes */}
                            <div className="space-y-6">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Pencil size={14} /> {t('leads.activities.notes')}
                              </h4>
                              <textarea 
                                name="notes"
                                placeholder={t('projects.notes_placeholder') || "Add project-specific details or internal comments..."}
                                className={`w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm h-40 resize-none outline-none focus:bg-white transition-all ${!isEditing ? 'pointer-events-none' : ''}`}
                                value={(isEditing ? editForm.notes : p.notes) || ''}
                                onChange={handleChange}
                              />

                              {/* Dev Budget & Expenses */}
                              <div className="pt-4 border-t border-gray-100 space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <DollarSign size={14} /> {t('projects.dev_budget') || 'Development Budget'}
                                </h4>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex-1">
                                    <span className="text-xs text-gray-400 font-bold">€</span>
                                    <input
                                      type="number"
                                      name="dev_budget"
                                      placeholder="0"
                                      className={`bg-transparent text-sm font-bold text-gray-900 outline-none w-full ${!isEditing ? 'pointer-events-none' : ''}`}
                                      value={(isEditing ? editForm.dev_budget : p.dev_budget) || 0}
                                      onChange={handleChange}
                                    />
                                  </div>
                                  <button
                                    onClick={() => setExpenseProjectId(p.id)}
                                    className="bg-[#e78b01] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                  >
                                    <DollarSign size={16} /> {t('nav.expenses')}
                                  </button>
                                </div>
                                {(() => {
                                  const totalValue = Number(p.total_value) || 0;
                                  const devBudget = Number(p.dev_budget) || 0;
                                  const totalSpent = Number(p.total_spent) || 0;
                                  
                                  const targetProfit = totalValue - devBudget;
                                  const targetProfitPct = totalValue > 0 ? ((targetProfit / totalValue) * 100).toFixed(1) : '0.0';
                                  
                                  const currentProfit = totalValue - totalSpent;
                                  const currentProfitPct = totalValue > 0 ? ((currentProfit / totalValue) * 100).toFixed(1) : '0.0';

                                  return (
                                    <div className="grid grid-cols-2 gap-3 mt-4 animate-fade-in delay-75">
                                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-sm">{t('projects.profit') || 'Target Profit'}</p>
                                        <p className="text-sm font-black text-gray-900">€{targetProfit.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-gray-400">{targetProfitPct}% {t('projects.margin') || 'margin'}</p>
                                      </div>
                                      <div className={`p-3 rounded-xl border flex flex-col justify-center transition-colors ${currentProfit < targetProfit ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${currentProfit < targetProfit ? 'text-red-400' : 'text-green-500'}`}>{t('projects.current_profit') || 'Current Profit'}</p>
                                        <p className={`text-sm font-black ${currentProfit < targetProfit ? 'text-red-600' : 'text-green-600'}`}>€{currentProfit.toLocaleString()}</p>
                                        <p className={`text-[10px] font-bold ${currentProfit < targetProfit ? 'text-red-500' : 'text-green-600'}`}>{currentProfitPct}% {t('projects.margin') || 'margin'}</p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expense Slideout */}
      {expenseProjectId && (() => {
        const proj = projects.find(p => p.id === expenseProjectId);
        if (!proj) return null;
        return (
          <ExpenseSlideout 
            projectId={proj.id} 
            projectName={proj.name} 
            devBudget={proj.dev_budget} 
            onClose={() => setExpenseProjectId(null)} 
            onBudgetChange={() => {
              fetchData();
              notifyUpdate();
            }} 
          />
        );
      })()}
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
};
