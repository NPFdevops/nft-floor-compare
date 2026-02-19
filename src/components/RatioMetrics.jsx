import React from 'react';

const chartColors = {
  collection1: '#e91e63',
  collection2: '#9c27b0'
};

const RatioMetrics = ({ collection1, collection2, ratioData, timeRange = 'All' }) => {

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

  const current = filtered[filtered.length - 1].y;
  const first = filtered[0].y;
  const pctChange = ((current - first) / first) * 100;

  const athPoint = filtered.reduce((max, p) => p.y > max.y ? p : max, filtered[0]);
  const atlPoint = filtered.reduce((min, p) => p.y < min.y ? p : min, filtered[0]);

  const crossovers = [];
  for (let i = 1; i < filtered.length; i++) {
    const prev = filtered[i - 1];
    const curr = filtered[i];
    if ((prev.y < 1 && curr.y >= 1) || (prev.y >= 1 && curr.y < 1)) {
      crossovers.push({ date: curr.x, direction: curr.y >= 1 ? 'above' : 'below', value: curr.y });
    }
  }

  // Shared label style matching ChartMetrics
  const labelClass = 'text-xs font-bold uppercase tracking-wide';

  return (
    <div>
      {/* Section header — matches ChartMetrics */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Ratio Metrics
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: chartColors.collection1, fontWeight: 700 }}>{collection1.name}</span>
          {' ÷ '}
          <span style={{ color: chartColors.collection2, fontWeight: 700 }}>{collection2.name}</span>
          {' — '}
          {getTimeRangeLabel()}
        </p>
      </div>

      {/* 4-stat cards — border-2 border-black rounded-none, matching design system */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

        {/* Current Ratio */}
        <div className="border-2 border-black rounded-none" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="px-4 py-2 border-b-2 border-black flex items-center gap-2" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <span className="material-symbols-outlined text-base" style={{ color: 'var(--text-primary)' }}>compare</span>
            <span className={labelClass} style={{ color: 'var(--text-primary)' }}>Current</span>
          </div>
          <div className="p-4">
            <p className="text-base md:text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {current.toFixed(3)}x
            </p>
            <p className="text-xs" style={{ color: current >= 1 ? '#16a34a' : '#dc2626' }}>
              {current >= 1
                ? `${collection1.name} premium`
                : `${collection2.name} premium`}
            </p>
          </div>
        </div>

        {/* Period High */}
        <div className="border-2 border-black rounded-none" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="px-4 py-2 border-b-2 border-black flex items-center gap-2" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <span className="material-symbols-outlined text-base text-green-600">trending_up</span>
            <span className={labelClass} style={{ color: 'var(--text-primary)' }}>Period High</span>
          </div>
          <div className="p-4">
            <p className="text-base md:text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {athPoint.y.toFixed(3)}x
            </p>
            <p className="text-xs font-bold text-green-600 mb-1">
              +{((athPoint.y - current) / current * 100).toFixed(1)}% vs. current
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(athPoint.x)}</p>
          </div>
        </div>

        {/* Period Low */}
        <div className="border-2 border-black rounded-none" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="px-4 py-2 border-b-2 border-black flex items-center gap-2" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <span className="material-symbols-outlined text-base text-red-600">trending_down</span>
            <span className={labelClass} style={{ color: 'var(--text-primary)' }}>Period Low</span>
          </div>
          <div className="p-4">
            <p className="text-base md:text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {atlPoint.y.toFixed(3)}x
            </p>
            <p className="text-xs font-bold text-red-600 mb-1">
              {((atlPoint.y - current) / current * 100).toFixed(1)}% vs. current
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(atlPoint.x)}</p>
          </div>
        </div>

        {/* Period Change */}
        <div className="border-2 border-black rounded-none" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="px-4 py-2 border-b-2 border-black flex items-center gap-2" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <span className="material-symbols-outlined text-base" style={{ color: 'var(--text-primary)' }}>show_chart</span>
            <span className={labelClass} style={{ color: 'var(--text-primary)' }}>Period Change</span>
          </div>
          <div className="p-4">
            <p className={`text-base md:text-lg font-bold mb-1 ${pctChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {first.toFixed(3)}x → {current.toFixed(3)}x
            </p>
          </div>
        </div>
      </div>

      {/* Parity Crossovers — same bordered table style as CollectionMetrics */}
      <div className="border-2 border-black rounded-none" style={{ backgroundColor: 'var(--surface)' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-black flex items-center gap-2" style={{ backgroundColor: 'var(--surface-hover)' }}>
          <span className="material-symbols-outlined text-base" style={{ color: 'var(--text-primary)' }}>swap_horiz</span>
          <span className={labelClass} style={{ color: 'var(--text-primary)' }}>
            Parity Crossovers{crossovers.length > 0 ? ` (${crossovers.length})` : ''}
          </span>
        </div>

        <div className="p-4">
          {crossovers.length > 0 ? (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Dates when the ratio crossed 1.0 — collections at equal floor price
              </p>
              <div className="flex flex-wrap gap-2">
                {crossovers.slice(0, 10).map((c, i) => {
                  const d = c.date instanceof Date ? c.date : new Date(c.date);
                  const dateStr = isNaN(d.getTime())
                    ? 'N/A'
                    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const isAbove = c.direction === 'above';
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 border text-xs font-semibold border-black rounded-none"
                      style={{
                        backgroundColor: isAbove ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                        color: isAbove ? '#16a34a' : '#dc2626',
                        borderColor: isAbove ? '#16a34a' : '#dc2626'
                      }}
                    >
                      {isAbove ? '↑' : '↓'} {dateStr}
                    </span>
                  );
                })}
                {crossovers.length > 10 && (
                  <span className="text-xs px-2 py-1" style={{ color: 'var(--text-secondary)' }}>
                    +{crossovers.length - 10} more
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              No crossovers in this period —{' '}
              {current >= 1
                ? <><span style={{ color: chartColors.collection1 }}>{collection1.name}</span> has been consistently above parity</>
                : <><span style={{ color: chartColors.collection2 }}>{collection2.name}</span> has been consistently above parity</>
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RatioMetrics;
