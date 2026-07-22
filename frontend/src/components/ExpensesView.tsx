import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, TrendingUp, RefreshCw, List, Menu, AlignJustify, Filter, DollarSign, Landmark, Repeat, Trash2, Edit2, X, Building2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { ExpenseSlideout } from './ExpenseSlideout';

interface Project {
  id: number;
  name: string;
  total_value: number;
  total_spent: number;
  dev_budget: number;
  already_paid: number;
  pm_name?: string;
  pm_color?: string;
  updated_at?: string;
}

interface CompanyExpense {
  id: number;
  title: string;
  category: string;
  amount: number;
  expense_type: 'one_time' | 'recurring';
  expense_date: string;
  recurrence_interval: number;
  recurrence_unit: 'day' | 'week' | 'month' | 'year';
  recurrence_days?: string;
  recurrence_ends_type: 'never' | 'on_date' | 'after_occurrences';
  recurrence_ends_date?: string;
  recurrence_ends_occurrences?: number;
  notes?: string;
  created_at?: string;
}

interface BankCashAdjustment {
  id: number;
  adjustment_date: string;
  balance_amount: number;
  notes?: string;
  created_at?: string;
}

export const ExpensesView: React.FC = () => {
  const { t } = useTranslation();
  const userToken = localStorage.getItem('token');
  const user = userToken ? JSON.parse(atob(userToken)) : null;
  const canEdit = user?.role !== 'viewer';

  // Tabs state
  const [activeTab, setActiveTab] = useState<'project_expenses' | 'company_expenses' | 'cash_adjustment'>('project_expenses');

  // Project expenses state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterPM, setFilterPM] = useState('');
  const [viewMode, setViewMode] = useState<'expanded' | 'compact' | 'supercompact'>(
    (localStorage.getItem('expensesViewMode') as 'expanded' | 'compact' | 'supercompact') || 'expanded'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [expenseProjectId, setExpenseProjectId] = useState<number | null>(null);

  // Company expenses state
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpense[]>([]);
  const [, setLoadingCompExp] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  const [editingCompExp, setEditingCompExp] = useState<CompanyExpense | null>(null);

  // Custom Recurrence Modal state (matching Google Calendar UI)
  const [showCustomRecurrenceModal, setShowCustomRecurrenceModal] = useState(false);

  // Form state for Company Expense
  const [compTitle, setCompTitle] = useState('');
  const [compCategory, setCompCategory] = useState('Software');
  const [compAmount, setCompAmount] = useState<number | string>('');
  const [compType, setCompType] = useState<'one_time' | 'recurring'>('one_time');
  const [compDate, setCompDate] = useState(new Date().toISOString().split('T')[0]);
  const [compInterval, setCompInterval] = useState<number>(1);
  const [compUnit, setCompUnit] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [compDays, setCompDays] = useState<string[]>(['M']);
  const [compEndsType, setCompEndsType] = useState<'never' | 'on_date' | 'after_occurrences'>('never');
  const [compEndsDate, setCompEndsDate] = useState('');
  const [compEndsOccurrences, setCompEndsOccurrences] = useState<number | string>(12);
  const [compNotes, setCompNotes] = useState('');

  // Cash Adjustment state
  const [cashAdjustments, setCashAdjustments] = useState<BankCashAdjustment[]>([]);
  const [, setLoadingCashAdj] = useState(false);
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [editingAdj, setEditingAdj] = useState<BankCashAdjustment | null>(null);

  const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjAmount, setAdjAmount] = useState<number | string>('');
  const [adjNotes, setAdjNotes] = useState('');

  useEffect(() => {
    localStorage.setItem('expensesViewMode', viewMode);
  }, [viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects.php?archived=false&sort_by=sort_order&sort_order=ASC');
      const data = await res.json();
      if (data.status === 'success') {
        const allProjects = data.data || [];
        const acceptedProjects = allProjects.filter((p: Project & { status: string }) => p.status === 'Price Offer Accepted');
        setProjects(acceptedProjects);
      }
    } catch (e) {
      console.error("Failed to fetch projects", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyExpenses = async () => {
    try {
      setLoadingCompExp(true);
      const res = await fetch('/api/company_expenses.php');
      const data = await res.json();
      if (data.status === 'success') {
        setCompanyExpenses(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch company expenses", e);
    } finally {
      setLoadingCompExp(false);
    }
  };

  const fetchCashAdjustments = async () => {
    try {
      setLoadingCashAdj(true);
      const res = await fetch('/api/cash_adjustments.php');
      const data = await res.json();
      if (data.status === 'success') {
        setCashAdjustments(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch cash adjustments", e);
    } finally {
      setLoadingCashAdj(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCompanyExpenses();
    fetchCashAdjustments();

    const handleUpdate = () => {
      fetchData();
      fetchCompanyExpenses();
      fetchCashAdjustments();
    };
    window.addEventListener('projectsUpdated', handleUpdate);
    return () => window.removeEventListener('projectsUpdated', handleUpdate);
  }, []);

  const openNewCompModal = () => {
    setEditingCompExp(null);
    setCompTitle('');
    setCompCategory('Software');
    setCompAmount('');
    setCompType('one_time');
    setCompDate(new Date().toISOString().split('T')[0]);
    setCompInterval(1);
    setCompUnit('month');
    setCompDays(['M']);
    setCompEndsType('never');
    setCompEndsDate('');
    setCompEndsOccurrences(12);
    setCompNotes('');
    setShowCompModal(true);
  };

  const openEditCompModal = (exp: CompanyExpense) => {
    setEditingCompExp(exp);
    setCompTitle(exp.title);
    setCompCategory(exp.category || 'Other');
    setCompAmount(exp.amount);
    setCompType(exp.expense_type);
    setCompDate(exp.expense_date || new Date().toISOString().split('T')[0]);
    setCompInterval(exp.recurrence_interval || 1);
    setCompUnit(exp.recurrence_unit || 'month');
    try {
      setCompDays(exp.recurrence_days ? JSON.parse(exp.recurrence_days) : ['M']);
    } catch {
      setCompDays(['M']);
    }
    setCompEndsType(exp.recurrence_ends_type || 'never');
    setCompEndsDate(exp.recurrence_ends_date || '');
    setCompEndsOccurrences(exp.recurrence_ends_occurrences || 12);
    setCompNotes(exp.notes || '');
    setShowCompModal(true);
  };

  const handleSaveCompanyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compTitle.trim()) return;

    const payload = {
      title: compTitle,
      category: compCategory,
      amount: parseFloat(String(compAmount || 0)),
      expense_type: compType,
      expense_date: compDate,
      recurrence_interval: compInterval,
      recurrence_unit: compUnit,
      recurrence_days: compDays,
      recurrence_ends_type: compEndsType,
      recurrence_ends_date: compEndsDate || null,
      recurrence_ends_occurrences: compEndsOccurrences ? parseInt(String(compEndsOccurrences)) : null,
      notes: compNotes
    };

    try {
      const url = editingCompExp ? `/api/company_expenses.php?id=${editingCompExp.id}` : '/api/company_expenses.php';
      const method = editingCompExp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowCompModal(false);
        fetchCompanyExpenses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCompanyExpense = async (id: number) => {
    if (!window.confirm('Delete this company expense?')) return;
    try {
      await fetch(`/api/company_expenses.php?id=${id}`, { method: 'DELETE' });
      fetchCompanyExpenses();
    } catch (e) {
      console.error(e);
    }
  };

  const openNewAdjModal = () => {
    setEditingAdj(null);
    setAdjDate(new Date().toISOString().split('T')[0]);
    setAdjAmount('');
    setAdjNotes('');
    setShowAdjModal(true);
  };

  const openEditAdjModal = (adj: BankCashAdjustment) => {
    setEditingAdj(adj);
    setAdjDate(adj.adjustment_date);
    setAdjAmount(adj.balance_amount);
    setAdjNotes(adj.notes || '');
    setShowAdjModal(true);
  };

  const handleSaveCashAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount) return;

    const payload = {
      adjustment_date: adjDate,
      balance_amount: parseFloat(String(adjAmount || 0)),
      notes: adjNotes
    };

    try {
      const url = editingAdj ? `/api/cash_adjustments.php?id=${editingAdj.id}` : '/api/cash_adjustments.php';
      const method = editingAdj ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAdjModal(false);
        fetchCashAdjustments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCashAdjustment = async (id: number) => {
    if (!window.confirm('Delete this bank balance adjustment?')) return;
    try {
      await fetch(`/api/cash_adjustments.php?id=${id}`, { method: 'DELETE' });
      fetchCashAdjustments();
    } catch (e) {
      console.error(e);
    }
  };

  const pms = Array.from(new Set(projects.map(p => p.pm_name).filter(Boolean)));

  const filteredProjects = projects.filter(p => {
    return p.name.toLowerCase().includes(filterName.toLowerCase()) &&
           (filterPM === '' || p.pm_name === filterPM);
  });

  const toggleDay = (day: string) => {
    if (compDays.includes(day)) {
      setCompDays(compDays.filter(d => d !== day));
    } else {
      setCompDays([...compDays, day]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Tabs Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Expenses & Financial Management</h2>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Project costs, company overheads & bank account baseline adjustments</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('project_expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'project_expenses'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <DollarSign size={15} />
            <span>Project Expenses</span>
          </button>

          <button
            onClick={() => setActiveTab('company_expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'company_expenses'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building2 size={15} />
            <span>Company Expenses</span>
          </button>

          <button
            onClick={() => setActiveTab('cash_adjustment')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'cash_adjustment'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Landmark size={15} />
            <span>Cash Adjustment</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PROJECT EXPENSES */}
      {activeTab === 'project_expenses' && (
        <div className="space-y-6">
          {/* Header & Stats Summary */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-baseline gap-4">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Active Project Expenses</h3>
              <button 
                onClick={fetchData}
                className="flex items-center gap-2 p-1 px-3 bg-white hover:bg-gray-50 text-gray-400 hover:text-[var(--color-primary)] rounded-lg border border-gray-100 shadow-sm transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {t('common.refresh')}
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('dashboard.kpis.total_profit')}</p>
                  <p className="text-sm font-black text-gray-900">
                    &euro;{filteredProjects.reduce((sum, p) => sum + (p.total_value - p.total_spent), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px] relative">
              <input 
                placeholder={t('projects.search_placeholder')} 
                className="w-full bg-gray-50 text-gray-900 rounded-2xl px-5 py-3 border border-gray-100 focus:bg-white transition-all outline-none text-xs font-bold"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-2 font-bold text-sm ${showFilters ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-white active:scale-95'}`}
              title="Toggle Filters"
            >
              <Filter size={20} />
            </button>
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 ml-auto mr-auto md:mr-0">
              <button onClick={() => setViewMode('expanded')} className={`p-2 rounded-xl transition-all ${viewMode === 'expanded' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-gray-400 hover:text-gray-600'}`} title={t('nav.expanded') || 'Expanded'}><List size={16} /></button>
              <button onClick={() => setViewMode('compact')} className={`p-2 rounded-xl transition-all ${viewMode === 'compact' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-gray-400 hover:text-gray-600'}`} title={t('nav.compact') || 'Compact'}><Menu size={16} /></button>
              <button onClick={() => setViewMode('supercompact')} className={`p-2 rounded-xl transition-all ${viewMode === 'supercompact' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-gray-400 hover:text-gray-600'}`} title={t('nav.supercompact') || 'Super'}><AlignJustify size={16} /></button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center animate-fade-in relative -mt-3 z-0">
              <select 
                className="flex-1 min-w-[200px] bg-white text-gray-700 rounded-2xl px-5 py-3 border border-gray-200 outline-none hover:border-gray-300 transition-all cursor-pointer font-medium shadow-sm"
                value={filterPM}
                onChange={e => setFilterPM(e.target.value)}
              >
                <option value="">{t('projects.all_pms') || 'All Managers'}</option>
                {pms.map(pm => <option key={pm} value={pm!}>{pm}</option>)}
              </select>
            </div>
          )}

          {/* Main Table */}
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-visible">
            <table className="w-full text-left text-sm border-collapse table-auto md:table-fixed">
              {viewMode === 'supercompact' ? (
                <thead className="hidden md:table-header-group bg-[#f8fafc] border-b border-gray-100 uppercase text-[10px] tracking-[0.1em] font-bold text-gray-400">
                  <tr>
                    <th className="p-2 w-10 text-center"></th>
                    <th className="p-2 w-[18%]">{t('projects.title')}</th>
                    <th className="p-2 w-[11%]">{t('projects.pm')}</th>
                    <th className="p-2 w-[11%] text-right">{t('projects.slideout.expenses') || 'Expenses'}</th>
                    <th className="p-2 w-[11%] text-right">{t('projects.value')}</th>
                    <th className="p-2 w-[11%] text-right">Invoiced</th>
                    <th className="p-2 w-[11%] text-right">To Invoice</th>
                    <th className="p-2 w-[11%] text-right">{t('projects.profit') || 'Profit'}</th>
                    <th className="p-2 w-[9%] text-right">{t('projects.margin') || 'Margin'}</th>
                    <th className="p-2 w-[7%] text-center"></th>
                  </tr>
                </thead>
              ) : (
                <thead>
                  <tr className="italic uppercase text-[10px] font-black text-gray-400 tracking-[0.2em] block md:table-row bg-[#f8fafc]">
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100">{t('projects.title')}</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100">{t('projects.pm')}</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100 text-right">{t('projects.slideout.expenses') || 'Expenses'}</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100 text-right">{t('projects.value')}</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100 text-right">Invoiced</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100 text-right">To Invoice</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100 text-right">{t('projects.profit') || 'Profit'}</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100 text-right">{t('projects.margin') || 'Margin %'}</th>
                    <th className="hidden md:table-cell p-6 sticky top-[72px] z-20 border-b border-gray-100 w-24 text-center"></th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-gray-50 block md:table-row-group">
                {filteredProjects.map(p => {
                  const profit = p.total_value - p.total_spent;
                  const margin = p.total_spent > 0 ? (profit / p.total_spent) * 100 : 0;
                  const isCompact = viewMode === 'compact';
                  const cellPadding = isCompact ? 'p-2 md:p-3' : 'p-4 md:p-6';

                  return (
                    <tr key={p.id} onClick={canEdit ? () => setExpenseProjectId(p.id) : undefined} className={`group transition-all block md:table-row border-b border-gray-100 hover:bg-gray-50 ${canEdit ? 'cursor-pointer' : ''}`}>
                      <td className={`${cellPadding} block md:table-cell font-bold text-gray-900`}>{p.name}</td>
                      <td className={`${cellPadding} block md:table-cell text-gray-500`}>{p.pm_name || '-'}</td>
                      <td className={`${cellPadding} block md:table-cell text-right font-bold text-rose-600`}>&euro;{p.total_spent.toLocaleString()}</td>
                      <td className={`${cellPadding} block md:table-cell text-right font-bold text-gray-900`}>&euro;{p.total_value.toLocaleString()}</td>
                      <td className={`${cellPadding} block md:table-cell text-right font-bold text-emerald-600`}>&euro;{(p.already_paid || 0).toLocaleString()}</td>
                      <td className={`${cellPadding} block md:table-cell text-right font-bold text-purple-600`}>&euro;{(p.total_value - (p.already_paid || 0)).toLocaleString()}</td>
                      <td className={`${cellPadding} block md:table-cell text-right font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>&euro;{profit.toLocaleString()}</td>
                      <td className={`${cellPadding} block md:table-cell text-right font-bold`}>{margin.toFixed(1)}%</td>
                      <td className={`${cellPadding} block md:table-cell text-center`}>
                        <button onClick={(e) => { e.stopPropagation(); setExpenseProjectId(p.id); }} className="px-3 py-1 bg-gray-900 text-white rounded-lg text-xs font-bold">Details</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY EXPENSES (OTHER EXPENSES) */}
      {activeTab === 'company_expenses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                Company Overheads & Operational Expenses
              </h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">Recurring & one-time company expenses (office rent, software subscriptions, utilities, equipment)</p>
            </div>

            <button
              onClick={openNewCompModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus size={16} />
              <span>Add Company Expense</span>
            </button>
          </div>

          {/* Company Expenses Table */}
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8fafc] uppercase text-[10px] tracking-wider font-bold text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="p-4">Title &amp; Category</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">Type &amp; Recurrence</th>
                  <th className="p-4">Start / Expense Date</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companyExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/80 transition-all">
                    <td className="p-4">
                      <span className="font-black text-gray-900 text-sm block">{exp.title}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md inline-block mt-0.5">
                        {exp.category}
                      </span>
                    </td>

                    <td className="p-4 text-right font-black text-rose-600 text-sm">
                      &euro;{parseFloat(String(exp.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 font-bold text-gray-700">
                      {exp.expense_type === 'recurring' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-black inline-flex items-center gap-1">
                          <Repeat size={12} /> Every {exp.recurrence_interval} {exp.recurrence_unit}(s)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold inline-block">
                          One-time
                        </span>
                      )}
                    </td>

                    <td className="p-4 font-bold text-gray-800">
                      {exp.expense_date}
                    </td>

                    <td className="p-4 text-gray-500 max-w-xs truncate">
                      {exp.notes || '-'}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditCompModal(exp)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCompanyExpense(exp.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {companyExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400 font-medium italic">
                      No company overhead expenses recorded yet. Click "Add Company Expense" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CASH ADJUSTMENT */}
      {activeTab === 'cash_adjustment' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Landmark size={20} className="text-purple-600" />
                Bank Account Cash Baseline Adjustments
              </h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                Set actual company bank account balance for a specific date to baseline &amp; shift Executive Dashboard Net Cashflow trajectory
              </p>
            </div>

            <button
              onClick={openNewAdjModal}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus size={16} />
              <span>Set Bank Balance</span>
            </button>
          </div>

          {/* Cash Adjustments Table */}
          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8fafc] uppercase text-[10px] tracking-wider font-bold text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="p-4">Adjustment Date</th>
                  <th className="p-4 text-right">Bank Account Balance</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4">Recorded At</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cashAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50/80 transition-all">
                    <td className="p-4 font-black text-gray-900 text-sm">
                      {adj.adjustment_date}
                    </td>

                    <td className="p-4 text-right font-black text-emerald-600 text-base">
                      &euro;{parseFloat(String(adj.balance_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-gray-600 font-medium">
                      {adj.notes || 'Starting bank balance'}
                    </td>

                    <td className="p-4 text-gray-400">
                      {adj.created_at?.split(' ')[0] || '-'}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditAdjModal(adj)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCashAdjustment(adj.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cashAdjustments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400 font-medium italic">
                      No bank cash adjustments set. Click "Set Bank Balance" above to calibrate company starting balance.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              window.dispatchEvent(new CustomEvent('projectsUpdated'));
            }}
          />
        );
      })()}

      {/* COMPANY EXPENSE MODAL */}
      {showCompModal && createPortal(
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 my-auto">
            <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <Building2 size={18} className="text-blue-400" />
                {editingCompExp ? 'Edit Company Expense' : 'Add Company Expense'}
              </h3>
              <button onClick={() => setShowCompModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyExpense} className="p-6 space-y-4 text-xs font-bold text-gray-700">
              <div>
                <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Rent, Figma Pro, Google Workspace"
                  value={compTitle}
                  onChange={(e) => setCompTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Category</label>
                  <select
                    value={compCategory}
                    onChange={(e) => setCompCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Software">Software &amp; SaaS</option>
                    <option value="Office Rent">Office Rent</option>
                    <option value="Hardware">Hardware &amp; Equipment</option>
                    <option value="Marketing">Marketing &amp; Ads</option>
                    <option value="Utilities">Utilities &amp; Hosting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Amount (&euro;) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={compAmount}
                    onChange={(e) => setCompAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-black text-gray-900"
                  />
                </div>
              </div>

              {/* One-time vs Recurring toggle */}
              <div>
                <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Expense Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setCompType('one_time')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      compType === 'one_time' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    One-time
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompType('recurring')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      compType === 'recurring' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    <Repeat size={14} />
                    <span>Recurring</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Start / Expense Date</label>
                <input
                  type="date"
                  value={compDate}
                  onChange={(e) => setCompDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Recurring Settings Button / Google Calendar style modal trigger */}
              {compType === 'recurring' && (
                <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-blue-900 block text-xs">Recurrence Rule</span>
                      <span className="text-[11px] text-blue-700 font-medium">
                        Repeat every {compInterval} {compUnit}(s) &bull; Ends: {compEndsType === 'never' ? 'Never' : compEndsType === 'on_date' ? compEndsDate : `${compEndsOccurrences} occurrences`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomRecurrenceModal(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-xs"
                    >
                      Custom Recurrence...
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or supplier details..."
                  value={compNotes}
                  onChange={(e) => setCompNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* GOOGLE CALENDAR STYLE CUSTOM RECURRENCE MODAL */}
      {showCustomRecurrenceModal && createPortal(
        <div className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-fade-in my-auto">
            <div className="p-6 space-y-6">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Custom recurrence</h3>

              {/* Repeat Every row */}
              <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <span>Repeat every</span>
                <input
                  type="number"
                  min={1}
                  value={compInterval}
                  onChange={(e) => setCompInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-center font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={compUnit}
                  onChange={(e) => setCompUnit(e.target.value as any)}
                  className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                </select>
              </div>

              {/* Repeat On Days of Week (Visible when unit === 'week') */}
              {compUnit === 'week' && (
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-gray-500">Repeat on</span>
                  <div className="flex items-center justify-between gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                      const isSel = compDays.includes(day);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`w-9 h-9 rounded-full font-black text-xs transition-all flex items-center justify-center ${
                            isSel ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ends Radio Options */}
              <div className="space-y-4 pt-1 text-sm font-bold text-gray-700">
                <span className="block text-xs font-bold text-gray-500">Ends</span>

                {/* Radio 1: Never */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="ends_type"
                    checked={compEndsType === 'never'}
                    onChange={() => setCompEndsType('never')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Never</span>
                </label>

                {/* Radio 2: On Date */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer flex-shrink-0">
                    <input
                      type="radio"
                      name="ends_type"
                      checked={compEndsType === 'on_date'}
                      onChange={() => setCompEndsType('on_date')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>On</span>
                  </label>
                  <input
                    type="date"
                    disabled={compEndsType !== 'on_date'}
                    value={compEndsDate}
                    onChange={(e) => setCompEndsDate(e.target.value)}
                    className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-40"
                  />
                </div>

                {/* Radio 3: After Occurrences */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer flex-shrink-0">
                    <input
                      type="radio"
                      name="ends_type"
                      checked={compEndsType === 'after_occurrences'}
                      onChange={() => setCompEndsType('after_occurrences')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>After</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      disabled={compEndsType !== 'after_occurrences'}
                      value={compEndsOccurrences}
                      onChange={(e) => setCompEndsOccurrences(e.target.value)}
                      className="w-16 px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-center text-xs font-bold disabled:opacity-40"
                    />
                    <span className="text-xs text-gray-500 font-bold">occurrences</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomRecurrenceModal(false)}
                  className="px-5 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomRecurrenceModal(false)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CASH ADJUSTMENT MODAL */}
      {showAdjModal && createPortal(
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 my-auto">
            <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <Landmark size={18} className="text-purple-300" />
                {editingAdj ? 'Edit Bank Cash Adjustment' : 'Set Bank Balance'}
              </h3>
              <button onClick={() => setShowAdjModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCashAdjustment} className="p-6 space-y-4 text-xs font-bold text-gray-700">
              <div>
                <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Adjustment Date *</label>
                <input
                  type="date"
                  required
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Bank Account Balance (&euro;) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 15000.00"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base font-black text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-500 uppercase text-[10px] tracking-wider mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified bank balance on July 1st statement"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl text-[11px] text-purple-800 font-medium border border-purple-100">
                Setting a bank balance baseline will shift the entire Executive Dashboard Net Cashflow trajectory line starting from this date.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-md"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
