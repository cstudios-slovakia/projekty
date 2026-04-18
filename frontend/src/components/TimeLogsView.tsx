import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Clock, Plus, Trash2, Calendar as CalendarIcon, ArrowLeft, Save, CheckCircle2, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';

interface TimeLog {
  id: number;
  project_id: number;
  project_name: string;
  user_id: number;
  username: string;
  hours: number;
  notes: string;
  log_date: string;
  created_at: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
}

interface NewLogRow {
  id: string; // temporary id for react key
  project_id: string;
  hours: number;
  notes: string;
}

const getLocalISODate = (d: Date = new Date()) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export const TimeLogsView: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeDate, setActiveDate] = useState(getLocalISODate());
  
  // Scratchpad rows for the active day
  const [draftRows, setDraftRows] = useState<NewLogRow[]>([]);
  
  // View mode
  const [viewMode, setViewMode] = useState<'day' | 'list'>('day');
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Current user from token
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token)) : null;

  // Admin/Manager Multi-User Logging
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState<number | 'all'>(user?.id);

  // Edit Mode state
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TimeLog | null>(null);

  useEffect(() => {
    if (user?.id) {
      if (user.role === 'admin' || user.role === 'manager') {
        fetch('/api/users.php')
          .then(r => r.json())
          .then(res => {
            if (res.status === 'success') setAllUsers(res.data);
          });
      }
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (targetUserId) {
      fetchData(targetUserId);
    }
  }, [targetUserId]);

  const fetchData = async (uid: number | 'all') => {
    try {
      // Fetch specifically chosen user's logs
      const url = uid === 'all' ? '/api/time_logs.php' : `/api/time_logs.php?user_id=${uid}`;
      const logsRes = await fetch(url);
      const logsData = await logsRes.json();
      if (logsData.status === 'success') {
        setLogs(logsData.data);
      }

      // Fetch active projects
      const projRes = await fetch('/api/projects.php');
      const projData = await projRes.json();
      if (projData.status === 'success') {
        const activeStatuses = ['In Progress', 'Price Offer Accepted', 'Signed', 'Invoiced', 'Paid', 'Price Offer Closed'];
        setProjects(projData.data.filter((p: Project) => activeStatuses.includes(p.status)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate the last 14 days for the timeline
  const timelineDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    // Start from 13 days ago up to today
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const str = getLocalISODate(d);
      days.push({
        dateStr: str,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        hasLogs: logs.some(l => l.log_date === str)
      });
    }
    return days;
  }, [logs]);

  // Derive logs specifically for the active date
  const activeDateLogs = useMemo(() => {
    return logs.filter(l => l.log_date === activeDate);
  }, [logs, activeDate]);

  const addDraftRow = () => {
    setDraftRows([...draftRows, { id: Math.random().toString(), project_id: '', hours: 1, notes: '' }]);
  };

  const removeDraftRow = (id: string) => {
    setDraftRows(draftRows.filter(r => r.id !== id));
  };

  const currentTotalHours = useMemo(() => {
    const historical = activeDateLogs.reduce((acc, l) => acc + Number(l.hours), 0);
    const drafted = draftRows.reduce((acc, r) => acc + Number(r.hours), 0);
    return historical + drafted;
  }, [activeDateLogs, draftRows]);

  const handleSaveBulk = async () => {
    if (draftRows.length === 0) return;
    
    // Filter invalid rows
    const validRows = draftRows.filter(r => r.project_id && r.hours > 0);
    if (validRows.length === 0) {
      alert("Please fill out the selected projects.");
      return;
    }

    try {
      const payloadLogs = validRows.map(r => ({
        project_id: r.project_id,
        user_id: targetUserId === 'all' ? user.id : targetUserId, // Use target user or self!
        hours: r.hours,
        notes: r.notes,
        log_date: activeDate
      }));

      const res = await fetch('/api/time_logs.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: payloadLogs })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDraftRows([]); // clear scratchpad
        fetchData(targetUserId);
      } else {
        alert(data.message || 'Failed to save logs');
      }
    } catch (e) {
      alert('Error saving logs');
    }
  };

  const startEditLog = (log: TimeLog) => {
    setEditingLogId(log.id);
    setEditForm({ ...log });
  };

  const handleUpdateLog = async () => {
    if (!editForm || !editForm.project_id || editForm.hours <= 0) return;
    try {
      const res = await fetch(`/api/time_logs.php?id=${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEditingLogId(null);
        setEditForm(null);
        fetchData(targetUserId);
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (e) {
      alert('Error updating log');
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!window.confirm(t('common.confirm_delete') || 'Are you sure you want to delete this log?')) return;
    try {
      await fetch(`/api/time_logs.php?id=${id}`, { method: 'DELETE' });
      fetchData(targetUserId);
    } catch (e) {
      alert('Error deleting log');
    }
  };

  if (!user) return <div className="p-8">Please log in.</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/" className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 transition-all shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Clock className="text-[var(--color-primary)]" size={32} />
            {t('timelogs.title') || 'Time Logging'}
          </h2>
          {(user?.role === 'admin' || user?.role === 'manager') && allUsers.length > 0 && (
            <div className="flex items-center gap-2 ml-auto lg:ml-4 bg-white border-2 border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10 px-4 py-2 rounded-2xl shadow-sm transition-all hover:scale-[1.02]">
              <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest whitespace-nowrap">Logging as:</span>
              <select
                className="bg-transparent text-gray-900 focus:outline-none font-black transition-all text-sm cursor-pointer"
                value={targetUserId}
                onChange={e => {
                  setTargetUserId(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setListPage(1);
                }}
              >
                <option value="all">{t('common.all_users') || 'All Users'}</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
         <button onClick={() => setViewMode('day')} className={`px-5 py-2 font-black tracking-widest uppercase text-[11px] rounded-xl transition-all ${viewMode === 'day' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'}`}>Daily Timeline</button>
         <button onClick={() => setViewMode('list')} className={`px-5 py-2 font-black tracking-widest uppercase text-[11px] rounded-xl transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'}`}>Full List View</button>
      </div>

      {viewMode === 'day' ? (
        <>
          {/* TOP TIMELINE PANEL */}
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 overflow-hidden">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Select Day to Log</h3>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {timelineDays.map(day => {
            const isToday = day.dateStr === getLocalISODate();
            return (
            <button
              key={day.dateStr}
              onClick={() => setActiveDate(day.dateStr)}
              className={`snap-center flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all relative ${
                activeDate === day.dateStr 
                  ? `bg-[var(--color-primary)] text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] scale-105 ${isToday ? 'ring-4 ring-[var(--color-primary)]/30' : ''}` 
                  : `bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 ${isToday ? 'border-2 border-[var(--color-primary)]/70' : 'border border-gray-100'}`
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">
                {isToday ? t('common.today') || 'Today' : day.label}
              </div>
              <div className="text-xl font-black">{day.dayNum}</div>
              
              {/* Dot indicator if logs exist on this day */}
              {day.hasLogs && (
                <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${activeDate === day.dateStr ? 'bg-white' : 'bg-[var(--color-secondary)]'}`}></div>
              )}
            </button>
          )})}
        </div>
      </div>

      {/* ACTIVE DAY CONTEXT */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 md:p-8 min-h-[500px]">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 border-b border-gray-100 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900">{new Date(activeDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <div className="text-sm font-bold text-gray-400">
                Total Logged: <span className="text-[var(--color-secondary)]">{currentTotalHours}h</span>
              </div>
            </div>
          </div>
          <button 
            onClick={addDraftRow}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all text-sm"
          >
            <Plus size={16} /> Add Row
          </button>
        </div>

        {/* Existing Logs for this date */}
        {activeDateLogs.length > 0 && (
          <div className="mb-8 space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Saved Logs</h4>
            {activeDateLogs.map(log => (
              editingLogId === log.id ? (
                <div key={log.id} className="flex flex-col lg:flex-row items-end gap-4 bg-white border-2 border-[var(--color-primary)]/50 rounded-2xl p-5 relative shadow-[0_8px_30px_rgb(0,0,0,0.08)] scale-[1.01] transition-all my-6 fade-in">
                  <div className="w-full lg:flex-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Project</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] font-bold transition-all"
                      value={editForm?.project_id || ''}
                      onChange={e => setEditForm(prev => prev ? {...prev, project_id: Number(e.target.value)} : null)}
                    >
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="w-full lg:flex-[2]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Notes</label>
                    <div data-color-mode="light" className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-[var(--color-primary)] transition-all">
                      <MDEditor
                        value={editForm?.notes || ''}
                        onChange={(val) => setEditForm(prev => prev ? {...prev, notes: val || ''} : null)}
                        height={250}
                        preview="edit"
                        hideToolbar={false}
                      />
                    </div>
                  </div>

                  <div className="w-full lg:w-32">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Hours</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-all font-black text-lg text-center"
                      value={editForm?.hours || ''}
                      onChange={e => setEditForm(prev => prev ? {...prev, hours: Number(e.target.value)} : null)}
                    />
                  </div>

                  <div className="flex gap-2 h-full pb-0 mt-3 lg:mt-0">
                    <button 
                      onClick={() => { setEditingLogId(null); setEditForm(null); }}
                      className="px-4 py-3 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdateLog}
                      className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-3 rounded-xl font-black shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Save size={18} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div key={log.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-gray-50 border border-gray-100 hover:bg-white rounded-2xl p-4 group hover:border-[var(--color-primary)]/40 hover:shadow-sm transition-all duration-300">
                  <div className="w-full md:w-1/3">
                    <div className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-1">Project</div>
                    <div className="font-bold text-gray-900 truncate">{log.project_name || `Project #${log.project_id}`}</div>
                  </div>
                  <div className="w-full md:w-1/2">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Notes</div>
                    <div className="text-sm text-gray-600 markdown-body-override" data-color-mode="light">
                      {log.notes ? (
                        <MDEditor.Markdown source={log.notes} style={{ backgroundColor: 'transparent' }} />
                      ) : (
                        <em className="text-gray-300 font-medium">No notes provided</em>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-auto flex flex-col items-center justify-between gap-4 md:ml-auto">
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase text-center mb-1 tracking-wider">Hours</div>
                      <div className="font-black focus:outline-none text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-4 py-1.5 rounded-xl text-center min-w-[4rem]">{log.hours}h</div>
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2 mt-4 md:mt-0 md:opacity-0 group-hover:opacity-100 transition-all duration-300 w-full md:w-auto justify-end">
                    <button 
                      onClick={() => startEditLog(log)}
                      className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-xl transition-all"
                      title="Edit Log"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title={t('common.delete') || 'Delete Log'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Draft Rows */}
        {draftRows.length > 0 && (
          <div className="space-y-4 mb-8">
             <h4 className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest mb-2">New Entries</h4>
             {draftRows.map((row, index) => (
               <div key={row.id} className="flex flex-col lg:flex-row items-end gap-4 bg-white border-2 border-dashed border-[var(--color-primary)]/30 rounded-2xl p-5 relative fade-in">
                 <div className="w-full lg:flex-1">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Project</label>
                   <select
                     className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] font-bold transition-all"
                     value={row.project_id}
                     onChange={e => {
                       const nr = [...draftRows];
                       nr[index].project_id = e.target.value;
                       setDraftRows(nr);
                     }}
                   >
                     <option value="">-- Required --</option>
                     {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                 </div>
                 
                 <div className="w-full lg:flex-[2]">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Daily Notes</label>
                   <div data-color-mode="light" className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-[var(--color-primary)] transition-all">
                     <MDEditor
                       value={row.notes}
                       onChange={(val) => {
                         const nr = [...draftRows];
                         nr[index].notes = val || '';
                         setDraftRows(nr);
                       }}
                       height={250}
                       preview="edit"
                       hideToolbar={false}
                     />
                   </div>
                 </div>

                 <div className="w-full lg:w-32">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Hours</label>
                   <input
                     type="number"
                     step="0.25"
                     min="0.25"
                     className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-all font-black text-lg text-center"
                     value={row.hours}
                     onChange={e => {
                       const nr = [...draftRows];
                       nr[index].hours = Number(e.target.value);
                       setDraftRows(nr);
                     }}
                   />
                 </div>

                 <button 
                    onClick={() => removeDraftRow(row.id)}
                    className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all h-full mt-2 lg:mt-0"
                    title="Remove Row"
                  >
                    <Trash2 size={20} />
                 </button>
               </div>
             ))}
          </div>
        )}

        {draftRows.length === 0 && activeDateLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 rounded-[32px] bg-gray-50">
             <CheckCircle2 size={48} className="text-gray-300 mb-4" />
             <p className="text-gray-400 font-bold max-w-sm">You haven't tracked any time on this day. Click 'Add Row' to start logging work!</p>
          </div>
        )}

        {draftRows.length > 0 && (
          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button 
              onClick={handleSaveBulk}
              className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-8 py-3.5 rounded-xl font-black tracking-wide shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Save size={20} /> Save Day Logs
            </button>
          </div>
        )}
      </div>
      </>
      ) : (
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 overflow-hidden min-h-[500px]">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">All Tracked Logs ({logs.length})</h3>
        
        {logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-bold italic border border-dashed rounded-2xl bg-gray-50 border-gray-200">No logs found.</div>
        ) : (
          <div className="w-full relative">
            <div className="grid grid-cols-12 gap-4 pb-3 border-b-2 border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Project</div>
              <div className="col-span-2">User</div>
              <div className="col-span-4">Notes</div>
              <div className="col-span-1 text-right">Hours</div>
            </div>
            <div className="min-h-[400px]">
              {logs.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(log => (
                <div key={log.id} className="grid grid-cols-12 gap-4 py-4 border-b border-gray-100 items-center px-4 hover:bg-gray-50 transition-colors group relative">
                  <div className="col-span-2 text-sm font-bold text-gray-600">{new Date(log.log_date).toLocaleDateString()}</div>
                  <div className="col-span-3 text-sm font-black text-gray-900 truncate" title={log.project_name}>{log.project_name || `#${log.project_id}`}</div>
                  <div className="col-span-2 text-sm text-gray-600 truncate" title={log.username}>{log.username}</div>
                  <div className="col-span-4 text-xs text-gray-500 line-clamp-2 pr-4">{log.notes ? log.notes.replace(/[#*`_~]/g, '') : '-'}</div>
                  <div className="col-span-1 text-right text-sm font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-lg flex-shrink-0 inline-flex items-center justify-center self-center ml-auto relative">
                      {log.hours}h
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="absolute right-0 translate-x-[110%] p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-red-100"
                        title={t('common.delete') || 'Delete Log'}
                      >
                        <Trash2 size={14} />
                      </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 px-2">
              <button 
                disabled={listPage === 1} 
                onClick={() => setListPage(p => Math.max(1, p - 1))}
                className="text-xs font-black uppercase bg-gray-50 px-4 py-2 rounded-xl text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
               >← Previous</button>
              <div className="text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl">Page {listPage} of {Math.ceil(logs.length / ITEMS_PER_PAGE)}</div>
               <button 
                disabled={listPage === Math.ceil(logs.length / ITEMS_PER_PAGE)} 
                onClick={() => setListPage(p => Math.min(Math.ceil(logs.length / ITEMS_PER_PAGE), p + 1))}
                className="text-xs font-black uppercase bg-gray-50 px-4 py-2 rounded-xl text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
               >Next →</button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

