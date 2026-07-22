import React, { useState, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { AlertTriangle, TrendingUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BudgetBurndownChartProps {
  budget: number;
  devBudget: number;
  startDate?: string;
  softDeadline?: string;
  hardDeadline?: string;
  deadline?: string;
  manualExpenses: any[];
  timeLogs: any[];
  invoices?: any[];
  developers: any[];
  height?: number;
}

const normalizeDateStr = (str?: string): string => {
  if (!str) return '';
  return str.trim().split(' ')[0].split('T')[0];
};

const deadlineLinesPlugin = {
  id: 'deadlineLines',
  beforeDraw: (chart: any) => {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.x) return;

    const options = chart.options.deadlines;
    if (!options) return;

    const { startDate, today, softDeadline, hardDeadline } = options;
    const labels = chart.data.labels || [];

    const markers: { dateStr: string; color: string; label: string }[] = [];
    if (startDate) markers.push({ dateStr: startDate, color: '#10b981', label: 'Start' });
    if (today) markers.push({ dateStr: today, color: '#0284c7', label: 'Today' });
    if (softDeadline) markers.push({ dateStr: softDeadline, color: '#f59e0b', label: 'SDL' });
    if (hardDeadline) markers.push({ dateStr: hardDeadline, color: '#ef4444', label: 'HDL' });

    // Sort markers chronologically by date
    markers.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

    let lastX = -999;
    let yLevel = 0;

    markers.forEach(m => {
      const index = labels.indexOf(m.dateStr);
      if (index === -1) return;

      const x = scales.x.getPixelForValue(index);
      if (Math.abs(x - lastX) < 40) {
        yLevel++;
      } else {
        yLevel = 0;
      }
      lastX = x;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = m.color;
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();

      ctx.fillStyle = m.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const labelY = chartArea.bottom - 4 - (yLevel * 13);
      ctx.fillText(m.label, x, labelY);
      ctx.restore();
    });
  }
};

export const BudgetBurndownChart: React.FC<BudgetBurndownChartProps> = ({
  budget,
  devBudget,
  startDate,
  softDeadline,
  hardDeadline,
  deadline,
  manualExpenses = [],
  timeLogs = [],
  invoices = [],
  developers = [],
  height = 200
}) => {
  const [showInvoices, setShowInvoices] = useState(false);

  const chartData = useMemo(() => {
    const totalBudget = parseFloat(String(budget || 0));
    const dBudget = parseFloat(String(devBudget || 0));
    const dangerThreshold = Math.max(0, totalBudget - dBudget);

    const hDeadline = normalizeDateStr(hardDeadline || deadline);
    const sDeadline = normalizeDateStr(softDeadline);
    const sDate = normalizeDateStr(startDate);
    const todayStr = new Date().toISOString().split('T')[0];

    const events: { date: string; cost: number }[] = [];

    // Add manual expenses
    (manualExpenses || []).forEach(me => {
      if (me.expense_date && parseFloat(me.cost || 0) > 0) {
        events.push({
          date: normalizeDateStr(me.expense_date),
          cost: parseFloat(me.cost || 0)
        });
      }
    });

    // Add time log expenses
    (timeLogs || []).forEach(tl => {
      if (tl.log_date && parseFloat(tl.hours || 0) > 0) {
        const dev = (developers || []).find(d => d.id === tl.user_id || d.id === tl.member_id);
        const rate = parseFloat(dev?.hourly_rate || 0);
        const cost = parseFloat(tl.hours || 0) * rate;
        events.push({
          date: normalizeDateStr(tl.log_date),
          cost
        });
      }
    });

    // Sort events by date ASC
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const firstDateStr = sDate || (events.length > 0 ? events[0].date : todayStr);
    const lastDateStr = hDeadline || (events.length > 0 ? events[events.length - 1].date : todayStr);

    // Collect all key timestamps to determine project timeline duration
    const allKeyDateStrs = [firstDateStr, sDate, todayStr, sDeadline, hDeadline, lastDateStr].filter(Boolean);
    events.forEach(ev => { if (ev.date) allKeyDateStrs.push(ev.date); });
    (invoices || []).forEach(inv => {
      const idate = normalizeDateStr(inv.issued_date);
      const pdate = normalizeDateStr(inv.paid_date);
      if (idate) allKeyDateStrs.push(idate);
      if (pdate) allKeyDateStrs.push(pdate);
    });

    const timestamps = allKeyDateStrs.map(d => new Date(d).getTime()).filter(t => !isNaN(t));
    const minTime = timestamps.length > 0 ? Math.min(...timestamps) : new Date().getTime();
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : minTime;
    const spanDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24));

    const dateMap: Record<string, number> = {};

    // Resolution rule: Daily if <= 60 days, Weekly if >= 61 days
    const stepMs = spanDays <= 60 ? (1000 * 60 * 60 * 24) : (7 * 1000 * 60 * 60 * 24);
    for (let t = minTime; t <= maxTime; t += stepMs) {
      const dStr = new Date(t).toISOString().split('T')[0];
      dateMap[dStr] = 0;
    }

    // Always include exact key marker dates
    if (sDate) dateMap[sDate] = (dateMap[sDate] || 0);
    if (todayStr) dateMap[todayStr] = (dateMap[todayStr] || 0);
    if (sDeadline) dateMap[sDeadline] = (dateMap[sDeadline] || 0);
    if (hDeadline) dateMap[hDeadline] = (dateMap[hDeadline] || 0);

    events.forEach(ev => {
      if (ev.date) {
        dateMap[ev.date] = (dateMap[ev.date] || 0) + ev.cost;
      }
    });

    (invoices || []).forEach(inv => {
      const idate = normalizeDateStr(inv.issued_date);
      const pdate = normalizeDateStr(inv.paid_date);
      if (idate) dateMap[idate] = (dateMap[idate] || 0);
      if (pdate) dateMap[pdate] = (dateMap[pdate] || 0);
    });

    const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let cumCost = 0;
    const labels: string[] = [];
    const remainingData: number[] = [];
    const dangerThresholdLine: number[] = [];
    const allInvoicesLine: number[] = [];
    const issuedInvoicesLine: number[] = [];
    const paidInvoicesFilled: number[] = [];

    sortedDates.forEach(d => {
      cumCost += dateMap[d];
      const remaining = totalBudget - cumCost;
      labels.push(d);
      remainingData.push(remaining);
      dangerThresholdLine.push(dangerThreshold);

      let cumAll = 0;
      let cumIssued = 0;
      let cumPaid = 0;

      (invoices || []).forEach(inv => {
        const amt = parseFloat(inv.amount || 0);
        const idate = normalizeDateStr(inv.issued_date);
        const pdate = normalizeDateStr(inv.paid_date);

        // All invoices (not_issued, issued, paid) up to date d
        if (idate && idate <= d) {
          cumAll += amt;
        }

        // Issued or Paid invoices up to date d
        if ((inv.status === 'issued' || inv.status === 'paid') && idate && idate <= d) {
          cumIssued += amt;
        }

        // Paid invoices up to date d
        if (inv.status === 'paid' && pdate && pdate <= d) {
          cumPaid += amt;
        }
      });

      allInvoicesLine.push(cumAll);
      issuedInvoicesLine.push(cumIssued);
      paidInvoicesFilled.push(cumPaid);
    });

    const currentRemaining = totalBudget - cumCost;
    const isOvershot = dBudget > 0 && currentRemaining < dangerThreshold;

    return {
      totalBudget,
      dangerThreshold,
      isOvershot,
      labels,
      remainingData,
      dangerThresholdLine,
      allInvoicesLine,
      issuedInvoicesLine,
      paidInvoicesFilled,
      hDeadline,
      sDeadline,
      sDate,
      todayStr
    };
  }, [budget, devBudget, startDate, softDeadline, hardDeadline, deadline, manualExpenses, timeLogs, invoices, developers]);

  const datasets: any[] = [
    {
      label: 'Remaining Budget (€)',
      data: chartData.remainingData,
      borderColor: chartData.isOvershot ? '#ef4444' : '#10b981',
      backgroundColor: chartData.isOvershot ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
      fill: true,
      tension: 0.3,
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointBackgroundColor: chartData.isOvershot ? '#ef4444' : '#10b981'
    },
    {
      label: 'Danger Limit',
      data: chartData.dangerThresholdLine,
      borderColor: '#f59e0b',
      borderDash: [6, 6],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false
    }
  ];

  if (showInvoices) {
    // 1. Total/Planned Invoices (Issued or Not Issued) - Solid Purple Line
    datasets.push({
      label: 'All Invoices (Issued & Planned €)',
      data: chartData.allInvoicesLine,
      borderColor: '#8b5cf6',
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointBackgroundColor: '#8b5cf6',
      fill: false
    });

    // 2. Issued Invoices Only - Dashed Blue Line
    datasets.push({
      label: 'Issued Invoices (€)',
      data: chartData.issuedInvoicesLine,
      borderColor: '#3b82f6',
      borderDash: [6, 6],
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointBackgroundColor: '#3b82f6',
      fill: false
    });

    // 3. Paid Invoices Only - Soft Cyan Fill Area Only (No Line!)
    datasets.push({
      label: 'Paid Invoices (€)',
      data: chartData.paidInvoicesFilled,
      borderColor: 'transparent',
      borderWidth: 0,
      backgroundColor: 'rgba(6, 182, 212, 0.22)',
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointBackgroundColor: '#06b6d4',
      fill: 'origin'
    });
  }

  const data = {
    labels: chartData.labels,
    datasets
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    layout: {
      padding: {
        top: 20,
        bottom: 5
      }
    },
    deadlines: {
      startDate: chartData.sDate,
      today: chartData.todayStr,
      softDeadline: chartData.sDeadline,
      hardDeadline: chartData.hDeadline
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: { size: 10, weight: 'bold' },
          usePointStyle: true
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        padding: 10,
        cornerRadius: 12,
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 11, weight: 'bold' },
        callbacks: {
          title: (items: any[]) => {
            if (!items || items.length === 0) return '';
            return `Date: ${items[0].label}`;
          },
          label: (context: any) => {
            const val = parseFloat(context.raw || 0);
            return ` ${context.dataset.label}: €${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10, weight: 'bold' },
          maxRotation: 0,
          minRotation: 0,
          callback: function(_val: any, index: number, ticks: any[]) {
            if (index === 0 || index === ticks.length - 1) {
              return chartData.labels[index] || '';
            }
            return '';
          }
        }
      },
      y: {
        min: 0,
        suggestedMax: chartData.totalBudget * 1.05,
        ticks: {
          font: { size: 9 },
          callback: (value: any) => `€${Number(value).toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="w-full space-y-2 bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
      {/* Top Controls: Single "Show Invoices" toggle */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-gray-200/60">
        <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Budget Burndown</span>

        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 bg-white px-3 py-1 rounded-xl border border-gray-200 shadow-sm hover:border-purple-300 transition-all select-none">
          <input
            type="checkbox"
            checked={showInvoices}
            onChange={(e) => setShowInvoices(e.target.checked)}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer"
          />
          <span className={showInvoices ? "text-purple-700 font-extrabold flex items-center gap-1" : "text-gray-600 flex items-center gap-1"}>
            <TrendingUp size={13} />
            Show Invoices
          </span>
        </label>
      </div>

      {chartData.isOvershot && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <span>Development Budget Overshot! Remaining budget dropped below danger line (€{chartData.dangerThreshold.toLocaleString()}).</span>
        </div>
      )}

      <div style={{ height: `${height}px` }} className="w-full">
        <Line data={data} options={options} plugins={[deadlineLinesPlugin]} />
      </div>
    </div>
  );
};
