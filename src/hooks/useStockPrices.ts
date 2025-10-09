import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { finnhubService, StockQuote, CandleData } from '../lib/finnhub';

interface StockPriceData {
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

class StockUpdateService {
  private finnhub = finnhubService;

  async updateStock(symbol: string): Promise<boolean> {
    try {
      console.log(`📊 [Finnhub] Syncing ${symbol}...`);

      const quote = await this.finnhub.getQuote(symbol);
      if (!quote) {
        console.error(`❌ [Finnhub] Failed to fetch quote for ${symbol}`);
        return false;
      }

      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60);
      const candles = await this.finnhub.getCandles(symbol, 'D', from, to);

      if (!candles) {
        console.error(`❌ [Finnhub] Failed to fetch candles for ${symbol}`);
        return false;
      }

      const { data: existingStock, error: stockFetchError } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', symbol)
        .maybeSingle();

      let stockId: string;

      if (existingStock) {
        stockId = existingStock.id;

        const { error: updateError } = await supabase
          .from('stocks')
          .update({
            current_price: quote.c,
            last_price_update: new Date().toISOString()
          })
          .eq('id', stockId);

        if (updateError) {
          console.error(`❌ [Finnhub] Error updating stock ${symbol}:`, updateError);
          return false;
        }
      } else {
        const { data: newStock, error: stockCreateError } = await supabase
          .from('stocks')
          .insert([{
            symbol,
            name: `${symbol} Inc.`,
            current_price: quote.c
          }])
          .select('id')
          .single();

        if (stockCreateError) {
          console.error(`❌ [Finnhub] Error creating stock ${symbol}:`, stockCreateError);
          return false;
        }
        stockId = newStock.id;
      }

      const { error: holdingsUpdateError } = await supabase
        .from('portfolio_holdings')
        .update({
          current_price: quote.c,
          last_updated: new Date().toISOString()
        })
        .eq('stock_id', stockId);

      if (holdingsUpdateError) {
        console.warn(`⚠️ [Finnhub] Error updating holdings for ${symbol}:`, holdingsUpdateError);
      }

      const historicalData: StockPriceData[] = [];
      for (let i = 0; i < candles.c.length; i++) {
        const timestamp = new Date(candles.t[i] * 1000);
        timestamp.setHours(16, 0, 0, 0);

        historicalData.push({
          timestamp: timestamp.toISOString(),
          open_price: candles.o[i],
          high_price: candles.h[i],
          low_price: candles.l[i],
          close_price: candles.c[i],
          volume: candles.v[i] || 0
        });
      }

      const { error: deleteError } = await supabase
        .from('stock_prices_30d')
        .delete()
        .eq('stock_id', stockId);

      if (deleteError) {
        console.warn(`⚠️ [Finnhub] Error deleting old data for ${symbol}:`, deleteError);
      }

      const price30DRecords = historicalData.map(dataPoint => ({
        stock_id: stockId,
        timestamp: dataPoint.timestamp,
        open_price: dataPoint.open_price,
        high_price: dataPoint.high_price,
        low_price: dataPoint.low_price,
        close_price: dataPoint.close_price,
        volume: dataPoint.volume
      }));

      const { error: insertError } = await supabase
        .from('stock_prices_30d')
        .insert(price30DRecords);

      if (insertError) {
        console.error(`❌ [Finnhub] Error inserting 30d data for ${symbol}:`, insertError);
        return false;
      }

      console.log(`✅ [Finnhub] Successfully synced ${symbol} - Price: $${quote.c}, 30-day data: ${historicalData.length} points`);
      return true;
    } catch (error) {
      console.error(`❌ [Finnhub] Error updating ${symbol}:`, error);
      return false;
    }
  }

  async updateMultipleStocks(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    console.log(`📊 [Finnhub] Syncing ${symbols.length} stocks...`);

    for (const symbol of symbols) {
      try {
        const success = await this.updateStock(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }

        await new Promise(resolve => setTimeout(resolve, 1200));
      } catch (error) {
        console.error(`❌ [Finnhub] Failed to update ${symbol}:`, error);
        results.failed.push(symbol);
      }
    }

    console.log(`✅ [Finnhub] Synced ${results.success.length}/${symbols.length} stocks successfully`);
    if (results.failed.length > 0) {
      console.warn(`⚠️ [Finnhub] Failed to sync: ${results.failed.join(', ')}`);
    }
    return results;
  }
}

const stockUpdateService = new StockUpdateService();

export const useStockPrices = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;
  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-ref.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-anon-key-here'
  );

  const isConfigured = !!(finnhubApiKey && finnhubApiKey !== 'your-finnhub-api-key-here');

  const updateStockPricesWithHistoricalData = useCallback(async (symbols: string[]) => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not properly configured. Please check your environment variables.');
      return { success: [], failed: symbols };
    }

    if (!isConfigured) {
      setError('Finnhub API key not configured. Please add VITE_FINNHUB_API_KEY to your .env file.');
      return { success: [], failed: symbols };
    }

    setLoading(true);
    setError(null);

    try {
      const results = await stockUpdateService.updateMultipleStocks(symbols);
      return results;
    } catch (err) {
      console.error('Error updating stock prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stock prices');
      return { success: [], failed: symbols };
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, isConfigured]);

  const autoFetch30DayDataForPortfolio = useCallback(async (portfolioData: { holdings: Array<{ stock?: { symbol: string } }> }) => {
    if (!isSupabaseConfigured || !isConfigured || portfolioData.holdings.length === 0) {
      return { success: [], failed: [] };
    }

    console.log('🔄 [Dashboard] Auto-fetching data for portfolio stocks...');

    const symbols = portfolioData.holdings.map(holding => holding.stock?.symbol).filter(Boolean) as string[];
    return await updateStockPricesWithHistoricalData(symbols);
  }, [updateStockPricesWithHistoricalData, isSupabaseConfigured, isConfigured]);

  const testSyncO1D = useCallback(async () => {
    if (!isConfigured) {
      throw new Error('Finnhub API key not configured');
    }
    setLoading(true);
    try {
      const success = await stockUpdateService.updateStock('O');
      if (!success) {
        throw new Error('Failed to sync O stock data');
      }
      console.log('✅ O stock sync completed');
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  const testSyncNVDA1D = useCallback(async () => {
    if (!isConfigured) {
      throw new Error('Finnhub API key not configured');
    }

    setLoading(true);
    try {
      const success = await stockUpdateService.updateStock('NVDA');
      if (!success) {
        throw new Error('Failed to sync NVDA stock data');
      }
      console.log('✅ NVDA stock sync completed');
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  return {
    loading,
    error,
    isConfigured: isConfigured && isSupabaseConfigured,
    updateStockPricesWithHistoricalData,
    autoFetch30DayDataForPortfolio,
    testSyncO1D,
    testSyncNVDA1D,
    updateStockPrices: updateStockPricesWithHistoricalData,
    updateStockWith30DayData: testSyncO1D
  };
};
