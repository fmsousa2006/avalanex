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

function isMarketHours(): boolean {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!isMarketHours()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Market is closed. Sync only runs during market hours (9:30 AM - 4 PM EST, weekdays)",
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

    console.log(`Starting sync for ${stocks.length} stocks...`);

    let successCount = 0;
    let errorCount = 0;
    const timestamp = new Date().toISOString();

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i] as Stock;
      
      const quote = await fetchQuote(stock.symbol);
      
      if (quote && quote.c > 0) {
        const { error: updateError } = await supabase
          .from("stocks")
          .update({
            current_price: quote.c,
            price_change_24h: quote.d,
            price_change_percent_24h: quote.dp,
            last_price_update: timestamp,
          })
          .eq("id", stock.id);

        if (updateError) {
          console.error(`Error updating stock ${stock.symbol}:`, updateError);
        }

        const { error: insertError } = await supabase
          .from("stock_prices")
          .insert({
            stock_id: stock.id,
            timestamp: timestamp,
            resolution: "1h",
            open_price: quote.o,
            high_price: quote.h,
            low_price: quote.l,
            close_price: quote.c,
            volume: 0,
          });

        if (insertError) {
          console.error(`Error inserting stock_prices for ${stock.symbol}:`, insertError);
        }

        await supabase
          .from("api_calls")
          .insert({
            service: "finnhub",
            endpoint: "quote",
            symbol: stock.symbol,
            status: "success",
            origin: "edge_function",
          });

        successCount++;
        console.log(`✓ ${stock.symbol}: $${quote.c}`);
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
        message: `Sync completed: ${successCount} successful, ${errorCount} failed`,
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
