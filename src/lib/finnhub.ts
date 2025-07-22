// Finnhub API integration for real-time stock data
import { supabase } from './supabase';

interface HistoricalPriceData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PeriodConfig {
  table: string;
  days: number;
  resolution: string;
  granularity: 'hour' | 'day';
}

interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string;   // Status
  t: number[]; // Timestamps
  v: number[]; // Volume data
}

interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';
  
  private periodConfigs: PeriodConfig[] = [
    { table: 'stock_prices_1d', days: 1, resolution: '60', granularity: 'hour' },
    { table: 'stock_prices_7d', days: 7, resolution: '60', granularity: 'hour' },
    { table: 'stock_prices_30d', days: 30, resolution: 'D', granularity: 'day' },
    { table: 'stock_prices_3m', days: 90, resolution: 'D', granularity: 'day' },
    { table: 'stock_prices_6m', days: 180, resolution: 'D', granularity: 'day' },
    { table: 'stock_prices_1y', days: 365, resolution: 'D', granularity: 'day' },
    { table: 'stock_prices_3y', days: 1095, resolution: 'W', granularity: 'day' },
    { table: 'stock_prices_5y', days: 1825, resolution: 'W', granularity: 'day' }
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get real-time quote for a stock
  async getQuote(symbol: string): Promise<FinnhubQuote | null> {
    try {
      console.log(`Fetching quote for ${symbol} from Finnhub...`);
      const response = await fetch(
        `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          console.error(`Finnhub API 403 Forbidden for ${symbol}: Check API key permissions or upgrade plan`);
          return null;
        }
        if (response.status === 401) {
          console.error(`Finnhub API 401 Unauthorized for ${symbol}: Invalid or missing API key`);
          return null;
        }
        if (response.status === 429) {
          console.error(`Finnhub API rate limit exceeded for ${symbol}`);
          return null;
        }
        console.error(`Finnhub API error ${response.status} for ${symbol}`);
        return null;
      }

      const data = await response.json();
      console.log(`Finnhub response for ${symbol}:`, data);
      
      // Check if we got valid data
      if (data.c === 0 && data.d === 0 && data.dp === 0) {
        console.warn(`No data available for symbol: ${symbol}`);
        return null;
      }

      console.log(`Successfully fetched ${symbol}: $${data.c}`);
      return data;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  // Get historical candle data for a stock
  async getCandles(symbol: string, resolution: string, from: number, to: number): Promise<FinnhubCandle | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          console.error(`Finnhub API 403 Forbidden for ${symbol}: Check API key permissions or subscription plan`);
          return null;
        }
        if (response.status === 401) {
          console.error(`Finnhub API 401 Unauthorized for ${symbol}: Invalid or missing API key`);
          return null;
        }
        if (response.status === 429) {
          console.error(`Finnhub API rate limit exceeded for ${symbol}: Too many requests`);
          return null;
        }
        console.error(`Finnhub API error ${response.status} for ${symbol}`);
        return null;
      }

      const data = await response.json();
      
      // Check if we got valid data
      if (data.s !== 'ok' || !data.c || data.c.length === 0) {
        console.warn(`No candle data available for symbol: ${symbol}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}:`, error);
      return null;
    }
  }

  // Get company profile
  async getProfile(symbol: string): Promise<FinnhubProfile | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.error(`Finnhub API 401 Unauthorized for ${symbol}: Invalid or missing API key`);
          return null;
        }
        if (response.status === 403) {
          console.error(`Finnhub API 403 Forbidden for ${symbol}: Check API key permissions`);
          return null;
        }
        console.error(`Finnhub API error ${response.status} for ${symbol}`);
        return null;
      }

      const data = await response.json();
      
      // Check if we got valid data
      if (!data.name) {
        console.warn(`No profile data available for symbol: ${symbol}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error);
      return null;
    }
  }

  // Get the last timestamp for a stock in a specific period table
  private async getLastTimestamp(stockId: string, tableName: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('timestamp')
        .eq('stock_id', stockId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(`Error getting last timestamp from ${tableName}:`, error);
        return null;
      }

      return data ? new Date(data.timestamp) : null;
    } catch (error) {
      console.error(`Error querying ${tableName}:`, error);
      return null;
    }
  }

  // Store historical price data in the appropriate table
  private async storeHistoricalData(
    stockId: string, 
    tableName: string, 
    priceData: HistoricalPriceData[]
  ): Promise<boolean> {
    if (priceData.length === 0) return true;

    try {
      const records = priceData.map(data => ({
        stock_id: stockId,
        timestamp: data.timestamp,
        open_price: data.open,
        high_price: data.high,
        low_price: data.low,
        close_price: data.close,
        volume: data.volume
      }));

      const { error } = await supabase
        .from(tableName)
        .upsert(records, { 
          onConflict: 'stock_id,timestamp',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error storing data in ${tableName}:`, error);
        return false;
      }

      console.log(`Stored ${records.length} records in ${tableName} for stock ${stockId}`);
      return true;
    } catch (error) {
      console.error(`Error in storeHistoricalData for ${tableName}:`, error);
      return false;
    }
  }

  // Sync historical data for a specific period (incremental)
  private async syncPeriodData(stockId: string, symbol: string, config: PeriodConfig): Promise<boolean> {
    try {
      console.log(`Syncing ${config.table} data for ${symbol}...`);
      
      // Get the last timestamp we have for this stock and period
      const lastTimestamp = await getLastTimestamp(stockId, config.table);
      
      const now = Math.floor(Date.now() / 1000);
      let fromTimestamp: number;
      
      if (lastTimestamp) {
        // If we have data, only fetch from the last timestamp + 1 interval
        if (config.granularity === 'hour') {
          fromTimestamp = Math.floor(lastTimestamp.getTime() / 1000) + 3600; // +1 hour
        } else {
          fromTimestamp = Math.floor(lastTimestamp.getTime() / 1000) + 86400; // +1 day
        }
        
        // If we're already up to date, skip
        if (fromTimestamp >= now) {
          console.log(`${config.table} for ${symbol} is already up to date`);
          return true;
        }
      } else {
        // If no data exists, fetch the full period
        fromTimestamp = now - (config.days * 24 * 60 * 60);
      }
      
      // Fetch data from Finnhub
      const candles = await this.getCandles(symbol, config.resolution, fromTimestamp, now);
      
      if (!candles || !candles.c || candles.c.length === 0) {
        console.warn(`No candle data available for ${symbol} in ${config.table}`);
        return false;
      }
      
      // Convert to our format
      const historicalData: HistoricalPriceData[] = candles.c.map((close, index) => ({
        timestamp: new Date(candles.t[index] * 1000).toISOString(),
        open: candles.o[index],
        high: candles.h[index],
        low: candles.l[index],
        close: close,
        volume: candles.v[index] || 0
      }));
      
      // Store in database
      const success = await this.storeHistoricalData(stockId, config.table, historicalData);
      
      if (success) {
        console.log(`Successfully synced ${historicalData.length} new records for ${symbol} in ${config.table}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Error syncing ${config.table} for ${symbol}:`, error);
      return false;
    }
  }

  // Sync all historical data for a stock (incremental for all periods)
  async syncStockHistoricalData(stockId: string, symbol: string): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    console.log(`Starting incremental sync for ${symbol}...`);
    
    for (const config of this.periodConfigs) {
      try {
        const success = await this.syncPeriodData(stockId, symbol, config);
        
        if (success) {
          results.success.push(config.table);
        } else {
          results.failed.push(config.table);
        }
        
        // Add delay between period syncs to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error syncing ${config.table} for ${symbol}:`, error);
        results.failed.push(config.table);
      }
    }
    
    console.log(`Sync completed for ${symbol}: ${results.success.length} success, ${results.failed.length} failed`);
    return results;
  }

  // Sync multiple stocks with incremental historical data
  async syncMultipleStocksIncremental(stockData: Array<{id: string, symbol: string}>): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    console.log(`Starting incremental sync for ${stockData.length} stocks...`);
    
    for (const stock of stockData) {
      try {
        // First update current price
        const priceUpdated = await this.updateStockPrice(stock.symbol);
        
        if (priceUpdated) {
          // Then sync historical data incrementally
          const syncResults = await this.syncStockHistoricalData(stock.id, stock.symbol);
          
          if (syncResults.success.length > 0) {
            results.success.push(stock.symbol);
          } else {
            results.failed.push(stock.symbol);
          }
        } else {
          results.failed.push(stock.symbol);
        }
        
        // Add delay between stocks to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error syncing ${stock.symbol}:`, error);
        results.failed.push(stock.symbol);
      }
    }
    
    console.log(`Incremental sync completed: ${results.success.length} success, ${results.failed.length} failed`);
    return results;
  }

  // Get historical data from database for charts
  async getHistoricalDataFromDB(stockId: string, period: string): Promise<{ prices: number[], dates: string[], change: number, changePercent: number } | null> {
    try {
      const config = this.periodConfigs.find(c => c.table === `stock_prices_${period}`);
      if (!config) {
        console.error(`Invalid period: ${period}`);
        return null;
      }
      
      const { data, error } = await supabase
        .from(config.table)
        .select('timestamp, close_price')
        .eq('stock_id', stockId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error(`Error fetching ${config.table} data:`, error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.warn(`No historical data found for stock ${stockId} in ${config.table}`);
        return null;
      }
      
      const prices = data.map(d => parseFloat(d.close_price));
      const dates = data.map(d => d.timestamp);
      
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const change = lastPrice - firstPrice;
      const changePercent = (change / firstPrice) * 100;
      
      return {
        prices,
        dates,
        change,
        changePercent
      };
    } catch (error) {
      console.error(`Error in getHistoricalDataFromDB:`, error);
      return null;
    }
  }

  // Get historical data for all time periods
  async getHistoricalDataLegacy(symbol: string): Promise<{ [key: string]: { prices: number[], dates: string[], change: number, changePercent: number } } | null> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const historicalData: { [key: string]: { prices: number[], dates: string[], change: number, changePercent: number } } = {};
      
      const periods = [
        { key: '1d', days: 1, resolution: '60' }, // 1 hour resolution for 1 day
        { key: '7d', days: 7, resolution: 'D' },   // Daily resolution for 7 days
        { key: '30d', days: 30, resolution: 'D' }, // Daily resolution for 30 days
        { key: '3m', days: 90, resolution: 'D' },  // Daily resolution for 3 months
        { key: '6m', days: 180, resolution: 'D' }, // Daily resolution for 6 months
        { key: '1y', days: 365, resolution: 'D' }, // Daily resolution for 1 year
        { key: '3y', days: 1095, resolution: 'W' }, // Weekly resolution for 3 years
        { key: '5y', days: 1825, resolution: 'W' }  // Weekly resolution for 5 years
      ];

      let successfulPeriods = 0;
      for (const period of periods) {
        const from = now - (period.days * 24 * 60 * 60);
        const candles = await this.getCandles(symbol, period.resolution, from, now);
        
        if (candles && candles.c && candles.t) {
          const prices = candles.c;
          const timestamps = candles.t;
          
          // Convert timestamps to ISO strings
          const dates = timestamps.map(ts => new Date(ts * 1000).toISOString());
          
          // Calculate change and change percent
          const firstPrice = prices[0];
          const lastPrice = prices[prices.length - 1];
          const change = lastPrice - firstPrice;
          const changePercent = (change / firstPrice) * 100;
          
          historicalData[period.key] = {
            prices,
            dates,
            change,
            changePercent
          };
          successfulPeriods++;
        } else {
          console.warn(`Failed to get ${period.key} data for ${symbol}`);
        }
        
        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Return data even if some periods failed, as long as we got some data
      if (successfulPeriods === 0) {
        console.error(`No historical data could be retrieved for ${symbol}`);
        return null;
      }
      
      console.log(`Retrieved ${successfulPeriods}/${periods.length} historical periods for ${symbol}`);
      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return null;
    }
  }

  // Update stock price in database
  async updateStockPrice(symbol: string): Promise<boolean> {
    try {
      const quote = await this.getQuote(symbol);
      if (!quote) return false;

      // Determine market status based on timestamp and current time
      const now = new Date();
      const marketHours = this.getMarketStatus(now);

      const { error } = await supabase
        .from('stocks')
        .update({
          current_price: quote.c,
          price_change_24h: quote.d,
          price_change_percent_24h: quote.dp,
          market_status: marketHours,
          last_price_update: now.toISOString()
        })
        .eq('symbol', symbol);

      if (error) {
        console.error(`Error updating stock price for ${symbol}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error in updateStockPrice for ${symbol}:`, error);
      return false;
    }
  }

  // Update stock with historical data
  async updateStockWithHistoricalData(symbol: string): Promise<boolean> {
    try {
      // First update current price
      const priceUpdated = await this.updateStockPrice(symbol);
      if (!priceUpdated) return false;
      
      // Then get historical data
      const historicalData = await this.getHistoricalData(symbol);
      if (!historicalData) return false;
      
      // Store historical data in a separate table or as JSON
      // For now, we'll store it as JSON in the stocks table
      const { error } = await supabase
        .from('stocks')
        .update({
          historical_data: historicalData,
          last_historical_update: new Date().toISOString()
        })
        .eq('symbol', symbol);

      if (error) {
        console.error(`Error updating historical data for ${symbol}:`, error);
        return false;
      }

      console.log(`Successfully updated historical data for ${symbol}`);
      return true;
    } catch (error) {
      console.error(`Error in updateStockWithHistoricalData for ${symbol}:`, error);
      return false;
    }
  }

  // Update multiple stock prices
  async updateMultipleStockPrices(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const promises = batch.map(async (symbol) => {
        const success = await this.updateStockPrice(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }
      });

      await Promise.all(promises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Update multiple stocks with historical data
  async updateMultipleStocksWithHistoricalData(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    // Process sequentially to avoid rate limiting (historical data is more intensive)
    for (const symbol of symbols) {
      try {
        console.log(`Syncing historical data for ${symbol}...`);
        const success = await this.updateStockWithHistoricalData(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }
        
        // Add delay between stocks to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error updating ${symbol}:`, error);
        results.failed.push(symbol);
      }
    }

    return results;
  }

  // Get market status based on current time (simplified - US market hours)
  private getMarketStatus(date: Date): string {
    const hour = date.getHours();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Weekend
    if (day === 0 || day === 6) {
      return 'closed';
    }

    // Weekday hours (simplified - doesn't account for holidays)
    if (hour >= 9 && hour < 16) {
      return 'open';
    } else if (hour >= 4 && hour < 9) {
      return 'pre_market';
    } else if (hour >= 16 && hour < 20) {
      return 'after_hours';
    } else {
      return 'closed';
    }
  }

  // Enrich stock data with company profile
  async enrichStockData(symbol: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(symbol);
      if (!profile) return false;

      // Format market cap
      const formatMarketCap = (marketCap: number): string => {
        if (marketCap >= 1000000) {
          return `$${(marketCap / 1000000).toFixed(1)}T`;
        } else if (marketCap >= 1000) {
          return `$${(marketCap / 1000).toFixed(1)}B`;
        } else {
          return `$${marketCap.toFixed(1)}M`;
        }
      };

      const { error } = await supabase
        .from('stocks')
        .update({
          name: profile.name,
          sector: profile.finnhubIndustry || null,
          market_cap: formatMarketCap(profile.marketCapitalization)
        })
        .eq('symbol', symbol);

      if (error) {
        console.error(`Error enriching stock data for ${symbol}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error in enrichStockData for ${symbol}:`, error);
      return false;
    }
  }
}

// Export a function to create the service with API key
export const createFinnhubService = (apiKey: string) => {
  return new FinnhubService(apiKey);
};

// Export types
export type { FinnhubQuote, FinnhubProfile, FinnhubCandle };