import React from 'react';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface Stock {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface TopGainersLosersProps {
  data: Stock[];
  type: 'gainers' | 'losers';
}

export const TopGainersLosers: React.FC<TopGainersLosersProps> = ({ data, type }) => {
  const isGainers = type === 'gainers';

  const sortedData = [...data]
    .sort((a, b) => isGainers ? b.changePercent - a.changePercent : a.changePercent - b.changePercent)
    .filter(stock => isGainers ? stock.changePercent > 0 : stock.changePercent < 0)
    .slice(0, 5);

  const getStockIcon = (symbol: string) => {
    const colors = [
      'bg-green-500',
      'bg-blue-500',
      'bg-orange-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-cyan-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-emerald-500'
    ];

    const index = symbol.charCodeAt(0) % colors.length;
    return (
      <div className={`w-10 h-10 ${colors[index]} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
        {symbol.charAt(0)}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold text-white">
            {isGainers ? 'Top day gainers' : 'Top day losers'}
          </h2>
          <HelpCircle className="w-4 h-4 text-gray-500" />
        </div>
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
      </div>

      {sortedData.length > 0 ? (
        <div className="space-y-4">
          {sortedData.map((stock) => (
            <div key={stock.symbol} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
              <div className="flex items-center space-x-3 flex-1">
                {getStockIcon(stock.symbol)}
                <div className="flex-1">
                  <div className="font-semibold text-white">{stock.name}</div>
                  <div className="text-sm text-gray-400">{stock.symbol}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-white mb-1">
                  ${stock.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center justify-end space-x-1 text-sm ${
                  stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {stock.changePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    ({stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className={`w-16 h-16 ${isGainers ? 'bg-emerald-500/10' : 'bg-red-500/10'} rounded-full flex items-center justify-center mx-auto mb-3`}>
            {isGainers ? (
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-400" />
            )}
          </div>
          <p className="text-gray-400">
            No {isGainers ? 'gainers' : 'losers'} today
          </p>
        </div>
      )}
    </div>
  );
};
