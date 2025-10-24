import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import SearchBar from './components/SearchBar';
import ChartDisplay from './components/ChartDisplay';
import ScreenshotShare from './components/ScreenshotShare';
import CacheStats from './components/CacheStats';
import CollectionMetrics from './components/CollectionMetrics';
import PriceBanner from './components/PriceBanner';
import CurrencySwitch from './components/CurrencySwitch';
import ComparisonExamples from './components/ComparisonExamples';
import SettingsModal from './components/SettingsModal';
import { fetchFloorPriceHistory } from './services/nftAPI';
import { parseUrlParams, createUrlParams } from './utils/urlUtils';
import { collectionsService } from './services/collectionsService';
import { useTheme } from './contexts/ThemeContext';
import logoLightImage from './assets/NFTPriceFloor_logo_light.png';
import logoDarkImage from './assets/NFTPriceFloor_logo_dark.png';
import mobileLogoImage from './assets/nftpf_logo_mobile.png';

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDark } = useTheme();
  const posthog = usePostHog();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Parse initial state from URL parameters - memoize to prevent re-creation
  const initialUrlState = React.useMemo(() => parseUrlParams(searchParams), []);
  
  const [collection1, setCollection1] = useState(null);
  const [collection2, setCollection2] = useState(null);
  const [layout, setLayout] = useState(initialUrlState.layout || 'vertical'); // Initialize from URL, default to vertical (stacked)
  const [loading, setLoading] = useState({ collection1: false, collection2: false });
  const [error, setError] = useState({ collection1: null, collection2: null });
  const [isInitialized, setIsInitialized] = useState(false); // Track if URL initialization is complete
  const [isMobile, setIsMobile] = useState(false); // Track if viewport is mobile size
  const [currency, setCurrency] = useState('ETH'); // Track currency display (ETH or USD)
  const searchBar1Ref = useRef(null); // Ref for first SearchBar to trigger focus
  
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

  // URL initialization effect - load collections from URL on first load
  useEffect(() => {
    if (isInitialized) return; // Only run once
    
    console.log('🔗 Initializing from URL params:', initialUrlState);
    
    const initializeFromUrl = async () => {
      // Load collections from URL if they exist
      const loadPromises = [];
      
      if (initialUrlState.collection1Slug) {
        console.log('🔗 Loading collection 1 from URL:', initialUrlState.collection1Slug);
        loadPromises.push(
          handleCollectionSearch(initialUrlState.collection1Slug, 1)
        );
      }
      
      if (initialUrlState.collection2Slug) {
        console.log('🔗 Loading collection 2 from URL:', initialUrlState.collection2Slug);
        loadPromises.push(
          handleCollectionSearch(initialUrlState.collection2Slug, 2)
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
    
    const params = createUrlParams({ collection1, collection2, layout });
    const currentParams = searchParams.toString();
    const newParams = params.toString();
    
    // Only update URL if parameters have changed
    if (currentParams !== newParams) {
      console.log('🔗 Updating URL params:', { from: currentParams, to: newParams });
      setSearchParams(params, { replace: true });
    }
  }, [collection1, collection2, layout, isInitialized, searchParams, setSearchParams]);

  // Helper function to get proper collection name from slug
  const getCollectionName = (slug) => {
    const collection = collectionsService.findBySlug(slug);
    return collection ? collection.name : slug;
  };

  // Helper function to reformat collection data based on current currency
  const reformatCollectionData = (collection, currency) => {
    if (!collection?.rawData?.timestamps) return collection;
    
    const { timestamps, floorEth, floorUsd } = collection.rawData;
    const priceArray = currency === 'USD' ? floorUsd : floorEth;
    
    if (!priceArray || !Array.isArray(priceArray)) return collection;
    
    const reformattedData = timestamps.map((timestamp, index) => ({
      x: new Date(timestamp),
      y: parseFloat(priceArray[index]) || 0
    })).filter(point => point.y > 0).sort((a, b) => a.x - b.x);
    
    return {
      ...collection,
      data: reformattedData
    };
  };

  const handleCollectionSearch = async (collectionSlug, collectionNumber) => {
    if (!collectionSlug) return;

    console.log('🗖️ handleCollectionSearch:', { collectionSlug, collectionNumber });

    const loadingKey = `collection${collectionNumber}`;
    const errorKey = `collection${collectionNumber}`;

    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(prev => ({ ...prev, [errorKey]: null }));

    try {
      // New API endpoint doesn't use timestamps or granularity, pass null/default values
      const result = await fetchFloorPriceHistory(collectionSlug, '1d', null, null, '30d', currency);
      
      if (result.success) {
        const collectionSetter = collectionNumber === 1 ? setCollection1 : setCollection2;
        const properCollectionName = getCollectionName(collectionSlug);
        collectionSetter({
          slug: collectionSlug,
          name: properCollectionName,
          data: result.priceHistory,
          rawData: result.rawData, // Store raw data for currency switching
          granularity: '1d'
        });
        console.log('✅ Successfully updated collection', collectionNumber, properCollectionName);
        
        // Track collection search analytics
        posthog?.capture('collection_searched', {
          collection_slug: collectionSlug,
          collection_number: collectionNumber,
          layout: layout
        });
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


  const clearCollection = (collectionNumber) => {
    const collectionSetter = collectionNumber === 1 ? setCollection1 : setCollection2;
    const errorKey = `collection${collectionNumber}`;
    
    collectionSetter(null);
    setError(prev => ({ ...prev, [errorKey]: null }));
  };

  // Handle swapping collections
  const handleSwapCollections = () => {
    console.log('🔄 Swapping collections');
    
    // Swap the collections
    const tempCollection = collection1;
    setCollection1(collection2);
    setCollection2(tempCollection);
    
    // Swap the loading states
    const tempLoading = loading.collection1;
    setLoading(prev => ({
      ...prev,
      collection1: prev.collection2,
      collection2: tempLoading
    }));
    
    // Swap the error states
    const tempError = error.collection1;
    setError(prev => ({
      ...prev,
      collection1: prev.collection2,
      collection2: tempError
    }));
    
    // Track analytics
    posthog?.capture('collections_swapped', {
      from_collection: collection1?.slug,
      to_collection: collection2?.slug,
      layout: layout
    });
    
    // Add haptic feedback on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(100);
    }
  };

  
  // Handle layout changes with URL sync
  const handleLayoutChange = (newLayout) => {
    console.log('📏 Layout changed to:', newLayout);
    
    // Track layout change analytics
    posthog?.capture('layout_changed', {
      previous_layout: layout,
      new_layout: newLayout,
      has_collection1: !!collection1,
      has_collection2: !!collection2
    });
    
    setLayout(newLayout);
    
    // Ensure we're marked as initialized for URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency) => {
    console.log('💰 Currency changed to:', newCurrency);
    setCurrency(newCurrency);
    
    // Track currency change analytics
    posthog?.capture('currency_changed', {
      previous_currency: currency,
      new_currency: newCurrency,
      has_collection1: !!collection1,
      has_collection2: !!collection2
    });
    
    // No need to re-fetch data - the ChartDisplay will use reformatted data
    console.log('📊 Charts will automatically update with reformatted data');
  };

  // Handle comparison example selection
  const handleComparisonSelect = (slug1, slug2) => {
    console.log('🎯 Quick comparison selected:', { slug1, slug2 });
    
    // Load both collections
    handleCollectionSearch(slug1, 1);
    handleCollectionSearch(slug2, 2);
    
    // Track analytics
    posthog?.capture('quick_comparison_selected', {
      collection1_slug: slug1,
      collection2_slug: slug2,
      is_mobile: isMobile
    });
  };

  return (
    <div className={`relative flex size-full min-h-screen flex-col transition-colors duration-200`} style={{fontFamily: '"Space Grotesk", sans-serif', backgroundColor: isDark ? '#000000' : '#FFF6FB'}}>
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="md:fixed md:top-0 md:left-0 md:right-0 md:z-50 md:shadow-sm md:backdrop-blur-sm w-full overflow-hidden" style={{ backgroundColor: isDark ? 'var(--surface)' : '#FFFFFF', borderBottom: `1px solid ${isDark ? '#333' : 'var(--border)'}` }}>
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            {/* Main header row */}
            <div className="flex items-center justify-between py-4 min-w-0">
              {/* Logo */}
              <div className="flex items-center flex-shrink-0 mr-2" style={{ color: 'var(--text-primary)' }}>
                <a href="https://nftpricefloor.com" className="inline-block hover:opacity-80 transition-opacity">
                  <img 
                    src={isDark ? logoDarkImage : logoLightImage} 
                    alt="NFT Price Floor Logo" 
                    className="h-8 sm:h-10 lg:h-12"
                  />
                </a>
              </div>
              
              {/* Desktop navigation - Centered */}
              <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-sm font-medium flex-1 justify-center">
                <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className={`${isDark ? 'text-gray-500' : 'text-gray-500'} hover:text-[#DD5994] transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-2`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 20h6v-6H2v6zm8-10h6v10h-6V10zm8 4h6v6h-6v-6z"/>
                    <path d="M2 19h6v1H2v-1zm8 1h6v-1h-6v1zm8-3h6v1h-6v-1z"/>
                  </svg>
                  Rankings
                </a>
                <a href="https://nftpricefloor.com/nft-drops" target="_blank" rel="noopener noreferrer" className={`${isDark ? 'text-gray-500' : 'text-gray-500'} hover:text-[#DD5994] transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-2`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L8.5 8.5L2 12l6.5 3.5L12 22l3.5-6.5L22 12l-6.5-3.5L12 2zm0 3.83L14.17 12L12 18.17L9.83 12L12 5.83z"/>
                  </svg>
                  Drops
                </a>
                <a href="https://strategies.nftpricefloor.com" target="_blank" rel="noopener noreferrer" className={`${isDark ? 'text-gray-500' : 'text-gray-500'} hover:text-[#DD5994] transition-colors whitespace-nowrap flex-shrink-0`}>
                  Strategies™
                </a>
                <span className="text-[#DD5994] font-bold whitespace-nowrap flex-shrink-0 flex items-center gap-1.5">
                  Compare
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none border border-white" style={{backgroundColor: 'var(--accent-color)', color: '#fff'}}>
                    New!
                  </span>
                </span>
              </nav>
              
              {/* Right side actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Settings Button */}
                <button
                  onClick={() => {
                    // Add haptic feedback on mobile
                    if (window.navigator && window.navigator.vibrate) {
                      window.navigator.vibrate(1);
                    }
                    setIsSettingsOpen(true);
                  }}
                  className={`w-10 h-10 flex items-center justify-center rounded-none border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isDark 
                      ? 'bg-gray-900 border-white text-white hover:bg-[var(--accent-color)] hover:text-black shadow-[2px_2px_0px_#ffffff]' 
                      : 'bg-white border-black text-black hover:bg-[var(--accent-color)] shadow-[2px_2px_0px_#000000]'
                  }`}
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <div className="flex flex-1 flex-col py-4 sm:py-8 pb-20 md:pb-8 md:pt-20">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col flex-1">
            {/* Breadcrumb Navigation (hidden on mobile) */}
            <nav className={`hidden md:flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 mt-4`}>
              <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#DD5994] transition-colors">
                Home
              </a>
              <span>→</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Chart Comparison</span>
            </nav>
            
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-left" style={{ color: 'var(--text-primary)' }}>
                Collection Comparison
              </h1>
            </div>
            
            {/* Comparison Examples */}
            <ComparisonExamples 
              onSelectComparison={handleComparisonSelect}
              isMobile={isMobile}
              onOpenSearch={() => searchBar1Ref.current?.click()}
            />
            
            {/* Search Controls */}
            <div className="flex flex-col min-[767px]:flex-row items-center gap-4 md:gap-6 pb-6">
              <div className="w-full md:flex-1">
                <SearchBar
                  ref={searchBar1Ref}
                  placeholder="Search for a collection A"
                  onSearch={(slug) => handleCollectionSearch(slug, 1)}
                  onClear={() => clearCollection(1)}
                  loading={loading.collection1}
                  error={error.collection1}
                  selectedCollection={collection1}
                />
              </div>
              
              {/* Swap Button */}
              {collection1 && collection2 && (
                <div className="flex-shrink-0">
                  <button
                    onClick={handleSwapCollections}
                    className="flex items-center gap-2 px-4 py-2 border-2 rounded-none text-sm font-bold text-white hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                    style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: '#E3579A',
                      transition: 'background-color 0.2s ease, transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#D1477C'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#E3579A'}
                    title="Swap collections"
                  >
                    <span className="material-symbols-outlined text-lg">swap_horiz</span>
                    <span className="hidden sm:inline">Swap Collections</span>
                    <span className="sm:hidden">Swap</span>
                  </button> 
                </div>
              )}
              
              <div className="w-full md:flex-1">
                <SearchBar 
                  placeholder="Search for a collection B"
                  onSearch={(slug) => handleCollectionSearch(slug, 2)}
                  onClear={() => clearCollection(2)}
                  loading={loading.collection2}
                  error={error.collection2}
                  selectedCollection={collection2}
                />
              </div>
            </div>
            
            
            {/* Price Banner */}
            <PriceBanner 
              collection1={collection1}
              collection2={collection2}
            />
            
            {/* Charts Section */}
            <div className="flex flex-1 min-h-[500px]" id="chart-container">
              {/* Always use stacked layout (vertical is default) */}
              <div className="w-full h-full flex flex-col">
                <div className="flex-1">
                  <ChartDisplay 
                    collection={reformatCollectionData(collection1, currency)}
                    collection2={reformatCollectionData(collection2, currency)}
                    title="Floor Price Comparison"
                    loading={loading.collection1 || loading.collection2}
                    error={error.collection1 || error.collection2}
                    isComparison={true}
                    currency={currency}
                  />
                </div>
              </div>
            </div>
            
            {/* Screenshot and Share Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3 py-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <CurrencySwitch 
                  currency={currency}
                  onCurrencyChange={handleCurrencyChange}
                />
                <ScreenshotShare 
                  targetId="chart-container"
                  collection1={collection1}
                  collection2={collection2}
                  layout={layout}
                />
              </div>
            </div>
            
            {/* Collection Metrics */}
            <div className="mt-8">
              <CollectionMetrics 
                collection1={collection1}
                collection2={collection2}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 border-solid px-4 py-3 z-[1000000]" style={{ backgroundColor: isDark ? 'var(--surface)' : '#FFFFFF', borderColor: 'var(--border)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-around gap-2">
          <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-500'} hover:text-[#DD5994] transition-colors min-w-0`}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 20h6v-6H2v6zm8-10h6v10h-6V10zm8 4h6v6h-6v-6z"/>
              <path d="M2 19h6v1H2v-1zm8 1h6v-1h-6v1zm8-3h6v1h-6v-1z"/>
            </svg>
            <span className="text-xs font-medium truncate">Rankings</span>
          </a>
          <a href="https://nftpricefloor.com/nft-drops" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-500'} hover:text-[#DD5994] transition-colors min-w-0`}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L8.5 8.5L2 12l6.5 3.5L12 22l3.5-6.5L22 12l-6.5-3.5L12 2zm0 3.83L14.17 12L12 18.17L9.83 12L12 5.83z"/>
            </svg>
            <span className="text-xs font-medium truncate">Drops</span>
          </a>
          <a href="https://strategies.nftpricefloor.com" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-500'} hover:text-[#DD5994] transition-colors min-w-0`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-medium truncate">Strategies™</span>
          </a>
          <div className="flex flex-col items-center gap-1 text-[#DD5994] min-w-0 relative">
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1 py-0.5 rounded-none border border-black" style={{backgroundColor: 'var(--accent-color)', color: '#000', lineHeight: '1'}}>
                New!
              </span>
            </div>
            <span className="text-xs font-bold truncate">Compare</span>
          </div>
        </div>
      </nav>
      
      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Footer */}
      <footer className="border-t mt-auto w-full overflow-x-hidden" style={{ backgroundColor: isDark ? 'var(--surface)' : '#FFFFFF', borderColor: isDark ? '#333' : 'var(--border)' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Company Info */}
            <div className="col-span-1">
              <a href="https://nftpricefloor.com" className="inline-block hover:opacity-80 transition-opacity">
                <img 
                  src={isDark ? logoDarkImage : logoLightImage} 
                  alt="NFT Price Floor Logo" 
                  className="h-8 mb-4"
                />
              </a>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                Track and compare NFT floor prices across all major collections. Get real-time data and historical insights.
              </p>
              <div className="flex space-x-4">
                <a href="https://twitter.com/nftpricefloor" target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://discord.gg/nftpricefloor" target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </a>
                <a href="https://t.me/nftpricefloor" target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787L22.952 5.25c.309-1.239-.473-1.8-1.287-1.533z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="col-span-1">
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>Explore</h3>
              <ul className="space-y-3">
                <li><a href="https://nftpricefloor.com" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Rankings</a></li>
                <li><a href="https://nftpricefloor.com/nft-drops" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">NFT Drops</a></li>
                <li><a href="https://nftpricefloor.com/nft-news" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Live News</a></li>
                <li><a href="https://nftpricefloor.com/wallet-tracker" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Wallet Tracker</a></li>
              </ul>
            </div>
            
            {/* Tools */}
            <div className="col-span-1">
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>More</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Price Comparison</a></li>
                <li><a href="#" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Brokerage</a></li>
                <li><a href="#" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">API</a></li>
                <li><a href="#" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Ads</a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Section */}
          <div className={`flex flex-col md:flex-row justify-between items-center pt-8 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-600 text-sm">© 2025 NFTPriceFloor. All rights reserved.</p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Privacy Policy</a>
                <a href="#" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Terms of Service</a>
                <a href="#" className="text-gray-600 hover:text-[#DD5994] text-sm transition-colors">Contact</a>
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
