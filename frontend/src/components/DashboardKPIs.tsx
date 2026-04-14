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

const FunnelChart: React.FC<{ data: any[] }> = ({ data }) => {
  // Sort data into logical pipeline order
  const { t } = useTranslation();
  const order = ['New Lead', 'Price Offer Sent', 'Price Offer Accepted'];
  const funnelData = order.map(status => {
    const item = data.find(d => d.status === status);
    const labelKey = status.toLowerCase().replace(/ /g, '_');
    return { 
      label: status, 
      displayLabel: t(`leads.status_${labelKey}`) || status,
      value: item ? Number(item.count) : 0,
      amount: item ? Number(item.total_value) : 0,
      total_sum: item ? Number(item.total_sum) : 0
    };
  });

  // Calculate widths: top is 100%, others are proportional to the first
  const maxAmount = Math.max(...funnelData.map(d => d.total_sum), 1);
  
  return (
    <div className="flex flex-col items-center w-full py-4">
      <div className="w-full flex">
        {/* Labels Column */}
        <div className="w-40 flex flex-col justify-between py-2 text-[12px] font-black text-gray-800 uppercase tracking-tighter">
          {funnelData.map(d => (
            <div key={d.label} className="h-10 flex flex-col justify-center">
              <div className="leading-tight">{d.displayLabel}</div>
              <div className="text-[#e28c00] text-[11px] font-black">€{Math.round(d.label === 'Price Offer Accepted' ? d.total_sum : d.amount).toLocaleString()}</div>
              {d.label === 'Price Offer Accepted' && (
                <div className="text-blue-500 text-[10px] font-bold">NET: €{Math.round(d.amount).toLocaleString()}</div>
              )}
            </div>
          ))}
        </div>
        
        {/* SVG Funnel Column */}
        <div className="flex-1 px-4">
          <svg viewBox="0 0 400 200" className="w-full h-full drop-shadow-2xl overflow-visible">
            {funnelData.map((d, i) => {
              const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899'];
              const height = 180 / funnelData.length;
              const y = i * height;
              
              // Trapezoid calculation with min-width for zero values, scaling by TOTAL AMOUNT per stage
              const topVal = i === 0 ? d.total_sum : funnelData[i-1].total_sum;
              const topWidth = Math.max((topVal / maxAmount) * 380, 40);
              const bottomWidth = Math.max((d.total_sum / maxAmount) * 380, 40);
              
              const x1 = (400 - topWidth) / 2;
              const x2 = x1 + topWidth;
              const x3 = (400 - bottomWidth) / 2;
              const x4 = x3 + bottomWidth;

              return (
                <g key={d.label}>
                  <polygon 
                    points={`${x1},${y} ${x2},${y} ${x4},${y + height - 2} ${x3},${y + height - 2}`} 
                    fill={colors[i % colors.length]}
                    fillOpacity={d.value === 0 ? 0.2 : 1}
                    className="transition-all duration-700 hover:brightness-110 cursor-pointer"
                  />
                  <text 
                    x="200" y={y + height/2 - 2} 
                    textAnchor="middle" 
                    fill="white" 
                    className="text-[20px] font-black pointer-events-none drop-shadow-md"
                    style={{ opacity: d.value === 0 ? 0.3 : 1 }}
                  >
                    {d.value}
                  </text>
                  {d.value > 0 && (
                    <g className="pointer-events-none">
                      <text 
                        x="200" y={y + height/2 + 14} 
                        textAnchor="middle" 
                        fill="rgba(255,255,255,0.9)" 
                        className="text-[12px] font-black"
                      >
                        €{Math.round(d.label === 'Price Offer Accepted' ? d.total_sum : d.amount).toLocaleString()}
                      </text>
                      {d.label === 'Price Offer Accepted' && (
                        <text 
                          x="200" y={y + height/2 + 26} 
                          textAnchor="middle" 
                          fill="rgba(255,255,255,0.7)" 
                          className="text-[10px] font-bold"
                        >
                          Net: €{Math.round(d.amount).toLocaleString()}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
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
