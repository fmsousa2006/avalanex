import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StockTrendsProps {
  data: Array<{
    symbol: string;
    name: string;
    shares: number;
    price: number;
    value: number;
    cost: number;
    change: number;
    changePercent: number;
  }>;
}

export const StockTrends: React.FC<StockTrendsProps> = ({ data }) => {
  const [realPriceData, setRealPriceData] = useState<{ [symbol: string]: number[] }>({});
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);

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

  // Fetch real 30-day price data from Supabase
  const fetchReal30DayData = async (symbol: string): Promise<number[]> => {
    if (!isSupabaseEnvConfigured()) {
      console.log(`📊 [StockTrends] Supabase not configured, using mock data for ${symbol}`);
      return [];
    }

    try {
      // Get stock ID
      const { data: stock, error: stockError } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', symbol)
        .maybeSingle();

      if (stockError || !stock) {
        console.warn(`⚠️ [StockTrends] Stock ${symbol} not found in database`);
        return [];
      }

      // Get 30-day price data
      const { data: priceData, error: priceError } = await supabase
        .from('stock_prices_30d')
        .select('close_price, timestamp')
        .eq('stock_id', stock.id)
        .order('timestamp', { ascending: true });

      if (priceError) {
        console.error(`❌ [StockTrends] Error fetching 30d data for ${symbol}:`, priceError);
        return [];
      }

      if (priceData && priceData.length > 0) {
        const prices = priceData.map(d => parseFloat(d.close_price));
        console.log(`✅ [StockTrends] Loaded ${priceData.length} data points for ${symbol}`);
        return prices;
      } else {
        console.warn(`⚠️ [StockTrends] No 30d data found for ${symbol}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ [StockTrends] Error fetching real 30d data for ${symbol}:`, error);
      return [];
    }
  };

  // Fetch real data for multiple symbols
  const fetchReal30DayDataForSymbols = async (symbols: string[]) => {
    if (!isSupabaseEnvConfigured()) {
      console.log('📊 [StockTrends] Supabase not configured, using mock data');
      return;
    }

    setIsLoadingRealData(true);
    
    try {
      const realData: { [symbol: string]: number[] } = {};
      
      for (const symbol of symbols) {
        const prices = await fetchReal30DayData(symbol);
        if (prices.length > 0) {
          realData[symbol] = prices;
        }
      }
      
      setRealPriceData(realData);
    } catch (error) {
      console.error('❌ [StockTrends] Error fetching real 30d data:', error);
    } finally {
      setIsLoadingRealData(false);
    }
  };

  // Get top 3 holdings by value
  const top3Holdings = data
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // Fetch real data when component mounts or data changes
  useEffect(() => {
    if (top3Holdings.length > 0) {
      const symbols = top3Holdings.map(stock => stock.symbol);
      fetchReal30DayDataForSymbols(symbols);
    }
  }, [data]);

  // Generate mock 30-day trend data for visualization
  const generateTrendData = (symbol: string, currentPrice: number): number[] => {
    // Use real data if available, otherwise generate mock data
    if (realPriceData[symbol] && realPriceData[symbol].length > 0) {
      return realPriceData[symbol];
    }

    // Fallback to generated data
    const data = [];
    let price = currentPrice * 0.95; // Start 5% below current price
    
    for (let i = 0; i < 30; i++) {
      const change = (Math.random() - 0.5) * 0.04; // ±2% daily change
      price = price * (1 + change);
      data.push(price);
    }
    
    // Ensure the last price matches current price
    data[29] = currentPrice;
    return data;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Top 3 Holdings (30 Days)</h2>
        {isLoadingRealData && (
          <div className="text-sm text-blue-600">Loading real data...</div>
        )}
      </div>
      
      <div className="space-y-6">
        {top3Holdings.map((stock, index) => {
          const trendData = generateTrendData(stock.symbol, stock.price);
          const hasRealData = realPriceData[stock.symbol] && realPriceData[stock.symbol].length > 0;
          
          // Calculate min and max for scaling
          const minPrice = Math.min(...trendData);
          const maxPrice = Math.max(...trendData);
          const priceRange = maxPrice - minPrice;
          
          return (
            <div key={stock.symbol} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{stock.symbol}</span>
                    {hasRealData && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        Real Data
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{stock.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(stock.price)}
                  </div>
                  <div className={`text-xs ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(stock.changePercent)}
                  </div>
                </div>
              </div>
              
              {/* Mini Chart */}
              <div className="h-12 relative">
                <svg width="100%" height="100%" className="overflow-visible">
                  <polyline
                    fill="none"
                    stroke={stock.changePercent >= 0 ? "#10b981" : "#ef4444"}
                    strokeWidth="1.5"
                    points={trendData.map((price, i) => {
                      const x = (i / (trendData.length - 1)) * 100;
                      const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 100 : 50;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                </svg>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{stock.shares} shares</span>
                <span>{formatCurrency(stock.value)} total</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {top3Holdings.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No holdings to display</p>
        </div>
      )}
    </div>
  );
};