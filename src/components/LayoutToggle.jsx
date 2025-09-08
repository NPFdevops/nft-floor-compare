import React from 'react';

const LayoutToggle = ({ layout, onLayoutChange }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <p className="text-sm font-bold text-black whitespace-nowrap">Layout:</p>
      <div className="flex h-10 items-center rounded-none border-2 border-black p-0.5">
        <label className="flex cursor-pointer h-full w-20 sm:w-24 items-center justify-center overflow-hidden px-1 sm:px-2 has-[:checked]:bg-[var(--accent-color)] has-[:checked]:text-black text-black text-xs sm:text-sm font-bold leading-normal transition-colors">
          <span className="truncate">Side by side</span>
          <input 
            className="invisible w-0" 
            name="layout" 
            type="radio" 
            value="horizontal"
            checked={layout === 'horizontal'}
            onChange={() => onLayoutChange('horizontal')}
          />
        </label>
        <label className="flex cursor-pointer h-full w-20 sm:w-24 items-center justify-center overflow-hidden px-1 sm:px-2 has-[:checked]:bg-[var(--accent-color)] has-[:checked]:text-black text-black text-xs sm:text-sm font-bold leading-normal transition-colors">
          <span className="truncate">Stacked</span>
          <input 
            className="invisible w-0" 
            name="layout" 
            type="radio" 
            value="vertical"
            checked={layout === 'vertical'}
            onChange={() => onLayoutChange('vertical')}
          />
        </label>
      </div>
    </div>
  );
};

export default LayoutToggle;
