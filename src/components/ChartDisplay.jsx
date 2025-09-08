import React from 'react';
import TradingViewChart from './TradingViewChart';

const ChartDisplay = ({ collection, collection2, title, loading, error, timeframe, onRangeChange, isComparison }) => {
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4" style={{ minHeight: '350px' }}>
      <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      <p className="text-black text-lg font-medium text-center px-6">Loading collection data...</p>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4" style={{ minHeight: '350px' }}>
      <div className="text-gray-400 text-6xl">
        <span className="material-symbols-outlined text-6xl">search</span>
      </div>
      <p className="text-gray-600 text-lg font-medium text-center px-6">Select a collection to view its floor price chart</p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4" style={{ minHeight: '350px' }}>
      <div className="text-red-500 text-6xl">
        <span className="material-symbols-outlined text-6xl">error</span>
      </div>
      <p className="text-red-600 text-lg font-medium text-center px-6">{error}</p>
    </div>
  );

  const getFloorPrice = (collectionData = collection) => {
    if (!collectionData?.data || collectionData.data.length === 0) return null;
    const latestData = collectionData.data[collectionData.data.length - 1];
    return latestData?.floorEth || 0;
  };

  const getPriceChange = (collectionData = collection) => {
    if (!collectionData?.data || collectionData.data.length < 2) return null;
    const latestPrice = collectionData.data[collectionData.data.length - 1]?.floorEth || 0;
    const previousPrice = collectionData.data[0]?.floorEth || 0;
    if (previousPrice === 0) return null;
    return ((latestPrice - previousPrice) / previousPrice * 100);
  };

  // Handle comparison view (stacked layout with both collections)
  if (isComparison) {
    const collections = [collection, collection2].filter(Boolean);
    
  return (
    <div className="flex flex-col h-full rounded-none border-2 border-black bg-white shadow-[8px_8px_0px_#000000]">
      <div className="flex flex-col border-b-2 border-black px-6 py-4 flex-shrink-0">
        <p className="text-black text-lg font-bold leading-normal">{collections.map(c => c?.name).filter(Boolean).join(' vs ') || 'Floor Price Comparison'}</p>
      </div>
      
      <div className="flex flex-1">
        {loading ? (
          <div className="flex flex-1">{renderLoadingState()}</div>
        ) : error ? (
          <div className="flex flex-1">{renderErrorState()}</div>
        ) : collections.length === 0 ? (
          <div className="flex flex-1">{renderEmptyState()}</div>
        ) : (
          <div className="chart-canvas-container flex-1">
            <TradingViewChart
              collections={collections}
              title={title}
              onRangeChange={onRangeChange}
              height={450}
            />
          </div>
        )}
      </div>
    </div>
  );
  }

  // Handle individual collection view (side-by-side layout)
  const floorPrice = getFloorPrice();
  const priceChange = getPriceChange();

  return (
    <div className="flex flex-col h-full rounded-none border-2 border-black bg-white shadow-[8px_8px_0px_#000000]">
      <div className="flex flex-col border-b-2 border-black px-6 py-4 flex-shrink-0">
        <p className="text-black text-lg font-bold leading-normal">{collection?.name || title}</p>
      </div>
      <div className="flex flex-1">
        {loading ? (
          <div className="flex flex-1">{renderLoadingState()}</div>
        ) : error ? (
          <div className="flex flex-1">{renderErrorState()}</div>
        ) : !collection ? (
          <div className="flex flex-1">{renderEmptyState()}</div>
        ) : (
          <div className="chart-canvas-container flex-1">
            <TradingViewChart
              collections={[collection]}
              title={title}
              onRangeChange={onRangeChange}
              height={420}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartDisplay;
