const COLOR_MAP = [
  { hex: '#10b981', class: 'bg-emerald-500' },  // emerald
  { hex: '#3b82f6', class: 'bg-blue-500' },     // blue
  { hex: '#8b5cf6', class: 'bg-purple-500' },   // purple
  { hex: '#f59e0b', class: 'bg-amber-500' },    // amber
  { hex: '#ef4444', class: 'bg-red-500' },      // red
  { hex: '#06b6d4', class: 'bg-cyan-500' },     // cyan
  { hex: '#84cc16', class: 'bg-lime-500' },     // lime
  { hex: '#f97316', class: 'bg-orange-500' },   // orange
  { hex: '#ec4899', class: 'bg-pink-500' },     // pink
  { hex: '#6366f1', class: 'bg-indigo-500' }    // indigo
];

export const getStockColor = (symbol: string): string => {
  const index = symbol.charCodeAt(0) % COLOR_MAP.length;
  return COLOR_MAP[index].hex;
};

export const getStockColorClass = (symbol: string): string => {
  const index = symbol.charCodeAt(0) % COLOR_MAP.length;
  return COLOR_MAP[index].class;
};
