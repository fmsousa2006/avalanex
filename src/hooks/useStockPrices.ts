import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface StockPriceData {
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

class StockUpdateService {
  async updateStock(symbol: string): Promise<boolean> {
    try {
      console.log(`📊 [Database] Checking ${symbol} data...`);

      // Get stock from database
      const { data: existingStock, error: stockFetchError } = await supabase
        .from('stocks')
        .select('id, current_price, last_price_update')
        .eq('symbol', symbol)
        .maybeSingle();

      if (stockFetchError) {
        console.error(`❌ [Database] Error fetching stock ${symbol}:`, stockFetchError);
        return false;
      }

      if (!existingStock) {
        console.warn(`⚠️ [Database] Stock ${symbol} not found in database. Use Stock Management to add it.`);
        return false;
      }

      const stockId = existingStock.id;

      // Check if we have recent price data (within last hour)
      const lastUpdate = existingStock.last_price_update ? new Date(existingStock.last_price_update) : null;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (lastUpdate && lastUpdate > oneHourAgo) {
        console.log(`✅ [Database] ${symbol} has recent data (updated ${lastUpdate.toLocaleString()})`);
      } else {
        console.warn(`⚠️ [Database] ${symbol} data is stale. Automatic sync will update during market hours.`);
      }

      // Get 30-day historical data from stock_prices table
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { data: historicalData, error: historyError } = await supabase
        .from('stock_prices')
        .select('timestamp, open_price, high_price, low_price, close_price, volume')
        .eq('stock_id', stockId)
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (historyError) {
        console.error(`❌ [Database] Error fetching historical data for ${symbol}:`, historyError);
        return false;
      }

      // If we don't have enough historical data, copy from stock_prices_30d table as fallback
      if (!historicalData || historicalData.length === 0) {
        console.log(`📥 [Database] No hourly data found, using 30d backup table for ${symbol}...`);

        const { data: backup30d, error: backup30dError } = await supabase
          .from('stock_prices_30d')
          .select('timestamp, open_price, high_price, low_price, close_price, volume')
          .eq('stock_id', stockId)
          .order('timestamp', { ascending: true });

        if (!backup30dError && backup30d && backup30d.length > 0) {
          console.log(`✅ [Database] Found ${backup30d.length} days of backup data for ${symbol}`);
        } else {
          console.warn(`⚠️ [Database] No historical data available for ${symbol}. Data will accumulate from automatic syncs.`);
        }
      } else {
        console.log(`✅ [Database] Found ${historicalData.length} price records for ${symbol}`);
      }

      // Update portfolio holdings with current price
      if (existingStock.current_price) {
        const { error: holdingsUpdateError } = await supabase
          .from('portfolio_holdings')
          .update({
            current_price: existingStock.current_price,
            last_updated: new Date().toISOString()
          })
          .eq('stock_id', stockId);

        if (holdingsUpdateError) {
          console.warn(`⚠️ [Database] Error updating holdings for ${symbol}:`, holdingsUpdateError);
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ [Database] Error updating ${symbol}:`, error);
      return false;
    }
  }

  async updateMultipleStocks(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    console.log(`📊 [Database] Checking ${symbols.length} stocks...`);

    for (const symbol of symbols) {
      try {
        const success = await this.updateStock(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }
      } catch (error) {
        console.error(`❌ [Database] Failed to update ${symbol}:`, error);
        results.failed.push(symbol);
      }
    }

    console.log(`✅ [Database] Checked ${results.success.length}/${symbols.length} stocks successfully`);
    if (results.failed.length > 0) {
      console.warn(`⚠️ [Database] Failed to check: ${results.failed.join(', ')}`);
    }
    return results;
  }
}

const stockUpdateService = new StockUpdateService();

export const useStockPrices = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-ref.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-anon-key-here'
  );

  const updateStockPricesWithHistoricalData = useCallback(async (symbols: string[]) => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not properly configured. Please check your environment variables.');
      return { success: [], failed: symbols };
    }

    setLoading(true);
    setError(null);

    try {
      const results = await stockUpdateService.updateMultipleStocks(symbols);
      return results;
    } catch (err) {
      console.error('Error checking stock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to check stock data');
      return { success: [], failed: symbols };
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured]);

  const autoFetch30DayDataForPortfolio = useCallback(async (portfolioData: { holdings: Array<{ stock?: { symbol: string } }> }) => {
    if (!isSupabaseConfigured || portfolioData.holdings.length === 0) {
      return { success: [], failed: [] };
    }

    console.log('🔄 [Dashboard] Checking portfolio stock data...');

    const symbols = portfolioData.holdings.map(holding => holding.stock?.symbol).filter(Boolean) as string[];
    return await updateStockPricesWithHistoricalData(symbols);
  }, [updateStockPricesWithHistoricalData, isSupabaseConfigured]);

  const testSyncO1D = useCallback(async () => {
    setLoading(true);
    try {
      const success = await stockUpdateService.updateStock('O');
      if (!success) {
        throw new Error('Failed to check O stock data');
      }
      console.log('✅ O stock data checked');
    } finally {
      setLoading(false);
    }
  }, []);

  const testSyncNVDA1D = useCallback(async () => {
    setLoading(true);
    try {
      const success = await stockUpdateService.updateStock('NVDA');
      if (!success) {
        throw new Error('Failed to check NVDA stock data');
      }
      console.log('✅ NVDA stock data checked');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    isConfigured: isSupabaseConfigured,
    updateStockPricesWithHistoricalData,
    autoFetch30DayDataForPortfolio,
    testSyncO1D,
    testSyncNVDA1D,
    updateStockPrices: updateStockPricesWithHistoricalData,
    updateStockWith30DayData: testSyncO1D
  };
};
