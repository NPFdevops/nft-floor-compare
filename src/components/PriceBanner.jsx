import React, { useState, useEffect } from 'react';
import { fetchCollectionDetails } from '../services/nftAPI';

const PriceBanner = ({ collection1, collection2 }) => {
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

  const calculatePriceProjection = () => {
    const metrics1 = metrics.collection1;
    const metrics2 = metrics.collection2;

    if (!metrics1 || !metrics2) return null;
    if (!metrics1.marketCap || !metrics2.marketCap || !metrics1.floorPrice) return null;

    // Calculate what collection1's price would be with collection2's market cap
    const currentFloorPrice = parseFloat(metrics1.floorPrice);
    const currentMarketCap = parseFloat(metrics1.marketCap);
    const targetMarketCap = parseFloat(metrics2.marketCap);

    if (currentFloorPrice <= 0 || currentMarketCap <= 0 || targetMarketCap <= 0) return null;

    // New price = current price * (target market cap / current market cap)
    const projectedPrice = currentFloorPrice * (targetMarketCap / currentMarketCap);
    const multiplier = projectedPrice / currentFloorPrice;

    return {
      projectedPrice,
      multiplier,
      isIncrease: multiplier > 1,
      currentPrice: currentFloorPrice,
      fromCollection: collection1?.name || 'Collection A',
      toCollection: collection2?.name || 'Collection B'
    };
  };

  const formatETH = (value) => {
    if (!value || isNaN(value)) return '0';
    
    const num = parseFloat(value);
    
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else if (num >= 100) {
      return num.toFixed(0);
    } else if (num >= 10) {
      return num.toFixed(1);
    } else {
      return num.toFixed(2);
    }
  };

  const formatMultiplier = (multiplier) => {
    if (multiplier >= 100) {
      return `${multiplier.toFixed(0)}x`;
    } else if (multiplier >= 10) {
      return `${multiplier.toFixed(1)}x`;
    } else {
      return `${multiplier.toFixed(2)}x`;
    }
  };

  // Don't render if both collections aren't selected
  if (!collection1 || !collection2) {
    return null;
  }

  // Show loading state if data is still being fetched
  if (loading.collection1 || loading.collection2) {
    return (
      <div className="price-banner bg-gray-50 dark:bg-[#1a1a1a] border-2 border-gray-300 dark:border-gray-600 rounded-none p-4 mb-6 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#404040]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-none border-2 bg-white dark:bg-gray-700 border-gray-500 dark:border-gray-600">
            <div className="animate-spin h-5 w-5 border-2 border-white dark:border-gray-300 border-t-transparent rounded-full"></div>
          </div>
          <div className="flex-1">
            <div className="text-black dark:text-white font-bold text-lg mb-2">
              Price Projection
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Calculating price projection for{' '}
              <span 
                className="font-bold px-2 py-0.5 rounded text-white text-sm"
                style={{ backgroundColor: chartColors.collection1 }}
              >
                {collection1.name}
              </span>{' '}
              with the market cap of{' '}
              <span 
                className="font-bold px-2 py-0.5 rounded text-black text-sm"
                style={{ backgroundColor: chartColors.collection2 }}
              >
                {collection2.name}
              </span>...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there are errors
  if (error.collection1 || error.collection2) {
    return (
      <div className="price-banner bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-none p-4 mb-6 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#404040]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-none border-2 bg-red-500 dark:bg-red-700 border-red-600 dark:border-red-800">
            <span className="material-symbols-outlined text-white text-xl">error</span>
          </div>
          <div className="flex-1">
            <div className="text-black dark:text-white font-bold text-lg mb-2">
              Price Projection
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Unable to calculate price projection. Please try again.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const projection = calculatePriceProjection();
  
  if (!projection) {
    return null;
  }

  return (
    <div className={`price-banner bg-gradient-to-r ${
      projection.isIncrease 
        ? 'from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40 border-green-500 dark:border-green-700' 
        : 'from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40 border-red-500 dark:border-red-700'
    } border-2 rounded-none p-4 mb-6 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#404040]`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 p-2 rounded-none border-2 ${
          projection.isIncrease 
            ? 'bg-green-500 dark:bg-green-700 border-green-600 dark:border-green-800' 
            : 'bg-red-200 dark:bg-red-700 border-red-600 dark:border-red-800'
        }`}>
          <span className="material-symbols-outlined text-white text-xl">
            {projection.isIncrease ? 'trending_up' : 'trending_down'}
          </span>
        </div>
        
        <div className="flex-1">
          <div className="text-black dark:text-white font-bold text-lg mb-2">
            Price Projection
          </div>
          
          <div className="text-sm text-black dark:text-gray-200 leading-relaxed">
            The price of{' '}
            <span 
              className="font-bold px-2 py-0.5 rounded text-white text-sm"
              style={{ backgroundColor: chartColors.collection1 }}
            >
              {projection.fromCollection}
            </span>{' '}
            would be{' '}
            <span className={`font-bold ${
              projection.isIncrease ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatETH(projection.projectedPrice)} ETH
            </span>{' '}
            if it had the market cap of{' '}
            <span 
              className="font-bold px-2 py-0.5 rounded text-white text-sm"
              style={{ backgroundColor: chartColors.collection2 }}
            >
              {projection.toCollection}
            </span>,{' '}
            {projection.isIncrease ? 'an' : 'a'}{' '}
            <span className={`font-bold ${
              projection.isIncrease ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatMultiplier(projection.multiplier)} {projection.isIncrease ? 'increase' : 'decrease'}
            </span>{' '}
            from the current price.
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PriceBanner;