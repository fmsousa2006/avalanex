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
  const { 
    updateStockPricesWithHistoricalData,
    autoFetch30DayDataForPortfolio: hookAutoFetch30DayData,
    testSyncO1D,
    testSyncNVDA1D,
    loading: stockPricesLoading
  } = useStockPrices();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isTestingModalOpen, setIsTestingModalOpen] = useState(false);
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [isDividendCalendarOpen, setIsDividendCalendarOpen] = useState(false);
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

  // Check if Finnhub is configured
  const isFinnhubConfigured = import.meta.env.VITE_FINNHUB_API_KEY;

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
  const totalValue = currentPortfolioData.totalValue;
  const totalChange = currentPortfolioData.totalGainLoss;
  const totalChangePercent = currentPortfolioData.totalGainLossPercent;

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
              <button
                onClick={() => {
                  console.log('Menu button clicked - opening portfolio modal');
                  setEditTransaction(null);
                  setIsPortfolioModalOpen(true);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Add Transaction"
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Portfolio Chart */}
            <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
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
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <PieChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium text-lg">No holdings yet</p>
                    <p className="text-gray-500 text-sm mt-2">Add your first transaction to get started</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stock Trends */}
            <div>
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

          {/* Secondary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Dividends Received */}
            <DividendsReceived portfolioId={currentPortfolio?.id} />

            {/* Future Payments */}
            <FuturePayments 
              portfolioId={currentPortfolio?.id}
              onCalendarClick={() => setIsDividendCalendarOpen(true)}
            />
          </div>

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
                    frequency: div.frequency,
                    status: div.status
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
        </main>
      </div>
    </div>
  );
};