import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, RefreshCw, FileText, CheckSquare, Layers, UserCheck, Upload, EyeOff, Edit2, Check, CheckCircle2, RotateCcw } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface ActiveDevDetailModalProps {
  project: any;
  onClose: () => void;
  onUpdate: () => void;
  clients: any[];
  pms: any[];
  developers: any[];
}

export function ActiveDevDetailModal({
  project,
  onClose,
  onUpdate,
  clients,
  pms,
  developers
}: ActiveDevDetailModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'expenses' | 'subtasks'>('overview');

  const isCompleted = project.is_completed || project.project_status === 'Completed';

  const handleToggleComplete = async () => {
    const nextCompleted = !isCompleted;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/active_development.php?id=${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_completed: nextCompleted ? 1 : 0,
          project_status: nextCompleted ? 'Completed' : 'Price Offer Accepted'
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        onUpdate();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Active dev editable fields
  const [projectName, setProjectName] = useState<string>(project.project_name || '');
  const [projectCategory, setProjectCategory] = useState<string>(project.project_category || 'project');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [clientId, setClientId] = useState<number | string>(project.client_id || '');
  const [pmId, setPmId] = useState<number | string>(project.pm_id || '');
  const [devId, setDevId] = useState<number | string>(project.dev_id || '');
  const [budget, setBudget] = useState<number | string>(project.budget || 0);
  const [devBudget, setDevBudget] = useState<number | string>(project.dev_budget || 0);
  const [startDate, setStartDate] = useState<string>(project.start_date || project.accepted_date || '');
  const [softDeadline, setSoftDeadline] = useState(project.soft_deadline || '');
  const [hardDeadline, setHardDeadline] = useState(project.hard_deadline || project.deadline || '');

  // ClickUp config state
  const [clickupSourceType, setClickupSourceType] = useState<'list' | 'task'>(project.clickup_source_type || 'list');
  const [clickupSpaceId, setClickupSpaceId] = useState(project.clickup_space_id || '');
  const [clickupListId, setClickupListId] = useState(project.clickup_list_id || '');
  const [clickupTaskId, setClickupTaskId] = useState(project.clickup_task_id || '');

  // ClickUp dynamic options
  const [spaces, setSpaces] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isClickupLoading, setIsClickupLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Data lists
  const [invoices, setInvoices] = useState<any[]>([]);
  const [manualExpenses, setManualExpenses] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [hideCompletedSubtasks, setHideCompletedSubtasks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Invoice form
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState<number | string>('');
  const [invoiceStatus, setInvoiceStatus] = useState<'not_issued' | 'issued' | 'paid'>('not_issued');
  const [issuedDate, setIssuedDate] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Expense form
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseName, setExpenseName] = useState('');
  const [expenseCost, setExpenseCost] = useState<number | string>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Subtask form
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskStatus, setSubtaskStatus] = useState('to do');
  const [subtaskAssignee, setSubtaskAssignee] = useState<number | string>('');

  useEffect(() => {
    fetchInvoices();
    fetchManualExpenses();
    fetchTimeLogs();
    fetchSubtasks();
    fetchClickupSpaces();
  }, [project.id, project.project_id]);

  useEffect(() => {
    if (clickupSpaceId) {
      fetchClickupFoldersAndLists(clickupSpaceId);
    }
  }, [clickupSpaceId]);

  useEffect(() => {
    if (clickupListId && clickupSourceType === 'task') {
      fetchClickupTasks(clickupListId);
    }
  }, [clickupListId, clickupSourceType]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/invoices.php?project_id=${project.project_id}`);
      const data = await res.json();
      if (data.status === 'success') setInvoices(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchManualExpenses = async () => {
    try {
      const res = await fetch(`/api/manual_expenses.php?project_id=${project.project_id}`);
      const data = await res.json();
      if (data.status === 'success') setManualExpenses(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTimeLogs = async () => {
    try {
      const res = await fetch(`/api/time_logs.php?project_id=${project.project_id}`);
      const data = await res.json();
      if (data.status === 'success') setTimeLogs(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubtasks = async () => {
    try {
      const res = await fetch(`/api/subtasks.php?project_id=${project.project_id}`);
      const data = await res.json();
      if (data.status === 'success') setSubtasks(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClickupSpaces = async () => {
    try {
      setIsClickupLoading(true);
      const res = await fetch('/api/clickup.php?action=spaces');
      const data = await res.json();
      if (data.status === 'success') setSpaces(data.spaces || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsClickupLoading(false);
    }
  };

  const fetchClickupFoldersAndLists = async (spaceId: string) => {
    try {
      setIsClickupLoading(true);
      const res = await fetch(`/api/clickup.php?action=folders_and_lists&space_id=${spaceId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setFolders(data.folders || []);
        setLists(data.folderless_lists || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsClickupLoading(false);
    }
  };

  const fetchClickupTasks = async (listId: string) => {
    try {
      setIsClickupLoading(true);
      const res = await fetch(`/api/clickup.php?action=tasks&list_id=${listId}`);
      const data = await res.json();
      if (data.status === 'success') setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsClickupLoading(false);
    }
  };

  const handleSaveOverview = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/active_development.php?id=${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName,
          name: projectName,
          project_category: projectCategory,
          client_id: clientId,
          pm_id: pmId,
          dev_id: devId,
          budget,
          dev_budget: devBudget,
          start_date: startDate,
          soft_deadline: softDeadline,
          hard_deadline: hardDeadline,
          clickup_source_type: clickupSourceType,
          clickup_space_id: clickupSpaceId,
          clickup_folder_id: '',
          clickup_list_id: clickupListId,
          clickup_task_id: clickupTaskId
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncClickup = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      await handleSaveOverview();

      const res = await fetch('/api/clickup.php?action=sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.project_id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSyncMessage(`Successfully synced ${data.synced_count} subtasks from ClickUp!`);
        fetchSubtasks();
        onUpdate();
      } else {
        setSyncMessage(`Sync error: ${data.message}`);
      }
    } catch (e: any) {
      setSyncMessage(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('project_id', project.project_id);
      formData.append('invoice_number', invoiceNumber);
      formData.append('amount', String(invoiceAmount || 0));
      formData.append('status', invoiceStatus);
      formData.append('issued_date', issuedDate);
      formData.append('paid_date', paidDate);
      formData.append('notes', invoiceNotes);
      if (pdfFile) {
        formData.append('pdf_file', pdfFile);
      }

      const res = await fetch('/api/invoices.php', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAddInvoice(false);
        setInvoiceNumber('');
        setInvoiceAmount('');
        setPdfFile(null);
        setIssuedDate('');
        setPaidDate('');
        setInvoiceNotes('');
        fetchInvoices();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadInvoicePdf = async (invoiceId: number, file: File) => {
    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('id', String(invoiceId));
      formData.append('pdf_file', file);

      const res = await fetch('/api/invoices.php', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchInvoices();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateInvoiceField = async (invoiceId: number, field: string, value: any) => {
    try {
      const res = await fetch(`/api/invoices.php?id=${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchInvoices();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: number, status: string, newPaidDate?: string) => {
    try {
      const payload: any = { status };
      if (status === 'paid' && !newPaidDate) {
        payload.paid_date = new Date().toISOString().split('T')[0];
      } else if (newPaidDate !== undefined) {
        payload.paid_date = newPaidDate;
      }

      const res = await fetch(`/api/invoices.php?id=${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchInvoices();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      const res = await fetch(`/api/invoices.php?id=${invoiceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchInvoices();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/manual_expenses.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.project_id,
          name: expenseName,
          cost: expenseCost,
          expense_date: expenseDate
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAddExpense(false);
        setExpenseName('');
        setExpenseCost('');
        fetchManualExpenses();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      const res = await fetch(`/api/manual_expenses.php?id=${expenseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchManualExpenses();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/subtasks.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.project_id,
          title: subtaskTitle,
          status: subtaskStatus,
          assignee_id: subtaskAssignee
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAddSubtask(false);
        setSubtaskTitle('');
        setSubtaskAssignee('');
        fetchSubtasks();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSubtaskStatus = async (subtaskId: number, status: string) => {
    try {
      const res = await fetch(`/api/subtasks.php?id=${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchSubtasks();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      const res = await fetch(`/api/subtasks.php?id=${subtaskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchSubtasks();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalTimeExpensesCalc = timeLogs.reduce((acc, log) => {
    const dev = developers.find(d => d.id === log.user_id || d.id === log.member_id);
    const rate = dev?.hourly_rate || 0;
    return acc + (parseFloat(log.hours || 0) * parseFloat(rate));
  }, 0);

  const totalManualExpensesCalc = manualExpenses.reduce((acc, exp) => acc + parseFloat(exp.cost || 0), 0);
  const grandTotalExpenses = totalTimeExpensesCalc + totalManualExpensesCalc;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={projectCategory}
                onChange={(e) => {
                  setProjectCategory(e.target.value);
                  fetch(`/api/active_development.php?id=${project.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_category: e.target.value })
                  }).then(onUpdate);
                }}
                className="bg-gray-800 border border-gray-700 text-emerald-300 font-black text-xs rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="project">Standard Project</option>
                <option value="miniproject">Mini-project (Fixes / Updates)</option>
              </select>

              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-gray-800 border border-purple-500 rounded-xl px-3 py-1 text-lg font-black text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      handleSaveOverview();
                      setIsEditingTitle(false);
                    }}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-xl font-black tracking-tight">{projectName}</h2>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-gray-400 hover:text-white opacity-60 group-hover:opacity-100 transition-all"
                    title="Edit project title"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ID #{project.project_id} &bull; {t('active_dev.budget')}: &euro;{parseFloat(project.budget || 0).toLocaleString()} &bull; {t('active_dev.dev_budget')}: &euro;{parseFloat(project.dev_budget || 0).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleComplete}
              disabled={isSaving}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                isCompleted
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={isCompleted ? "Re-open and move project back to Active list" : "Mark project as Completed"}
            >
              {isCompleted ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
              <span>{isCompleted ? 'Re-open Project' : 'Mark as Completed'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Layers size={16} />
            {t('active_dev.overview')}
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText size={16} />
            {t('active_dev.invoices')} ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'expenses'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <DollarSign size={16} />
            {t('active_dev.expenses')} &amp; {t('active_dev.work_logs')}
          </button>
          <button
            onClick={() => setActiveTab('subtasks')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'subtasks'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <CheckSquare size={16} />
            {t('active_dev.subtasks')} ({subtasks.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Project Assignments */}
              <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Team Assignments</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.client')}</label>
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">-- {t('leads.unassigned')} --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.pm')}</label>
                    <select
                      value={pmId}
                      onChange={(e) => setPmId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">-- {t('leads.unassigned')} --</option>
                      {pms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.primary_dev')}</label>
                    <select
                      value={devId}
                      onChange={(e) => setDevId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">-- {t('leads.unassigned')} --</option>
                      {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial & Budget Setup */}
              <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Budget Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.budget')} (&euro;)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.dev_budget')} (&euro;)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={devBudget}
                      onChange={(e) => setDevBudget(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Deadlines Setup */}
              <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Project Dates &amp; Deadlines</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-600 mb-1">Soft Deadline</label>
                    <input
                      type="date"
                      value={softDeadline}
                      onChange={(e) => setSoftDeadline(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-600 mb-1">Hard Deadline</label>
                    <input
                      type="date"
                      value={hardDeadline}
                      onChange={(e) => setHardDeadline(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* ClickUp Setup Card */}
              <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">{t('active_dev.clickup')}</h3>
                  </div>
                  <button
                    onClick={handleSyncClickup}
                    disabled={isSyncing}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? t('common.processing') : t('active_dev.sync_clickup')}
                  </button>
                </div>

                {syncMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${syncMessage.includes('error') || syncMessage.includes('failed') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                    {syncMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.clickup_source')}</label>
                    <select
                      value={clickupSourceType}
                      onChange={(e) => setClickupSourceType(e.target.value as any)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="list">{t('active_dev.clickup_source_list')}</option>
                      <option value="task">{t('active_dev.clickup_source_task')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {t('active_dev.clickup_select_space')} {isClickupLoading ? '(Loading...)' : ''}
                    </label>
                    <select
                      value={clickupSpaceId}
                      onChange={(e) => { setClickupSpaceId(e.target.value); setClickupListId(''); setClickupTaskId(''); }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- {t('active_dev.clickup_select_space')} --</option>
                      {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.clickup_select_list')}</label>
                    <select
                      value={clickupListId}
                      onChange={(e) => { setClickupListId(e.target.value); setClickupTaskId(''); }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- {t('active_dev.clickup_select_list')} --</option>
                      {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      {folders.map(f => (
                        <optgroup key={f.id} label={`Folder: ${f.name}`}>
                          {(f.lists || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {clickupSourceType === 'task' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.clickup_select_task')}</label>
                      <select
                        value={clickupTaskId}
                        onChange={(e) => setClickupTaskId(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">-- {t('active_dev.clickup_select_task')} --</option>
                        {tasks.map(tk => <option key={tk.id} value={tk.id}>{tk.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleSaveOverview}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-black shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{t('active_dev.invoices')}</h3>
                <button
                  onClick={() => setShowAddInvoice(!showAddInvoice)}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={16} />
                  {t('active_dev.add_invoice')}
                </button>
              </div>

              {/* Add Invoice Form */}
              {showAddInvoice && (
                <form onSubmit={handleCreateInvoice} className="bg-gray-50/90 rounded-2xl p-5 border border-gray-200 space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-500">{t('active_dev.add_invoice')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.invoice_number')}</label>
                      <input
                        type="text"
                        required
                        placeholder="INV-2026-001"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.amount')} (&euro;)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="1500.00"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.status')}</label>
                      <select
                        value={invoiceStatus}
                        onChange={(e) => setInvoiceStatus(e.target.value as any)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                      >
                        <option value="not_issued">{t('active_dev.status_not_issued')}</option>
                        <option value="issued">{t('active_dev.status_issued')}</option>
                        <option value="paid">{t('active_dev.status_paid')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.issued_date')}</label>
                      <input
                        type="date"
                        value={issuedDate}
                        onChange={(e) => setIssuedDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.paid_date')}</label>
                      <input
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.upload_pdf')} (PDF)</label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-200 file:text-gray-800 hover:file:bg-gray-300"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddInvoice(false)}
                      className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-xs font-bold"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-md hover:brightness-110"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </form>
              )}

              {/* Invoices List Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">{t('active_dev.invoice_number')}</th>
                      <th className="px-4 py-3">{t('active_dev.amount')}</th>
                      <th className="px-4 py-3">{t('active_dev.status')}</th>
                      <th className="px-4 py-3">{t('active_dev.issued_date')}</th>
                      <th className="px-4 py-3">{t('active_dev.paid_date')}</th>
                      <th className="px-4 py-3">PDF</th>
                      <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">
                          No invoices recorded yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/80 transition-all">
                          <td className="px-4 py-3 font-bold text-gray-900">{inv.invoice_number || 'N/A'}</td>
                          <td className="px-4 py-3 font-black text-gray-900">&euro;{parseFloat(inv.amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <select
                              value={inv.status}
                              onChange={(e) => handleUpdateInvoiceStatus(inv.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border focus:outline-none ${
                                inv.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : inv.status === 'issued'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              <option value="not_issued">{t('active_dev.status_not_issued')}</option>
                              <option value="issued">{t('active_dev.status_issued')}</option>
                              <option value="paid">{t('active_dev.status_paid')}</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={inv.issued_date || ''}
                              onChange={(e) => handleUpdateInvoiceField(inv.id, 'issued_date', e.target.value)}
                              className="bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={inv.paid_date || ''}
                              onChange={(e) => handleUpdateInvoiceField(inv.id, 'paid_date', e.target.value)}
                              className="bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {inv.pdf_path ? (
                                <a
                                  href={`/api/${inv.pdf_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100 transition-all border border-purple-200"
                                >
                                  <FileText size={14} /> PDF
                                </a>
                              ) : null}

                              <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all border border-gray-200">
                                <Upload size={12} />
                                <span>{inv.pdf_path ? 'Replace' : 'Upload PDF'}</span>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadInvoicePdf(inv.id, file);
                                  }}
                                />
                              </label>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSES & WORK LOGS */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Financial summary banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{t('active_dev.work_logs')} Expenses</span>
                  <div className="text-lg font-black text-emerald-950 mt-0.5">&euro;{totalTimeExpensesCalc.toLocaleString()}</div>
                </div>
                <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">{t('active_dev.manual_expenses')}</span>
                  <div className="text-lg font-black text-amber-950 mt-0.5">&euro;{totalManualExpensesCalc.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Total Dev Spent</span>
                  <div className="text-lg font-black text-purple-950 mt-0.5">&euro;{grandTotalExpenses.toLocaleString()}</div>
                </div>
              </div>

              {/* Manual Expenses Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">{t('active_dev.manual_expenses')}</h3>
                  <button
                    onClick={() => setShowAddExpense(!showAddExpense)}
                    className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-1"
                  >
                    <Plus size={14} /> {t('active_dev.add_manual_expense')}
                  </button>
                </div>

                {showAddExpense && (
                  <form onSubmit={handleCreateExpense} className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.expense_name')}</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Hosting, Domain, Stock Asset"
                          value={expenseName}
                          onChange={(e) => setExpenseName(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.expense_cost')} (&euro;)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="120.00"
                          value={expenseCost}
                          onChange={(e) => setExpenseCost(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.expense_date')}</label>
                        <input
                          type="date"
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddExpense(false)} className="px-3 py-1.5 rounded-xl bg-gray-200 text-xs font-bold">{t('common.cancel')}</button>
                      <button type="submit" className="px-4 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold">{t('common.save')}</button>
                    </div>
                  </form>
                )}

                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">{t('active_dev.expense_name')}</th>
                        <th className="px-4 py-2.5">{t('active_dev.expense_cost')}</th>
                        <th className="px-4 py-2.5">{t('active_dev.expense_date')}</th>
                        <th className="px-4 py-2.5 text-right">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {manualExpenses.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400">No manual expenses logged.</td></tr>
                      ) : (
                        manualExpenses.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-2.5 font-bold text-gray-900">{m.name}</td>
                            <td className="px-4 py-2.5 font-black text-gray-900">&euro;{parseFloat(m.cost || 0).toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-gray-600">{m.expense_date}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button onClick={() => handleDeleteExpense(m.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Time Logs Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">{t('active_dev.work_logs')} (from Time Logs)</h3>
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">User</th>
                        <th className="px-4 py-2.5">Hours</th>
                        <th className="px-4 py-2.5">Value (&euro;)</th>
                        <th className="px-4 py-2.5">Notes</th>
                        <th className="px-4 py-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {timeLogs.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400">No time logs recorded for this project.</td></tr>
                      ) : (
                        timeLogs.map((tl) => {
                          const dev = developers.find(d => d.id === tl.user_id || d.id === tl.member_id);
                          const rate = parseFloat(dev?.hourly_rate || 0);
                          const val = parseFloat(tl.hours || 0) * rate;
                          return (
                            <tr key={tl.id} className="hover:bg-gray-50/80">
                              <td className="px-4 py-2.5 font-bold text-gray-900">{tl.username || 'User #' + tl.user_id}</td>
                              <td className="px-4 py-2.5 font-black text-emerald-600">{tl.hours} h</td>
                              <td className="px-4 py-2.5 font-black text-purple-700">&euro;{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2.5 text-gray-600">{tl.notes || '-'}</td>
                              <td className="px-4 py-2.5 text-gray-500">{tl.log_date}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUBTASKS & CLICKUP */}
          {activeTab === 'subtasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{t('active_dev.subtasks')}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Synced from ClickUp or added manually.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHideCompletedSubtasks(!hideCompletedSubtasks)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border select-none cursor-pointer ${
                      hideCompletedSubtasks
                        ? 'bg-purple-50 text-purple-700 border-purple-300 ring-2 ring-purple-500/10'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <EyeOff size={14} className={hideCompletedSubtasks ? 'text-purple-600' : 'text-gray-400'} />
                    <span>{hideCompletedSubtasks ? 'Hide Completed (ON)' : 'Hide Completed'}</span>
                  </button>
                  <button
                    onClick={handleSyncClickup}
                    disabled={isSyncing}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                    {t('active_dev.sync_clickup')}
                  </button>
                  <button
                    onClick={() => setShowAddSubtask(!showAddSubtask)}
                    className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} />
                    {t('active_dev.add_subtask')}
                  </button>
                </div>
              </div>

              {showAddSubtask && (
                <form onSubmit={handleCreateSubtask} className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.subtask_title')}</label>
                      <input
                        type="text"
                        required
                        placeholder="Setup database tables"
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.subtask_status')}</label>
                      <select
                        value={subtaskStatus}
                        onChange={(e) => setSubtaskStatus(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                      >
                        <option value="to do">To Do</option>
                        <option value="in progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{t('active_dev.assignee')}</label>
                      <select
                        value={subtaskAssignee}
                        onChange={(e) => setSubtaskAssignee(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                      >
                        <option value="">-- Unassigned --</option>
                        {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddSubtask(false)} className="px-3 py-1.5 rounded-xl bg-gray-200 text-xs font-bold">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold">{t('common.save')}</button>
                  </div>
                </form>
              )}

              {/* Subtasks List Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">{t('active_dev.subtask_title')}</th>
                      <th className="px-4 py-3">{t('active_dev.subtask_status')}</th>
                      <th className="px-4 py-3">{t('active_dev.assignee')} (Paired Dev)</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subtasks.filter(st => !hideCompletedSubtasks || !['complete', 'completed', 'done', 'closed'].includes((st.status || '').toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 font-bold">
                          No subtasks matching filter.
                        </td>
                      </tr>
                    ) : (
                      subtasks.filter(st => !hideCompletedSubtasks || !['complete', 'completed', 'done', 'closed'].includes((st.status || '').toLowerCase())).map((st) => {
                        const isDone = ['complete', 'completed', 'done'].includes((st.status || '').toLowerCase());
                        return (
                          <tr key={st.id} className="hover:bg-gray-50/80 transition-all">
                            <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              <span className={isDone ? 'line-through text-gray-400' : ''}>{st.title}</span>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={st.status}
                                onChange={(e) => handleUpdateSubtaskStatus(st.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                  isDone
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                <option value="to do">To Do</option>
                                <option value="in progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {st.assignee_name ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                  <UserCheck size={12} /> {st.assignee_name}
                                </span>
                              ) : st.clickup_username ? (
                                <span className="inline-flex items-center gap-1 text-purple-600 font-bold">
                                  ClickUp: {st.clickup_username}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {st.clickup_id ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-100">
                                  ClickUp #{st.clickup_id}
                                </span>
                              ) : (
                                <span className="text-gray-400">Manual</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => handleDeleteSubtask(st.id)} className="text-gray-400 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
