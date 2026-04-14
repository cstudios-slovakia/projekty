import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface DashboardData {
  funnel: any[];
  income: any[];
  workload_dev: any[];
  workload_design: any[];
  workload_pm: any[];
  leads?: any[];
}

const FunnelChart: React.FC<{ data: any }> = ({ data }) => {
  const { t } = useTranslation();
  
  const funnelStages = [
    { key: 'leads', color: '#6366f1', label: t('dashboard.funnel.stage_leads') },
    { key: 'sent', color: '#3b82f6', label: t('dashboard.funnel.stage_sent') },
    { key: 'accepted', color: '#10b981', label: t('dashboard.funnel.stage_accepted') },
    { key: 'net', color: '#f59e0b', label: t('dashboard.funnel.stage_net') }
  ].map(stage => ({
    ...stage,
    count: Number(data[stage.key]?.count || 0),
    amount: Number(data[stage.key]?.amount || 0)
  }));

  const maxAmount = Math.max(...funnelStages.map(s => s.amount), 1);
  const totalHeight = 350;
  const stageHeight = totalHeight / funnelStages.length;

  return (
    <div className="w-full flex items-center justify-center py-6 px-4">
      <svg viewBox={`0 0 500 ${totalHeight + 40}`} className="w-full max-w-2xl drop-shadow-2xl overflow-visible">
        <defs>
          {funnelStages.map(stage => (
            <linearGradient key={`grad-${stage.key}`} id={`grad-${stage.key}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stage.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={stage.color} />
            </linearGradient>
          ))}
        </defs>

        {funnelStages.map((stage, i) => {
          const y = i * stageHeight;
          const nextStageAmount = funnelStages[i+1] ? funnelStages[i+1].amount : stage.amount * 0.4;
          
          // Width based on volume (amount)
          const topWidth = Math.max((stage.amount / maxAmount) * 460, 100);
          const bottomWidth = Math.max((nextStageAmount / maxAmount) * 460, 60);

          const x1 = (500 - topWidth) / 2;
          const x2 = (500 + topWidth) / 2;
          const x3 = (500 + bottomWidth) / 2;
          const x4 = (500 - bottomWidth) / 2;

          return (
            <g key={stage.key} className="group transition-all duration-300">
              {/* Trapezoid Base */}
              <polygon 
                points={`${x1},${y} ${x2},${y} ${x3},${y + stageHeight - 4} ${x4},${y + stageHeight - 4}`} 
                fill={`url(#grad-${stage.key})`}
                className="transition-all duration-500 hover:brightness-110 cursor-pointer outline-none"
              />
              
              {/* Stage label (Top small text) */}
              <text 
                x={250} y={y + 20} 
                textAnchor="middle" 
                fill={i >= 3 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)"} 
                className="text-[11px] font-black uppercase tracking-[0.2em] select-none pointer-events-none"
              >
                {stage.label}
              </text>

              {/* Count Text (Center-Top) */}
              <text 
                x={250} y={y + stageHeight / 2 + 5} 
                textAnchor="middle" 
                fill={i >= 3 ? "#000" : "#fff"} 
                className="text-[32px] font-black select-none pointer-events-none drop-shadow-lg"
              >
                {stage.count}
              </text>

              {/* Stage Amount (Center-Middle) */}
              <text 
                x={250} y={y + stageHeight / 2 + 30} 
                textAnchor="middle" 
                fill={i >= 3 ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,1)"} 
                className="text-[16px] font-black select-none pointer-events-none tracking-tight drop-shadow-sm"
              >
                €{Math.round(stage.amount).toLocaleString()}
              </text>

              {/* Side label (visible on hover) */}
              <text 
                x={x1 - 15} y={y + stageHeight / 2} 
                textAnchor="end" 
                fill="#374151" 
                className="text-[12px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
              >
                {stage.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const DashboardKPIs: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [workloadTab, setWorkloadTab] = useState<'dev' | 'design' | 'pm'>('dev');
  const [useComplexity, setUseComplexity] = useState(false);

  const fetchData = () => {
    fetch('/api/dashboard.php')
      .then(r => r.json())
      .then(res => {
        if(res.status === 'success') setData(res.data);
      });
  };

  useEffect(() => {
    fetchData();
    
    // Listen for updates from other components
    const handleUpdate = () => fetchData();
    window.addEventListener('projectsUpdated', handleUpdate);
    return () => window.removeEventListener('projectsUpdated', handleUpdate);
  }, []);

  if (!data) return <div className="h-48 flex items-center justify-center text-gray-400 font-mono text-xs animate-pulse">{t('common.loading')}</div>;

  // 1. Workload Bar Chart (Tabbed & Stacked & Weighted)
  const currentWorkload = workloadTab === 'dev' ? data.workload_dev : (workloadTab === 'design' ? data.workload_design : data.workload_pm);
  
  const getActiveVal = (d: any) => useComplexity ? Number(d.active_complexity) : Number(d.active_count);
  const getTotalVal = (d: any) => useComplexity ? Number(d.total_complexity) : Number(d.total_count);

  const workloadChartData = {
    labels: currentWorkload.map((d: any) => d.name),
    datasets: [
      {
        label: t('common.active') || 'Active',
        data: currentWorkload.map((d: any) => getActiveVal(d)),
        backgroundColor: currentWorkload.map((d: any) => d.color || (workloadTab === 'dev' ? '#3b82f6' : (workloadTab === 'design' ? '#a855f7' : '#ec4899'))),
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 8, bottomRight: 8 },
      },
      {
        label: t('common.assigned') || 'Assigned',
        data: currentWorkload.map((d: any) => getTotalVal(d) - getActiveVal(d)),
        backgroundColor: currentWorkload.map((d: any) => (d.color || (workloadTab === 'dev' ? '#3b82f6' : (workloadTab === 'design' ? '#a855f7' : '#ec4899'))) + '33'),
        borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#000',
        bodyColor: '#666',
        borderColor: '#eee',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
      }
    },
    scales: {
      y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  const workloadOptions = {
    ...chartOptions,
    scales: {
      x: { stacked: true, ...chartOptions.scales.x },
      y: { stacked: true, ...chartOptions.scales.y }
    }
  };

  // 2. Estimated Income Line Chart
  const incomeChartData = {
    labels: data.income.map(i => i.month),
    datasets: [{
      label: t('dashboard.income.label') || 'Expected Income (€)',
      data: data.income.map(i => i.expected_income),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
    }]
  };

  return (
    <div className="space-y-6 mb-12 animate-fade-in px-1 md:px-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('dashboard.title')}</h2>
          <p className="text-gray-500 text-sm">{t('dashboard.subtitle')}</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 p-1.5 px-4 bg-white hover:bg-gray-50 text-gray-400 hover:text-[var(--color-primary)] rounded-xl border border-gray-100 shadow-sm transition-all text-xs font-bold active:scale-95"
        >
          <RefreshCw size={14} className={!data ? 'animate-spin' : ''} />
          {t('common.refresh')}
        </button>
      </div>
      {/* KPI Cards Row REMOVED as requested */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Project Funnel */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{t('dashboard.funnel.title')}</h3>
          <p className="text-[10px] text-gray-400 mb-6 md:mb-8 uppercase tracking-[0.2em] font-black">{t('dashboard.funnel.subtitle')}</p>
          
          <div className="flex-1 flex flex-col justify-center overflow-x-hidden">
            <FunnelChart data={data.funnel} />
          </div>
        </div>

        {/* Workload Analysis */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{t('dashboard.workload.title')}</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">{t('dashboard.workload.subtitle')}</p>
            </div>
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
              <button 
                onClick={() => setWorkloadTab('dev')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${workloadTab === 'dev' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                DEV
              </button>
              <button 
                onClick={() => setWorkloadTab('design')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${workloadTab === 'design' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                DESIGN
              </button>
              <button 
                onClick={() => setWorkloadTab('pm')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${workloadTab === 'pm' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                PM
              </button>
            </div>
          </div>
          <div className="flex-1">
            <Bar data={workloadChartData} options={workloadOptions} />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('dashboard.workload.complexity')}</span>
            <button 
              onClick={() => setUseComplexity(!useComplexity)}
              className={`w-12 h-6 rounded-full transition-all relative ${useComplexity ? 'bg-[#e78b01]' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useComplexity ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Income Stream */}
        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{t('dashboard.income.title')}</h3>
          <p className="text-[10px] text-gray-400 mb-8 uppercase tracking-[0.2em] font-black">{t('dashboard.income.subtitle')}</p>
          <div className="flex-1">
            <Line data={incomeChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
