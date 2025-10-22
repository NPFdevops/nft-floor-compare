import React from 'react';
import './TradingViewChart.css';

const TimeframeSelector = ({ timeframe, onTimeframeChange }) => {
  const timeframes = [
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1Y', label: '1Y' },
    { value: 'YTD', label: 'YTD' }
  ];

  const handleClick = (value) => {
    // Add haptic feedback on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(1);
    }
    console.log('TimeframeSelector: Selected', value);
    onTimeframeChange(value);
  };

  return (
    <div className="mobile-timeframe-selector">
      {/* Mobile-first design - matching brutalist UI style */}
      <div className="block sm:hidden">
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Timeframe:</p>
          <div className="flex h-12 items-center rounded-none border-2 p-0.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', boxShadow: '4px 4px 0px var(--border)' }}>
            <div className="grid grid-cols-4 gap-0 w-full h-full">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => handleClick(tf.value)}
                  className="flex h-full items-center justify-center overflow-hidden px-2 text-sm font-bold leading-normal transition-all duration-200"
                  style={timeframe === tf.value 
                    ? { backgroundColor: 'var(--accent-color)', color: '#000', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(0.95)' }
                    : { backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }
                  }
                >
                  <span className="truncate">{tf.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <p className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>Timeframe:</p>
        <div className="flex h-10 items-center rounded-none border-2 p-0.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', boxShadow: '4px 4px 0px var(--border)' }}>
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => handleClick(tf.value)}
              className="flex h-full items-center justify-center overflow-hidden px-2 sm:px-4 text-xs sm:text-sm font-bold leading-normal transition-all duration-200"
              style={timeframe === tf.value 
                ? { backgroundColor: 'var(--accent-color)', color: '#000', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(0.95)' }
                : { backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }
              }
            >
              <span className="truncate">{tf.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeframeSelector;
