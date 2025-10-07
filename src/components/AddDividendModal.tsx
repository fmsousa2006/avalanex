import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stock {
  id: string;
  symbol: string;
  name: string;
}

interface AddDividendModalProps {
  portfolioId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddDividendModal: React.FC<AddDividendModalProps> = ({ portfolioId, onClose, onSuccess }) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioStocks();
  }, [portfolioId]);

  const fetchPortfolioStocks = async () => {
    try {
      const { data: holdings, error } = await supabase
        .from('portfolio_holdings')
        .select('stock:stocks(id, symbol, name)')
        .eq('portfolio_id', portfolioId)
        .gt('shares', 0);

      if (error) throw error;

      const uniqueStocks = holdings
        ?.map(h => h.stock)
        .filter((stock): stock is Stock => stock !== null) || [];

      setStocks(uniqueStocks);
      if (uniqueStocks.length > 0) {
        setSelectedStockId(uniqueStocks[0].id);
      }
    } catch (err) {
      console.error('Error fetching stocks:', err);
      setError('Failed to load stocks');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStockId || !amount || parseFloat(amount) <= 0) {
      setError('Please fill in all fields with valid values');
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          portfolio_id: portfolioId,
          stock_id: selectedStockId,
          type: 'dividend',
          amount: parseFloat(amount),
          transaction_date: date,
          status: 'completed',
          shares: null,
          price: null
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding dividend:', err);
      setError(err instanceof Error ? err.message : 'Failed to add dividend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Add Dividend Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Stock
            </label>
            <select
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {stocks.length === 0 ? (
                <option value="">No stocks in portfolio</option>
              ) : (
                stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.symbol} - {stock.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dividend Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || stocks.length === 0}
            >
              {loading ? 'Adding...' : 'Add Dividend'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDividendModal;
