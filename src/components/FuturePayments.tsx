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

      dividends.forEach(dividend => {
        const date = new Date(dividend.payment_date);
        const monthKey = months[date.getMonth()];
        const holding = holdings.find(h => h.stock?.id === dividend.stock_id);
        const totalAmount = holding ? holding.shares * dividend.amount : dividend.amount;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            amount: 0,
            payments: []
          };
        }

        monthlyData[monthKey].amount += totalAmount;
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

  const maxAmount = Math.max(...monthlyDividends.map(m => m.amount));
  const chartHeight = 200;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-white">Upcoming Dividends</h2>
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onCalendarClick}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
          >
            <span>Calendar</span>
            <Calendar className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex items-start space-x-8 mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-1 h-6 bg-blue-400 rounded"></div>
            <span className="text-gray-400 text-sm">Next 12m</span>
          </div>
          <div className="text-xl font-bold text-white">
            ${next12MonthsTotal.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-1 h-6 bg-blue-400 rounded"></div>
            <span className="text-gray-400 text-sm">Monthly</span>
          </div>
          <div className="text-xl font-bold text-white">
            ${monthlyAverage.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Average line */}
        <div 
          className="absolute w-full border-t border-dashed border-blue-400 opacity-50"
          style={{ 
            top: `${chartHeight - (monthlyAverage / maxAmount) * chartHeight}px` 
          }}
        >
          <span className="absolute right-0 -top-3 text-xs text-blue-400">
            avg ${monthlyAverage.toFixed(0)}
          </span>
        </div>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <div
            key={ratio}
            className="absolute w-full border-t border-dashed border-gray-600 opacity-30"
            style={{ top: `${chartHeight * (1 - ratio)}px` }}
          />
        ))}

        {/* Bars */}
        <div className="flex items-end justify-between space-x-2" style={{ height: `${chartHeight}px` }}>
          {monthlyDividends.map((month, index) => {
            const barHeight = maxAmount > 0 ? (month.amount / maxAmount) * chartHeight : 0;
            const isHighlighted = month.amount > monthlyAverage;
            
            return (
              <div key={month.month} className="flex flex-col items-center flex-1">
                {/* Amount label */}
                {month.amount > 0 && (
                  <div className="text-xs text-gray-400 mb-2">
                    ${month.amount.toFixed(1)}
                  </div>
                )}
                
                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer ${
                    isHighlighted ? 'bg-blue-400' : 'bg-blue-500'
                  }`}
                  style={{ height: `${barHeight}px`, minHeight: month.amount > 0 ? '8px' : '0px' }}
                  title={`${month.month}: $${month.amount.toFixed(2)}`}
                />
                
                {/* Month label */}
                <div className="text-xs text-gray-400 mt-2">
                  {month.month}
                </div>
              </div>
            );
          })}
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
        </div>
      </div>
    </div>
  );
}



export default FutureDividends