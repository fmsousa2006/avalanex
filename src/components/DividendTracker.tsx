import React from 'react';
import { Calendar, DollarSign, Clock } from 'lucide-react';

interface DividendData {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  date: string;
  exDividendDate: string;
  paymentDate: string;
  yield: number;
  frequency: string;
  status: 'upcoming' | 'ex-dividend' | 'paid';
}

interface DividendTrackerProps {
  data: DividendData[];
}

const DividendTracker: React.FC<DividendTrackerProps> = ({ data }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'text-blue-400 bg-blue-900/20 border-blue-400/30';
      case 'ex-dividend':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-400/30';
      case 'paid':
        return 'text-emerald-400 bg-emerald-900/20 border-emerald-400/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="w-4 h-4" />;
      case 'ex-dividend':
        return <Calendar className="w-4 h-4" />;
      case 'paid':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {sortedData.map((dividend) => (
        <div
          key={dividend.id}
          className="bg-gray-750 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">{dividend.symbol}</h3>
              <p className="text-xs text-gray-400">{dividend.name}</p>
            </div>
            <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded border ${getStatusColor(dividend.status)}`}>
              {getStatusIcon(dividend.status)}
              <span className="capitalize">{dividend.status.replace('-', ' ')}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Dividend Amount</p>
              <p className="font-semibold text-emerald-400">${dividend.amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400">Yield</p>
              <p className="font-semibold">{dividend.yield.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-400">Ex-Dividend Date</p>
              <p className="font-semibold">{dividend.exDividendDate}</p>
            </div>
            <div>
              <p className="text-gray-400">Payment Date</p>
              <p className="font-semibold">{dividend.paymentDate}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Frequency: {dividend.frequency}</span>
              <span>Next: {dividend.date}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DividendTracker;