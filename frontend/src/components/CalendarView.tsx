import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Briefcase, Zap } from 'lucide-react';

interface CalendarProject {
  id: number;
  name: string;
  status: string;
  deadline: string | null;
  designer_id: number | null;
  design_start: string | null;
  design_end: string | null;
  dev_id: number | null;
  dev_start: string | null;
  dev_end: string | null;
}

interface CalendarMeeting {
  id: number;
  activity_date: string;
  notes: string;
  type: string;
  company_name: string;
  contact_name: string;
  pm_id: number | null;
}

interface CalendarEntity {
  id: number;
  type: string;
  name: string;
  color: string;
}

export const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<{ projects: CalendarProject[], meetings: CalendarMeeting[], entities: CalendarEntity[] }>({
    projects: [],
    meetings: [],
    entities: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar.php')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          setData(res.data);
        }
        setIsLoading(false);
      });
  }, []);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter entities
  const designers = data.entities.filter(e => e.type === 'designer');
  const developers = data.entities.filter(e => e.type === 'developer');

  // Helpers for timeline block calculation
  const getBlockStyles = (startStr: string | null, endStr: string | null, color: string) => {
    if (!startStr || !endStr) return { display: 'none' };
    
    const blockStart = new Date(startStr);
    const blockEnd = new Date(endStr);
    
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    if (blockEnd < monthStart || blockStart > monthEnd) return { display: 'none' };

    const effectiveStart = blockStart < monthStart ? 1 : blockStart.getDate();
    const effectiveEnd = blockEnd > monthEnd ? daysInMonth : blockEnd.getDate();

    const leftPercentage = ((effectiveStart - 1) / daysInMonth) * 100;
    const widthPercentage = ((effectiveEnd - effectiveStart + 1) / daysInMonth) * 100;

    return {
      left: `${leftPercentage}%`,
      width: `${widthPercentage}%`,
      backgroundColor: `${color}15`,
      borderLeftColor: color,
    };
  };

  const getMarkerStyle = (dateStr: string | null, color: string) => {
    if (!dateStr) return { display: 'none' };
    const date = new Date(dateStr);
    if (date.getMonth() !== currentDate.getMonth() || date.getFullYear() !== currentDate.getFullYear()) {
      return { display: 'none' };
    }
    const leftPercentage = ((date.getDate() - 1) / daysInMonth) * 100;
    return {
      left: `${leftPercentage}%`,
      borderColor: color,
      backgroundColor: color
    };
  };

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-white rounded-3xl"></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-0">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarIcon size={20} />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Timeline</h2>
        </div>
        <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-xl shadow-sm hover:shadow text-gray-600 transition-all">
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-sm w-32 text-center text-gray-800">{monthName}</span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-xl shadow-sm hover:shadow text-gray-600 transition-all">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Timeline Header (Days) */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 sticky top-0 z-20">
          <div className="w-48 flex-shrink-0 border-r border-gray-200 p-4 font-black text-xs text-gray-400 uppercase tracking-widest flex items-center bg-white">
            Team / Events
          </div>
          <div className="flex-1 relative flex">
            {daysArray.map(day => (
              <div key={day} className="flex-1 border-r border-gray-200 flex flex-col items-center justify-center py-2 h-12 min-w[20px]">
                <span className="text-[10px] font-bold text-gray-400">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar pb-12">
          
          {/* Row: GLOBAL EVENTS */}
          <div className="flex border-b border-gray-100 group hover:bg-gray-50/30 transition-colors h-20">
            <div className="w-48 flex-shrink-0 border-r border-gray-100 p-4 flex flex-col justify-center bg-white relative z-20 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                <span className="font-bold text-sm text-gray-900">Milestones</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deadlines & Meetings</span>
            </div>
            <div className="flex-1 relative bg-white min-h-[4rem]">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex">
                  {daysArray.map(day => (
                      <div key={day} className="flex-1 border-r border-gray-50 pointer-events-none"></div>
                  ))}
              </div>

              {/* Deadlines */}
              {data.projects.map(p => {
                if (!p.deadline) return null;
                return (
                  <div 
                    key={`dl-${p.id}`} 
                    className="absolute top-2 w-1.5 h-1.5 rounded-full ring-4 ring-offset-1 ring-red-100 shadow-sm group/marker tooltip-trigger flex flex-col items-center"
                    style={getMarkerStyle(p.deadline, '#ef4444')}
                  >
                     <div className="absolute top-4 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg font-bold flex items-center gap-1">
                        <Briefcase size={10} className="text-red-400" />
                        Deadline: {p.name}
                     </div>
                  </div>
                )
              })}

              {/* Meetings */}
              {data.meetings.map(m => {
                return (
                  <div 
                    key={`m-${m.id}`} 
                    className="absolute top-8 w-2 h-2 rounded-sm rotate-45 ring-4 ring-offset-0 ring-purple-50 shadow-sm group/marker tooltip-trigger flex flex-col items-center"
                    style={getMarkerStyle(m.activity_date, '#a855f7')}
                  >
                     <div className="absolute top-4 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg font-bold flex items-center gap-1">
                        <Zap size={10} className="text-purple-400" />
                        Meeting: {m.company_name}
                     </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-100 px-4 py-1 flex items-center text-[9px] font-black uppercase tracking-widest text-gray-400 sticky top-0 z-20 shadow-sm">
             Designers
          </div>

          {/* Rows: DESIGNERS */}
          {designers.map(designer => (
            <div key={`d-${designer.id}`} className="flex border-b border-gray-100 group hover:bg-gray-50/50 transition-colors h-16">
              <div className="w-48 flex-shrink-0 border-r border-gray-100 p-4 flex items-center gap-3 bg-white relative z-20 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-inner" style={{ backgroundColor: designer.color }}>
                      {designer.name.charAt(0)}
                  </div>
                  <span className="font-bold text-sm text-gray-700 truncate">{designer.name}</span>
              </div>
              <div className="flex-1 relative bg-white">
                 <div className="absolute inset-0 flex">
                    {daysArray.map(day => (<div key={day} className="flex-1 border-r border-gray-50 pointer-events-none"></div>))}
                 </div>
                 {/* Blocks */}
                 {data.projects.filter(p => p.designer_id === designer.id && p.design_start && p.design_end).map(p => (
                    <div 
                      key={p.id}
                      className="absolute top-2 bottom-2 border-l-4 rounded-r-md group/block overflow-hidden transition-all hover:brightness-95 hover:shadow-md cursor-pointer flex items-center px-2"
                      style={getBlockStyles(p.design_start, p.design_end, designer.color)}
                    >
                      <span className="text-[10px] font-bold text-gray-800 truncate mix-blend-multiply opacity-70 group-hover/block:opacity-100">{p.name}</span>
                      <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/block:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg font-bold">
                          {p.name} (Design)
                      </div>
                    </div>
                 ))}
              </div>
            </div>
          ))}

          <div className="bg-gray-100 px-4 py-1 flex items-center text-[9px] font-black uppercase tracking-widest text-gray-400 sticky top-0 z-20 shadow-sm mt-4">
             Developers
          </div>

          {/* Rows: DEVELOPERS */}
          {developers.map(dev => (
            <div key={`v-${dev.id}`} className="flex border-b border-gray-100 group hover:bg-gray-50/50 transition-colors h-16">
              <div className="w-48 flex-shrink-0 border-r border-gray-100 p-4 flex items-center gap-3 bg-white relative z-20 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-inner" style={{ backgroundColor: dev.color }}>
                      {dev.name.charAt(0)}
                  </div>
                  <span className="font-bold text-sm text-gray-700 truncate">{dev.name}</span>
              </div>
              <div className="flex-1 relative bg-white">
                 <div className="absolute inset-0 flex">
                    {daysArray.map(day => (<div key={day} className="flex-1 border-r border-gray-50 pointer-events-none"></div>))}
                 </div>
                 {/* Blocks */}
                 {data.projects.filter(p => p.dev_id === dev.id && p.dev_start && p.dev_end).map(p => (
                    <div 
                      key={p.id}
                      className="absolute top-2 bottom-2 border-l-4 rounded-r-md group/block overflow-hidden transition-all hover:brightness-95 hover:shadow-md cursor-pointer flex items-center px-2"
                      style={getBlockStyles(p.dev_start, p.dev_end, dev.color)}
                    >
                      <span className="text-[10px] font-bold text-gray-800 truncate mix-blend-multiply opacity-70 group-hover/block:opacity-100">{p.name}</span>
                      <div className="absolute top-full left-0 mt-1 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover/block:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg font-bold">
                          {p.name} (Dev)
                      </div>
                    </div>
                 ))}
              </div>
            </div>
          ))}

          {designers.length === 0 && developers.length === 0 && (
             <div className="p-12 text-center text-gray-400 font-bold">No team members configured. Add them in Settings.</div>
          )}
        </div>
      </div>
    </div>
  );
};
