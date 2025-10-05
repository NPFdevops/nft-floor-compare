import React from 'react';

const CurrencySwitch = ({ currency, onCurrencyChange }) => {
  const handleToggle = () => {
    const newCurrency = currency === 'ETH' ? 'USD' : 'ETH';
    onCurrencyChange(newCurrency);
    
    // Add haptic feedback on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 h-10 px-4 rounded-none border-2 border-black bg-white hover:bg-gray-100 transition-all duration-200 hover:scale-105"
      title={`Switch to ${currency === 'ETH' ? 'USD' : 'ETH'} pricing`}
    >
      <span className="material-symbols-outlined text-lg">
        currency_exchange
      </span>
      <div className="flex items-center gap-1 text-sm font-bold">
        <span className={currency === 'ETH' ? 'text-black' : 'text-gray-400'}>
          ETH
        </span>
        <span className="text-gray-600">/</span>
        <span className={currency === 'USD' ? 'text-black' : 'text-gray-400'}>
          USD
        </span>
      </div>
    </button>
  );
};

export default CurrencySwitch;