import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from './components/SearchBar';
import ChartDisplay from './components/ChartDisplay';
import ScreenshotShare from './components/ScreenshotShare';
import CacheStats from './components/CacheStats';
import CollectionMetrics from './components/CollectionMetrics';
import PriceBanner from './components/PriceBanner';
import CurrencySwitch from './components/CurrencySwitch';
import { fetchFloorPriceHistory } from './services/nftAPI';
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
  const [layout, setLayout] = useState(initialUrlState.layout || 'vertical'); // Initialize from URL, default to vertical (stacked)
  const [loading, setLoading] = useState({ collection1: false, collection2: false });
  const [error, setError] = useState({ collection1: null, collection2: null });
  const [isInitialized, setIsInitialized] = useState(false); // Track if URL initialization is complete
  const [isMobile, setIsMobile] = useState(false); // Track if viewport is mobile size
  const [currency, setCurrency] = useState('ETH'); // Track currency display (ETH or USD)
  
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
        posthogService.track('collection_searched', {
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
    posthogService.track('collections_swapped', {
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
    posthogService.track('layout_changed', {
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
    posthogService.track('currency_changed', {
      previous_currency: currency,
      new_currency: newCurrency,
      has_collection1: !!collection1,
      has_collection2: !!collection2
    });
    
    // No need to re-fetch data - the ChartDisplay will use reformatted data
    console.log('📊 Charts will automatically update with reformatted data');
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
              <a 
                href="https://nftpricefloor.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity duration-200"
                title="Visit NFT Price Floor"
              >
                <img 
                  src={logoImage} 
                  alt="NFT Price Floor Logo" 
                  className="hidden sm:block h-10 lg:h-12" 
                />
              </a>
              {/* Mobile logo - visible only on mobile */}
              <a 
                href="https://nftpricefloor.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity duration-200"
                title="Visit NFT Price Floor"
              >
                <img 
                  src={mobileLogoImage} 
                  alt="NFT Price Floor Logo" 
                  className="block sm:hidden h-8" 
                />
              </a>
            </div>
            {/* Centered navigation for desktop */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium absolute left-1/2 transform -translate-x-1/2">
              <a href="https://nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
                Rankings
              </a>
              <a href="https://nftpricefloor.com/nft-drops" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
                Drops
              </a>
              <a href="https://strategies.nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black transition-colors">
                Strategies<sup className="text-xs">TM</sup>
              </a>
              <span className="text-black font-semibold border-b-2 border-black pb-1">
                Compare
              </span>
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
            
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black text-left">
                Collection Comparison
              </h1>
            </div>
            
            {/* Search Controls */}
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 pb-6">
              <div className="w-full md:flex-1">
                <SearchBar 
                  placeholder="Search for a collection"
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
                    className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-none text-sm font-bold text-white hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                    style={{ 
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
                  placeholder="Search for a collection"
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
          <a href="https://strategies.nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-600 hover:text-black transition-colors min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-medium truncate">Strategies<sup className="text-[8px]">TM</sup></span>
          </a>
          <div className="flex flex-col items-center gap-1 text-black min-w-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-bold truncate border-b-2 border-black">Compare</span>
          </div>
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
                <li><a href="https://strategies.nftpricefloor.com/" className="text-gray-600 hover:text-black text-sm transition-colors">Strategies</a></li>
                <li><a href="https://compare.nftpricefloor.com/" className="text-gray-600 hover:text-black text-sm transition-colors">Compare</a></li>
              </ul>
            </div>
            
            {/* Tools */}
            <div className="col-span-1">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wide mb-4">More</h3>
              <ul className="space-y-3">
                <li><a href="https://nftpricefloor.com/top-nft-sales" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black text-sm transition-colors">Top NFT Sales</a></li>
                <li><a href="https://nftpricefloor.com/brokerage" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black text-sm transition-colors">Brokerage</a></li>
                <li><a href="https://nft-api.nftpricefloor.com/?utm=nftpricefloor.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black text-sm transition-colors">API</a></li>
                <li><a href="https://nftpricefloor.com/nft-ads-placement" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black text-sm transition-colors">Ads</a></li>
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
