import React, { useState, useEffect } from 'react';
import { DollarSign, Edit2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EditDividendModal from './EditDividendModal';

interface Transaction {
  id: string;
  stock_id: string;
  amount: number;
  transaction_date: string;
  stock?: {
    id: string;
    symbol: string;
    name: string;
  };
}

interface DividendListProps {
  portfolioId: string;
  onUpdate: () => void;
}

const DividendList: React.FC<DividendListProps> = ({ portfolioId, onUpdate }) => {
  const [dividends, setDividends] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDividend, setSelectedDividend] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchDividends();
  }, [portfolioId]);

  const fetchDividends = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          stock_id,
          amount,
          transaction_date,
          stock:stocks (
            id,
            symbol,
            name
          )
        `)
        .eq('portfolio_id', portfolioId)
        .eq('type', 'dividend')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setDividends(data || []);
    } catch (err) {
      console.error('Error fetching dividends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    fetchDividends();
    onUpdate();
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Dividend History</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  if (dividends.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Dividend History</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {dividends.map((dividend) => {
            const stock = Array.isArray(dividend.stock) ? dividend.stock[0] : dividend.stock;

            return (
              <div
                key={dividend.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors group cursor-pointer"
                onClick={() => setSelectedDividend({ ...dividend, stock })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-500 bg-opacity-20 p-2 rounded-lg">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {stock ? `${stock.symbol}` : 'Unknown Stock'}
                      </div>
                      <div className="text-sm text-gray-400 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(dividend.transaction_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-emerald-400">
                        ${parseFloat(dividend.amount.toString()).toFixed(2)}
                      </div>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-600 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDividend({ ...dividend, stock });
                      }}
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDividend && (
        <EditDividendModal
          transaction={selectedDividend}
          onClose={() => setSelectedDividend(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

export default DividendList;
