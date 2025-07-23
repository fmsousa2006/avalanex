import { useState, useEffect } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import { StockTrends } from './StockTrends';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
          {isUsingMockData && (
            <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
              <p className="text-yellow-800 text-sm">
                Using demo data. Configure Supabase to connect to real data.
              </p>
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
          </div>
        </div>
      </div>
    </div>
  );
};