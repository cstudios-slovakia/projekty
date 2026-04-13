import React, { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, UserX } from 'lucide-react';

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
  role: string;
}

export const Settings: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newEntity, setNewEntity] = useState({ type: 'developer', name: '', color: '#3b82f6' });
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  
  // System Settings
  const [sysSettings, setSysSettings] = useState({ 
    system_title: 'Lead Tracker', 
    accent_color_primary: '#e78b01', 
    accent_color_secondary: '#00b800',
    lead_api_key: ''
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchEntities();
    fetchUsers();
    fetchSysSettings();

    // Check admin role
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined') {
        try {
            const payload = JSON.parse(atob(token));
            console.log("Session Role Check:", payload.role);
            if (payload.role === 'admin') setIsAdmin(true);
        } catch (e) {
            console.error("Token parse error", e);
        }
    }
  }, []);

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
            lead_api_key: d.lead_api_key || ''
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
        alert('System settings updated! Refreshing...');
        window.location.reload();
    });
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
    if(!confirm('Delete this entity?')) return;
    fetch(`/api/settings.php?id=${id}`, { method: 'DELETE' }).then(() => fetchEntities());
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
      setNewUser({ username: '', password: '' });
      fetchUsers();
    });
  };

  const handleDeleteUser = (id: number) => {
    if(!confirm('Delete this user?')) return;
    fetch(`/api/users.php?id=${id}`, { method: 'DELETE' }).then(() => fetchUsers());
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

  const renderEntityColumn = (title: string, type: string) => {
    const list = entities.filter(e => e.type === type);
    return (
      <div className="flex-1 min-w-[350px] bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full font-bold">{list.length}</span>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={`New ${title.slice(0,-1)}...`} 
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
            {predefinedColors.map(c => (
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
          {list.map(e => (
            <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl group border border-transparent hover:border-gray-200 transition-all">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-4 h-4 rounded-full shadow-inner flex-shrink-0" style={{ backgroundColor: e.color }}></div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-gray-900 truncate text-sm leading-tight">{e.name}</span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">ID #{e.id}</span>
                </div>
              </div>
              {(type === 'developer' || type === 'designer') && (
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
          {list.length === 0 && <p className="text-center text-gray-400 py-8 text-sm italic">No {title.toLowerCase()} yet.</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in px-1 md:px-0 pb-12">
      <div className="flex flex-col lg:flex-row flex-wrap gap-6">
        {renderEntityColumn('Developers', 'developer')}
        {renderEntityColumn('Designers', 'designer')}
        {renderEntityColumn('Project Managers', 'pm')}
        {renderEntityColumn('Project Types', 'project_type')}
      </div>

      <div className="flex flex-col lg:flex-row flex-wrap gap-6">
        {renderEntityColumn('Lead Statuses', 'lead_status')}
        {renderEntityColumn('Lead Sources', 'lead_source')}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 p-6 md:p-10 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <UserPlus className="text-[var(--color-primary)]" /> User Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <h4 className="font-bold text-gray-700 mb-4">Add New User</h4>
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[var(--color-primary)] transition-all" 
              value={newUser.username}
              onChange={e => setNewUser({...newUser, username: e.target.value})}
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[var(--color-primary)] transition-all" 
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              required
            />
            <button type="submit" className="w-full md:w-auto bg-[var(--color-primary)] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Create User Account
            </button>
          </form>

          <div>
            <h4 className="font-bold text-gray-700 mb-6 font-mono tracking-wider uppercase text-xs">Active System Users</h4>
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 font-bold group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{u.username}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-widest">{u.role}</div>
                    </div>
                  </div>
                  {u.username !== 'admin' && (
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <UserX size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin System Settings moved to bottom */}
      {isAdmin && (
        <div className="bg-white rounded-[32px] border-4 border-[var(--color-primary)]/10 p-6 md:p-10 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Plus size={120} className="rotate-45" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white">
                <Plus size={18} />
              </span>
              Global System Appearance
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">System Title</label>
                    <input 
                        type="text" 
                        value={sysSettings.system_title}
                        onChange={e => setSysSettings({...sysSettings, system_title: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                        placeholder="e.g. Lead Tracker"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Primary Accent Color</label>
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Secondary Accent</label>
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

                <div className="space-y-2 md:col-span-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Lead API Security Key</label>
                    <div className="flex gap-3">
                        <input 
                            type="text" 
                            value={sysSettings.lead_api_key}
                            onChange={e => setSysSettings({...sysSettings, lead_api_key: e.target.value})}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-mono text-sm"
                            placeholder="sk_live_..."
                        />
                        <button 
                            onClick={generateApiKey}
                            className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--color-primary)] transition-all active:scale-95 whitespace-nowrap"
                        >
                            Generate New
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={saveSysSettings}
                    className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[var(--color-primary)] transition-all shadow-lg active:scale-95"
                >
                    Save Changes
                </button>
            </div>
        </div>
      )}

      {/* API Integration Instructions */}
      <div className="bg-white rounded-[32px] border border-gray-200 p-6 md:p-10 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          API Integration <span className="bg-blue-50 text-blue-500 text-xs px-3 py-1 rounded-full uppercase tracking-widest font-black">Lead Pipeline</span>
        </h3>
        <p className="text-gray-500 mb-6 text-sm">
          Connect your external websites, landing pages, or contact forms directly to the pipeline. Send a POST request to <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono border border-gray-200">/api/pipeline.php</code>.
        </p>
        
        <div className="bg-gray-900 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]"></div>
            <pre className="text-gray-300 font-mono text-xs whitespace-pre-wrap">
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
                title="Copy to clipboard"
            >
                Copy
            </button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h5 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-2">Required Fields</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li><code className="text-gray-900">company_name</code> or <code className="text-gray-900">contact_name</code></li>
                </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h5 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-2">Optional Fields</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li><code className="text-gray-900">email</code>, <code className="text-gray-900">phone</code>, <code className="text-gray-900">country</code></li>
                    <li><code className="text-gray-900">message</code> (Lead Notes)</li>
                    <li><code className="text-gray-900">source_id</code> (Foreign key to Lead Sources)</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};
