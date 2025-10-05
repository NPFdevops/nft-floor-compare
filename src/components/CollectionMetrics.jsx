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

  const formatPercentage = (num) => {
    if (!num || isNaN(num)) return 'N/A';
    return `${(parseFloat(num) * 100).toFixed(1)}%`;
  };

  const MetricCard = ({ title, value1, value2, loading1, loading2, error1, error2, icon }) => (
    <div className="bg-white border-2 border-black rounded-none">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-lg text-black">{icon}</span>
          <h3 className="text-sm font-bold text-black uppercase tracking-wide">{title}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Collection 1 */}
          <div className="flex flex-col">
            <div className="text-xs font-medium mb-1 truncate">
              {collection1?.name ? (
                <span 
                  className="font-bold px-2 py-1 rounded text-white text-xs"
                  style={{ backgroundColor: chartColors.collection1 }}
                >
                  {collection1.name}
                </span>
              ) : (
                <span className="text-gray-600">Collection 1</span>
              )}
            </div>
            {loading1 ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            ) : error1 ? (
              <span className="text-sm text-red-600 font-medium">Error</span>
            ) : (
              <span className="text-lg font-bold text-black">{value1}</span>
            )}
          </div>
          
          {/* Collection 2 */}
          <div className="flex flex-col">
            <div className="text-xs font-medium mb-1 truncate">
              {collection2?.name ? (
                <span 
                  className="font-bold px-2 py-1 rounded text-white text-xs"
                  style={{ backgroundColor: chartColors.collection2 }}
                >
                  {collection2.name}
                </span>
              ) : (
                <span className="text-gray-600">Collection 2</span>
              )}
            </div>
            {loading2 ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            ) : error2 ? (
              <span className="text-sm text-red-600 font-medium">Error</span>
            ) : (
              <span className="text-lg font-bold text-black">{value2}</span>
            )}
          </div>
        </div>
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
        <h2 className="text-lg font-bold text-black mb-2">Collection Metrics</h2>
        <p className="text-sm text-gray-600">Compare key statistics between collections</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricCard
          title="Market Cap"
          value1={formatNumber(metrics.collection1?.marketCap)}
          value2={formatNumber(metrics.collection2?.marketCap)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="trending_up"
        />
        
        <MetricCard
          title="Total Supply"
          value1={formatCount(metrics.collection1?.totalSupply)}
          value2={formatCount(metrics.collection2?.totalSupply)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="inventory_2"
        />
        
        <MetricCard
          title="Listed Items"
          value1={formatCount(metrics.collection1?.listedItems)}
          value2={formatCount(metrics.collection2?.listedItems)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="list"
        />
        
        <MetricCard
          title="Unique Owners"
          value1={formatCount(metrics.collection1?.owners)}
          value2={formatCount(metrics.collection2?.owners)}
          loading1={loading.collection1}
          loading2={loading.collection2}
          error1={error.collection1}
          error2={error.collection2}
          icon="groups"
        />
      </div>
    </div>
  );
};

export default CollectionMetrics;