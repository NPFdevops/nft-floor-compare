import React, { useState, useRef, useEffect } from 'react';
import { collectionsService } from '../services/collectionsService';
import { generateLegacyCollectionImage } from '../data/collections.js';

const SearchBar = ({ 
  placeholder, 
  onSearch, 
  onClear, 
  loading, 
  error, 
  selectedCollection 
}) => {
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
    
    // Keep dropdown open while typing
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputClick = () => {
    setIsDropdownOpen(true);
    if (!query.trim()) {
      const filtered = collectionsService.searchCollections('', 20);
      setFilteredCollections(filtered);
    }
  };

  const handleCollectionSelect = (collection) => {
    setQuery(collection.name);
    setIsDropdownOpen(false);
    onSearch(collection.slug);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
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
      <form onSubmit={handleSubmit} className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl" style={{ color: 'var(--text-primary)' }}>search</span>
        <input 
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onClick={handleInputClick}
          placeholder={placeholder}
          className="form-input w-full rounded-none focus:outline-0 focus:ring-2 focus:ring-[var(--accent-color)] border-2 h-14 px-12 text-base font-medium leading-normal"
          style={{
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}></div>
          </div>
        )}
        
        {query && !loading && !collectionsState.isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-base">close</span>
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
};

export default SearchBar;
