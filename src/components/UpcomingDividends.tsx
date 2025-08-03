import React from 'react';
import { usePortfolio } from '../hooks/usePortfolio';

const UpcomingDividends = () => {
  const { dividends, loading, error } = usePortfolio();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <section>
      <h2>Upcoming Dividends</h2>
      {dividends.length === 0 ? (
        <div>No upcoming dividends for your holdings.</div>
      ) : (
        <ul>
          {dividends.map(div => (
            <li key={div.id}>
              {div.stock?.symbol} - {div.amount} on {div.payment_date}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default UpcomingDividends;