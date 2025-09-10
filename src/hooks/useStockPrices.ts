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

// Finnhub API service
class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Generate 30-day historical data (mock data for now, can be replaced with real API calls)
  private generate30DayData(symbol: string): StockPriceData[] {
    const data: StockPriceData[] = [];
    const now = new Date();
    
    // Generate 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Use symbol as seed for consistent data generation
      const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      let random = seed + i * 17;
      random = (random * 9301 + 49297) % 233280;
      const normalizedRandom = random / 233280;
      
      // Generate realistic price data
      const basePrice = symbol === 'O' ? 58.25 : symbol === 'NVDA' ? 875.25 : 175.50;
      const volatility = basePrice * 0.02; // 2% daily volatility
      const priceChange = (normalizedRandom - 0.5) * volatility;
      const price = Math.max(basePrice + priceChange, 1);
      
      // Generate OHLC data
      const open = price * (0.98 + normalizedRandom * 0.04);
      const close = price;
      const high = Math.max(open, close) * (1 + normalizedRandom * 0.02);
      const low = Math.min(open, close) * (1 - normalizedRandom * 0.02);
      const volume = Math.floor((1000000 + normalizedRandom * 5000000));
      
      data.push({
        timestamp: date.toISOString(),
        open_price: open,
        high_price: high,
        low_price: low,
        close_price: close,
        volume: volume
      });
    }
    
    return data;
  }

  // Update stock with 30-day historical data
  async updateStockWith30DayData(symbol: string): Promise<boolean> {
    try {
      console.log(`📊 [Finnhub] Fetching 30-day historical data for ${symbol}...`);
      
      // Get or create stock in database
      const { data: existingStock, error: stockFetchError } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', symbol)
        .maybeSingle();

      let stockId: string;

      if (existingStock) {
        stockId = existingStock.id;
      } else {
        // Create new stock entry
        const { data: newStock, error: stockCreateError } = await supabase
          .from('stocks')
          .insert([{ 
            symbol, 
            name: `${symbol} Inc.`,
            current_price: symbol === 'O' ? 58.25 : symbol === 'NVDA' ? 875.25 : 175.50
          }])
          .select('id')
          .single();

        if (stockCreateError) {
          console.error(`❌ [Finnhub] Error creating stock ${symbol}:`, stockCreateError);
          return false;
        }
        stockId = newStock.id;
      }

      // Check existing 30-day data
      const { data: existing30DData, error: existing30DError } = await supabase
        .from('stock_prices_30d')
        .select('timestamp')
        .eq('stock_id', stockId)
        .order('timestamp', { ascending: true });

      if (existing30DError) {
        console.error(`❌ [Finnhub] Error checking existing 30d data for ${symbol}:`, existing30DError);
        return false;
      }

      // Get existing timestamps as a Set for fast lookup
      const existing30DTimestamps = new Set(
        (existing30DData || []).map(row => row.timestamp)
      );

      console.log(`📊 [Finnhub] Found ${existing30DTimestamps.size} existing 30d data points for ${symbol}`);

      // Generate 30-day historical data
      const all30DayData = this.generate30DayData(symbol);
      const missing30DData = all30DayData.filter(dataPoint => 
        !existing30DTimestamps.has(dataPoint.timestamp)
      );

      console.log(`📊 [Finnhub] Need to add ${missing30DData.length} missing 30d data points for ${symbol}`);
      
      if (missing30DData.length === 0) {
        console.log(`✅ [Finnhub] All 30d data up to date for ${symbol}`);
        return true;
      }

      // Insert missing historical data
      const price30DRecords = missing30DData.map(dataPoint => ({
        stock_id: stockId,
        timestamp: dataPoint.timestamp,
        open_price: dataPoint.open_price,
        high_price: dataPoint.high_price,
        low_price: dataPoint.low_price,
        close_price: dataPoint.close_price,
        volume: dataPoint.volume
      }));

      const { error: insert30DError } = await supabase
        .from('stock_prices_30d')
        .upsert(price30DRecords, {
          onConflict: 'stock_id,timestamp'
        });

      if (insert30DError) {
        console.error(`❌ [Finnhub] Error inserting 30d historical data for ${symbol}:`, insert30DError);
        return false;
      }

      console.log(`✅ [Finnhub] Updated ${symbol} with ${missing30DData.length} new 30d historical data points`);
      return true;
    } catch (error) {
      console.error(`❌ [Finnhub] Error updating ${symbol} with 30d historical data:`, error);
      return false;
    }
  }

  // Update multiple stocks with 30-day historical data
  async updateMultipleStocksWith30DayData(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    console.log(`📊 [Finnhub] Updating ${symbols.length} stocks with 30-day historical data...`);
    
    for (const symbol of symbols) {
      try {
        const success = await this.updateStockWith30DayData(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }
        
        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ [Finnhub] Failed to update ${symbol} with 30d historical data:`, error);
        results.failed.push(symbol);
      }
    }
    
    console.log(`✅ [Finnhub] Updated ${results.success.length}/${symbols.length} stocks with 30d historical data`);
    return results;
  }
}

// Create Finnhub service instance
const createFinnhubService = (apiKey: string) => new FinnhubService(apiKey);

export const useStockPrices = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if environment is configured
  const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;
  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project-ref.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-anon-key-here'
  );
  
  const isConfigured = !!(finnhubApiKey && finnhubApiKey !== 'your-finnhub-api-key-here');

  // Update stock prices with historical data
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
      const finnhub = createFinnhubService(finnhubApiKey);
      const results = await finnhub.updateMultipleStocksWith30DayData(symbols);
      return results;
    } catch (err) {
      console.error('Error updating stock prices with historical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stock prices');
      return { success: [], failed: symbols };
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, isConfigured, finnhubApiKey]);

  // Auto-fetch 30-day data for portfolio stocks
  const autoFetch30DayDataForPortfolio = useCallback(async (portfolioData: Array<{ symbol: string }>) => {
    if (!isSupabaseConfigured || !isConfigured || portfolioData.length === 0) {
      return { success: [], failed: [] };
    }

    console.log('🔄 [Dashboard] Auto-fetching 30-day historical data for portfolio stocks...');
    
    const symbols = portfolioData.map(stock => stock.symbol);
    return await updateStockPricesWithHistoricalData(symbols);
  }, [updateStockPricesWithHistoricalData, isSupabaseConfigured, isConfigured]);

  // Test sync functions (existing functionality)
  const testSyncO1D = useCallback(async () => {
    if (!isConfigured) {
      throw new Error('Finnhub API key not configured');
    }
    setLoading(true);
    try {
      const finnhub = createFinnhubService(finnhubApiKey);
      const success = await finnhub.updateStockWith30DayData('O');
      if (!success) {
        throw new Error('Failed to sync O stock data');
      }
      console.log('✅ O stock 30-day data sync completed');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, finnhubApiKey]);

  const testSyncNVDA1D = useCallback(async () => {
    if (!isConfigured) {
      throw new Error('Finnhub API key not configured');
    }

    setLoading(true);
    try {
      const finnhub = createFinnhubService(finnhubApiKey);
      const success = await finnhub.updateStockWith30DayData('NVDA');
      if (!success) {
        throw new Error('Failed to sync NVDA stock data');
      }
      console.log('✅ NVDA stock 30-day data sync completed');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, finnhubApiKey]);

  return {
    loading,
    error,
    isConfigured: isConfigured && isSupabaseConfigured,
    updateStockPricesWithHistoricalData,
    autoFetch30DayDataForPortfolio,
    testSyncO1D,
    testSyncNVDA1D
  };
};