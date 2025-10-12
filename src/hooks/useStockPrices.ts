import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { finnhubService } from '../lib/finnhub';

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

  private isMarketHours(): boolean {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = nyTime.getDay();
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();

    if (day === 0 || day === 6) return false;

    const currentMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;

    return currentMinutes >= marketOpen && currentMinutes < marketClose;
  }

  async updateStock(symbol: string): Promise<boolean> {
    if (!this.isMarketHours()) {
      console.log(`⏸️ [Finnhub] Market is closed. Skipping API call for ${symbol}`);
      return false;
    }

    try {
      console.log(`📊 [Finnhub] Fetching live quote for ${symbol}...`);

      // Fetch live quote from Finnhub
      const quote = await this.finnhub.getQuote(symbol);
      if (!quote) {
        console.error(`❌ [Finnhub] Failed to fetch quote for ${symbol}`);
        return false;
      }

      // Get stock from database
      const { data: existingStock, error: stockFetchError } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', symbol)
        .maybeSingle();

      if (stockFetchError) {
        console.error(`❌ [Database] Error fetching stock ${symbol}:`, stockFetchError);
        return false;
      }

      let stockId: string;

      if (existingStock) {
        stockId = existingStock.id;

        // Update stock with latest price from Finnhub
        const { error: updateError } = await supabase
          .from('stocks')
          .update({
            current_price: quote.c,
            price_change_24h: quote.d,
            price_change_percent_24h: quote.dp,
            last_price_update: new Date().toISOString()
          })
          .eq('id', stockId);

        if (updateError) {
          console.error(`❌ [Database] Error updating stock ${symbol}:`, updateError);
          return false;
        }
      } else {
        // Create new stock if it doesn't exist
        const { data: newStock, error: stockCreateError } = await supabase
          .from('stocks')
          .insert([{
            symbol,
            name: `${symbol} Inc.`,
            current_price: quote.c,
            price_change_24h: quote.d,
            price_change_percent_24h: quote.dp,
            is_active: true
          }])
          .select('id')
          .single();

        if (stockCreateError) {
          console.error(`❌ [Database] Error creating stock ${symbol}:`, stockCreateError);
          return false;
        }
        stockId = newStock.id;
      }

      // Update portfolio holdings with latest price
      const { error: holdingsUpdateError } = await supabase
        .from('portfolio_holdings')
        .update({
          current_price: quote.c,
          last_updated: new Date().toISOString()
        })
        .eq('stock_id', stockId);

      if (holdingsUpdateError) {
        console.warn(`⚠️ [Database] Error updating holdings for ${symbol}:`, holdingsUpdateError);
      }

      console.log(`✅ [Finnhub] Successfully synced ${symbol} - Price: $${quote.c} (${quote.dp >= 0 ? '+' : ''}${quote.dp}%)`);
      return true;
    } catch (error) {
      console.error(`❌ [Finnhub] Error updating ${symbol}:`, error);
      return false;
    }
  }

  async updateMultipleStocks(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    if (!this.isMarketHours()) {
      console.log(`⏸️ [Finnhub] Market is closed. Skipping sync for ${symbols.length} stocks`);
      return { success: [], failed: symbols };
    }

    console.log(`📊 [Finnhub] Syncing ${symbols.length} stocks...`);

    for (const symbol of symbols) {
      try {
        const success = await this.updateStock(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }

        // Rate limiting: wait between requests to respect API limits
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

    console.log('🔄 [Dashboard] Auto-fetching live prices for portfolio stocks...');

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
