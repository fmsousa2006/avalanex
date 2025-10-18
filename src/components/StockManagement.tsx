import React, { useState, useEffect } from 'react';
import { Search, Plus, CreditCard as Edit2, Trash2, TrendingUp, Calendar, DollarSign, ArrowLeft, Save, X, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  is_active: boolean;
  index_membership?: string[];
  price_change_percent_24h?: number;
}

interface Dividend {
  id: string;
  stock_id: string;
  amount: number;
  ex_dividend_date: string;
  payment_date: string;
  frequency: string;
  stock?: Stock;
}

interface StockManagementProps {
  onBack: () => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'stocks' | 'dividends'>('stocks');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isAddingDividend, setIsAddingDividend] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);

  const [stockForm, setStockForm] = useState({
    symbol: '',
    name: '',
    sector: '',
    current_price: '',
    is_active: true
  });

  const [dividendForm, setDividendForm] = useState({
    stock_id: '',
    amount: '',
    ex_dividend_date: '',
    payment_date: '',
    frequency: 'Quarterly'
  });

  useEffect(() => {
    fetchStocks();
    fetchDividends();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .order('symbol', { ascending: true });

      if (error) throw error;
      setStocks(data || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDividends = async () => {
    try {
      const { data, error } = await supabase
        .from('dividends')
        .select(`
          *,
          stocks (
            id,
            symbol,
            name
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      console.log('Fetched dividends:', data);
      setDividends(data || []);
    } catch (error) {
      console.error('Error fetching dividends:', error);
    }
  };

  const handleAddStock = async () => {
    try {
      const { error } = await supabase
        .from('stocks')
        .insert([{
          symbol: stockForm.symbol.toUpperCase(),
          name: stockForm.name,
          sector: stockForm.sector,
          current_price: parseFloat(stockForm.current_price),
          is_active: stockForm.is_active
        }]);

      if (error) throw error;

      setIsAddingStock(false);
      setStockForm({
        symbol: '',
        name: '',
        sector: '',
        current_price: '',
        is_active: true
      });
      fetchStocks();
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock');
    }
  };

  const handleUpdateStock = async () => {
    if (!editingStock) return;

    try {
      const { error } = await supabase
        .from('stocks')
        .update({
          symbol: stockForm.symbol.toUpperCase(),
          name: stockForm.name,
          sector: stockForm.sector,
          current_price: parseFloat(stockForm.current_price),
          is_active: stockForm.is_active
        })
        .eq('id', editingStock.id);

      if (error) throw error;

      setEditingStock(null);
      setStockForm({
        symbol: '',
        name: '',
        sector: '',
        current_price: '',
        is_active: true
      });
      fetchStocks();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    }
  };

  const handleDeleteStock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock? This will affect all related data.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchStocks();
    } catch (error) {
      console.error('Error deleting stock:', error);
      alert('Failed to delete stock');
    }
  };

  const handleAddDividend = async () => {
    try {
      const { error } = await supabase
        .from('dividends')
        .insert([{
          stock_id: dividendForm.stock_id,
          amount: parseFloat(dividendForm.amount),
          ex_dividend_date: dividendForm.ex_dividend_date,
          payment_date: dividendForm.payment_date,
          frequency: dividendForm.frequency
        }]);

      if (error) throw error;

      setIsAddingDividend(false);
      setDividendForm({
        stock_id: '',
        amount: '',
        ex_dividend_date: '',
        payment_date: '',
        frequency: 'Quarterly'
      });
      fetchDividends();
    } catch (error) {
      console.error('Error adding dividend:', error);
      alert('Failed to add dividend');
    }
  };

  const handleUpdateDividend = async () => {
    if (!editingDividend) return;

    try {
      const { error } = await supabase
        .from('dividends')
        .update({
          amount: parseFloat(dividendForm.amount),
          ex_dividend_date: dividendForm.ex_dividend_date,
          payment_date: dividendForm.payment_date,
          frequency: dividendForm.frequency
        })
        .eq('id', editingDividend.id);

      if (error) throw error;

      setEditingDividend(null);
      setDividendForm({
        stock_id: '',
        amount: '',
        ex_dividend_date: '',
        payment_date: '',
        frequency: 'Quarterly'
      });
      fetchDividends();
    } catch (error) {
      console.error('Error updating dividend:', error);
      alert('Failed to update dividend');
    }
  };

  const handleDeleteDividend = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dividend?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dividends')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDividends();
    } catch (error) {
      console.error('Error deleting dividend:', error);
      alert('Failed to delete dividend');
    }
  };

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stock.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === null || stock.is_active === filterActive;
    return matchesSearch && matchesFilter;
  });

  const getDividendStatus = (paymentDate: string): 'upcoming' | 'paid' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payment = new Date(paymentDate);
    payment.setHours(0, 0, 0, 0);

    return today >= payment ? 'paid' : 'upcoming';
  };

  const filteredDividends = dividends.filter(div => {
    if (!searchTerm) return true;
    const stock = div.stocks as unknown as Stock;
    return stock?.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           stock?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Admin</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Stock Management</h1>
              <p className="text-gray-400 text-lg">Manage stocks and dividend schedules</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  fetchStocks();
                  fetchDividends();
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="border-b border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('stocks')}
                className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'stocks'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-750'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span>Stocks ({stocks.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('dividends')}
                className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'dividends'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-750'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Dividends ({dividends.length})</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {activeTab === 'stocks' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFilterActive(null)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filterActive === null
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterActive(true)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filterActive === true
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setFilterActive(false)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filterActive === false
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  if (activeTab === 'stocks') {
                    setIsAddingStock(true);
                    setEditingStock(null);
                    setStockForm({
                      symbol: '',
                      name: '',
                      sector: '',
                      current_price: '',
                      is_active: true
                    });
                  } else {
                    setIsAddingDividend(true);
                    setEditingDividend(null);
                    setDividendForm({
                      stock_id: '',
                      amount: '',
                      ex_dividend_date: '',
                      payment_date: '',
                      frequency: 'Quarterly'
                    });
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add {activeTab === 'stocks' ? 'Stock' : 'Dividend'}</span>
              </button>
            </div>

            {(isAddingStock || editingStock) && (
              <div className="bg-gray-750 border border-gray-600 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingStock ? 'Edit Stock' : 'Add New Stock'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Symbol</label>
                    <input
                      type="text"
                      value={stockForm.symbol}
                      onChange={(e) => setStockForm({ ...stockForm, symbol: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="AAPL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                    <input
                      type="text"
                      value={stockForm.name}
                      onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Apple Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Sector</label>
                    <input
                      type="text"
                      value={stockForm.sector}
                      onChange={(e) => setStockForm({ ...stockForm, sector: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Technology"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Current Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={stockForm.current_price}
                      onChange={(e) => setStockForm({ ...stockForm, current_price: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="150.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={stockForm.is_active}
                        onChange={(e) => setStockForm({ ...stockForm, is_active: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-gray-400">Active</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setIsAddingStock(false);
                      setEditingStock(null);
                      setStockForm({
                        symbol: '',
                        name: '',
                        sector: '',
                        current_price: '',
                        is_active: true
                      });
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={editingStock ? handleUpdateStock : handleAddStock}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingStock ? 'Update' : 'Save'}</span>
                  </button>
                </div>
              </div>
            )}

            {(isAddingDividend || editingDividend) && (
              <div className="bg-gray-750 border border-gray-600 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingDividend ? 'Edit Dividend' : 'Add New Dividend'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Stock</label>
                    <select
                      value={dividendForm.stock_id}
                      onChange={(e) => setDividendForm({ ...dividendForm, stock_id: e.target.value })}
                      disabled={!!editingDividend}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select a stock</option>
                      {stocks.map(stock => (
                        <option key={stock.id} value={stock.id}>
                          {stock.symbol} - {stock.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={dividendForm.amount}
                      onChange={(e) => setDividendForm({ ...dividendForm, amount: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="0.50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Frequency</label>
                    <select
                      value={dividendForm.frequency}
                      onChange={(e) => setDividendForm({ ...dividendForm, frequency: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Semi-Annual">Semi-Annual</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ex-Dividend Date</label>
                    <input
                      type="date"
                      value={dividendForm.ex_dividend_date}
                      onChange={(e) => setDividendForm({ ...dividendForm, ex_dividend_date: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={dividendForm.payment_date}
                      onChange={(e) => setDividendForm({ ...dividendForm, payment_date: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setIsAddingDividend(false);
                      setEditingDividend(null);
                      setDividendForm({
                        stock_id: '',
                        amount: '',
                        ex_dividend_date: '',
                        payment_date: '',
                        frequency: 'Quarterly'
                      });
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={editingDividend ? handleUpdateDividend : handleAddDividend}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingDividend ? 'Update' : 'Save'}</span>
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : activeTab === 'stocks' ? (
              <div className="space-y-3">
                {filteredStocks.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No stocks found</p>
                  </div>
                ) : (
                  filteredStocks.map(stock => (
                    <div
                      key={stock.id}
                      className="bg-gray-750 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold">{stock.symbol}</h3>
                            <span className={`px-2 py-1 rounded text-xs ${
                              stock.is_active
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {stock.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {stock.index_membership && stock.index_membership.length > 0 && (
                              <div className="flex items-center space-x-1">
                                {stock.index_membership.map(index => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 font-medium"
                                  >
                                    {index}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-gray-400 mb-1">{stock.name}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-500">Sector: {stock.sector || 'N/A'}</span>
                            <span className="text-emerald-400 font-medium">
                              ${stock.current_price?.toFixed(2) || '0.00'}
                            </span>
                            {stock.price_change_percent_24h !== undefined && stock.price_change_percent_24h !== null && (
                              <span className={`font-medium ${
                                stock.price_change_percent_24h >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {stock.price_change_percent_24h >= 0 ? '+' : ''}{stock.price_change_percent_24h.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingStock(stock);
                              setStockForm({
                                symbol: stock.symbol,
                                name: stock.name,
                                sector: stock.sector || '',
                                current_price: stock.current_price?.toString() || '',
                                is_active: stock.is_active
                              });
                              setIsAddingStock(false);
                            }}
                            className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStock(stock.id)}
                            className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDividends.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No dividends found</p>
                  </div>
                ) : (
                  filteredDividends.map(dividend => {
                    const stock = (dividend.stocks || dividend.stock) as unknown as Stock;
                    const status = getDividendStatus(dividend.payment_date);
                    return (
                      <div
                        key={dividend.id}
                        className="bg-gray-750 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-bold">{stock?.symbol}</h3>
                              <span className={`px-2 py-1 rounded text-xs ${
                                status === 'paid'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {status}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{stock?.name}</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Amount: </span>
                                <span className="text-emerald-400 font-medium">${dividend.amount?.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Frequency: </span>
                                <span className="text-white">{dividend.frequency}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Ex-Div: </span>
                                <span className="text-white">{dividend.ex_dividend_date}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Payment: </span>
                                <span className="text-white">{dividend.payment_date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingDividend(dividend);
                                setDividendForm({
                                  stock_id: dividend.stock_id,
                                  amount: dividend.amount?.toString() || '',
                                  ex_dividend_date: dividend.ex_dividend_date,
                                  payment_date: dividend.payment_date,
                                  frequency: dividend.frequency
                                });
                                setIsAddingDividend(false);
                              }}
                              className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDividend(dividend.id)}
                              className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockManagement;
