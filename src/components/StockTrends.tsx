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

const formatAxisDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatAxisPrice = (price: number) => {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(1)}k`;
  }
  return `$${price.toFixed(0)}`;
};

interface StockData {
  symbol: string;
  prices: number[];
  timestamps?: string[];
  currentPrice: number;
  changePercent: number;
  isRealData: boolean;
}

interface HoverData {
  x: number;
  y: number;
  price: number;
  date: string;
  index: number;
}

export const StockTrends: React.FC<StockTrendsProps> = ({ data }) => {
  const [stocksData, setStocksData] = useState<Map<string, StockData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hoverData, setHoverData] = useState<Map<string, HoverData | null>>(new Map());

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
      const timestamps = priceData.map((p: PriceDataPoint) => p.timestamp);
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const changePercent = ((stockData.current_price - firstPrice) / firstPrice) * 100;

      console.log(`✅ Loaded ${prices.length} data points for ${symbol} from database. Current price: $${stockData.current_price}`);

      return {
        symbol,
        prices,
        timestamps,
        currentPrice: stockData.current_price,
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
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Top 3 Positions</h2>
        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-400">Loading...</span>
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

          const currentHover = hoverData.get(stock.symbol);

          const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const index = Math.round(percentage * (trendPrices.length - 1));

            if (index >= 0 && index < trendPrices.length) {
              const price = trendPrices[index];
              const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 80 + 10 : 50;
              const date = stockData?.timestamps?.[index] || '';

              setHoverData(prev => new Map(prev).set(stock.symbol, {
                x: percentage * 100,
                y,
                price,
                date,
                index
              }));
            }
          };

          const handleMouseLeave = () => {
            setHoverData(prev => {
              const newMap = new Map(prev);
              newMap.set(stock.symbol, null);
              return newMap;
            });
          };

          return (
            <div key={stock.symbol} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg font-bold text-white">{stock.symbol}</span>
                    <span className={`text-sm font-semibold ${displayChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatPercentage(displayChangePercent)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(displayPrice)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {stock.shares} shares
                  </div>
                </div>
              </div>

              <div className="relative">
                <div
                  className="h-24 relative bg-gray-900/50 rounded-lg overflow-hidden cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {trendPrices.length > 1 ? (
                    <>
                      <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`gradient-${stock.symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
                          </linearGradient>
                        </defs>
                        <polygon
                          fill={`url(#gradient-${stock.symbol})`}
                          points={`0,100 ${trendPrices.map((price, i) => {
                            const x = (i / (trendPrices.length - 1)) * 100;
                            const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 80 + 10 : 50;
                            return `${x},${y}`;
                          }).join(' ')} 100,100`}
                        />
                        <polyline
                          fill="none"
                          stroke="#60a5fa"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          points={trendPrices.map((price, i) => {
                            const x = (i / (trendPrices.length - 1)) * 100;
                            const y = priceRange > 0 ? ((maxPrice - price) / priceRange) * 80 + 10 : 50;
                            return `${x},${y}`;
                          }).join(' ')}
                        />

                        {currentHover && (
                          <>
                            <line
                              x1={currentHover.x}
                              y1="0"
                              x2={currentHover.x}
                              y2="100"
                              stroke="#9ca3af"
                              strokeWidth="0.5"
                              strokeDasharray="2,2"
                              vectorEffect="non-scaling-stroke"
                            />
                            <circle
                              cx={currentHover.x}
                              cy={currentHover.y}
                              r="0.8"
                              fill="#ffffff"
                              stroke="#3b82f6"
                              strokeWidth="0.3"
                              opacity="1"
                              shapeRendering="geometricPrecision"
                              vectorEffect="non-scaling-stroke"
                            />
                          </>
                        )}
                      </svg>

                      {currentHover && currentHover.date && (
                        <div
                          className="absolute bg-gray-950/50 text-white text-xs rounded-lg px-3 py-2 pointer-events-none z-10 shadow-xl border border-gray-700/50 backdrop-blur-sm"
                          style={{
                            left: `${currentHover.x}%`,
                            top: '50%',
                            transform: currentHover.x > 50 ? 'translate(-110%, -50%)' : 'translate(10%, -50%)'
                          }}
                        >
                          <div className="font-medium mb-1">{formatAxisDate(currentHover.date)}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="font-semibold">{stock.symbol}:</span>
                            <span>{formatCurrency(currentHover.price)}</span>
                          </div>
                        </div>
                      )}

                      <div className="absolute right-2 top-2 text-[10px] text-gray-500 pointer-events-none">
                        max: {formatAxisPrice(maxPrice)}
                      </div>
                      <div className="absolute right-2 bottom-2 text-[10px] text-gray-500 pointer-events-none">
                        min: {formatAxisPrice(minPrice)}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-xs text-gray-500">No historical data available</div>
                    </div>
                  )}
                </div>

                {trendPrices.length > 1 && stockData?.timestamps && stockData.timestamps.length > 0 && (() => {
                  const timestamps = stockData.timestamps;
                  const firstDate = timestamps[0];
                  const lastDate = timestamps[timestamps.length - 1];
                  const midIndex1 = Math.floor(timestamps.length / 3);
                  const midIndex2 = Math.floor((timestamps.length * 2) / 3);
                  const midDate1 = timestamps[midIndex1];
                  const midDate2 = timestamps[midIndex2];

                  return (
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1 px-1">
                      <span>{formatAxisDate(firstDate)}</span>
                      <span>{formatAxisDate(midDate1)}</span>
                      <span>{formatAxisDate(midDate2)}</span>
                      <span>{formatAxisDate(lastDate)}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <span>Total value: {formatCurrency(displayPrice * stock.shares)}</span>
                {hasRealData && <span>1-month trend</span>}
              </div>
            </div>
          );
        })}
      </div>

      {top3Holdings.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No holdings to display</p>
        </div>
      )}
    </div>
  );
};
