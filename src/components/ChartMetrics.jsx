import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ChartMetrics = ({ collection1, collection2, currency = 'ETH', timeRange = 'All' }) => {
  const { isDark } = useTheme();

  // Chart colors matching the chart component
  const chartColors = {
    collection1: '#e91e63', // Pink
    collection2: '#9c27b0'  // Purple
  };

  // Filter data based on selected time range
  const filterDataByTimeRange = (data, rangeLabel) => {
    if (!data || data.length === 0) return data;

    const now = new Date();
    let cutoffDate;

    if (rangeLabel === 'All') {
      return data; // Return all data
    } else if (rangeLabel === 'YTD') {
      // Year to date - from Jan 1 of current year
      cutoffDate = new Date(now.getFullYear(), 0, 1);
    } else if (rangeLabel === '30D') {
      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    } else if (rangeLabel === '90D') {
      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 90);
    } else {
      return data; // Unknown range, return all data
    }

    // Filter data points after cutoff date
    return data.filter(point => {
      const pointDate = point.x instanceof Date ? point.x : new Date(point.x);
      return pointDate >= cutoffDate;
    });
  };

  // Calculate metrics for a collection based on filtered data
  const calculateMetrics = (collection) => {
    if (!collection?.data || collection.data.length === 0) {
      return null;
    }

    // Filter data based on selected time range
    const filteredData = filterDataByTimeRange(collection.data, timeRange);

    if (filteredData.length === 0) {
      return null;
    }

    // Get filtered prices and data points
    const filteredPoints = filteredData.filter(point => point.y > 0);

    if (filteredPoints.length === 0) {
      return null;
    }

    // Calculate range (min/max) for the selected time period
    const rangeHigh = Math.max(...filteredPoints.map(p => p.y));
    const rangeLow = Math.min(...filteredPoints.map(p => p.y));

    // Calculate All-Time High and Low from full dataset
    const allDataPoints = collection.data.filter(point => point.y > 0);

    let athPrice = null;
    let athDate = null;
    let atlPrice = null;
    let atlDate = null;

    if (allDataPoints.length > 0) {
      // Find ATH
      athPrice = Math.max(...allDataPoints.map(p => p.y));
      const athPoint = allDataPoints.find(p => p.y === athPrice);
      athDate = athPoint ? athPoint.x : null;

      // Find ATL
      atlPrice = Math.min(...allDataPoints.map(p => p.y));
      const atlPoint = allDataPoints.find(p => p.y === atlPrice);
      atlDate = atlPoint ? atlPoint.x : null;
    }

    // Current price (latest in filtered data)
    const currentPrice = filteredPoints[filteredPoints.length - 1].y;

    // Calculate percentages from current price
    const downFromATH = athPrice ? ((athPrice - currentPrice) / athPrice * 100) : 0;
    const upFromATL = atlPrice ? ((currentPrice - atlPrice) / atlPrice * 100) : 0;

    return {
      rangeHigh,
      rangeLow,
      athPrice,
      athDate,
      atlPrice,
      atlDate,
      currentPrice,
      upFromATL,
      downFromATH
    };
  };

  // Get time range label for title
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '30D':
        return '30 Days';
      case '90D':
        return '90 Days';
      case 'YTD':
        return 'Year-to-Date';
      case 'All':
        return 'All Time';
      default:
        return 'All Time';
    }
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'N/A';

    if (currency === 'USD') {
      return `$${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `${parseFloat(price).toFixed(2)} ETH`;
    }
  };

  const formatPercentage = (percentage) => {
    if (percentage === null || percentage === undefined || isNaN(percentage)) {
      return 'N/A';
    }
    return `${percentage.toFixed(2)}%`;
  };

  // Format date with relative time
  const formatDate = (date) => {
    if (!date) return 'N/A';

    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) return 'N/A';

    // Format date as "MMM DD, YYYY"
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('en-US', options);

    // Calculate relative time
    const now = new Date();
    const diffTime = Math.abs(now - dateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    let relativeTime;
    if (diffYears > 0) {
      relativeTime = diffYears === 1 ? '1 year' : `${diffYears} years`;
    } else if (diffMonths > 0) {
      relativeTime = diffMonths === 1 ? '1 month' : `${diffMonths} months`;
    } else if (diffDays > 0) {
      relativeTime = diffDays === 1 ? '1 day' : `${diffDays} days`;
    } else {
      relativeTime = 'today';
    }

    return `${formattedDate} (${relativeTime})`;
  };

  const metrics1 = collection1 ? calculateMetrics(collection1) : null;
  const metrics2 = collection2 ? calculateMetrics(collection2) : null;

  // Generate unique ID for this component instance
  const gridId = React.useMemo(() => `metrics-grid-${Math.random().toString(36).substr(2, 9)}`, []);

  // Don't render if no collections selected
  if (!collection1 && !collection2) {
    return null;
  }

  // Render metrics for a single collection
  const renderCollectionMetrics = (metrics, collectionName, color) => {
    if (!metrics) {
      return (
        <div className="text-center py-8">
          <p style={{ color: 'var(--text-secondary)' }}>No data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Range */}
        <div className="p-3 md:p-4 rounded" style={{ backgroundColor: 'var(--surface-hover)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>
              show_chart
            </span>
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {getTimeRangeLabel()} Range
            </h3>
          </div>
          <p className="text-base md:text-lg font-bold break-words" style={{ color: 'var(--text-primary)' }}>
            {formatPrice(metrics.rangeLow)} – {formatPrice(metrics.rangeHigh)}
          </p>
        </div>

        {/* All-Time High */}
        <div className="p-3 md:p-4 rounded" style={{ backgroundColor: 'var(--surface-hover)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base md:text-lg text-green-600">
              trending_up
            </span>
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
              All-Time High
            </h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base md:text-lg font-bold break-words" style={{ color: 'var(--text-primary)' }}>
                {formatPrice(metrics.athPrice)}
              </span>
              <span className="text-sm font-bold text-red-600 whitespace-nowrap">
                (-{formatPercentage(metrics.downFromATH)})
              </span>
            </div>
            <p className="text-xs break-words" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(metrics.athDate)}
            </p>
          </div>
        </div>

        {/* All-Time Low */}
        <div className="p-3 md:p-4 rounded" style={{ backgroundColor: 'var(--surface-hover)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base md:text-lg text-red-600">
              trending_down
            </span>
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
              All-Time Low
            </h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base md:text-lg font-bold break-words" style={{ color: 'var(--text-primary)' }}>
                {formatPrice(metrics.atlPrice)}
              </span>
              <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                (+{formatPercentage(metrics.upFromATL)})
              </span>
            </div>
            <p className="text-xs break-words" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(metrics.atlDate)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chart-metrics">
      {/* Title Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Collection Metrics
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Floor price statistics for the {getTimeRangeLabel().toLowerCase()} period
        </p>
      </div>

      {/* Inline style for responsive grid */}
      <style dangerouslySetInnerHTML={{__html: `
        #${gridId} {
          display: grid;
          gap: 1.5rem;
          width: 100%;
          grid-template-columns: 1fr;
        }

        @media (min-width: 768px) {
          #${gridId} {
            grid-template-columns: ${collection1 && collection2 ? 'repeat(2, 1fr)' : '1fr'} !important;
          }
        }
      `}} />

      {/* Metrics Grid - Responsive Layout */}
      <div id={gridId}>
        {/* Collection 1 */}
        {collection1 && (
          <div className="border-2 border-black rounded-none w-full" style={{ backgroundColor: 'var(--surface)' }}>
            {/* Collection Header */}
            <div className="p-4 border-b-2 border-black" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <span
                className="inline-block font-bold px-3 py-1.5 rounded-none text-white text-sm border border-black"
                style={{ backgroundColor: chartColors.collection1 }}
              >
                {collection1.name}
              </span>
            </div>

            {/* Metrics */}
            <div className="p-4">
              {renderCollectionMetrics(metrics1, collection1.name, chartColors.collection1)}
            </div>
          </div>
        )}

        {/* Collection 2 */}
        {collection2 && (
          <div className="border-2 border-black rounded-none w-full" style={{ backgroundColor: 'var(--surface)' }}>
            {/* Collection Header */}
            <div className="p-4 border-b-2 border-black" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <span
                className="inline-block font-bold px-3 py-1.5 rounded-none text-white text-sm border border-black"
                style={{ backgroundColor: chartColors.collection2 }}
              >
                {collection2.name}
              </span>
            </div>

            {/* Metrics */}
            <div className="p-4">
              {renderCollectionMetrics(metrics2, collection2.name, chartColors.collection2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartMetrics;
