import React from 'react';

const LayoutToggle = ({ layout, onLayoutChange }) => {
  const handleLayoutChange = (newLayout) => {
    // Add haptic feedback on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(1);
    }
    onLayoutChange(newLayout);
  };

  return (
    <div className="layout-toggle-container">
      {/* Mobile-first design */}
      <div className="block sm:hidden">
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Layout:</p>
          <div className="flex h-12 items-center rounded-none border-2 p-0.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', boxShadow: '4px 4px 0px var(--border)' }}>
            <label 
              className="flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden px-2 text-sm font-bold leading-normal transition-all duration-200"
              style={layout === 'horizontal' 
                ? { backgroundColor: 'var(--accent-color)', color: '#000', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(0.95)' }
                : { backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }
              }
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">view_column</span>
                <span className="truncate">Side by side</span>
              </div>
              <input 
                className="invisible w-0" 
                name="layout-mobile" 
                type="radio" 
                value="horizontal"
                checked={layout === 'horizontal'}
                onChange={() => handleLayoutChange('horizontal')}
              />
            </label>
            <label 
              className="flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden px-2 text-sm font-bold leading-normal transition-all duration-200"
              style={layout === 'vertical' 
                ? { backgroundColor: 'var(--accent-color)', color: '#000', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(0.95)' }
                : { backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }
              }
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">view_agenda</span>
                <span className="truncate">Stacked</span>
              </div>
              <input 
                className="invisible w-0" 
                name="layout-mobile" 
                type="radio" 
                value="vertical"
                checked={layout === 'vertical'}
                onChange={() => handleLayoutChange('vertical')}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <p className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>Layout:</p>
        <div className="flex h-10 items-center rounded-none border-2 p-0.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', boxShadow: '4px 4px 0px var(--border)' }}>
          <label 
            className="flex cursor-pointer h-full w-28 items-center justify-center overflow-hidden px-2 text-xs sm:text-sm font-bold leading-normal transition-all duration-200"
            style={layout === 'horizontal' 
              ? { backgroundColor: 'var(--accent-color)', color: '#000', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(0.95)' }
              : { backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }
            }
          >
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">view_column</span>
              <span className="truncate hidden sm:inline">Side by side</span>
            </div>
            <input 
              className="invisible w-0" 
              name="layout-desktop" 
              type="radio" 
              value="horizontal"
              checked={layout === 'horizontal'}
              onChange={() => handleLayoutChange('horizontal')}
            />
          </label>
          <label 
            className="flex cursor-pointer h-full w-28 items-center justify-center overflow-hidden px-2 text-xs sm:text-sm font-bold leading-normal transition-all duration-200"
            style={layout === 'vertical' 
              ? { backgroundColor: 'var(--accent-color)', color: '#000', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', transform: 'scale(0.95)' }
              : { backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }
            }
          >
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">view_agenda</span>
              <span className="truncate hidden sm:inline">Stacked</span>
            </div>
            <input 
              className="invisible w-0" 
              name="layout-desktop" 
              type="radio" 
              value="vertical"
              checked={layout === 'vertical'}
              onChange={() => handleLayoutChange('vertical')}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default LayoutToggle;
