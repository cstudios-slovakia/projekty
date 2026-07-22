import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Briefcase, Award } from 'lucide-react';

interface TimeLogItem {
  id: number;
  user_id: number;
  project_id?: number | string;
  hours: number | string;
  log_date: string;
  project_name?: string;
  notes?: string;
}

interface DeveloperCalendarViewProps {
  userId: number;
  username: string;
  logs: TimeLogItem[];
  showFinancials?: boolean;
  hourlyRate?: number;
}

export const DeveloperCalendarView: React.FC<DeveloperCalendarViewProps> = ({
  userId,
  username,
  logs,
  showFinancials = false,
  hourlyRate = 0
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Filter logs for this specific user
  const userLogs = useMemo(() => {
    return (logs || []).filter(l => Number(l.user_id) === Number(userId));
  }, [logs, userId]);

  // Generate weeks and days matrix for the selected month
  const calendarWeeks = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Get Monday of the first week (0 = Sun, 1 = Mon, ... 6 = Sat)
    let startDayOfWeek = firstDayOfMonth.getDay();
    let diffToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() + diffToMonday);

    const weeks: {
      weekIndex: number;
      days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; hours: number; notes: string[] }[];
      weekTotalHours: number;
    }[] = [];

    let currIter = new Date(startDate);
    let weekCounter = 1;

    while (currIter <= lastDayOfMonth || currIter.getDay() !== 1) {
      const days = [];
      let weekTotalHours = 0;

      for (let i = 0; i < 7; i++) {
        const dateStr = currIter.toISOString().split('T')[0];
        const isCurrentMonth = currIter.getMonth() === month;

        // Sum hours for dateStr
        const dayLogs = userLogs.filter(l => l.log_date === dateStr);
        const dayHours = dayLogs.reduce((acc, l) => acc + parseFloat(String(l.hours || 0)), 0);
        const dayNotes = dayLogs.map(l => (l.project_name ? `[${l.project_name}] ` : '') + (l.notes || '')).filter(Boolean);

        weekTotalHours += dayHours;

        days.push({
          dateStr,
          dayNum: currIter.getDate(),
          isCurrentMonth,
          hours: dayHours,
          notes: dayNotes
        });

        currIter.setDate(currIter.getDate() + 1);
      }

      weeks.push({
        weekIndex: weekCounter++,
        days,
        weekTotalHours
      });

      if (currIter > lastDayOfMonth && currIter.getDay() === 1) {
        break;
      }
    }

    return weeks;
  }, [year, month, userLogs]);

  // Calculate Monthly Totals
  const monthlyTotalHours = useMemo(() => {
    return userLogs.reduce((acc, l) => {
      if (!l.log_date) return acc;
      const lDate = new Date(l.log_date);
      if (lDate.getFullYear() === year && lDate.getMonth() === month) {
        return acc + parseFloat(String(l.hours || 0));
      }
      return acc;
    }, 0);
  }, [userLogs, year, month]);

  // Rule: Measure every 4 hours for half a day rounded down
  // Math.floor(monthlyTotalHours / 4) * 0.5 days
  const workingDaysCount = useMemo(() => {
    const halfDays = Math.floor(monthlyTotalHours / 4);
    return halfDays * 0.5;
  }, [monthlyTotalHours]);

  const monthlyTotalCost = useMemo(() => {
    return monthlyTotalHours * hourlyRate;
  }, [monthlyTotalHours, hourlyRate]);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-5">
      {/* Calendar Header & KPI Summary */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{username}'s Work Calendar</h3>
            <p className="text-xs text-gray-500 font-medium">Daily work logs, weekly totals &amp; monthly working day calculation</p>
          </div>
        </div>

        {/* Navigation & Month Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-2xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-200 text-gray-700 rounded-xl transition-all"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 py-1.5 text-xs font-black text-gray-900 min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-200 text-gray-700 rounded-xl transition-all"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={handleCurrentMonth}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50/70 border border-emerald-100 p-5 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Total Monthly Hours</span>
            <div className="text-2xl font-black text-emerald-950 mt-1">{monthlyTotalHours.toFixed(1)} h</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 p-5 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">Working Days (4h = 0.5d)</span>
            <div className="text-2xl font-black text-blue-950 mt-1">{workingDaysCount.toFixed(1)} Days</div>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
            <Award size={24} />
          </div>
        </div>

        {showFinancials && (
          <div className="bg-purple-50/70 border border-purple-100 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">Total Labor Expense</span>
              <div className="text-2xl font-black text-purple-950 mt-1">
                &euro;{monthlyTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
              <Briefcase size={24} />
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white font-black uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3.5 text-center min-w-[120px]">Mon</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">Tue</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">Wed</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">Thu</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">Fri</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">Sat</th>
                <th className="px-4 py-3.5 text-center min-w-[120px]">Sun</th>
                <th className="px-4 py-3.5 text-center bg-purple-950 text-purple-200 min-w-[130px]">
                  Week Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {calendarWeeks.map((week, idx) => (
                <tr key={idx} className="divide-x divide-gray-100 hover:bg-gray-50/50 transition-colors">
                  {week.days.map((day, dIdx) => (
                    <td
                      key={dIdx}
                      className={`p-3 align-top h-24 transition-colors ${
                        day.isCurrentMonth ? 'bg-white' : 'bg-gray-50/60 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                            day.isCurrentMonth
                              ? 'bg-gray-100 text-gray-800'
                              : 'text-gray-400'
                          }`}
                        >
                          {day.dayNum}
                        </span>
                        {day.hours > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[11px]">
                            {day.hours.toFixed(1)} h
                          </span>
                        )}
                      </div>

                      {day.notes.length > 0 && (
                        <div className="space-y-1 overflow-hidden max-h-12">
                          {day.notes.map((note, nIdx) => (
                            <p key={nIdx} className="text-[10px] text-gray-500 font-medium truncate" title={note}>
                              {note}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  ))}

                  {/* End of Row: Week Total Column */}
                  <td className="p-3 text-center bg-purple-50/40 align-middle">
                    <span className="block text-xs font-black text-purple-900">
                      {week.weekTotalHours.toFixed(1)} h
                    </span>
                    <span className="block text-[10px] text-purple-600 font-bold mt-0.5">
                      {(Math.floor(week.weekTotalHours / 4) * 0.5).toFixed(1)} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-900 text-white font-black text-xs">
                <td colSpan={7} className="px-6 py-4 uppercase tracking-wider text-right text-[11px]">
                  Monthly Total Worked Time:
                </td>
                <td className="px-4 py-4 text-center bg-purple-950">
                  <span className="block text-emerald-400 font-black text-sm">{monthlyTotalHours.toFixed(1)} h</span>
                  <span className="block text-purple-300 font-bold text-xs">{workingDaysCount.toFixed(1)} Days</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
