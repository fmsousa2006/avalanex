// Finnhub API integration for real-time stock data
import { supabase } from './supabase';

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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get real-time quote for a stock
  async getQuote(symbol: string): Promise<FinnhubQuote | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if we got valid data
      if (data.c === 0 && data.d === 0 && data.dp === 0) {
        console.warn(`No data available for symbol: ${symbol}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
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
        throw new Error(`Finnhub API error: ${response.status}`);
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
export type { FinnhubQuote, FinnhubProfile };