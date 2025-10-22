import React, { useState, useEffect } from 'react';
import { fetchCollectionDetails } from '../services/nftAPI';

const CollectionMetrics = ({ collection1, collection2, loading: parentLoading }) => {
  // Chart colors matching the chart component
  const chartColors = {
    collection1: '#e91e63', // Pink
    collection2: '#9c27b0'  // Purple
  };

  const [metrics, setMetrics] = useState({
    collection1: null,
    collection2: null
  });
  const [loading, setLoading] = useState({
    collection1: false,
    collection2: false
  });
  const [error, setError] = useState({
    collection1: null,
    collection2: null
  });

  // Fetch metrics for both collections when they change
  useEffect(() => {
    if (collection1?.slug) {
      fetchMetrics(collection1.slug, 1);
    } else {
      setMetrics(prev => ({ ...prev, collection1: null }));
      setError(prev => ({ ...prev, collection1: null }));
    }
  }, [collection1?.slug]);

  useEffect(() => {
    if (collection2?.slug) {
      fetchMetrics(collection2.slug, 2);
    } else {
      setMetrics(prev => ({ ...prev, collection2: null }));
      setError(prev => ({ ...prev, collection2: null }));
    }
  }, [collection2?.slug]);

  const fetchMetrics = async (slug, collectionNumber) => {
    const key = `collection${collectionNumber}`;
    
    setLoading(prev => ({ ...prev, [key]: true }));
    setError(prev => ({ ...prev, [key]: null }));

    try {
      const result = await fetchCollectionDetails(slug);
      
      if (result.success) {
        setMetrics(prev => ({ ...prev, [key]: result.data }));
      } else {
        setError(prev => ({ ...prev, [key]: result.error }));
      }
    } catch (err) {
      console.error(`Error fetching metrics for ${slug}:`, err);
      setError(prev => ({ ...prev, [key]: 'Failed to fetch collection metrics' }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const formatNumber = (num) => {
    if (!num || isNaN(num)) return 'N/A';
    
    const number = parseFloat(num);
    
    if (number >= 1000000000) {
      return `$${(number / 1000000000).toFixed(1)}B`;
    } else if (number >= 1000000) {
      return `$${(number / 1000000).toFixed(1)}M`;
    } else if (number >= 1000) {
      return `$${(number / 1000).toFixed(1)}K`;
    } else {
      return `$${number.toFixed(0)}`;
    }
  };

  const formatCount = (num) => {
    if (!num || isNaN(num)) return 'N/A';
    
    const number = parseFloat(num);
    
    if (number >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    } else if (number >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    } else {
      return number.toLocaleString();
    }
  };

  const formatWholeNumber = (num) => {
    if (!num || isNaN(num)) return 'N/A';
    
    const number = parseFloat(num);
    return number.toLocaleString();
  };

  const formatPercentage = (num) => {
    if (!num || isNaN(num)) return 'N/A';
    return `${(parseFloat(num) * 100).toFixed(1)}%`;
  };

  const MetricRow = ({ title, value1, value2, loading1, loading2, error1, error2, icon }) => (
    <div className="grid grid-cols-3 border-b-2 border-black last:border-b-0">
      {/* Metric Name Column */}
      <div className="p-4 border-r-2 border-black" style={{ backgroundColor: 'var(--surface-hover)' }}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg" style={{ color: 'var(--text-primary)' }}>{icon}</span>
          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
      </div>
      
      {/* Collection 1 Column */}
      <div className="p-4 border-r-2 border-black">
        {loading1 ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }}></div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
          </div>
        ) : error1 ? (
          <span className="text-sm text-red-600 dark:text-red-400 font-medium">Error</span>
        ) : (
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value1}</span>
        )}
      </div>
      
      {/* Collection 2 Column */}
      <div className="p-4">
        {loading2 ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }}></div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
          </div>
        ) : error2 ? (
          <span className="text-sm text-red-600 dark:text-red-400 font-medium">Error</span>
        ) : (
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value2}</span>
        )}
      </div>
    </div>
  );

  // Don't render if no collections selected
  if (!collection1 && !collection2) {
    return null;
  }

  return (
    <div className="collection-metrics">
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Collection Metrics</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Compare key statistics between collections</p>
      </div>
      
      {/* Table-style comparison */}
      <div className="border-2 border-black rounded-none" style={{ backgroundColor: 'var(--surface)' }}>
        {/* Header Row */}
        <div className="grid grid-cols-3 border-b-2 border-black" style={{ backgroundColor: 'var(--surface-hover)' }}>
          <div className="p-4 border-r-2 border-black">
            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Metric</h3>
          </div>
          <div className="p-4 border-r-2 border-black">
            <div className="text-xs font-medium truncate">
              {collection1?.name ? (
                <span 
                  className="font-bold px-2 py-1 rounded-none text-white text-xs border border-black"
                  style={{ backgroundColor: chartColors.collection1 }}
                >
                  {collection1.name}
                </span>
              ) : (
                <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Collection 1</span>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium truncate">
              {collection2?.name ? (
                <span 
                  className="font-bold px-2 py-1 rounded-none text-white text-xs border border-black"
                  style={{ backgroundColor: chartColors.collection2 }}
                >
                  {collection2.name}
                </span>
              ) : (
                <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>Collection 2</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Metric Rows */}
        <MetricRow
          title="Unique Owners"
          value1={formatWholeNumber(metrics.collection1?.owners)}
          value2={formatWholeNumber(metrics.collection2?.owners)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="groups"
        />
        
        <MetricRow
          title="Total Supply"
          value1={formatWholeNumber(metrics.collection1?.totalSupply)}
          value2={formatWholeNumber(metrics.collection2?.totalSupply)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="inventory_2"
        />
        
        <MetricRow
          title="Listed Items"
          value1={formatCount(metrics.collection1?.listedItems)}
          value2={formatCount(metrics.collection2?.listedItems)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="list"
        />
        
        <MetricRow
          title="Market Cap"
          value1={formatNumber(metrics.collection1?.marketCap)}
          value2={formatNumber(metrics.collection2?.marketCap)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="trending_up"
        />
      </div>
    </div>
  );
};

export default CollectionMetrics;