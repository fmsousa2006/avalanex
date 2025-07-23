import { useState, useEffect } from 'react';
import { supabase, Portfolio, PortfolioHolding, Transaction, Dividend, Stock, PortfolioData } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { portfolioData, transactionData, dividendData } from '../data/mockData';

// Create admin client for bypassing RLS when creating default portfolio
const getAdminClient = () => {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );
};

export const usePortfolio = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [isSupabaseConfiguredForRealData, setIsSupabaseConfiguredForRealData] = useState(false);
  const [nextDividend, setNextDividend] = useState<{
    symbol: string;
    amount: number;
    date: string;
    totalAmount: number;
  } | null>(null);
  const [todaysChange, setTodaysChange] = useState<{
    value: number;
    percentage: number;
  }>({ value: 0, percentage: 0 });

  // Fixed portfolio ID for single portfolio setup
  const FIXED_PORTFOLIO_ID = '550e8400-e29b-41d4-a716-446655440000';

  // Helper function to check if Supabase environment is properly configured
  const isSupabaseEnvConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    return url && 
           key && 
           url !== 'https://your-project-ref.supabase.co' &&
           url !== 'https://placeholder.supabase.co' &&
           key !== 'your-anon-key-here' &&
           key !== 'placeholder-anon-key';
  };

  // Get current user
  const getCurrentUser = async () => {
    // Return null if Supabase is not properly configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return null;
    }
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  // Create mock portfolio when Supabase is not available
  const createMockPortfolio = () => {
    const mockPortfolio: Portfolio = {
      id: FIXED_PORTFOLIO_ID,
      user_id: '49be5272-a0ba-4d3a-9b17-c119181bb0e9',
      name: 'Demo Portfolio',
      description: 'Sample portfolio with demo data',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockHoldings: PortfolioHolding[] = portfolioData.map((stock, index) => ({
      id: `mock-holding-${index}`,
      portfolio_id: mockPortfolio.id,
      stock_id: `mock-stock-${index}`,
      shares: stock.shares,
      average_cost: stock.cost / stock.shares,
      current_price: stock.price,
      last_updated: new Date().toISOString(),
      stock: {
        id: `mock-stock-${index}`,
        symbol: stock.symbol,
        name: stock.name,
        sector: 'Technology',
        market_cap: '1T+',
        created_at: new Date().toISOString()
      }
    }));

    const mockTransactions: Transaction[] = transactionData.map((tx, index) => ({
      id: tx.id,
      portfolio_id: mockPortfolio.id,
      stock_id: `mock-stock-${index}`,
      type: tx.type,
      shares: tx.shares,
      price: tx.price,
      amount: tx.amount,
      fee: 0,
      currency: 'USD',
      transaction_date: tx.date,
      status: tx.status,
      created_at: new Date().toISOString(),
      stock: {
        id: `mock-stock-${index}`,
        symbol: tx.symbol,
        name: `${tx.symbol} Inc.`,
        sector: 'Technology',
        market_cap: '1T+',
        created_at: new Date().toISOString()
      }
    }));

    const mockDividends: Dividend[] = dividendData.map((div, index) => ({
      id: div.id,
      stock_id: `mock-stock-${index}`,
      amount: div.amount,
      ex_dividend_date: div.exDividendDate,
      payment_date: div.paymentDate,
      record_date: div.exDividendDate,
      dividend_yield: div.yield,
      frequency: div.frequency as 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual',
      status: div.status,
      created_at: new Date().toISOString(),
      stock: {
        id: `mock-stock-${index}`,
        symbol: div.symbol,
        name: div.name,
        sector: 'Technology',
        market_cap: '1T+',
        created_at: new Date().toISOString()
      }
    }));

    setPortfolios([mockPortfolio]);
    setCurrentPortfolio(mockPortfolio);
    setHoldings(mockHoldings);
    setTransactions(mockTransactions);
    setDividends(mockDividends);
    setIsUsingMockData(true);
  };

  // Create default portfolio for new users
  const createDefaultPortfolio = async (userId: string) => {
    // This function is no longer needed as we handle portfolio creation in fetchPortfolios
    return null;
  };

  // Fetch portfolios
  const fetchPortfolios = async () => {
    try {
      // Check if Supabase is configured before attempting connection
      const supabaseConfigured = isSupabaseEnvConfigured();
      setIsSupabaseConfiguredForRealData(supabaseConfigured);
      
      if (!supabaseConfigured) {
        console.warn('Supabase not configured, using mock data');
        createMockPortfolio();
        return;
      }

      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('No authenticated user found, using mock data');
        createMockPortfolio();
        return;
      }

      // Try to fetch portfolio for the authenticated user
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching portfolio from Supabase:', error);
        // Fall back to mock data
        createMockPortfolio();
        return;
      }

      if (data) {
        setPortfolios([data]);
        setCurrentPortfolio(data);
      } else {
        // Create default portfolio for the user
        const { data: newPortfolio, error: createError } = await supabase
          .from('portfolios')
          .insert([
            {
              user_id: user.id,
              name: 'My Portfolio',
              description: 'Default portfolio'
            }
          ])
          .select()
          .single();

        if (createError) {
          console.warn('Error creating portfolio, using mock data:', createError);
          createMockPortfolio();
          return;
        }

        setPortfolios([newPortfolio]);
        setCurrentPortfolio(newPortfolio);
      }
    } catch (err) {
      console.warn('Failed to connect to Supabase, using mock data:', err);
      createMockPortfolio();
    }
  };

  // Fetch holdings for current portfolio
  const fetchHoldings = async (portfolioId: string) => {
    if (!isSupabaseConfiguredForRealData) {
      return; // Skip if using mock data
    }

    const { data, error } = await supabase
      .from('portfolio_holdings')
      .select(`
        *,
        stock:stocks(*)
      `)
      .eq('portfolio_id', portfolioId);

    if (error) throw error;
    setHoldings(data || []);
  };

  // Fetch transactions for current portfolio
  const fetchTransactions = async (portfolioId: string) => {
    if (!isSupabaseConfiguredForRealData) {
      return; // Skip if using mock data
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        stock:stocks(*)
      `)
      .eq('portfolio_id', portfolioId)
      .order('transaction_date', { ascending: false })
      .limit(20);

    if (error) throw error;
    setTransactions(data || []);
  };

  // Fetch dividends
  const fetchDividends = async () => {
    if (!isSupabaseConfiguredForRealData) {
      return; // Skip if using mock data
    }

    if (!currentPortfolio) {
      setDividends([]);
      return;
    }

    try {
      // First get all stocks in the current portfolio
      const { data: portfolioStocks, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select('stock_id')
        .eq('portfolio_id', currentPortfolio.id)
        .gt('shares', 0); // Only stocks with shares > 0

      if (holdingsError) throw holdingsError;

      if (!portfolioStocks || portfolioStocks.length === 0) {
        setDividends([]);
        return;
      }

      // Get stock IDs from portfolio
      const stockIds = portfolioStocks.map(holding => holding.stock_id).filter(Boolean);

      if (stockIds.length === 0) {
        setDividends([]);
        return;
      }

      // Only fetch upcoming dividends for stocks we actually own
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('dividends')
        .select(`
          *,
          stock:stocks(*)
        `)
        .in('stock_id', stockIds) // Only dividends for stocks we own
        .eq('status', 'upcoming')
        .gte('payment_date', today)
        .order('payment_date', { ascending: true });

      if (error) throw error;
      setDividends(data || []);
    } catch (error) {
      console.error('Error fetching dividends:', error);
      setDividends([]);
    }
  };

  // Fetch next dividend based on portfolio holdings
  const fetchNextDividend = async (portfolioId: string) => {
    if (!isSupabaseConfiguredForRealData) {
      return; // Skip if using mock data
    }

    try {
      // Get all stocks in the current portfolio
      const { data: portfolioStocks, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select(`
          shares,
          stock:stocks(id, symbol)
        `)
        .eq('portfolio_id', portfolioId)
        .gt('shares', 0); // Only stocks with shares > 0

      if (holdingsError) throw holdingsError;

      if (!portfolioStocks || portfolioStocks.length === 0) {
        setNextDividend(null);
        return;
      }

      // Get stock IDs from portfolio
      const stockIds = portfolioStocks.map(holding => holding.stock?.id).filter(Boolean);

      if (stockIds.length === 0) {
        setNextDividend(null);
        return;
      }

      // Get upcoming dividends for these stocks
      const today = new Date().toISOString().split('T')[0];
      const { data: upcomingDividends, error: dividendsError } = await supabase
        .from('dividends')
        .select(`
          *,
          stock:stocks(symbol, name)
        `)
        .in('stock_id', stockIds)
        .in('status', ['upcoming', 'ex-dividend'])
        .gte('payment_date', today)
        .order('payment_date', { ascending: true })
        .limit(1);

      if (dividendsError) throw dividendsError;

      if (!upcomingDividends || upcomingDividends.length === 0) {
        setNextDividend(null);
        return;
      }

      const nextDiv = upcomingDividends[0];
      const holding = portfolioStocks.find(h => h.stock?.id === nextDiv.stock_id);
      
      if (!holding || !holding.stock) {
        setNextDividend(null);
        return;
      }

      // Calculate total dividend amount (dividend per share * number of shares)
      const totalAmount = nextDiv.amount * holding.shares;

      setNextDividend({
        symbol: holding.stock.symbol,
        amount: nextDiv.amount,
        date: nextDiv.payment_date,
        totalAmount: totalAmount
      });

    } catch (error) {
      console.error('Error fetching next dividend:', error);
      setNextDividend(null);
    }
  };

  // Calculate today's change based on portfolio holdings and current stock prices
  const calculateTodaysChange = async (portfolioId: string) => {
    if (!isSupabaseConfiguredForRealData) {
      setTodaysChange({ value: 0, percentage: 0 });
      return;
    }

    try {
      console.log('🔍 [DEBUG] Starting Today\'s Change calculation for portfolio:', portfolioId);
      
      // Get all holdings with current stock prices
      const { data: holdingsWithPrices, error } = await supabase
        .from('portfolio_holdings')
        .select(`
          shares,
          average_cost,
          stock:stocks(
            symbol,
            current_price,
            price_change_24h,
            price_change_percent_24h
          )
        `)
        .eq('portfolio_id', portfolioId)
        .gt('shares', 0);

      if (error) {
        console.error('Error fetching holdings for today\'s change:', error);
        setTodaysChange({ value: 0, percentage: 0 });
        return;
      }

      if (!holdingsWithPrices || holdingsWithPrices.length === 0) {
        console.log('🔍 [DEBUG] No holdings found for portfolio');
        setTodaysChange({ value: 0, percentage: 0 });
        return;
      }

      console.log('🔍 [DEBUG] Found holdings:', holdingsWithPrices.length);
      
      let totalTodaysChange = 0;
      let totalCurrentValue = 0;
      let totalPreviousValue = 0;

      holdingsWithPrices.forEach(holding => {
        if (!holding.stock) return;

        const shares = holding.shares;
        const currentPrice = holding.stock.current_price || 0;
        const priceChange24h = holding.stock.price_change_24h || 0;
        
        // Calculate previous price (current price - 24h change)
        const previousPrice = currentPrice - priceChange24h;
        
        // Calculate values
        const currentValue = shares * currentPrice;
        const previousValue = shares * previousPrice;
        const holdingChange = currentValue - previousValue;
        
        console.log(`🔍 [DEBUG] ${holding.stock.symbol}:`, {
          shares,
          currentPrice: `$${currentPrice}`,
          priceChange24h: `$${priceChange24h}`,
          previousPrice: `$${previousPrice.toFixed(2)}`,
          currentValue: `$${currentValue.toFixed(2)}`,
          previousValue: `$${previousValue.toFixed(2)}`,
          holdingChange: `$${holdingChange.toFixed(2)}`
        });
        
        totalTodaysChange += holdingChange;
        totalCurrentValue += currentValue;
        totalPreviousValue += previousValue;
      });

      // Calculate percentage change
      const percentageChange = totalPreviousValue > 0 
        ? (totalTodaysChange / totalPreviousValue) * 100 
        : 0;

      console.log('🔍 [DEBUG] Portfolio Totals:', {
        totalCurrentValue: `$${totalCurrentValue.toFixed(2)}`,
        totalPreviousValue: `$${totalPreviousValue.toFixed(2)}`,
        totalTodaysChange: `$${totalTodaysChange.toFixed(2)}`,
        percentageChange: `${percentageChange.toFixed(4)}%`
      });

      setTodaysChange({
        value: totalTodaysChange,
        percentage: percentageChange
      });

      console.log(`📊 Final Today's Change: $${totalTodaysChange.toFixed(2)} (${percentageChange.toFixed(2)}%)`);
    } catch (error) {
      console.error('Error calculating today\'s change:', error);
      setTodaysChange({ value: 0, percentage: 0 });
    }
  };

  // Add or update stock
  const upsertStock = async (symbol: string, name: string) => {
    // First, try to get existing stock data
    const { data: existingStock, error: fetchError } = await supabase
      .from('stocks')
      .select('*')
      .eq('symbol', symbol)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // If stock exists, return it
    if (existingStock) {
      return existingStock;
    }

    // If stock doesn't exist, create it with the provided name
    const { data, error } = await supabase
      .from('stocks')
      .insert([{ symbol, name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  // Add transaction
  const addTransaction = async (transactionData: {
    ticker: string;
    operation: 'buy' | 'sell';
    date: string;
    shares: string;
    price: string;
    currency: string;
    fee: string;
  }) => {
    if (!isSupabaseConfiguredForRealData) {
      throw new Error('Cannot add transactions when using mock data. Please configure Supabase.');
    }

    if (!currentPortfolio) throw new Error('No current portfolio');

    const shares = parseInt(transactionData.shares);
    const price = parseFloat(transactionData.price);
    const fee = parseFloat(transactionData.fee || '0');
    const amount = shares * price;

    // Ensure stock exists
    const stock = await upsertStock(transactionData.ticker, `${transactionData.ticker} Inc.`);

    // Add transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          portfolio_id: currentPortfolio.id,
          stock_id: stock.id,
          type: transactionData.operation,
          shares: shares,
          price: price,
          amount: amount,
          fee: fee,
          currency: transactionData.currency,
          transaction_date: transactionData.date,
          status: 'completed'
        }
      ])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update or create holding
    const existingHolding = holdings.find(h => h.stock_id === stock.id);

    if (existingHolding) {
      let newShares: number;
      let newAverageCost: number;

      if (transactionData.operation === 'buy') {
        newShares = existingHolding.shares + shares;
        const totalCost = (existingHolding.shares * existingHolding.average_cost) + amount;
        newAverageCost = totalCost / newShares;
      } else {
        newShares = Math.max(0, existingHolding.shares - shares);
        newAverageCost = existingHolding.average_cost; // Keep same average cost
      }

      if (newShares > 0) {
        const { error: updateError } = await supabase
          .from('portfolio_holdings')
          .update({
            shares: newShares,
            average_cost: newAverageCost,
            current_price: price,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingHolding.id);

        if (updateError) throw updateError;
      } else {
        // Remove holding if no shares left
        const { error: deleteError } = await supabase
          .from('portfolio_holdings')
          .delete()
          .eq('id', existingHolding.id);

        if (deleteError) throw deleteError;
      }
    } else if (transactionData.operation === 'buy') {
      // Create new holding
      const { error: insertError } = await supabase
        .from('portfolio_holdings')
        .insert([
          {
            portfolio_id: currentPortfolio.id,
            stock_id: stock.id,
            shares: shares,
            average_cost: price,
            current_price: price,
            last_updated: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;
    }

    // Refresh data
    await Promise.all([
      fetchHoldings(currentPortfolio.id),
      fetchTransactions(currentPortfolio.id),
      fetchNextDividend(currentPortfolio.id),
      calculateTodaysChange(currentPortfolio.id)
    ]);

    return transaction;
  };

  // Update transaction
  const updateTransaction = async (
    transactionId: string,
    transactionData: {
      ticker: string;
      operation: 'buy' | 'sell';
      date: string;
      shares: string;
      price: string;
      currency: string;
      fee: string;
    }
  ) => {
    if (!isSupabaseConfiguredForRealData) {
      throw new Error('Cannot update transactions when using mock data. Please configure Supabase.');
    }

    if (!currentPortfolio) throw new Error('No current portfolio');

    // Get the original transaction data before updating
    const { data: originalTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!originalTransaction) throw new Error('Original transaction not found');
    const shares = parseInt(transactionData.shares);
    const price = parseFloat(transactionData.price);
    const fee = parseFloat(transactionData.fee || '0');
    const amount = shares * price;

    // Ensure stock exists
    const stock = await upsertStock(transactionData.ticker, `${transactionData.ticker} Inc.`);

    // Update the transaction
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        stock_id: stock.id,
        type: transactionData.operation,
        shares: shares,
        price: price,
        amount: amount,
        fee: fee,
        currency: transactionData.currency,
        transaction_date: transactionData.date
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update portfolio holdings if the transaction affects holdings
    if (originalTransaction.type !== 'dividend' && originalTransaction.shares) {
      const existingHolding = holdings.find(h => h.stock_id === originalTransaction.stock_id);
      
      if (existingHolding) {
        // Calculate the effect of removing the original transaction
        let adjustedShares = existingHolding.shares;
        let adjustedTotalCost = existingHolding.shares * existingHolding.average_cost;
        
        // Reverse the original transaction
        if (originalTransaction.type === 'buy') {
          adjustedShares -= originalTransaction.shares;
          adjustedTotalCost -= originalTransaction.amount;
        } else if (originalTransaction.type === 'sell') {
          adjustedShares += originalTransaction.shares;
          // For sells, we don't adjust cost basis
        }
        
        // Apply the new transaction
        if (transactionData.operation === 'buy') {
          adjustedShares += shares;
          adjustedTotalCost += amount;
        } else if (transactionData.operation === 'sell') {
          adjustedShares -= shares;
          // For sells, we don't adjust cost basis
        }
        
        // Calculate new average cost
        const newAverageCost = adjustedShares > 0 ? adjustedTotalCost / adjustedShares : 0;
        
        if (adjustedShares > 0) {
          // Update existing holding
          const { error: updateHoldingError } = await supabase
            .from('portfolio_holdings')
            .update({
              shares: adjustedShares,
              average_cost: newAverageCost,
              current_price: price,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingHolding.id);
            
          if (updateHoldingError) throw updateHoldingError;
        } else {
          // Remove holding if no shares left
          const { error: deleteHoldingError } = await supabase
            .from('portfolio_holdings')
            .delete()
            .eq('id', existingHolding.id);
            
          if (deleteHoldingError) throw deleteHoldingError;
        }
      } else if (transactionData.operation === 'buy') {
        // Create new holding if it's a buy transaction and no existing holding
        const { error: insertHoldingError } = await supabase
          .from('portfolio_holdings')
          .insert([
            {
              portfolio_id: currentPortfolio.id,
              stock_id: stock.id,
              shares: shares,
              average_cost: price,
              current_price: price,
              last_updated: new Date().toISOString()
            }
          ]);
          
        if (insertHoldingError) throw insertHoldingError;
      }
    }

    // Refresh data
    await Promise.all([
      fetchHoldings(currentPortfolio.id),
      fetchTransactions(currentPortfolio.id),
      fetchNextDividend(currentPortfolio.id),
      calculateTodaysChange(currentPortfolio.id)
    ]);

    return updatedTransaction;
  };

  // Delete transaction
  const deleteTransaction = async (transactionId: string) => {
    if (!isSupabaseConfiguredForRealData) {
      throw new Error('Cannot delete transactions when using mock data. Please configure Supabase.');
    }

    if (!currentPortfolio) throw new Error('No current portfolio');

    // Get transaction details before deletion for portfolio updates
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!transaction) throw new Error('Transaction not found');

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteError) throw deleteError;

    // Update portfolio holdings based on the deleted transaction
    const existingHolding = holdings.find(h => h.stock_id === transaction.stock_id);

    if (existingHolding && transaction.shares) {
      let newShares: number;
      let newAverageCost: number;

      if (transaction.type === 'buy') {
        // Reverse the buy: subtract shares and recalculate average cost
        newShares = Math.max(0, existingHolding.shares - transaction.shares);
        if (newShares > 0) {
          const totalCost = (existingHolding.shares * existingHolding.average_cost) - transaction.amount;
          newAverageCost = totalCost / newShares;
        } else {
          newAverageCost = 0;
        }
      } else if (transaction.type === 'sell') {
        // Reverse the sell: add shares back
        newShares = existingHolding.shares + transaction.shares;
        newAverageCost = existingHolding.average_cost; // Keep same average cost
      } else {
        // For dividend transactions, no holding changes needed
        newShares = existingHolding.shares;
        newAverageCost = existingHolding.average_cost;
      }

      if (transaction.type !== 'dividend') {
        if (newShares > 0) {
          // Update existing holding
          const { error: updateError } = await supabase
            .from('portfolio_holdings')
            .update({
              shares: newShares,
              average_cost: newAverageCost,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingHolding.id);

          if (updateError) throw updateError;
        } else {
          // Remove holding if no shares left
          const { error: deleteHoldingError } = await supabase
            .from('portfolio_holdings')
            .delete()
            .eq('id', existingHolding.id);

          if (deleteHoldingError) throw deleteHoldingError;
        }
      }
    }

    // Check if this was the last transaction for this stock and update dividends accordingly
    if (transaction.stock_id) {
      // Check if there are any remaining transactions for this stock in the portfolio
      const { data: remainingTransactions, error: remainingError } = await supabase
        .from('transactions')
        .select('id')
        .eq('portfolio_id', currentPortfolio.id)
        .eq('stock_id', transaction.stock_id)
        .neq('type', 'dividend'); // Don't count dividend transactions

      if (remainingError) throw remainingError;

      // If no remaining buy/sell transactions for this stock, it means we no longer hold it
      if (!remainingTransactions || remainingTransactions.length === 0) {
        // Check if there's still a holding (shouldn't be, but double-check)
        const { data: remainingHolding, error: holdingCheckError } = await supabase
          .from('portfolio_holdings')
          .select('shares')
          .eq('portfolio_id', currentPortfolio.id)
          .eq('stock_id', transaction.stock_id)
          .maybeSingle();

        if (holdingCheckError) throw holdingCheckError;

        // If no holding exists or shares are 0, we no longer own this stock
        if (!remainingHolding || remainingHolding.shares === 0) {
          console.log(`🔄 Stock ${transaction.stock_id} no longer held in portfolio, refreshing dividends...`);
          
          // Refresh dividends to exclude this stock
          await fetchDividends();
          await fetchNextDividend(currentPortfolio.id);
        }
      }
    }
    // Refresh data
    await Promise.all([
      fetchHoldings(currentPortfolio.id),
      fetchTransactions(currentPortfolio.id),
      calculateTodaysChange(currentPortfolio.id)
    ]);

    return true;
  };

  // Convert holdings to portfolio data format
  const getPortfolioData = (): PortfolioData[] => {
    return holdings.map(holding => {
      // Use current_price from stock table if available, otherwise use holding current_price
      const currentPrice = holding.stock?.current_price || holding.current_price;
      const value = holding.shares * holding.current_price;
      const cost = holding.shares * holding.average_cost;
      const change = value - cost;
      const changePercent = cost > 0 ? (change / cost) * 100 : 0;

      return {
        symbol: holding.stock?.symbol || '',
        name: holding.stock?.name || '',
        shares: holding.shares,
        price: currentPrice,
        value: value,
        cost: cost,
        change: change,
        changePercent: changePercent
      };
    });
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Check if Supabase is configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          // Use mock data when Supabase is not configured
          createMockPortfolio();
          setLoading(false);
          return;
        }
        
        await fetchPortfolios();
        await fetchDividends();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Fetch holdings and transactions when current portfolio changes
  useEffect(() => {
    if (currentPortfolio) {
      const fetchPortfolioData = async () => {
        try {
          await Promise.all([
            fetchHoldings(currentPortfolio.id),
            fetchTransactions(currentPortfolio.id),
            fetchDividends(),
            fetchNextDividend(currentPortfolio.id),
            calculateTodaysChange(currentPortfolio.id)
          ]);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      };

      fetchPortfolioData();
    }
  }, [currentPortfolio]);

  return {
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
    fetchTransactions
  };
};