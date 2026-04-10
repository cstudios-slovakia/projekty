import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Search, RefreshCw } from 'lucide-react';
import { ExpenseSlideout } from './ExpenseSlideout';

interface Project {
  id: number;
  name: string;
  total_value: number;
  total_spent: number;
  dev_budget: number;
  pm_name?: string;
  pm_color?: string;
}

export const ExpensesView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterPM, setFilterPM] = useState('');
  const [expenseProjectId, setExpenseProjectId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/projects.php?archived=false&sort_by=sort_order&sort_order=ASC');
      const data = await res.json();
      if (data.status === 'success') {
        setProjects(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch projects", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener('projectsUpdated', handleUpdate);
    return () => window.removeEventListener('projectsUpdated', handleUpdate);
  }, []);

  const pms = Array.from(new Set(projects.map(p => p.pm_name).filter(Boolean)));

  const filteredProjects = projects.filter(p => {
    return p.name.toLowerCase().includes(filterName.toLowerCase()) &&
           (filterPM === '' || p.pm_name === filterPM);
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e78b01]"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Overview</h2>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 p-1 px-3 bg-white hover:bg-gray-50 text-gray-400 hover:text-[#e78b01] rounded-lg border border-gray-100 shadow-sm transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <p className="text-gray-500 text-sm">Real-time profit and expense tracking across all active projects.</p>
        
            <div className="flex items-center gap-3">
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                        <TrendingUp size={16} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Profit</p>
                        <p className="text-sm font-black text-gray-900">
                            €{filteredProjects.reduce((sum, p) => sum + (p.total_value - p.total_spent), 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white/50 p-4 rounded-3xl border border-gray-100 backdrop-blur-sm shadow-inner-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search project name..." 
            className="w-full bg-white text-gray-900 rounded-2xl px-12 py-3 border border-gray-100 focus:ring-2 focus:ring-[#e78b01]/20 focus:border-[#e78b01] outline-none transition-all"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
          />
        </div>
        <select 
          className="bg-white text-gray-700 rounded-2xl px-5 py-3 border border-gray-100 outline-none hover:border-[#e78b01]/30 transition-all cursor-pointer font-medium"
          value={filterPM}
          onChange={e => setFilterPM(e.target.value)}
        >
          <option value="">All Managers</option>
          {pms.map(pm => <option key={pm} value={pm!}>{pm}</option>)}
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-visible">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="italic uppercase text-[10px] font-black text-gray-400 tracking-[0.2em]">
              <th className="p-6 sticky top-[72px] z-20 bg-[#f8fafc] border-b border-gray-100">Project Name</th>
              <th className="p-6 sticky top-[72px] z-20 bg-[#f8fafc] border-b border-gray-100">Project Lead</th>
              <th className="p-6 sticky top-[72px] z-20 bg-[#f8fafc] border-b border-gray-100 text-right">Expenses</th>
              <th className="p-6 sticky top-[72px] z-20 bg-[#f8fafc] border-b border-gray-100 text-right">Price (Gross)</th>
              <th className="p-6 sticky top-[72px] z-20 bg-[#f8fafc] border-b border-gray-100 text-right">Profit</th>
              <th className="p-6 sticky top-[72px] z-20 bg-[#f8fafc] border-b border-gray-100 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredProjects.map(p => {
              const profit = p.total_value - p.total_spent;
              const margin = p.total_spent > 0 ? (profit / p.total_spent) * 100 : 0;
              const isLowMargin = margin < 20 && p.total_spent > 0;

              return (
                <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="p-6 font-bold text-gray-900 relative">
                    <div className="flex items-center gap-3">
                      <span className="text-base tracking-tight">{p.name}</span>
                      <button 
                        onClick={() => setExpenseProjectId(p.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 bg-[#e78b01] text-white rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 hover:scale-110 active:scale-95 transition-all"
                        title="Quick Add Expense"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="p-6">
                    {p.pm_name ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shadow-sm" 
                          style={{ backgroundColor: p.pm_color || '#94a3b8' }}
                        />
                        <span className="font-semibold text-gray-700">{p.pm_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="p-6 text-right text-gray-500 font-medium">
                    €{Number(p.total_spent).toLocaleString()}
                  </td>
                  <td className="p-6 text-right text-gray-900 font-black">
                    €{Number(p.total_value).toLocaleString()}
                  </td>
                  <td className={`p-6 text-right font-black text-base ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{profit.toLocaleString()}
                  </td>
                  <td className="p-6 text-right">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      profit < 0 ? 'bg-red-50 text-red-600 border border-red-100' :
                      isLowMargin ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-green-50 text-green-600 border border-green-100'
                    }`}>
                      {profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {margin.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredProjects.length === 0 && (
          <div className="p-20 text-center space-y-3">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl mx-auto flex items-center justify-center text-gray-300">
                <Search size={32} />
            </div>
            <p className="text-gray-400 font-medium italic">No projects found matching your search.</p>
          </div>
        )}
      </div>

      {/* Expense Slideout Integration */}
      {expenseProjectId && (() => {
        const proj = projects.find(p => p.id === expenseProjectId);
        if (!proj) return null;
        return (
          <ExpenseSlideout
            projectId={proj.id}
            projectName={proj.name}
            devBudget={proj.dev_budget}
            onClose={() => setExpenseProjectId(null)}
            onBudgetChange={() => {
              fetchData();
              // Optional: trigger global update if App tracks it
              window.dispatchEvent(new CustomEvent('projectsUpdated'));
            }}
          />
        );
      })()}
    </div>
  );
};
