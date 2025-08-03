<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import { StockTrends } from './StockTrends';
=======
import React, { useState, useEffect } from 'react';
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
import { supabase } from '../lib/supabase';
>>>>>>> v1.0.5

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

<<<<<<< HEAD
  // Auto-fetch 30-day data for portfolio stocks
  const autoFetch30DayDataForPortfolio = async () => {
    if (!currentPortfolio || isUsingMockData) {
      console.log('📊 [Dashboard] Skipping auto-fetch: no portfolio or using mock data');
=======
  // Replace line 64 with a different variable name:
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Function to sync all portfolio stock prices
  const handleSyncPortfolioPrices = async () => {
    if (!isFinnhubConfigured) {
      alert('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file.');
>>>>>>> v1.0.5
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
      console.log('Cannot sync prices: no portfolio or using mock data');
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
        return;
      }

      console.log(`Syncing prices for ${symbols.length} stocks:`, symbols);

      // Update stock prices
      const results = await updateStockPrices(symbols);
      console.log('Price sync results:', results);

      // Refresh portfolio data to show updated prices
      await fetchHoldings(currentPortfolio.id);
      await fetchTransactions(currentPortfolio.id);

      console.log('✅ Stock prices synced successfully');
    } catch (error) {
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
  const fetchTransactions = async () => {
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
    fetchTransactions();
  }, []);

  // Update your existing refreshData function to also refresh transactions
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPortfolioData(),
      fetchTransactions() // Add this line
    ]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  const portfolioData = getPortfolioData();

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
          {isUsingMockData && (
            <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
              <p className="text-yellow-800 text-sm">
                Using demo data. Configure Supabase to connect to real data.
              </p>
=======
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
>>>>>>> v1.0.5
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Overview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Portfolio Overview</h2>
                <button
                  onClick={handleSyncPortfolioPrices}
                  disabled={isSyncing || isUsingMockData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Prices'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    ${portfolioData.reduce((sum, stock) => sum + stock.value, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Total Value</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${todaysChange.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${todaysChange.value.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Today's Change</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${todaysChange.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {todaysChange.percentage >= 0 ? '+' : ''}{todaysChange.percentage.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">Today's %</div>
                </div>
              </div>
            </div>

            {/* Stock Trends */}
            <StockTrends data={portfolioData} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Dividend */}
            {nextDividend && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Dividend</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock:</span>
                    <span className="font-medium">{nextDividend.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">${nextDividend.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(nextDividend.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{transaction.stock?.symbol}</div>
                      <div className="text-sm text-gray-500">
                        {transaction.type} {transaction.shares} shares
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${transaction.amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
<<<<<<< HEAD
=======
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
            <DividendTracker data={dividendData} />
>>>>>>> v1.0.5
          </div>
        </div>
      </div>
    </div>
  );
};