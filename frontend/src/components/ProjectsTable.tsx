import React, { useState, useEffect } from 'react';
import { Save, Archive, Plus, ChevronDown, ChevronUp, Calendar, Info, Briefcase, User, Palette, Monitor, Pencil, DollarSign } from 'lucide-react';
import { ExpenseSlideout } from './ExpenseSlideout';

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
  is_archived: boolean;
  notes: string | null;
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
  const [expenseProjectId, setExpenseProjectId] = useState<number | null>(null);
  
  // New Project Form
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState<Partial<Project>>({
    name: '', status: 'New Lead', design_status: 'Not Started', dev_status: 'Not Started', complexity: 3
  });

  useEffect(() => {
    fetchData();
    fetchEntities();
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
    if (!newProjectForm.name) return alert("Name is required");
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

  const toggleArchive = (p: Project) => {
    const isArchiving = !p.is_archived;
    if (isArchiving && !confirm(`Are you sure you want to archive "${p.name}"?`)) return;
    
    fetch(`/api/projects.php?id=${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: isArchiving })
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

    // ORANGE HIGHLIGHT: Approaching deadline (deadline - est_dev_time)
    const warningDate = new Date(deadlineDate);
    warningDate.setDate(warningDate.getDate() - (p.est_dev_time || 0));
    warningDate.setHours(0, 0, 0, 0); // Start of warning day
    
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
           (filterPM === '' || String(p.pm_id) === filterPM);
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
            placeholder="Search projects by name..." 
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
          <option value="">All Statuses</option>
          {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select 
          className="bg-gray-50 text-gray-700 rounded-2xl px-5 py-3 border border-gray-100 outline-none hover:bg-white transition-all cursor-pointer font-medium"
          value={filterPM}
          onChange={e => setFilterPM(e.target.value)}
        >
          <option value="">All PMs</option>
          {pms.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
        </select>
        {!isCreating && !archivedView && (
          <button onClick={() => setIsCreating(true)} className="bg-[#00b800] hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-95 ml-auto">
            <Plus size={20} /> New Project
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden overflow-x-auto md:overflow-visible">
        <table className="w-full text-left text-sm text-gray-600 border-collapse table-auto md:table-fixed">
          <thead className="hidden md:table-header-group bg-[#f8fafc] border-b border-gray-100 uppercase text-[11px] tracking-[0.1em] font-bold text-gray-400">
            <tr>
              <th className="p-5 w-12 text-center"></th>
              <th className="p-5 md:w-1/4 cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('name')}>
                <div className="flex items-center">Project Info <SortIcon col="name" /></div>
              </th>
              <th className="p-5 w-32 text-center cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('deadline')}>
                <div className="flex items-center justify-center">Deadline <SortIcon col="deadline" /></div>
              </th>
              <th className="p-5 w-44 cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center">Workflow <SortIcon col="status" /></div>
              </th>
              <th className="p-5 w-48">Team</th>
              <th className="p-5 w-40 text-right cursor-pointer group hover:text-gray-900 transition-colors" onClick={() => handleSort('total_value')}>
                <div className="flex items-center justify-end">Financials <SortIcon col="total_value" /></div>
              </th>
              <th className="p-5 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 block md:table-row-group">
            {isCreating && !archivedView && (
              <tr className="bg-gray-50/50 block md:table-row border-b md:border-none p-4 md:p-0">
                <td className="hidden md:table-cell p-5"></td>
                <td className="p-4 md:p-5 block md:table-cell">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Project Name</div>
                  <input name="name" placeholder="Project Name" className="bg-white border-gray-200 text-gray-900 rounded-xl px-4 py-2 w-full border text-base font-bold shadow-sm" value={newProjectForm.name || ''} onChange={e => handleChange(e, true)} />
                  <select name="status" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs mt-2" value={newProjectForm.status || ''} onChange={e => handleChange(e, true)}>
                    {statusOptions.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                </td>
                <td className="p-4 md:p-5 text-left md:text-center block md:table-cell border-t md:border-none">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Accepted date</div>
                  <input type="date" name="accepted_date" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full md:w-auto border text-xs shadow-sm" value={newProjectForm.accepted_date || ''} onChange={e => handleChange(e, true)} />
                </td>
                <td className="p-4 md:p-5 space-y-3 block md:table-cell border-t md:border-none">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Workflow Status</div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400">DESIGN</label>
                    <select name="design_status" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs" value={newProjectForm.design_status || ''} onChange={e => handleChange(e, true)}>
                      {progressOptions.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400">DEV</label>
                    <select name="dev_status" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs" value={newProjectForm.dev_status || ''} onChange={e => handleChange(e, true)}>
                      {progressOptions.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                </td>
                <td className="p-4 md:p-5 flex flex-col gap-2 block md:table-cell border-t md:border-none">
                  <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Team Assignment</div>
                  <select name="pm_id" className="bg-white border-gray-200 text-gray-700 text-xs rounded-xl px-4 py-2 border w-full" value={newProjectForm.pm_id || ''} onChange={e => handleChange(e, true)}>
                    <option value="">Project Manager</option>
                    {pms.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <select name="designer_id" className="bg-white border-gray-200 text-gray-700 text-xs rounded-xl px-4 py-2 border w-full" value={newProjectForm.designer_id || ''} onChange={e => handleChange(e, true)}>
                    <option value="">Designer</option>
                    {designers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <select name="dev_id" className="bg-white border-gray-200 text-gray-700 text-xs rounded-xl px-4 py-2 border w-full" value={newProjectForm.dev_id || ''} onChange={e => handleChange(e, true)}>
                    <option value="">Developer</option>
                    {developers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </td>
                <td className="p-4 md:p-5 space-y-4 block md:table-cell border-t md:border-none">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Financials</label>
                    <input type="number" name="total_value" placeholder="Total Value €" className="bg-white border-gray-200 text-gray-900 rounded-xl px-3 py-2 w-full border text-sm font-bold" value={newProjectForm.total_value || ''} onChange={e => handleChange(e, true)} />
                    <input type="number" name="already_paid" placeholder="Already Paid €" className="bg-white border-gray-200 text-gray-500 rounded-xl px-3 py-2 w-full border text-xs" value={newProjectForm.already_paid || ''} onChange={e => handleChange(e, true)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Complexity (1-7)</label>
                    <select name="complexity" className="bg-white border-gray-200 text-gray-700 rounded-xl px-3 py-2 w-full border text-xs font-bold" value={newProjectForm.complexity || 3} onChange={e => handleChange(e, true)}>
                      {[1,2,3,4,5,6,7].map(num => <option key={num} value={num}>Level {num}</option>)}
                    </select>
                  </div>
                </td>
                <td className="p-4 md:p-5 text-center block md:table-cell border-t md:border-none">
                  <div className="flex justify-center gap-4">
                    <button onClick={handleCreate} className="flex-1 md:flex-none p-4 md:p-3 bg-[#00b800] hover:bg-green-600 rounded-2xl text-white shadow-lg transition-all font-bold flex items-center justify-center gap-2">
                      <Save size={20} /> <span className="md:hidden">CREATE PROJECT</span>
                    </button>
                    <button onClick={() => setIsCreating(false)} className="px-6 py-4 md:p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-400 transition-all font-blacks md:hidden" title="Cancel">
                      CANCEL
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
                  <tr className={`group transition-all block md:table-row ${rowColorClass} ${isExpanded && !rowColorClass.includes('border-l-') ? 'bg-slate-50 border-l-4 border-l-[#e78b01]' : (rowColorClass.includes('border-l-') ? '' : 'border-b border-gray-50')}`}>
                    <td className="p-3 md:p-5 text-left md:text-center block md:table-cell">
                      <div className="flex items-center justify-between md:justify-center">
                        <button onClick={() => toggleExpand(p.id)} className="p-2.5 rounded-xl bg-gray-50 md:bg-transparent hover:bg-gray-100 text-gray-500 md:text-gray-400 transition-all flex items-center gap-2">
                          <span className="md:hidden text-[10px] font-black uppercase tracking-wider">Details</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <div className="md:hidden flex items-center gap-2">
                          <button onClick={() => toggleArchive(p)} className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl"><Archive size={16} /></button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 md:p-5 block md:table-cell">
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
                            <Pencil size={14} className="text-gray-300 opacity-0 group-hover/name:opacity-100 transition-all transform group-hover/name:translate-x-1" />
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
                                  {statusOptions.map(opt => <option key={opt} value={opt} className="bg-white text-gray-900 uppercase font-bold">{opt}</option>)}
                                </select>
                              );
                            })()}
                            {p.project_type_name && (
                              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.project_type_color }} title={p.project_type_name}></span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-4 md:p-5 text-left md:text-center block md:table-cell border-t border-gray-50 md:border-none">
                        <div className="flex items-center justify-between md:flex-col md:items-center">
                          <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Deadline</span>
                          {isEditing ? (
                            <input type="date" name="deadline" className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-2 py-1.5 w-40 md:w-full text-xs font-bold" value={editForm.deadline || ''} onChange={handleChange} />
                          ) : (
                            <div className="flex items-center gap-2 md:flex-col md:items-center text-gray-600">
                              <Calendar size={14} className="opacity-40 text-[#e78b01]" />
                              <span className="text-sm font-black tracking-tight">{p.deadline ? new Date(p.deadline).toLocaleDateString('sk-SK') : '-'}</span>
                            </div>
                          )}
                        </div>
                    </td>

                    <td className="p-4 md:p-5 space-y-2 block md:table-cell border-t border-gray-50 md:border-none">
                      <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Workflow Status</div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Design</span>
                          {!isEditing && <span className={`text-[10px] font-bold ${p.design_status === 'Finished' ? 'text-green-500' : 'text-gray-400'}`}>{p.design_status}</span>}
                        </div>
                        {isEditing ? (
                          <select name="design_status" className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-2 py-1.5 w-full text-xs" value={editForm.design_status || ''} onChange={handleChange}>
                            {progressOptions.map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${p.design_status === 'Finished' ? 'w-full bg-green-500' : p.design_status === 'In Progress' ? 'w-1/2 bg-[#e78b01]' : 'w-0'}`}></div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Development</span>
                          {!isEditing && <span className={`text-[10px] font-bold ${p.dev_status === 'Finished' ? 'text-green-500' : 'text-gray-400'}`}>{p.dev_status}</span>}
                        </div>
                        {isEditing ? (
                          <select name="dev_status" className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-2 py-1.5 w-full text-xs" value={editForm.dev_status || ''} onChange={handleChange}>
                            {progressOptions.map(opt => <option key={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${p.dev_status === 'Finished' ? 'w-full bg-green-500' : p.dev_status === 'In Progress' ? 'w-1/2 bg-[#e78b01]' : 'w-0'}`}></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 md:p-5 block md:table-cell border-t border-gray-50 md:border-none">
                      <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Team Assigned</div>
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <select name="pm_id" className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-1.5" value={editForm.pm_id || ''} onChange={handleChange}>
                            <option value="">PM</option>
                            {pms.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                          <select name="designer_id" className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-1.5" value={editForm.designer_id || ''} onChange={handleChange}>
                            <option value="">Designer</option>
                            {designers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                          <select name="dev_id" className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-1.5" value={editForm.dev_id || ''} onChange={handleChange}>
                            <option value="">Dev</option>
                            {developers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {p.pm_name && (
                            <span className="bg-blue-50 text-blue-600 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5" title="Project Manager">
                              <User size={12} /> {p.pm_name}
                            </span>
                          )}
                          {p.designer_name && (
                            <span className="bg-purple-50 text-purple-600 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-purple-100 flex items-center gap-1.5" title="Designer">
                              <Palette size={12} /> {p.designer_name}
                            </span>
                          )}
                          {p.dev_name && (
                            <span className="bg-emerald-50 text-emerald-600 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5" title="Developer">
                              <Monitor size={12} /> {p.dev_name}
                            </span>
                          )}
                          {!p.pm_name && !p.designer_name && !p.dev_name && <span className="text-gray-300 italic text-xs">Unassigned</span>}
                        </div>
                      )}
                    </td>

                    <td className="p-4 md:p-5 text-left md:text-right block md:table-cell border-t border-gray-50 md:border-none">
                      <div className="flex items-center justify-between md:flex-col md:items-end">
                        <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">Financials</span>
                        {isEditing ? (
                          <div className="flex flex-col gap-1 w-40 md:w-full">
                            <input type="number" name="total_value" className="bg-gray-50 border border-gray-200 text-gray-900 text-right rounded-xl px-3 py-1.5 w-full text-sm font-bold" value={editForm.total_value || 0} onChange={handleChange} />
                            <input type="number" name="already_paid" className="bg-gray-50 border border-gray-200 text-gray-400 text-right rounded-xl px-3 py-1.5 w-full text-xs" value={editForm.already_paid || 0} onChange={handleChange} />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-black text-xl md:text-xl block leading-none tracking-tight">€{Number(p.total_value).toLocaleString()}</span>
                            {Number(p.already_paid) > 0 && <span className="text-green-500 text-[11px] font-bold mt-1.5 uppercase tracking-wider">€{Number(p.already_paid).toLocaleString()} PAID</span>}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4 md:p-5 text-center block md:table-cell border-t border-gray-50 md:border-none">
                      <div className="hidden md:flex justify-center gap-2">
                        {isEditing ? (
                          <button onClick={() => handleSave(p.id)} className="p-3 bg-[#00b800] hover:bg-green-600 text-white rounded-xl shadow-lg transition-all transform active:scale-95">
                            <Save size={18} />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => startEdit(p)} className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-[#e78b01] hover:border-[#e78b01] rounded-xl transition-all shadow-sm" title="Edit Details">
                               <Info size={18} />
                            </button>
                            <button onClick={() => toggleArchive(p)} className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-500 rounded-xl transition-all shadow-sm" title={p.is_archived ? "Unarchive" : "Archive"}>
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
                    <tr className={`${rowColorClass} border-b border-gray-100 block md:table-row ${isExpanded && !rowColorClass.includes('border-l-') ? 'border-l-4 border-l-[#e78b01]' : ''}`}>
                      <td colSpan={7} className="p-4 md:p-8 pt-0 block md:table-cell">
                        <div className="bg-white/60 border border-gray-100 rounded-[28px] p-5 md:p-8 shadow-inner-sm animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            {/* Project Type & Complexity */}
                            <div className="space-y-6">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Briefcase size={14} /> Project Metadata
                              </h4>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black text-gray-500 ml-1">WORK COMPLEXITY</label>
                                  {isEditing ? (
                                    <div className="flex items-center gap-4">
                                      <input type="range" name="complexity" min="1" max="7" className="flex-1 accent-[#e78b01]" value={editForm.complexity || 1} onChange={handleChange} />
                                      <span className="font-bold text-[#e78b01] bg-orange-50 px-3 py-1 rounded-lg">Level {editForm.complexity}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {[1, 2, 3, 4, 5, 6, 7].map(level => (
                                        <div key={level} className={`h-2 flex-1 rounded-full ${level <= p.complexity ? 'bg-[#e78b01]' : 'bg-gray-100 opacity-50'}`}></div>
                                      ))}
                                      <span className="text-xs font-bold text-gray-400 ml-2">Lvl {p.complexity}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black text-gray-500 ml-1">PROJECT TYPE</label>
                                  {isEditing ? (
                                    <select name="project_type_id" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm" value={editForm.project_type_id || ''} onChange={handleChange}>
                                      <option value="">Select Category...</option>
                                      {projectTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                                    </select>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.project_type_color }}></div>
                                      <span className="font-bold text-gray-800">{p.project_type_name || 'Uncategorized'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Scheduling & Intervals */}
                            <div className="space-y-6">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar size={14} /> Timeline Intervals
                              </h4>
                              <div className="space-y-5">
                                <div className="space-y-2">
                                  <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">Design Phase (From - To)</label>
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
                                  <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">Development Phase (From - To)</label>
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
                                  <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">Project Hard Deadline</label>
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
                                <Info size={14} /> Internal Logistics & Notes
                              </h4>
                              <textarea 
                                name="notes"
                                placeholder="Add project-specific details or internal comments..."
                                className={`w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm h-40 resize-none outline-none focus:bg-white transition-all ${!isEditing ? 'pointer-events-none' : ''}`}
                                value={(isEditing ? editForm.notes : p.notes) || ''}
                                onChange={handleChange}
                              />

                              {/* Dev Budget & Expenses */}
                              <div className="pt-4 border-t border-gray-100 space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <DollarSign size={14} /> Development Budget
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
                                    <DollarSign size={16} /> Expenses
                                  </button>
                                </div>
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
    </div>
  );
};
