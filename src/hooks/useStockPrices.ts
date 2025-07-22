import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createFinnhubService } from '../lib/finnhub';

interface StockPrice {
  symbol: string;
  current_price: number;
  price_change_24h: number;
  price_change_percent_24h: number;
  market_status: string;
  last_price_update: string;
}

export const useStockPrices = () => {
  const [stockPrices, setStockPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Get Finnhub API key from environment variables
  const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;
  
  // Get Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.includes('supabase.co') && 
    supabaseAnonKey.startsWith('eyJ') &&
    supabaseUrl !== 'https://placeholder.supabase.co' && 
    supabaseAnonKey !== 'placeholder-key';

  // Fetch current stock prices from database
  const fetchStockPrices = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase configuration error. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
      return;
    }

    try {
      // Test connection first
      const { error: connectionError } = await supabase.from('stocks').select('count').limit(1);
      if (connectionError) {
        throw new Error(`Supabase connection failed: ${connectionError.message}`);
      }

      const { data, error } = await supabase
        .from('stocks')
        .select('symbol, current_price, price_change_24h, price_change_percent_24h, market_status, last_price_update')
        .eq('is_active', true)
        .order('symbol');

      if (error) throw error;

      setStockPrices(data || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching stock prices:', err);
      if (err instanceof Error) {
        if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
          setError('Network connection failed. Please check: 1) Internet connection, 2) Supabase project is active, 3) Firewall settings, 4) .env file configuration.');
        } else if (err.message.includes('Invalid API key')) {
          setError('Invalid Supabase API key. Please check VITE_SUPABASE_ANON_KEY in your .env file.');
        } else {
          setError(`Supabase error: ${err.message}`);
        }
      } else {
        setError('Unknown error occurred while fetching stock prices');
      }
    }
  }, [isSupabaseConfigured]);

  // Update stock prices from Finnhub API
  const updateStockPrices = useCallback(async (symbols?: string[]) => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not properly configured. Please check your environment variables.');
      return { success: [], failed: [] };
    }

    if (!finnhubApiKey) {
      setError('Finnhub API key not configured');
      return { success: [], failed: [] };
    }

    setLoading(true);
    setError(null);

    try {
      const finnhub = createFinnhubService(finnhubApiKey);
      
      // If no symbols provided, get all active stocks
      let stockSymbols = symbols;
      if (!stockSymbols) {
        const { data, error } = await supabase
          .from('stocks')
          .select('symbol')
          .eq('is_active', true);

        if (error) throw error;
        stockSymbols = data?.map(stock => stock.symbol) || [];
      }

      if (stockSymbols.length === 0) {
        return { success: [], failed: [] };
      }

      // Update prices using Finnhub service
      const results = await finnhub.updateMultipleStockPrices(stockSymbols);
      
      // Refresh local data
      await fetchStockPrices();
      
      return results;
    } catch (err) {
      console.error('Error updating stock prices:', err);
      if (err instanceof Error && err.message.includes('NetworkError')) {
        setError('Network connection failed. Please check your internet connection, firewall settings, or Supabase project status.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update stock prices');
      }
      return { success: [], failed: [] };
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, finnhubApiKey, fetchStockPrices]);

  // Update stock prices with historical data from Finnhub API
  const updateStockPricesWithHistoricalData = useCallback(async (symbols?: string[]) => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not properly configured. Please check your environment variables.');
      return { success: [], failed: [] };
    }

    if (!finnhubApiKey) {
      setError('Finnhub API key not configured');
      return { success: [], failed: [] };
    }

    setLoading(true);
    setError(null);

    try {
      const finnhub = createFinnhubService(finnhubApiKey);
      
      // If no symbols provided, get all active stocks
      let stockSymbols = symbols;
      if (!stockSymbols) {
        const { data, error } = await supabase
          .from('stocks')
          .select('symbol')
          .eq('is_active', true);

        if (error) throw error;
        stockSymbols = data?.map(stock => stock.symbol) || [];
      }

      if (stockSymbols.length === 0) {
        return { success: [], failed: [] };
      }

      // Update prices with historical data using Finnhub service
      const results = await finnhub.updateMultipleStocksWithHistoricalData(stockSymbols);
      
      // Refresh local data
      await fetchStockPrices();
      
      return results;
    } catch (err) {
      console.error('Error updating stock prices with historical data:', err);
      if (err instanceof Error && err.message.includes('NetworkError')) {
        setError('Network connection failed. Please check your internet connection, firewall settings, or Supabase project status.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update stock prices with historical data');
      }
      return { success: [], failed: [] };
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, finnhubApiKey, fetchStockPrices]);

  // Update a single stock price
  const updateSingleStockPrice = useCallback(async (symbol: string) => {
    const results = await updateStockPrices([symbol]);
    return results.success.includes(symbol);
  }, [updateStockPrices]);

  // Update a single stock with historical data
  const updateSingleStockWithHistoricalData = useCallback(async (symbol: string) => {
    const results = await updateStockPricesWithHistoricalData([symbol]);
    return results.success.includes(symbol);
  }, [updateStockPricesWithHistoricalData]);

  // Check if prices are stale (older than 5 minutes)
  const arePricesStale = useCallback((minutes: number = 5) => {
    if (!lastUpdate) return true;
    
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    return diffInMinutes > minutes;
  }, [lastUpdate]);

  // Get price for a specific symbol
  const getStockPrice = useCallback((symbol: string): StockPrice | null => {
    return stockPrices.find(stock => stock.symbol === symbol) || null;
  }, [stockPrices]);

  // Auto-refresh prices every 5 minutes during market hours
  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchStockPrices();
    }

    const interval = setInterval(() => {
      if (!isSupabaseConfigured) return;
      
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();

      // Only auto-update during market hours (weekdays 9 AM - 4 PM)
      if (day >= 1 && day <= 5 && hour >= 9 && hour < 16) {
        if (arePricesStale()) {
          updateStockPrices();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isSupabaseConfigured, fetchStockPrices, updateStockPrices, arePricesStale]);

  return {
    stockPrices,
    loading,
    error,
    lastUpdate,
    updateStockPrices,
    updateStockPricesWithHistoricalData,
    updateSingleStockPrice,
    updateSingleStockWithHistoricalData,
    fetchStockPrices,
    arePricesStale,
    getStockPrice,
    isConfigured: !!finnhubApiKey,
    isSupabaseConfigured
  };
};