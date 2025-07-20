import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'dividend';
  shares?: number;
  price?: number;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
}

interface TransactionHistoryProps {
  data: Transaction[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ data }) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <ArrowDownRight className="w-4 h-4 text-red-400" />;
      case 'sell':
        return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
      case 'dividend':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      default:
        return <TrendingUp className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'text-red-400';
      case 'sell':
        return 'text-emerald-400';
      case 'dividend':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {data.map((transaction) => (
        <div
          key={transaction.id}
          className="bg-gray-750 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-lg">
                {getTransactionIcon(transaction.type)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{transaction.symbol}</span>
                  <span className={`text-sm capitalize ${getTransactionColor(transaction.type)}`}>
                    {transaction.type}
                  </span>
                  {transaction.status === 'pending' && (
                    <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {transaction.shares && (
                    <>
                      {transaction.shares} shares @ ${transaction.price?.toFixed(2)}
                    </>
                  )}
                  {transaction.type === 'dividend' && 'Dividend Payment'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                {transaction.type === 'buy' ? '-' : '+'}${transaction.amount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">{transaction.date}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionHistory;