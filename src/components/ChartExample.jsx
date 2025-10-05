import React, { useState, useEffect } from 'react';
import TradingViewChart from './TradingViewChart';
import { fetchFloorPriceHistory } from '../services/nftAPI';

/**
 * Example component demonstrating how to render TradingView chart
 * with data from NFTPriceFloor API endpoint: /projects/azuki/charts/1d
 */
const ChartExample = () => {
  const [collectionData, setCollectionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Example: Load Azuki collection data
  useEffect(() => {
    loadCollectionData('azuki');
  }, []);

  const loadCollectionData = async (collectionSlug) => {
    setLoading(true);
    setError(null);
    
    console.log(`🔄 Loading data for ${collectionSlug}...`);
    
    try {
      // This calls the NFTPriceFloor API: nftpf-api-v0.p.rapidapi.com/projects/azuki/charts/1d
      const result = await fetchFloorPriceHistory(collectionSlug);
      
      if (result.success) {
        console.log('✅ Raw API response:', result);
        
        // The API returns data in this format:
        // {
        //   success: true,
        //   data: { timestamps: [...], floorNative: [...], slug: 'azuki' },
        //   collectionName: 'Azuki',
        //   priceHistory: [{ x: Date, y: number }, ...], // <- This is what TradingViewChart needs
        //   rawData: { timestamps: [...], floorEth: [...], floorUsd: [...] }
        // }
        
        const chartCollection = {
          slug: collectionSlug,
          name: result.collectionName || collectionSlug,
          data: result.priceHistory, // Array of { x: Date, y: price } objects
          granularity: '1d'
        };
        
        console.log('📊 Prepared chart data:', {
          collection: chartCollection.name,
          dataPoints: chartCollection.data?.length,
          sampleData: chartCollection.data?.slice(0, 3),
          dateRange: {
            from: chartCollection.data?.[0]?.x,
            to: chartCollection.data?.[chartCollection.data.length - 1]?.x
          }
        });
        
        setCollectionData(chartCollection);
      } else {
        setError(result.error || 'Failed to load collection data');
        console.error('❌ API error:', result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Error loading collection:', err);
    } finally {
      setLoading(false);
    }
  };

  // Example of the data format that TradingViewChart expects:
  const exampleDataFormat = {
    // Each collection object should have:
    slug: "azuki",
    name: "Azuki", 
    data: [
      // Array of price points in format: { x: Date, y: price }
      { x: new Date('2024-01-01'), y: 12.5 },
      { x: new Date('2024-01-02'), y: 11.8 },
      { x: new Date('2024-01-03'), y: 13.2 },
      // ... more data points
    ],
    granularity: "1d"
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">TradingView Chart with NFTPriceFloor API</h1>
        <p className="text-gray-600">
          Example showing how to render charts with data from <code>nftpf-api-v0.p.rapidapi.com/projects/azuki/charts/1d</code>
        </p>
      </div>

      {/* Collection Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Test Different Collections:</label>
        <div className="flex gap-2 flex-wrap">
          {['azuki', 'cryptopunks', 'bored-ape-yacht-club', 'mutant-ape-yacht-club'].map(slug => (
            <button
              key={slug}
              onClick={() => loadCollectionData(slug)}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {slug}
            </button>
          ))}
        </div>
      </div>

      {/* Debug Info */}
      {collectionData && (
        <div className="mb-6 p-4 bg-gray-50 rounded border">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify({
              collection: collectionData.name,
              slug: collectionData.slug,
              dataPoints: collectionData.data?.length,
              firstPoint: collectionData.data?.[0],
              lastPoint: collectionData.data?.[collectionData.data?.length - 1],
              samplePoints: collectionData.data?.slice(0, 3)
            }, null, 2)}
          </pre>
        </div>
      )}

      {/* Chart Display */}
      <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2">Loading collection data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          </div>
        ) : collectionData ? (
          <TradingViewChart
            collections={[collectionData]} // Pass array of collection objects
            title={`${collectionData.name} Floor Price Chart`}
            height={500}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a collection to view its chart</p>
          </div>
        )}
      </div>

      {/* Data Format Documentation */}
      <div className="mt-8 p-4 bg-yellow-50 rounded border border-yellow-200">
        <h3 className="font-bold mb-2">📚 Data Format Reference</h3>
        <p className="text-sm mb-3">
          The TradingViewChart component expects collections in this format:
        </p>
        <pre className="text-xs bg-white p-3 rounded border overflow-auto">
{`// NFTPriceFloor API Response Format:
{
  "timestamps": [1640995200, 1641081600, ...],  // Unix timestamps (seconds)
  "floorNative": [12.5, 11.8, 13.2, ...],      // Floor prices in ETH
  "floorUsd": [45000, 42500, 47600, ...],       // Floor prices in USD
  "slug": "azuki"
}

// Transformed to TradingViewChart format:
{
  slug: "azuki",
  name: "Azuki",
  data: [
    { x: new Date(1640995200 * 1000), y: 12.5 },  // { x: Date, y: price }
    { x: new Date(1641081600 * 1000), y: 11.8 },
    { x: new Date(1641168000 * 1000), y: 13.2 },
    // ... more data points
  ],
  granularity: "1d"
}`}
        </pre>
      </div>
    </div>
  );
};

export default ChartExample;