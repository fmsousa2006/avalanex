import React from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import { toast } from 'react-toastify';

const PortfolioComposition = () => {
  // Destructure needed methods from hooks
  const { currentPortfolio, getPortfolioData, fetchDividends } = usePortfolio();
  const { updateStockPrices } = useStockPrices();

  const handleSync = async () => {
    try {
      const message = await updateStockPrices();
      toast.success(message);
      
      // Now you have access to these methods
      if (currentPortfolio?.id) {
        await Promise.all([
          getPortfolioData(),
          fetchDividends()
        ]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error syncing stock data');
    }
  };

  return (
    <div>
      {/* Your component JSX here */}
      <button onClick={handleSync}>Sync Portfolio</button>
    </div>
  );
};

export default PortfolioComposition;