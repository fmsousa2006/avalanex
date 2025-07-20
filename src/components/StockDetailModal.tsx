import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3, ExternalLink, Building2 } from 'lucide-react';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockSymbol: string;
  stockName: string;
}

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: number;
  dividend: number;
  dividendYield: number;
  week52Low: number;
  week52High: number;
  volume: string;
  avgVolume: string;
  priceData: {
    [key: string]: {
      prices: number[];
      dates: string[];
      change: number;
      changePercent: number;
    };
  };
  news: Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedAt: string;
    url: string;
  }>;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ isOpen, onClose, stockSymbol, stockName }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [tooltip, setTooltip] = useState<{ ballX: number; ballY: number; price: number; date: string; verticalLineX: number } | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 300 });
  const chartRef = React.useRef<HTMLDivElement>(null);

  const periods = [
    { key: '1d', label: '1D' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '1y', label: '1Y' },
    { key: '3y', label: '3Y' },
    { key: '5y', label: '5Y' }
  ];

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Update chart dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const containerWidth = chartRef.current.offsetWidth;
        const containerHeight = Math.max(300, containerWidth * 0.4); // Maintain aspect ratio
        setChartDimensions({
          width: Math.max(600, containerWidth - 40), // Minimum width with padding
          height: Math.min(containerHeight, 400) // Maximum height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && stockSymbol) {
      // Mock data generation for demonstration
      const generateMockData = () => {
        // NVDA specific values
        const basePrice = 175.50; // Current price between low and high
        const mockData: StockData = {
          symbol: stockSymbol,
          name: stockName,
          currentPrice: 175.50,
          change: 2.45,
          changePercent: 1.42,
          marketCap: '2.8T',
          peRatio: 28.5,
          dividend: 0.96,
          dividendYield: 0.55,
          week52Low: 168.2,
          week52High: 178.4,
          volume: '45.2M',
          avgVolume: '52.8M',
          priceData: {},
          news: [
            {
              id: '1',
              title: `${stockName} Reports Strong Q4 Earnings, Beats Expectations`,
              summary: 'The company delivered exceptional quarterly results with revenue growth of 15% year-over-year, driven by strong product demand and operational efficiency.',
              source: 'Financial Times',
              publishedAt: '2024-01-15T10:30:00Z',
              url: 'https://www.ft.com/content/sample-earnings-report'
            },
            {
              id: '2',
              title: `Analysts Upgrade ${stockSymbol} Price Target Following Innovation Announcement`,
              summary: 'Major investment firms have raised their price targets after the company unveiled breakthrough technology that could revolutionize the industry.',
              source: 'Reuters',
              publishedAt: '2024-01-14T14:20:00Z',
              url: 'https://www.reuters.com/business/technology/sample-price-target-upgrade'
            },
            {
              id: '3',
              title: `${stockName} Announces Strategic Partnership with Tech Giant`,
              summary: 'The new partnership is expected to accelerate growth in emerging markets and strengthen the company\'s competitive position.',
              source: 'Bloomberg',
              publishedAt: '2024-01-13T09:15:00Z',
              url: 'https://www.bloomberg.com/news/articles/sample-strategic-partnership'
            },
            {
              id: '4',
              title: `Market Watch: ${stockSymbol} Shows Resilience Amid Market Volatility`,
              summary: 'Despite broader market concerns, the stock has maintained strong performance due to solid fundamentals and investor confidence.',
              source: 'MarketWatch',
              publishedAt: '2024-01-12T16:45:00Z',
              url: 'https://www.marketwatch.com/story/sample-market-resilience-story'
            }
          ]
        };

        // Generate price data for different periods
        periods.forEach(period => {
          let dataPoints: number;
          let volatility: number;
          let trend: number;

          switch (period.key) {
            case '1d':
              dataPoints = 24;
              volatility = 0.5;
              trend = 0.02;
              break;
            case '7d':
              dataPoints = 7;
              volatility = 1.5;
              trend = 0.05;
              break;
            case '30d':
              dataPoints = 30;
              volatility = 2.0;
              trend = 0.08;
              break;
            case '3m':
              dataPoints = 90;
              volatility = 3.0;
              trend = 0.12;
              break;
            case '6m':
              dataPoints = 180;
              volatility = 4.0;
              trend = 0.15;
              break;
            case '1y':
              dataPoints = 365;
              volatility = 5.0;
              trend = 0.20;
              break;
            case '3y':
              dataPoints = 1095;
              volatility = 8.0;
              trend = 0.35;
              break;
            case '5y':
              dataPoints = 1825;
              volatility = 12.0;
              trend = 0.50;
              break;
            default:
              dataPoints = 7;
              volatility = 1.5;
              trend = 0.05;
          }

          const prices: number[] = [];
          const dates: string[] = [];
          let currentPrice = basePrice * (1 - trend);

          for (let i = 0; i < dataPoints; i++) {
            const randomChange = (Math.random() - 0.5) * volatility;
            const trendChange = trend / dataPoints;
            currentPrice += randomChange + trendChange;
            prices.push(Math.max(currentPrice, 1));

            const date = new Date();
            if (period.key === '1d') {
              date.setHours(date.getHours() - (dataPoints - i - 1));
            } else {
              date.setDate(date.getDate() - (dataPoints - i - 1));
            }
            dates.push(date.toISOString());
          }

          const totalChange = prices[prices.length - 1] - prices[0];
          const totalChangePercent = (totalChange / prices[0]) * 100;

          mockData.priceData[period.key] = {
            prices,
            dates,
            change: totalChange,
            changePercent: totalChangePercent
          };
        });

        return mockData;
      };

      setStockData(generateMockData());
    }
  }, [isOpen, stockSymbol, stockName]);

  if (!isOpen || !stockData) return null;

  const currentPeriodData = stockData.priceData[selectedPeriod];
  const isPositive = currentPeriodData?.changePercent >= 0;

  const chartWidth = chartDimensions.width;
  const chartHeight = chartDimensions.height;
  const padding = 40;

  const formatXAxisLabel = (dateString: string, index: number, total: number) => {
    const date = new Date(dateString);
    
    if (selectedPeriod === '1d') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (selectedPeriod === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (selectedPeriod === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // For longer periods, show fewer labels
      const step = Math.ceil(total / 6);
      if (index % step === 0) {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      return '';
    }
  };

  const formatTooltipDate = (dateString: string) => {
    const date = new Date(dateString);
    if (selectedPeriod === '1d') {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  const createPricePath = () => {
    if (!currentPeriodData) return '';
    
    const { prices } = currentPeriodData;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    if (priceRange === 0) return '';

    const points = prices.map((price, index) => {
      const x = padding + (index / (prices.length - 1)) * (chartWidth - 2 * padding);
      const y = padding + ((maxPrice - price) / priceRange) * (chartHeight - 2 * padding);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!currentPeriodData) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Convert mouse position to SVG coordinates
    const scaleX = chartWidth / rect.width;
    const scaleY = chartHeight / rect.height;
    const svgMouseX = mouseX * scaleX;
    const svgMouseY = mouseY * scaleY;
    
    // Calculate which data point is closest to the mouse
    const chartAreaWidth = chartWidth - 2 * padding;
    const relativeX = Math.max(0, Math.min(chartAreaWidth, svgMouseX - padding));
    const dataIndex = Math.round((relativeX / chartAreaWidth) * (currentPeriodData.prices.length - 1));
    
    if (dataIndex >= 0 && dataIndex < currentPeriodData.prices.length) {
      const price = currentPeriodData.prices[dataIndex];
      const date = currentPeriodData.dates[dataIndex];
      
      const minPrice = Math.min(...currentPeriodData.prices);
      const maxPrice = Math.max(...currentPeriodData.prices);
      const priceRange = maxPrice - minPrice;
      
      // Calculate exact position on the line for both ball and vertical line
      const ballX = padding + (dataIndex / (currentPeriodData.prices.length - 1)) * (chartWidth - 2 * padding);
      const ballY = priceRange === 0 ? chartHeight / 2 : padding + ((maxPrice - price) / priceRange) * (chartHeight - 2 * padding);
      
      // Use mouse X for vertical line alignment
      const verticalLineX = svgMouseX;
      
      setTooltip({ ballX, ballY, price, date, verticalLineX: svgMouseX });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };
  const create52WeekPath = () => {
    // Generate fixed 52-week data using stock symbol as seed for consistency
    const weeks = 52;
    const prices = Array.from({ length: weeks }, (_, i) => {
      const seed = stockData.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      let random = seed + i * 17; // Use index to vary the data points
      random = (random * 9301 + 49297) % 233280;
      const normalizedRandom = random / 233280;
      
      // Create a more realistic price movement with trend
      const basePrice = stockData.week52Low + (stockData.week52High - stockData.week52Low) * 0.3;
      const volatility = (stockData.week52High - stockData.week52Low) * 0.1;
      const trend = (stockData.currentPrice - basePrice) / weeks * i;
      
      return Math.max(
        stockData.week52Low,
        Math.min(
          stockData.week52High,
          basePrice + trend + (normalizedRandom - 0.5) * volatility
        )
      );
    });

    // Ensure the last price is close to current price
    prices[prices.length - 1] = stockData.currentPrice;

    const minPrice = stockData.week52Low;
    const maxPrice = stockData.week52High;
    const priceRange = maxPrice - minPrice;
    const padding = 10;
    const chartAreaHeight = 60;

    const points = prices.map((price, index) => {
      const x = padding + (index / (prices.length - 1)) * (chartWidth - 2 * padding);
      const y = padding + ((maxPrice - price) / priceRange) * chartAreaHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-800 rounded-lg">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{stockData.symbol}</h2>
              <p className="text-gray-400">{stockData.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Price and Stats */}
        <div className="p-6 border-b border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-bold">${stockData.currentPrice.toFixed(2)}</span>
                <div className="flex items-center space-x-1">
                  {isPositive ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`text-lg font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}${currentPeriodData?.change.toFixed(2)} ({isPositive ? '+' : ''}{currentPeriodData?.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <p className="text-gray-400 mt-1">{selectedPeriod.toUpperCase()} Performance</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Market Cap</p>
                <p className="font-semibold">{stockData.marketCap}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">P/E Ratio</p>
                <p className="font-semibold">{stockData.peRatio}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Volume</p>
                <p className="font-semibold">{stockData.volume}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Volume</p>
                <p className="font-semibold">{stockData.avgVolume}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Share Price</h3>
            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
              {periods.map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedPeriod === period.key ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart container with mouse event handling */}
          <div 
            className="bg-gray-800 rounded-lg p-4 relative" 
            ref={chartRef}
            onMouseLeave={() => setTooltip(null)}
          >
            <svg 
              width={chartWidth} 
              height={chartHeight} 
              className="w-full h-auto cursor-crosshair"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Grid */}
              <defs>
                <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width={chartWidth} height={chartHeight} fill="url(#grid)" />
              
              {/* Price line */}
              <path
                d={createPricePath()}
                fill="none"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth="3"
                className="drop-shadow-sm"
              />
              
              {/* Fill area */}
              <path
                d={`${createPricePath()} L ${chartWidth - padding},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`}
                fill={isPositive ? '#10b981' : '#ef4444'}
                fillOpacity="0.1"
              />
              
              {/* Tooltip indicator */}
              {tooltip && (
                <>
                  <circle
                    cx={tooltip.ballX}
                    cy={tooltip.ballY}
                    r="4"
                    fill={isPositive ? '#10b981' : '#ef4444'}
                    stroke="#1f2937"
                    strokeWidth="2"
                  />
                  <line
                    x1={tooltip.verticalLineX}
                    y1={padding}
                    x2={tooltip.verticalLineX}
                    y2={chartHeight - padding}
                    stroke="#6b7280"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.7"
                  />
                </>
              )}
            </svg>
            
            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute bg-gray-700 text-white p-2 rounded shadow-lg border border-gray-600 z-50 pointer-events-none"
                style={{
                  left: tooltip.ballX + 10,
                  top: tooltip.ballY - 50,
                  transform: tooltip.ballX > chartWidth - 80 ? 'translateX(-100%)' : 'none'
                }}
              >
                <div className="text-xs font-semibold">{stockData.symbol}</div>
                <div className="text-xs">${tooltip.price.toFixed(2)}</div>
                <div className="text-xs text-gray-300">{formatTooltipDate(tooltip.date)}</div>
              </div>
            )}
          </div>
        </div>

        {/* 52 Week Range */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold mb-4">52 Week Range</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="relative">
              <svg 
                width="100%" 
                height="120" 
                className="w-full"
                viewBox="0 0 800 120"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Main horizontal line (52-week range) */}
                <line
                  x1={40}
                  y1={60}
                  x2={760}
                  y2={60}
                  stroke="#3b82f6"
                  strokeWidth="4"
                />
                
                {/* Current price indicator ball */}
                <circle
                  cx={40 + ((stockData.currentPrice - stockData.week52Low) / (stockData.week52High - stockData.week52Low)) * 720}
                  cy={60}
                  r="8"
                  fill="#3b82f6"
                  stroke="#1f2937"
                  strokeWidth="2"
                />
                
                {/* 52W Low label */}
                <text
                  x={40}
                  y={45}
                  textAnchor="middle"
                  className="fill-red-400 text-sm font-semibold"
                >
                  $168.20
                </text>
                <text
                  x={40}
                  y={85}
                  textAnchor="middle"
                  className="fill-gray-400 text-xs"
                >
                  52W Low
                </text>
                <text
                  x={40}
                  y={100}
                  textAnchor="middle"
                  className="fill-gray-500 text-xs"
                >
                  Jan 2024
                </text>
                
                {/* 52W High label */}
                <text
                  x={760}
                  y={45}
                  textAnchor="middle"
                  className="fill-emerald-400 text-sm font-semibold"
                >
                  $178.40
                </text>
                <text
                  x={760}
                  y={85}
                  textAnchor="middle"
                  className="fill-gray-400 text-xs"
                >
                  52W High
                </text>
                <text
                  x={760}
                  y={100}
                  textAnchor="middle"
                  className="fill-gray-500 text-xs"
                >
                  Dec 2024
                </text>
                
                {/* Current price label */}
                <text
                  x={40 + ((stockData.currentPrice - stockData.week52Low) / (stockData.week52High - stockData.week52Low)) * 720}
                  y={25}
                  textAnchor="middle"
                  className="fill-white text-sm font-semibold"
                >
                  $175.50
                </text>
                <text
                  x={40 + ((stockData.currentPrice - stockData.week52Low) / (stockData.week52High - stockData.week52Low)) * 720}
                  y={105}
                  textAnchor="middle"
                  className="fill-gray-400 text-xs"
                >
                  Current
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-semibold">Company Details</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Dividend</p>
              <p className="font-semibold">${stockData.dividend.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Dividend Yield</p>
              <p className="font-semibold">{stockData.dividendYield.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">52W Low</p>
              <p className="font-semibold text-red-400">${stockData.week52Low.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">52W High</p>
              <p className="font-semibold text-emerald-400">${stockData.week52High.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Latest News */}
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Latest News</h3>
          <div className="space-y-4">
            {stockData.news.map((article) => (
              <div key={article.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <a 
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold mb-2 hover:text-emerald-400 cursor-pointer transition-colors block"
                    >
                      {article.title}
                    </a>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{article.source}</span>
                      <span>{formatTimeAgo(article.publishedAt)}</span>
                    </div>
                  </div>
                  <a 
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500 hover:text-emerald-400 cursor-pointer transition-colors" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;