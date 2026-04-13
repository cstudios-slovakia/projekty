import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Phone, 
  Trash2, Briefcase, Archive, Plus, 
  User, Users, Video, Info, Save,
  Clock
} from 'lucide-react';
import { createPortal } from 'react-dom';

interface Activity {
  id: number;
  lead_id: number;
  type: string;
  notes: string;
  activity_date: string;
  created_at: string;
}

interface Lead {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  message: string;
  status_id: number | null;
  source_id: number | null;
  pm_id: number | null;
  is_archived: boolean;
  created_at: string;
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

export const LeadSlideout: React.FC<Props> = ({ id, entities, onClose, onUpdate }) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [newActivity, setNewActivity] = useState({ type: 'Call', notes: '', activity_date: new Date().toISOString().slice(0, 16) });
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('timeline');

  useEffect(() => {
    fetchLead();
    fetchActivities();
  }, [id]);

  const fetchLead = () => {
    fetch(`/api/pipeline.php?id=${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          setLead(res.data);
          setEditForm(res.data);
        }
      });
  };

  const fetchActivities = () => {
    fetch(`/api/lead_activities.php?lead_id=${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') setActivities(res.data || []);
      });
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`/api/pipeline.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    }).then(r => r.json()).then(res => {
      if (res.status === 'success') {
        setIsEditing(false);
        fetchLead();
        onUpdate();
      }
    });
  };

  const handlePostActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.notes) return;
    fetch('/api/lead_activities.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newActivity, lead_id: id })
    }).then(r => r.json()).then(res => {
      if (res.status === 'success') {
        setNewActivity({ type: 'Call', notes: '', activity_date: new Date().toISOString().slice(0, 16) });
        fetchActivities();
        onUpdate();
      }
    });
  };

  const handleUpgrade = () => {
    if (!confirm('Are you sure you want to upgrade this lead to a live project?')) return;
    fetch(`/api/pipeline.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgrade: true })
    }).then(r => r.json()).then(res => {
      if (res.status === 'success') {
        alert('Lead successfully upgraded to project!');
        onClose();
        onUpdate();
        window.location.href = `/#/`; // Navigate to projects
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('Permanent deletion! Are you sure?')) return;
    fetch(`/api/pipeline.php?id=${id}`, { method: 'DELETE' }).then(() => {
        onClose();
        onUpdate();
    });
  };

  const isFuture = (dateStr: string) => new Date(dateStr) > new Date();

  const statuses = entities.filter(e => e.type === 'lead_status');
  const sources = entities.filter(e => e.type === 'lead_source');
  const pms = entities.filter(e => e.type === 'pm');

  if (!lead) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs animate-fade-in" onClick={onClose}></div>
      
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white h-screen shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: statuses.find(s => s.id === lead.status_id)?.color || '#94a3b8' }}
             >
                <User size={24} />
             </div>
             <div>
                <h2 className="text-xl font-black text-gray-900 leading-none mb-1">{lead.company_name || 'Individual Lead'}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{statuses.find(s => s.id === lead.status_id)?.name || 'New'}</span>
                    <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Source: {sources.find(s => s.id === lead.source_id)?.name || 'Direct'}</span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
            <X size={24} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex px-8 border-b border-gray-100 bg-gray-50/50">
            <button 
                onClick={() => setActiveTab('timeline')}
                className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'timeline' ? 'border-[var(--color-primary)] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                Activity Timeline
            </button>
            <button 
                onClick={() => setActiveTab('details')}
                className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'details' ? 'border-[var(--color-primary)] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                Lead Details
            </button>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'timeline' ? (
                <div className="space-y-10">
                    {/* Log Activity Form */}
                    <div className="bg-gray-50 border border-gray-100 rounded-[32px] p-6 shadow-inner">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-[var(--color-primary)]" /> Log Activity
                        </h3>
                        <form onSubmit={handlePostActivity} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <select 
                                    className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold"
                                    value={newActivity.type}
                                    onChange={e => setNewActivity({...newActivity, type: e.target.value})}
                                >
                                    <option>Call</option>
                                    <option>Email</option>
                                    <option>Meeting</option>
                                    <option>Online Call</option>
                                    <option>Proposal</option>
                                    <option>Other</option>
                                </select>
                                <input 
                                    type="datetime-local" 
                                    className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-500"
                                    value={newActivity.activity_date}
                                    onChange={e => setNewActivity({...newActivity, activity_date: e.target.value})}
                                />
                            </div>
                            <textarea 
                                placeholder="Summary of the activity or next steps..."
                                className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                value={newActivity.notes}
                                onChange={e => setNewActivity({...newActivity, notes: e.target.value})}
                            />
                            <div className="flex justify-end">
                                <button className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--color-primary)] transition-all shadow-lg active:scale-95">
                                    Post to Timeline
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Timeline Grid */}
                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 before:rounded-full">
                        {activities.map((act) => (
                            <div key={act.id} className="relative group/act">
                                {/* Dot Icon */}
                                <div className={`absolute -left-[32px] top-0 w-6 h-6 rounded-lg flex items-center justify-center border-4 border-white shadow-sm transition-all group-hover/act:scale-110 z-10 ${isFuture(act.activity_date) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {act.type === 'Call' && <Phone size={10} />}
                                    {act.type === 'Email' && <Mail size={10} />}
                                    {act.type === 'Meeting' && <Users size={10} />}
                                    {act.type === 'Online Call' && <Video size={10} />}
                                    {!['Call', 'Email', 'Meeting', 'Online Call'].includes(act.type) && <Info size={10} />}
                                </div>

                                <div className={`p-5 rounded-3xl border transition-all ${isFuture(act.activity_date) ? 'bg-green-50/30 border-green-100 shadow-sm' : 'bg-white border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isFuture(act.activity_date) ? 'text-green-600' : 'text-gray-400'}`}>
                                                {act.type} • {new Date(act.activity_date).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isFuture(act.activity_date) && (
                                                <span className="text-[9px] font-bold text-green-500 mt-0.5 flex items-center gap-1">
                                                    <Clock size={8} /> Scheduled
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{act.notes}</p>
                                </div>
                            </div>
                        ))}
                        {activities.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-gray-300 text-sm italic">No activities logged yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Name</label>
                            {isEditing ? (
                                <input value={editForm.contact_name || ''} onChange={e => setEditForm({...editForm, contact_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white" />
                            ) : (
                                <p className="font-bold text-gray-900 border-b border-gray-50 px-1 py-1">{lead.contact_name || '—'}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                            {isEditing ? (
                                <input value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white" />
                            ) : (
                                <p className="font-bold text-gray-900 border-b border-gray-50 px-1 py-1 truncate">{lead.email || '—'}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                            {isEditing ? (
                                <input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white" />
                            ) : (
                                <p className="font-bold text-gray-900 border-b border-gray-50 px-1 py-1">{lead.phone || '—'}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Country</label>
                            {isEditing ? (
                                <input value={editForm.country || ''} onChange={e => setEditForm({...editForm, country: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white" />
                            ) : (
                                <p className="font-bold text-gray-900 border-b border-gray-50 px-1 py-1">{lead.country || '—'}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Original Inquiry</label>
                        {isEditing ? (
                            <textarea value={editForm.message || ''} onChange={e => setEditForm({...editForm, message: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-sm h-32 focus:bg-white resize-none" />
                        ) : (
                            <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 italic border border-gray-100 min-h-[100px] leading-relaxed">
                                {lead.message || 'No inquiry text provided.'}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                            <select 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                                value={String(isEditing ? editForm.status_id : lead.status_id) || ''}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    if (isEditing) setEditForm({...editForm, status_id: val});
                                    else {
                                        fetch(`/api/pipeline.php?id=${id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status_id: val })
                                        }).then(() => { fetchLead(); onUpdate(); });
                                    }
                                }}
                            >
                                <option value="">Select Status</option>
                                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Source</label>
                            <select 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                                value={String(isEditing ? editForm.source_id : lead.source_id) || ''}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    if (isEditing) setEditForm({...editForm, source_id: val});
                                    else {
                                        fetch(`/api/pipeline.php?id=${id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ source_id: val })
                                        }).then(() => { fetchLead(); onUpdate(); });
                                    }
                                }}
                            >
                                <option value="">Select Source</option>
                                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PM</label>
                            <select 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                                value={String(isEditing ? editForm.pm_id : lead.pm_id) || ''}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    if (isEditing) setEditForm({...editForm, pm_id: val});
                                    else {
                                        fetch(`/api/pipeline.php?id=${id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ pm_id: val })
                                        }).then(() => { fetchLead(); onUpdate(); });
                                    }
                                }}
                            >
                                <option value="">Assigned PM</option>
                                {pms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                        {isEditing ? (
                            <button onClick={handleSaveLead} className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                                <Save size={18} /> Save Changes
                            </button>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="flex-1 bg-gray-50 text-gray-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
                                Edit Lead Profile
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                fetch(`/api/pipeline.php?id=${id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ is_archived: !lead.is_archived })
                                }).then(() => { fetchLead(); onUpdate(); onClose(); });
                            }}
                            className="p-4 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition-all"
                            title={lead.is_archived ? "Unarchive" : "Archive"}
                        >
                            <Archive size={20} />
                        </button>
                        <button onClick={handleDelete} className="p-4 bg-gray-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            )}
        </main>

        {/* Action Panel Holder (Fixed at bottom) */}
        <footer className="p-8 border-t border-gray-100 bg-white shadow-2xl-up flex items-center justify-center">
            <button 
                onClick={handleUpgrade}
                className="w-full py-5 bg-gradient-to-r from-[var(--color-primary)] to-amber-500 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-[var(--color-primary)]/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
            >
                <Briefcase size={22} className="group-hover:rotate-12 transition-transform" />
                UPGRADE TO LIVE PROJECT
            </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};
