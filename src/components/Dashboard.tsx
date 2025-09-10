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
import FuturePayments from './FuturePayments';
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
  const [isDividendCalendarOpen, setIsDividendCalendarOpen] = useState(false);
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