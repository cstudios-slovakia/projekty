import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, DollarSign, Clock } from 'lucide-react';

interface Expense {
  id: number;
  project_id: number;
  entity_id: number | null;
  hours: number;
  week: string;
  entity_name?: string;
  entity_color?: string;
  entity_type?: string;
  hourly_rate?: number;
  custom_name?: string;
  custom_cost?: number;
  updated_at?: string;
}

interface Entity {
  id: number;
  type: string;
  name: string;
  color: string;
  hourly_rate: number;
}

interface Props {
  projectId: number;
  projectName: string;
  devBudget: number;
  onClose: () => void;
  onBudgetChange: (budget: number) => void;
}

// Get current week as "YYYY-Wxx"
const getCurrentWeek = () => {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
  const weekNum = Math.ceil((days + oneJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

export const ExpenseSlideout: React.FC<Props> = ({ projectId, projectName, devBudget, onClose, onBudgetChange }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRow, setNewRow] = useState({ entity_id: '', hours: '', week: getCurrentWeek(), custom_name: '', custom_cost: '' });
  const [budget, setBudget] = useState(devBudget || 0);

  useEffect(() => {
    fetchExpenses();
    fetchEntities();
  }, []);

  const fetchExpenses = () => {
    fetch(`/api/expenses.php?project_id=${projectId}`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') setExpenses(res.data || []);
        setLoading(false);
      });
  };

  const fetchEntities = () => {
    fetch('/api/settings.php')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          // Only developers and designers can log hours
          setEntities((res.data || []).filter((e: Entity) => e.type === 'developer' || e.type === 'designer'));
        }
      });
  };

  const handleAdd = () => {
    if (!newRow.week) return;
    if (newRow.entity_id === 'custom') {
      if (!newRow.custom_name || !newRow.custom_cost) return;
    } else {
      if (!newRow.entity_id || !newRow.hours) return;
    }

    const payload = {
      project_id: projectId,
      entity_id: newRow.entity_id === 'custom' ? null : Number(newRow.entity_id),
      hours: newRow.entity_id === 'custom' ? 0 : Number(newRow.hours),
      week: newRow.week,
      custom_name: newRow.entity_id === 'custom' ? newRow.custom_name : null,
      custom_cost: newRow.entity_id === 'custom' ? Number(newRow.custom_cost) : null
    };

    fetch('/api/expenses.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
      if (res.status === 'success') {
        setNewRow({ entity_id: '', hours: '', week: getCurrentWeek(), custom_name: '', custom_cost: '' });
        fetchExpenses();
      }
    });
  };

  const handleDelete = (id: number) => {
    fetch(`/api/expenses.php?id=${id}`, { method: 'DELETE' })
      .then(() => fetchExpenses());
  };

  const handleBudgetSave = () => {
    fetch(`/api/projects.php?id=${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dev_budget: budget })
    }).then(() => {
      onBudgetChange(budget);
    });
  };

  const totalCost = expenses.reduce((acc, e) => acc + (e.entity_id ? Number(e.hours) * Number(e.hourly_rate) : Number(e.custom_cost)), 0);
  const totalHours = expenses.reduce((acc, e) => acc + (e.entity_id ? Number(e.hours) : 0), 0);
  const remaining = Number(budget) - totalCost;

  return createPortal(
    <div className="portal-root">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] animate-fade-in" onClick={onClose} />

      {/* Slideout Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[540px] bg-white shadow-2xl z-[70] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--color-primary)] to-yellow-500 p-8 md:p-10 text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-10">
              <DollarSign size={160} />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Project Expenses</p>
              <h2 className="text-3xl font-black text-white leading-tight break-words">{projectName}</h2>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-all text-white/50 hover:text-white flex-shrink-0">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Budget & Summary Cards */}
          <div className="px-6 md:px-8 pt-8 pb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dev Budget</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">€</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={e => setBudget(Number(e.target.value))}
                      onBlur={handleBudgetSave}
                      className="text-lg font-black text-gray-900 bg-transparent w-full outline-none"
                    />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Spent</p>
                  <p className="text-lg font-black text-red-500">€{totalCost.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{totalHours}h logged</p>
                </div>
                <div className={`rounded-2xl p-4 border shadow-sm ${remaining >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Remaining</p>
                  <p className={`text-lg font-black ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>€{remaining.toLocaleString()}</p>
                </div>
              </div>
          </div>

          {/* Expense List */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-3">
            {loading ? (
              <div className="text-center text-gray-400 py-12 animate-pulse">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300 mx-auto mb-4">
                  <Clock size={28} />
                </div>
                <p className="text-gray-400 font-medium">No expenses logged yet</p>
                <p className="text-xs text-gray-300 mt-1">Add the first time entry below</p>
              </div>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all group">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: exp.entity_color || '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-gray-900 text-sm truncate">{exp.entity_id ? exp.entity_name : exp.custom_name}</span>
                      <span className="text-[10px] font-black bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase">{exp.entity_id ? exp.entity_type : 'Custom'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex gap-3 items-center">
                      <span className="font-medium">{exp.week}</span>
                      {exp.entity_id && (
                        <>
                          <span>•</span>
                          <span><strong>{exp.hours}h</strong> × €{Number(exp.hourly_rate).toLocaleString()}/h</span>
                        </>
                      )}
                      {exp.updated_at && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 opacity-70">
                              <Clock size={10} />
                              {new Date(exp.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-gray-900">€{exp.entity_id ? (Number(exp.hours) * Number(exp.hourly_rate)).toLocaleString() : Number(exp.custom_cost).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add New Expense Row */}
        <div className="border-t border-gray-100 p-6 md:p-8 bg-gray-50/50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Log New Expense</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newRow.entity_id}
                onChange={e => setNewRow({ ...newRow, entity_id: e.target.value })}
                className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-[var(--color-primary)] transition-all"
              >
                <option value="">Who worked?</option>
                <optgroup label="Developers">
                  {entities.filter(e => e.type === 'developer').map(e => (
                    <option key={e.id} value={e.id}>{e.name} (Dev) — €{Number(e.hourly_rate)}/h</option>
                  ))}
                </optgroup>
                <optgroup label="Designers">
                  {entities.filter(e => e.type === 'designer').map(e => (
                    <option key={e.id} value={e.id}>{e.name} (Design) — €{Number(e.hourly_rate)}/h</option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  <option value="custom">Custom expense...</option>
                </optgroup>
              </select>
              
              {newRow.entity_id === 'custom' ? (
                <input
                  type="number"
                  placeholder="Total Cost (€)"
                  value={newRow.custom_cost}
                  onChange={e => setNewRow({ ...newRow, custom_cost: e.target.value })}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                  min="0"
                  step="0.5"
                />
              ) : (
                <input
                  type="number"
                  placeholder="Hours"
                  value={newRow.hours}
                  onChange={e => setNewRow({ ...newRow, hours: e.target.value })}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                  min="0"
                  step="0.5"
                />
              )}
            </div>

            {newRow.entity_id === 'custom' && (
              <input
                type="text"
                placeholder="Expense description..."
                value={newRow.custom_name}
                onChange={e => setNewRow({ ...newRow, custom_name: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-[var(--color-primary)] transition-all"
              />
            )}

            <div className="flex gap-3">
              <input
                type="week"
                value={newRow.week || getCurrentWeek()}
                onChange={e => setNewRow({ ...newRow, week: e.target.value })}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-[var(--color-primary)] transition-all"
              />
              <button
                onClick={handleAdd}
                disabled={(!newRow.entity_id || (newRow.entity_id !== 'custom' && !newRow.hours) || (newRow.entity_id === 'custom' && (!newRow.custom_name || !newRow.custom_cost)))}
                className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100"
              >
                <Plus size={18} /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
