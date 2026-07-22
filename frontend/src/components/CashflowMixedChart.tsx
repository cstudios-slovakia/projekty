import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CashflowDataPoint {
  period: string;
  invoice_income?: number;
  future_project_income?: number;
  expected_income: number;
  projected_expenses: number;
  net_cashflow: number;
  income_items?: Array<{ title: string; amount: number; type: string }>;
  expense_items?: Array<{ title: string; amount: number; type: string }>;
}

interface CashflowMixedChartProps {
  data: CashflowDataPoint[];
  height?: number;
  onBarClick?: (clickInfo: { period: string; type: 'income' | 'expense'; weekData: CashflowDataPoint }) => void;
}

export function CashflowMixedChart({ data, height = 300, onBarClick }: CashflowMixedChartProps) {
  const labels = data.map(d => d.period);
  const incomeValues = data.map(d => d.expected_income);
  const expenseValues = data.map(d => d.projected_expenses);
  const netValues = data.map(d => d.net_cashflow);

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Income (€)',
        data: incomeValues,
        backgroundColor: '#10b981',
        borderRadius: 8,
        barPercentage: 0.5,
        categoryPercentage: 0.6,
        order: 2
      },
      {
        type: 'bar' as const,
        label: 'Expenses (€)',
        data: expenseValues,
        backgroundColor: '#f43f5e',
        borderRadius: 8,
        barPercentage: 0.5,
        categoryPercentage: 0.6,
        order: 2
      },
      {
        type: 'line' as const,
        label: 'Net Cashflow (€)',
        data: netValues,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        borderWidth: 3,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.35,
        fill: true,
        order: 1
      }
    ]
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (!elements || elements.length === 0 || !onBarClick) return;
      const el = elements[0];
      const datasetIndex = el.datasetIndex; // 0 = Income, 1 = Expenses, 2 = Net Cashflow Line
      if (datasetIndex > 1) return;

      const index = el.index;
      const weekData = data[index];
      if (!weekData) return;

      const type = datasetIndex === 0 ? 'income' : 'expense';
      onBarClick({
        period: weekData.period,
        type,
        weekData
      });
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          font: {
            family: 'Inter, sans-serif',
            weight: 'bold',
            size: 11
          },
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Inter', weight: 'bold', size: 12 },
        bodyFont: { family: 'Inter', size: 11 },
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            return ` ${context.dataset.label}: €${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', weight: 'bold', size: 11 }, color: '#64748b' }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#64748b',
          callback: (value: any) => `€${Number(value).toLocaleString()}`
        }
      }
    }
  };

  return (
    <div style={{ height }} className="w-full cursor-pointer">
      <Chart type="bar" data={chartData} options={options} />
    </div>
  );
}
