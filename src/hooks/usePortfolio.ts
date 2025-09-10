import { useState, useEffect, useRef } from 'react';
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
  // State declarations
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
    
    const isConfigured = url && 
                        key && 
                        url !== 'https://your-project-ref.supabase.co' &&
                        url !== 'https://placeholder.supabase.co' &&
                        key !== 'your-anon-key-here' &&
                        key !== 'placeholder-anon-key' &&
                        !url.includes('your-project-ref');
    
    console.log('🔧 [usePortfolio] Supabase configuration check:', {
      url: url ? `${url.substring(0, 20)}...` : 'missing',
      key: key ? `${key.substring(0, 10)}...` : 'missing',
      isConfigured
    });
    
    return isConfigured;
  };

  // Get current user
  const getCurrentUser = async () => {
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

    console.log('📊 [usePortfolio] Creating mock portfolio with data:', {
      portfolio: mockPortfolio,
      holdings: mockHoldings.length,
      transactions: mockTransactions.length,
      dividends: mockDividends.length
    });

    setPortfolios([mockPortfolio]);
    setCurrentPortfolio(prev => {
      if (!prev || prev.id !== mockPortfolio.id) {
        console.log('Updating currentPortfolio from', prev?.id, 'to', mockPortfolio.id);
        return mockPortfolio;
      }
      if (JSON.stringify(prev) !== JSON.stringify(mockPortfolio)) {
        console.log('Updating currentPortfolio due to content change');
        return mockPortfolio;
      }
      return prev;
    });
    setHoldings(mockHoldings);
    setTransactions(mockTransactions);
    setDividends(mockDividends);
    setIsUsingMockData(true);
    setIsSupabaseConfiguredForRealData(false);
  };

  // Create default portfolio for new users
  const createDefaultPortfolio = async (userId: string) => {
    try {
      const { data: newPortfolio, error } = await supabase
        .from('portfolios')
        .insert([
          {
            user_id: userId,
            name: 'My Portfolio',
            description: 'Default portfolio'
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return newPortfolio;
    } catch (error) {
      console.error('Error creating default portfolio:', error);
      return null;
    }
  };

  // Fetch portfolios from Supabase
  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id);

      if (portfoliosError) throw portfoliosError;

      if (!portfoliosData || portfoliosData.length === 0) {
        // Create default portfolio for new user
        const newPortfolio = await createDefaultPortfolio(user.id);
        if (newPortfolio) {
          setPortfolios([newPortfolio]);
          setCurrentPortfolio(newPortfolio);
        }
      } else {
        setPortfolios(portfoliosData);
        setCurrentPortfolio(portfoliosData[0]);
      }

      setIsSupabaseConfiguredForRealData(true);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch portfolios');
      createMockPortfolio();
    } finally {
      setLoading(false);
    }
  };

  // Fetch holdings for current portfolio
  const fetchHoldings = async (portfolioId: string) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .select(`
          *,
          stock:stocks(*)
        `)
        .eq('portfolio_id', portfolioId);

      if (error) throw error;
      setHoldings(data || []);
    } catch (error) {
      console.error('Error fetching holdings:', error);
    }
  };

  // Fetch transactions for current portfolio
  const fetchTransactions = async (portfolioId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          stock:stocks(*)
        `)
        .eq('portfolio_id', portfolioId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Update portfolio holdings based on transaction
  const updatePortfolioHoldings = async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      // Check if holding already exists
      const { data: existingHolding, error: holdingError } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', transaction.portfolio_id)
        .eq('stock_id', transaction.stock_id)
        .maybeSingle();

      if (holdingError && holdingError.code !== 'PGRST116') {
        throw holdingError;
      }

      if (existingHolding) {
        // Update existing holding
        const newShares = transaction.type === 'buy' 
          ? existingHolding.shares + (transaction.shares || 0)
          : existingHolding.shares - (transaction.shares || 0);
        
        const newAverageCost = transaction.type === 'buy'
          ? ((existingHolding.shares * existingHolding.average_cost) + (transaction.amount || 0)) / newShares
          : existingHolding.average_cost;

        const { error: updateError } = await supabase
          .from('portfolio_holdings')
          .update({
            shares: Math.max(0, newShares),
            average_cost: newAverageCost,
            current_price: transaction.price || existingHolding.current_price,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingHolding.id);

        if (updateError) throw updateError;
      } else if (transaction.type === 'buy') {
        // Create new holding for buy transactions
        const { error: insertError } = await supabase
          .from('portfolio_holdings')
          .insert([{
            portfolio_id: transaction.portfolio_id,
            stock_id: transaction.stock_id,
            shares: transaction.shares || 0,
            average_cost: transaction.price || 0,
            current_price: transaction.price || 0,
            last_updated: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating portfolio holdings:', error);
    }
  };

  // Recalculate all portfolio holdings
  const recalculatePortfolioHoldings = async (portfolioId: string) => {
    try {
      // Get all transactions for this portfolio
      const { data: allTransactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .in('type', ['buy', 'sell'])
        .order('transaction_date', { ascending: true });

      if (transError) throw transError;

      // Clear existing holdings
      const { error: clearError } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('portfolio_id', portfolioId);

      if (clearError) throw clearError;

      // Recalculate holdings from transactions
      const holdingsMap = new Map();

      allTransactions?.forEach(tx => {
        const key = tx.stock_id;
        if (!holdingsMap.has(key)) {
          holdingsMap.set(key, {
            portfolio_id: portfolioId,
            stock_id: tx.stock_id,
            shares: 0,
            total_cost: 0,
            current_price: tx.price || 0
          });
        }

        const holding = holdingsMap.get(key);
        if (tx.type === 'buy') {
          holding.shares += tx.shares || 0;
          holding.total_cost += tx.amount || 0;
        } else if (tx.type === 'sell') {
          holding.shares -= tx.shares || 0;
          // Reduce total cost proportionally
          const sellRatio = (tx.shares || 0) / (holding.shares + (tx.shares || 0));
          holding.total_cost *= (1 - sellRatio);
        }
        holding.current_price = tx.price || holding.current_price;
      });

      // Insert recalculated holdings
      const holdingsToInsert = Array.from(holdingsMap.values())
        .filter(holding => holding.shares > 0)
        .map(holding => ({
          ...holding,
          average_cost: holding.total_cost / holding.shares,
          last_updated: new Date().toISOString()
        }));

      if (holdingsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('portfolio_holdings')
          .insert(holdingsToInsert);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error recalculating portfolio holdings:', error);
    }
  };

  // Add transaction
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh data
      if (currentPortfolio) {
        await fetchTransactions(currentPortfolio.id);
        await fetchHoldings(currentPortfolio.id);
        
        // Update portfolio holdings based on the transaction
        await updatePortfolioHoldings(transaction);
      }
      
      return data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh data
      if (currentPortfolio) {
        await fetchTransactions(currentPortfolio.id);
        await fetchHoldings(currentPortfolio.id);
        
        // Recalculate portfolio holdings
        await recalculatePortfolioHoldings(currentPortfolio.id);
      }
      
      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh data
      if (currentPortfolio) {
        await fetchTransactions(currentPortfolio.id);
        await fetchHoldings(currentPortfolio.id);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  // Get portfolio data for charts
  const getPortfolioData = (): PortfolioData => {
    const totalValue = holdings.reduce((sum, holding) => 
      sum + (holding.shares * holding.current_price), 0
    );
    
    const totalCost = holdings.reduce((sum, holding) => 
      sum + (holding.shares * holding.average_cost), 0
    );
    
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdings: holdings.map(holding => ({
        symbol: holding.stock?.symbol || '',
        name: holding.stock?.name || '',
        shares: holding.shares,
        currentPrice: holding.current_price,
        averageCost: holding.average_cost,
        totalValue: holding.shares * holding.current_price,
        gainLoss: (holding.current_price - holding.average_cost) * holding.shares,
        gainLossPercent: holding.average_cost > 0 ? 
          ((holding.current_price - holding.average_cost) / holding.average_cost) * 100 : 0
      }))
    };
  };

  // Calculate next dividend
  const calculateNextDividend = () => {
    const upcomingDividends = dividends.filter(div => 
      div.status === 'upcoming' && new Date(div.payment_date) > new Date()
    );
    
    if (upcomingDividends.length === 0) {
      setNextDividend(null);
      return;
    }
    
    const nextDiv = upcomingDividends.sort((a, b) => 
      new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    )[0];
    
    const holding = holdings.find(h => h.stock_id === nextDiv.stock_id);
    const totalAmount = holding ? holding.shares * nextDiv.amount : nextDiv.amount;
    
    setNextDividend({
      symbol: nextDiv.stock?.symbol || '',
      amount: nextDiv.amount,
      date: nextDiv.payment_date,
      totalAmount
    });
  };

  // Calculate today's change
  const calculateTodaysChange = () => {
    // This would typically use real-time price data
    // For now, using mock calculation
    const totalValue = holdings.reduce((sum, holding) => 
      sum + (holding.shares * holding.current_price), 0
    );
    
    // Mock 1.2% gain for demo
    const changePercent = 1.2;
    const changeValue = totalValue * (changePercent / 100);
    
    setTodaysChange({
      value: changeValue,
      percentage: changePercent
    });
  };

  // Initialize data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        if (!isSupabaseEnvConfigured()) {
          console.log('Supabase not configured, using mock data');
          createMockPortfolio();
          return;
        }

        // Get current authenticated user (don't sign in anonymously)
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error getting user:', error);
          // Don't create mock portfolio if user authentication fails
          // Let the app handle authentication properly
          return;
        }

        if (!user) {
          console.warn('No authenticated user found, using mock data');
          // Don't create mock portfolio if no user
          // Let the app handle authentication properly
          return;
        }

        console.log('Authenticated user found, fetching portfolios...');
        await fetchPortfolios();
      } catch (error) {
        console.error('Error during initialization:', error);
        // Don't fallback to mock data on errors
        setError(error instanceof Error ? error.message : 'Failed to initialize portfolio');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch related data when current portfolio changes
  useEffect(() => {
    if (currentPortfolio) {
      console.log('📊 [usePortfolio] Fetching data for portfolio:', currentPortfolio.id);
      fetchHoldings(currentPortfolio.id);
      fetchTransactions(currentPortfolio.id);
      
      // Also fetch dividends for the portfolio
      const fetchDividends = async (portfolioId: string) => {
        try {
          // Get all stocks in the portfolio first
          const { data: holdings, error: holdingsError } = await supabase
            .from('portfolio_holdings')
            .select('stock_id')
            .eq('portfolio_id', portfolioId);

          if (holdingsError || !holdings || holdings.length === 0) {
            setDividends([]);
            return;
          }

          const stockIds = holdings.map(h => h.stock_id);

          const { data, error } = await supabase
            .from('dividends')
            .select(`
              *,
              stock:stocks(*)
            `)
            .in('stock_id', stockIds);

          if (error) {
            console.error('Error fetching dividends:', error);
            setDividends([]);
            return;
          }
          
          setDividends(data || []);
        } catch (error) {
          console.error('Error fetching dividends:', error);
          setDividends([]);
        }
      };
      
      fetchDividends(currentPortfolio.id);
    }
  }, [currentPortfolio]);
  )

  // Calculate derived data when holdings or dividends change
  useEffect(() => {
    calculateNextDividend();
    calculateTodaysChange();
  }, [holdings, dividends]);

  return {
    portfolios,
    currentPortfolio,
    holdings,
    transactions,
    dividends,
    loading,
    error,
    isUsingMockData,
    isSupabaseConfiguredForRealData,
    nextDividend,
    todaysChange,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getPortfolioData,
    fetchPortfolios,
    fetchHoldings,
    fetchTransactions
  };
};