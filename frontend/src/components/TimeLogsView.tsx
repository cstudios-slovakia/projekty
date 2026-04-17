import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Clock, Plus, Trash2, Calendar as CalendarIcon, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
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

export const TimeLogsView: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Scratchpad rows for the active day
  const [draftRows, setDraftRows] = useState<NewLogRow[]>([]);

  // Current user from token
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token)) : null;

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      // Fetch user's logs
      const logsRes = await fetch(`/api/time_logs.php?user_id=${user.id}`);
      const logsData = await logsRes.json();
      if (logsData.status === 'success') {
        setLogs(logsData.data);
      }

      // Fetch active projects to log against
      const projRes = await fetch('/api/projects.php');
      const projData = await projRes.json();
      if (projData.status === 'success') {
        // Filter strictly accepted / active timeline projects
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
      const str = d.toISOString().split('T')[0];
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
        user_id: user.id,
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
        fetchData();
      } else {
        alert(data.message || 'Failed to save logs');
      }
    } catch (e) {
      alert('Error saving logs');
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!window.confirm(t('common.confirm_delete') || 'Are you sure you want to delete this log?')) return;
    try {
      await fetch(`/api/time_logs.php?id=${id}`, { method: 'DELETE' });
      fetchData();
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
        <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <Clock className="text-[var(--color-primary)]" size={32} />
          {t('timelogs.title') || 'Time Logging'}
        </h2>
      </div>

      {/* TOP TIMELINE PANEL */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 overflow-hidden">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Select Day to Log</h3>
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {timelineDays.map(day => {
            const isToday = day.dateStr === new Date().toISOString().split('T')[0];
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
              <div key={log.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 group hover:border-[var(--color-primary)]/30 transition-all">
                <div className="w-full md:w-1/3">
                  <div className="text-xs font-bold text-gray-400 uppercase">Project</div>
                  <div className="font-bold text-gray-900 truncate">{log.project_name || `Project #${log.project_id}`}</div>
                </div>
                <div className="w-full md:w-1/2">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-2">Notes</div>
                  <div className="text-sm text-gray-600 markdown-body-override" data-color-mode="light">
                    {log.notes ? (
                      <MDEditor.Markdown source={log.notes} style={{ backgroundColor: 'transparent' }} />
                    ) : (
                      <em className="text-gray-300">No notes provided</em>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-auto flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase">Hours</div>
                    <div className="font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-lg">{log.hours}h</div>
                  </div>
                  <button 
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                    title={t('common.delete') || 'Delete Log'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
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
    </div>
  );
};

