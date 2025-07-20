import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Calendar, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DividendPayment {
  year: number;
  amount: number;
  count: number;
  stocks: Array<{
    symbol: string;
    amount: number;
    payments: number;
  }>;
}

interface DividendsReceivedProps {
  portfolioId?: string;
}

const DividendsReceived: React.FC<DividendsReceivedProps> = ({ portfolioId }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: DividendPayment } | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 600, height: 300 });
  const [dividendData, setDividendData] = useState<DividendPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Update chart dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const containerWidth = chartRef.current.offsetWidth;
        const containerHeight = Math.max(250, containerWidth * 0.4);
        setChartDimensions({
          width: Math.max(400, containerWidth - 40),
          height: Math.min(containerHeight, 350)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fetch dividend data from Supabase
  const fetchDividendData = async () => {
    if (!portfolioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get all dividend transactions for this portfolio
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          *,
          stock:stocks(symbol, name)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('type', 'dividend')
        .eq('status', 'completed')
        .order('transaction_date', { ascending: true });

      if (transactionError) {
        throw transactionError;
      }

      if (!transactions || transactions.length === 0) {
        setDividendData([]);
        setLoading(false);
        return;
      }

      // Group transactions by year
      const yearlyData: { [year: number]: DividendPayment } = {};

      transactions.forEach(transaction => {
        const year = new Date(transaction.transaction_date).getFullYear();
        const symbol = transaction.stock?.symbol || 'Unknown';
        const amount = transaction.amount;

        if (!yearlyData[year]) {
          yearlyData[year] = {
            year,
            amount: 0,
            count: 0,
            stocks: []
          };
        }

        yearlyData[year].amount += amount;
        yearlyData[year].count += 1;

        // Find or create stock entry for this year
        const existingStock = yearlyData[year].stocks.find(s => s.symbol === symbol);
        if (existingStock) {
          existingStock.amount += amount;
          existingStock.payments += 1;
        } else {
          yearlyData[year].stocks.push({
            symbol,
            amount,
            payments: 1
          });
        }
      });

      // Convert to array and sort by year
      const sortedData = Object.values(yearlyData).sort((a, b) => a.year - b.year);
      setDividendData(sortedData);
    } catch (err) {
      console.error('Error fetching dividend data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dividend data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when portfolioId changes
  useEffect(() => {
    fetchDividendData();
  }, [portfolioId]);

  // Show loading state
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-6">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold">Dividends Received</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          <span className="ml-3 text-gray-400">Loading dividend data...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-6">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold">Dividends Received</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Database className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-medium">Error loading dividend data</p>
            <p className="text-gray-400 text-sm mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show no data state
  if (dividendData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-6">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold">Dividends Received</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium text-lg">No dividend data available</p>
            <p className="text-gray-500 text-sm mt-2">
              Dividend payments will appear here once you receive them from your stock holdings.
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Add dividend transactions to see your dividend history.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const maxAmount = Math.max(...dividendData.map(d => d.amount));
  
  const chartWidth = chartDimensions.width;
  const chartHeight = chartDimensions.height;
  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartAreaWidth = chartWidth - padding.left - padding.right;
  const chartAreaHeight = chartHeight - padding.top - padding.bottom;

  const handleBarHover = (event: React.MouseEvent, yearData: DividendPayment) => {
    if (!chartRef.current) return;
    
    const containerRect = chartRef.current.getBoundingClientRect();
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    
    setTooltip({
      x: mouseX,
      y: mouseY,
      data: yearData
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const totalDividends = dividendData.reduce((sum, year) => sum + year.amount, 0);
  const totalPayments = dividendData.reduce((sum, year) => sum + year.count, 0);
  const currentYearDividends = dividendData.find(d => d.year === new Date().getFullYear())?.amount || 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center space-x-2 mb-6">
        <DollarSign className="w-5 h-5 text-green-400" />
        <h2 className="text-xl font-semibold">Dividends Received</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-750 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total All Time</p>
          <p className="text-2xl font-bold text-green-400">${totalDividends.toLocaleString()}</p>
        </div>
        <div className="bg-gray-750 rounded-lg p-4">
          <p className="text-gray-400 text-sm">This Year</p>
          <p className="text-2xl font-bold">${currentYearDividends.toLocaleString()}</p>
        </div>
        <div className="bg-gray-750 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Payments</p>
          <p className="text-2xl font-bold">{totalPayments}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="relative" ref={chartRef}>
        <svg 
          width={chartWidth} 
          height={chartHeight} 
          className="w-full h-auto"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Chart background */}
          <rect 
            x={padding.left} 
            y={padding.top} 
            width={chartAreaWidth} 
            height={chartAreaHeight} 
            fill="transparent" 
            stroke="#374151" 
            strokeWidth="1"
            opacity="0.3"
          />

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + chartAreaHeight * ratio}
              x2={padding.left + chartAreaWidth}
              y2={padding.top + chartAreaHeight * ratio}
              stroke="#374151"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ))}

          {/* Bars */}
          {dividendData.map((yearData, index) => {
            const barWidth = chartAreaWidth / dividendData.length * 0.7;
            const barX = padding.left + (index + 0.15) * (chartAreaWidth / dividendData.length);
            const barHeight = (yearData.amount / maxAmount) * chartAreaHeight;
            const barY = padding.top + chartAreaHeight - barHeight;

            return (
              <rect
                key={yearData.year}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill="#10b981"
                className="cursor-pointer hover:fill-emerald-400 transition-colors"
                onMouseMove={(e) => handleBarHover(e, yearData)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Year labels */}
          {dividendData.map((yearData, index) => {
            const labelX = padding.left + (index + 0.5) * (chartAreaWidth / dividendData.length);
            return (
              <text
                key={`label-${yearData.year}`}
                x={labelX}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                className="fill-gray-400 text-sm"
              >
                {yearData.year}
              </text>
            );
          })}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <text
              key={`y-${ratio}`}
              x={padding.left - 10}
              y={padding.top + chartAreaHeight * (1 - ratio) + 5}
              textAnchor="end"
              className="fill-gray-400 text-xs"
            >
              ${(maxAmount * ratio).toLocaleString()}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute bg-gray-700 text-white p-4 rounded-lg shadow-lg border border-gray-600 z-10 pointer-events-none min-w-48"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 10,
              transform: tooltip.x > chartWidth - 200 ? 'translateX(-100%)' : 'none'
            }}
          >
            <div className="text-sm font-semibold mb-2">{tooltip.data.year} Dividends</div>
            <div className="text-lg font-bold text-green-400 mb-2">
              ${tooltip.data.amount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-300 mb-2">
              {tooltip.data.count} payments received
            </div>
            <div className="space-y-1">
              {tooltip.data.stocks.slice(0, 3).map((stock) => (
                <div key={stock.symbol} className="flex justify-between text-xs">
                  <span>{stock.symbol}</span>
                  <span>${stock.amount.toFixed(0)}</span>
                </div>
              ))}
              {tooltip.data.stocks.length > 3 && (
                <div className="text-xs text-gray-400">
                  +{tooltip.data.stocks.length - 3} more stocks
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DividendsReceived;