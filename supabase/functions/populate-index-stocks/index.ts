import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FINNHUB_API_KEY = "d1vrncpr01qmbi8ppsrgd1vrncpr01qmbi8ppss0";

// Known S&P 500 symbols - comprehensive list
const SP500_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "JPM", "V",
  "UNH", "JNJ", "WMT", "XOM", "LLY", "MA", "PG", "AVGO", "HD", "CVX",
  "MRK", "ABBV", "COST", "KO", "PEP", "ADBE", "CRM", "MCD", "CSCO", "ACN",
  "TMO", "NFLX", "ABT", "LIN", "INTC", "AMD", "DHR", "NKE", "TXN", "CMCSA",
  "NEE", "UPS", "VZ", "PM", "ORCL", "DIS", "RTX", "QCOM", "WFC", "HON",
  "BMY", "INTU", "UNP", "LOW", "SPGI", "IBM", "BA", "CAT", "SBUX", "ELV",
  "AMAT", "GE", "DE", "BLK", "AMGN", "PLD", "GS", "ADP", "GILD", "BKNG",
  "ADI", "LMT", "MMC", "TJX", "SYK", "MDLZ", "VRTX", "CVS", "C", "AXP",
  "TMUS", "AMT", "CI", "ZTS", "MO", "REGN", "BDX", "CB", "ISRG", "BSX",
  "PGR", "SO", "SCHW", "EOG", "DUK", "MMM", "ETN", "LRCX", "NOC", "SLB",
  "FI", "PNC", "CME", "ITW", "WM", "USB", "CL", "APD", "MS", "HCA",
  "ICE", "MU", "EQIX", "MCO", "AON", "EW", "TGT", "GM", "NSC", "PANW",
  "SHW", "EMR", "COP", "MAR", "TFC", "MCK", "APH", "FCX", "COF", "CSX",
  "PSA", "GD", "SNPS", "KLAC", "TDG", "FDX", "AJG", "HUM", "AFL", "ADSK",
  "MSI", "DLR", "ROP", "ADM", "AIG", "AZO", "MPC", "NXPI", "AEP", "SPG",
  "CARR", "ORLY", "SRE", "JCI", "PAYX", "KMB", "ANET", "ROST", "TRV", "TEL",
  "BK", "PRU", "WELL", "O", "CDNS", "PCAR", "MNST", "IDXX", "CMG", "PCG",
  "EXC", "RSG", "AMP", "ALL", "KMI", "D", "MSCI", "FAST", "YUM", "SYY",
  "HSY", "CCI", "GWW", "CTAS", "MCHP", "HES", "ODFL", "EA", "FTNT", "PH",
  "HLT", "DD", "PEG", "XEL", "BKR", "OKE", "LULU", "DHI", "CTVA", "KHC",
  "ED", "DXCM", "URI", "F", "IQV", "PWR", "CHTR", "WMB", "DAL", "AME",
  "VICI", "VMC", "CPRT", "CBRE", "HPQ", "RMD", "OTIS", "GIS", "SBAC", "GLW",
  "ACGL", "EXR", "FANG", "DFS", "A", "MLM", "LEN", "KVUE", "VLO", "IR",
  "STZ", "CSGP", "AXON", "AVB", "HIG", "WAB", "NEM", "EIX", "ANSS", "IT",
  "DOW", "KR", "EFX", "BIIB", "MTD", "EBAY", "WEC", "CDW", "ETR", "ROK",
  "FITB", "LH", "DOV", "FTV", "NUE", "NDAQ", "GEHC", "TTWO", "KEYS", "LYB",
  "AWK", "MTB", "HPE", "PPG", "MPWR", "WBD", "HAL", "CAH", "LUV", "TT",
  "HWM", "GRMN", "HUBB", "EQR", "STT", "TSCO", "VTR", "INVH", "BALL", "WST",
  "STE", "IFF", "PKI", "K", "DG", "IRM", "RF", "CFG", "CNP", "APTV",
  "TYL", "STLD", "DTE", "ESS", "CE", "HBAN", "DLTR", "PPL", "TDY", "NTRS",
  "MAA", "TROW", "FE", "CLX", "AEE", "ZBRA", "CBOE", "CINF", "PFG", "COO",
  "OMC", "BR", "DRI", "EXPE", "ALGN", "UAL", "IEX", "GPN", "CAG", "HOLX",
  "VLTO", "SYF", "MKC", "CTRA", "ARE", "LNT", "EXPD", "LDOS", "WTW", "TSN",
  "MRNA", "J", "ULTA", "LVS", "WY", "EPAM", "BLDR", "POOL", "SWKS", "JBHT",
  "CTLT", "AMCR", "SWK", "NVR", "WAT", "MRO", "DECK", "IP", "AVY", "AKAM",
  "GPC", "JKHY", "CMS", "BBY", "EVRG", "LKQ", "NTAP", "TER", "KIM", "FDS",
  "LW", "BBWI", "UDR", "PODD", "FICO", "ENPH", "CPT", "TRMB", "ATO", "REG",
  "HST", "MAS", "NDSN", "PAYC", "VTRS", "SNA", "CHRW", "TPR", "TECH", "BXP",
  "AES", "EMN", "JNPR", "GL", "RJF", "DAY", "CPB", "AIZ", "HII", "DGX",
  "PKG", "BG", "INCY", "FFIV", "BEN", "PNR", "HRL", "WRB", "HAS", "ALB",
  "UHS", "PARA", "IVZ", "FRT", "NI", "IPG", "CRL", "HSIC", "NWSA", "TAP"
];

