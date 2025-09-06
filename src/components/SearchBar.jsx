import React, { useState, useRef, useEffect } from 'react';
import { searchCollections } from '../services/nftAPI';

const SearchBar = ({ 
  placeholder, 
  onSearch, 
  onClear, 
  loading, 
  error, 
  selectedCollection 
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (selectedCollection) {
      setQuery(selectedCollection.name);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [selectedCollection]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.trim().length > 2) {
      debounceTimer.current = setTimeout(() => {
        searchForCollections(value.trim());
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const searchForCollections = async (searchQuery) => {
    setSearchLoading(true);
    
    try {
      const result = await searchCollections(searchQuery);
      
      if (result.success) {
        setSuggestions(result.collections);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSuggestionClick = (collection) => {
    setQuery(collection.name);
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch(collection.slug);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // If no suggestions shown, treat the input as a direct slug
      onSearch(query.trim().toLowerCase().replace(/\s+/g, '-'));
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClear();
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            className={`search-input ${error ? 'error' : ''} ${loading ? 'loading' : ''}`}
            disabled={loading}
          />
          
          {loading && <div className="search-spinner">⏳</div>}
          
          {query && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        
        <button 
          type="submit" 
          className="search-button"
          disabled={loading || !query.trim()}
        >
          Search
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((collection, index) => (
            <div
              key={collection.slug || index}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(collection)}
            >
              <div className="suggestion-main">
                <span className="suggestion-name">{collection.name}</span>
                {collection.floor_price && (
                  <span className="suggestion-price">
                    {collection.floor_price} {collection.currency || 'ETH'}
                  </span>
                )}
              </div>
              {collection.description && (
                <div className="suggestion-description">
                  {collection.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {searchLoading && (
        <div className="search-status">Searching collections...</div>
      )}

      {error && (
        <div className="search-error">
          Error: {error}
        </div>
      )}

      {selectedCollection && (
        <div className="selected-collection">
          <span className="collection-name">{selectedCollection.name}</span>
          <button onClick={handleClear} className="remove-collection">
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
