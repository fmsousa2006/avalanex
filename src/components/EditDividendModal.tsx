import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../utils/activityLogger';

interface Transaction {
  id: string;
  stock_id: string;
  amount: number;
  transaction_date: string;
}

interface Stock {
  id: string;
  symbol: string;
  name: string;
}

interface EditDividendModalProps {
  transaction: Transaction & { stock?: Stock };
  onClose: () => void;
  onSuccess: () => void;
}

const EditDividendModal: React.FC<EditDividendModalProps> = ({ transaction, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [date, setDate] = useState(transaction.transaction_date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(amount),
          transaction_date: date
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      await logActivity('dividend_recorded', {
        action: 'dividend_updated',
        transaction_id: transaction.id,
        stock_id: transaction.stock_id,
        stock_symbol: transaction.stock?.symbol,
        previous_amount: transaction.amount,
        new_amount: parseFloat(amount),
        previous_date: transaction.transaction_date,
        new_date: date
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating dividend:', err);
      setError(err instanceof Error ? err.message : 'Failed to update dividend');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this dividend payment?')) {
      return;
    }

    setLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (deleteError) throw deleteError;

      await logActivity('dividend_recorded', {
        action: 'dividend_deleted',
        transaction_id: transaction.id,
        stock_id: transaction.stock_id,
        stock_symbol: transaction.stock?.symbol,
        amount: transaction.amount,
        date: transaction.transaction_date
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting dividend:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete dividend');
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
            <h2 className="text-xl font-semibold">Edit Dividend Payment</h2>
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
            <div className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-400">
              {transaction.stock ? `${transaction.stock.symbol} - ${transaction.stock.name}` : 'Unknown Stock'}
            </div>
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
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Delete
            </button>
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
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDividendModal;