interface FinnhubSymbol {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
  currency?: string;
  figi?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting S&P 500 stock population from Finnhub...");

    // Fetch all US stocks from Finnhub
    const finnhubUrl = `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${FINNHUB_API_KEY}`;
    console.log("📡 Fetching US stocks from Finnhub...");

    const response = await fetch(finnhubUrl);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }

    const allUSStocks: FinnhubSymbol[] = await response.json();
    console.log(`✅ Fetched ${allUSStocks.length} total US stocks from Finnhub`);

    // Create a map of Finnhub data by symbol for quick lookup
    const finnhubMap = new Map<string, FinnhubSymbol>();
    for (const stock of allUSStocks) {
      finnhubMap.set(stock.symbol, stock);
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Process S&P 500 stocks
    const stocksToInsert = [];
    const notFound = [];

    for (const symbol of SP500_SYMBOLS) {
      const finnhubData = finnhubMap.get(symbol);

      if (finnhubData) {
        stocksToInsert.push({
          symbol: finnhubData.symbol,
          name: finnhubData.description || finnhubData.displaySymbol,
          index_membership: ["SP500"],
          is_active: true,
        });
      } else {
        notFound.push(symbol);
        // Still add it with basic info
        stocksToInsert.push({
          symbol: symbol,
          name: symbol,
          index_membership: ["SP500"],
          is_active: true,
        });
      }
    }

    console.log(`📊 Prepared ${stocksToInsert.length} S&P 500 stocks for insertion`);
    if (notFound.length > 0) {
      console.log(`⚠️ ${notFound.length} symbols not found in Finnhub: ${notFound.slice(0, 10).join(", ")}...`);
    }

    // Batch insert/update stocks (Supabase can handle arrays)
    const { data, error } = await supabase
      .from("stocks")
      .upsert(stocksToInsert, {
        onConflict: "symbol",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("❌ Database error:", error);
      throw error;
    }

    console.log("✅ Successfully populated S&P 500 stocks");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully populated ${stocksToInsert.length} S&P 500 stocks`,
        details: {
          total_sp500: SP500_SYMBOLS.length,
          found_in_finnhub: stocksToInsert.length - notFound.length,
          not_found_in_finnhub: notFound.length,
          inserted: stocksToInsert.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
