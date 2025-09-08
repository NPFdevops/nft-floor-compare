import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from './components/SearchBar';
import ChartDisplay from './components/ChartDisplay';
import LayoutToggle from './components/LayoutToggle';
import ScreenshotShare from './components/ScreenshotShare';
import TimeframeSelector from './components/TimeframeSelector';
import ApplyButton from './components/ApplyButton';
import CacheStats from './components/CacheStats';
import { fetchFloorPriceHistory } from './services/nftAPI';
import { getDefaultDateRange, dateToTimestamp, getOptimalGranularity, isValidDateRange } from './utils/dateUtils';
import { parseUrlParams, createUrlParams } from './utils/urlUtils';
import { collectionsService } from './services/collectionsService';
import logoImage from './assets/NFTPriceFloor_logo.png';
import mobileLogoImage from './assets/nftpf_logo_mobile.png';

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse initial state from URL parameters
  const initialUrlState = parseUrlParams(searchParams);
  
  const [collection1, setCollection1] = useState(null);
  const [collection2, setCollection2] = useState(null);
  const [layout, setLayout] = useState(initialUrlState.layout); // Initialize from URL
  const [timeframe, setTimeframe] = useState(initialUrlState.timeframe); // Initialize from URL
  const [hasPendingChanges, setHasPendingChanges] = useState(false); // Track pending timeframe changes
  const [loading, setLoading] = useState({ collection1: false, collection2: false });
  const [error, setError] = useState({ collection1: null, collection2: null });
  const [isInitialized, setIsInitialized] = useState(false); // Track if URL initialization is complete
  
  // Date range state
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  // Debug: Track timeframe and pending changes state
  useEffect(() => {
    console.log('🔍 Timeframe state changed to:', timeframe);
  }, [timeframe]);
  
  useEffect(() => {
    console.log('🟡 Pending changes state:', hasPendingChanges ? 'HAS PENDING' : 'NO PENDING');
  }, [hasPendingChanges]);

  // Helper function to calculate date range based on timeframe
  const calculateDateRange = (timeframeValue) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999); // End of today
    const start = new Date();
    
    switch (timeframeValue) {
      case '30d':
        start.setDate(end.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        break;
      case '1Y':
        start.setTime(end.getTime() - (365 * 24 * 60 * 60 * 1000));
        start.setHours(0, 0, 0, 0);
        break;
      case 'YTD':
        start.setFullYear(end.getFullYear(), 0, 1); // January 1st
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(end.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    }
    
    return {
      start,
      end,
      startDateStr: start.toISOString().split('T')[0],
      endDateStr: end.toISOString().split('T')[0]
    };
  };

  // URL initialization effect - load collections from URL on first load
  useEffect(() => {
    if (isInitialized) return; // Only run once
    
    console.log('🔗 Initializing from URL params:', initialUrlState);
    
    const initializeFromUrl = async () => {
      // Calculate date range based on URL timeframe
      const dateRange = calculateDateRange(initialUrlState.timeframe);
      setStartDate(dateRange.startDateStr);
      setEndDate(dateRange.endDateStr);
      
      // Load collections from URL if they exist
      const loadPromises = [];
      
      if (initialUrlState.collection1Slug) {
        console.log('🔗 Loading collection 1 from URL:', initialUrlState.collection1Slug);
        loadPromises.push(
          handleCollectionSearchWithTimeframe(initialUrlState.collection1Slug, 1, initialUrlState.timeframe)
        );
      }
      
      if (initialUrlState.collection2Slug) {
        console.log('🔗 Loading collection 2 from URL:', initialUrlState.collection2Slug);
        loadPromises.push(
          handleCollectionSearchWithTimeframe(initialUrlState.collection2Slug, 2, initialUrlState.timeframe)
        );
      }
      
      // Wait for all collections to load
      if (loadPromises.length > 0) {
        await Promise.all(loadPromises);
      }
      
      setIsInitialized(true);
      console.log('🔗 URL initialization complete');
    };
    
    initializeFromUrl();
  }, [isInitialized, initialUrlState]);

  // URL synchronization effect - update URL when state changes
  useEffect(() => {
    if (!isInitialized) return; // Don't update URL during initialization
    
    const params = createUrlParams({ collection1, collection2, timeframe, layout });
    const currentParams = searchParams.toString();
    const newParams = params.toString();
    
    // Only update URL if parameters have changed
    if (currentParams !== newParams) {
      console.log('🔗 Updating URL params:', { from: currentParams, to: newParams });
      setSearchParams(params, { replace: true });
    }
  }, [collection1, collection2, timeframe, layout, isInitialized, searchParams, setSearchParams]);

  // Helper function to get proper collection name from slug
  const getCollectionName = (slug) => {
    const collection = collectionsService.findBySlug(slug);
    return collection ? collection.name : slug;
  };

  const handleCollectionSearchWithTimeframe = async (collectionSlug, collectionNumber, explicitTimeframe = null) => {
    if (!collectionSlug) return;

    const effectiveTimeframe = explicitTimeframe || timeframe;
    console.log('🗖️ handleCollectionSearchWithTimeframe:', { collectionSlug, collectionNumber, effectiveTimeframe });

    // Validate date range
    if (!isValidDateRange(startDate, endDate)) {
      setError(prev => ({ ...prev, [`collection${collectionNumber}`]: 'Invalid date range' }));
      return;
    }

    const loadingKey = `collection${collectionNumber}`;
    const errorKey = `collection${collectionNumber}`;

    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(prev => ({ ...prev, [errorKey]: null }));

    try {
      const startTimestamp = dateToTimestamp(startDate);
      const endTimestamp = dateToTimestamp(endDate);
      const granularity = getOptimalGranularity(startDate, endDate);
      
      console.log('🚀 Making API call with timeframe:', effectiveTimeframe);
      const result = await fetchFloorPriceHistory(collectionSlug, granularity, startTimestamp, endTimestamp, effectiveTimeframe);
      
      if (result.success) {
        const collectionSetter = collectionNumber === 1 ? setCollection1 : setCollection2;
        const properCollectionName = getCollectionName(collectionSlug);
        collectionSetter({
          slug: collectionSlug,
          name: properCollectionName,
          data: result.priceHistory,
          dateRange: { startDate, endDate },
          granularity,
          timeframe: effectiveTimeframe
        });
        console.log('✅ Successfully updated collection', collectionNumber, properCollectionName, 'with timeframe:', effectiveTimeframe);
      } else {
        setError(prev => ({ ...prev, [errorKey]: result.error }));
      }
    } catch (err) {
      console.error('❌ Error fetching collection data:', err);
      setError(prev => ({ ...prev, [errorKey]: 'Failed to fetch collection data' }));
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Legacy function that uses current timeframe state
  const handleCollectionSearch = async (collectionSlug, collectionNumber) => {
    return handleCollectionSearchWithTimeframe(collectionSlug, collectionNumber, timeframe);
  };

  const clearCollection = (collectionNumber) => {
    const collectionSetter = collectionNumber === 1 ? setCollection1 : setCollection2;
    const errorKey = `collection${collectionNumber}`;
    
    collectionSetter(null);
    setError(prev => ({ ...prev, [errorKey]: null }));
  };

  const handleDateChange = (newStartDate, newEndDate, explicitTimeframe = null) => {
    console.log('📅 Date range changed in App:', { newStartDate, newEndDate, explicitTimeframe });
    
    const effectiveTimeframe = explicitTimeframe || timeframe;
    console.log('📅 Using timeframe:', effectiveTimeframe);
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    // Refetch data for both collections if they exist and dates are valid
    if (newStartDate && newEndDate && isValidDateRange(newStartDate, newEndDate)) {
      console.log('📅 Valid date range, refetching data for collections');
      
      if (collection1) {
        console.log('🔄 Refetching collection1:', collection1.slug, 'with timeframe:', effectiveTimeframe);
        // Use a setTimeout to ensure state has updated
        setTimeout(() => {
          handleCollectionSearchWithTimeframe(collection1.slug, 1, effectiveTimeframe);
        }, 0);
      }
      if (collection2) {
        console.log('🔄 Refetching collection2:', collection2.slug, 'with timeframe:', effectiveTimeframe);
        // Use a setTimeout to ensure state has updated
        setTimeout(() => {
          handleCollectionSearchWithTimeframe(collection2.slug, 2, effectiveTimeframe);
        }, 0);
      }
    } else {
      console.log('⚠️ Invalid date range or missing dates:', {
        isValidRange: newStartDate && newEndDate ? isValidDateRange(newStartDate, newEndDate) : false,
        hasStartDate: !!newStartDate,
        hasEndDate: !!newEndDate
      });
    }
  };

  const handleRangeChange = (days) => {
    console.log('Range changed from chart:', days, 'days');
    
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const endDateStr = end.toISOString().split('T')[0];
    const startDateStr = start.toISOString().split('T')[0];
    
    handleDateChange(startDateStr, endDateStr);
  };


  // Handle timeframe selection (visual state only)
  const handleTimeframeChange = (newTimeframe) => {
    console.log('🕐 Timeframe selected:', newTimeframe);
    
    // Calculate date range for the new timeframe
    const dateRange = calculateDateRange(newTimeframe);
    
    // Update visual state immediately
    setTimeframe(newTimeframe);
    setStartDate(dateRange.startDateStr);
    setEndDate(dateRange.endDateStr);
    
    // Mark that there are pending changes to apply
    setHasPendingChanges(true);
    
    // Ensure we're marked as initialized for URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
    
    console.log('🕐 Timeframe and date range updated, pending changes marked');
  };
  
  // Handle layout changes with URL sync
  const handleLayoutChange = (newLayout) => {
    console.log('📏 Layout changed to:', newLayout);
    setLayout(newLayout);
    
    // Ensure we're marked as initialized for URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
  };
  
  // Handle applying the selected timeframe (trigger data fetching)
  const handleApply = () => {
    console.log('✅ Applying timeframe:', timeframe, 'with date range:', { startDate, endDate });
    
    // Clear pending changes since we're applying them now
    setHasPendingChanges(false);
    
    // Refetch data for existing collections with the current timeframe and dates
    if (collection1) {
      console.log('🔄 Refetching collection1 with timeframe:', timeframe);
      handleCollectionSearchWithTimeframe(collection1.slug, 1, timeframe);
    }
    if (collection2) {
      console.log('🔄 Refetching collection2 with timeframe:', timeframe);
      handleCollectionSearchWithTimeframe(collection2.slug, 2, timeframe);
    }
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-white" style={{fontFamily: '"Space Grotesk", sans-serif'}}>
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="flex items-center justify-center whitespace-nowrap border-b-2 border-solid border-black px-4 sm:px-10 py-4 relative">
          {/* Logo positioned absolutely on the left */}
          <div className="absolute left-4 sm:left-10 flex items-center gap-2 sm:gap-3 text-black">
            {/* Desktop logo - hidden on mobile */}
            <img 
              src={logoImage} 
              alt="NFT Price Floor Logo" 
              className="hidden sm:block h-8" 
            />
            {/* Mobile logo - visible only on mobile */}
            <img 
              src={mobileLogoImage} 
              alt="NFT Price Floor Logo" 
              className="block sm:hidden h-6" 
            />
          </div>
          {/* Centered navigation for desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
              Rankings
            </a>
            <a href="https://nftpricefloor.com/nft-drops" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
              Drops
            </a>
            <a href="https://nftpricefloor.com/nft-news" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
              Live News
            </a>
            <a href="https://nftpricefloor.com/wallet-tracker" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
              Wallet Tracker
            </a>
          </nav>
        </header>
        
        {/* Main Content */}
        <div className="px-4 sm:px-10 flex flex-1 flex-col py-4 sm:py-8 pb-20 md:pb-8">
          <div className="layout-content-container flex flex-col w-full flex-1">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
              <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">
                Home
              </a>
              <span>-</span>
              <span className="text-black font-medium">Chart Comparison</span>
            </nav>
            
            {/* Search Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              <SearchBar 
                placeholder="Search for a collection"
                onSearch={(slug) => handleCollectionSearch(slug, 1)}
                onClear={() => clearCollection(1)}
                loading={loading.collection1}
                error={error.collection1}
                selectedCollection={collection1}
              />
              <SearchBar 
                placeholder="Search for a collection"
                onSearch={(slug) => handleCollectionSearch(slug, 2)}
                onClear={() => clearCollection(2)}
                loading={loading.collection2}
                error={error.collection2}
                selectedCollection={collection2}
              />
            </div>
            
            {/* Layout and Timeframe Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-8">
              {/* Left side controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <LayoutToggle 
                  layout={layout}
                  onLayoutChange={handleLayoutChange}
                />
                <TimeframeSelector
                  timeframe={timeframe}
                  onTimeframeChange={handleTimeframeChange}
                />
                <ApplyButton
                  onApply={handleApply}
                  loading={loading.collection1 || loading.collection2}
                  disabled={!collection1 && !collection2}
                  timeframe={timeframe}
                  hasPendingChanges={hasPendingChanges}
                />
              </div>
              
              {/* Right side controls - Screenshot and Share */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <ScreenshotShare 
                  targetId="chart-container"
                  collection1={collection1}
                  collection2={collection2}
                  timeframe={timeframe}
                  layout={layout}
                />
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="flex flex-1 min-h-[500px]" id="chart-container">
              {layout === 'horizontal' ? (
                // Side by side layout - two separate charts
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full">
                  <ChartDisplay 
                    collection={collection1}
                    title="Collection A"
                    loading={loading.collection1}
                    error={error.collection1}
                    timeframe={timeframe}
                    onRangeChange={handleRangeChange}
                  />
                  <ChartDisplay 
                    collection={collection2}
                    title="Collection B"
                    loading={loading.collection2}
                    error={error.collection2}
                    timeframe={timeframe}
                    onRangeChange={handleRangeChange}
                  />
                </div>
              ) : (
                // Stacked layout - one combined chart with both collections
                <div className="w-full h-full">
                  <ChartDisplay 
                    collection={collection1}
                    collection2={collection2}
                    title="Floor Price Comparison"
                    loading={loading.collection1 || loading.collection2}
                    error={error.collection1 || error.collection2}
                    timeframe={timeframe}
                    onRangeChange={handleRangeChange}
                    isComparison={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-solid border-black px-4 py-3 z-50">
        <div className="flex items-center justify-around gap-2">
          <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-600 hover:text-black transition-colors min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium truncate">Rankings</span>
          </a>
          <a href="https://nftpricefloor.com/nft-drops" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-600 hover:text-black transition-colors min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span className="text-xs font-medium truncate">Drops</span>
          </a>
          <a href="https://nftpricefloor.com/nft-news" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-600 hover:text-black transition-colors min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="text-xs font-medium truncate">News</span>
          </a>
          <a href="https://nftpricefloor.com/wallet-tracker" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-600 hover:text-black transition-colors min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-xs font-medium truncate">Wallet</span>
          </a>
        </div>
      </nav>
      
      {/* Cache Statistics - Development Only */}
      <CacheStats />
    </div>
  );
}

export default App;
