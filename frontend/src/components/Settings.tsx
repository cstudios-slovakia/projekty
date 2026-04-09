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

  useEffect(() => {
    fetchEntities();
    fetchUsers();
  }, []);

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
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#e78b01]"
              value={newEntity.type === type ? newEntity.name : ''}
              onChange={e => setNewEntity({ type, name: e.target.value, color: newEntity.color })}
            />
            <button 
              onClick={() => handleAddEntity(type)}
              className="p-2.5 bg-[#e78b01] text-white rounded-xl shadow-lg shadow-[#e78b01]/10 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {predefinedColors.map(c => (
              <button
                key={c}
                onClick={() => setNewEntity({ ...newEntity, type, color: c })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${newEntity.color === c && newEntity.type === type ? 'ring-2 ring-offset-2 ring-[#e78b01] scale-110' : 'border-transparent hover:scale-110'}`}
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
                <span className="font-medium text-gray-700 truncate">{e.name}</span>
              </div>
              {(type === 'developer' || type === 'designer') && (
                <div className="flex items-center gap-1 mx-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-400 font-bold">€</span>
                  <input
                    type="number"
                    className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 outline-none focus:border-[#e78b01] text-right"
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
    <div className="space-y-8 animate-fade-in px-1 md:px-0">
      <div className="flex flex-col lg:flex-row flex-wrap gap-6">
        {renderEntityColumn('Developers', 'developer')}
        {renderEntityColumn('Designers', 'designer')}
        {renderEntityColumn('Project Managers', 'pm')}
        {renderEntityColumn('Project Types', 'project_type')}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-200 p-6 md:p-10 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <UserPlus className="text-[#e78b01]" /> User Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <h4 className="font-bold text-gray-700 mb-4">Add New User</h4>
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[#e78b01] transition-all" 
              value={newUser.username}
              onChange={e => setNewUser({...newUser, username: e.target.value})}
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[#e78b01] transition-all" 
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              required
            />
            <button type="submit" className="w-full md:w-auto bg-[#e78b01] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-[#e78b01]/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Create User Account
            </button>
          </form>

          <div>
            <h4 className="font-bold text-gray-700 mb-6 font-mono tracking-wider uppercase text-xs">Active System Users</h4>
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 font-bold group-hover:bg-[#e78b01] group-hover:text-white transition-all">
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
    </div>
  );
};
