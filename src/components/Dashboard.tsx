import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, PieChart, Activity, Menu, Plus, MoreHorizontal, RefreshCw, Wallet, Instagram, Mail, Facebook, Youtube, Shield } from 'lucide-react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import PortfolioChart from './PortfolioChart';
import { StockTrends } from './StockTrends';
import { TopGainersLosers } from './TopGainersLosers';
import TransactionHistory from './TransactionHistory';
import DividendTracker from './DividendTracker';
import DividendCalendar from './DividendCalendar';
import DividendsReceived from './DividendsReceived';
import DividendList from './DividendList';
import FutureDividends from './FuturePayments';
import PortfolioModal from './PortfolioModal';
import TestingModal from './TestingModal';
import Admin from './Admin';
import Logo1 from './logos/Logo1';
import UserMenu from './UserMenu';
import { supabase } from '../lib/supabase';
import { logActivity } from '../utils/activityLogger';

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
  const { 
    updateStockPricesWithHistoricalData,
    autoFetch30DayDataForPortfolio: hookAutoFetch30DayData,
    testSyncO1D,
    testSyncNVDA1D,
    loading: stockPricesLoading
  } = useStockPrices();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isTestingModalOpen, setIsTestingModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [isDividendCalendarOpen, setIsDividendCalendarOpen] = useState(false);
  const [dividendListKey, setDividendListKey] = useState(0);
  const [futureDividendsKey, setFutureDividendsKey] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [editTransaction, setEditTransaction] = useState<{
    id: string;
    ticker: string;
    operation: 'buy' | 'sell';
    date: string;
    shares: string;
    price: string;
    currency: string;
    fee: string;
  } | null>(null);
  const [stockDailyChanges, setStockDailyChanges] = useState<Map<string, { change: number; changePercent: number }>>(new Map());
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if Finnhub is configured
  const isFinnhubConfigured = import.meta.env.VITE_FINNHUB_API_KEY;

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('subscription_tier')
          .eq('user_id', user.id)
          .maybeSingle();

        setIsAdmin(subscription?.subscription_tier === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, []);

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
      
      // Use the hook's updateStockPricesWithHistoricalData method
      await updateStockPricesWithHistoricalData(symbols);

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
        const portfolioData = {
          portfolio: currentPortfolio,
          holdings: holdings
        };
        hookAutoFetch30DayData(portfolioData);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentPortfolio, holdings.length, isUsingMockData]);

  // Add this logout handler function to your Dashboard component
  const handleLogout = async () => {
    try {
      await logActivity('logout', {});

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

  // Calculate daily changes for each stock
  const calculateStockDailyChanges = async () => {
    if (isUsingMockData || holdings.length === 0) {
      setStockDailyChanges(new Map());
      return;
    }

    try {
      const stockIds = holdings.map(h => h.stock_id);

      const now = new Date();
      const dayOfWeek = now.getDay();

      let daysToSubtract = 1;
      if (dayOfWeek === 0) {
        daysToSubtract = 3;
      } else if (dayOfWeek === 6) {
        daysToSubtract = 2;
      } else if (dayOfWeek === 1) {
        daysToSubtract = 3;
      }

      const compareDate = new Date(now);
      compareDate.setDate(compareDate.getDate() - daysToSubtract);
      compareDate.setHours(0, 0, 0, 0);

      const { data: lastTradingDayPrices, error } = await supabase
        .from('stock_prices_1d')
        .select('stock_id, close_price, timestamp')
        .in('stock_id', stockIds)
        .gte('timestamp', compareDate.toISOString())
        .lt('timestamp', new Date(compareDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      if (error || !lastTradingDayPrices || lastTradingDayPrices.length === 0) {
        console.log('No previous trading day prices found, using stocks.price_change_percent_24h');

        const dailyChanges = new Map();
        holdings.forEach(holding => {
          if (holding.stock) {
            const changePercent = holding.stock.price_change_percent_24h || 0;
            const change = (holding.current_price * (changePercent / 100)) * holding.shares;
            dailyChanges.set(holding.stock.symbol, { change, changePercent });
          }
        });

        setStockDailyChanges(dailyChanges);
        return;
      }

      const lastTradingDayPriceMap = new Map();
      lastTradingDayPrices.forEach(price => {
        if (!lastTradingDayPriceMap.has(price.stock_id)) {
          lastTradingDayPriceMap.set(price.stock_id, Number(price.close_price));
        }
      });

      const dailyChanges = new Map();
      holdings.forEach(holding => {
        const lastPrice = lastTradingDayPriceMap.get(holding.stock_id);
        if (lastPrice) {
          const change = (holding.current_price - lastPrice) * holding.shares;
          const changePercent = ((holding.current_price - lastPrice) / lastPrice) * 100;
          dailyChanges.set(holding.stock?.symbol || '', { change, changePercent });
        } else if (holding.stock) {
          const changePercent = holding.stock.price_change_percent_24h || 0;
          const change = (holding.current_price * (changePercent / 100)) * holding.shares;
          dailyChanges.set(holding.stock.symbol, { change, changePercent });
        }
      });

      setStockDailyChanges(dailyChanges);
    } catch (error) {
      console.error('Error calculating stock daily changes:', error);
      setStockDailyChanges(new Map());
    }
  };

  // Add this function to fetch transactions
  const fetchRecentTransactions = async () => {
    // Skip Supabase calls if using mock data
    if (isUsingMockData) {
      setRecentTransactions([]);
      setLoadingTransactions(false);
      return;
    }

    try {
      setLoadingTransactions(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        setRecentTransactions([]);
        setLoadingTransactions(false);
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
        setRecentTransactions([]);
        setLoadingTransactions(false);
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
        setRecentTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      setRecentTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
      setRecentTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Add this useEffect to fetch transactions when component mounts
  useEffect(() => {
    fetchRecentTransactions();
  }, [isUsingMockData]);

  // Calculate daily changes when holdings change
  useEffect(() => {
    calculateStockDailyChanges();
  }, [holdings, isUsingMockData]);

  // Handle editing a transaction
  const handleEditTransaction = (id: string) => {
    const transaction = transactions.find(tx => tx.id === id);
    if (!transaction) return;

    setEditTransaction({
      id: transaction.id,
      ticker: transaction.stock?.symbol || '',
      operation: transaction.type as 'buy' | 'sell',
      date: transaction.transaction_date,
      shares: transaction.shares?.toString() || '0',
      price: transaction.price?.toString() || '0',
      currency: transaction.currency || 'USD',
      fee: transaction.fee?.toString() || '0'
    });
    setIsPortfolioModalOpen(true);
  };

  // Add the missing handleSaveTransaction function
  const handleSaveTransaction = async (transactionData: any) => {
    try {
      console.log('Saving transaction:', transactionData);
      
      if (editTransaction) {
        // Update existing transaction
        console.log('Updating transaction with ID:', editTransaction.id);
        await updateTransaction(editTransaction.id, {
          type: transactionData.operation,
          shares: parseInt(transactionData.shares),
          price: parseFloat(transactionData.price),
          amount: parseInt(transactionData.shares) * parseFloat(transactionData.price),
          fee: parseFloat(transactionData.fee || '0'),
          currency: transactionData.currency,
          transaction_date: transactionData.date,
          status: 'completed'
        });
      } else {
        // Add new transaction
        console.log('Adding new transaction');
        
        // First, ensure the stock exists in the database
        const { data: existingStock, error: stockFetchError } = await supabase
          .from('stocks')
          .select('id')
          .eq('symbol', transactionData.ticker)
          .maybeSingle();

        let stockId;
        if (existingStock) {
          stockId = existingStock.id;
        } else {
          // Create new stock entry
          const { data: newStock, error: stockCreateError } = await supabase
            .from('stocks')
            .insert([{ 
              symbol: transactionData.ticker, 
              name: `${transactionData.ticker} Inc.`,
              current_price: parseFloat(transactionData.price)
            }])
            .select('id')
            .single();

          if (stockCreateError) {
            console.error('Error creating stock:', stockCreateError);
            throw stockCreateError;
          }
          stockId = newStock.id;
        }

        await addTransaction({
          portfolio_id: currentPortfolio!.id,
          stock_id: stockId,
          type: transactionData.operation,
          shares: parseInt(transactionData.shares),
          price: parseFloat(transactionData.price),
          amount: parseInt(transactionData.shares) * parseFloat(transactionData.price),
          fee: parseFloat(transactionData.fee || '0'),
          currency: transactionData.currency,
          transaction_date: transactionData.date,
          status: 'completed'
        });
      }
      
      console.log('Transaction saved, refreshing data...');

      // Force refresh all data
      if (currentPortfolio) {
        await fetchHoldings(currentPortfolio.id);
        await fetchTransactions(currentPortfolio.id);
        await fetchRecentTransactions();

        // Update keys to force dividend components to refresh
        setFutureDividendsKey(prev => prev + 1);
        setDividendListKey(prev => prev + 1);

        // Force re-render of all components by updating state
        // This ensures portfolio allocation, stats, and stock trends refresh
        setTimeout(() => {
          // Small delay to ensure database updates are complete
          window.location.reload();
        }, 500);
      }

      console.log('Data refreshed successfully');

      // Close modal and reset edit state
      setIsPortfolioModalOpen(false);
      setEditTransaction(null);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      alert('Failed to save transaction. Please try again.');
    }
  };

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
  console.log('📊 [Dashboard] Current portfolio data:', currentPortfolioData);
  console.log('📊 [Dashboard] Holdings count:', holdings.length);
  console.log('📊 [Dashboard] Current portfolio:', currentPortfolio?.id);

  const totalValue = currentPortfolioData.totalValue;

  if (isAdminOpen && isAdmin) {
    return <Admin onClose={() => setIsAdminOpen(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Testing Modal */}
      <TestingModal
        isOpen={isTestingModalOpen}
        onClose={() => setIsTestingModalOpen(false)}
        onTestO1D={async () => {
          try {
            await testSyncO1D();
            console.log('✅ O stock 1D test completed');
          } catch (error) {
            console.error('❌ O stock 1D test failed:', error);
          }
        }}
        onTestNVDA1D={async () => {
          try {
            await testSyncNVDA1D();
            console.log('✅ NVDA stock 1D test completed');
          } catch (error) {
            console.error('❌ NVDA stock 1D test failed:', error);
          }
        }}
        isLoading={stockPricesLoading}
        isFinnhubConfigured={!!isFinnhubConfigured}
      />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div title="Avalanex">
                <Logo1 size={48} />
              </div>
              {isUsingMockData && (
                <p className="text-sm text-yellow-400">Using demo data</p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSyncPortfolioPrices}
                disabled={isSyncing || !isFinnhubConfigured || !currentPortfolio || isUsingMockData}
                className={`p-2 rounded-lg transition-colors ${
                  isSyncing || !isFinnhubConfigured || !currentPortfolio || isUsingMockData
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                title={
                  !isFinnhubConfigured
                    ? 'Finnhub API key not configured'
                    : !currentPortfolio
                    ? 'No portfolio selected'
                    : isUsingMockData
                    ? 'Cannot sync mock data'
                    : 'Sync portfolio share prices'
                }
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>

              <UserMenu onLogout={handleLogout} onAdminClick={() => setIsAdminOpen(true)} />
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
                  <p className="text-2xl font-bold text-white">
                    ${totalValue.toLocaleString()}
                    {isUsingMockData && (
                      <span className="text-xs text-yellow-400 ml-2">(Demo)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    ${currentPortfolioData.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} invested
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-1">Total Profit</p>
                  <p className={`text-2xl font-bold ${currentPortfolioData.totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {currentPortfolioData.totalGainLoss >= 0 ? '+' : ''}${currentPortfolioData.totalGainLoss.toFixed(2)}
                    <span className={`text-lg ml-2 ${currentPortfolioData.totalGainLossPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {currentPortfolioData.totalGainLossPercent >= 0 ? '+' : ''}{currentPortfolioData.totalGainLossPercent.toFixed(2)}%
                    </span>
                  </p>
                  <p className={`text-sm mt-2 ${todaysChange.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {todaysChange.value >= 0 ? '+' : ''}${todaysChange.value.toFixed(2)} {todaysChange.value >= 0 ? '+' : ''}{todaysChange.percentage.toFixed(2)}% daily
                  </p>
                </div>
                {currentPortfolioData.totalGainLoss >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Next Dividend</p>
                  {nextDividend ? (
                    <>
                      <p className="text-2xl font-bold text-blue-400">${nextDividend.totalAmount.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{nextDividend.symbol} - {nextDividend.date}</p>
                    </>
                  ) : (
                    <p className="text-lg text-gray-500">No upcoming dividends</p>
                  )}
                </div>
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Holdings</p>
                  <p className="text-2xl font-bold text-white">{holdings.length}</p>
                  <p className="text-xs text-gray-400">Active positions</p>
                </div>
                <PieChart className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Portfolio Chart */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Portfolio Allocation</h2>
                <button
                  onClick={() => setIsPortfolioModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Transaction</span>
                </button>
              </div>

              {currentPortfolioData.holdings.length > 0 ? (
                <div className="flex-1">
                  <PortfolioChart
                    data={currentPortfolioData.holdings.map(holding => ({
                      symbol: holding.symbol,
                      name: holding.name,
                      shares: holding.shares,
                      price: holding.currentPrice,
                      value: holding.totalValue,
                      cost: holding.shares * holding.averageCost,
                      change: holding.gainLoss,
                      changePercent: holding.gainLossPercent
                    }))}
                    onHover={setHoveredStock}
                    hoveredStock={hoveredStock}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <PieChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium text-lg">No holdings yet</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Add your first transaction to get started
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stock Trends */}
            <div className="h-full">
              <StockTrends
                data={currentPortfolioData.holdings.map(holding => ({
                  symbol: holding.symbol,
                  name: holding.name,
                  shares: holding.shares,
                  price: holding.currentPrice,
                  value: holding.totalValue,
                  cost: holding.shares * holding.averageCost,
                  change: holding.gainLoss,
                  changePercent: holding.gainLossPercent
                }))}
              />
            </div>
          </div>

          {/* Top Gainers and Losers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Gainers */}
            <TopGainersLosers
              type="gainers"
              data={currentPortfolioData.holdings.map(holding => {
                const dailyChange = stockDailyChanges.get(holding.symbol);
                return {
                  symbol: holding.symbol,
                  name: holding.name,
                  value: holding.currentPrice,
                  change: dailyChange?.change || 0,
                  changePercent: dailyChange?.changePercent || 0
                };
              })}
            />

            {/* Top Losers */}
            <TopGainersLosers
              type="losers"
              data={currentPortfolioData.holdings.map(holding => {
                const dailyChange = stockDailyChanges.get(holding.symbol);
                return {
                  symbol: holding.symbol,
                  name: holding.name,
                  value: holding.currentPrice,
                  change: dailyChange?.change || 0,
                  changePercent: dailyChange?.changePercent || 0
                };
              })}
            />
          </div>

          {/* Dividend Growth */}
          <div className="mb-8">
            <DividendsReceived
              key={dividendListKey}
              portfolioId={currentPortfolio?.id}
            />
          </div>

          {/* Upcoming Dividends */}
          <div className="mb-8">
            <FutureDividends
              key={futureDividendsKey}
              portfolioId={currentPortfolio?.id}
              onCalendarClick={() => setIsDividendCalendarOpen(true)}
            />
          </div>

          {/* Dividend History List */}
          {currentPortfolio?.id && (
            <div className="mb-8">
              <DividendList
                portfolioId={currentPortfolio.id}
                onUpdate={() => setDividendListKey(prev => prev + 1)}
              />
            </div>
          )}

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction History */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Recent Transactions</h2>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Menu button clicked');
                    setIsPortfolioModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                  title="Add Transaction"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              {transactions.length > 0 ? (
                <TransactionHistory 
                  data={transactions.slice(0, 10).map(tx => ({
                    id: tx.id,
                    symbol: tx.stock?.symbol || '',
                    type: tx.type,
                    shares: tx.shares,
                    price: tx.price,
                    amount: tx.amount,
                    date: tx.transaction_date,
                    status: tx.status
                  }))}
                  onDeleteTransaction={async (id) => {
                    try {
                      await deleteTransaction(id);
                      setFutureDividendsKey(prev => prev + 1);
                      setDividendListKey(prev => prev + 1);
                    } catch (error) {
                      console.error('Failed to delete transaction:', error);
                    }
                  }}
                  onEditTransaction={(id) => {
                    console.log('Edit transaction clicked for ID:', id);
                    const transaction = transactions.find(tx => tx.id === id);
                    if (transaction) {
                      console.log('Found transaction:', transaction);
                      setEditTransaction({
                        id: transaction.id,
                        ticker: transaction.stock?.symbol || '',
                        operation: transaction.type as 'buy' | 'sell',
                        date: transaction.transaction_date,
                        shares: transaction.shares?.toString() || '0',
                        price: transaction.price?.toString() || '0',
                        currency: transaction.currency || 'USD',
                        fee: transaction.fee?.toString() || '0'
                      });
                      setIsPortfolioModalOpen(true);
                    } else {
                      console.error('Transaction not found for ID:', id);
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium text-lg">No transactions yet</p>
                    <p className="text-gray-500 text-sm mt-2">Your transaction history will appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Dividend Tracker */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Dividend Tracker</h2>
                <button 
                  onClick={() => setIsDividendCalendarOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
              
              {dividends.length > 0 ? (
                <DividendTracker 
                  data={dividends.map(div => ({
                    id: div.id,
                    symbol: div.stock?.symbol || '',
                    name: div.stock?.name || '',
                    amount: div.amount,
                    date: div.payment_date,
                    exDividendDate: div.ex_dividend_date,
                    paymentDate: div.payment_date,
                    yield: div.dividend_yield || 0,
                    frequency: div.frequency
                  }))}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium text-lg">No dividends tracked</p>
                    <p className="text-gray-500 text-sm mt-2">Dividend information will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 pb-6 border-t border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              {/* Left side - Copyright and social */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <p className="text-gray-400 text-sm">
                  2025 © Avalanex
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    title="X"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    title="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                  <a
                    href="mailto:support@avalanex.com"
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Email Support"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Right side - Links */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Support
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Terms and Conditions
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Security
                </a>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-500 text-xs leading-relaxed">
                Avalanex would like to remind you that the data contained in this website is not necessarily real-time nor accurate. The site and content are provided "as is" and without warranties of any kind. You bear all risks associated with the use of the site and content, including without limitation, any reliance on the accuracy, completeness or usefulness of any content available on the site. This website does not constitute an offer to sell, a solicitation to buy, or a recommendation for any security, nor does it constitute an offer to provide investment advisory or other services. Active Brokers is not affiliated with Avalanex and does not endorse or recommend any information or advice provided by Avalanex.
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => {
          setIsPortfolioModalOpen(false);
          setEditTransaction(null);
        }}
        onAddTransaction={handleSaveTransaction}
        onUpdateTransaction={handleSaveTransaction}
        editTransaction={editTransaction}
      />

      {/* Dividend Calendar Modal */}
      <DividendCalendar
        isOpen={isDividendCalendarOpen}
        onClose={() => setIsDividendCalendarOpen(false)}
        portfolioId={currentPortfolio?.id}
      />
    </div>
  );
};