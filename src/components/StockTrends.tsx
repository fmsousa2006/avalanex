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

interface PriceDataPoint {
  timestamp: string;
  close_price: number;
}

interface StockData {
  symbol: string;
  prices: number[];
  currentPrice: number;
  changePercent: number;
  isRealData: boolean;
}

export const StockTrends: React.FC<StockTrendsProps> = ({ data }) => {
  const [stocksData, setStocksData] = useState<Map<string, StockData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const fetchStockDataFromDatabase = async (symbol: string): Promise<StockData | null> => {
    try {
      console.log(`📊 Fetching ${symbol} from database...`);

      const { data: stockData, error: stockError } = await supabase
        .from('stocks')
        .select('id, symbol, current_price')
        .eq('symbol', symbol)
        .maybeSingle();

      if (stockError || !stockData) {
        console.warn(`⚠️ Stock ${symbol} not found in database`);
        return null;
      }

      const { data: priceData, error: priceError } = await supabase
        .from('stock_prices_30d')
        .select('timestamp, close_price')
        .eq('stock_id', stockData.id)
        .order('timestamp', { ascending: true });

      if (priceError || !priceData || priceData.length === 0) {
        console.warn(`⚠️ No 30-day price data for ${symbol}`);
        return null;
      }

      const prices = priceData.map((p: PriceDataPoint) => p.close_price);
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

      console.log(`✅ Loaded ${prices.length} data points for ${symbol} from database`);

      return {
        symbol,
        prices,
        currentPrice: lastPrice,
        changePercent,
        isRealData: true
      };
    } catch (error) {
      console.error(`❌ Error fetching ${symbol} from database:`, error);
      return null;
    }
  };

  useEffect(() => {
    const loadAllStockData = async () => {
      const top3 = data
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);

      if (top3.length === 0) {
        return;
      }

      setIsLoading(true);

      const newStocksData = new Map<string, StockData>();

      for (const stock of top3) {
        const stockData = await fetchStockDataFromDatabase(stock.symbol);

        if (stockData) {
          newStocksData.set(stock.symbol, stockData);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setStocksData(newStocksData);
      setIsLoading(false);
    };

    loadAllStockData();
  }, [data]);

  const top3Holdings = data
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

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
        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-blue-500">Loading data...</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {top3Holdings.map((stock) => {
          const stockData = stocksData.get(stock.symbol);
          const hasRealData = stockData?.isRealData || false;

          const displayPrice = hasRealData ? stockData.currentPrice : stock.price;
          const displayChangePercent = hasRealData ? stockData.changePercent : stock.changePercent;

          let trendPrices: number[] = [];

          if (hasRealData && stockData.prices) {
            trendPrices = stockData.prices;
          } else {
            trendPrices = [stock.price];
          }

          const minPrice = Math.min(...trendPrices);
          const maxPrice = Math.max(...trendPrices);
          const priceRange = maxPrice - minPrice;

          return (
            <div key={stock.symbol} className="border-b border-gray-600 last:border-b-0 pb-6 last:pb-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-base font-semibold text-white">{stock.symbol}</span>
                  <span className="text-sm text-gray-300">{stock.name}</span>
                  {hasRealData && (
                    <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                      30-Day Data
                    </span>
                  )}
                  {!hasRealData && (
                    <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                      Current Price
                    </span>
                  )}
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

              <div className="h-16 relative bg-gray-750 rounded-lg p-2">
                {trendPrices.length > 1 ? (
                  <svg width="100%" height="100%" className="overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`gradient-${stock.symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={displayChangePercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={displayChangePercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    <polygon
                      fill={`url(#gradient-${stock.symbol})`}
                      points={`${trendPrices.map((price, i) => {
                        const x = (i / (trendPrices.length - 1)) * 100;
                        const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 100 : 50;
                        return `${x},${y}`;
                      }).join(' ')} 100,100 0,100`}
                    />
                    <polyline
                      fill="none"
                      stroke={displayChangePercent >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth="2"
                      points={trendPrices.map((price, i) => {
                        const x = (i / (trendPrices.length - 1)) * 100;
                        const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 100 : 50;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">No historical data</div>
                      <div className="text-gray-400 text-xs mt-1">Showing current price</div>
                    </div>
                  </div>
                )}
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
    </div>
  );
};
