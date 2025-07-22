import React from 'react';
import { X, TestTube, Zap, Cpu } from 'lucide-react';

interface TestingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestO1D: () => void;
  onTestNVDA1D: () => void;
  isLoading: boolean;
  isFinnhubConfigured: boolean;
}

const TestingModal: React.FC<TestingModalProps> = ({ 
  isOpen, 
  onClose, 
  onTestO1D, 
  onTestNVDA1D, 
  isLoading, 
  isFinnhubConfigured 
}) => {
  // Handle escape key
  React.useEffect(() => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-800 rounded-lg">
              <TestTube className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Testing Panel</h2>
              <p className="text-gray-400">Test stock data synchronization functions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Configuration Status */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isFinnhubConfigured ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm">
              Finnhub API: {isFinnhubConfigured ? 'Configured' : 'Not Configured'}
            </span>
          </div>
          {!isFinnhubConfigured && (
            <p className="text-sm text-yellow-400 mt-2">
              ⚠️ Add VITE_FINNHUB_API_KEY to your .env file to enable real data fetching
            </p>
          )}
        </div>

        {/* Test Buttons */}
        <div className="p-6 space-y-6">
          {/* Test O 1D */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Zap className="w-6 h-6 text-purple-400" />
                <div>
                  <h3 className="text-lg font-semibold">Test O Stock (Realty Income)</h3>
                  <p className="text-sm text-gray-400">Sync 1-day historical data for O stock</p>
                </div>
              </div>
              <button
                onClick={onTestO1D}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isLoading 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isLoading ? 'Testing...' : 'Test O 1D'}
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>• Creates/updates O stock in database</p>
              <p>• Fetches 1-day historical data (9:30 AM - 4:00 PM ET)</p>
              <p>• Stores data in stock_prices_1d table</p>
              <p>• Uses mock data if Finnhub API unavailable</p>
            </div>
          </div>

          {/* Test NVIDIA 1D */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Cpu className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold">Test NVIDIA Stock</h3>
                  <p className="text-sm text-gray-400">Sync 1-day historical data for NVDA stock</p>
                </div>
              </div>
              <button
                onClick={onTestNVDA1D}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isLoading 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isLoading ? 'Testing...' : 'Test NVIDIA 1D'}
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>• Creates/updates NVDA stock in database</p>
              <p>• Fetches 1-day historical data (9:30 AM - 4:00 PM ET)</p>
              <p>• Stores data in stock_prices_1d table</p>
              <p>• Higher volatility and volume than O stock</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            <p className="mb-2"><strong>Note:</strong> These functions are for testing and development purposes.</p>
            <p>Check the browser console for detailed logs and results after running tests.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestingModal;