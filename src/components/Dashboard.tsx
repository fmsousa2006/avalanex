import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, PieChart, Activity, Menu, Plus, MoreHorizontal } from 'lucide-react';
import PortfolioChart from './PortfolioChart';
import StockTrends from './StockTrends';
import TransactionHistory from './TransactionHistory';
import DividendTracker from './DividendTracker';
import DividendCalendar from './DividendCalendar';
import DividendsReceived from './DividendsReceived';
import Sidebar from './Sidebar';
import PortfolioModal from './PortfolioModal';
import { portfolioData, stockTrendsData, transactionData, dividendData } from '../data/mockData';

interface PortfolioItem {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  cost: number;
  change: number;
  changePercent: number;
}

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

const Dashboard: React.FC = () => {
  const [currentPortfolioData, setCurrentPortfolioData] = useState<PortfolioItem[]>(portfolioData);
  const [currentTransactionData, setCurrentTransactionData] = useState<Transaction[]>(transactionData);
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isPortfolioMenuOpen, setIsPortfolioMenuOpen] = useState(false);

  // Handle escape key for portfolio menu
  React.useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPortfolioMenuOpen) {
        setIsPortfolioMenuOpen(false);
      }
    };

    if (isPortfolioMenuOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isPortfolioMenuOpen]);

  const totalValue = currentPortfolioData.reduce((sum, stock) => sum + stock.value, 0);
  const totalGain = currentPortfolioData.reduce((sum, stock) => sum + (stock.value - stock.cost), 0);
  const gainPercentage = (totalGain / (totalValue - totalGain)) * 100;

  const dayChange = 2847.32;
  const dayChangePercent = 1.24;

  const handlePortfolioTransaction = (transactionData: {
    ticker: string;
    operation: 'buy' | 'sell';
    date: string;
    shares: string;
    price: string;
    currency: string;
    fee: string;
  }) => {
    const shares = parseInt(transactionData.shares);
    const price = parseFloat(transactionData.price);
    const fee = parseFloat(transactionData.fee || '0');
    const amount = shares * price;
    
    // Create new transaction record
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      symbol: transactionData.ticker,
      type: transactionData.operation,
      shares: shares,
      price: price,
      amount: amount,
      date: transactionData.date,
      status: 'completed'
    };
    
    // Update transaction history
    setCurrentTransactionData(prev => [newTransaction, ...prev]);
    
    // Update portfolio data
    setCurrentPortfolioData(prev => {
      const existingStockIndex = prev.findIndex(stock => stock.symbol === transactionData.ticker);
      
      if (existingStockIndex >= 0) {
        // Update existing stock
        const updatedPortfolio = [...prev];
        const existingStock = updatedPortfolio[existingStockIndex];
        
        if (transactionData.operation === 'buy') {
          // Calculate new averages for buy operation
          const totalShares = existingStock.shares + shares;
          const totalCost = existingStock.cost + amount;
          const newAveragePrice = totalCost / totalShares;
          
          updatedPortfolio[existingStockIndex] = {
            ...existingStock,
            shares: totalShares,
            price: price,
            value: totalShares * price,
            cost: totalCost,
            change: (totalShares * price) - totalCost,
            changePercent: ((totalShares * price) - totalCost) / totalCost * 100
          };
        } else {
          // Sell operation
          const remainingShares = Math.max(0, existingStock.shares - shares);
          const proportionalCost = (remainingShares / existingStock.shares) * existingStock.cost;
          
          if (remainingShares > 0) {
            updatedPortfolio[existingStockIndex] = {
              ...existingStock,
              shares: remainingShares,
              price: price,
              value: remainingShares * price,
              cost: proportionalCost,
              change: (remainingShares * price) - proportionalCost,
              changePercent: ((remainingShares * price) - proportionalCost) / proportionalCost * 100
            };
          } else {
            // Remove stock if no shares remaining
            updatedPortfolio.splice(existingStockIndex, 1);
          }
        }
        
        return updatedPortfolio;
      } else if (transactionData.operation === 'buy') {
        // Add new stock to portfolio
        const newStock: PortfolioItem = {
          symbol: transactionData.ticker,
          name: `${transactionData.ticker} Inc.`, // In a real app, you'd fetch the company name
          shares: shares,
          price: price,
          value: amount,
          cost: amount,
          change: 0,
          changePercent: 0
        };
        
        return [...prev, newStock];
      }
      
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={setIsSidebarOpen}
        onPortfolioClick={() => setIsPortfolioModalOpen(true)}
      />
      
      {/* Main Content */}
      <div className="flex-1">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Portfolio Value</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Today's Change</p>
              <div className="flex items-center space-x-1">
                {dayChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-lg font-semibold ${dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${Math.abs(dayChange).toLocaleString()} ({dayChangePercent >= 0 ? '+' : ''}{dayChangePercent}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Invested</p>
                <p className="text-2xl font-bold">${(totalValue - totalGain).toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Gain/Loss</p>
                <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${totalGain >= 0 ? '+' : ''}{totalGain.toLocaleString()}
                </p>
              </div>
              {totalGain >= 0 ? (
                <TrendingUp className="w-8 h-8 text-emerald-400" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-400" />
              )}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Return %</p>
                <p className={`text-2xl font-bold ${gainPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {gainPercentage >= 0 ? '+' : ''}{gainPercentage.toFixed(2)}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Next Dividend</p>
                <p className="text-2xl font-bold">${dividendData[0]?.amount || '0'}</p>
                <p className="text-xs text-gray-400">{dividendData[0]?.date || 'N/A'}</p>
              </div>
              <Calendar 
                className="w-8 h-8 text-yellow-400 cursor-pointer hover:text-yellow-300 transition-colors" 
                onClick={() => setIsCalendarOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Portfolio Composition */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-6">
              <div className="flex items-center space-x-2 flex-1">
                <PieChart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-semibold">Portfolio Composition</h2>
              </div>
              <div className="flex items-center space-x-2">
                {/* Add Transaction Button */}
                <button
                  onClick={() => setIsPortfolioModalOpen(true)}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  title="Add Transaction"
                >
                  <Plus className="w-4 h-4" />
                </button>
                
                {/* More Options Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsPortfolioMenuOpen(!isPortfolioMenuOpen)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="More Options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isPortfolioMenuOpen && (
                    <div className="absolute right-0 top-12 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setIsPortfolioMenuOpen(false);
                            // Add export functionality here
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                        >
                          Export Portfolio
                        </button>
                        <button
                          onClick={() => {
                            setIsPortfolioMenuOpen(false);
                            // Add import functionality here
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                        >
                          Import Transactions
                        </button>
                        <button
                          onClick={() => {
                            setIsPortfolioMenuOpen(false);
                            // Add rebalance functionality here
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                        >
                          Rebalance Portfolio
                        </button>
                        <hr className="border-gray-600 my-1" />
                        <button
                          onClick={() => {
                            setIsPortfolioMenuOpen(false);
                            // Add settings functionality here
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                        >
                          Portfolio Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <PortfolioChart 
              data={currentPortfolioData} 
              onHover={setHoveredStock}
              hoveredStock={hoveredStock}
            />
          </div>

          {/* Stock Trends */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-6">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold">Top 3 Holdings (30 Days)</h2>
            </div>
            <StockTrends data={currentPortfolioData} />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Dividends Received */}
          <div className="xl:col-span-3">
            <DividendsReceived />
          </div>
        </div>

        {/* Transaction and Dividend Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction History */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6">Last Transactions</h2>
            <TransactionHistory data={currentTransactionData} />
          </div>

          {/* Dividend Tracker */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6">Upcoming Dividends</h2>
            <DividendTracker data={dividendData} />
          </div>
        </div>
      </div>
      </div>
      
      {/* Dividend Calendar Modal */}
      <DividendCalendar 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
      />
      
      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        onSave={handlePortfolioTransaction}
      />
    </div>
  );
};

export default Dashboard;