import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { safeCapture, getDeviceType } from '../utils/analytics';

const CurrencySwitch = ({ currency, onCurrencyChange }) => {
  const posthog = usePostHog();
  
  const handleToggle = () => {
    const newCurrency = currency === 'ETH' ? 'USD' : 'ETH';
    onCurrencyChange(newCurrency);
    
    // Track currency change
    safeCapture(posthog, 'currency_toggled', {
      from: currency,
      to: newCurrency,
      device_type: getDeviceType()
    });
    
    // Add haptic feedback on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 h-10 px-4 rounded-none border-2 transition-all duration-200 hover:scale-105"
      style={{ borderColor: 'var(--accent-color)', backgroundColor: 'var(--surface)' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
      title={`Switch to ${currency === 'ETH' ? 'USD' : 'ETH'} pricing`}
    >
      <span className="material-symbols-outlined text-lg" style={{ color: 'var(--text-primary)' }}>
        currency_exchange
      </span>
      <div className="flex items-center gap-1 text-sm font-bold">
        <span style={{ color: currency === 'ETH' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          ETH
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <span style={{ color: currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          USD
        </span>
      </div>
    </button>
  );
};

export default CurrencySwitch;