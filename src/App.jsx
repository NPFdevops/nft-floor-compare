import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import ChartDisplay from './components/ChartDisplay';
import LayoutToggle from './components/LayoutToggle';
import ScreenshotShare from './components/ScreenshotShare';
import { fetchFloorPriceHistory } from './services/nftAPI';
import './App.css';

function App() {
  const [collection1, setCollection1] = useState(null);
  const [collection2, setCollection2] = useState(null);
  const [layout, setLayout] = useState('horizontal'); // 'horizontal' or 'vertical'
  const [loading, setLoading] = useState({ collection1: false, collection2: false });
  const [error, setError] = useState({ collection1: null, collection2: null });

  const handleCollectionSearch = async (collectionSlug, collectionNumber) => {
    if (!collectionSlug) return;

    const loadingKey = `collection${collectionNumber}`;
    const errorKey = `collection${collectionNumber}`;

    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(prev => ({ ...prev, [errorKey]: null }));

    try {
      const result = await fetchFloorPriceHistory(collectionSlug);
      
      if (result.success) {
        const collectionSetter = collectionNumber === 1 ? setCollection1 : setCollection2;
        collectionSetter({
          slug: collectionSlug,
          name: result.collectionName,
          data: result.priceHistory
        });
      } else {
        setError(prev => ({ ...prev, [errorKey]: result.error }));
      }
    } catch (err) {
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>NFT Floor Price Compare</h1>
        <p>Compare floor price charts of two NFT collections side-by-side</p>
      </header>

      <div className="controls">
        <div className="search-controls">
          <SearchBar
            placeholder="Search first collection..."
            onSearch={(slug) => handleCollectionSearch(slug, 1)}
            onClear={() => clearCollection(1)}
            loading={loading.collection1}
            error={error.collection1}
            selectedCollection={collection1}
          />
          <SearchBar
            placeholder="Search second collection..."
            onSearch={(slug) => handleCollectionSearch(slug, 2)}
            onClear={() => clearCollection(2)}
            loading={loading.collection2}
            error={error.collection2}
            selectedCollection={collection2}
          />
        </div>
        
        <div className="layout-controls">
          <LayoutToggle layout={layout} onLayoutChange={setLayout} />
          <ScreenshotShare targetId="chart-container" />
        </div>
      </div>

      <main className={`chart-container ${layout}`} id="chart-container">
        <ChartDisplay
          collection1={collection1}
          collection2={collection2}
          layout={layout}
          loading={loading}
        />
      </main>

      <footer className="app-footer">
        <p>Data provided by NFT Price Floor API</p>
      </footer>
    </div>
  );
}

export default App;
