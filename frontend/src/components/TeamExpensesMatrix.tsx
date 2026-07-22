import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';

interface TeamUser {
  id: number;
  username: string;
  role?: string;
  hourly_rate?: number | string;
  color?: string;
}

interface TimeLogItem {
  id: number;
  user_id: number;
  project_id?: number | string;
  hours: number | string;
  log_date: string;
  project_name?: string;
  notes?: string;
}

import { useEffect } from 'react';
import { Filter, Check } from 'lucide-react';

interface ProjectOption {
  id: number;
  name: string;
  status?: string;
  is_archived?: number;
}

import { DeveloperCalendarView } from './DeveloperCalendarView';
import { DeveloperDetailModal } from './DeveloperDetailModal';

interface TeamExpensesMatrixProps {
  users: TeamUser[];
  logs: TimeLogItem[];
  projects?: ProjectOption[];
  showFinancials?: boolean;
  userRole?: string;
  currentUserId?: number;
  currentUsername?: string;
}

// Helper to get ISO week string and label
const getWeekKey = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  // ISO week calculation
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  const year = d.getFullYear();
  return `${year}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
};

export const TeamExpensesMatrix: React.FC<TeamExpensesMatrixProps> = ({
  users,
  logs,
  projects = [],
  showFinancials = true,
  userRole,
  currentUserId,
  currentUsername
}) => {
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [offset, setOffset] = useState(0); // Offset pagination for weeks/months
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [activeDevProjectIds, setActiveDevProjectIds] = useState<number[]>([]);
  const [selectedMemberForModal, setSelectedMemberForModal] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/active_development.php')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          const ids = (res.data || []).map((p: any) => Number(p.project_id || p.id));
          setActiveDevProjectIds(ids);
        }
      }).catch(console.error);
  }, []);

  // Filter logs by active projects or selected project
  const filteredLogs = useMemo(() => {
    return (logs || []).filter(log => {
      const pid = Number(log.project_id);
      if (selectedProjectId !== 'all' && pid !== Number(selectedProjectId)) {
        return false;
      }
      if (activeOnly && activeDevProjectIds.length > 0) {
        return activeDevProjectIds.includes(pid);
      }
      return true;
    });
  }, [logs, selectedProjectId, activeOnly, activeDevProjectIds]);

  // Filter users to PMs and DEVs (or all non-admin / active users)
  const activeMembers = useMemo(() => {
    return (users || []).map(u => ({
      ...u,
      hourly_rate: parseFloat(String(u.hourly_rate || 0))
    }));
  }, [users]);

  // Generate Period Columns dynamically based on time logs or current date
  const columns = useMemo(() => {
    const today = new Date();
    const cols: { key: string; label: string; sublabel?: string; startDate: string; endDate: string }[] = [];

    if (periodType === 'weekly') {
      // Generate 8 consecutive weeks starting from current week - offset
      const currentMonday = new Date(today);
      const day = currentMonday.getDay();
      const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
      currentMonday.setDate(diff + (offset * 7));

      for (let i = -7; i <= 0; i++) {
        const weekMon = new Date(currentMonday);
        weekMon.setDate(currentMonday.getDate() + (i * 7));
        const weekSun = new Date(weekMon);
        weekSun.setDate(weekMon.getDate() + 6);

        const year = weekMon.getFullYear();
        // Calc ISO week number
        const target = new Date(weekMon.valueOf());
        const dayNr = (weekMon.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        }
        const weekNum = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);

        const key = `${year}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
        const formatShort = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

        cols.push({
          key,
          label: `Week ${weekNum}`,
          sublabel: `${formatShort(weekMon)} - ${formatShort(weekSun)}`,
          startDate: weekMon.toISOString().split('T')[0],
          endDate: weekSun.toISOString().split('T')[0]
        });
      }
    } else {
      // Monthly view: Generate 12 consecutive months
      const baseMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);

      for (let i = -11; i <= 0; i++) {
        const mDate = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + i, 1);
        const year = mDate.getFullYear();
        const monthNum = mDate.getMonth() + 1;
        const monthStr = monthNum < 10 ? '0' + monthNum : '' + monthNum;
        const key = `${year}-${monthStr}`;

        const lastDay = new Date(year, monthNum, 0).getDate();

        cols.push({
          key,
          label: mDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          sublabel: `${year}`,
          startDate: `${key}-01`,
          endDate: `${key}-${lastDay < 10 ? '0' + lastDay : lastDay}`
        });
      }
    }

    return cols;
  }, [periodType, offset]);

  // Aggregate matrix cell values: map[userId][colKey] = { hours, cost }
  const matrixData = useMemo(() => {
    const data: Record<number, Record<string, { hours: number; cost: number }>> = {};

    activeMembers.forEach(u => {
      data[u.id] = {};
      columns.forEach(col => {
        data[u.id][col.key] = { hours: 0, cost: 0 };
      });
    });

    (filteredLogs || []).forEach(log => {
      if (!log.log_date) return;
      const hrs = parseFloat(String(log.hours || 0));
      if (hrs <= 0) return;

      const userId = Number(log.user_id);
      if (!data[userId]) return;

      let matchedColKey = '';
      if (periodType === 'weekly') {
        const weekKey = getWeekKey(log.log_date);
        matchedColKey = weekKey;
      } else {
        matchedColKey = log.log_date.substring(0, 7); // YYYY-MM
      }

      if (data[userId] && data[userId][matchedColKey]) {
        data[userId][matchedColKey].hours += hrs;
        const rate = activeMembers.find(m => m.id === userId)?.hourly_rate || 0;
        data[userId][matchedColKey].cost += (hrs * rate);
      }
    });

    return data;
  }, [activeMembers, columns, filteredLogs, periodType]);

  // Calculate totals per column
  const colTotals = useMemo(() => {
    const totals: Record<string, { hours: number; cost: number }> = {};
    columns.forEach(col => {
      totals[col.key] = { hours: 0, cost: 0 };
      activeMembers.forEach(u => {
        const cell = matrixData[u.id]?.[col.key];
        if (cell) {
          totals[col.key].hours += cell.hours;
          totals[col.key].cost += cell.cost;
        }
      });
    });
    return totals;
  }, [columns, activeMembers, matrixData]);

  // Calculate totals per user row
  const rowTotals = useMemo(() => {
    const totals: Record<number, { hours: number; cost: number }> = {};
    activeMembers.forEach(u => {
      totals[u.id] = { hours: 0, cost: 0 };
      columns.forEach(col => {
        const cell = matrixData[u.id]?.[col.key];
        if (cell) {
          totals[u.id].hours += cell.hours;
          totals[u.id].cost += cell.cost;
        }
      });
    });
    return totals;
  }, [activeMembers, columns, matrixData]);

  // Grand total
  const grandTotal = useMemo(() => {
    let hours = 0;
    let cost = 0;
    Object.values(rowTotals).forEach(t => {
      hours += t.hours;
      cost += t.cost;
    });
    return { hours, cost };
  }, [rowTotals]);

  // If logged in as developer / employee, show personal monthly work calendar directly!
  if (userRole === 'employee') {
    return (
      <DeveloperCalendarView
        userId={currentUserId || 0}
        username={currentUsername || 'Developer'}
        logs={logs}
        showFinancials={false}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls & toggles */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
            <Briefcase size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">Team Work &amp; Expenses Matrix</h3>
            <p className="text-xs text-gray-500 font-medium">
              {showFinancials ? 'Breakdown of hours worked and labor expenses per PM/Developer' : 'Breakdown of hours worked per PM/Developer'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Active Projects Toggle Button */}
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border ${
              activeOnly
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter size={14} />
            <span>Active Projects Only</span>
            {activeOnly && <Check size={14} className="text-white ml-0.5" />}
          </button>

          {/* Project Selector Dropdown */}
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white border border-gray-200 text-gray-800 rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Weekly vs Monthly Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              onClick={() => { setPeriodType('weekly'); setOffset(0); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                periodType === 'weekly' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => { setPeriodType('monthly'); setOffset(0); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                periodType === 'monthly' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Time Navigation Pagination */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-2xl p-1">
            <button
              onClick={() => setOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
              title="Earlier"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setOffset(0)}
              disabled={offset === 0}
              className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              Current
            </button>
            <button
              onClick={() => setOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
              title="Later"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5 sticky left-0 z-20 bg-gray-50/95 border-r border-gray-200 min-w-[220px]">
                  Team Member (PM / Dev)
                </th>
                {columns.map(col => (
                  <th key={col.key} className="px-3 py-3 text-center min-w-[110px] border-r border-gray-100">
                    <span className="block font-black text-gray-900 text-xs">{col.label}</span>
                    {col.sublabel && <span className="block text-[9px] font-bold text-gray-400 normal-case">{col.sublabel}</span>}
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-900 font-black min-w-[130px]">
                  Total Summary
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-6 py-8 text-center text-gray-400">
                    No team members found.
                  </td>
                </tr>
              ) : (
                activeMembers.map(u => {
                  const rTotal = rowTotals[u.id] || { hours: 0, cost: 0 };
                  const roleBadgeColor = u.role === 'PM' ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-700';

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Row Header: Member Name & Hourly Rate */}
                      <td
                        onClick={() => setSelectedMemberForModal(u)}
                        className="px-5 py-3 sticky left-0 z-10 bg-white border-r border-gray-200 shadow-sm cursor-pointer hover:bg-purple-50/60 group transition-all"
                        title="Click to view detailed calendar & work breakdown"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: u.color || '#6b7280' }}
                          >
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-gray-900 group-hover:text-purple-700 truncate text-xs transition-colors">
                                {u.username}
                              </span>
                              {u.role && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${roleBadgeColor}`}>
                                  {u.role}
                                </span>
                              )}
                            </div>
                            {showFinancials && (
                              <span className="text-[10px] font-bold text-gray-400 block">
                                Rate: &euro;{parseFloat(String(u.hourly_rate || 0)).toFixed(2)}/h
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Period Columns Data Cells */}
                      {columns.map(col => {
                        const cell = matrixData[u.id]?.[col.key] || { hours: 0, cost: 0 };
                        const hasActivity = cell.hours > 0;

                        return (
                          <td key={col.key} className={`px-3 py-3 text-center border-r border-gray-100 transition-colors ${hasActivity ? 'bg-purple-50/15' : ''}`}>
                            {hasActivity ? (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-black text-xs">
                                  {cell.hours.toFixed(1)} h
                                </span>
                                {showFinancials && (
                                  <span className="block text-[11px] font-extrabold text-purple-700">
                                    &euro;{cell.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300 font-medium text-xs">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* User Row Total */}
                      <td className="px-4 py-3 text-right bg-purple-50/30">
                        <div className="space-y-0.5">
                          <span className="block font-black text-emerald-700 text-xs">
                            {rTotal.hours.toFixed(1)} h
                          </span>
                          {showFinancials && (
                            <span className="block font-black text-purple-900 text-xs">
                              &euro;{rTotal.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Matrix Footer Totals Row */}
            <tfoot>
              <tr className="bg-gray-900 text-white font-black text-xs border-t-2 border-gray-800">
                <td className="px-5 py-4 sticky left-0 z-20 bg-gray-900 border-r border-gray-800 uppercase tracking-wider text-[11px]">
                  Team Column Totals
                </td>
                {columns.map(col => {
                  const cTotal = colTotals[col.key] || { hours: 0, cost: 0 };
                  return (
                    <td key={col.key} className="px-3 py-4 text-center border-r border-gray-800">
                      {cTotal.hours > 0 ? (
                        <div className="space-y-0.5">
                          <span className="block text-emerald-400 font-black text-xs">{cTotal.hours.toFixed(1)} h</span>
                          {showFinancials && (
                            <span className="block text-purple-300 font-black text-xs">&euro;{cTotal.cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 font-normal">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-4 text-right bg-purple-950 text-white">
                  <div className="space-y-0.5">
                    <span className="block text-emerald-400 font-black text-sm">{grandTotal.hours.toFixed(1)} h</span>
                    {showFinancials && (
                      <span className="block text-purple-300 font-black text-sm">&euro;{grandTotal.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Developer Detail Modal for Managers/Admins */}
      {selectedMemberForModal && (
        <DeveloperDetailModal
          member={selectedMemberForModal}
          logs={logs}
          projects={projects}
          onClose={() => setSelectedMemberForModal(null)}
        />
      )}
    </div>
  );
};
