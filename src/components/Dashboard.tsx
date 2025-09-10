import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, PieChart, Activity, Menu, Plus, MoreHorizontal, RefreshCw } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import PortfolioChart from './PortfolioChart';
import { StockTrends } from './StockTrends';
import TransactionHistory from './TransactionHistory';
import DividendTracker from './DividendTracker';
import DividendCalendar from './DividendCalendar';
import DividendsReceived from './DividendsReceived';
import Sidebar from './Sidebar';
import PortfolioModal from './PortfolioModal';
import TestingModal from './TestingModal';
import { supabase } from '../lib/supabase';

console.log('🏠 Dashboard component rendering...');

export const Dashboard = () => {
  const {
    portfolios,
    currentPortfolio,
    holdings,
    transactions,
    dividends,
    nextDividend,
    todaysChange,
    loading,
    error,
    isUsingMockData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getPortfolioData,
    setCurrentPortfolio,
    fetchHoldings,
    fetchTransactions
  } = usePortfolio();

  const { updateStockPrices, updateStockWith30DayData } = useStockPrices();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isTestingModalOpen, setIsTestingModalOpen] = useState(false);
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Check if Finnhub is configured
  const isFinnhubConfigured = import.meta.env.VITE_FINNHUB_API_KEY;

  // Auto-fetch 30-day data for portfolio stocks
  const autoFetch30DayDataForPortfolio = async () => {
    if (!currentPortfolio || isUsingMockData) {
      console.log('📊 [Dashboard] Skipping auto-fetch: no portfolio or using mock data');
      return;
    }

    try {
      console.log('📊 [Dashboard] Auto-fetching 30-day data for portfolio stocks...');
      
      // Get unique symbols from current holdings
      const symbols = holdings
        .filter(holding => holding.stock?.symbol)
        .map(holding => holding.stock!.symbol);

      if (symbols.length === 0) {
        console.log('📊 [Dashboard] No stocks in portfolio to fetch data for');
        return;
      }

      console.log(`📊 [Dashboard] Fetching 30-day data for ${symbols.length} stocks:`, symbols);

      // Update each stock with 30-day historical data
      for (const symbol of symbols) {
        try {
          await updateStockWith30DayData(symbol);
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ [Dashboard] Failed to update 30d data for ${symbol}:`, error);
        }
      }

      console.log('✅ [Dashboard] Completed auto-fetch of 30-day data');
    } catch (error) {
      console.error('❌ [Dashboard] Error in auto-fetch 30-day data:', error);
    }
  };

  // Sync portfolio stock prices
  const handleSyncPortfolioPrices = async () => {
    if (!currentPortfolio || isUsingMockData) {
      alert('Cannot sync prices: no portfolio selected or using mock data');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('🔄 Syncing stock prices for portfolio...');
      
      // Get unique symbols from current holdings
      const symbols = holdings
        .filter(holding => holding.stock?.symbol)
        .map(holding => holding.stock!.symbol);

      if (symbols.length === 0) {
        console.log('No stocks in portfolio to sync');
        setIsSyncing(false);
        return;
      }

      console.log(`Syncing portfolio stock prices: ${symbols.length} stocks:`, symbols);
      
      // Use the hook's updateMultipleStocksWithHistoricalData method
      await updateStockWith30DayData(symbols);

      // Refresh portfolio data to show updated prices
      if (currentPortfolio) {
        await fetchHoldings(currentPortfolio.id);
        await fetchTransactions(currentPortfolio.id);
      }

      console.log('✅ Portfolio stock prices synced successfully');
    } catch (error) {
      console.error('❌ Failed to sync stock data. Check console for details.');
      console.error('Error syncing stock data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-fetch 30-day data when portfolio loads
  useEffect(() => {
    if (currentPortfolio && holdings.length > 0 && !isUsingMockData) {
      // Delay to avoid conflicts with initial loading
      const timer = setTimeout(() => {
        autoFetch30DayDataForPortfolio();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentPortfolio, holdings.length, isUsingMockData]);

  // Add this logout handler function to your Dashboard component
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Force redirect to login page
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if there's an error, redirect to login
      window.location.href = '/';
    }
  };

  // Add this function to fetch transactions
  const fetchRecentTransactions = async () => {
    try {
      setLoadingTransactions(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // First get the user's portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (portfolioError || !portfolioData) {
        console.error('Error fetching user portfolio:', portfolioError);
        return;
      }

      // Now fetch transactions for the user's portfolio
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          stocks (
            symbol,
            name,
            current_price
          )
        `)
        .eq('portfolio_id', portfolioData.id)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        return;
      }

      setRecentTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Add this useEffect to fetch transactions when component mounts
  useEffect(() => {
    fetchRecentTransactions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const currentPortfolioData = getPortfolioData();
  const totalValue = currentPortfolioData.reduce((sum, holding) => sum + holding.totalValue, 0);
  const totalChange = currentPortfolioData.reduce((sum, holding) => sum + holding.totalChange, 0);
  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={setIsSidebarOpen}
        onPortfolioClick={() => setIsPortfolioModalOpen(true)}
        onTestingClick={() => setIsTestingModalOpen(true)}
        onLogout={handleLogout}
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
                {isUsingMockData && (
                  <p className="text-sm text-yellow-400">Using demo data</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSyncPortfolioPrices}
                disabled={isSyncing || !isFinnhubConfigured || !currentPortfolio || isUsingMockData}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isSyncing || !isFinnhubConfigured || !currentPortfolio || isUsingMockData
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                title={
                  !isFinnhubConfigured ? 'Finnhub API key not configured' :
                  !currentPortfolio ? 'No portfolio selected' :
                  isUsingMockData ? 'Cannot sync mock data' :
                  'Sync stock prices with Finnhub'
                }
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
              </button>
              
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {/* Portfolio Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Today's Change</p>
                  <p className={`text-2xl font-bold ${totalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${totalChange.toFixed(2)} ({totalChange >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%)
                  </p>
                </div>
                {totalChange >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Invested</p>
                  <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Gain/Loss</p>
                  <p className={`text-2xl font-bold ${totalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Return %</p>
                  <p className={`text-2xl font-bold ${totalChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Next Dividend</p>
                  <p className="text-2xl font-bold text-white">$0.00</p>
                  <p className="text-sm text-gray-500">No upcoming dividends</p>
                </div>
                <Calendar className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Portfolio Composition */}
            <div className="xl:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-2 mb-6">
                <PieChart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-semibold">Portfolio Composition</h2>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Last Transactions</h2>
                <button
                  onClick={() => setIsPortfolioModalOpen(true)}
                  className={`p-2 rounded-lg transition-colors ${
                    !currentPortfolio && !isUsingMockData
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  title="Add Transaction"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                </div>
              ) : recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((transaction, index) => (
                    <div key={transaction.id || index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            transaction.type === 'buy' 
                              ? 'bg-emerald-900 text-emerald-300' 
                              : transaction.type === 'sell'
                              ? 'bg-red-900 text-red-300'
                              : 'bg-blue-900 text-blue-300'
                          }`}>
                            {transaction.type?.toUpperCase()}
                          </span>
                          <span className="text-white font-medium">
                            {transaction.stocks?.symbol}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {transaction.shares} shares @ ${transaction.price}
                          <span className="ml-2 text-xs">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">
                          ${transaction.amount}
                        </div>
                        <div className="text-sm text-gray-400">
                          {transaction.fee > 0 && `Fee: $${transaction.fee}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="mb-2">No transactions found</p>
                  <p className="text-sm">
                    Start building your portfolio by adding your first transaction.
                  </p>
                  <button
                    onClick={() => setIsPortfolioModalOpen(true)}
                    className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Add Transaction
                  </button>
                </div>
              )}
            </div>

            {/* Dividend Tracker */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-6">Upcoming Dividends</h2>
              <DividendTracker data={dividends} />
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {isPortfolioModalOpen && (
        <PortfolioModal
          isOpen={isPortfolioModalOpen}
          onClose={() => setIsPortfolioModalOpen(false)}
          currentPortfolio={currentPortfolio}
          onAddTransaction={addTransaction}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
        />
      )}

      {isTestingModalOpen && (
        <TestingModal
          isOpen={isTestingModalOpen}
          onClose={() => setIsTestingModalOpen(false)}
        />
      )}
    </div>
  );
};