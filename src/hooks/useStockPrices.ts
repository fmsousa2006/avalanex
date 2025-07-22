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

  // Fetch current stock prices from database
  const fetchStockPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('symbol, current_price, price_change_24h, price_change_percent_24h, market_status, last_price_update')
        .eq('is_active', true)
        .order('symbol');

      if (error) throw error;

      setStockPrices(data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching stock prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stock prices');
    }
  }, []);

  // Update stock prices from Finnhub API
  const updateStockPrices = useCallback(async (symbols?: string[]) => {
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
      setError(err instanceof Error ? err.message : 'Failed to update stock prices');
      return { success: [], failed: [] };
    } finally {
      setLoading(false);
    }
  }, [finnhubApiKey, fetchStockPrices]);

  // Update a single stock price
  const updateSingleStockPrice = useCallback(async (symbol: string) => {
    const results = await updateStockPrices([symbol]);
    return results.success.includes(symbol);
  }, [updateStockPrices]);

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
    fetchStockPrices();

    const interval = setInterval(() => {
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
  }, [fetchStockPrices, updateStockPrices, arePricesStale]);

  return {
    stockPrices,
    loading,
    error,
    lastUpdate,
    updateStockPrices,
    updateSingleStockPrice,
    fetchStockPrices,
    arePricesStale,
    getStockPrice,
    isConfigured: !!finnhubApiKey
  };
};