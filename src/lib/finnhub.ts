// Finnhub API service for fetching stock data
import { supabase } from './supabase';

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface StockQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface CandleData {
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

  constructor() {
    this.apiKey = FINNHUB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ [Finnhub] API key not configured. Using mock data.');
    }
  }

  // Log API call to database for tracking
  private async logApiCall(
    endpoint: string,
    symbol: string | null,
    status: 'success' | 'error' | 'no_data',
    responseTime: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('api_calls').insert({
        service: 'finnhub',
        endpoint,
        symbol,
        status,
        response_time_ms: responseTime,
        user_id: user?.id || null
      });
    } catch (error) {
      // Silent fail - don't break the API call if logging fails
      console.error('Failed to log API call:', error);
    }
  }

  // Check if API is configured
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your-finnhub-api-key-here';
  }

  // Get current stock quote
  async getQuote(symbol: string): Promise<StockQuote | null> {
    if (!this.isConfigured()) {
      console.warn(`⚠️ [Finnhub] API not configured, cannot fetch quote for ${symbol}`);
      return null;
    }

    const startTime = Date.now();
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        const responseTime = Date.now() - startTime;
        await this.logApiCall('quote', symbol, 'error', responseTime);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StockQuote = await response.json();
      const responseTime = Date.now() - startTime;

      // Check if we got valid data
      if (data.c === 0 && data.d === 0 && data.dp === 0) {
        console.warn(`⚠️ [Finnhub] No data available for symbol ${symbol}`);
        await this.logApiCall('quote', symbol, 'no_data', responseTime);
        return null;
      }

      console.log(`✅ [Finnhub] Fetched quote for ${symbol}: $${data.c}`);
      await this.logApiCall('quote', symbol, 'success', responseTime);
      return data;
    } catch (error) {
      console.error(`❌ [Finnhub] Error fetching quote for ${symbol}:`, error);
      const responseTime = Date.now() - startTime;
      await this.logApiCall('quote', symbol, 'error', responseTime);
      return null;
    }
  }

  // Get historical candle data
  async getCandles(
    symbol: string,
    resolution: string = 'D',
    from: number,
    to: number
  ): Promise<CandleData | null> {
    if (!this.isConfigured()) {
      console.warn(`⚠️ [Finnhub] API not configured, cannot fetch candles for ${symbol}`);
      return null;
    }

    const startTime = Date.now();
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`
      );

      if (!response.ok) {
        const responseTime = Date.now() - startTime;
        await this.logApiCall('candles', symbol, 'error', responseTime);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CandleData = await response.json();
      const responseTime = Date.now() - startTime;

      // Check if we got valid data
      if (data.s !== 'ok' || !data.c || data.c.length === 0) {
        console.warn(`⚠️ [Finnhub] No candle data available for symbol ${symbol}`);
        await this.logApiCall('candles', symbol, 'no_data', responseTime);
        return null;
      }

      console.log(`✅ [Finnhub] Fetched ${data.c.length} candles for ${symbol}`);
      await this.logApiCall('candles', symbol, 'success', responseTime);
      return data;
    } catch (error) {
      console.error(`❌ [Finnhub] Error fetching candles for ${symbol}:`, error);
      const responseTime = Date.now() - startTime;
      await this.logApiCall('candles', symbol, 'error', responseTime);
      return null;
    }
  }

  // Generate mock 30-day historical data (fallback when API is not available)
  generate30DayData(symbol: string): Array<{
    timestamp: string;
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
  }> {
    const data = [];
    const now = new Date();
    let basePrice = 100 + Math.random() * 200; // Random base price between $100-$300

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(16, 0, 0, 0); // Market close time

      // Generate realistic price movement
      const dailyChange = (Math.random() - 0.5) * 0.06; // ±3% daily change
      basePrice = basePrice * (1 + dailyChange);
      
      const open = basePrice * (0.995 + Math.random() * 0.01); // Open within ±0.5%
      const close = basePrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.02); // High up to 2% above
      const low = Math.min(open, close) * (1 - Math.random() * 0.02); // Low up to 2% below
      const volume = Math.floor(1000000 + Math.random() * 5000000); // Random volume

      data.push({
        timestamp: date.toISOString(),
        open_price: parseFloat(open.toFixed(4)),
        high_price: parseFloat(high.toFixed(4)),
        low_price: parseFloat(low.toFixed(4)),
        close_price: parseFloat(close.toFixed(4)),
        volume: volume
      });
    }

    return data;
  }

  // Get 30-day historical data (real or mock)
  async get30DayData(symbol: string): Promise<Array<{
    timestamp: string;
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
  }>> {
    if (!this.isConfigured()) {
      console.log(`📊 [Finnhub] API not configured, generating mock 30-day data for ${symbol}`);
      return this.generate30DayData(symbol);
    }

    try {
      // Calculate timestamps for 30 days ago to now
      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60); // 30 days ago

      const candleData = await this.getCandles(symbol, 'D', from, to);
      
      if (!candleData || !candleData.c) {
        console.log(`📊 [Finnhub] No real data available, generating mock data for ${symbol}`);
        return this.generate30DayData(symbol);
      }

      // Convert candle data to our format
      const historicalData = [];
      for (let i = 0; i < candleData.c.length; i++) {
        const timestamp = new Date(candleData.t[i] * 1000).toISOString();
        historicalData.push({
          timestamp,
          open_price: parseFloat(candleData.o[i].toFixed(4)),
          high_price: parseFloat(candleData.h[i].toFixed(4)),
          low_price: parseFloat(candleData.l[i].toFixed(4)),
          close_price: parseFloat(candleData.c[i].toFixed(4)),
          volume: candleData.v[i] || 0
        });
      }

      console.log(`✅ [Finnhub] Fetched ${historicalData.length} days of real historical data for ${symbol}`);
      return historicalData;
    } catch (error) {
      console.error(`❌ [Finnhub] Error fetching 30-day data for ${symbol}:`, error);
      console.log(`📊 [Finnhub] Falling back to mock data for ${symbol}`);
      return this.generate30DayData(symbol);
    }
  }

  // Get historical data method (inside the class)
  async getHistoricalData(symbol: string, from: number, to: number) {
    const startTime = Date.now();
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`
      );

      if (!response.ok) {
        const responseTime = Date.now() - startTime;
        await this.logApiCall('historical', symbol, 'error', responseTime);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      // Check if the response indicates "no data"
      if (data.s === 'no_data') {
        console.warn(`⚠️ [Finnhub] No historical data available for ${symbol}`);
        await this.logApiCall('historical', symbol, 'no_data', responseTime);
        return null;
      }

      if (data.s !== 'ok') {
        console.warn(`⚠️ [Finnhub] Historical data request failed for ${symbol}:`, data);
        await this.logApiCall('historical', symbol, 'no_data', responseTime);
        return null;
      }

      console.log(`📊 [Finnhub] Received ${data.c?.length || 0} historical data points for ${symbol}`);
      await this.logApiCall('historical', symbol, 'success', responseTime);
      return data;

    } catch (error) {
      console.error(`❌ [Finnhub] Error fetching historical data for ${symbol}:`, error);
      const responseTime = Date.now() - startTime;
      await this.logApiCall('historical', symbol, 'error', responseTime);
      return null;
    }
  }
}

// Export singleton instance
export const finnhubService = new FinnhubService();