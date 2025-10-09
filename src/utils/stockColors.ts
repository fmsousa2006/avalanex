const STOCK_COLOR_MAP: Record<string, { hex: string; class: string }> = {
  'PLTR': { hex: '#10b981', class: 'bg-emerald-500' },    // emerald
  'MO': { hex: '#3b82f6', class: 'bg-blue-500' },         // blue
  'GOOGL': { hex: '#8b5cf6', class: 'bg-purple-500' },    // purple
  'O': { hex: '#f59e0b', class: 'bg-amber-500' },         // amber
  'AMZN': { hex: '#ef4444', class: 'bg-red-500' },        // red
  'PG': { hex: '#06b6d4', class: 'bg-cyan-500' },         // cyan
  'AAPL': { hex: '#84cc16', class: 'bg-lime-500' },       // lime
};

const DEFAULT_COLORS = [
  { hex: '#f97316', class: 'bg-orange-500' },   // orange
  { hex: '#ec4899', class: 'bg-pink-500' },     // pink
  { hex: '#6366f1', class: 'bg-indigo-500' },   // indigo
  { hex: '#14b8a6', class: 'bg-teal-500' },     // teal
  { hex: '#a855f7', class: 'bg-violet-500' },   // violet
  { hex: '#22c55e', class: 'bg-green-500' },    // green
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export const getStockColor = (symbol: string): string => {
  if (STOCK_COLOR_MAP[symbol]) {
    return STOCK_COLOR_MAP[symbol].hex;
  }
  const index = hashString(symbol) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index].hex;
};

export const getStockColorClass = (symbol: string): string => {
  if (STOCK_COLOR_MAP[symbol]) {
    return STOCK_COLOR_MAP[symbol].class;
  }
  const index = hashString(symbol) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index].class;
};
