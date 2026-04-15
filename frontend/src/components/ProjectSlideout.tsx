import React, { useState, useEffect } from 'react';
import { 
  X, Briefcase, Users, Palette, Monitor, Euro, Link as LinkIcon 
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { createPortal } from 'react-dom';

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
  const [project, setProject] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchProject();
    fetchUsers();
  }, [id]);

  const fetchUsers = () => {
    fetch('/api/users.php').then(r => r.json()).then(res => {
      if(res.status === 'success') setUsers(res.data);
    });
  };

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
  const projectRoles = entities.filter(e => e.type === 'project_role');

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
                <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{t('projects.slideout.details') || 'slideout.details'}</div>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-95">
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50/50">
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
                    <Users size={16} className="text-blue-500"/> {t('projects.team') || 'Team'}
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectRoles.map(role => {
                          const teamMember = editForm.team?.find((t: any) => t.role_entity_id === role.id);
                          const availableUsers = users.filter(u => u.custom_roles?.includes(role.id));
                          
                          return (
                              <div key={role.id} className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-1.5" style={{color: role.color}}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color }}></span>
                                  {role.name}
                                </label>
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-gray-400" 
                                    value={teamMember?.user_id || ''} 
                                    onChange={e => {
                                        const newUserId = Number(e.target.value);
                                        const newTeamStr = editForm.team ? [...editForm.team] : [];
                                        const existingIndex = newTeamStr.findIndex(t => t.role_entity_id === role.id);
                                        
                                        if (newUserId) {
                                            if (existingIndex >= 0) {
                                                newTeamStr[existingIndex].user_id = newUserId;
                                            } else {
                                                newTeamStr.push({ role_entity_id: role.id, user_id: newUserId });
                                            }
                                        } else {
                                            if (existingIndex >= 0) newTeamStr.splice(existingIndex, 1);
                                        }
                                        
                                        setEditForm({...editForm, team: newTeamStr});
                                    }}
                                >
                                    <option value="">Select...</option>
                                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                                </select>
                              </div>
                          );
                      })}
                      {projectRoles.length === 0 && (
                        <div className="col-span-2 text-xs text-gray-400 italic">No project roles defined in settings.</div>
                      )}
                 </div>

                 <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2 mt-8">
                    <Palette size={16} className="text-purple-500"/> {t('calendar.milestones') || 'Milestones'}
                 </h3>
                 <div className="space-y-4">
                     <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                         <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">{t('projects.design_status') || 'Design Phase'}</span>
                            <select className="bg-white border border-purple-200 rounded-xl px-3 py-1 text-xs font-bold text-purple-700" value={editForm.design_status || ''} onChange={e => setEditForm({...editForm, design_status: e.target.value})}>
                                {progressOptions.map(o => <option key={o}>{o}</option>)}
                            </select>
                         </div>
                         <div className="flex items-center gap-2">
                            <input type="date" className="w-32 bg-white border border-purple-100 rounded-xl px-4 py-2.5 text-xs text-gray-600 outline-none" value={editForm.design_start ? editForm.design_start.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, design_start: e.target.value})} title="Start" />
                            <span className="text-purple-300">-</span>
                            <input type="date" className="w-32 bg-white border border-purple-100 rounded-xl px-4 py-2.5 text-xs text-gray-600 outline-none" value={editForm.design_end ? editForm.design_end.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, design_end: e.target.value})} title="End" />
                         </div>
                     </div>

                     <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                         <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700"><Monitor size={14} className="inline mr-1 -mt-0.5"/>{t('projects.dev_status') || 'Development Phase'}</span>
                            <select className="bg-white border border-emerald-200 rounded-xl px-3 py-1 text-xs font-bold text-emerald-700" value={editForm.dev_status || ''} onChange={e => setEditForm({...editForm, dev_status: e.target.value})}>
                                {progressOptions.map(o => <option key={o}>{o}</option>)}
                            </select>
                         </div>
                         <div className="flex items-center gap-2">
                            <input type="date" className="w-32 bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-gray-600 outline-none" value={editForm.dev_start ? editForm.dev_start.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, dev_start: e.target.value})} title="Start" />
                            <span className="text-emerald-300">-</span>
                            <input type="date" className="w-32 bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-xs text-gray-600 outline-none" value={editForm.dev_end ? editForm.dev_end.split(' ')[0] : ''} onChange={e => setEditForm({...editForm, dev_end: e.target.value})} title="End" />
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
           <a href={`/#/?edit_project_id=${id}`} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-[var(--color-primary)] transition-colors flex items-center gap-1"><LinkIcon size={14}/> {t('projects.open_full_view') || 'Open Full view'}</a>
           <button 
              form="project-form"
              type="submit"
              disabled={isSaving}
              className="px-8 py-3.5 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-[var(--color-primary)] transition-all disabled:opacity-50"
           >
              {isSaving ? t('common.saving') : t('common.save')}
           </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
