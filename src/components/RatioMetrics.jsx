import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const RatioMetrics = ({ collection1, collection2, ratioData, timeRange = 'All' }) => {
  const { isDark } = useTheme();

  const chartColors = {
    collection1: '#e91e63',
    collection2: '#9c27b0'
  };

  // Filter ratio data by selected time range
  const filterByTimeRange = (data, range) => {
    if (!data || data.length === 0) return data;
    if (range === 'All') return data;

    const now = new Date();
    let cutoff;
    if (range === 'YTD') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    } else if (range === '30D') {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
    } else if (range === '90D') {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 90);
    } else {
      return data;
    }

    return data.filter(point => {
      const d = point.x instanceof Date ? point.x : new Date(point.x);
      return d >= cutoff;
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const formatted = d.toLocaleDateString('en-US', options);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - d) / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    let rel;
    if (diffYears > 0) rel = `${diffYears} year${diffYears > 1 ? 's' : ''}`;
    else if (diffMonths > 0) rel = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    else rel = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    return `${formatted} (${rel} ago)`;
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '30D': return '30 Days';
      case '90D': return '90 Days';
      case 'YTD': return 'Year-to-Date';
      default: return 'All Time';
    }
  };

  if (!ratioData || ratioData.length === 0 || !collection1 || !collection2) return null;

  const filtered = filterByTimeRange(ratioData, timeRange).filter(p => p.y > 0);
  if (filtered.length === 0) return null;

  // Core stats
  const current = filtered[filtered.length - 1].y;
  const first = filtered[0].y;
  const pctChange = ((current - first) / first) * 100;

  const athPoint = filtered.reduce((max, p) => p.y > max.y ? p : max, filtered[0]);
  const atlPoint = filtered.reduce((min, p) => p.y < min.y ? p : min, filtered[0]);

  // Crossover points: consecutive data points that straddle 1.0
  const crossovers = [];
  for (let i = 1; i < filtered.length; i++) {
    const prev = filtered[i - 1];
    const curr = filtered[i];
    if ((prev.y < 1 && curr.y >= 1) || (prev.y >= 1 && curr.y < 1)) {
      const direction = curr.y >= 1 ? 'above' : 'below';
      crossovers.push({ date: curr.x, direction, value: curr.y });
    }
  }

  const cardStyle = {
    backgroundColor: isDark ? 'var(--surface)' : '#ffffff',
    borderColor: isDark ? '#333' : 'var(--border)'
  };

  const labelStyle = {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  };

  const valueStyle = {
    color: 'var(--text-primary)',
    fontSize: '1.25rem',
    fontWeight: 700
  };

  const subStyle = {
    color: isDark ? '#6b7280' : '#9ca3af',
    fontSize: '0.75rem'
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Ratio Metrics</h3>
        <p style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: '0.875rem' }}>
          <span style={{ color: chartColors.collection1, fontWeight: 700 }}>{collection1.name}</span>
          {' ÷ '}
          <span style={{ color: chartColors.collection2, fontWeight: 700 }}>{collection2.name}</span>
          {' — '}
          {getTimeRangeLabel()}
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Current ratio */}
        <div className="rounded-none border-2 p-4" style={cardStyle}>
          <div style={labelStyle} className="mb-1">Current Ratio</div>
          <div style={valueStyle}>{current.toFixed(3)}x</div>
          <div style={{ ...subStyle, marginTop: 2 }}>
            {current >= 1
              ? <span style={{ color: '#16a34a' }}>{collection1.name} premium</span>
              : <span style={{ color: '#dc2626' }}>{collection2.name} premium</span>
            }
          </div>
        </div>

        {/* Period high */}
        <div className="rounded-none border-2 p-4" style={cardStyle}>
          <div style={labelStyle} className="mb-1">Period High</div>
          <div style={valueStyle}>{athPoint.y.toFixed(3)}x</div>
          <div style={{ ...subStyle, marginTop: 2 }}>
            <span style={{ color: '#16a34a' }}>
              +{((athPoint.y - current) / current * 100).toFixed(1)}% vs. current
            </span>
          </div>
          <div style={{ ...subStyle, marginTop: 2 }}>{formatDate(athPoint.x)}</div>
        </div>

        {/* Period low */}
        <div className="rounded-none border-2 p-4" style={cardStyle}>
          <div style={labelStyle} className="mb-1">Period Low</div>
          <div style={valueStyle}>{atlPoint.y.toFixed(3)}x</div>
          <div style={{ ...subStyle, marginTop: 2 }}>
            <span style={{ color: '#dc2626' }}>
              {((atlPoint.y - current) / current * 100).toFixed(1)}% vs. current
            </span>
          </div>
          <div style={{ ...subStyle, marginTop: 2 }}>{formatDate(atlPoint.x)}</div>
        </div>

        {/* % change */}
        <div className="rounded-none border-2 p-4" style={cardStyle}>
          <div style={labelStyle} className="mb-1">Period Change</div>
          <div style={{ ...valueStyle, color: pctChange >= 0 ? '#16a34a' : '#dc2626' }}>
            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
          </div>
          <div style={{ ...subStyle, marginTop: 2 }}>
            {first.toFixed(3)}x → {current.toFixed(3)}x
          </div>
        </div>
      </div>

      {/* Crossover events */}
      {crossovers.length > 0 && (
        <div className="rounded-none border-2 p-4" style={cardStyle}>
          <div style={labelStyle} className="mb-3">
            Parity Crossovers ({crossovers.length})
          </div>
          <p style={{ ...subStyle, marginBottom: '0.75rem' }}>
            Dates when the ratio crossed 1.0 (collections at equal floor price)
          </p>
          <div className="flex flex-wrap gap-2">
            {crossovers.slice(0, 10).map((c, i) => {
              const d = c.date instanceof Date ? c.date : new Date(c.date);
              const dateStr = isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: c.direction === 'above'
                      ? (isDark ? 'rgba(22,163,74,0.15)' : 'rgba(22,163,74,0.1)')
                      : (isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.1)'),
                    color: c.direction === 'above' ? '#16a34a' : '#dc2626',
                    border: `1px solid ${c.direction === 'above' ? '#16a34a' : '#dc2626'}`
                  }}
                >
                  {c.direction === 'above' ? '↑' : '↓'} {dateStr}
                </span>
              );
            })}
            {crossovers.length > 10 && (
              <span style={subStyle}>+{crossovers.length - 10} more</span>
            )}
          </div>
        </div>
      )}

      {crossovers.length === 0 && filtered.length > 0 && (
        <div className="rounded-none border-2 p-4" style={cardStyle}>
          <div style={labelStyle} className="mb-1">Parity Crossovers</div>
          <p style={subStyle}>
            No crossovers in this period —{' '}
            {current >= 1
              ? <><span style={{ color: chartColors.collection1 }}>{collection1.name}</span> has been consistently above parity</>
              : <><span style={{ color: chartColors.collection2 }}>{collection2.name}</span> has been consistently above parity</>
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default RatioMetrics;
