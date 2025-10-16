import React, { useState, useEffect } from 'react';
import { Star, ArrowLeft, Search, Plus, TrendingUp, TrendingDown, Target, StickyNote, Trash2, AlertCircle, X, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo1 from './logos/Logo1';

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
  onBack: () => void;
}

const Watchlist: React.FC<WatchlistProps> = ({ onBack }) => {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStocks, setAvailableStocks] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

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

  const handleUpdateWatchlist = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('watchlist')
        .update({
          target_price: targetPrice ? parseFloat(targetPrice) : null,
          notes: notes || null
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      setTargetPrice('');
      setNotes('');
      fetchWatchlist();
    } catch (error) {
      console.error('Error updating watchlist:', error);
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

  const openEditModal = (item: WatchlistItem) => {
    setEditingItem(item);
    setTargetPrice(item.target_price?.toString() || '');
    setNotes(item.notes || '');
  };

  const filteredItems = watchlistItems.filter(item =>
    item.stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <Logo1 size={40} />
              <div>
                <div className="flex items-center space-x-2">
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <h1 className="text-2xl font-bold text-white">Watchlist</h1>
                </div>
                <p className="text-sm text-gray-400">Track stocks you're interested in</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {watchlistItems.length} {watchlistItems.length === 1 ? 'stock' : 'stocks'} tracked
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by symbol or company name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                setShowAddModal(true);
                fetchAvailableStocks();
              }}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Stock</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your watchlist...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-gray-800 rounded-full mb-6">
              <Star className="w-16 h-16 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-300 mb-2">
              {searchQuery ? 'No matching stocks found' : 'Your watchlist is empty'}
            </h3>
            <p className="text-gray-500 max-w-md text-center mb-6">
              {searchQuery
                ? 'Try adjusting your search criteria to find the stocks you\'re looking for'
                : 'Start building your watchlist by adding stocks you want to track'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setShowAddModal(true);
                  fetchAvailableStocks();
                }}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-semibold rounded-lg transition-all flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Your First Stock</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      <h3 className="text-xl font-bold text-white truncate">{item.stock.symbol}</h3>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{item.stock.name}</p>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
                      title="Edit notes and target"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleRemoveFromWatchlist(item.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Current Price</p>
                      <p className="text-3xl font-bold text-white">
                        ${item.stock.current_price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">24h Change</p>
                      <div className="flex items-center justify-end space-x-1">
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
                          {item.stock.price_change_percent_24h >= 0 ? '+' : ''}
                          {item.stock.price_change_percent_24h?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.target_price && (
                    <div className="flex items-center justify-between p-3 bg-gray-750 rounded-lg border border-gray-600">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-300">
                          Target: <span className="font-semibold text-white">${item.target_price.toFixed(2)}</span>
                        </span>
                      </div>
                      {item.stock.current_price >= item.target_price && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-green-500 bg-opacity-20 rounded">
                          <AlertCircle className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-semibold text-green-500">Reached</span>
                        </div>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <div className="flex items-start space-x-2 p-3 bg-gray-750 rounded-lg border border-gray-600">
                      <StickyNote className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-300 leading-relaxed">{item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Watchlist Item' : 'Add to Watchlist'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
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
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Stock <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStock || ''}
                    onChange={(e) => setSelectedStock(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Choose a stock...</option>
                    {availableStocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.symbol} - {stock.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingItem && (
                <div className="p-4 bg-gray-750 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <div>
                      <p className="font-bold text-white">{editingItem.stock.symbol}</p>
                      <p className="text-sm text-gray-400">{editingItem.stock.name}</p>
                    </div>
                  </div>
                </div>
              )}

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
                    className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Add your thoughts, research, or reminders about this stock..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                />
              </div>

              <button
                onClick={editingItem ? handleUpdateWatchlist : handleAddToWatchlist}
                disabled={!editingItem && !selectedStock}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  (editingItem || selectedStock)
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {editingItem ? 'Update Watchlist' : 'Add to Watchlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
