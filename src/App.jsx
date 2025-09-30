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
import { getDefaultDateRange, dateToTimestamp, getOptimalGranularity, isValidDateRange, validateTimestamps } from './utils/dateUtils';
import { parseUrlParams, createUrlParams } from './utils/urlUtils';
import { collectionsService } from './services/collectionsService';
import { posthogService } from './services/posthogService';
import logoImage from './assets/NFTPriceFloor_logo.png';
import mobileLogoImage from './assets/nftpf_logo_mobile.png';

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse initial state from URL parameters - memoize to prevent re-creation
  const initialUrlState = React.useMemo(() => parseUrlParams(searchParams), []);
  
  const [collection1, setCollection1] = useState(null);
  const [collection2, setCollection2] = useState(null);
  const [layout, setLayout] = useState(initialUrlState.layout); // Initialize from URL
  const [timeframe, setTimeframe] = useState(initialUrlState.timeframe); // Initialize from URL
  const [hasPendingChanges, setHasPendingChanges] = useState(false); // Track pending timeframe changes
  const [loading, setLoading] = useState({ collection1: false, collection2: false });
  const [error, setError] = useState({ collection1: null, collection2: null });
  const [isInitialized, setIsInitialized] = useState(false); // Track if URL initialization is complete
  const [isMobile, setIsMobile] = useState(false); // Track if viewport is mobile size
  
  // Date range state
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  // Responsive layout effect - detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    // Check on mount
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debug: Track timeframe and pending changes state
  useEffect(() => {
    console.log('🔍 Timeframe state changed to:', timeframe);
  }, [timeframe]);
  
  useEffect(() => {
    console.log('🟡 Pending changes state:', hasPendingChanges ? 'HAS PENDING' : 'NO PENDING');
  }, [hasPendingChanges]);

  // Helper function to calculate date range based on timeframe
  const calculateDateRange = (timeframeValue) => {
    const today = new Date();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999); // End of today
    
    // Ensure end date is never in the future
    const now = new Date();
    if (end > now) {
      end.setTime(now.getTime());
    }
    
    const start = new Date(end);
    
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
      const rawStartTimestamp = dateToTimestamp(startDate);
      const rawEndTimestamp = dateToTimestamp(endDate);
      
      // Validate and clamp timestamps to reasonable bounds
      const { startTimestamp, endTimestamp } = validateTimestamps(rawStartTimestamp, rawEndTimestamp);
      
      const granularity = getOptimalGranularity(startDate, endDate);
      
      console.log('🚀 Making API call with validated timestamps:', {
        timeframe: effectiveTimeframe,
        startTimestamp,
        endTimestamp,
        startDate: new Date(startTimestamp * 1000).toISOString().split('T')[0],
        endDate: new Date(endTimestamp * 1000).toISOString().split('T')[0]
      });
      
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
    // Track collection search analytics
    posthogService.track('collection_searched', {
      collection_slug: collectionSlug,
      collection_number: collectionNumber,
      timeframe: timeframe,
      layout: layout
    });
    
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
        handleCollectionSearchWithTimeframe(collection1.slug, 1, effectiveTimeframe);
      }
      if (collection2) {
        console.log('🔄 Refetching collection2:', collection2.slug, 'with timeframe:', effectiveTimeframe);
        handleCollectionSearchWithTimeframe(collection2.slug, 2, effectiveTimeframe);
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
    
    // Track timeframe change analytics
    posthogService.track('timeframe_changed', {
      previous_timeframe: timeframe,
      new_timeframe: newTimeframe,
      has_collection1: !!collection1,
      has_collection2: !!collection2,
      layout: layout
    });
    
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
    
    // Track layout change analytics
    posthogService.track('layout_changed', {
      previous_layout: layout,
      new_layout: newLayout,
      has_collection1: !!collection1,
      has_collection2: !!collection2,
      timeframe: timeframe
    });
    
    setLayout(newLayout);
    
    // Ensure we're marked as initialized for URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
  };
  
  // Handle applying the selected timeframe (trigger data fetching)
  const handleApply = () => {
    console.log('✅ Applying timeframe:', timeframe, 'with date range:', { startDate, endDate });
    
    // Track apply action analytics
    posthogService.track('timeframe_applied', {
      timeframe: timeframe,
      start_date: startDate,
      end_date: endDate,
      has_collection1: !!collection1,
      has_collection2: !!collection2,
      layout: layout
    });
    
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
    <div className="relative flex size-full min-h-screen flex-col" style={{fontFamily: '"Space Grotesk", sans-serif', backgroundColor: '#FFF6FB'}}>
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="flex items-center justify-center whitespace-nowrap py-4 relative bg-white">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-10 flex items-center justify-between">
            {/* Logo positioned on the left */}
            <div className="flex items-center gap-2 sm:gap-3 text-black">
              {/* Desktop logo - hidden on mobile */}
              <img 
                src={logoImage} 
                alt="NFT Price Floor Logo" 
                className="hidden sm:block h-10 lg:h-12" 
              />
              {/* Mobile logo - visible only on mobile */}
              <img 
                src={mobileLogoImage} 
                alt="NFT Price Floor Logo" 
                className="block sm:hidden h-8" 
              />
            </div>
            {/* Centered navigation for desktop */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium absolute left-1/2 transform -translate-x-1/2">
              <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
                Rankings
              </a>
              <a href="https://nftpricefloor.com/nft-drops" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
                Drops
              </a>
              <span className="text-black font-semibold border-b-2 border-black pb-1">
                Compare
              </span>
              <a href="https://strategies.nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
                Strategies<sup className="text-xs">TM</sup>
              </a>
            </nav>
          </div>
        </header>
        
        {/* Main Content */}
        <div className="flex flex-1 flex-col py-4 sm:py-8 pb-20 md:pb-8">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-10 flex flex-col flex-1">
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
              {/* Use stacked layout on mobile, split layout on desktop (unless user explicitly chose vertical/stacked) */}
              {isMobile || layout === 'vertical' ? (
                // Stacked layout - one combined chart with Apply button centered below
                <div className="w-full h-full flex flex-col">
                  <div className={`flex-1 transition-all duration-300 ${hasPendingChanges ? 'blur-sm opacity-70' : ''}`}>
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
                  {/* Apply Button centered below the stacked chart - only show when there are pending changes */}
                  {hasPendingChanges && (
                    <div className="flex justify-center mt-4">
                      <ApplyButton
                        onApply={handleApply}
                        loading={loading.collection1 || loading.collection2}
                        disabled={!collection1 && !collection2}
                        timeframe={timeframe}
                        hasPendingChanges={hasPendingChanges}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Side by side layout - two separate charts with Apply button in the middle
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full relative">
                  <div className={`transition-all duration-300 ${hasPendingChanges ? 'blur-sm opacity-70' : ''}`}>
                    <ChartDisplay 
                      collection={collection1}
                      title="Collection A"
                      loading={loading.collection1}
                      error={error.collection1}
                      timeframe={timeframe}
                      onRangeChange={handleRangeChange}
                    />
                  </div>
                  {/* Apply Button positioned in the middle of the two charts - only show when there are pending changes */}
                  {hasPendingChanges && (
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                      <ApplyButton
                        onApply={handleApply}
                        loading={loading.collection1 || loading.collection2}
                        disabled={!collection1 && !collection2}
                        timeframe={timeframe}
                        hasPendingChanges={hasPendingChanges}
                      />
                    </div>
                  )}
                  <div className={`transition-all duration-300 ${hasPendingChanges ? 'blur-sm opacity-70' : ''}`}>
                    <ChartDisplay 
                      collection={collection2}
                      title="Collection B"
                      loading={loading.collection2}
                      error={error.collection2}
                      timeframe={timeframe}
                      onRangeChange={handleRangeChange}
                    />
                  </div>
                  {/* Apply Button for mobile - positioned below charts - only show when there are pending changes */}
                  {hasPendingChanges && (
                    <div className="md:hidden col-span-full flex justify-center mt-4">
                      <ApplyButton
                        onApply={handleApply}
                        loading={loading.collection1 || loading.collection2}
                        disabled={!collection1 && !collection2}
                        timeframe={timeframe}
                        hasPendingChanges={hasPendingChanges}
                      />
                    </div>
                  )}
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
          <div className="flex flex-col items-center gap-1 text-black min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-bold truncate border-b-2 border-black">Compare</span>
          </div>
          <a href="https://strategies.nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-600 hover:text-black transition-colors min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-medium truncate">Strategies<sup className="text-[8px]">TM</sup></span>
          </a>
        </div>
      </nav>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-10 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="col-span-1">
              <img 
                src={logoImage} 
                alt="NFT Price Floor Logo" 
                className="h-8 mb-4" 
              />
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Track and compare NFT floor prices across all major collections. Get real-time data and historical insights.
              </p>
              <div className="flex space-x-4">
                <a href="https://twitter.com/nftpricefloor" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://discord.gg/nftpricefloor" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </a>
                <a href="https://t.me/nftpricefloor" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787L22.952 5.25c.309-1.239-.473-1.8-1.287-1.533z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="col-span-1">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wide mb-4">Explore</h3>
              <ul className="space-y-3">
                <li><a href="https://nftpricefloor.com" className="text-gray-600 hover:text-black text-sm transition-colors">Rankings</a></li>
                <li><a href="https://nftpricefloor.com/nft-drops" className="text-gray-600 hover:text-black text-sm transition-colors">NFT Drops</a></li>
                <li><a href="https://nftpricefloor.com/nft-news" className="text-gray-600 hover:text-black text-sm transition-colors">Live News</a></li>
                <li><a href="https://nftpricefloor.com/wallet-tracker" className="text-gray-600 hover:text-black text-sm transition-colors">Wallet Tracker</a></li>
              </ul>
            </div>
            
            {/* Tools */}
            <div className="col-span-1">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wide mb-4">More</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-black text-sm transition-colors">Price Comparison</a></li>
                <li><a href="#" className="text-gray-600 hover:text-black text-sm transition-colors">Brokerage</a></li>
                <li><a href="#" className="text-gray-600 hover:text-black text-sm transition-colors">API</a></li>
                <li><a href="#" className="text-gray-600 hover:text-black text-sm transition-colors">Ads</a></li>
              </ul>
            </div>
            
            {/* Newsletter */}
            <div className="col-span-1">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wide mb-4">Stay Updated</h3>
              <p className="text-gray-600 text-sm mb-4">Get the latest NFT market insights delivered to your inbox.</p>
              <div className="flex flex-col space-y-2">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="px-3 py-2 border border-gray-300 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          
          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-600 text-sm">© 2025 NFTPriceFloor. All rights reserved.</p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-black text-sm transition-colors">Privacy Policy</a>
                <a href="#" className="text-gray-600 hover:text-black text-sm transition-colors">Terms of Service</a>
                <a href="#" className="text-gray-600 hover:text-black text-sm transition-colors">Contact</a>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-gray-500 text-xs">Made with ❤️ for the NFT OGs</p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Cache Statistics - Development Only */}
      {/* <CacheStats /> */}
    </div>
  );
}

export default App;
