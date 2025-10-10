import React, { useState, useEffect } from 'react';
import { Calendar, HelpCircle, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FutureDividendsProps {
  portfolioId?: string;
  onCalendarClick?: () => void;
}

interface MonthlyDividend {
  month: string;
  amount: number;
  paidAmount: number;
  payments: Array<{
    symbol: string;
    amount: number;
    date: string;
  }>;
}

const FutureDividends: React.FC<FutureDividendsProps> = ({ portfolioId, onCalendarClick }) => {
  const [monthlyDividends, setMonthlyDividends] = useState<MonthlyDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [next12MonthsTotal, setNext12MonthsTotal] = useState(0);
  const [monthlyAverage, setMonthlyAverage] = useState(0);

  // Helper function to check if Supabase environment is properly configured
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

  // Generate mock data for demonstration
  const generateMockData = (): MonthlyDividend[] => {
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const mockData: MonthlyDividend[] = [];

    months.forEach((month, index) => {
      // Generate realistic dividend amounts with some variation
      const baseAmount = 15 + Math.sin(index * 0.5) * 10; // Varies between ~5-25
      const variation = (Math.random() - 0.5) * 10; // ±5 variation
      const amount = Math.max(5, baseAmount + variation);

      mockData.push({
        month,
        amount: parseFloat(amount.toFixed(2)),
        payments: [
          { symbol: 'AAPL', amount: amount * 0.4, date: `2024-${String(index + 9).padStart(2, '0')}-15` },
          { symbol: 'MSFT', amount: amount * 0.3, date: `2024-${String(index + 9).padStart(2, '0')}-20` },
          { symbol: 'O', amount: amount * 0.3, date: `2024-${String(index + 9).padStart(2, '0')}-25` }
        ]
      });
    });

    return mockData;
  };

  // Fetch future dividend payments from Supabase
  const fetchFutureDividends = async () => {
    const supabaseConfigured = isSupabaseEnvConfigured();
    
    if (!supabaseConfigured) {
      console.log('📊 [FutureDividends] Supabase not configured, showing empty state');
      setMonthlyDividends([]);
      setNext12MonthsTotal(0);
      setMonthlyAverage(0);
      setLoading(false);
      return;
    }

    if (!portfolioId) {
      console.log('📊 [FutureDividends] No portfolio ID provided');
      setMonthlyDividends([]);
      setNext12MonthsTotal(0);
      setMonthlyAverage(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get portfolio holdings
      const { data: holdings, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select(`
          shares,
          stock:stocks(id, symbol, name)
        `)
        .eq('portfolio_id', portfolioId)
        .gt('shares', 0);

      if (holdingsError || !holdings || holdings.length === 0) {
        console.log('📊 [FutureDividends] No holdings found, using mock data');
        setMonthlyDividends([]);
        setNext12MonthsTotal(0);
        setMonthlyAverage(0);
        setLoading(false);
        return;
      }

      // Get stock IDs
      const stockIds = holdings.map(h => h.stock?.id).filter(Boolean);

      if (stockIds.length === 0) {
        setMonthlyDividends([]);
        setNext12MonthsTotal(0);
        setMonthlyAverage(0);
        setLoading(false);
        return;
      }

      // Get future dividends for the next 12 months
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const { data: dividends, error: dividendsError } = await supabase
        .from('dividends')
        .select(`
          *,
          stock:stocks(symbol, name)
        `)
        .in('stock_id', stockIds)
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0])
        .order('payment_date', { ascending: true });

      if (dividendsError || !dividends || dividends.length === 0) {
        console.log('📊 [FutureDividends] No future dividends found, using mock data');
        setMonthlyDividends([]);
        setNext12MonthsTotal(0);
        setMonthlyAverage(0);
        setLoading(false);
        return;
      }

      // Group dividends by month
      const monthlyData: { [key: string]: MonthlyDividend } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const today = new Date();

      dividends.forEach(dividend => {
        const date = new Date(dividend.payment_date);
        const monthKey = months[date.getMonth()];
        const holding = holdings.find(h => h.stock?.id === dividend.stock_id);
        const totalAmount = holding ? holding.shares * dividend.amount : dividend.amount;
        const isPaid = date <= today;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            amount: 0,
            paidAmount: 0,
            payments: []
          };
        }

        monthlyData[monthKey].amount += totalAmount;
        if (isPaid) {
          monthlyData[monthKey].paidAmount += totalAmount;
        }
        monthlyData[monthKey].payments.push({
          symbol: dividend.stock?.symbol || 'Unknown',
          amount: totalAmount,
          date: dividend.payment_date
        });
      });

      // Convert to array and ensure we have 12 months
      const dividendsArray: MonthlyDividend[] = [];
      for (let i = 0; i < 12; i++) {
        const monthIndex = (startDate.getMonth() + i) % 12;
        const monthKey = months[monthIndex];

        if (monthlyData[monthKey]) {
          dividendsArray.push(monthlyData[monthKey]);
        } else {
          dividendsArray.push({
            month: monthKey,
            amount: 0,
            paidAmount: 0,
            payments: []
          });
        }
      }

      setMonthlyDividends(dividendsArray);
      
      const total = dividendsArray.reduce((sum, month) => sum + month.amount, 0);
      setNext12MonthsTotal(total);
      setMonthlyAverage(total / 12);

    } catch (error) {
      console.error('❌ [FutureDividends] Error fetching future dividends:', error);
      setMonthlyDividends([]);
      setNext12MonthsTotal(0);
      setMonthlyAverage(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFutureDividends();
  }, [portfolioId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Loading future dividends...</span>
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...monthlyDividends.map(m => m.amount), 1);
  const chartHeight = 240;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-white">Upcoming Dividends</h2>
        <button
          onClick={onCalendarClick}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Calendar className="w-5 h-5" />
        </button>
      </div>

      {monthlyDividends.length > 0 && monthlyDividends.some(m => m.amount > 0) ? (
        <>
          {/* Summary Stats */}
          <div className="flex items-start space-x-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-1 h-6 bg-blue-400 rounded"></div>
                <span className="text-gray-400 text-sm">Next 12m</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${next12MonthsTotal.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-1 h-6 bg-blue-400 rounded"></div>
                <span className="text-gray-400 text-sm">Monthly</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${monthlyAverage.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div className="relative pt-8" style={{ height: `${chartHeight + 60}px` }}>
            {/* Horizontal grid lines */}
            <div className="absolute inset-x-0" style={{ top: '8px', height: `${chartHeight}px` }}>
              {[0, 0.33, 0.66, 1].map((ratio) => {
                const value = maxAmount * (1 - ratio);
                return (
                  <div
                    key={ratio}
                    className="absolute w-full border-t border-dashed border-gray-700"
                    style={{ top: `${chartHeight * ratio}px` }}
                  />
                );
              })}

              {/* Average line - highlighted */}
              {monthlyAverage > 0 && (
                <div
                  className="absolute w-full border-t border-dashed border-blue-400"
                  style={{
                    top: `${chartHeight * (1 - monthlyAverage / maxAmount)}px`,
                    opacity: 0.5
                  }}
                >
                  <span className="absolute right-0 -top-3 text-xs text-blue-400">
                    avg
                  </span>
                </div>
              )}
            </div>

            {/* Bars */}
            <div className="relative flex items-end justify-between gap-3 px-2" style={{ height: `${chartHeight}px` }}>
              {monthlyDividends.map((month, index) => {
                const barHeight = maxAmount > 0 ? (month.amount / maxAmount) * (chartHeight - 20) : 0;
                const paidHeight = maxAmount > 0 ? (month.paidAmount / maxAmount) * (chartHeight - 20) : 0;
                const unpaidHeight = barHeight - paidHeight;
                const isCurrentMonth = index === 0;
                const hasPaidDividends = month.paidAmount > 0;

                return (
                  <div key={month.month} className="flex flex-col items-center flex-1 relative">
                    {/* Amount label on top of bar */}
                    {month.amount > 0 && (
                      <div
                        className="absolute text-xs font-medium text-gray-300 whitespace-nowrap"
                        style={{
                          bottom: `${barHeight + 6}px`,
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                      >
                        ${month.amount.toFixed(0)}
                      </div>
                    )}

                    {/* Bar container */}
                    <div className="w-full flex flex-col justify-end" style={{ height: `${chartHeight - 20}px` }}>
                      <div
                        className="w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer relative overflow-hidden"
                        style={{
                          height: `${Math.max(barHeight, month.amount > 0 ? 4 : 0)}px`,
                        }}
                        title={`${month.month}: $${month.amount.toFixed(2)}${hasPaidDividends && isCurrentMonth ? ` (Paid: $${month.paidAmount.toFixed(2)})` : ''}`}
                      >
                        {/* Paid portion (purple) - only for current month */}
                        {isCurrentMonth && hasPaidDividends && paidHeight > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-purple-500"
                            style={{ height: `${paidHeight}px` }}
                          />
                        )}
                        {/* Unpaid portion (blue) */}
                        <div
                          className="absolute left-0 right-0 bg-blue-400 rounded-t"
                          style={{
                            bottom: isCurrentMonth && hasPaidDividends ? `${paidHeight}px` : '0',
                            height: isCurrentMonth && hasPaidDividends ? `${unpaidHeight}px` : '100%'
                          }}
                        />
                      </div>
                    </div>

                    {/* Month label */}
                    <div className={`text-xs mt-3 ${isCurrentMonth ? 'text-white font-medium' : 'text-gray-500'}`}>
                      {month.month}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium text-lg">No upcoming dividends</p>
            <p className="text-gray-500 text-sm mt-2">
              Future dividend payments will appear here once you have dividend-paying stocks in your portfolio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}



export default FutureDividends