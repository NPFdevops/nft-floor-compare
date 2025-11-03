import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { safeCapture, getDeviceType } from '../utils/analytics';

const LogScaleSwitch = ({ isLogScale, onLogScaleChange }) => {
  const posthog = usePostHog();

  const handleToggle = () => {
    const newLogScale = !isLogScale;
    onLogScaleChange(newLogScale);

    // Track log scale change
    safeCapture(posthog, 'log_scale_toggled', {
      from: isLogScale ? 'logarithmic' : 'linear',
      to: newLogScale ? 'logarithmic' : 'linear',
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
      title={`Switch to ${isLogScale ? 'linear' : 'logarithmic'} scale - Log scale is better for comparing percentage changes across different price ranges`}
    >
      <span className="material-symbols-outlined text-lg" style={{ color: 'var(--text-primary)' }}>
        query_stats
      </span>
      <div className="flex items-center gap-1 text-sm font-bold">
        <span style={{ color: !isLogScale ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          Linear
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <span style={{ color: isLogScale ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          Log
        </span>
      </div>
    </button>
  );
};

export default LogScaleSwitch;
