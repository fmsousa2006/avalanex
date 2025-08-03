const fetch1DData = async (symbol: string) => {
  try {
    const now = new Date();
    // Get start of today's trading session (9:30 AM EDT)
    const marketOpen = new Date(now);
    marketOpen.setHours(13, 30, 0, 0); // 9:30 AM EDT = 13:30 UTC

    // Get current time or end of trading (4:00 PM EDT)
    const marketClose = new Date(now);
    marketClose.setHours(20, 0, 0, 0); // 4:00 PM EDT = 20:00 UTC

    const from = Math.floor(marketOpen.getTime() / 1000);
    const to = Math.floor(marketClose.getTime() / 1000);

    console.log('🕒 Fetching 1D data for', symbol, {
      from: new Date(from * 1000).toLocaleString(),
      to: new Date(to * 1000).toLocaleString()
    });

    // Make sure we're using the real Finnhub service
    if (!finnhubService.isConfigured()) {
      throw new Error('Finnhub API is not configured');
    }

    const response = await finnhubService.getCandles(
      symbol,
      '5',  // 5-minute intervals
      from,
      to
    );

    console.log('📊 Raw Finnhub response:', response);

    if (response.s !== 'ok' || !response.t || response.t.length === 0) {
      throw new Error('Invalid or empty response from Finnhub');
    }

    // Convert timestamps to readable dates for logging
    const sampleData = response.t.slice(0, 3).map((timestamp, i) => ({
      time: new Date(timestamp * 1000).toLocaleString(),
      price: response.c[i]
    }));
    console.log('📈 First 3 data points:', sampleData);

    return response;
  } catch (error) {
    console.error('❌ Error fetching 1D data:', error);
    throw error;
  }
};