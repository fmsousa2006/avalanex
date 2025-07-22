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
          console.warn(`Finnhub API 403 Forbidden for ${symbol}: Historical data not available with current plan. Skipping historical sync for this symbol.`);
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
        console.warn(`No candle data available for symbol: ${symbol} (may require higher subscription plan)`);
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
  async getLastTimestamp(stockId: string, tableName: string): Promise<Date | null> {
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
  async storeHistoricalData(
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
  async syncPeriodData(stockId: string, symbol: string, config: PeriodConfig): Promise<boolean> {
    try {
      console.log(`Syncing ${config.table} data for ${symbol}...`);
      
      // Get the last timestamp we have for this stock and period
      const lastTimestamp = await this.getLastTimestamp(stockId, config.table);
      
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
        console.warn(`No candle data available for ${symbol} in ${config.table} - may require Finnhub subscription upgrade`);
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
          console.log(`⚠️  ${config.table} sync failed for ${symbol} - continuing with other periods`);
        }
        
        // Add delay between period syncs to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error syncing ${config.table} for ${symbol}:`, error);
        results.failed.push(config.table);
      }
    }
    
    if (results.success.length === 0 && results.failed.length > 0) {
      console.warn(`⚠️  Historical data sync failed for ${symbol} - this may require a Finnhub subscription upgrade for historical data access`);
    } else {
      console.log(`Sync completed for ${symbol}: ${results.success.length} success, ${results.failed.length} failed`);
    }
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

  // Test sync for O stock 1d data
  async testSyncO1D(): Promise<void> {
    try {
      console.log('🧪 Starting test sync for O (Realty Income) 1D data...');
      
      // First, ensure O stock exists in database
      const { data: stockData, error: stockError } = await supabase
        .from('stocks')
        .select('id, symbol')
        .eq('symbol', 'O')
        .maybeSingle();

      if (stockError) {
        console.error('❌ Error fetching O stock from database:', stockError);
        console.log('🔧 This might be due to Supabase configuration. Please check your .env file.');
        throw new Error(`Supabase error: ${stockError.message}`);
      }

      let stockId: string;
      
      if (!stockData) {
        console.log('📝 O stock not found, creating new entry...');
        const { data: newStock, error: createError } = await supabase
          .from('stocks')
          .insert([{
            symbol: 'O',
            name: 'Realty Income Corporation',
            sector: 'Real Estate',
            is_active: true
          }])
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Error creating O stock entry:', createError);
          throw new Error(`Failed to create O stock: ${createError.message}`);
        }
        stockId = newStock.id;
        console.log('✅ Created O stock with ID:', stockId);
      } else {
        stockId = stockData.id;
        console.log('✅ Found existing O stock with ID:', stockId);
      }

      // Calculate rolling 24-hour market window (excluding weekends)
      console.log('📅 Calculating rolling 24-hour market window...');
      
      // Get current time and round to nearest 30 minutes for market data consistency
      const nowUTC = new Date();
      const currentMinutes = nowUTC.getMinutes();
      const roundedMinutes = currentMinutes >= 30 ? 30 : 0;
      nowUTC.setMinutes(roundedMinutes, 0, 0);
      
      let currentMarketTime = new Date(nowUTC);
      
      // Calculate 24 hours ago
      let startTime = new Date(currentMarketTime.getTime() - (24 * 60 * 60 * 1000));
      
      // Skip weekends for start time - if weekend, move to Friday
      while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() - 1);
      }
      
      // Skip weekends for current time - if weekend, move to Monday  
      while (currentMarketTime.getDay() === 0 || currentMarketTime.getDay() === 6) {
        currentMarketTime.setDate(currentMarketTime.getDate() + 1);
      }
      
      console.log(`🕐 Rolling 24h window (UTC): ${startTime.toISOString()} to ${currentMarketTime.toISOString()}`);
      console.log(`🕐 Rolling 24h window (ET): ${startTime.toLocaleString("en-US", {timeZone: "America/New_York"})} to ${currentMarketTime.toLocaleString("en-US", {timeZone: "America/New_York"})}`);
      
      // Clear old data outside the 24-hour window
      console.log('🧹 Clearing data outside 24-hour rolling window...');
      const { error: deleteError } = await supabase
        .from('stock_prices_1d')
        .delete()
        .eq('stock_id', stockId)
        .or(`timestamp.lt.${startTime.toISOString()},timestamp.gt.${currentMarketTime.toISOString()}`);
      
      if (deleteError) {
        console.warn('⚠️ Could not clear old data:', deleteError);
      } else {
        console.log('✅ Cleared data outside 24-hour window');
      }
      
      // First, let's try to get current quote to verify API is working
      console.log('📊 Testing Finnhub API connection with quote...');
      const quote = await this.getQuote('O');
      if (!quote) {
        console.warn('⚠️ Failed to get quote for O - will use mock price');
        // Continue with mock data instead of failing
      }
      
      if (quote) {
        console.log('✅ Successfully got quote for O:', quote);
      }
      
      // Update current price first
      console.log('💰 Updating current price for O...');
      const priceUpdated = await this.updateStockPrice('O');
      if (!priceUpdated) {
        console.warn('⚠️ Failed to update current price, but continuing with historical data...');
      } else {
        console.log('✅ Successfully updated current price for O');
      }

      const from = Math.floor(startTime.getTime() / 1000);
      const to = Math.floor(currentMarketTime.getTime() / 1000);
      
      console.log(`🕐 Fetching candles from ${startTime.toISOString()} to ${currentMarketTime.toISOString()}`);
      
      const candles = await this.getCandles('O', '60', from, to);
      
      if (!candles || !candles.c || candles.c.length === 0) {
        console.warn('⚠️ No candle data available for O - this is expected with free Finnhub plan');
        console.log('💡 Generating mock rolling 24-hour data...');
        
        const mockData: HistoricalPriceData[] = [];
        const basePrice = quote?.c || 58.25; // Use quote price or fallback to default
        
        // Generate hourly data for the rolling 24-hour window (only during market hours)
        let currentTime = new Date(startTime);
        
        while (currentTime <= currentMarketTime) {
          // Only include data during market hours (9:30 AM - 4:00 PM ET) and weekdays
          // Market hours in UTC: 13:30-20:00 (9:30 AM - 4:00 PM ET)
          // Always include 13:30 (market open), then hourly intervals
          let shouldInclude = false;
          
          if (utcHour === 13 && utcMinutes === 30) {
            shouldInclude = true; // Market open
          } else if (utcHour >= 14 && utcHour <= 20 && utcMinutes === 0) {
            shouldInclude = true; // Hourly intervals
          }
          const etMinutes = parseInt(etTimeString.split(', ')[1].split(':')[1]);
          if (shouldInclude) {
          // Skip weekends
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Include market hours: 9:30 AM (9:30) to 4:00 PM (16:00) ET
            if ((etHour > 9 || (etHour === 9 && etMinutes >= 30)) && etHour < 16) {
              const price = basePrice + (Math.random() - 0.5) * 2; // Random variation of ±$1
              
              mockData.push({
                timestamp: currentTime.toISOString(), // Store as UTC
                open: price,
                high: price + Math.random() * 0.5,
                low: price - Math.random() * 0.5,
                close: price,
                volume: Math.floor(Math.random() * 1000000) + 500000
              });
              
              console.log(`📊 Added data point: ${currentTime.toISOString()} (${etTimeString} ET) - $${price.toFixed(2)}`);
            }
          }
          
          // Move to next hour
          currentTime.setHours(currentTime.getHours() + 1);
        }
        
        console.log(`📊 Generated ${mockData.length} mock data points for rolling 24-hour window (market hours only)`);
        
        // Store the mock data
        const success = await this.storeHistoricalData(stockId, 'stock_prices_1d', mockData);
        
        if (success) {
          console.log('✅ Successfully stored rolling 24-hour 1D data for O!');
        } else {
          console.error('❌ Failed to store mock data');
          throw new Error('Failed to store mock data in database');
        }
      } else {
        console.log(`📊 Got ${candles.c.length} real data points from Finnhub`);
        
        // Convert real data to our format
        const historicalData: HistoricalPriceData[] = candles.c.map((close, index) => ({
          timestamp: new Date(candles.t[index] * 1000).toISOString(),
          open: candles.o[index],
          high: candles.h[index],
          low: candles.l[index],
          close: close,
          volume: candles.v[index] || 0
        }));
        
        // Store real data
        const success = await this.storeHistoricalData(stockId, 'stock_prices_1d', historicalData);
        
        if (success) {
          console.log('✅ Successfully stored rolling 24-hour real 1D data for O!');
        } else {
          console.error('❌ Failed to store real data');
          throw new Error('Failed to store real data in database');
        }
      }

      // Verify the data was inserted
      console.log('🔍 Verifying data insertion...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('stock_prices_1d')
        .select('*')
        .eq('stock_id', stockId)
        .order('timestamp', { ascending: false })
        .limit(5);
      
      if (verifyError) {
        console.error('❌ Error verifying data insertion:', verifyError);
        throw new Error(`Verification failed: ${verifyError.message}`);
      } else if (!verifyData || verifyData.length === 0) {
        console.error('❌ No data found in stock_prices_1d table after insertion!');
        throw new Error('No data found in table after insertion');
      } else {
        console.log(`✅ SUCCESS! Found ${verifyData.length} records in stock_prices_1d table:`);
        verifyData.forEach((record, index) => {
          const recordTime = new Date(record.timestamp);
          console.log(`  ${index + 1}. ${recordTime.toLocaleString("en-US", {timeZone: "America/New_York"})} ET: $${record.close_price} (Vol: ${record.volume})`);
        });
      }
      
      // Also check total count
      const { count, error: countError } = await supabase
        .from('stock_prices_1d')
        .select('*', { count: 'exact', head: true })
        .eq('stock_id', stockId);
        
      if (!countError) {
        console.log(`📊 Total records for O in stock_prices_1d: ${count}`);
      }

    } catch (error) {
      console.error('❌ Error in testSyncO1D:', error);
      throw error; // Re-throw so the UI can show the error
    }
  }

  // Test sync for NVIDIA stock 1d data
  async testSyncNVDA1D(): Promise<void> {
    try {
      console.log('🧪 Starting test sync for NVDA (NVIDIA) 1D data...');
      
      // First, ensure NVDA stock exists in database
      const { data: stockData, error: stockError } = await supabase
        .from('stocks')
        .select('id, symbol')
        .eq('symbol', 'NVDA')
        .maybeSingle();

      if (stockError) {
        console.error('❌ Error fetching NVDA stock from database:', stockError);
        console.log('🔧 This might be due to Supabase configuration. Please check your .env file.');
        throw new Error(`Supabase error: ${stockError.message}`);
      }

      let stockId: string;
      
      if (!stockData) {
        console.log('📝 NVDA stock not found, creating new entry...');
        const { data: newStock, error: createError } = await supabase
          .from('stocks')
          .insert([{
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            sector: 'Technology',
            is_active: true
          }])
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Error creating NVDA stock entry:', createError);
          throw new Error(`Failed to create NVDA stock: ${createError.message}`);
        }
        stockId = newStock.id;
        console.log('✅ Created NVDA stock with ID:', stockId);
      } else {
        stockId = stockData.id;
        console.log('✅ Found existing NVDA stock with ID:', stockId);
      }

      // Calculate rolling 24-hour market window (excluding weekends)
      console.log('📅 Calculating rolling 24-hour market window...');
      
      // Get current time and round to nearest 30 minutes for market data consistency
      const nowUTC = new Date();
      const currentMinutes = nowUTC.getMinutes();
      const roundedMinutes = currentMinutes >= 30 ? 30 : 0;
      nowUTC.setMinutes(roundedMinutes, 0, 0);
      
      let currentMarketTime = new Date(nowUTC);
      
      // Calculate 24 hours ago
      let startTime = new Date(currentMarketTime.getTime() - (24 * 60 * 60 * 1000));
      
      // Skip weekends for start time - if weekend, move to Friday
      while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() - 1);
      }
      
      // Skip weekends for current time - if weekend, move to Monday  
      while (currentMarketTime.getDay() === 0 || currentMarketTime.getDay() === 6) {
        currentMarketTime.setDate(currentMarketTime.getDate() + 1);
      }
      
      console.log(`🕐 Rolling 24h window (UTC): ${startTime.toISOString()} to ${currentMarketTime.toISOString()}`);
      console.log(`🕐 Rolling 24h window (ET): ${startTime.toLocaleString("en-US", {timeZone: "America/New_York"})} to ${currentMarketTime.toLocaleString("en-US", {timeZone: "America/New_York"})}`);
      
      // Clear old data outside the 24-hour window
      console.log('🧹 Clearing data outside 24-hour rolling window...');
      const { error: deleteError } = await supabase
        .from('stock_prices_1d')
        .delete()
        .eq('stock_id', stockId)
        .or(`timestamp.lt.${startTime.toISOString()},timestamp.gt.${currentMarketTime.toISOString()}`);
      
      if (deleteError) {
        console.warn('⚠️ Could not clear old data:', deleteError);
      } else {
        console.log('✅ Cleared data outside 24-hour window');
      }
      
      // First, let's try to get current quote to verify API is working
      console.log('📊 Testing Finnhub API connection with quote...');
      const quote = await this.getQuote('NVDA');
      if (!quote) {
        console.warn('⚠️ Failed to get quote for NVDA - will use mock price');
        // Continue with mock data instead of failing
      }
      
      if (quote) {
        console.log('✅ Successfully got quote for NVDA:', quote);
      }
      
      // Update current price first
      console.log('💰 Updating current price for NVDA...');
      const priceUpdated = await this.updateStockPrice('NVDA');
      if (!priceUpdated) {
        console.warn('⚠️ Failed to update current price, but continuing with historical data...');
      } else {
        console.log('✅ Successfully updated current price for NVDA');
      }

      // Generate rolling 24-hour market data (only during market hours 9:30 AM - 4:00 PM ET)
      console.log('📈 Generating rolling 24-hour market data...');
      
      // For demo purposes, we'll generate mock data since Finnhub free plan doesn't support historical data
      console.log('💡 Generating mock rolling 24-hour data...');
      
      const mockData: HistoricalPriceData[] = [];
      const basePrice = quote?.c || 875.25; // Use quote price or fallback to NVDA typical price
      
      // Generate hourly data for the rolling 24-hour window (only during market hours)
      let currentTime = new Date(startTime);
      
      while (currentTime <= currentMarketTime) {
        // Only include data during market hours (9:30 AM - 4:00 PM ET) and weekdays
        const dayOfWeek = currentTime.getDay();
        
        // Convert to Eastern Time to check market hours
        const etTimeString = currentTime.toLocaleString("en-US", {timeZone: "America/New_York", hour12: false});
        const etHour = parseInt(etTimeString.split(', ')[1].split(':')[0]);
        const etMinutes = parseInt(etTimeString.split(', ')[1].split(':')[1]);
        
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Special handling for market open and hourly intervals
          let shouldInclude = false;
          
          // Always include market open at 9:30 AM ET (13:30 UTC)
          if (etHour === 9 && etMinutes === 30) {
            shouldInclude = true;
          }
          // Then include hourly intervals from 10:00 AM to 4:00 PM ET (14:00-20:00 UTC)
          else if (etHour >= 10 && etHour <= 15 && etMinutes === 0) {
            shouldInclude = true;
          }
          
          if (shouldInclude) {
            // Use deterministic price based on timestamp for consistency
            const seed = currentTime.getTime() / 1000000;
            const price = basePrice + (Math.sin(seed) * 2); // Deterministic variation of ±$2
            
            mockData.push({
              timestamp: currentTime.toISOString(), // Store as UTC
              open: price,
              high: price + Math.random() * 10,
              low: price - Math.random() * 10,
              close: price,
              volume: Math.floor(Math.abs(Math.sin(seed * 2)) * 1000000) + 500000
            });
            
            console.log(`📊 Added data point: ${currentTime.toISOString()} (${etTimeString} ET) - $${price.toFixed(2)}`);
          }
        }
        
        // Move to next 30 minutes to catch both 13:30 and hourly intervals  
        currentTime.setUTCMinutes(currentTime.getUTCMinutes() + 30);
      }
      
      console.log(`📊 Generated ${mockData.length} mock data points for rolling 24-hour window (market hours only)`);
      
      // Store the mock data
      const success = await this.storeHistoricalData(stockId, 'stock_prices_1d', mockData);
      
      if (success) {
        console.log('✅ Successfully stored rolling 24-hour 1D data for NVDA!');
      } else {
        console.error('❌ Failed to store mock data');
        throw new Error('Failed to store mock data in database');
      }

      // Verify the data was inserted
      console.log('🔍 Verifying data insertion...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('stock_prices_1d')
        .select('*')
        .eq('stock_id', stockId)
        .order('timestamp', { ascending: false })
        .limit(5);
      
      if (verifyError) {
        console.error('❌ Error verifying data insertion:', verifyError);
        throw new Error(`Verification failed: ${verifyError.message}`);
      } else if (!verifyData || verifyData.length === 0) {
        console.error('❌ No data found in stock_prices_1d table after insertion!');
        throw new Error('No data found in table after insertion');
      } else {
        console.log(`✅ SUCCESS! Found ${verifyData.length} records in stock_prices_1d table:`);
        verifyData.forEach((record, index) => {
          const recordTime = new Date(record.timestamp);
          console.log(`  ${index + 1}. ${recordTime.toLocaleString("en-US", {timeZone: "America/New_York"})} ET: $${record.close_price} (Vol: ${record.volume})`);
        });
      }
      
      // Also check total count
      const { count, error: countError } = await supabase
        .from('stock_prices_1d')
        .select('*', { count: 'exact', head: true })
        .eq('stock_id', stockId);
        
      if (!countError) {
        console.log(`📊 Total records for NVDA in stock_prices_1d: ${count}`);
      }

    } catch (error) {
      console.error('❌ Error in testSyncNVDA1D:', error);
      throw error; // Re-throw so the UI can show the error
    }
  }
}

// Export a function to create the service with API key
export const createFinnhubService = (apiKey: string) => {
  return new FinnhubService(apiKey);
};

// Export types
export type { FinnhubQuote, FinnhubProfile, FinnhubCandle };