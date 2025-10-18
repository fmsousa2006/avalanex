import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Trash2, Edit3 } from 'lucide-react';

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
  onEditTransaction?: (transactionId: string) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ data, onDeleteTransaction, onEditTransaction }) => {
  const [swipedTransaction, setSwipedTransaction] = React.useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = React.useState<'left' | 'right' | null>(null);
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
    setSwipeDirection(null);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !swipedTransaction) return;
    setCurrentX(e.clientX);
    
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 10) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || !swipedTransaction) return;
    
    const deltaX = currentX - startX;
    
    // If swiped more than 100px, keep the button visible
    if (Math.abs(deltaX) < 100) {
      setSwipedTransaction(null);
      setSwipeDirection(null);
    }
    
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent, transactionId: string) => {
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setCurrentX(touch.clientX);
    setSwipedTransaction(transactionId);
    setSwipeDirection(null);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !swipedTransaction) return;
    const touch = e.touches[0];
    setCurrentX(touch.clientX);
    
    const deltaX = touch.clientX - startX;
    if (Math.abs(deltaX) > 10) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !swipedTransaction) return;
    
    const deltaX = currentX - startX;
    
    // If swiped more than 100px, keep the button visible
    if (Math.abs(deltaX) < 100) {
      setSwipedTransaction(null);
      setSwipeDirection(null);
    }
    
    setIsDragging(false);
  };

  const handleDeleteClick = (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      setSwipedTransaction(null);
      setSwipeDirection(null);
      return;
    }
    
    if (onDeleteTransaction) {
      onDeleteTransaction(transactionId);
    }
    setSwipedTransaction(null);
    setSwipeDirection(null);
  };

  const handleEditClick = (transactionId: string) => {
    if (onEditTransaction) {
      onEditTransaction(transactionId);
    }
    setSwipedTransaction(null);
    setSwipeDirection(null);
  };

  const getTransformX = (transactionId: string) => {
    if (swipedTransaction !== transactionId) return 0;
    if (!isDragging) {
      return swipeDirection === 'left' ? -120 : swipeDirection === 'right' ? 120 : 0;
    }
    
    const deltaX = currentX - startX;
    return Math.max(-120, Math.min(120, deltaX));
  };

  const shouldShowButton = (transactionId: string, buttonType: 'delete' | 'edit') => {
    if (swipedTransaction !== transactionId) return false;
    
    const transform = getTransformX(transactionId);
    if (buttonType === 'delete') {
      return (isDragging && swipeDirection === 'left') || transform === -120;
    } else {
      return (isDragging && swipeDirection === 'right') || transform === 120;
    }
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden">
      {data.map((transaction) => (
        <div 
          key={transaction.id}
          className="relative bg-gray-750 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors overflow-hidden"
        >
          {/* Delete Button Background */}
          <div className={`absolute right-0 top-0 bottom-0 w-32 bg-red-600 rounded-r-lg flex items-center justify-center transition-opacity ${
            shouldShowButton(transaction.id, 'delete') ? 'opacity-100' : 'opacity-0'
          }`}>
            <button
              onClick={() => handleDeleteClick(transaction.id)}
              className="text-white hover:text-red-200 transition-colors p-2"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>

          {/* Edit Button Background */}
          <div className={`absolute left-0 top-0 bottom-0 w-32 bg-blue-600 rounded-l-lg flex items-center justify-center transition-opacity ${
            shouldShowButton(transaction.id, 'edit') ? 'opacity-100' : 'opacity-0'
          }`}>
            <button
              onClick={() => handleEditClick(transaction.id)}
              className="text-white hover:text-blue-200 transition-colors p-2"
            >
              <Edit3 className="w-6 h-6" />
            </button>
          </div>
          {/* Transaction Content */}
          <div 
            className="relative bg-gray-800 rounded-lg p-4 cursor-grab active:cursor-grabbing transition-transform duration-200 ease-out z-10"
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
          💡 Swipe left to delete • Swipe right to edit
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;