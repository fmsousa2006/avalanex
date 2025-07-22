import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';

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
  onDeleteTransaction?: (transactionId: string) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ data, onDeleteTransaction }) => {
  const [swipedTransaction, setSwipedTransaction] = React.useState<string | null>(null);
  const [startX, setStartX] = React.useState<number>(0);
  const [currentX, setCurrentX] = React.useState<number>(0);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);

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

  const handleMouseDown = (e: React.MouseEvent, transactionId: string) => {
    setStartX(e.clientX);
    setCurrentX(e.clientX);
    setSwipedTransaction(transactionId);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !swipedTransaction) return;
    setCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging || !swipedTransaction) return;
    
    const deltaX = startX - currentX;
    
    // If swiped left more than 100px, keep the delete button visible
    if (deltaX < 100) {
      setSwipedTransaction(null);
    }
    
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent, transactionId: string) => {
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setCurrentX(touch.clientX);
    setSwipedTransaction(transactionId);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !swipedTransaction) return;
    const touch = e.touches[0];
    setCurrentX(touch.clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !swipedTransaction) return;
    
    const deltaX = startX - currentX;
    
    // If swiped left more than 100px, keep the delete button visible
    if (deltaX < 100) {
      setSwipedTransaction(null);
    }
    
    setIsDragging(false);
  };

  const handleDeleteClick = (transactionId: string) => {
    if (onDeleteTransaction) {
      onDeleteTransaction(transactionId);
    }
    setSwipedTransaction(null);
  };

  const getTransformX = (transactionId: string) => {
    if (swipedTransaction !== transactionId) return 0;
    if (!isDragging) return swipedTransaction === transactionId ? -120 : 0;
    
    const deltaX = startX - currentX;
    return Math.min(0, Math.max(-120, -deltaX));
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden">
      {data.map((transaction) => (
        <div 
          key={transaction.id}
          className="relative bg-gray-750 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
        >
          {/* Delete Button Background */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-red-600 rounded-r-lg flex items-center justify-center">
            <button
              onClick={() => handleDeleteClick(transaction.id)}
              className="text-white hover:text-red-200 transition-colors p-2"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>

          {/* Transaction Content */}
          <div 
            className="relative bg-gray-750 rounded-lg p-4 cursor-grab active:cursor-grabbing transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${getTransformX(transaction.id)}px)` }}
            onMouseDown={(e) => handleMouseDown(e, transaction.id)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => handleTouchStart(e, transaction.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
        </div>
      ))}
      
      {/* Instructions */}
      {data.length > 0 && (
        <div className="text-center text-xs text-gray-500 mt-4 p-2">
          💡 Swipe left on any transaction to delete it
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
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