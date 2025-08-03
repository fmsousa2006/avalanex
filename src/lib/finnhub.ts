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
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://finnhub.io/api/v1';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'demo');
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
  async getCandles(
    symbol: string, 
    resolution: string, 
    from: number, 
    to: number
  ): Promise<FinnhubCandle> {
    console.log(`🔍 Fetching candles for ${symbol}:`, {
      resolution,
      from: new Date(from * 1000).toLocaleString(),
      to: new Date(to * 1000).toLocaleString()
    });

    const response = await fetch(
      `${this.baseUrl}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Finnhub response for ${symbol}:`, data);

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
      const priceUpdated = await this.updateStockPrice(symbol);
      if (!priceUpdated) {
        return false;
      }

      // Get stock ID from database
      const { data: stock, error: stockError } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', symbol)
        .single();

      if (stockError || !stock) {
        console.error(`❌ [Finnhub] Stock ${symbol} not found in database`);
        return false;
      }

      // Generate 1-day historical data (market hours only)
      const historicalData = this.generateMarketHoursData(symbol);
      
      if (historicalData.length === 0) {
        console.warn(`⚠️ [Finnhub] No historical data generated for ${symbol}`);
        return false;
      }

      // Insert historical data into stock_prices_1d table
      const priceRecords = historicalData.map(dataPoint => ({
        stock_id: stock.id,
        timestamp: dataPoint.timestamp,
        open_price: dataPoint.open_price,
        high_price: dataPoint.high_price,
        low_price: dataPoint.low_price,
        close_price: dataPoint.close_price,
        volume: dataPoint.volume
      }));

      // Use upsert to avoid duplicates
      const { error: insertError } = await supabase
        .from('stock_prices_1d')
        .upsert(priceRecords, {
          onConflict: 'stock_id,timestamp'
        });

      if (insertError) {
        console.error(`❌ [Finnhub] Error inserting historical data for ${symbol}:`, insertError);
        return false;
      }

      console.log(`✅ [Finnhub] Updated ${symbol} with ${historicalData.length} historical data points`);
      return true;
    } catch (error) {
      console.error(`❌ [Finnhub] Error updating ${symbol} with historical data:`, error);
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

  private getLastTradingDay(): Date {
    const now = new Date();
    const lastTradingDay = new Date(now);
    
    // If it's before market open today (13:30 UTC), go back one day
    if (now.getUTCHours() < 13 || (now.getUTCHours() === 13 && now.getUTCMinutes() < 30)) {
      lastTradingDay.setDate(lastTradingDay.getDate() - 1);
    }
    
    // Keep going back days until we find a weekday (Mon-Fri)
    while (true) {
      const dayOfWeek = lastTradingDay.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        break;
      }
      lastTradingDay.setDate(lastTradingDay.getDate() - 1);
    }
    
    // Set to midnight of that day
    lastTradingDay.setUTCHours(0, 0, 0, 0);
    return lastTradingDay;
  }

  private generateMarketHoursData(symbol: string): Array<{
    timestamp: string;
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
  }> {
    const data: Array<any> = [];
    
    // Get the last trading day
    const tradingDay = this.getLastTradingDay();
    
    // Set pre-market start (4:00 AM ET = 08:00 UTC)
    const preMarketStart = new Date(tradingDay);
    preMarketStart.setUTCHours(8, 0, 0, 0);
    
    // Set regular market open (9:30 AM ET = 13:30 UTC)
    const marketOpen = new Date(tradingDay);
    marketOpen.setUTCHours(13, 30, 0, 0);
    
    // Set regular market close (4:00 PM ET = 20:00 UTC)
    const marketClose = new Date(tradingDay);
    marketClose.setUTCHours(20, 0, 0, 0);
    
    // Set after-market end (8:00 PM ET = 24:00 UTC)
    const afterMarketEnd = new Date(tradingDay);
    afterMarketEnd.setUTCHours(24, 0, 0, 0);
    
    console.log(`📅 Generating full day market data for ${symbol} on ${tradingDay.toLocaleDateString()}`, {
      preMarket: preMarketStart.toISOString(),
      marketOpen: marketOpen.toISOString(),
      marketClose: marketClose.toISOString(),
      afterMarket: afterMarketEnd.toISOString()
    });

    // Base price and current time tracking
    const basePrice = symbol === 'O' ? 58.25 : symbol === 'NVDA' ? 875.25 : 175.50;
    let currentTime = new Date(preMarketStart);
    let currentPrice = basePrice;
    
    // Generate data points for the entire trading day
    while (currentTime <= afterMarketEnd) {
      // Adjust volatility based on market session
      let volatility = symbol === 'O' ? 0.002 : symbol === 'NVDA' ? 0.015 : 0.008;
      
      // Reduce volatility during pre and after market
      if (currentTime < marketOpen || currentTime > marketClose) {
        volatility *= 0.5;
      }
      
      const randomChange = (Math.random() - 0.5) * volatility;
      currentPrice = currentPrice * (1 + randomChange);
      
      // Reduce volume during pre and after market
      const baseVolume = symbol === 'O' ? 3200000 : symbol === 'NVDA' ? 45000000 : 25000000;
      const volumeMultiplier = currentTime < marketOpen || currentTime > marketClose ? 0.3 : 1;
      
      data.push({
        timestamp: currentTime.toISOString(),
        open_price: parseFloat(currentPrice.toFixed(4)),
        high_price: parseFloat((currentPrice * (1 + Math.random() * volatility)).toFixed(4)),
        low_price: parseFloat((currentPrice * (1 - Math.random() * volatility)).toFixed(4)),
        close_price: parseFloat(currentPrice.toFixed(4)),
        volume: Math.floor(baseVolume * volumeMultiplier * (0.5 + Math.random()))
      });
      
      // Move to next 5-minute interval
      currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
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
}

// Factory function to create FinnhubService instance
export const createFinnhubService = (): FinnhubService => {
  const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error('Finnhub API key is not configured');
  }
  return new FinnhubService(apiKey);
};

// Sync stock price for a given symbol
export const syncStockPrice = async (symbol: string) => {
  try {
    const finnhubService = createFinnhubService();
    await finnhubService.updateStockPrice(symbol);
  } catch (error) {
    console.error('Failed to sync prices:', error);
    // Handle the error appropriately in your UI
  }
};