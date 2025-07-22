import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, PieChart, Activity, Menu, Plus, MoreHorizontal, RefreshCw } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import PortfolioChart from './PortfolioChart';
import StockTrends from './StockTrends';
import TransactionHistory from './TransactionHistory';
import DividendTracker from './DividendTracker';
import DividendCalendar from './DividendCalendar';
import DividendsReceived from './DividendsReceived';
import Sidebar from './Sidebar';
import PortfolioModal from './PortfolioModal';
import TestingModal from './TestingModal';

console.log('🏠 Dashboard.tsx loading...');

const Dashboard: React.FC = () => {
  console.log('🏠 Dashboard component rendering...');
  
  const {
    portfolios,
    currentPortfolio,
    holdings,
    transactions,
    dividends,
    loading,
    error,
    isUsingMockData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getPortfolioData
  } = usePortfolio();
  
  // Add stock prices hook for real-time data
  const { 
    updateStockPricesWithHistoricalData, 
    loading: pricesLoading,
    isConfigured: isFinnhubConfigured,
    testSyncO1D,
    testSyncNVDA1D
  } = useStockPrices();

  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isTestingModalOpen, setIsTestingModalOpen] = useState(false);
  const [isPortfolioMenuOpen, setIsPortfolioMenuOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<{
    id: string;
    ticker: string;
    operation: 'buy' | 'sell';
    date: string;
    shares: string;
    price: string;
    currency: string;
    fee: string;
  } | null>(null);

  // Function to sync all portfolio stock prices
  const handleSyncPortfolioPrices = async () => {
    if (!isFinnhubConfigured) {
      alert('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file.');
      return;
    }
    
    // Get all unique stock symbols from current portfolio
    const portfolioSymbols = currentPortfolioData.map(stock => stock.symbol);
    
    if (portfolioSymbols.length === 0) {
      alert('No stocks in portfolio to sync.');
      return;
    }
    
    try {
      console.log('Syncing portfolio stock prices:', portfolioSymbols);
      // Sync historical data incrementally (only missing data points)
      const results = await updateStockPricesWithHistoricalData(portfolioSymbols);
      
      if (results.success.length > 0) {
        alert(`Successfully synced ${results.success.length} stocks!${results.failed.length > 0 ? ` Failed to sync: ${results.failed.join(', ')}` : ''}`);
        
        // Refresh portfolio data to show updated prices
        if (currentPortfolio) {
          await Promise.all([
            fetchHoldings(currentPortfolio.id),
            fetchTransactions(currentPortfolio.id)
          ]);
        }
      } else {
        alert('Failed to sync stock data. Check console for details.');
      }
    } catch (error) {
      console.error('Error syncing stock data:', error);
      alert('Error syncing stock data: ' + (error as Error).message);
    }
  };

  // Test sync O 1D data
  const handleTestSyncO1D = async () => {
    if (!isFinnhubConfigured) {
      alert('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file.');
      return;
    }
    
    try {
      console.log('🧪 Starting test sync for O 1D data...');
      await testSyncO1D();
      alert('✅ Test sync completed! Check console for details.');
    } catch (error) {
      console.error('❌ Test sync failed:', error);
      alert('❌ Test sync failed: ' + (error as Error).message);
    }
  };

  // Test sync NVIDIA 1D data
  const handleTestSyncNVDA1D = async () => {
    if (!isFinnhubConfigured) {
      alert('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file.');
      return;
    }
    
    try {
      console.log('🧪 Starting test sync for NVIDIA 1D data...');
      await testSyncNVDA1D();
      alert('✅ NVIDIA test sync completed! Check console for details.');
    } catch (error) {
      console.error('❌ NVIDIA test sync failed:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.startsWith('FINNHUB_WARNING:')) {
        alert('⚠️ NVIDIA test sync partially completed: ' + errorMessage.replace('FINNHUB_WARNING: ', ''));
      } else {
        alert('❌ NVIDIA test sync failed: ' + errorMessage);
      }
    }
  };
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

  // Get portfolio data in the format expected by components
  const currentPortfolioData = getPortfolioData();

  // Convert transactions to the format expected by TransactionHistory component
  const currentTransactionData = transactions.map(transaction => ({
    id: transaction.id,
    symbol: transaction.stock?.symbol || '',
    type: transaction.type,
    shares: transaction.shares,
    price: transaction.price,
    amount: transaction.amount,
    date: transaction.transaction_date,
    status: transaction.status
  }));

  // Convert dividends to the format expected by DividendTracker component
  const dividendData = dividends.map(dividend => ({
    id: dividend.id,
    symbol: dividend.stock?.symbol || '',
    name: dividend.stock?.name || '',
    amount: dividend.amount,
    date: dividend.payment_date,
    exDividendDate: dividend.ex_dividend_date,
    paymentDate: dividend.payment_date,
    yield: dividend.dividend_yield || 0,
    frequency: dividend.frequency,
    status: dividend.status
  }));

  const totalValue = currentPortfolioData.reduce((sum, stock) => sum + stock.value, 0);
  const totalGain = currentPortfolioData.reduce((sum, stock) => sum + (stock.value - stock.cost), 0);
  const gainPercentage = (totalGain / (totalValue - totalGain)) * 100;

  const dayChange = 2847.32;
  const dayChangePercent = 1.24;

  const handlePortfolioTransaction = async (transactionData: {
    ticker: string;
    operation: 'buy' | 'sell';
    date: string;
    shares: string;
    price: string;
    currency: string;
    fee: string;
  }) => {
    try {
      if (editingTransaction) {
        // Update existing transaction
        await updateTransaction(editingTransaction.id, transactionData);
        setEditingTransaction(null);
      } else {
        // Add new transaction
        await addTransaction(transactionData);
      }
      setIsPortfolioModalOpen(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error adding transaction: ' + (error as Error).message);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction: ' + (error as Error).message);
    }
  };

  const handleEditTransaction = async (transactionId: string) => {
    // Find the transaction to edit
    const transactionToEdit = transactions.find(t => t.id === transactionId);
    
    if (!transactionToEdit) {
      alert('Transaction not found');
      return;
    }

    // Prepare edit data
    const editData = {
      id: transactionToEdit.id,
      ticker: transactionToEdit.stock?.symbol || '',
      operation: transactionToEdit.type as 'buy' | 'sell',
      date: transactionToEdit.transaction_date,
      shares: transactionToEdit.shares?.toString() || '0',
      price: transactionToEdit.price?.toString() || '0',
      currency: transactionToEdit.currency,
      fee: transactionToEdit.fee.toString()
    };

    setEditingTransaction(editData);
    setIsPortfolioModalOpen(true);
  };

  const handleClosePortfolioModal = () => {
    setIsPortfolioModalOpen(false);
    setEditingTransaction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-4">Error loading portfolio</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={setIsSidebarOpen}
        onPortfolioClick={() => setIsPortfolioModalOpen(true)}
        onTestingClick={() => setIsTestingModalOpen(true)}
      />
      
      {/* Main Content */}
      <div className="flex-1">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
            </div>
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
                  disabled={!currentPortfolio && !isUsingMockData}
                  className={`p-2 rounded-lg transition-colors ${
                    !currentPortfolio && !isUsingMockData
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
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
              {/* Test Button for Realty Income Price Update */}
              <button
                onClick={handleSyncPortfolioPrices}
                disabled={pricesLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pricesLoading 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                title="Sync all portfolio stock prices from Finnhub"
              >
                <RefreshCw className={`w-4 h-4 ${pricesLoading ? 'animate-spin' : ''}`} />
              </button>
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
            <DividendsReceived portfolioId={currentPortfolio?.id} />
          </div>
        </div>

        {/* Transaction and Dividend Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction History */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6">Last Transactions</h2>
            <TransactionHistory 
              data={currentTransactionData} 
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
            />
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
        onClose={handleClosePortfolioModal}
        onSave={handlePortfolioTransaction}
        editTransaction={editingTransaction}
      />
      
      {/* Testing Modal */}
      <TestingModal
        isOpen={isTestingModalOpen}
        onClose={() => setIsTestingModalOpen(false)}
        onTestO1D={handleTestSyncO1D}
        onTestNVDA1D={handleTestSyncNVDA1D}
        isLoading={pricesLoading}
        isFinnhubConfigured={isFinnhubConfigured}
      />
    </div>
  );
};

export default Dashboard;