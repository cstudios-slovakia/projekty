import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, RefreshCw, 
  Globe, Mail, 
  ArrowUpRight, Zap
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { createPortal } from 'react-dom';
import { LeadSlideout } from './LeadSlideout';

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
  updated_at: string;
  // joined fields
  status_name?: string;
  status_color?: string;
  source_name?: string;
  source_color?: string;
  pm_name?: string;
  pm_color?: string;
  last_activity?: string;
  last_activity_type?: string;
  last_activity_notes?: string;
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

export const LeadsView: React.FC<Props> = ({ archivedView = false }) => {
  const { t } = useTranslation();
  const userToken = localStorage.getItem('token');
  const user = userToken ? JSON.parse(atob(userToken)) : null;
  const canEdit = user?.role !== 'viewer';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [entities, setEntities] = useState<SettingsEntity[]>([]);
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState<Partial<Lead>>({
    company_name: '', contact_name: '', email: '', phone: '', country: '', message: ''
  });

  useEffect(() => {
    fetchLeads();
    fetchEntities();
    
    const handleUpdate = () => fetchLeads();
    window.addEventListener('leadsUpdated', handleUpdate);
    return () => window.removeEventListener('leadsUpdated', handleUpdate);
  }, [archivedView]);

  const fetchLeads = () => {
    fetch(`/api/pipeline.php?archived=${archivedView}`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') setLeads(res.data || []);
      });
  };

  const fetchEntities = () => {
    fetch('/api/settings.php')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') setEntities(res.data || []);
      });
  };

  const statuses = entities.filter(e => e.type === 'lead_status');
  const sources = entities.filter(e => e.type === 'lead_source');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/pipeline.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLeadForm)
    })
    .then(r => r.json())
    .then(res => {
      if (res.status === 'success') {
        setIsCreating(false);
        setNewLeadForm({ company_name: '', contact_name: '', email: '', phone: '', country: '', message: '' });
        fetchLeads();
      } else {
        alert(t('common.error') + ": " + (res.message || t('leads.error_msg') || 'Failed to save lead'));
      }
    })
    .catch(err => {
      alert(t('login.connection_error') + ": The Leads API might be down or not responding.");
      console.error(err);
    });
  };

  const filteredLeads = leads.filter(l => {
    const search = filterName.toLowerCase();
    return (l.company_name.toLowerCase().includes(search) || l.contact_name.toLowerCase().includes(search)) &&
           (filterStatus === '' || String(l.status_id) === filterStatus) &&
           (filterSource === '' || String(l.source_id) === filterSource);
  });

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return t('leads.activities.no_activity');
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return t('leads.activities.just_now') || 'Just now';
    if (diff < 3600) return `${Math.floor(diff/60)}${t('common.minutes_unit') || 'm'} ${t('common.ago') || 'ago'}`;
    if (diff < 86400) return `${Math.floor(diff/3600)}${t('common.hours_unit') || 'h'} ${t('common.ago') || 'ago'}`;
    return date.toLocaleDateString();
  };

  const isFutureActivity = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) > new Date();
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 bg-white rounded-2xl p-2 border border-gray-200 shadow-sm flex-1 w-full md:w-auto">
          <div className="pl-3 text-gray-400"><Search size={18} /></div>
          <input 
            placeholder={t('leads.search_placeholder')} 
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
          />
          <div className="h-8 w-px bg-gray-100 mx-2"></div>
          <select 
            className="bg-transparent text-xs font-bold text-gray-400 uppercase tracking-widest outline-none pr-8 cursor-pointer hover:text-gray-900 transition-colors"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">{t('common.status')}</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select 
            className="bg-transparent text-xs font-bold text-gray-400 uppercase tracking-widest outline-none pr-8 cursor-pointer hover:text-gray-900 transition-colors"
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
          >
            <option value="">{t('common.source')}</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
           <button 
            onClick={fetchLeads}
            className="p-3 bg-white rounded-2xl border border-gray-200 text-gray-400 hover:text-[var(--color-primary)] transition-all active:scale-95"
          >
            <RefreshCw size={20} />
          </button>
          {!archivedView && canEdit && (
            <button onClick={() => setIsCreating(true)} className="flex-1 md:flex-none bg-[var(--color-primary)] text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all">
              <Plus size={18} /> {t('leads.new_lead')}
            </button>
          )}
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredLeads.map(lead => (
          <div 
            key={lead.id} 
            onClick={() => setSelectedLeadId(lead.id)}
            className="bg-white rounded-[32px] border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
          >
            {/* Status Badge */}
            <div className="flex justify-between items-start mb-4">
              <div 
                className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                style={{ 
                  backgroundColor: `${lead.status_color}10`, 
                  color: lead.status_color,
                  borderColor: `${lead.status_color}30`
                }}
              >
                {lead.status_name ? (t(`leads.status_${lead.status_name.toLowerCase().replace(/ /g, '_')}`) || lead.status_name) : (t('common.no_status') || 'No Status')}
              </div>
              {isFutureActivity(lead.last_activity) && (
                <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-green-100">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  {t('leads.next_action')}
                </div>
              )}
            </div>

            {/* Lead Info */}
            <div className="flex-1">
              <h3 className="text-xl font-black text-gray-900 leading-tight mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                {lead.company_name || lead.contact_name}
              </h3>
              <p className="text-sm font-bold text-gray-400 mb-4">{lead.contact_name && lead.company_name ? lead.contact_name : ''}</p>
              
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                  <Globe size={14} className="text-gray-300" />
                  <span>{lead.country || t('common.unknown_location') || 'Unknown Location'}</span>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                    <Mail size={14} className="text-gray-300" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: lead.pm_color || '#e2e8f0' }}></div>
                  <span className="font-bold">{t('common.pm')}: {lead.pm_name || t('leads.unassigned')}</span>
                </div>
              </div>

              {/* Last Action Snippet */}
              {lead.last_activity_notes && (
                <div className="mt-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col gap-1 group-hover:bg-white transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap size={10} className="text-[var(--color-primary)]" />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {t('leads.activities.latest_action') || 'Latest Action'} {lead.last_activity_type ? `• ${lead.last_activity_type}` : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed italic">
                    "{lead.last_activity_notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('leads.last_activity')}</span>
                <span className={`text-xs font-bold ${isFutureActivity(lead.last_activity) ? 'text-green-600' : 'text-gray-600'}`}>
                  {getRelativeTime(lead.last_activity || '')}
                </span>
              </div>
              <div 
                className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all shadow-inner"
                style={lead.source_color ? { backgroundColor: `${lead.source_color}10`, color: lead.source_color } : {}}
              >
                <ArrowUpRight size={20} />
              </div>
            </div>

            {/* Source Label (Floating) */}
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-gray-900 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">
                    {lead.source_name ? (t(`leads.source_${lead.source_name.toLowerCase().replace(/ /g, '_')}`) || lead.source_name) : (t('common.direct') || 'Direct')}
                </span>
            </div>
          </div>
        ))}

        {filteredLeads.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-[32px] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-4">
                <Users size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-400">{t('leads.no_leads')}</h4>
              <p className="text-sm text-gray-300 max-w-xs mt-1">{t('leads.try_adjusting')}</p>
           </div>
        )}
      </div>

      {/* Creation Modal */}
      {isCreating && createPortal(
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreate}
            className="bg-white w-full max-w-2xl rounded-[40px] p-8 md:p-12 shadow-2xl animate-scale-in relative"
          >
            {/* Background Decorations */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[var(--color-primary)]/5 rounded-full blur-3xl"></div>
            
            <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
              <div className="p-3 bg-[var(--color-primary)] text-white rounded-2xl shadow-lg shadow-[var(--color-primary)]/20">
                <Plus size={24} />
              </div>
              {t('leads.initialize_lead')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('leads.company_name')}</label>
                  <input 
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all font-bold"
                    placeholder="e.g. Acme Corp"
                    value={newLeadForm.company_name || ''}
                    onChange={e => setNewLeadForm({...newLeadForm, company_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('leads.contact_person')}</label>
                  <input 
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                    placeholder="John Doe"
                    value={newLeadForm.contact_name || ''}
                    onChange={e => setNewLeadForm({...newLeadForm, contact_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('leads.email')}</label>
                  <input 
                    type="email"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                    placeholder="hello@acme.com"
                    value={newLeadForm.email || ''}
                    onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('leads.phone')}</label>
                  <input 
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                    placeholder="+421 ..."
                    value={newLeadForm.phone || ''}
                    onChange={e => setNewLeadForm({...newLeadForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('leads.country')}</label>
                  <input 
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                    placeholder="Slovakia"
                    value={newLeadForm.country || ''}
                    onChange={e => setNewLeadForm({...newLeadForm, country: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('settings.tabs.lead')}</label>
                    <div className="grid grid-cols-2 gap-2">
                        <select 
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold"
                            value={String(newLeadForm.status_id || '')}
                            onChange={e => setNewLeadForm({...newLeadForm, status_id: Number(e.target.value)})}
                        >
                            <option value="">{t('common.status')}</option>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select 
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold"
                            value={String(newLeadForm.source_id || '')}
                            onChange={e => setNewLeadForm({...newLeadForm, source_id: Number(e.target.value)})}
                        >
                            <option value="">{t('common.source')}</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('leads.inquiry_message')}</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all h-32 resize-none"
                placeholder={t('leads.inquiry_placeholder') || "Details about the lead or the project inquiry..."}
                value={newLeadForm.message || ''}
                onChange={e => setNewLeadForm({...newLeadForm, message: e.target.value})}
              />
            </div>

            <div className="mt-10 flex items-center justify-end gap-4">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-8 py-4 font-black uppercase text-xs tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                type="submit"
                className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-[var(--color-primary)] transition-all active:scale-95"
              >
                {t('leads.initialize_lead')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Detail Slideout */}
      {selectedLeadId && createPortal(
        <LeadSlideout 
          id={selectedLeadId} 
          entities={entities}
          onClose={() => setSelectedLeadId(null)} 
          onUpdate={fetchLeads}
        />,
        document.body
      )}
    </div>
  );
};
