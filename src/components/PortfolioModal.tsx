import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Search, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionData: {
    ticker: string;
    operation: 'buy' | 'sell';
    date: string;
    shares: string;
    price: string;
    currency: string;
    fee: string;
  }) => void;
}

interface FormData {
  ticker: string;
  operation: 'buy' | 'sell';
  date: string;
  shares: string;
  price: string;
  currency: string;
  fee: string;
}

const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<FormData>({
    ticker: '',
    operation: 'buy',
    date: new Date().toISOString().split('T')[0],
    shares: '',
    price: '',
    currency: 'USD',
    fee: '0.00'
  });

  const [showCalendar, setShowCalendar] = useState(false);
  const [showTickerSuggestions, setShowTickerSuggestions] = useState(false);
  const [tickerSuggestions, setTickerSuggestions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  const tickerInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Popular tickers for autocomplete
  const popularTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC',
    'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'PYPL', 'SQ', 'ADBE',
    'CRM', 'ORCL', 'IBM', 'CSCO', 'QCOM', 'AVGO', 'TXN', 'AMAT', 'LRCX', 'KLAC',
    'JNJ', 'PFE', 'UNH', 'ABBV', 'BMY', 'MRK', 'GILD', 'AMGN', 'BIIB', 'REGN',
    'KO', 'PEP', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD'
  ];

  const currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'
  ];

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        ticker: '',
        operation: 'buy',
        date: new Date().toISOString().split('T')[0],
        shares: '',
        price: '',
        currency: 'USD',
        fee: '0.00'
      });
      setErrors({});
      setShowCalendar(false);
      setShowTickerSuggestions(false);
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Handle ticker autocomplete
    if (field === 'ticker') {
      const filtered = popularTickers.filter(ticker => 
        ticker.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setTickerSuggestions(filtered);
      setShowTickerSuggestions(value.length > 0 && filtered.length > 0);
    }
  };

  const handleNumberInput = (field: 'shares' | 'price' | 'fee', value: string) => {
    if (field === 'shares') {
      // Only allow positive integers
      const numericValue = value.replace(/[^\d]/g, '');
      if (numericValue === '' || parseInt(numericValue) > 0) {
        handleInputChange(field, numericValue);
      }
    } else {
      // Allow decimal numbers with max 3 decimal places
      const normalizedValue = value.replace(',', '.');
      const regex = /^\d*\.?\d{0,3}$/;
      if (regex.test(normalizedValue) || normalizedValue === '') {
        handleInputChange(field, normalizedValue);
      }
    }
  };

  const selectTicker = (ticker: string) => {
    setFormData(prev => ({ ...prev, ticker }));
    setShowTickerSuggestions(false);
    setTickerSuggestions([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.ticker.trim()) {
      newErrors.ticker = 'Ticker is required';
    }

    if (!formData.shares || parseInt(formData.shares) <= 0) {
      newErrors.shares = 'Shares must be greater than 0';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (addMore: boolean = false) => {
    if (!validateForm()) return;

    // Call the onSave callback with the form data
    onSave(formData);

    if (addMore) {
      // Reset form but keep some fields
      setFormData(prev => ({
        ...prev,
        ticker: '',
        shares: '',
        price: '',
        fee: '0.00'
      }));
      setErrors({});
    } else {
      onClose();
    }
  };

  const generateCalendarDays = () => {
    const currentDate = new Date(formData.date);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dateString === formData.date;
      const isToday = dateString === new Date().toISOString().split('T')[0];
      
      days.push(
        <button
          key={day}
          onClick={() => {
            setFormData(prev => ({ ...prev, date: dateString }));
            setShowCalendar(false);
          }}
          className={`h-8 w-8 text-sm rounded hover:bg-gray-600 transition-colors ${
            isSelected ? 'bg-emerald-600 text-white' : 
            isToday ? 'bg-blue-600 text-white' : 'text-gray-300'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentDate = new Date(formData.date);
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    setFormData(prev => ({ ...prev, date: currentDate.toISOString().split('T')[0] }));
  };

  if (!isOpen) return null;

  const totalValue = formData.shares && formData.price ? 
    (parseInt(formData.shares) * parseFloat(formData.price)).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-800 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Portfolio Transaction</h2>
              <p className="text-gray-400">Buy or sell stocks in your portfolio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Ticker and Operation Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ticker */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ticker/Company *
              </label>
              <div className="relative">
                <input
                  ref={tickerInputRef}
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => handleInputChange('ticker', e.target.value.toUpperCase())}
                  onFocus={() => {
                    if (formData.ticker && tickerSuggestions.length > 0) {
                      setShowTickerSuggestions(true);
                    }
                  }}
                  placeholder="e.g., AAPL, MSFT, GOOGL"
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    errors.ticker ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              </div>
              {errors.ticker && (
                <p className="text-red-400 text-sm mt-1">{errors.ticker}</p>
              )}
              
              {/* Ticker Suggestions */}
              {showTickerSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {tickerSuggestions.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => selectTicker(ticker)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors"
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Operation */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Operation *
              </label>
              <select
                value={formData.operation}
                onChange={(e) => handleInputChange('operation', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.date}
                readOnly
                onClick={() => setShowCalendar(!showCalendar)}
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                  errors.date ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            </div>
            {errors.date && (
              <p className="text-red-400 text-sm mt-1">{errors.date}</p>
            )}

            {/* Calendar Popup */}
            {showCalendar && (
              <div className="absolute z-20 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    ←
                  </button>
                  <h3 className="font-semibold">
                    {new Date(formData.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    →
                  </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-400">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays()}
                </div>
              </div>
            )}
          </div>

          {/* Shares and Price Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shares */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Shares *
              </label>
              <input
                type="text"
                value={formData.shares}
                onChange={(e) => handleNumberInput('shares', e.target.value)}
                placeholder="100"
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                  errors.shares ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {errors.shares && (
                <p className="text-red-400 text-sm mt-1">{errors.shares}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price per Share *
              </label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => handleNumberInput('price', e.target.value)}
                placeholder="150.25"
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                  errors.price ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {errors.price && (
                <p className="text-red-400 text-sm mt-1">{errors.price}</p>
              )}
            </div>
          </div>

          {/* Currency and Fee Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                {currencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>

            {/* Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction Fee
              </label>
              <input
                type="text"
                value={formData.fee}
                onChange={(e) => handleNumberInput('fee', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Transaction Summary */}
          {formData.shares && formData.price && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                {formData.operation === 'buy' ? (
                  <TrendingDown className="w-5 h-5 text-red-400 mr-2" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-emerald-400 mr-2" />
                )}
                Transaction Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Total Value</p>
                  <p className="text-xl font-bold">{formData.currency} {totalValue}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total with Fee</p>
                  <p className="text-xl font-bold">
                    {formData.currency} {(parseFloat(totalValue) + parseFloat(formData.fee || '0')).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Save and Add More
          </button>
          <button
            onClick={() => handleSave(false)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfolioModal;