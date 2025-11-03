import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { safeCapture, getDeviceType } from '../utils/analytics';

const TimeRangeSwitch = ({ timeRange, onTimeRangeChange }) => {
  const posthog = usePostHog();

  const ranges = [
    { label: '30D', value: '30D' },
    { label: '90D', value: '90D' },
    { label: 'YTD', value: 'YTD' },
    { label: 'All', value: 'All' }
  ];

  const handleRangeClick = (range) => {
    if (range.value === timeRange) return; // Don't do anything if already selected

    onTimeRangeChange(range.value);

    // Track time range change
    safeCapture(posthog, 'time_range_toggled', {
      from: timeRange,
      to: range.value,
      device_type: getDeviceType()
    });

    // Add haptic feedback on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  return (
    <div className="flex items-center gap-2 h-10 px-4 rounded-none border-2"
      style={{ borderColor: 'var(--accent-color)', backgroundColor: 'var(--surface)' }}
    >
      <span className="material-symbols-outlined text-lg" style={{ color: 'var(--text-primary)' }}>
        calendar_month
      </span>
      <div className="flex items-center gap-1 text-sm font-bold">
        {ranges.map((range, index) => (
          <React.Fragment key={range.value}>
            {index > 0 && (
              <span style={{ color: 'var(--text-secondary)' }}>/</span>
            )}
            <button
              onClick={() => handleRangeClick(range)}
              className="transition-all duration-200 hover:scale-105"
              style={{
                color: timeRange === range.value ? 'var(--text-primary)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer'
              }}
              title={`Show ${range.label} data`}
            >
              {range.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TimeRangeSwitch;
