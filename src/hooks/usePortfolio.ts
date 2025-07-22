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

    const { data, error } = await supabase
      .from('dividends')
      .select(`
        *,
        stock:stocks(*)
      `)
      .order('payment_date', { ascending: true });

    if (error) throw error;
    setDividends(data || []);
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
      fetchTransactions(currentPortfolio.id)
    ]);

    return transaction;
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

    // Refresh data
    await Promise.all([
      fetchHoldings(currentPortfolio.id),
      fetchTransactions(currentPortfolio.id)
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
            fetchTransactions(currentPortfolio.id)
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
    loading,
    error,
    isUsingMockData,
    addTransaction,
    deleteTransaction,
    getPortfolioData,
    setCurrentPortfolio
  };
};