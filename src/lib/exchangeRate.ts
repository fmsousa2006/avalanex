import { supabase } from './supabase';
import { finnhubService } from './finnhub';

const CACHE_DURATION_HOURS = 24;

export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export class ExchangeRateService {
  async getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<number> {
    if (baseCurrency === targetCurrency) {
      return 1.0;
    }

    try {
      const cachedRate = await this.getCachedRate(baseCurrency, targetCurrency);

      if (cachedRate && this.isCacheValid(cachedRate.fetched_at)) {
        console.log(`✅ [ExchangeRate] Using cached rate for ${baseCurrency}/${targetCurrency}: ${cachedRate.rate}`);
        return cachedRate.rate;
      }

      const freshRate = await this.fetchAndCacheRate(baseCurrency, targetCurrency);

      if (freshRate) {
        return freshRate;
      }

      if (cachedRate) {
        console.warn(`⚠️ [ExchangeRate] Using stale cached rate for ${baseCurrency}/${targetCurrency}`);
        return cachedRate.rate;
      }

      console.error(`❌ [ExchangeRate] No rate available for ${baseCurrency}/${targetCurrency}, using 1.0`);
      return 1.0;

    } catch (error) {
      console.error(`❌ [ExchangeRate] Error getting exchange rate:`, error);
      return 1.0;
    }
  }

  private async getCachedRate(baseCurrency: string, targetCurrency: string): Promise<ExchangeRate | null> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('base_currency', baseCurrency)
        .eq('target_currency', targetCurrency)
        .maybeSingle();

      if (error) {
        console.error(`❌ [ExchangeRate] Error fetching cached rate:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`❌ [ExchangeRate] Error in getCachedRate:`, error);
      return null;
    }
  }

  private isCacheValid(fetchedAt: string): boolean {
    const fetchedDate = new Date(fetchedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - fetchedDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < CACHE_DURATION_HOURS;
  }

  private async fetchAndCacheRate(baseCurrency: string, targetCurrency: string): Promise<number | null> {
    try {
      const rate = await finnhubService.getForexRate(baseCurrency, targetCurrency);

      if (!rate) {
        return null;
      }

      const existingRate = await this.getCachedRate(baseCurrency, targetCurrency);

      if (existingRate) {
        const { error } = await supabase
          .from('exchange_rates')
          .update({
            rate,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('base_currency', baseCurrency)
          .eq('target_currency', targetCurrency);

        if (error) {
          console.error(`❌ [ExchangeRate] Error updating rate:`, error);
        } else {
          console.log(`✅ [ExchangeRate] Updated cached rate for ${baseCurrency}/${targetCurrency}: ${rate}`);
        }
      } else {
        const { error } = await supabase
          .from('exchange_rates')
          .insert({
            base_currency: baseCurrency,
            target_currency: targetCurrency,
            rate,
            fetched_at: new Date().toISOString()
          });

        if (error) {
          console.error(`❌ [ExchangeRate] Error inserting rate:`, error);
        } else {
          console.log(`✅ [ExchangeRate] Cached new rate for ${baseCurrency}/${targetCurrency}: ${rate}`);
        }
      }

      return rate;
    } catch (error) {
      console.error(`❌ [ExchangeRate] Error in fetchAndCacheRate:`, error);
      return null;
    }
  }
}

export const exchangeRateService = new ExchangeRateService();
