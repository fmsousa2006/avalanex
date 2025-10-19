import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStockColor } from '../utils/stockColors';

interface PositionsProps {
  onBack: () => void;
}

interface Position {
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  value: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  percentage: number;
}

const Positions: React.FC<PositionsProps> = ({ onBack }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalGainLoss, setTotalGainLoss] = useState(0);
  const [totalGainLossPercent, setTotalGainLossPercent] = useState(0);
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    fetchPositions();
    fetchUserPreferences();
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('preferred_currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefs?.preferred_currency === 'EUR') {
        setCurrencySymbol('€');
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id);

      if (!portfolios || portfolios.length === 0) {
        setPositions([]);
        setLoading(false);
        return;
      }

      const portfolioIds = portfolios.map(p => p.id);

      const { data: holdings } = await supabase
        .from('portfolio_holdings')
        .select(`
          *,
          stocks:stock_id (
            id,
            symbol,
            name,
            current_price
          )
        `)
        .in('portfolio_id', portfolioIds);

      if (!holdings || holdings.length === 0) {
        setPositions([]);
        setLoading(false);
        return;
      }

      const stockMap = new Map<string, {
        symbol: string;
        name: string;
        shares: number;
        costBasis: number;
        stockId: string;
      }>();

      holdings.forEach((holding: any) => {
        const symbol = holding.stocks?.symbol;
        if (!symbol) return;

        const sharesCount = holding.shares || 0;
        const avgCost = parseFloat(holding.average_cost) || 0;

        if (stockMap.has(symbol)) {
          const existing = stockMap.get(symbol)!;
          existing.shares += sharesCount;
          existing.costBasis += sharesCount * avgCost;
        } else {
          stockMap.set(symbol, {
            symbol,
            name: holding.stocks.name,
            shares: sharesCount,
            costBasis: sharesCount * avgCost,
            stockId: holding.stocks.id,
          });
        }
      });

      const stockIds = Array.from(stockMap.values()).map(s => s.stockId);
      const { data: priceData } = await supabase
        .from('stock_prices_1d')
        .select('stock_id, close_price')
        .in('stock_id', stockIds)
        .order('timestamp', { ascending: false });

      const latestPrices = new Map<string, number>();
      priceData?.forEach((p: any) => {
        if (!latestPrices.has(p.stock_id)) {
          latestPrices.set(p.stock_id, parseFloat(p.close_price) || 0);
        }
      });

      let totalPortfolioValue = 0;
      let totalCost = 0;

      const positionsData: Position[] = Array.from(stockMap.entries()).map(([symbol, data]) => {
        const currentPrice = latestPrices.get(data.stockId) || parseFloat(holdings.find(h => h.stocks?.symbol === symbol)?.stocks?.current_price) || 0;
        const value = data.shares * currentPrice;
        const gainLoss = value - data.costBasis;
        const gainLossPercent = data.costBasis > 0 ? (gainLoss / data.costBasis) * 100 : 0;

        totalPortfolioValue += value;
        totalCost += data.costBasis;

        return {
          symbol,
          name: data.name,
          shares: data.shares,
          currentPrice,
          value,
          costBasis: data.costBasis,
          gainLoss,
          gainLossPercent,
          percentage: 0,
        };
      });

      positionsData.forEach(pos => {
        pos.percentage = totalPortfolioValue > 0 ? (pos.value / totalPortfolioValue) * 100 : 0;
      });

      positionsData.sort((a, b) => b.value - a.value);

      const overallGainLoss = totalPortfolioValue - totalCost;
      const overallGainLossPercent = totalCost > 0 ? (overallGainLoss / totalCost) * 100 : 0;

      setPositions(positionsData);
      setTotalValue(totalPortfolioValue);
      setTotalGainLoss(overallGainLoss);
      setTotalGainLossPercent(overallGainLossPercent);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDonutChart = () => {
    if (positions.length === 0) return null;

    const centerX = 200;
    const centerY = 200;
    const outerRadius = 150;
    const innerRadius = 100;
    let currentAngle = -90;

    const createArc = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + outerR * Math.cos(startRad);
      const y1 = centerY + outerR * Math.sin(startRad);
      const x2 = centerX + outerR * Math.cos(endRad);
      const y2 = centerY + outerR * Math.sin(endRad);

      const x3 = centerX + innerR * Math.cos(endRad);
      const y3 = centerY + innerR * Math.sin(endRad);
      const x4 = centerX + innerR * Math.cos(startRad);
      const y4 = centerY + innerR * Math.sin(startRad);

      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      return `
        M ${x1} ${y1}
        A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}
        Z
      `;
    };

    return (
      <div className="relative flex items-center justify-center">
        <svg width="400" height="400" viewBox="0 0 400 400" className="transform">
          {positions.map((position, index) => {
            const angle = (position.percentage / 100) * 360;
            const endAngle = currentAngle + angle;
            const path = createArc(currentAngle, endAngle, outerRadius, innerRadius);
            const color = getStockColor(position.symbol);

            const isHovered = hoveredPosition === position.symbol;
            const hoverOuterRadius = isHovered ? outerRadius + 8 : outerRadius;
            const hoverPath = isHovered ? createArc(currentAngle, endAngle, hoverOuterRadius, innerRadius) : path;

            currentAngle = endAngle;

            return (
              <path
                key={position.symbol}
                d={hoverPath}
                fill={color}
                opacity={hoveredPosition && !isHovered ? 0.4 : 1}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredPosition(position.symbol)}
                onMouseLeave={() => setHoveredPosition(null)}
              />
            );
          })}
        </svg>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-gray-400 text-sm mb-2">Total Net Worth</div>
          <div className="text-white text-4xl font-bold">
            {currencySymbol}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm mt-2 flex items-center justify-center ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalGainLoss >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {totalGainLoss >= 0 ? '+' : ''}{currencySymbol}{Math.abs(totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="ml-2">({totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-white text-xl">Loading positions...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-white">Portfolio Positions</h1>
          <div className="w-20"></div>
        </div>

        {positions.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <p className="text-gray-400 text-lg">No positions found. Start building your portfolio!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 flex items-center justify-center">
              {renderDonutChart()}
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Position Details</h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {positions.map((position) => (
                  <div
                    key={position.symbol}
                    className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                      hoveredPosition === position.symbol
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-gray-750 border-gray-700 hover:bg-gray-700'
                    }`}
                    onMouseEnter={() => setHoveredPosition(position.symbol)}
                    onMouseLeave={() => setHoveredPosition(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getStockColor(position.symbol) }}
                        />
                        <div>
                          <div className="text-white font-semibold">{position.symbol}</div>
                          <div className="text-gray-400 text-sm">{position.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {currencySymbol}{(position.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-gray-400 text-sm">{(position.percentage || 0).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-400">
                        {(position.shares || 0).toLocaleString()} shares @ {currencySymbol}{(position.currentPrice || 0).toFixed(2)}
                      </div>
                      <div className={`flex items-center ${(position.gainLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(position.gainLoss || 0) >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {(position.gainLoss || 0) >= 0 ? '+' : ''}{currencySymbol}{Math.abs(position.gainLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-1">({(position.gainLossPercent || 0) >= 0 ? '+' : ''}{(position.gainLossPercent || 0).toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Positions;
