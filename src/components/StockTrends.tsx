import React, { useState, useEffect } from 'react';

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
  timestamp: number;
  price: number;
}

interface StockData {
  symbol: string;
  prices: PriceDataPoint[];
  currentPrice: number;
  changePercent: number;
  isRealData: boolean;
}

export const StockTrends: React.FC<StockTrendsProps> = ({ data }) => {
  const [stocksData, setStocksData] = useState<Map<string, StockData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
  const isApiConfigured = FINNHUB_API_KEY && FINNHUB_API_KEY !== 'your-finnhub-api-key-here';

  const fetchRealStockData = async (symbol: string): Promise<StockData | null> => {
    if (!isApiConfigured) {
      console.log(`📊 Finnhub API not configured for ${symbol}`);
      return null;
    }

    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60);

      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;

      console.log(`📡 Fetching real data for ${symbol}...`);
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`❌ HTTP error for ${symbol}: ${response.status}`);
        return null;
      }

      const candleData = await response.json();

      if (candleData.s !== 'ok' || !candleData.c || candleData.c.length === 0) {
        console.warn(`⚠️ No data returned for ${symbol}`);
        return null;
      }

      const prices: PriceDataPoint[] = candleData.t.map((timestamp: number, index: number) => ({
        timestamp,
        price: candleData.c[index]
      }));

      const firstPrice = prices[0].price;
      const lastPrice = prices[prices.length - 1].price;
      const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

      console.log(`✅ Loaded ${prices.length} real data points for ${symbol}, change: ${changePercent.toFixed(2)}%`);

      return {
        symbol,
        prices,
        currentPrice: lastPrice,
        changePercent,
        isRealData: true
      };
    } catch (error) {
      console.error(`❌ Error fetching ${symbol}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const loadAllStockData = async () => {
      if (!isApiConfigured) {
        console.log('📊 Finnhub API not configured, skipping data fetch');
        setApiError('Finnhub API key not configured');
        return;
      }

      const top3 = data
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);

      if (top3.length === 0) {
        return;
      }

      setIsLoading(true);
      setApiError(null);

      const newStocksData = new Map<string, StockData>();

      for (const stock of top3) {
        const stockData = await fetchRealStockData(stock.symbol);

        if (stockData) {
          newStocksData.set(stock.symbol, stockData);
        }

        await new Promise(resolve => setTimeout(resolve, 250));
      }

      if (newStocksData.size === 0) {
        setApiError('Failed to fetch data from Finnhub API');
      }

      setStocksData(newStocksData);
      setIsLoading(false);
    };

    loadAllStockData();
  }, [data, isApiConfigured]);

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
            <span className="text-sm text-blue-500">Loading real data...</span>
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
            trendPrices = stockData.prices.map(p => p.price);
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
                      Live Data
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
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    {isLoading ? 'Loading...' : 'No data available'}
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

      {!isApiConfigured && top3Holdings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            Configure Finnhub API key to view live 30-day price trends
          </p>
        </div>
      )}

      {apiError && isApiConfigured && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
          <p className="text-sm text-red-400">{apiError}</p>
        </div>
      )}
    </div>
  );
};
