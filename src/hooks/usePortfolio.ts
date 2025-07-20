import { useState, useEffect } from 'react';
import { supabase, Portfolio, PortfolioHolding, Transaction, Dividend, Stock, PortfolioData } from '../lib/supabase';

export const usePortfolio = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user
  const getCurrentUser = async () => {
    // Return null if Supabase is not properly configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return null;
    }
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  // Create default portfolio for new users
  const createDefaultPortfolio = async (userId: string) => {
    const { data, error } = await supabase
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
    return data;
  };

  // Fetch portfolios
  const fetchPortfolios = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (data.length === 0) {
      // Create default portfolio if none exists
      const defaultPortfolio = await createDefaultPortfolio(user.id);
      setPortfolios([defaultPortfolio]);
      setCurrentPortfolio(defaultPortfolio);
    } else {
      setPortfolios(data);
      setCurrentPortfolio(data[0]); // Set first portfolio as current
    }
  };

  // Fetch holdings for current portfolio
  const fetchHoldings = async (portfolioId: string) => {
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
    const { data, error } = await supabase
      .from('stocks')
      .upsert([{ symbol, name }], { onConflict: 'symbol' })
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

  // Convert holdings to portfolio data format
  const getPortfolioData = (): PortfolioData[] => {
    return holdings.map(holding => {
      const value = holding.shares * holding.current_price;
      const cost = holding.shares * holding.average_cost;
      const change = value - cost;
      const changePercent = cost > 0 ? (change / cost) * 100 : 0;

      return {
        symbol: holding.stock?.symbol || '',
        name: holding.stock?.name || '',
        shares: holding.shares,
        price: holding.current_price,
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
          setError('Supabase not configured. Please connect to Supabase to use the portfolio features.');
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
    addTransaction,
    getPortfolioData,
    setCurrentPortfolio
  };
};