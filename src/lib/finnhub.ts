import { supabase } from './supabase';

// Finnhub API service for fetching stock data
export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface FinnhubCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  s: string; // Status
  t: number[]; // Timestamps
  v: number[]; // Volumes
}

export class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get real-time quote for a stock
  async getQuote(symbol: string): Promise<FinnhubQuote> {
    const response = await fetch(`${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`);
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Finnhub API error: ${data.error}`);
    }
    
    return data;
  }

  // Get historical candle data
  async getCandles(symbol: string, resolution: string, from: number, to: number): Promise<FinnhubCandle> {
    const response = await fetch(
      `${this.baseUrl}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Finnhub API error: ${data.error}`);
    }
    
    return data;
  }

  // Update stock price in database
  async updateStockPrice(symbol: string): Promise<boolean> {
    try {
      console.log(`📊 [Finnhub] Fetching quote for ${symbol}...`);
      
      const quote = await this.getQuote(symbol);
      
      if (!quote || quote.c === 0) {
        console.warn(`⚠️ [Finnhub] No valid quote data for ${symbol}`);
        return false;
      }

      // Update stock in database
      const { error } = await supabase
        .from('stocks')
        .upsert({
          symbol: symbol,
          name: `${symbol} Inc.`, // Default name, should be updated with real company name
          current_price: quote.c,
          price_change_24h: quote.d,
          price_change_percent_24h: quote.dp,
          market_status: 'closed', // Default status
          last_price_update: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'symbol'
        });

      if (error) {
        console.error(`❌ [Finnhub] Database error for ${symbol}:`, error);
        return false;
      }

      console.log(`✅ [Finnhub] Updated ${symbol}: $${quote.c} (${quote.dp >= 0 ? '+' : ''}${quote.dp}%)`);
      return true;
    } catch (error) {
      console.error(`❌ [Finnhub] Error updating ${symbol}:`, error);
      return false;
    }
  }

  // Update multiple stock prices
  async updateMultipleStockPrices(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    console.log(`📊 [Finnhub] Updating ${symbols.length} stocks...`);
    
    for (const symbol of symbols) {
      try {
        const success = await this.updateStockPrice(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }
        
        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ [Finnhub] Failed to update ${symbol}:`, error);
        results.failed.push(symbol);
      }
    }
    
    console.log(`✅ [Finnhub] Updated ${results.success.length}/${symbols.length} stocks successfully`);
    return results;
  }

  // Update stock with historical data
  async updateStockWithHistoricalData(symbol: string): Promise<boolean> {
    try {
      console.log(`📊 [Finnhub] Fetching historical data for ${symbol}...`);
      
      // First update current price
      await this.updateStockPrice(symbol);
      
      // Get historical data
      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (30 * 24 * 60 * 60); // 30 days ago
      
      const historicalData = await this.getHistoricalData(symbol, startDate, endDate);
      
      if (!historicalData || !historicalData.c || historicalData.c.length === 0) {
        console.warn(`⚠️ [Finnhub] No historical data received for ${symbol}`);
        return false;
      }

      // Generate historical price records
      const historicalRecords = [];
      const timestamps = historicalData.t || [];
      const closes = historicalData.c || [];
      const opens = historicalData.o || [];
      const highs = historicalData.h || [];
      const lows = historicalData.l || [];

      for (let i = 0; i < Math.min(timestamps.length, closes.length); i++) {
        if (timestamps[i] && closes[i]) {
          const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
          
          historicalRecords.push({
            symbol,
            date,
            open: opens[i] || closes[i],
            high: highs[i] || closes[i],
            low: lows[i] || closes[i],
            close: closes[i],
            created_at: new Date().toISOString()
          });
        }
      }

      if (historicalRecords.length === 0) {
        console.warn(`⚠️ [Finnhub] No valid historical records generated for ${symbol}`);
        return false;
      }

      // Save to Supabase
      const { error } = await supabase
        .from('stock_prices')
        .upsert(historicalRecords, { 
          onConflict: 'symbol,date',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ [Finnhub] Failed to save historical data for ${symbol}:`, error);
        return false;
      }

      console.log(`✅ [Finnhub] Saved ${historicalRecords.length} historical records for ${symbol}`);
      return true;

    } catch (error) {
      console.error(`❌ [Finnhub] Error updating historical data for ${symbol}:`, error);
      return false;
    }
  }

  // Update multiple stocks with historical data
  async updateMultipleStocksWithHistoricalData(symbols: string[]): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    console.log(`📊 [Finnhub] Updating ${symbols.length} stocks with historical data...`);
    
    for (const symbol of symbols) {
      try {
        const success = await this.updateStockWithHistoricalData(symbol);
        if (success) {
          results.success.push(symbol);
        } else {
          results.failed.push(symbol);
        }
        
        // Rate limiting: wait 200ms between requests for historical data
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ [Finnhub] Failed to update ${symbol} with historical data:`, error);
        results.failed.push(symbol);
      }
    }
    
    console.log(`✅ [Finnhub] Updated ${results.success.length}/${symbols.length} stocks with historical data`);
    return results;
  }

  // Generate market hours data (9:30 AM - 4:00 PM ET, weekdays only)
  private generateMarketHoursData(symbol: string): Array<{
    timestamp: string;
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
  }> {
    const data: Array<{
      timestamp: string;
      open_price: number;
      high_price: number;
      low_price: number;
      close_price: number;
      volume: number;
    }> = [];

    // Base price for the stock
    const basePrice = symbol === 'O' ? 58.25 : symbol === 'NVDA' ? 875.25 : 175.50;
    
    // Generate data for the last 25 hours, but only include market hours
    const now = new Date();
    const startTime = new Date(now.getTime() - (25 * 60 * 60 * 1000)); // 25 hours ago
    
    let currentTime = new Date(startTime);
    let currentPrice = basePrice * 0.98; // Start slightly lower
    
    while (currentTime <= now) {
      // Convert to UTC for market hours check
      const utcHour = currentTime.getUTCHours();
      const utcMinutes = currentTime.getUTCMinutes();
      const dayOfWeek = currentTime.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Check if it's a weekday (Monday-Friday)
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      
      // Check if it's market hours (9:30 AM - 4:00 PM ET = 13:30 - 20:00 UTC)
      const isMarketStart = utcHour === 13 && utcMinutes === 30; // 9:30 AM ET
      const isMarketHours = (utcHour === 13 && utcMinutes === 30) || (utcHour >= 14 && utcHour <= 20); // 9:30 AM - 4:00 PM ET
      
      if (isWeekday && isMarketHours) {
        // Generate realistic price movement
        const volatility = symbol === 'O' ? 0.002 : symbol === 'NVDA' ? 0.015 : 0.008;
        const randomChange = (Math.random() - 0.5) * volatility;
        currentPrice = currentPrice * (1 + randomChange);
        
        // Generate OHLC data
        const open = currentPrice;
        const high = open * (1 + Math.random() * volatility);
        const low = open * (1 - Math.random() * volatility);
        const close = low + Math.random() * (high - low);
        
        // Generate volume
        const baseVolume = symbol === 'O' ? 3200000 : symbol === 'NVDA' ? 45000000 : 25000000;
        const volume = Math.floor(baseVolume * (0.5 + Math.random()));
        
        // Create timestamp - use exact time for market start, top of hour for others
        let dataTimestamp: Date;
        if (isMarketStart) {
          dataTimestamp = new Date(currentTime);
          dataTimestamp.setUTCMinutes(30);
          dataTimestamp.setUTCSeconds(0);
          dataTimestamp.setUTCMilliseconds(0);
        } else {
          dataTimestamp = new Date(currentTime);
          dataTimestamp.setUTCMinutes(0);
          dataTimestamp.setUTCSeconds(0);
          dataTimestamp.setUTCMilliseconds(0);
        }
        
        // Check for duplicates
        const timestampString = dataTimestamp.toISOString();
        const isDuplicate = data.some(d => d.timestamp === timestampString);
        
        if (!isDuplicate) {
          data.push({
            timestamp: timestampString,
            open_price: parseFloat(open.toFixed(4)),
            high_price: parseFloat(high.toFixed(4)),
            low_price: parseFloat(low.toFixed(4)),
            close_price: parseFloat(close.toFixed(4)),
            volume: volume
          });
        }
        
        currentPrice = close;
      }
      
      // Move to next hour
      currentTime.setHours(currentTime.getHours() + 1);
    }
    
    return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Test function to sync O stock 1D data
  async testSyncO1D(): Promise<void> {
    console.log('🧪 [Test] Starting O stock 1D sync test...');
    
    try {
      // First ensure O stock exists in database
      const { data: existingStock, error: fetchError } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', 'O')
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      let stockId: string;

      if (existingStock) {
        stockId = existingStock.id;
        console.log('✅ [Test] Found existing O stock in database');
      } else {
        // Create O stock
        const { data: newStock, error: insertError } = await supabase
          .from('stocks')
          .insert([{
            symbol: 'O',
            name: 'Realty Income Corporation',
            sector: 'Real Estate',
            market_cap: '50.2B',
            current_price: 58.25,
            price_change_24h: 0.15,
            price_change_percent_24h: 0.26,
            market_status: 'closed',
            last_price_update: new Date().toISOString(),
            is_active: true
          }])
          .select('id')
          .single();

        if (insertError || !newStock) {
          throw new Error(`Failed to create O stock: ${insertError?.message}`);
        }

        stockId = newStock.id;
        console.log('✅ [Test] Created O stock in database');
      }

      // Generate market hours data for O
      const historicalData = this.generateMarketHoursData('O');
      
      if (historicalData.length === 0) {
        throw new Error('No historical data generated');
      }

      console.log(`📊 [Test] Generated ${historicalData.length} data points for O`);
      console.log('📊 [Test] Sample timestamps:', historicalData.slice(0, 3).map(d => d.timestamp));

      // Clear existing 1D data for O
      const { error: deleteError } = await supabase
        .from('stock_prices_1d')
        .delete()
        .eq('stock_id', stockId);

      if (deleteError) {
        console.warn('⚠️ [Test] Could not clear existing data:', deleteError.message);
      }

      // Insert new historical data
      const priceRecords = historicalData.map(dataPoint => ({
        stock_id: stockId,
        timestamp: dataPoint.timestamp,
        open_price: dataPoint.open_price,
        high_price: dataPoint.high_price,
        low_price: dataPoint.low_price,
        close_price: dataPoint.close_price,
        volume: dataPoint.volume
      }));

      const { error: insertError } = await supabase
        .from('stock_prices_1d')
        .insert(priceRecords);

      if (insertError) {
        throw new Error(`Failed to insert historical data: ${insertError.message}`);
      }

      console.log('✅ [Test] Successfully synced O stock 1D data');
      console.log(`📊 [Test] Inserted ${historicalData.length} price records`);
      
    } catch (error) {
      console.error('❌ [Test] O stock sync failed:', error);
      throw error;
    }
  }

  // Test function to sync NVIDIA 1D data
  async testSyncNVDA1D(): Promise<void> {
    console.log('🧪 [Test] Starting NVIDIA 1D sync test...');
    
    try {
      // First ensure NVDA stock exists in database
      const { data: existingStock, error: fetchError } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', 'NVDA')
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      let stockId: string;

      if (existingStock) {
        stockId = existingStock.id;
        console.log('✅ [Test] Found existing NVDA stock in database');
      } else {
        // Create NVDA stock
        const { data: newStock, error: insertError } = await supabase
          .from('stocks')
          .insert([{
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            sector: 'Technology',
            market_cap: '2.1T',
            current_price: 875.25,
            price_change_24h: 12.50,
            price_change_percent_24h: 1.45,
            market_status: 'closed',
            last_price_update: new Date().toISOString(),
            is_active: true
          }])
          .select('id')
          .single();

        if (insertError || !newStock) {
          throw new Error(`Failed to create NVDA stock: ${insertError?.message}`);
        }

        stockId = newStock.id;
        console.log('✅ [Test] Created NVDA stock in database');
      }

      // Generate market hours data for NVDA
      const historicalData = this.generateMarketHoursData('NVDA');
      
      if (historicalData.length === 0) {
        throw new Error('No historical data generated');
      }

      console.log(`📊 [Test] Generated ${historicalData.length} data points for NVDA`);
      console.log('📊 [Test] Sample timestamps:', historicalData.slice(0, 3).map(d => d.timestamp));

      // Clear existing 1D data for NVDA
      const { error: deleteError } = await supabase
        .from('stock_prices_1d')
        .delete()
        .eq('stock_id', stockId);

      if (deleteError) {
        console.warn('⚠️ [Test] Could not clear existing data:', deleteError.message);
      }

      // Insert new historical data
      const priceRecords = historicalData.map(dataPoint => ({
        stock_id: stockId,
        timestamp: dataPoint.timestamp,
        open_price: dataPoint.open_price,
        high_price: dataPoint.high_price,
        low_price: dataPoint.low_price,
        close_price: dataPoint.close_price,
        volume: dataPoint.volume
      }));

      const { error: insertError } = await supabase
        .from('stock_prices_1d')
        .insert(priceRecords);

      if (insertError) {
        throw new Error(`Failed to insert historical data: ${insertError.message}`);
      }

      console.log('✅ [Test] Successfully synced NVDA stock 1D data');
      console.log(`📊 [Test] Inserted ${historicalData.length} price records`);
      
    } catch (error) {
      console.error('❌ [Test] NVDA stock sync failed:', error);
      throw error;
    }
  }

  // Get historical data method (inside the class)
  async getHistoricalData(symbol: string, from: number, to: number) {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if the response indicates "no data"
      if (data.s === 'no_data') {
        console.warn(`⚠️ [Finnhub] No historical data available for ${symbol}`);
        return null;
      }

      if (data.s !== 'ok') {
        console.warn(`⚠️ [Finnhub] Historical data request failed for ${symbol}:`, data);
        return null;
      }

      console.log(`📊 [Finnhub] Received ${data.c?.length || 0} historical data points for ${symbol}`);
      return data;

    } catch (error) {
      console.error(`❌ [Finnhub] Error fetching historical data for ${symbol}:`, error);
      return null;
    }
  }
}

// Factory function to create FinnhubService instance
export const createFinnhubService = (apiKey: string): FinnhubService => {
  return new FinnhubService(apiKey);
};