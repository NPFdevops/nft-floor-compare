import React from 'react';

const TimeframeSelector = ({ timeframe, onTimeframeChange }) => {
  const timeframes = [
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '1Y', label: '1Y' },
    { value: 'YTD', label: 'YTD' }
  ];

  const handleClick = (value) => {
    console.log('TimeframeSelector: Selected', value);
    onTimeframeChange(value);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <p className="text-sm font-bold text-black whitespace-nowrap">Timeframe:</p>
      <div className="flex h-10 items-center rounded-none border-2 border-black p-0.5">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            type="button"
            onClick={() => handleClick(tf.value)}
            className={timeframe === tf.value 
              ? 'flex h-full items-center justify-center overflow-hidden px-2 sm:px-4 text-xs sm:text-sm font-bold leading-normal transition-all duration-200 bg-[var(--accent-color)] text-black shadow-inner scale-95' 
              : 'flex h-full items-center justify-center overflow-hidden px-2 sm:px-4 text-xs sm:text-sm font-bold leading-normal transition-all duration-200 bg-white text-black hover:bg-gray-100 hover:scale-105'
            }
          >
            <span className="truncate">{tf.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeframeSelector;
