import React, { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, UserX, Shield, User as UserIcon } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface Entity {
  id: number;
  type: string;
  name: string;
  color: string;
  hourly_rate: number;
}

interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  member_id?: number | null;
}

export const Settings: React.FC = () => {
  const { t, changeLanguage, availableLocales } = useTranslation();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newEntity, setNewEntity] = useState({ type: 'developer', name: '', color: '#3b82f6' });
  const [newUser, setNewUser] = useState<{username: string, password: string, email?: string, role?: string}>({ username: '', password: '', email: '', role: 'viewer' });
  const [activeTab, setActiveTab] = useState<'project' | 'lead' | 'users' | 'roles' | 'system'>('project');
  
  // System Settings
  const [sysSettings, setSysSettings] = useState({ 
    system_title: 'Lead Tracker', 
    accent_color_primary: '#e78b01', 
    accent_color_secondary: '#00b800',
    lead_api_key: '',
    default_language: 'en'
  });
  
  const [userSettings, setUserSettings] = useState({
    language: localStorage.getItem('lang') || 'en'
  });
  
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    fetchEntities();
    fetchUsers();
    fetchSysSettings();
    fetchRoles();
  }, []);

  const fetchRoles = () => {
    fetch('/api/roles.php')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          setRoles(res.data || []);
        }
      });
  };

  const fetchSysSettings = () => {
    fetch('/api/system_settings.php')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          const d = res.data;
          setSysSettings({
            system_title: d.system_title || 'Lead Tracker',
            accent_color_primary: d.accent_color_primary || '#e78b01',
            accent_color_secondary: d.accent_color_secondary || '#00b800',
            lead_api_key: d.lead_api_key || '',
            default_language: d.default_language || 'en'
          });
        }
      });
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk_live_';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSysSettings({ ...sysSettings, lead_api_key: result });
  };

  const saveSysSettings = () => {
    fetch('/api/system_settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sysSettings)
    }).then(r => r.json()).then(() => {
        alert(t('common.save_success') || 'Settings updated!');
        window.location.reload();
    });
  };

  const saveUserLanguage = (lang: string) => {
    setUserSettings({ ...userSettings, language: lang });
    const userId = localStorage.getItem('userId');
    
    if (userId) {
      fetch(`/api/users.php?id=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      }).then(r => r.json()).then(res => {
        if (res.status === 'success') {
          localStorage.setItem('lang', lang);
          changeLanguage(lang);
        }
      });
    } else {
      localStorage.setItem('lang', lang);
      changeLanguage(lang);
    }
  };

  const fetchEntities = () => {
    fetch('/api/settings.php').then(r => r.json()).then(res => {
      if(res.status === 'success') setEntities(res.data || []);
    });
  };

  const fetchUsers = () => {
    fetch('/api/users.php').then(r => r.json()).then(res => {
      if(res.status === 'success') setUsers(res.data || []);
    });
  };

  const handleAddEntity = (type?: string) => {
    const entityToAdd = type ? { ...newEntity, type } : newEntity;
    if (!entityToAdd.name) return;
    fetch('/api/settings.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entityToAdd)
    }).then(() => {
      setNewEntity({ ...newEntity, name: '' });
      fetchEntities();
    });
  };

  const handleDeleteEntity = (id: number) => {
    if(!confirm(t('common.confirm_delete'))) return;
    fetch(`/api/settings.php?id=${id}`, { method: 'DELETE' }).then(() => fetchEntities());
  };

  const handleDeleteRole = (id: number) => {
    if(!confirm(t('common.confirm_delete'))) return;
    fetch(`/api/roles.php?id=${id}`, { method: 'DELETE' }).then(() => fetchRoles());
  };

  const handleRenameRole = (id: number, newLabel: string) => {
    if(!newLabel.trim()) return;
    fetch(`/api/roles.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel.trim() })
    }).then(() => fetchRoles());
  };

  const handleUpdateRate = (entity: Entity, rate: number) => {
    fetch(`/api/settings.php?id=${entity.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: entity.name, color: entity.color, hourly_rate: rate })
    }).then(() => fetchEntities());
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).then(() => {
      setNewUser({ username: '', password: '', email: '' });
      fetchUsers();
    });
  };

  const handleDeleteUser = (id: number) => {
    if(!confirm(t('common.confirm_delete'))) return;
    fetch(`/api/users.php?id=${id}`, { method: 'DELETE' }).then(() => fetchUsers());
  };

  const handleUpdateUser = (id: number, field: string, value: any) => {
    fetch(`/api/users.php?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    }).then(() => fetchUsers());
  };

  const predefinedColors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Orange
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#f43f5e', // Rose
    '#0ea5e9', // Sky
    '#8b5cf6', // Violet
  ];

  const renderEntityColumn = (title: string, type: string, roleId?: number, hasHourlyRate: boolean = true) => {
    const list = entities.filter((e: Entity) => e.type === type);
    return (
      <div className="flex-1 min-w-[350px] bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex w-full items-center justify-between gap-3 mr-3 border-b pb-2">
            {roleId ? (
              <input
                type="text"
                className="text-xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 rounded px-1 -ml-1 flex-1"
                defaultValue={title}
                onBlur={(e) => {
                  if(e.target.value !== title) handleRenameRole(roleId, e.target.value);
                }}
                onKeyDown={(e) => {
                  if(e.key === 'Enter') e.currentTarget.blur();
                }}
                title="Click to rename role"
              />
            ) : (
              <h3 className="text-xl font-bold text-gray-900 flex-1">{title}</h3>
            )}
            {roleId && (
              <button 
                onClick={() => handleDeleteRole(roleId)} 
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                title="Delete this dynamic role"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold ml-2">{list.length}</span>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={t('settings.add_new') + "..."} 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              value={newEntity.type === type ? newEntity.name : ''}
              onChange={e => setNewEntity({ type, name: e.target.value, color: newEntity.color })}
            />
            <button 
              onClick={() => handleAddEntity(type)}
              className="p-2.5 bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/10 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {predefinedColors.map((c: string) => (
              <button
                key={c}
                onClick={() => setNewEntity({ ...newEntity, type, color: c })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${newEntity.color === c && newEntity.type === type ? 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pr-2 max-h-[400px]">
           {list.map((e: Entity) => (
             <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl group border border-transparent hover:border-gray-200 transition-all">
               <div className="flex items-center gap-3 flex-1 min-w-0">
                 <div className="w-4 h-4 rounded-full shadow-inner flex-shrink-0" style={{ backgroundColor: e.color || '#ccc' }}></div>
                 <div className="flex flex-col min-w-0">
                   <span className="font-bold text-gray-900 truncate text-sm leading-tight">{e.name}</span>
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">ID #{e.id}</span>
                 </div>
               </div>
               {hasHourlyRate && (
                 <div className="flex items-center gap-1 mx-2 flex-shrink-0">
                   <span className="text-[10px] text-gray-400 font-bold">€</span>
                   <input
                     type="number"
                     className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 outline-none focus:border-[var(--color-primary)] text-right"
                     defaultValue={e.hourly_rate || 0}
                     onBlur={(ev) => handleUpdateRate(e, Number(ev.target.value))}
                     placeholder="/h"
                     min="0"
                   />
                   <span className="text-[10px] text-gray-400 font-bold">/h</span>
                 </div>
               )}
               <button onClick={() => handleDeleteEntity(e.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                 <Trash2 size={16} />
               </button>
             </div>
           ))}
           {list.length === 0 && <p className="text-center text-gray-400 py-8 text-sm italic">{t('common.no_data')}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in px-1 md:px-0 pb-12">
      {/* Pills Navigation */}
      <div className="flex items-center gap-1 bg-gray-900/5 p-1 rounded-2xl border border-gray-200/50 w-fit mb-4">
          <button 
              onClick={() => setActiveTab('project')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'project' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
          >
              {t('settings.tabs.project')}
          </button>
          <button 
              onClick={() => setActiveTab('lead')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'lead' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
          >
              {t('settings.tabs.lead')}
          </button>
          <button 
              onClick={() => setActiveTab('roles')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'roles' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
          >
              Team & Roles
          </button>
          <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
          >
              {t('settings.tabs.users')}
          </button>
          <button 
              onClick={() => setActiveTab('system')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'system' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
          >
              {t('settings.tabs.system')}
          </button>
      </div>

      <div className="pt-2">
        {/* TAB: Project Settings */}
        {activeTab === 'project' && (
          <div className="flex flex-col lg:flex-row flex-wrap gap-6">
            {renderEntityColumn(t('projects.types') || 'Project Types', 'project_type', undefined, false)}
          </div>
        )}

        {/* TAB: Team & Roles */}
        {activeTab === 'roles' && (
          <div className="flex flex-col lg:flex-row flex-wrap gap-6">
            <div className="w-full flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 ml-4">Core Team Overview</h3>
            </div>
            {renderEntityColumn(t('projects.pms') || 'Project Managers', 'pm', undefined, true)}
            {renderEntityColumn(t('projects.designer') || 'Designers', 'designer', undefined, true)}
            {renderEntityColumn(t('projects.developer') || 'Developers', 'developer', undefined, true)}

            <div className="w-full flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-200 mt-4">
              <h3 className="text-xl font-bold text-gray-900 ml-4">{t('settings.roles.title') || 'Dynamic & Additional Roles'}</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder={t('settings.roles.add_new') || 'Add New Role...'} 
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  id="new_role_input"
                  onKeyDown={e => {
                    if(e.key === 'Enter') {
                       const el = e.target as HTMLInputElement;
                       if(el.value) {
                         fetch('/api/roles.php', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ label: el.value, is_timeline_group: true, sort_order: (roles.length + 1) * 10 })
                         }).then(() => {
                           el.value = '';
                           fetchRoles();
                         });
                       }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const el = document.getElementById('new_role_input') as HTMLInputElement;
                    if(el && el.value) {
                      fetch('/api/roles.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ label: el.value, is_timeline_group: true, sort_order: (roles.length + 1) * 10 })
                      }).then(() => {
                        el.value = '';
                        fetchRoles();
                      });
                    }
                  }}
                  className="p-2.5 bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/10 hover:scale-105 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            {roles.filter((r: any) => !['developer', 'designer'].includes(r.label.toLowerCase())).map((r: any) => renderEntityColumn(r.label, r.label.toLowerCase(), r.id, true))}
          </div>
        )}

        {/* TAB: Lead Settings */}
        {activeTab === 'lead' && (
          <div className="flex flex-col lg:flex-row flex-wrap gap-6">
            {renderEntityColumn(t('leads.statuses') || 'Lead Statuses', 'lead_status')}
            {renderEntityColumn(t('leads.sources') || 'Lead Sources', 'lead_source')}
          </div>
        )}

        {/* TAB: Users */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-[32px] border border-gray-200 p-6 md:p-10 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <UserPlus className="text-[var(--color-primary)]" /> {t('settings.users.title') || 'User Management'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <h4 className="font-bold text-gray-700 mb-4">{t('settings.users.add_new')}</h4>
                <input 
                  type="text" 
                  placeholder={t('login.username')} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[var(--color-primary)] transition-all" 
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  required
                />
                <div className="flex gap-4">
                  <input 
                    type="password" 
                    placeholder={t('login.password')} 
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[var(--color-primary)] transition-all" 
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[var(--color-primary)] transition-all" 
                    value={newUser.email || ''}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                  <select
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[var(--color-primary)] transition-all"
                    value={newUser.role || 'viewer'}
                    onChange={e => setNewUser({...newUser, role: e.target.value as User['role']})}
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[var(--color-primary)] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  {t('settings.users.create_button')}
                </button>
              </form>

              <div>
                <h4 className="font-bold text-gray-700 mb-6 font-mono tracking-wider uppercase text-xs">{t('settings.users.active_users')}</h4>
                <div className="space-y-3">
                  {users.map((u: User) => (
                    <div key={u.id} className="flex flex-col gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 font-bold group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{u.username}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-widest leading-none mt-1">ID #{u.id}</div>
                          </div>
                        </div>
                        {u.username !== 'admin' && (
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <UserX size={18} />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200/60 mt-1">
                        <input
                          type="email"
                          placeholder="Email Address"
                          className="bg-white border rounded-lg px-3 py-1.5 text-xs border-gray-200 text-gray-700 w-[150px] md:w-auto flex-1"
                          defaultValue={u.email || ''}
                          onBlur={(e) => {
                             if(e.target.value !== (u.email || '')) handleUpdateUser(u.id, 'email', e.target.value);
                          }}
                        />
                        <select
                          className={`bg-white border rounded-lg px-3 py-1.5 text-xs font-bold ${u.username === 'admin' ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400' : 'border-gray-200 text-gray-700'}`}
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u.id, 'role', e.target.value)}
                          disabled={u.username === 'admin'}
                        >
                          <option value="admin">Admin Role</option>
                          <option value="manager">Manager Role</option>
                          <option value="employee">Employee Role</option>
                          <option value="viewer">Viewer Role</option>
                        </select>
                        {(u.role === 'employee' || u.role === 'manager' || u.role === 'admin') && (
                          <select
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 max-w-[180px] md:max-w-none"
                            value={u.member_id || ''}
                            onChange={(e) => handleUpdateUser(u.id, 'member_id', e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">-- Link to Person --</option>
                            {(() => {
                              const linkedEntities = entities.filter(e => !['project_type', 'lead_status', 'lead_source'].includes(e.type));
                              const grouped = linkedEntities.reduce((acc, curr) => {
                                if(!acc[curr.type]) acc[curr.type] = [];
                                acc[curr.type].push(curr);
                                return acc;
                              }, {} as any);
                              
                              const order = ['pm', 'designer', 'developer'];
                              const keys = Object.keys(grouped).sort((a, b) => {
                                const aIdx = order.indexOf(a);
                                const bIdx = order.indexOf(b);
                                if(aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                                if(aIdx !== -1) return -1;
                                if(bIdx !== -1) return 1;
                                return a.localeCompare(b);
                              });

                              return keys.map(type => (
                                <optgroup key={type} label={type.toUpperCase()}>
                                  {grouped[type].map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                                  ))}
                                </optgroup>
                              ));
                            })()}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: System Settings */}
        {activeTab === 'system' && (
          <div className="space-y-8">
            {/* User Profile / Language */}
            <div className="bg-white rounded-[32px] border border-gray-200 p-6 md:p-10 shadow-sm overflow-hidden relative">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <UserIcon className="text-[var(--color-primary)]" /> {t('settings.profile.title') || 'Personal Preferences'}
                  </h3>
                  <button onClick={() => saveUserLanguage(userSettings.language)} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-primary)] transition-all active:scale-95">Save</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.profile.language') || 'Interface Language'}</label>
                        <div className="flex gap-4">
                            {availableLocales.map((l: any) => (
                                <button 
                                    key={l.code}
                                    onClick={() => setUserSettings({ ...userSettings, language: l.code })}
                                    className={`flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${userSettings.language === l.code ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-inner' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}
                                >
                                    <span className="text-2xl">{l.flag}</span>
                                    <span className="text-xs font-bold text-gray-700">{l.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border-4 border-[var(--color-primary)]/10 p-6 md:p-10 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Plus size={120} className="rotate-45" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                  <Shield className="text-[var(--color-primary)]" /> {t('settings.system.title') || 'Global System Appearance & Security'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.system.app_title') || 'System Title'}</label>
                        <input 
                            type="text" 
                            value={sysSettings.system_title}
                            onChange={e => setSysSettings({...sysSettings, system_title: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.system.primary_color') || 'Primary Accent Color'}</label>
                        <div className="flex gap-3">
                            <input 
                                type="color" 
                                value={sysSettings.accent_color_primary}
                                onChange={e => setSysSettings({...sysSettings, accent_color_primary: e.target.value})}
                                className="w-16 h-14 bg-white border border-gray-200 rounded-2xl p-1 cursor-pointer"
                            />
                            <input 
                                type="text" 
                                value={sysSettings.accent_color_primary}
                                onChange={e => setSysSettings({...sysSettings, accent_color_primary: e.target.value})}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-mono text-xs font-bold"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.system.secondary_color') || 'Secondary Accent'}</label>
                        <div className="flex gap-3">
                            <input 
                                type="color" 
                                value={sysSettings.accent_color_secondary}
                                onChange={e => setSysSettings({...sysSettings, accent_color_secondary: e.target.value})}
                                className="w-16 h-14 bg-white border border-gray-200 rounded-2xl p-1 cursor-pointer"
                            />
                            <input 
                                type="text" 
                                value={sysSettings.accent_color_secondary}
                                onChange={e => setSysSettings({...sysSettings, accent_color_secondary: e.target.value})}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-mono text-sm uppercase"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.system.default_language') || 'System Default Language'}</label>
                        <select 
                            value={sysSettings.default_language}
                            onChange={e => setSysSettings({...sysSettings, default_language: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                        >
                            {availableLocales.map((l: any) => (
                                <option key={l.code} value={l.code}>
                                    {l.flag} {l.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2 md:col-span-2 pt-0">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('settings.system.api_key') || 'Lead API Security Key'}</label>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input 
                                type="text" 
                                value={sysSettings.lead_api_key}
                                onChange={e => setSysSettings({...sysSettings, lead_api_key: e.target.value})}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-mono text-sm"
                                placeholder={t('settings.system.api_key_placeholder') || "sk_live_..."}
                            />
                            <button 
                                onClick={generateApiKey}
                                className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--color-primary)] transition-all active:scale-95 whitespace-nowrap"
                            >
                                {t('settings.system.generate_new') || 'Generate New'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-100 flex justify-end relative z-10">
                    <button 
                        onClick={saveSysSettings}
                        className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[var(--color-primary)] transition-all shadow-lg active:scale-95"
                    >
                        {t('settings.system.save_button') || 'Save System Configuration'}
                    </button>
                </div>
            </div>

            {/* API Integration Instructions */}
            <div className="bg-white rounded-[32px] border border-gray-200 p-6 md:p-10 shadow-sm relative z-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                {t('settings.api.title')} <span className="bg-blue-50 text-blue-500 text-xs px-3 py-1 rounded-full uppercase tracking-widest font-black">{t('leads.title')} {t('calendar.timeline') || 'Pipeline'}</span>
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                {t('settings.api.subtitle')} <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono border border-gray-200">/api/pipeline.php</code>.
              </p>
              
              <div className="bg-gray-900 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]"></div>
                  <pre className="text-gray-300 font-mono text-[10px] md:text-xs whitespace-pre-wrap overflow-x-auto">
{`curl -X POST https://yourdomain.com/api/pipeline.php \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: ${sysSettings.lead_api_key || 'sk_live_lead_tracker_123456'}" \\
  -d '{
    "company_name": "Acme Corp",
    "contact_name": "John Doe",
    "email": "john@acme.com",
    "phone": "+421900111222",
    "message": "We need a new ecommerce website.",
    "source_id": 1
  }'`}
                  </pre>
                  <button 
                      onClick={() => navigator.clipboard.writeText(`curl -X POST https://yourdomain.com/api/pipeline.php \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-KEY: ${sysSettings.lead_api_key || 'sk_live_lead_tracker_123456'}" \\\n  -d '{\n    "company_name": "Acme Corp",\n    "contact_name": "John Doe",\n    "email": "john@acme.com",\n    "phone": "+421900111222",\n    "message": "We need a new ecommerce website.",\n    "source_id": 1\n  }'`)}
                      className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-all opacity-0 group-hover:opacity-100"
                      title={t('common.copy') || "Copy"}
                  >
                      {t('common.copy') || "Copy"}
                  </button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h5 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-2">{t('settings.api.required')}</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                          <li><code className="text-gray-900">company_name</code> {t('common.or')} <code className="text-gray-900">contact_name</code></li>
                      </ul>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h5 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-2">{t('settings.api.optional')}</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                          <li><code className="text-gray-900">email</code>, <code className="text-gray-900">phone</code>, <code className="text-gray-900">country</code></li>
                          <li><code className="text-gray-900">message</code> (Lead Notes)</li>
                          <li><code className="text-gray-900">source_id</code> (Foreign key to Lead Sources)</li>
                      </ul>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
