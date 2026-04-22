import React, { useState, useEffect } from 'react';
import { 
  X, Briefcase, Users, Palette, Monitor, Euro, Link as LinkIcon,
  Plus, Phone, Mail, Clock, MessageSquare
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { createPortal } from 'react-dom';

interface Activity {
  id: number;
  project_id: number;
  type: string;
  notes: string;
  activity_date: string;
  created_at: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  client_id: number | null;
  pm_id: number | null;
  designer_id: number | null;
  dev_id: number | null;
  project_type_id: number | null;
  deadline: string | null;
  design_status: string;
  dev_status: string;
  design_start: string | null;
  design_end: string | null;
  dev_start: string | null;
  dev_end: string | null;
  total_value: number;
  already_paid: number;
  notes: string;
  is_archived: boolean;
}

interface SettingsEntity {
  id: number;
  type: string;
  name: string;
  color: string;
}

interface Props {
  id: number;
  entities: SettingsEntity[];
  onClose: () => void;
  onUpdate: () => void;
}

export const ProjectSlideout: React.FC<Props> = ({ id, entities, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const userToken = localStorage.getItem('token');
  const user = userToken ? JSON.parse(atob(userToken)) : null;
  const canEdit = user?.role !== 'viewer';

  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [newActivity, setNewActivity] = useState({ type: 'Call', notes: '', activity_date: new Date().toISOString().slice(0, 16) });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('timeline');

  useEffect(() => {
    fetchProject();
    fetchActivities();
  }, [id]);

  const fetchProject = () => {
    fetch(`/api/projects.php?id=${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          setProject(res.data);
          setEditForm(res.data);
        }
      });
  };

  const fetchActivities = () => {
    fetch(`/api/project_activities.php?project_id=${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') setActivities(res.data || []);
      });
  };

  const handlePostActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.notes) return;
    fetch('/api/project_activities.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newActivity, project_id: id })
    }).then(r => r.json()).then(res => {
      if (res.status === 'success') {
        setNewActivity({ type: 'Call', notes: '', activity_date: new Date().toISOString().slice(0, 16) });
        fetchActivities();
        onUpdate();
      }
    });
  };

  const isFuture = (dateStr: string) => new Date(dateStr) > new Date();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    fetch(`/api/projects.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    }).then(r => r.json()).then(res => {
      setIsSaving(false);
      if (res.status === 'success') {
        fetchProject();
        onUpdate();
        onClose();
      }
    });
  };

  const progressOptions = ['Not Started', 'In Progress', 'Finished', 'Paused'];
  const designers = entities.filter(e => e.type === 'designer');
  const developers = entities.filter(e => e.type === 'developer');
  const pms = entities.filter(e => e.type === 'pm');

  if (!project) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs animate-fade-in" onClick={onClose}></div>
      
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white h-screen shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-[var(--color-primary)]">
                <Briefcase size={24} />
             </div>
             <div>
                <h2 className="text-xl font-black text-gray-900 leading-none mb-1">{project.name}</h2>
                <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{t('projects.slideout.details')}</div>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-95">
            <X size={20} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex px-8 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button 
                onClick={() => setActiveTab('timeline')}
                className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'timeline' ? 'border-[var(--color-primary)] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                {t('leads.activities.title') || 'Activities'}
            </button>
            <button 
                onClick={() => setActiveTab('details')}
                className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'details' ? 'border-[var(--color-primary)] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                {t('projects.slideout.details')}
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50/50">
           {activeTab === 'details' ? (
             <form id="project-form" onSubmit={handleSave} className="space-y-8">
              
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('projects.title')}</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:border-[var(--color-primary)] font-bold text-gray-900"
                      value={editForm.name || ''}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('common.status')}</label>
                        <select 
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-700"
                            value={editForm.status || ''}
                            onChange={e => setEditForm({...editForm, status: e.target.value})}
                        >
                            <option>New Lead</option>
                            <option>In Progress</option>
                            <option>Finished</option>
                            <option>Canceled</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 whitespace-nowrap">{t('projects.deadline')}</label>
                        <input 
                            type="date"
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-700"
                            value={editForm.deadline ? editForm.deadline.split(' ')[0] : ''}
                            onChange={e => setEditForm({...editForm, deadline: e.target.value})}
                        />
                     </div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                 <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Users size={16} className="text-blue-500"/> {t('projects.team')} & {t('calendar.milestones')}
                 </h3>
                 
                 <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('projects.pm')}</label>
                            <select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700" value={editForm.pm_id || ''} onChange={e => setEditForm({...editForm, pm_id: Number(e.target.value) || null})}>
                                <option value="">Select PM...</option>
                                {pms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                         </div>
                     </div>

                     <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-purple-700 flex items-center gap-2"><Palette size={14}/> {t('projects.design_status') || 'Design Phase'}</span>
                            <select className="bg-white border border-purple-200 rounded-xl px-3 py-1 text-xs font-bold text-purple-700" value={editForm.design_status || ''} onChange={e => setEditForm({...editForm, design_status: e.target.value})}>
                                {progressOptions.map(o => <option key={o}>{o}</option>)}
                            </select>
                         </div>
                         <div className="grid grid-cols-1 gap-3">
                             <select className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700" value={editForm.designer_id || ''} onChange={e => setEditForm({...editForm, designer_id: Number(e.target.value) || null})}>
                                <option value="">Assign Designer...</option>
                                {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                             </select>
                             <div className="flex items-center gap-2">
                                <input type="date" className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2.5 text-xs text-gray-600" value={editForm.design_start ? editForm.design_start.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, design_start: e.target.value})} title="Start" />
                                <span className="text-purple-300">-</span>
                                <input type="date" className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2.5 text-xs text-gray-600" value={editForm.design_end ? editForm.design_end.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, design_end: e.target.value})} title="End" />
                             </div>
                         </div>
                     </div>

                     <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-700 flex items-center gap-2"><Monitor size={14}/> {t('projects.dev_status') || 'Development Phase'}</span>
                            <select className="bg-white border border-emerald-200 rounded-xl px-3 py-1 text-xs font-bold text-emerald-700" value={editForm.dev_status || ''} onChange={e => setEditForm({...editForm, dev_status: e.target.value})}>
                                {progressOptions.map(o => <option key={o}>{o}</option>)}
                            </select>
                         </div>
                         <div className="grid grid-cols-1 gap-3">
                             <select className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700" value={editForm.dev_id || ''} onChange={e => setEditForm({...editForm, dev_id: Number(e.target.value) || null})}>
                                <option value="">Assign Developer...</option>
                                {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                             </select>
                             <div className="flex items-center gap-2">
                                <input type="date" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-gray-600" value={editForm.dev_start ? editForm.dev_start.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, dev_start: e.target.value})} title="Start" />
                                <span className="text-emerald-300">-</span>
                                <input type="date" className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-gray-600" value={editForm.dev_end ? editForm.dev_end.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, dev_end: e.target.value})} title="End" />
                             </div>
                         </div>
                     </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Euro size={16} className="text-yellow-500"/> {t('projects.financials')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('projects.value')}</label>
                        <input className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-right font-black text-gray-900" type="number" value={editForm.total_value || 0} onChange={e => setEditForm({...editForm, total_value: Number(e.target.value)})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('projects.paid')}</label>
                        <input className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-right font-black text-green-600" type="number" value={editForm.already_paid || 0} onChange={e => setEditForm({...editForm, already_paid: Number(e.target.value)})} />
                     </div>
                  </div>
              </div>

           </form>
           ) : (
             <div className="space-y-10">
                {/* Log Activity Form */}
                {canEdit && (
                    <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-[var(--color-primary)]" /> {t('leads.activities.log_activity') || 'Log Activity'}
                        </h3>
                        <form onSubmit={handlePostActivity} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <select 
                                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold"
                                    value={newActivity.type}
                                    onChange={e => setNewActivity({...newActivity, type: e.target.value})}
                                >
                                    <option value="Call">{t('leads.activity.call') || 'Call'}</option>
                                    <option value="Email">{t('leads.activity.email') || 'Email'}</option>
                                    <option value="Meeting">{t('leads.activity.meeting') || 'Meeting'}</option>
                                    <option value="Online Call">{t('leads.activity.online_call') || 'Online Call'}</option>
                                    <option value="Proposal">{t('leads.activity.proposal') || 'Proposal'}</option>
                                    <option value="Other">{t('common.other') || 'Other'}</option>
                                </select>
                                <input 
                                    type="datetime-local" 
                                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold text-gray-500"
                                    value={newActivity.activity_date}
                                    onChange={e => setNewActivity({...newActivity, activity_date: e.target.value})}
                                />
                            </div>
                            <textarea 
                                placeholder={t('leads.activities.notes_placeholder') || "Summary of the activity or next steps..."}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                value={newActivity.notes}
                                onChange={e => setNewActivity({...newActivity, notes: e.target.value})}
                            />
                            <div className="flex justify-end">
                                <button type="submit" className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--color-primary)] transition-all shadow-lg active:scale-95">
                                    {t('leads.activities.add_log') || 'Add Log'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Timeline Grid */}
                <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200 before:rounded-full">
                    {activities.map((act) => (
                        <div key={act.id} className="relative group/act">
                            {/* Dot Icon */}
                            <div className={`absolute -left-[32px] top-0 w-6 h-6 rounded-lg flex items-center justify-center border-4 border-[#f8fafc] shadow-sm transition-all group-hover/act:scale-110 z-10 ${isFuture(act.activity_date) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                {act.type === 'Call' || act.type === 'Online Call' ? <Phone size={10} /> :
                                 act.type === 'Email' ? <Mail size={10} /> :
                                 act.type === 'Meeting' ? <Users size={10} /> :
                                 act.type === 'Proposal' ? <Briefcase size={10} /> :
                                 <MessageSquare size={10} />}
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all group-hover/act:border-gray-200 group-hover/act:shadow-md">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isFuture(act.activity_date) ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {act.type}
                                        </span>
                                        {isFuture(act.activity_date) && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase tracking-widest">
                                                <Clock size={10} /> {t('leads.activities.planned') || 'Planned'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                        {new Date(act.activity_date).toLocaleString('sk-SK', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                    {act.notes}
                                </p>
                            </div>
                        </div>
                    ))}

                    {activities.length === 0 && (
                        <div className="bg-transparent py-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl">
                            <Clock size={24} className="text-gray-300 mb-2" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('leads.activities.no_activities') || 'No activities logged yet'}</p>
                        </div>
                    )}
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
           <a href={`/#/?edit_project_id=${id}`} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"><LinkIcon size={14}/> {t('projects.open_full_view') || 'Open Full view'}</a>
           {activeTab === 'details' && (
               <button 
                  form="project-form"
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3.5 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-[var(--color-primary)] transition-all disabled:opacity-50"
               >
                  {isSaving ? t('common.saving') : t('common.save')}
               </button>
           )}
        </div>

      </div>
    </div>,
    document.body
  );
};
