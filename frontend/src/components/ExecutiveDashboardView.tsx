import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, DollarSign, Send, TrendingDown, Users, Code, RefreshCw, Layers, Calendar, ShieldAlert, X } from 'lucide-react';
import { BudgetBurndownChart } from './BudgetBurndownChart';
import { CashflowMixedChart } from './CashflowMixedChart';

interface ExecutiveDashboardViewProps {
  user: any;
}

export function ExecutiveDashboardView({ user }: ExecutiveDashboardViewProps) {
  const [data, setData] = useState<any>(null);
  const [allTimeLogs, setAllTimeLogs] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<{ period: string; type: 'income' | 'expense'; weekData: any } | null>(null);

  const isManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'pm';

  useEffect(() => {
    if (isManager) {
      fetchDashboardData();
    }
  }, [isManager]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dashRes, timeRes, invRes, expRes, setRes] = await Promise.all([
        fetch('/api/dashboard.php'),
        fetch('/api/time_logs.php').catch(() => null),
        fetch('/api/invoices.php').catch(() => null),
        fetch('/api/expenses.php').catch(() => null),
        fetch('/api/settings.php').catch(() => null)
      ]);

      const json = await dashRes.json();
      if (json.status === 'success') {
        setData(json.data);
      } else {
        setError(json.message || 'Failed to load dashboard data');
      }

      if (timeRes) {
        const timeJson = await timeRes.json();
        if (timeJson.status === 'success') setAllTimeLogs(timeJson.data || []);
      }
      if (invRes) {
        const invJson = await invRes.json();
        if (invJson.status === 'success') setAllInvoices(invJson.data || []);
      }
      if (expRes) {
        const expJson = await expRes.json();
        if (expJson.status === 'success') setAllExpenses(expJson.data || []);
      }
      if (setRes) {
        const setJson = await setRes.json();
        if (setJson.status === 'success') {
          const ents = setJson.data || [];
          setDevelopers(ents.filter((e: any) => e.type === 'developer' || e.type === 'member'));
        }
      }
    } catch (e: any) {
      console.error(e);
      setError('Connection error while fetching executive dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isManager) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-amber-200 shadow-sm max-w-2xl mx-auto my-12">
        <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 mb-4 border border-amber-100">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Access Restricted</h2>
        <p className="text-sm font-medium text-gray-600 mt-2 max-w-md">
          The Executive KPI Dashboard contains sensitive financial metrics, cashflow projections, and developer time breakdowns available exclusively for Management.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw size={36} className="animate-spin text-purple-600" />
        <p className="text-sm font-bold text-gray-500">Loading Manager Executive Dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-3xl text-sm font-bold">
        {error || 'No dashboard data available.'}
      </div>
    );
  }

  const executive = data.executive || {};
  const totalInvoicable = parseFloat(executive.total_invoicable_amount || 0);
  const totalActiveValue = parseFloat(executive.total_active_projects_value || 0);
  const totalSentOffersValue = parseFloat(executive.total_sent_offers_value || 0);
  const activeProjectsBurned = executive.active_projects_burned || [];
  const developerTimeStats = executive.developer_time_stats || [];
  const cashflowProjection = executive.cashflow_projection || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-500/20">
            <Layers size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Executive Dashboard</h1>
            <p className="text-xs font-medium text-gray-500 mt-0.5">High-level financial KPIs, project burn rates, cashflow projections & time metrics</p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Combined Row: 2x2 KPI Grid (Left) + Compact Active Projects Burn Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN: 2x2 KPI Grid (6 cols) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* KPI 1: Invoicable Amount */}
          <div className="bg-white rounded-3xl border border-emerald-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <DollarSign size={18} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                Ready to Bill
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-gray-400 block">Total Invoicable</span>
              <h2 className="text-xl lg:text-2xl font-black text-gray-900 mt-1 tracking-tight">
                &euro;{totalInvoicable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-[11px] font-medium text-gray-500 mt-1">Unbilled balance across active development projects</p>
            </div>
          </div>

          {/* KPI 2: Active Projects Total Value */}
          <div className="bg-white rounded-3xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <Briefcase size={18} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                {activeProjectsBurned.length} Active Projects
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-gray-400 block">Active Projects Value</span>
              <h2 className="text-xl lg:text-2xl font-black text-gray-900 mt-1 tracking-tight">
                &euro;{totalActiveValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-[11px] font-medium text-gray-500 mt-1">Total contract value of live non-archived projects</p>
            </div>
          </div>

          {/* KPI 3: Sent Price Offers Value */}
          <div className="bg-white rounded-3xl border border-amber-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <Send size={18} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                Pending Acceptance
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-gray-400 block">Sent Price Offers</span>
              <h2 className="text-xl lg:text-2xl font-black text-gray-900 mt-1 tracking-tight">
                &euro;{totalSentOffersValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-[11px] font-medium text-gray-500 mt-1">Offers sent to clients, awaiting decision</p>
            </div>
          </div>

          {/* KPI 4: Developer Time Capacity */}
          <div className="bg-white rounded-3xl border border-purple-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <Users size={18} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                {developerTimeStats.length} Developers
              </span>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-gray-400 block">This Month Tracked</span>
              <h2 className="text-xl lg:text-2xl font-black text-gray-900 mt-1 tracking-tight">
                {developerTimeStats.reduce((acc: number, d: any) => acc + (d.this_month || 0), 0).toFixed(1)} hrs
              </h2>
              <p className="text-[11px] font-medium text-gray-500 mt-1">Cumulative hours recorded by dev team this month</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Projects Budget Burn Status (Compact Panel) (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown size={18} className="text-purple-600" />
              <h3 className="text-sm font-black text-gray-900 tracking-tight">Active Projects Budget Burn</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {activeProjectsBurned.length} Live Projects
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {activeProjectsBurned.map((proj: any) => {
              const isOvershot = proj.burned_percentage > 100;
              const isHighBurn = proj.burned_percentage >= 75 && !isOvershot;
              const devBud = proj.dev_budget > 0 ? proj.dev_budget : proj.budget;

              return (
                <div key={proj.id} className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-200/70 space-y-1.5 hover:border-purple-300 transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-gray-900 text-xs truncate">{proj.project_name}</h4>
                      <p className="text-[10px] font-medium text-gray-500 truncate">
                        Dev: <span className="text-emerald-700 font-bold">{proj.dev_name || 'Unassigned'}</span> &bull; PM: <span className="text-purple-700 font-bold">{proj.pm_name || 'Unassigned'}</span>
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex-shrink-0 ${
                      isOvershot
                        ? 'bg-amber-100 text-amber-800'
                        : isHighBurn
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {proj.burned_percentage}%
                    </span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isOvershot
                          ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                          : isHighBurn
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                      }`}
                      style={{ width: `${Math.min(proj.burned_percentage, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                    <span>Burned: <strong className="text-gray-900">&euro;{proj.total_expenses.toLocaleString()}</strong></span>
                    <span>Budget: <strong className="text-gray-900">&euro;{devBud.toLocaleString()}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: Executive Cashflow Projection Graph (-15 Days to +3 Months) */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              Cashflow Projection Graph (Weekly Resolution: -15 Days to +3 Months)
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Click on any bar to open the itemized breakdown slideout</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Income (Invoices + Active Projects)
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Expenses
            </span>
            <span className="flex items-center gap-1.5 text-purple-700">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span> Net Cashflow Trend
            </span>
          </div>
        </div>

        {/* Mixed Line + Bar Graph */}
        <div className="bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
          <CashflowMixedChart
            data={cashflowProjection}
            height={300}
            onBarClick={(clickInfo) => setSelectedBar(clickInfo)}
          />
        </div>
      </div>

      {/* SECTION 3: Developer Tracked Hours Matrix */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Code size={20} className="text-emerald-600" />
              Developer Tracked Hours Comparative Matrix
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Tracked work duration comparison between current & previous weeks and months</p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-separate border-spacing-y-2">
            <thead>
              <tr className="text-gray-400 font-black uppercase text-[10px] tracking-wider">
                <th className="px-4 py-2">Developer</th>
                <th className="px-4 py-2">This Week</th>
                <th className="px-4 py-2">Previous Week</th>
                <th className="px-4 py-2">This Month</th>
                <th className="px-4 py-2">Previous Month</th>
              </tr>
            </thead>
            <tbody>
              {developerTimeStats.map((dev: any) => (
                <tr key={dev.user_id} className="bg-gray-50/80 hover:bg-gray-100/80 transition-all rounded-2xl shadow-2xs">
                  <td className="px-4 py-3 font-black text-gray-900 rounded-l-2xl flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dev.color || '#3b82f6' }}></span>
                    <span>{dev.name}</span>
                  </td>

                  <td className="px-4 py-3 font-bold text-gray-900">
                    <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-purple-700 font-black">
                      {dev.this_week.toFixed(1)} hrs
                    </span>
                  </td>

                  <td className="px-4 py-3 font-bold text-gray-600">
                    {dev.prev_week.toFixed(1)} hrs
                  </td>

                  <td className="px-4 py-3 font-bold text-gray-900">
                    <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-black">
                      {dev.this_month.toFixed(1)} hrs
                    </span>
                  </td>

                  <td className="px-4 py-3 font-bold text-gray-600 rounded-r-2xl">
                    {dev.prev_month.toFixed(1)} hrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Total Combined Project Budget Burndown Graph */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingDown size={20} className="text-purple-600" />
              Total Combined Project Budget Burndown Graph
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Aggregate financial limits vs cumulative actual labor & manual expenses across all active projects</p>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200 self-start sm:self-auto">
            Total Active Budget: &euro;{totalActiveValue.toLocaleString()}
          </span>
        </div>

        <BudgetBurndownChart
          budget={totalActiveValue}
          devBudget={activeProjectsBurned.reduce((sum: number, p: any) => sum + (p.dev_budget || 0), 0)}
          manualExpenses={allExpenses}
          timeLogs={allTimeLogs}
          invoices={allInvoices}
          developers={developers}
          height={260}
        />
      </div>

      {/* ITEMIZABLE CASHFLOW BREAKDOWN SLIDEOUT */}
      {selectedBar && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedBar(null)}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
          ></div>

          {/* Slideout Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col justify-between animate-slide-left z-50">
              {/* Slideout Header */}
              <div className="p-6 border-b border-gray-100 bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      selectedBar.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {selectedBar.type === 'income' ? 'Income Breakdown' : 'Expenses Breakdown'}
                    </span>
                    <span className="text-xs font-bold text-gray-300">{selectedBar.period}</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1 tracking-tight">
                    {selectedBar.type === 'income' ? 'Itemized Income' : 'Itemized Expenses'}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedBar(null)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Slideout Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                {/* Total Summary Header Card */}
                <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                  selectedBar.type === 'income' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                }`}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Total {selectedBar.type === 'income' ? 'Income' : 'Expenses'} for {selectedBar.period}</span>
                    <h2 className={`text-2xl font-black mt-0.5 tracking-tight ${
                      selectedBar.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      &euro;{(selectedBar.type === 'income' ? selectedBar.weekData.expected_income : selectedBar.weekData.projected_expenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>
                  </div>
                </div>

                {/* Itemized Items */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Included Breakdown Items</h4>

                  {(() => {
                    const items = selectedBar.type === 'income'
                      ? (selectedBar.weekData.income_items || [])
                      : (selectedBar.weekData.expense_items || []);

                    if (items.length === 0) {
                      return (
                        <div className="p-8 text-center bg-gray-50 border border-gray-200/80 rounded-2xl text-gray-400 italic font-medium text-xs">
                          No specific itemized records logged for this period.
                        </div>
                      );
                    }

                    return items.map((item: any, idx: number) => {
                      const catLabel = item.category_label || item.type;
                      const isCompany = catLabel.toLowerCase().includes('company');
                      const isSalary = catLabel.toLowerCase().includes('salary');

                      const badgeStyle = isSalary
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isCompany
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200';

                      return (
                        <div key={idx} className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 space-y-2 hover:border-gray-300 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-black text-gray-900 text-xs leading-snug">{item.title}</span>
                            <span className={`font-black text-xs flex-shrink-0 ${
                              selectedBar.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              &euro;{parseFloat(String(item.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${badgeStyle}`}>
                              {catLabel}
                            </span>
                            {item.type && item.type !== catLabel && (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] font-bold text-gray-500">
                                {item.type}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                <button
                  onClick={() => setSelectedBar(null)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
