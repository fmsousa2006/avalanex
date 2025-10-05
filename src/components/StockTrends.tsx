import React, { useState, useEffect } from 'react';
import { finnhubService } from '../lib/finnhub';

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

  const fetchReal30DayData = async (symbol: string): Promise<number[]> => {
    if (!finnhubService.isConfigured()) {
      console.log(`📊 [StockTrends] Finnhub not configured, using mock data for ${symbol}`);
      return [];
    }

    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60);

      const candleData = await finnhubService.getCandles(symbol, 'D', from, to);

      if (!candleData || !candleData.c || candleData.c.length === 0) {
        console.warn(`⚠️ [StockTrends] No candle data available for ${symbol}`);
        return [];
      }

      console.log(`✅ [StockTrends] Loaded ${candleData.c.length} data points for ${symbol}`);
      return candleData.c;
    } catch (error) {
      console.warn(`⚠️ [StockTrends] Error fetching data for ${symbol}:`, error);
      return [];
    }
  };

  const fetchReal30DayDataForSymbols = async (symbols: string[]) => {
    if (!finnhubService.isConfigured()) {
      console.log('📊 [StockTrends] Finnhub not configured');
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
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setRealPriceData(realData);
    } catch (error) {
      console.warn('⚠️ [StockTrends] Error fetching real 30d data:', error);
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

  // Get trend data - prioritize real data, fallback to mock
  const getTrendData = (symbol: string, currentPrice: number): { data: number[], isReal: boolean } => {
    // Use real data if available, otherwise generate mock data
    if (realPriceData[symbol] && realPriceData[symbol].length > 0) {
      return { data: realPriceData[symbol], isReal: true };
    }

    // Fallback to generated data
    const mockData = [];
    let price = currentPrice * 0.95; // Start 5% below current price
    
    for (let i = 0; i < 30; i++) {
      const change = (Math.random() - 0.5) * 0.04; // ±2% daily change
      price = price * (1 + change);
      mockData.push(price);
    }
    
    // Ensure the last price matches current price
    mockData[29] = currentPrice;
    return { data: mockData, isReal: false };
  };

  // Calculate real change percentage from 30-day data
  const calculateRealChangePercent = (symbol: string, currentPrice: number): number => {
    if (realPriceData[symbol] && realPriceData[symbol].length > 1) {
      const firstPrice = realPriceData[symbol][0];
      const lastPrice = realPriceData[symbol][realPriceData[symbol].length - 1];
      return ((lastPrice - firstPrice) / firstPrice) * 100;
    }
    // Fallback to portfolio data change percent if no real data
    return 0;
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
    <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Top 3 Holdings (30 Days)</h2>
        {isLoadingRealData && (
          <div className="text-sm text-blue-600">Loading real data...</div>
        )}
      </div>
      
      <div className="space-y-6">
        {top3Holdings.map((stock, index) => {
          const { data: trendData, isReal: hasRealData } = getTrendData(stock.symbol, stock.price);
          
          // Use real change percentage if we have real data, otherwise use portfolio data
          const displayChangePercent = hasRealData 
            ? calculateRealChangePercent(stock.symbol, stock.price)
            : stock.changePercent;
          
          // Use real current price if available (last price from real data)
          const displayPrice = hasRealData && realPriceData[stock.symbol] && realPriceData[stock.symbol].length > 0
            ? realPriceData[stock.symbol][realPriceData[stock.symbol].length - 1]
            : stock.price;
          
          // Calculate min and max for scaling
          const minPrice = Math.min(...trendData);
          const maxPrice = Math.max(...trendData);
          const priceRange = maxPrice - minPrice;
          
          return (
            <div key={stock.symbol} className="border-b border-gray-600 last:border-b-0 pb-6 last:pb-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-base font-semibold text-white">{stock.symbol}</span>
                  <span className="text-sm text-gray-300">{stock.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold text-white">
                    {formatCurrency(displayPrice)}
                  </div>
                  <div className={`text-sm font-medium ${displayChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercentage(displayChangePercent)}
                  </div>
                </div>
              </div>
              
              {/* Mini Chart */}
              <div className="h-16 relative bg-gray-750 rounded-lg p-2">
                <svg width="100%" height="100%" className="overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke={displayChangePercent >= 0 ? "#10b981" : "#ef4444"}
                    strokeWidth="2"
                    points={trendData.map((price, i) => {
                      const x = (i / (trendData.length - 1)) * 100;
                      const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 100 : 50;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {/* Add gradient fill under the line */}
                  <defs>
                    <linearGradient id={`gradient-${stock.symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={displayChangePercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.3"/>
                      <stop offset="100%" stopColor={displayChangePercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.05"/>
                    </linearGradient>
                  </defs>
                  <polygon
                    fill={`url(#gradient-${stock.symbol})`}
                    points={`${trendData.map((price, i) => {
                      const x = (i / (trendData.length - 1)) * 100;
                      const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 100 : 50;
                      return `${x},${y}`;
                    }).join(' ')} 100,100 0,100`}
                  />
                </svg>
              </div>
              
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>{stock.shares} shares</span>
                <span>{formatCurrency(displayPrice * stock.shares)} total</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {top3Holdings.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No holdings to display</p>
        </div>
      )}

      {!finnhubService.isConfigured() && top3Holdings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            Configure Finnhub API key to view live 30-day price trends
          </p>
        </div>
      )}
    </div>
  );
};