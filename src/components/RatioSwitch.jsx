import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { safeCapture, getDeviceType } from '../utils/analytics';

const RatioSwitch = ({ isRatioMode, onRatioModeChange, disabled = false }) => {
  const posthog = usePostHog();
  
  const handleToggle = () => {
    if (disabled) return;
    
    const newRatioMode = !isRatioMode;
    onRatioModeChange(newRatioMode);
    
    // Track ratio mode change
    safeCapture(posthog, 'ratio_toggled', {
      from: isRatioMode ? 'ratio' : 'floor',
      to: newRatioMode ? 'ratio' : 'floor',
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
      disabled={disabled}
      className={`flex items-center gap-2 h-10 px-4 rounded-none border-2 transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
      }`}
      style={{ 
        borderColor: 'var(--accent-color)', 
        backgroundColor: disabled ? 'var(--surface-disabled)' : 'var(--surface)' 
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.backgroundColor = 'var(--surface)')}
      title={disabled ? 'Select both collections to enable ratio view' : `Switch to ${isRatioMode ? 'floor price' : 'ratio'} view`}
    >
      <span className="material-symbols-outlined text-lg" style={{ color: disabled ? 'var(--text-muted)' : 'var(--text-primary)' }}>
        compare
      </span>
      <div className="flex items-center gap-1 text-sm font-bold">
        <span style={{ color: disabled ? 'var(--text-muted)' : (!isRatioMode ? 'var(--text-primary)' : 'var(--text-muted)') }}>
          Floor
        </span>
        <span style={{ color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}>/</span>
        <span style={{ color: disabled ? 'var(--text-muted)' : (isRatioMode ? 'var(--text-primary)' : 'var(--text-muted)') }}>
          Ratio
        </span>
      </div>
    </button>
  );
};

export default RatioSwitch;
