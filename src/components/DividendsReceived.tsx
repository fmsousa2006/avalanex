import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AddDividendModal from './AddDividendModal';

const isSupabaseEnvConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return url &&
         key &&
         url !== 'https://your-project-ref.supabase.co' &&
         url !== 'https://placeholder.supabase.co' &&
         key !== 'your-anon-key-here' &&
         key !== 'placeholder-anon-key';
};

interface MonthlyData {
  year: number;
  month: number;
  amount: number;
}

interface DividendsReceivedProps {
  portfolioId?: string;
}

const DividendsReceived: React.FC<DividendsReceivedProps> = ({ portfolioId }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<{ month: number; x: number; y: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const yearColors = [
    { bg: '#f97316', label: 'bg-orange-500' },
    { bg: '#3b82f6', label: 'bg-blue-500' },
    { bg: '#8b5cf6', label: 'bg-violet-500' }
  ];

  const fetchDividendData = async () => {
    const supabaseConfigured = isSupabaseEnvConfigured();

    if (!supabaseConfigured || !portfolioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: dividendPayments, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('type', 'dividend')
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      if (!dividendPayments || dividendPayments.length === 0) {
        setMonthlyData([]);
        setLoading(false);
        return;
      }

      const monthlyMap: { [key: string]: number } = {};

      dividendPayments.forEach(payment => {
        const date = new Date(payment.transaction_date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;

        if (!monthlyMap[key]) {
          monthlyMap[key] = 0;
        }
        monthlyMap[key] += parseFloat(payment.amount.toString());
      });

      const dataArray: MonthlyData[] = Object.entries(monthlyMap).map(([key, amount]) => {
        const [year, month] = key.split('-').map(Number);
        return { year, month, amount };
      });

      setMonthlyData(dataArray);
    } catch (err) {
      console.error('Error fetching dividend data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDividendData();
  }, [portfolioId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Dividends Received</h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            title="Add Dividend"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  if (monthlyData.length === 0) {
    return (
      <>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold">Dividends Received</h2>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              title="Add Dividend"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-medium text-lg">No dividend payments yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Click the + button to record your first dividend payment
              </p>
            </div>
          </div>
        </div>
        {showAddModal && portfolioId && (
          <AddDividendModal
            portfolioId={portfolioId}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              fetchDividendData();
            }}
          />
        )}
      </>
    );
  }

  const uniqueYears = [...new Set(monthlyData.map(d => d.year))].sort().slice(-3);
  const maxAmount = Math.max(...monthlyData.map(d => d.amount));

  const getDataForMonth = (month: number) => {
    return uniqueYears.map(year => {
      const data = monthlyData.find(d => d.year === year && d.month === month);
      return data ? data.amount : 0;
    });
  };

  const totalAllTime = monthlyData.reduce((sum, d) => sum + d.amount, 0);
  const currentYear = new Date().getFullYear();
  const currentYearTotal = monthlyData
    .filter(d => d.year === currentYear)
    .reduce((sum, d) => sum + d.amount, 0);

  const yAxisSteps = 5;
  const yAxisMax = Math.ceil(maxAmount / 10) * 10;
  const chartHeight = 300;
  const chartTop = 20;
  const chartBottom = 60;
  const usableHeight = chartHeight - chartTop - chartBottom;

  return (
    <>
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Dividends Received</h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            title="Add Dividend"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-750 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total All Time</p>
          <p className="text-2xl font-bold text-emerald-400">${totalAllTime.toFixed(2)}</p>
        </div>
        <div className="bg-gray-750 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">This Year ({currentYear})</p>
          <p className="text-2xl font-bold">${currentYearTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="relative bg-gray-850 rounded-lg p-6" ref={chartRef}>
        <div className="relative" style={{ height: `${chartHeight}px` }}>
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <pattern id="grid" width="100%" height={usableHeight / yAxisSteps} patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="100%" y2="0" stroke="#374151" strokeWidth="1" opacity="0.3" strokeDasharray="4,4" />
              </pattern>
            </defs>

            <g transform={`translate(0, ${chartTop})`}>
              <rect width="100%" height={usableHeight} fill="url(#grid)" />

              {Array.from({ length: yAxisSteps + 1 }).map((_, i) => {
                const value = (yAxisMax / yAxisSteps) * (yAxisSteps - i);
                const y = (usableHeight / yAxisSteps) * i;
                return (
                  <text
                    key={i}
                    x="0"
                    y={y}
                    className="fill-gray-500 text-xs"
                    dominantBaseline="middle"
                  >
                    {value}
                  </text>
                );
              })}
            </g>
          </svg>

          <div className="absolute inset-0 flex" style={{ paddingTop: `${chartTop}px`, paddingBottom: `${chartBottom}px`, paddingLeft: '40px' }}>
            {monthNames.map((monthName, monthIndex) => {
              const values = getDataForMonth(monthIndex);
              const hasData = values.some(v => v > 0);

              return (
                <div
                  key={monthIndex}
                  className="flex-1 flex flex-col justify-end items-center relative"
                  onMouseEnter={(e) => {
                    if (hasData && chartRef.current) {
                      const chartRect = chartRef.current.getBoundingClientRect();
                      const columnRect = e.currentTarget.getBoundingClientRect();

                      const barsContainer = e.currentTarget.querySelector('.w-full.flex') as HTMLElement;
                      const topBarPosition = barsContainer?.getBoundingClientRect().top || columnRect.top;

                      setHoveredBar({
                        month: monthIndex,
                        x: columnRect.left + columnRect.width / 2 - chartRect.left,
                        y: topBarPosition - chartRect.top
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div className="w-full flex justify-center items-end space-x-1 px-1" style={{ height: '100%' }}>
                    {hasData ? (
                      values.map((value, yearIndex) => {
                        const heightPercent = (value / yAxisMax) * 100;
                        const year = uniqueYears[yearIndex];
                        const color = yearColors[yearIndex % yearColors.length];

                        return value > 0 ? (
                          <div
                            key={yearIndex}
                            className="relative cursor-pointer transition-all duration-200"
                            style={{
                              width: `${Math.max(8, 100 / (uniqueYears.length * 1.5))}%`,
                              height: `${heightPercent}%`,
                              backgroundColor: color.bg,
                              borderRadius: '2px 2px 0 0',
                              minHeight: value > 0 ? '2px' : '0',
                              opacity: hoveredBar?.month === monthIndex ? 0.7 : 1
                            }}
                          />
                        ) : null;
                      })
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{monthName}</div>
                </div>
              );
            })}
          </div>
        </div>

        {hoveredBar && (() => {
          const monthData = uniqueYears.map(year => {
            const data = monthlyData.find(d => d.year === year && d.month === hoveredBar.month);
            return { year, amount: data?.amount || 0 };
          }).filter(d => d.amount > 0);

          if (monthData.length === 0) return null;

          return (
            <div
              className="absolute bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700 z-50 pointer-events-none"
              style={{
                left: `${hoveredBar.x}px`,
                top: `${hoveredBar.y - 10}px`,
                transform: 'translate(-50%, -100%)',
                minWidth: '160px'
              }}
            >
              <div className="text-sm font-semibold mb-3 pb-2 border-b border-gray-700">
                {monthNames[hoveredBar.month]}
              </div>
              <div className="space-y-2">
                {monthData.map((item, index) => {
                  const color = yearColors[uniqueYears.indexOf(item.year) % yearColors.length];
                  return (
                    <div key={item.year} className="flex items-center justify-between space-x-4">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color.bg }}
                        />
                        <span className="text-sm text-gray-300">{item.year}:</span>
                      </div>
                      <span className="text-sm font-bold">${item.amount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="flex justify-center items-center space-x-6 mt-6 pt-4 border-t border-gray-700">
          {uniqueYears.map((year, index) => {
            const color = yearColors[index % yearColors.length];
            return (
              <div key={year} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: color.bg }}
                />
                <span className="text-sm text-gray-400">{year}</span>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {showAddModal && portfolioId && (
        <AddDividendModal
          portfolioId={portfolioId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchDividendData();
          }}
        />
      )}
    </>
  );
};

export default DividendsReceived;
