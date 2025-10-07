import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Calendar as CalendarIcon, DollarSign, TrendingUp, Clock, Filter, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stock {
  id: string;
  symbol: string;
  name: string;
}

interface Dividend {
  id: string;
  stock_id: string;
  amount: number;
  ex_dividend_date: string;
  payment_date: string;
  frequency: string;
  stocks?: Stock;
}

interface DividendCalendarAdminProps {
  onBack: () => void;
}

const DividendCalendarAdmin: React.FC<DividendCalendarAdminProps> = ({ onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDividend, setSelectedDividend] = useState<Dividend | null>(null);
  const [isAddingDividend, setIsAddingDividend] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [dividendForm, setDividendForm] = useState({
    stock_id: '',
    amount: '',
    ex_dividend_date: '',
    payment_date: '',
    frequency: 'Quarterly'
  });

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchDividends(), fetchStocks()]);
    setLoading(false);
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
        .order('payment_date', { ascending: true });

      if (error) throw error;
      setDividends(data || []);
    } catch (error) {
      console.error('Error fetching dividends:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('id, symbol, name')
        .eq('is_active', true)
        .order('symbol');

      if (error) throw error;
      setStocks(data || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
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
    if (!selectedDividend) return;

    try {
      const { error } = await supabase
        .from('dividends')
        .update({
          amount: parseFloat(dividendForm.amount),
          ex_dividend_date: dividendForm.ex_dividend_date,
          payment_date: dividendForm.payment_date,
          frequency: dividendForm.frequency
        })
        .eq('id', selectedDividend.id);

      if (error) throw error;

      setSelectedDividend(null);
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
    if (!confirm('Are you sure you want to delete this dividend?')) return;

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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getDividendsForDay = (day: number) => {
    const { year, month } = getDaysInMonth(currentDate);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return dividends.filter(div =>
      div.payment_date === dateStr || div.ex_dividend_date === dateStr
    );
  };

  const getDividendStatus = (paymentDate: string): 'upcoming' | 'paid' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payment = new Date(paymentDate);
    payment.setHours(0, 0, 0, 0);
    return today >= payment ? 'paid' : 'upcoming';
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getMonthStats = () => {
    const { year, month } = getDaysInMonth(currentDate);
    const monthDividends = dividends.filter(div => {
      const paymentDate = new Date(div.payment_date);
      return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
    });

    const totalAmount = monthDividends.reduce((sum, div) => sum + parseFloat(String(div.amount)), 0);
    const upcomingCount = monthDividends.filter(div => getDividendStatus(div.payment_date) === 'upcoming').length;

    return { totalAmount, upcomingCount, totalCount: monthDividends.length };
  };

  const filteredDividends = dividends.filter(div => {
    const stock = (div.stocks || div.stock) as unknown as Stock;
    const matchesSearch = !searchTerm ||
      stock?.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFrequency = filterFrequency === 'all' || div.frequency === filterFrequency;
    return matchesSearch && matchesFrequency;
  });

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthStats = getMonthStats();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
              <h1 className="text-4xl font-bold mb-2">Dividend Calendar Admin</h1>
              <p className="text-gray-400 text-lg">Manage dividend schedules and payment dates</p>
            </div>
            <button
              onClick={() => {
                setIsAddingDividend(true);
                setSelectedDividend(null);
                setDividendForm({
                  stock_id: '',
                  amount: '',
                  ex_dividend_date: '',
                  payment_date: '',
                  frequency: 'Quarterly'
                });
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dividend</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Monthly Total</p>
                <p className="text-2xl font-bold text-emerald-400">${monthStats.totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Upcoming Payments</p>
                <p className="text-2xl font-bold text-blue-400">{monthStats.upcomingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Dividends</p>
                <p className="text-2xl font-bold text-purple-400">{monthStats.totalCount}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 inline mr-2" />
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  List View
                </button>
              </div>

              {viewMode === 'calendar' && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold min-w-[200px] text-center">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-sm"
                  >
                    Today
                  </button>
                </div>
              )}
            </div>

            {viewMode === 'list' && (
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by stock symbol or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterFrequency}
                    onChange={(e) => setFilterFrequency(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Frequencies</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semi-Annual">Semi-Annual</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-600 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="p-6">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayDividends = getDividendsForDay(day);
                  const isToday = new Date().getDate() === day &&
                                 new Date().getMonth() === currentDate.getMonth() &&
                                 new Date().getFullYear() === currentDate.getFullYear();

                  return (
                    <div
                      key={day}
                      className={`aspect-square border rounded-lg p-2 transition-all hover:border-emerald-500 ${
                        isToday
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-700 bg-gray-750'
                      }`}
                    >
                      <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-emerald-400' : 'text-gray-300'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayDividends.slice(0, 2).map(div => {
                          const stock = (div.stocks || div.stock) as unknown as Stock;
                          const isPaymentDate = div.payment_date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          return (
                            <div
                              key={div.id}
                              className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer transition-colors ${
                                isPaymentDate
                                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              }`}
                              title={`${stock?.symbol} - $${div.amount} (${isPaymentDate ? 'Payment' : 'Ex-Div'})`}
                              onClick={() => {
                                setSelectedDividend(div);
                                setDividendForm({
                                  stock_id: div.stock_id,
                                  amount: div.amount.toString(),
                                  ex_dividend_date: div.ex_dividend_date,
                                  payment_date: div.payment_date,
                                  frequency: div.frequency
                                });
                              }}
                            >
                              {stock?.symbol}
                            </div>
                          );
                        })}
                        {dayDividends.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayDividends.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-3">
                {filteredDividends.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
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
                              <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                                {dividend.frequency}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{stock?.name}</p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Amount: </span>
                                <span className="text-emerald-400 font-medium">${dividend.amount?.toFixed(2)}</span>
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
                                setSelectedDividend(dividend);
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
            </div>
          )}
        </div>
      </div>

      {(isAddingDividend || selectedDividend) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {selectedDividend ? 'Edit Dividend' : 'Add New Dividend'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Stock</label>
                <select
                  value={dividendForm.stock_id}
                  onChange={(e) => setDividendForm({ ...dividendForm, stock_id: e.target.value })}
                  disabled={!!selectedDividend}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
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
                <label className="block text-sm font-medium text-gray-400 mb-2">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={dividendForm.amount}
                  onChange={(e) => setDividendForm({ ...dividendForm, amount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
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
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsAddingDividend(false);
                  setSelectedDividend(null);
                  setDividendForm({
                    stock_id: '',
                    amount: '',
                    ex_dividend_date: '',
                    payment_date: '',
                    frequency: 'Quarterly'
                  });
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={selectedDividend ? handleUpdateDividend : handleAddDividend}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                {selectedDividend ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DividendCalendarAdmin;
