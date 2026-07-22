import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Briefcase, Plus, Search, RefreshCw, X, Trash2, Edit, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export function ClientsView() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientColor, setClientColor] = useState('#3b82f6');
  const [contactPerson, setContactPerson] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number | string>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/clients.php');
      const data = await res.json();
      if (data.status === 'success') {
        setClients(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setClientName('');
    setClientColor('#3b82f6');
    setContactPerson('');
    setEmailPhone('');
    setHourlyRate(0);
    setShowModal(true);
  };

  const handleOpenEditModal = (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setClientName(client.name || '');
    setClientColor(client.color || '#3b82f6');
    setContactPerson(client.contact_person || '');
    setEmailPhone(client.email_phone || '');
    setHourlyRate(client.hourly_rate || 0);
    setShowModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    try {
      setIsSaving(true);
      const url = editingClient ? `/api/clients.php?id=${editingClient.id}` : '/api/clients.php';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          color: clientColor,
          contact_person: contactPerson,
          email_phone: emailPhone,
          hourly_rate: parseFloat(String(hourlyRate || 0))
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        setShowModal(false);
        fetchClients();
      }
    } catch (e) {
      console.error('Failed to save client:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (clientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('common.confirm_delete') || 'Delete this client?')) return;

    try {
      const res = await fetch(`/api/clients.php?id=${clientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClients = clients.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email_phone || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Overall KPI aggregates
  const totalClientsCount = clients.length;
  const totalActiveProjects = clients.reduce((sum, c) => sum + parseInt(c.active_projects_count || 0, 10), 0);
  const totalClientsBudget = clients.reduce((sum, c) => sum + parseFloat(c.total_budget || 0), 0);
  const totalClientsRevenue = clients.reduce((sum, c) => sum + parseFloat(c.revenue || 0), 0);
  const totalClientsExpenses = clients.reduce((sum, c) => sum + parseFloat(c.total_expenses || 0), 0);
  const totalClientsProfit = totalClientsBudget - totalClientsExpenses;
  const overallProfitPercentage = totalClientsBudget > 0 ? Math.round(((totalClientsBudget - totalClientsExpenses) / totalClientsBudget) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Users size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('nav.clients') || 'Clients'}</h1>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Client overview, active projects, revenue, budget, and profit margins.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Client</span>
          </button>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] shadow-sm"
            />
          </div>

          <button
            onClick={fetchClients}
            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
            title={t('common.refresh')}
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Clients</span>
            <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 font-bold"><Users size={18} /></span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">{totalClientsCount}</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{totalActiveProjects} Active Projects</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Clients Budget</span>
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 font-bold"><Briefcase size={18} /></span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">&euro;{totalClientsBudget.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Revenue / Paid</span>
            <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 font-bold"><DollarSign size={18} /></span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">&euro;{totalClientsRevenue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Overall Client Profit</span>
            <span className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 font-bold"><TrendingUp size={18} /></span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 tracking-tight">&euro;{totalClientsProfit.toLocaleString()}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overallProfitPercentage >= 30 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {overallProfitPercentage}% margin
            </span>
          </div>
        </div>
      </div>

      {/* Clients Rows List */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xl shadow-gray-100/50 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-black text-gray-900">No clients found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            Click &quot;Add Client&quot; above to create your first client profile and track project performance.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-2xl bg-gray-900 text-white text-xs font-bold shadow-md hover:bg-gray-800 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Client</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const activeProjectsCount = parseInt(client.active_projects_count || 0, 10);
            const totBudget = parseFloat(client.total_budget || 0);
            const totRevenue = parseFloat(client.revenue || 0);
            const totExp = parseFloat(client.total_expenses || 0);
            const profit = parseFloat(client.profit || 0);
            const profitPct = parseFloat(client.profit_percentage || 0);

            const isHighProfit = profitPct >= 30;
            const isLoss = profit < 0;

            return (
              <div key={client.id} className="bg-white rounded-3xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all">
                {/* Client Main Row */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Client Avatar & Contact */}
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                      className={`p-2.5 rounded-2xl transition-all flex-shrink-0 ${isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      title="Toggle Projects List"
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md" style={{ backgroundColor: client.color || '#3b82f6' }}>
                      {(client.name || 'C')[0].toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3
                          onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                          className="text-lg font-black text-gray-900 tracking-tight hover:text-blue-600 cursor-pointer transition-colors"
                        >
                          {client.name}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">
                          {activeProjectsCount} Active Projects
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {client.contact_person && (
                          <span className="flex items-center gap-1 font-medium">
                            <Users size={12} className="text-gray-400" /> {client.contact_person}
                          </span>
                        )}
                        {client.email_phone && (
                          <span className="flex items-center gap-1 font-medium">
                            <Mail size={12} className="text-gray-400" /> {client.email_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: KPIs & Percentual Profit */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-3 py-2.5 bg-gray-50/70 rounded-2xl border border-gray-100 flex-shrink-0 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 block">Total Budget</span>
                      <span className="font-black text-gray-900">&euro;{totBudget.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 block">Revenue / Paid</span>
                      <span className="font-black text-emerald-700">&euro;{totRevenue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 block">Total Expenses</span>
                      <span className="font-black text-purple-700">&euro;{totExp.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 block">Profit (%)</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                          isLoss
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isHighProfit
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {profitPct}% (&euro;{profit.toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Edit & Delete Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 justify-end">
                    <button
                      onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <span>Projects</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      onClick={(e) => handleOpenEditModal(client, e)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                      title="Edit Client"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={(e) => handleDeleteClient(client.id, e)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Delete Client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Collapsible Active Projects List for this Client */}
                {isExpanded && (
                  <div className="p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Projects for {client.name} ({(client.projects || []).length})
                    </h4>

                    {(client.projects || []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No projects associated with this client yet.</p>
                    ) : (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                            <tr>
                              <th className="px-4 py-2.5">Project Name</th>
                              <th className="px-4 py-2.5">Status</th>
                              <th className="px-4 py-2.5">Budget</th>
                              <th className="px-4 py-2.5">Deadline</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {client.projects.map((proj: any) => (
                              <tr key={proj.id} className="hover:bg-gray-50/80">
                                <td className="px-4 py-2.5 font-bold text-gray-900">{proj.name}</td>
                                <td className="px-4 py-2.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    {proj.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-black text-gray-900">&euro;{parseFloat(proj.total_value || 0).toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-gray-500">{proj.deadline || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-black tracking-tight">{editingClient ? 'Edit Client' : 'Add New Client'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Color Badge</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={clientColor}
                    onChange={(e) => setClientColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-xs font-mono font-bold text-gray-600">{clientColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email / Phone</label>
                <input
                  type="text"
                  placeholder="john@acme.com / +123456789"
                  value={emailPhone}
                  onChange={(e) => setEmailPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-xs font-bold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50 shadow-md"
                >
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
