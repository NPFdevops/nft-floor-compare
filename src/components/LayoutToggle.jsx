import React from 'react';

const LayoutToggle = ({ layout, onLayoutChange }) => {
  return (
    <div className="layout-toggle">
      <label className="toggle-label">Layout:</label>
      <div className="toggle-buttons">
        <button
          className={`toggle-button ${layout === 'horizontal' ? 'active' : ''}`}
          onClick={() => onLayoutChange('horizontal')}
          aria-label="Horizontal layout"
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="currentColor">
            <rect x="0" y="2" width="8" height="12" rx="1" />
            <rect x="10" y="2" width="8" height="12" rx="1" />
          </svg>
          <span>Side by Side</span>
        </button>
        
        <button
          className={`toggle-button ${layout === 'vertical' ? 'active' : ''}`}
          onClick={() => onLayoutChange('vertical')}
          aria-label="Vertical layout"
        >
          <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
            <rect x="2" y="0" width="12" height="8" rx="1" />
            <rect x="2" y="10" width="12" height="8" rx="1" />
          </svg>
          <span>Stacked</span>
        </button>
      </div>
    </div>
  );
};

export default LayoutToggle;
