import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FINNHUB_API_KEY = "d1vrncpr01qmbi8ppsrgd1vrncpr01qmbi8ppss0";
const RATE_LIMIT_PER_MINUTE = 60;
const DELAY_MS = (60 * 1000) / RATE_LIMIT_PER_MINUTE;

interface StockQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

interface Stock {
  id: string;
  symbol: string;
  name: string;
}

function isTradingDay(): boolean {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = nyTime.getDay();
  
  return day >= 1 && day <= 5;
}

async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMarketCloseTimeUTC(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);

  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  const testUTC = new Date(`${year}-${month}-${day}T20:00:00.000Z`);
  const testParts = new Intl.DateTimeFormat('en-US', {
    ...options
  }).formatToParts(testUTC);
  const testHour = parseInt(testParts.find(p => p.type === 'hour')!.value);

  const utcHour = 20 + (16 - testHour);

  return `${year}-${month}-${day}T${String(utcHour).padStart(2, '0')}:00:00.000Z`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!isTradingDay()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Not a trading day. Daily sync only runs on weekdays.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: stocks, error: fetchError } = await supabase
      .from("stocks")
      .select("id, symbol, name")
      .eq("is_active", true);

    if (fetchError) {
      throw new Error(`Failed to fetch stocks: ${fetchError.message}`);
    }

    if (!stocks || stocks.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No active stocks to sync" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Starting daily sync for ${stocks.length} stocks...`);

    let successCount = 0;
    let errorCount = 0;
    const timestamp = getMarketCloseTimeUTC();

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i] as Stock;
      
      const quote = await fetchQuote(stock.symbol);
      
      if (quote && quote.c > 0) {
        const { error: insertError } = await supabase
          .from("stock_prices")
          .insert({
            stock_id: stock.id,
            timestamp: timestamp,
            resolution: "1d",
            open_price: quote.o,
            high_price: quote.h,
            low_price: quote.l,
            close_price: quote.c,
            volume: 0,
          });

        if (insertError) {
          console.error(`Error inserting daily price for ${stock.symbol}:`, insertError);
          errorCount++;
        } else {
          successCount++;
          console.log(`✓ ${stock.symbol}: $${quote.c} (daily)`);
        }

        await supabase
          .from("api_calls")
          .insert({
            service: "finnhub",
            endpoint: "quote",
            symbol: stock.symbol,
            status: insertError ? "error" : "success",
            origin: "edge_function",
          });
      } else {
        await supabase
          .from("api_calls")
          .insert({
            service: "finnhub",
            endpoint: "quote",
            symbol: stock.symbol,
            status: "error",
            origin: "edge_function",
          });

        errorCount++;
        console.log(`✗ ${stock.symbol}: Failed to fetch`);
      }

      if (i < stocks.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily sync completed: ${successCount} successful, ${errorCount} failed`,
        details: {
          total: stocks.length,
          success: successCount,
          errors: errorCount,
          timestamp,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
