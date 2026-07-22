import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { DeveloperCalendarView } from './DeveloperCalendarView';

interface DeveloperDetailModalProps {
  member: {
    id: number;
    username: string;
    role?: string;
    hourly_rate?: number | string;
    color?: string;
    email?: string;
  };
  logs: any[];
  projects?: any[];
  onClose: () => void;
}

export const DeveloperDetailModal: React.FC<DeveloperDetailModalProps> = ({
  member,
  logs,
  onClose
}) => {
  const memberLogs = useMemo(() => {
    return (logs || []).filter(l => Number(l.user_id) === Number(member.id));
  }, [logs, member.id]);

  const hourlyRate = parseFloat(String(member.hourly_rate || 0));

  const totalHours = useMemo(() => {
    return memberLogs.reduce((acc, l) => acc + parseFloat(String(l.hours || 0)), 0);
  }, [memberLogs]);

  const totalCost = useMemo(() => {
    return totalHours * hourlyRate;
  }, [totalHours, hourlyRate]);

  // Working days count rule: Math.floor(hours / 4) * 0.5
  const totalWorkingDays = useMemo(() => {
    return Math.floor(totalHours / 4) * 0.5;
  }, [totalHours]);

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const map: Record<string, { name: string; hours: number; cost: number }> = {};

    memberLogs.forEach(l => {
      const pName = l.project_name || `Project #${l.project_id}`;
      const hrs = parseFloat(String(l.hours || 0));
      if (!map[pName]) {
        map[pName] = { name: pName, hours: 0, cost: 0 };
      }
      map[pName].hours += hrs;
      map[pName].cost += hrs * hourlyRate;
    });

    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [memberLogs, hourlyRate]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-gray-900 via-purple-950 to-gray-900 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md"
              style={{ backgroundColor: member.color || '#8b5cf6' }}
            >
              {member.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">{member.username}</h2>
                {member.role && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {member.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Hourly Rate: &euro;{hourlyRate.toFixed(2)}/h {member.email ? `• ${member.email}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Top Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Total Hours Worked</span>
              <div className="text-xl font-black text-emerald-950 mt-0.5">{totalHours.toFixed(1)} h</div>
            </div>
            <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Working Days (4h = 0.5d)</span>
              <div className="text-xl font-black text-blue-950 mt-0.5">{totalWorkingDays.toFixed(1)} Days</div>
            </div>
            <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Total Labor Cost</span>
              <div className="text-xl font-black text-purple-950 mt-0.5">
                &euro;{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Project Breakdown Cards */}
          {projectBreakdown.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">Project Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {projectBreakdown.map((pb, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-gray-900 text-xs block truncate" title={pb.name}>{pb.name}</span>
                      <span className="text-[10px] text-gray-400 font-bold block">{pb.hours.toFixed(1)} hours</span>
                    </div>
                    <span className="font-black text-purple-700 text-xs flex-shrink-0">
                      &euro;{pb.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Embedded Developer Calendar */}
          <div className="pt-2">
            <DeveloperCalendarView
              userId={member.id}
              username={member.username}
              logs={logs}
              showFinancials={true}
              hourlyRate={hourlyRate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
