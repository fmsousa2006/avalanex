import React, { useState, useEffect, useRef } from 'react';
import { Eye, X, Search, Plus, TrendingUp, TrendingDown, Target, StickyNote, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WatchlistItem {
  id: string;
  stock_id: string;
  notes: string | null;
  target_price: number | null;
  created_at: string;
  stock: {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_24h: number;
    price_change_percent_24h: number;
  };
}

interface WatchlistProps {
  isOpen: boolean;
  onClose: () => void;
}

const Watchlist: React.FC<WatchlistProps> = ({ isOpen, onClose }) => {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStocks, setAvailableStocks] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchWatchlist();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          id,
          stock_id,
          notes,
          target_price,
          created_at,
          stock:stocks (
            id,
            symbol,
            name,
            current_price,
            price_change_24h,
            price_change_percent_24h
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWatchlistItems(data || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStocks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingWatchlist } = await supabase
        .from('watchlist')
        .select('stock_id')
        .eq('user_id', user.id);

      const watchedStockIds = existingWatchlist?.map(item => item.stock_id) || [];

      const { data, error } = await supabase
        .from('stocks')
        .select('id, symbol, name, current_price')
        .eq('is_active', true)
        .order('symbol');

      if (error) throw error;

      const filtered = data?.filter(stock => !watchedStockIds.includes(stock.id)) || [];
      setAvailableStocks(filtered);
    } catch (error) {
      console.error('Error fetching available stocks:', error);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!selectedStock) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          stock_id: selectedStock,
          target_price: targetPrice ? parseFloat(targetPrice) : null,
          notes: notes || null
        });

      if (error) throw error;

      setShowAddModal(false);
      setSelectedStock(null);
      setTargetPrice('');
      setNotes('');
      fetchWatchlist();
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const handleRemoveFromWatchlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchWatchlist();
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const filteredItems = watchlistItems.filter(item =>
    item.stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <div
        ref={modalRef}
        className="bg-gray-800 h-full w-full max-w-2xl shadow-2xl flex flex-col animate-slide-in"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Watchlist</h2>
              <p className="text-sm text-gray-400">Track stocks you're interested in</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search watchlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => {
              setShowAddModal(true);
              fetchAvailableStocks();
            }}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Stock to Watchlist</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-4 bg-gray-700 rounded-full mb-4">
                <Eye className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                {searchQuery ? 'No matching stocks' : 'Your watchlist is empty'}
              </h3>
              <p className="text-gray-500 max-w-md">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Start tracking stocks by clicking the "Add Stock" button above'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-750 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-bold text-white">{item.stock.symbol}</h3>
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                          Watching
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{item.stock.name}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromWatchlist(item.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Current Price</p>
                      <p className="text-xl font-bold text-white">
                        ${item.stock.current_price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">24h Change</p>
                      <div className="flex items-center space-x-1">
                        {item.stock.price_change_percent_24h >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={`text-lg font-bold ${
                            item.stock.price_change_percent_24h >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {item.stock.price_change_percent_24h?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.target_price && (
                    <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded-lg mb-2">
                      <Target className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-300">
                        Target: <span className="font-semibold">${item.target_price.toFixed(2)}</span>
                      </span>
                      {item.stock.current_price >= item.target_price && (
                        <AlertCircle className="w-4 h-4 text-green-500 ml-auto" title="Target reached!" />
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <div className="flex items-start space-x-2 p-2 bg-gray-700 rounded-lg">
                      <StickyNote className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-300">{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add to Watchlist</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedStock(null);
                  setTargetPrice('');
                  setNotes('');
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Stock
                </label>
                <select
                  value={selectedStock || ''}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a stock...</option>
                  {availableStocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.symbol} - {stock.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Add your thoughts about this stock..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleAddToWatchlist}
                disabled={!selectedStock}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  selectedStock
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add to Watchlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
