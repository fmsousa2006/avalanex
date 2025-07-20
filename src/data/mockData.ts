// Mock data for the portfolio dashboard

export const portfolioData = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 150,
    price: 175.50,
    value: 26325,
    cost: 24000,
    change: 2325,
    changePercent: 9.69
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    shares: 100,
    price: 338.50,
    value: 33850,
    cost: 32000,
    change: 1850,
    changePercent: 5.78
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    shares: 80,
    price: 142.75,
    value: 11420,
    cost: 12000,
    change: -580,
    changePercent: -4.83
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    shares: 200,
    price: 151.25,
    value: 30250,
    cost: 28500,
    change: 1750,
    changePercent: 6.14
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    shares: 75,
    price: 242.75,
    value: 18206.25,
    cost: 20000,
    change: -1793.75,
    changePercent: -8.97
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    shares: 50,
    price: 875.25,
    value: 43762.50,
    cost: 40000,
    change: 3762.50,
    changePercent: 9.41
  }
];

export const stockTrendsData = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 175.50,
    priceHistory: [168.2, 171.5, 169.8, 173.2, 176.1, 174.8, 177.3, 175.9, 178.4, 175.5],
    change: 7.3,
    changePercent: 4.34
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 338.50,
    priceHistory: [325.8, 328.4, 331.2, 334.7, 336.9, 339.1, 341.5, 340.2, 342.8, 338.5],
    change: 12.7,
    changePercent: 3.90
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 142.75,
    priceHistory: [148.3, 146.7, 144.9, 143.2, 141.8, 140.5, 142.1, 143.8, 145.2, 142.75],
    change: -5.55,
    changePercent: -3.74
  }
];

export const transactionData = [
  {
    id: '1',
    symbol: 'NVDA',
    type: 'buy' as const,
    shares: 10,
    price: 875.25,
    amount: 8752.50,
    date: '2024-01-15',
    status: 'completed' as const
  },
  {
    id: '2',
    symbol: 'AAPL',
    type: 'dividend' as const,
    amount: 157.50,
    date: '2024-01-12',
    status: 'completed' as const
  },
  {
    id: '3',
    symbol: 'MSFT',
    type: 'buy' as const,
    shares: 25,
    price: 338.50,
    amount: 8462.50,
    date: '2024-01-10',
    status: 'completed' as const
  },
  {
    id: '4',
    symbol: 'TSLA',
    type: 'sell' as const,
    shares: 15,
    price: 242.75,
    amount: 3641.25,
    date: '2024-01-08',
    status: 'completed' as const
  },
  {
    id: '5',
    symbol: 'GOOGL',
    type: 'buy' as const,
    shares: 30,
    price: 142.75,
    amount: 4282.50,
    date: '2024-01-05',
    status: 'pending' as const
  },
  {
    id: '6',
    symbol: 'MSFT',
    type: 'dividend' as const,
    amount: 275.00,
    date: '2024-01-03',
    status: 'completed' as const
  }
];

export const dividendData = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    amount: 0.24,
    date: '2024-02-15',
    exDividendDate: '2024-02-09',
    paymentDate: '2024-02-15',
    yield: 0.52,
    frequency: 'Quarterly',
    status: 'upcoming' as const
  },
  {
    id: '2',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    amount: 0.75,
    date: '2024-02-14',
    exDividendDate: '2024-02-14',
    paymentDate: '2024-03-14',
    yield: 0.89,
    frequency: 'Quarterly',
    status: 'ex-dividend' as const
  },
  {
    id: '3',
    symbol: 'KO',
    name: 'The Coca-Cola Company',
    amount: 0.46,
    date: '2024-03-01',
    exDividendDate: '2024-02-28',
    paymentDate: '2024-04-01',
    yield: 2.95,
    frequency: 'Quarterly',
    status: 'upcoming' as const
  },
  {
    id: '4',
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    amount: 1.13,
    date: '2024-03-15',
    exDividendDate: '2024-02-26',
    paymentDate: '2024-03-12',
    yield: 2.87,
    frequency: 'Quarterly',
    status: 'upcoming' as const
  },
  {
    id: '5',
    symbol: 'PG',
    name: 'Procter & Gamble',
    amount: 0.9379,
    date: '2024-01-15',
    exDividendDate: '2024-01-19',
    paymentDate: '2024-02-15',
    yield: 2.41,
    frequency: 'Quarterly',
    status: 'paid' as const
  }
];