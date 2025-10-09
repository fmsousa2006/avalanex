import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// S&P 500 stocks (sample - in production, fetch from reliable API)
const SP500_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." }
];

// NASDAQ-100 stocks (sample)
const NASDAQ100_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "COST", name: "Costco Wholesale Corporation" },
  { symbol: "NFLX", name: "Netflix Inc." }
];

// DOW 30 stocks
const DOW30_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "MCD", name: "McDonald's Corporation" },
  { symbol: "DIS", name: "The Walt Disney Company" }
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Combine all stocks with their index memberships
    const stocksMap = new Map<string, { symbol: string; name: string; indices: string[] }>();

    // Add S&P 500 stocks
    for (const stock of SP500_STOCKS) {
      if (!stocksMap.has(stock.symbol)) {
        stocksMap.set(stock.symbol, { ...stock, indices: [] });
      }
      stocksMap.get(stock.symbol)!.indices.push("SP500");
    }

    // Add NASDAQ-100 stocks
    for (const stock of NASDAQ100_STOCKS) {
      if (!stocksMap.has(stock.symbol)) {
        stocksMap.set(stock.symbol, { ...stock, indices: [] });
      }
      stocksMap.get(stock.symbol)!.indices.push("NASDAQ100");
    }

    // Add DOW 30 stocks
    for (const stock of DOW30_STOCKS) {
      if (!stocksMap.has(stock.symbol)) {
        stocksMap.set(stock.symbol, { ...stock, indices: [] });
      }
      stocksMap.get(stock.symbol)!.indices.push("DOW30");
    }

    // Insert or update stocks
    let inserted = 0;
    let updated = 0;

    for (const [symbol, data] of stocksMap.entries()) {
      const { error } = await supabase
        .from("stocks")
        .upsert({
          symbol: data.symbol,
          name: data.name,
          index_membership: data.indices,
          is_active: true,
        }, {
          onConflict: "symbol",
        });

      if (error) {
        console.error(`Error upserting ${symbol}:`, error);
      } else {
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Populated ${stocksMap.size} unique stocks`,
        details: {
          sp500: SP500_STOCKS.length,
          nasdaq100: NASDAQ100_STOCKS.length,
          dow30: DOW30_STOCKS.length,
          unique: stocksMap.size,
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