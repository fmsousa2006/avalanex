import React, { useState } from 'react';

interface PortfolioData {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  cost: number;
  change: number;
  changePercent: number;
}

interface StockTrendsProps {
  data: PortfolioData[];
}

const StockTrends: React.FC<StockTrendsProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; symbol: string; date: string } | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 400, height: 180 });
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Update chart dimensions on resize
  React.useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const containerWidth = chartRef.current.offsetWidth;
        const containerHeight = Math.max(180, containerWidth * 0.4); // Maintain aspect ratio
        setChartDimensions({
          width: Math.max(300, containerWidth - 20), // Minimum width with padding
          height: Math.min(containerHeight, 250) // Maximum height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate total portfolio value and get top 3 holdings by weight
  const totalValue = data.reduce((sum, stock) => sum + stock.value, 0);
  const top3Holdings = [...data]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(stock => ({
      ...stock,
      currentPrice: stock.price,
      weight: ((stock.value / totalValue) * 100)
    }));

  const chartWidth = chartDimensions.width;
  const chartHeight = chartDimensions.height;
  const padding = 10;

  const createPath = (prices: number[], minPrice: number, maxPrice: number) => {
    if (maxPrice === minPrice) {
      const y = chartHeight / 2;
      return `M ${padding} ${y} L ${chartWidth - padding} ${y}`;
    }
    
    const points = prices.map((price, index) => {
      const x = padding + (index / (prices.length - 1)) * (chartWidth - 2 * padding);
      const y = padding + ((maxPrice - price) / (maxPrice - minPrice)) * (chartHeight - 2 * padding);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const generateFixedPriceHistory = (basePrice: number, symbol: string) => {
    const prices: number[] = [];
    let currentPrice = basePrice * 0.95;
    
    // Use symbol as seed for consistent data generation
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let random = seed;
    
    for (let i = 0; i < 30; i++) {
      // Simple pseudo-random number generator for consistent results
      random = (random * 9301 + 49297) % 233280;
      const normalizedRandom = random / 233280;
      
      const volatility = (normalizedRandom - 0.5) * 0.03; // 3% daily volatility
      const trend = 0.001; // Slight upward trend
      currentPrice = currentPrice * (1 + volatility + trend);
      prices.push(Math.max(currentPrice, 1));
    }
    
    return prices;
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>, stock: StockTrendData) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    
    const chartAreaWidth = chartWidth - 2 * padding;
    const relativeX = Math.max(0, Math.min(chartAreaWidth, mouseX - padding));
    const dataIndex = Math.round((relativeX / chartAreaWidth) * 29); // 30 days = 0-29 index
    
    // Use the fixed price history for this stock
    const priceHistory = generateFixedPriceHistory(stock.currentPrice, stock.symbol);
    
    if (dataIndex >= 0 && dataIndex < priceHistory.length) {
      const value = priceHistory[dataIndex];
      const minPrice = Math.min(...priceHistory);
      const maxPrice = Math.max(...priceHistory);
      
      const x = padding + (dataIndex / 29) * chartAreaWidth;
      const y = padding + ((maxPrice - value) / (maxPrice - minPrice)) * (chartHeight - 2 * padding);
      
      const date = new Date();
      date.setDate(date.getDate() - (29 - dataIndex));
      
      setTooltip({ 
        x, 
        y, 
        value, 
        symbol: stock.symbol,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };
  
  return (
    <div className="space-y-6">
      {top3Holdings.map((stock) => {
        const priceHistory = generateFixedPriceHistory(stock.currentPrice, stock.symbol);
        const minPrice = Math.min(...priceHistory);
        const maxPrice = Math.max(...priceHistory);
        const path = createPath(priceHistory, minPrice, maxPrice);
        const isPositive = stock.change >= 0;

        return (
          <div key={stock.symbol} className="bg-gray-750 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">{stock.symbol}</h3>
                  <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-600/30">
                    {stock.weight.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${stock.currentPrice.toFixed(2)}</p>
                <p className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}${stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
            
            <div className="relative">
              <div ref={chartRef} className="w-full">
              <svg 
                width={chartWidth} 
                height={chartHeight} 
                className="w-full h-auto cursor-crosshair"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="xMidYMid meet"
                onMouseMove={(e) => handleMouseMove(e, stock)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Price line */}
                <path
                  d={path}
                  fill="none"
                  stroke={isPositive ? '#10b981' : '#ef4444'}
                  strokeWidth="2"
                  className="drop-shadow-sm"
                />
                
                {/* Tooltip indicator */}
                {tooltip && tooltip.symbol === stock.symbol && (
                  <>
                    <circle
                      cx={tooltip.x}
                      cy={tooltip.y}
                      r="4"
                      fill={isPositive ? '#10b981' : '#ef4444'}
                      stroke="#1f2937"
                      strokeWidth="2"
                    />
                    <line
                      x1={tooltip.x}
                      y1={padding}
                      x2={tooltip.x}
                      y2={chartHeight - padding}
                      stroke="#6b7280"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.7"
                    />
                  </>
                )}
                
                {/* Fill area under the line */}
                <path
                  d={`${path} L ${chartWidth - padding},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`}
                  fill={isPositive ? '#10b981' : '#ef4444'}
                  fillOpacity="0.1"
                />
              </svg>
              
              {/* Tooltip */}
              {tooltip && tooltip.symbol === stock.symbol && (
                <div
                  className="absolute bg-gray-700 text-white p-2 rounded shadow-lg border border-gray-600 z-50 pointer-events-none"
                  style={{
                    left: tooltip.x + 10,
                    top: tooltip.y - 50,
                    transform: tooltip.x > chartWidth - 80 ? 'translateX(-100%)' : 'none'
                  }}
                >
                  <div className="text-xs font-semibold">{stock.symbol}</div>
                  <div className="text-xs">${tooltip.value.toFixed(2)}</div>
                  <div className="text-xs text-gray-300">{tooltip.date}</div>
                </div>
              )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockTrends;