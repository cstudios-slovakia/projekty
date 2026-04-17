import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Clock, Plus, Trash2, Calendar, FileText, ArrowLeft, Hourglass, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  client_color?: string;
  project_type_color?: string;
}

export const TimeLogsView: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Current user from token
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token)) : null;

  const [form, setForm] = useState({
    project_id: '',
    hours: 1,
    notes: '',
    log_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    setIsLoading(true);
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
        setProjects(projData.data);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id || !form.hours || !user?.id) return;

    try {
      const res = await fetch('/api/time_logs.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          user_id: user.id
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setForm({ ...form, hours: 1, notes: '' }); // reset some fields
        fetchData();
      } else {
        alert(data.message || 'Failed to save log');
      }
    } catch (e) {
      alert('Error saving log');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('common.confirm_delete') || 'Are you sure you want to delete this?')) return;
    try {
      await fetch(`/api/time_logs.php?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert('Error deleting log');
    }
  };

  if (!user) return <div className="p-8">Please log in.</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/" className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 transition-all shadow-sm">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <Clock className="text-[var(--color-primary)]" size={32} />
          {t('timelogs.title') || 'Time Logging'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Panel */}
        <div className="lg:col-span-1 border border-gray-200 bg-white rounded-[32px] p-6 md:p-8 shadow-sm h-fit sticky top-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Plus size={20} className="text-[var(--color-primary)]" />
            {t('timelogs.add_new') || 'Log New Time'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                {t('timelogs.project') || 'Project'}
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] font-bold transition-all"
                value={form.project_id}
                onChange={e => setForm({...form, project_id: e.target.value})}
                required
              >
                <option value="">-- Select Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  {t('timelogs.date') || 'Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  <input
                    type="date"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-all text-sm font-bold"
                    value={form.log_date}
                    onChange={e => setForm({...form, log_date: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  {t('timelogs.hours') || 'Hours'}
                </label>
                <div className="relative">
                  <Hourglass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-all font-bold"
                    value={form.hours}
                    onChange={e => setForm({...form, hours: Number(e.target.value)})}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                {t('timelogs.notes') || 'Notes'}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-4 text-gray-400 pointer-events-none" size={16} />
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-all resize-none min-h-[100px] text-sm"
                  placeholder={t('timelogs.notes_placeholder') || 'What did you work on?'}
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                ></textarea>
              </div>
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Save size={18} />
              {t('timelogs.save_button') || 'Save Time Log'}
            </button>
          </form>
        </div>

        {/* History Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                {t('timelogs.history') || 'Your Log History'}
              </h3>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 text-xs font-bold rounded-full">
                {logs.length} {t('timelogs.logs') || 'entries'}
              </span>
            </div>
            
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400 animate-pulse">{t('common.loading') || 'Loading...'}</div>
              ) : logs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <Clock className="text-gray-300" size={24} />
                  </div>
                  <p className="text-gray-400 font-medium">{t('timelogs.no_logs') || 'No time logs yet. Start logging your work!'}</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900 text-lg">{log.project_name || `Project #${log.project_id}`}</span>
                        <span className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide">
                          {log.hours}h
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 whitespace-pre-wrap">{log.notes || <em className="text-gray-300">No notes provided</em>}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 flex items-center gap-1.5">
                        <Calendar size={12} /> {new Date(log.log_date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(log.id)}
                      className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 hidden md:block"
                      title={t('common.delete') || 'Delete'}
                    >
                      <Trash2 size={18} />
                    </button>
                    
                    {/* Mobile Delete */}
                    <button 
                      onClick={() => handleDelete(log.id)}
                      className="md:hidden text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 mt-2"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
