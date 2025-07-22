import React, { useState } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight, Move } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DividendCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId?: string;
}

interface CalendarDividend {
  date: string;
  symbol: string;
  name: string;
  amount: number;
  type: 'payment' | 'ex-dividend';
}

const DividendCalendar: React.FC<DividendCalendarProps> = ({ isOpen, onClose, portfolioId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [calendarDividends, setCalendarDividends] = useState<CalendarDividend[]>([]);
  const [loading, setLoading] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Helper function to check if Supabase environment is properly configured
  const isSupabaseEnvConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    return url && 
           key && 
           url !== 'https://your-project-ref.supabase.co' &&
           url !== 'https://placeholder.supabase.co' &&
           key !== 'your-anon-key-here' &&
           key !== 'placeholder-anon-key';
  };

  // Fetch real dividend data from Supabase
  const fetchDividendData = async (month: number, year: number) => {
    const supabaseConfigured = isSupabaseEnvConfigured();
    
    if (!supabaseConfigured || !portfolioId) {
      setCalendarDividends([]);
      return;
    }

    try {
      setLoading(true);

      // Get the date range for the current month
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Get all stocks in the current portfolio
      const { data: portfolioStocks, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select(`
          shares,
          stock:stocks(id, symbol, name)
        `)
        .eq('portfolio_id', portfolioId)
        .gt('shares', 0);

      if (holdingsError) {
        console.error('Error fetching portfolio holdings:', holdingsError);
        setCalendarDividends([]);
        return;
      }

      if (!portfolioStocks || portfolioStocks.length === 0) {
        setCalendarDividends([]);
        return;
      }

      // Get stock IDs from portfolio
      const stockIds = portfolioStocks.map(holding => holding.stock?.id).filter(Boolean);

      if (stockIds.length === 0) {
        setCalendarDividends([]);
        return;
      }

      // Get dividends for these stocks in the current month
      const { data: dividends, error: dividendsError } = await supabase
        .from('dividends')
        .select(`
          *,
          stock:stocks(symbol, name)
        `)
        .in('stock_id', stockIds)
        .or(`payment_date.gte.${startDate},payment_date.lte.${endDate},ex_dividend_date.gte.${startDate},ex_dividend_date.lte.${endDate}`)
        .order('payment_date', { ascending: true });

      if (dividendsError) {
        console.error('Error fetching dividends:', dividendsError);
        setCalendarDividends([]);
        return;
      }

      if (!dividends || dividends.length === 0) {
        setCalendarDividends([]);
        return;
      }

      // Convert to calendar format
      const calendarData: CalendarDividend[] = [];

      dividends.forEach(dividend => {
        const paymentDate = new Date(dividend.payment_date);
        const exDividendDate = new Date(dividend.ex_dividend_date);

        // Add payment date if it's in the current month
        if (paymentDate.getMonth() === month && paymentDate.getFullYear() === year) {
          calendarData.push({
            date: dividend.payment_date,
            symbol: dividend.stock?.symbol || 'Unknown',
            name: dividend.stock?.name || 'Unknown Company',
            amount: dividend.amount,
            type: 'payment'
          });
        }

        // Add ex-dividend date if it's in the current month
        if (exDividendDate.getMonth() === month && exDividendDate.getFullYear() === year) {
          calendarData.push({
            date: dividend.ex_dividend_date,
            symbol: dividend.stock?.symbol || 'Unknown',
            name: dividend.stock?.name || 'Unknown Company',
            amount: dividend.amount,
            type: 'ex-dividend'
          });
        }
      });

      setCalendarDividends(calendarData);
    } catch (error) {
      console.error('Error fetching dividend data:', error);
      setCalendarDividends([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current) return;
    
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 0);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Reset position when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  // Fetch dividend data when modal opens or month changes
  React.useEffect(() => {
    if (isOpen) {
      fetchDividendData(currentDate.getMonth(), currentDate.getFullYear());
    }
  }, [isOpen, currentDate, portfolioId]);

  if (!isOpen) return null;

  const getDividendsForDate = (date: string): CalendarDividend[] => {
    return calendarDividends.filter(dividend => dividend.date === date);
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayDividends = getDividendsForDate(dateString);
      const isToday = new Date().toDateString() === new Date(dateString).toDateString();

      days.push(
        <div
          key={day}
          className={`h-20 border border-gray-700 p-1 relative cursor-pointer hover:bg-gray-800 transition-colors ${
            isToday ? 'bg-blue-900/20 border-blue-500' : ''
          }`}
          onMouseEnter={() => setHoveredDate(dateString)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-400' : 'text-gray-300'}`}>
            {day}
          </div>
          
          {dayDividends.length > 0 && (
            <div className="mt-1 space-y-1">
              {dayDividends.slice(0, 2).map((dividend, index) => (
                <div
                  key={index}
                  className={`text-xs px-1 py-0.5 rounded truncate text-center ${
                    dividend.type === 'payment'
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                      : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                  }`}
                >
                  {dividend.symbol}
                </div>
              ))}
              {dayDividends.length > 2 && (
                <div className="text-xs text-gray-400 text-center">
                  +{dayDividends.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const hoveredDividends = hoveredDate ? getDividendsForDate(hoveredDate) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4">
      <div 
        ref={modalRef}
        className={`bg-gray-900 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto border border-gray-700 absolute ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        style={{
          left: position.x === 0 ? '50%' : `${position.x}px`,
          top: position.y === 0 ? '50%' : `${position.y}px`,
          transform: position.x === 0 && position.y === 0 ? 'translate(-50%, -50%)' : 'none',
          maxWidth: '768px', // max-w-3xl equivalent
          width: 'calc(100% - 2rem)', // Account for padding
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Dividend Calendar</h2>
              <p className="text-gray-400">Track upcoming dividend payments and ex-dividend dates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Calendar Navigation */}
        <div 
          className={`flex items-center justify-between p-4 border-b border-gray-700 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
        >
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-bold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-600/20 border border-emerald-600/30 rounded"></div>
              <span className="text-sm text-gray-300">Dividend Payment</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-600/20 border border-yellow-600/30 rounded"></div>
              <span className="text-sm text-gray-300">Ex-Dividend Date</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mr-3"></div>
              <span className="text-gray-400">Loading dividend data...</span>
            </div>
          )}
          
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="h-6 flex items-center justify-center text-xs font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0 border border-gray-700">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Tooltip for hovered date */}
        {hoveredDate && hoveredDividends.length > 0 && (
          <div className="fixed bg-gray-700 text-white p-4 rounded-lg shadow-lg border border-gray-600 z-50 pointer-events-none max-w-xs"
               style={{ 
                 left: '50%', 
                 top: '50%', 
                 transform: 'translate(-50%, -50%)',
                 position: 'fixed'
               }}>
            <div className="text-sm font-semibold mb-2">
              {new Date(hoveredDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="space-y-2">
              {hoveredDividends.map((dividend, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{dividend.symbol}</span>
                    <span className={dividend.type === 'payment' ? 'text-emerald-400' : 'text-yellow-400'}>
                      ${dividend.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-gray-400">
                    {dividend.type === 'payment' ? 'Payment' : 'Ex-Dividend'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 border-t border-gray-700">
          <h4 className="text-base font-semibold mb-3">This Month's Summary</h4>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400 mr-2"></div>
              <span className="text-gray-400 text-sm">Calculating summary...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Total Payments</p>
                <p className="text-xl font-bold text-emerald-400">
                  ${calendarDividends
                    .filter(d => d.type === 'payment')
                    .reduce((sum, d) => sum + d.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Payment Events</p>
                <p className="text-xl font-bold">
                  {calendarDividends.filter(d => d.type === 'payment').length}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Ex-Dividend Events</p>
                <p className="text-xl font-bold">
                  {calendarDividends.filter(d => d.type === 'ex-dividend').length}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DividendCalendar;