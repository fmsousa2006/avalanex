import { useState, useEffect, useCallback, useMemo } from 'react';
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
  
  // Get and validate Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const isSupabaseConfigured = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return false;
    }
    
    if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
      return false;
    }
    
    if (!supabaseUrl.includes('supabase.co')) {
      return false;
    }
    
    if (!supabaseAnonKey.startsWith('eyJ')) {
      return false;
    }
    
    return true;
  }, [supabaseUrl, supabaseAnonKey]);

  // Fetch current stock prices from database
  const fetchStockPrices = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, skipping stock price fetch');
      setError(null);
      setStockPrices([]);
      setLastUpdate(new Date());
      return;
    }

    console.log('📊 Fetching stock prices from Supabase...');
    setError(null);

    try {
      // Test connection first
      console.log('🔗 Fetching stock prices from Supabase...');
      
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
      console.warn('Failed to fetch stock prices from Supabase, using fallback mode:', err);
      setError(null);
      setStockPrices([]);
      setLastUpdate(new Date());
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
      setError('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file and restart the development server.');
      return { success: [], failed: [] };
    }

    if (finnhubApiKey === 'your-finnhub-api-key-here' || finnhubApiKey.length < 10) {
      setError('Invalid Finnhub API key detected. Please update VITE_FINNHUB_API_KEY in your .env file with a valid key from finnhub.io and restart the development server.');
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

  // Test sync O 1D data
  const testSyncO1D = useCallback(async () => {
    if (!finnhubApiKey) {
      setError('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const finnhub = createFinnhubService(finnhubApiKey);
      await finnhub.testSyncO1D();
      console.log('✅ Test sync completed for O 1D data');
    } catch (err) {
      console.error('❌ Error in test sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to test sync O 1D data');
    } finally {
      setLoading(false);
    }
  }, [finnhubApiKey]);

  // Test sync NVIDIA 1D data
  const testSyncNVDA1D = useCallback(async () => {
    if (!finnhubApiKey) {
      setError('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const finnhub = createFinnhubService(finnhubApiKey);
      await finnhub.testSyncNVDA1D();
      console.log('✅ Test sync completed for NVIDIA 1D data');
    } catch (err) {
      console.error('❌ Error in NVIDIA test sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to test sync NVIDIA 1D data');
    } finally {
      setLoading(false);
    }
  }, [finnhubApiKey]);
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
    isSupabaseConfigured,
    testSyncO1D,
    testSyncNVDA1D
  };
};