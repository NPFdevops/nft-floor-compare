import React, { useState, useRef, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import { collectionsService } from '../services/collectionsService';
import { generateLegacyCollectionImage } from '../data/collections.js';
import { safeCapture, getDeviceType, sanitizeError } from '../utils/analytics';

const SearchBar = React.forwardRef(({ 
  placeholder, 
  onSearch, 
  onClear, 
  loading, 
  error, 
  selectedCollection 
}, ref) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredCollections, setFilteredCollections] = useState([]);
  const [collectionsState, setCollectionsState] = useState({
    collections: [],
    isLoading: false,
    error: null
  });
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);
  const posthog = usePostHog();
  const deviceType = getDeviceType();
  
  // Determine slot based on placeholder
  const slot = placeholder.includes('A') ? '1' : '2';

  // Subscribe to collections service updates
  useEffect(() => {
    const unsubscribe = collectionsService.subscribe((state) => {
      setCollectionsState(state);
    });

    // Initialize with current state
    setCollectionsState({
      collections: collectionsService.getCollections(),
      isLoading: collectionsService.getLoadingState(),
      error: collectionsService.getError()
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      setQuery(selectedCollection.name);
      setIsDropdownOpen(false);
    }
  }, [selectedCollection]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Filter collections using the collections service
    const filtered = collectionsService.searchCollections(value, 20);
    setFilteredCollections(filtered);
    
    // Debounced analytics tracking
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (value.length >= 3) {
        safeCapture(posthog, 'search_query_typed', {
          q: value.substring(0, 50), // Truncate for safety
          q_len: value.length,
          debounce_ms: 300,
          suggestions_count: filtered.length,
          slot: slot
        });
      }
    }, 300);
    
    // Keep dropdown open while typing
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputClick = () => {
    // Track search input focus
    safeCapture(posthog, 'search_input_focused', {
      slot: slot,
      device_type: deviceType,
      has_existing_query: query.length > 0
    });
    
    setIsDropdownOpen(true);
    if (!query.trim()) {
      const filtered = collectionsService.searchCollections('', 20);
      setFilteredCollections(filtered);
    }
  };

  const handleCollectionSelect = (collection) => {
    // Track collection selection
    safeCapture(posthog, 'collection_selected', {
      slot: slot,
      collection_slug: collection.slug,
      collection_name: collection.name,
      source: 'dropdown',
      device_type: deviceType,
      ranking: collection.ranking
    });
    
    setQuery(collection.name);
    setIsDropdownOpen(false);
    onSearch(collection.slug);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    // Track search clear
    safeCapture(posthog, 'search_cleared', {
      slot: slot,
      had_query: query.length > 0
    });
    
    setQuery('');
    setIsDropdownOpen(false);
    setFilteredCollections([]);
    onClear();
    inputRef.current?.focus();
  };

  /**
   * Handle image loading errors with graceful fallbacks
   * @param {Event} event - Image error event
   * @param {string} slug - Collection slug for fallback generation
   */
  const handleImageError = (event, slug) => {
    const img = event.target;
    const currentSrc = img.src;
    
    // Check if we're already showing a fallback to prevent infinite loops
    if (currentSrc.includes('api.dicebear.com') || currentSrc.includes('ui-avatars.com')) {
      return;
    }
    
    // If NFTPriceFloor CDN failed, try legacy high-quality image
    if (currentSrc.includes('cdn.nftpricefloor')) {
      console.log(`🖼️ NFTPriceFloor CDN image failed for ${slug}, trying legacy fallback`);
      img.src = generateLegacyCollectionImage(slug);
      return;
    }
    
    // If legacy image failed, use dicebear as final fallback
    console.log(`🖼️ Legacy image failed for ${slug}, using dicebear fallback`);
    img.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${slug}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="relative overflow-hidden">
        <div className="absolute left-3 inset-y-0 pointer-events-none flex items-center justify-center" style={{ width: '24px' }}>
          <span className="material-symbols-outlined text-xl" style={{ color: 'var(--text-primary)', fontSize: '20px' }}>search</span>
        </div>
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          type="text"
          value={query}
          onChange={handleInputChange}
          onClick={handleInputClick}
          placeholder={placeholder}
          className="form-input w-full rounded-none focus:outline-0 focus:ring-2 focus:ring-[var(--accent-color)] border-2 h-14 text-base font-medium leading-none"
          style={{
            paddingLeft: '44px',
            paddingRight: '44px',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)',
            borderColor: error ? '#ef4444' : 'var(--border)',
            opacity: loading ? 0.5 : 1,
            cursor: loading ? 'not-allowed' : 'text'
          }}
          disabled={loading}
          autoComplete="off"
        />
        
        {(loading || collectionsState.isLoading) && (
          <div className="absolute right-3 inset-y-0 flex items-center justify-center" style={{ width: '24px' }}>
            <div className="animate-spin border-2 border-t-transparent rounded-full" style={{ width: '16px', height: '16px', borderColor: 'var(--border)', borderTopColor: 'transparent' }}></div>
          </div>
        )}
        
        {query && !loading && !collectionsState.isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 inset-y-0 transition-colors flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', width: '24px' }}
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
      </form>

      {isDropdownOpen && (filteredCollections.length > 0 || collectionsState.isLoading) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border-2 max-h-96 overflow-hidden" style={{ fontFamily: 'Space Grotesk, sans-serif', backgroundColor: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '4px 4px 0px var(--border)' }}>
          <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-hover)' }}>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Collections {collectionsState.collections.length > 0 && `(${collectionsState.collections.length})`}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {collectionsState.isLoading && filteredCollections.length === 0 ? (
              <div className="flex items-center justify-center p-6">
                <div className="animate-spin h-6 w-6 border-2 border-t-transparent rounded-full mr-3" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}></div>
                <span className="text-gray-600">Loading collections...</span>
              </div>
            ) : (
              filteredCollections.map((collection) => {
                // Debug logging for image URLs
                console.log(`🖼️ [${collection.slug}] Image URL:`, collection.image);
                return (
                <div
                  key={collection.slug}
                  className="flex items-center p-3 cursor-pointer border-b last:border-b-0"
                  style={{ borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => handleCollectionSelect(collection)}
                >
                  <div className="w-10 h-10 mr-3 flex-shrink-0">
                    <img 
                      src={collection.image} 
                      alt={collection.name}
                      className="w-full h-full object-cover rounded-lg border"
                      style={{ borderColor: 'var(--border)' }}
                      loading="lazy"
                      onError={(e) => handleImageError(e, collection.slug)}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{collection.name}</span>
                    <span className="ml-2 px-2 py-1 text-xs font-bold rounded flex-shrink-0" style={{ color: '#000', backgroundColor: '#ffd700', borderColor: 'var(--border)' }}>
                      #{collection.ranking}
                    </span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {(error || collectionsState.error) && (
        <div className="mt-2 p-3 bg-red-100 border-2 border-red-500 rounded-none">
          <p className="text-red-700 text-sm font-medium">
            Try again, please
            {collectionsState.error && (
              <span className="block mt-1 text-xs">Using cached collections as fallback</span>
            )}
            {error && (
              <span className="block mt-1 text-xs opacity-75">{error}</span>
            )}
          </p>
        </div>
      )}

      {/* Selected collection display hidden per requirements */}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
