import axios from 'axios';
import { cacheService } from './cacheService';

const API_BASE_URL = `https://${import.meta.env.VITE_RAPIDAPI_HOST}`;
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

// Create axios instance with RapidAPI headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': import.meta.env.VITE_RAPIDAPI_HOST
  }
});

/**
 * Convert API response array to Chart.js compatible format
 * @param {Array} apiData - Array of price data objects from API
 * @returns {Array} Array of {x: Date, y: price} objects
 */
const formatPriceData = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) {
    console.log('formatPriceData: No data or not array:', apiData);
    return [];
  }
  
  console.log('formatPriceData: Processing', apiData.length, 'data points');
  console.log('formatPriceData: Sample data point:', apiData[0]);
  
  return apiData.map((dataPoint, index) => {
    // Handle different timestamp formats (seconds, milliseconds, or microseconds)
    let timestamp = dataPoint.timestamp;
    if (timestamp > 1e12) {
      // Likely microseconds, convert to milliseconds
      timestamp = timestamp / 1000;
    } else if (timestamp < 1e10) {
      // Likely seconds, convert to milliseconds
      timestamp = timestamp * 1000;
    }
    // Otherwise assume it's already in milliseconds
    
    const result = {
      x: new Date(timestamp),
      y: parseFloat(dataPoint.lowestNative) || 0
    };
    
    if (index < 3) {
      console.log(`formatPriceData[${index}]:`, {
        originalTimestamp: dataPoint.timestamp,
        convertedTimestamp: timestamp,
        date: result.x,
        price: result.y
      });
    }
    
    return result;
  }).sort((a, b) => a.x - b.x); // Sort by date ascending
};

/**
 * Fetch floor price history for a specific NFT collection with smart caching
 * @param {string} collectionSlug - The collection identifier/slug
 * @param {string} granularity - Time granularity ('1d', '1h', etc.)
 * @param {number} startTimestamp - Start timestamp in seconds (optional)
 * @param {number} endTimestamp - End timestamp in seconds (optional)
 * @param {string} timeframe - Timeframe for cache TTL ('30d', '90d', '1Y', 'YTD')
 * @returns {Promise<Object>} Floor price data with timestamps and prices
 */
export const fetchFloorPriceHistory = async (collectionSlug, granularity = '1d', startTimestamp = null, endTimestamp = null, timeframe = '30d') => {
  try {
    // Use provided timestamps or default to last 30 days
    const endTime = endTimestamp || Math.floor(Date.now() / 1000);
    const startTime = startTimestamp || (endTime - (30 * 24 * 60 * 60));
    
    // Generate cache key with timeframe
    const cacheKey = cacheService.generateCacheKey(collectionSlug, granularity, startTime, endTime, timeframe);
    
    // Try to get from cache first (multi-layer cache)
    const cachedData = await cacheService.get(cacheKey, timeframe);
    if (cachedData) {
      console.log(`✅ Using cached data for ${collectionSlug} (${timeframe})`);
      return cachedData;
    }
    
    console.log(`🔄 Fetching fresh data for ${collectionSlug} (${timeframe})`);
    console.log('API request params:', {
      collectionSlug,
      granularity,
      startTime,
      endTime,
      startDate: new Date(startTime * 1000),
      endDate: new Date(endTime * 1000)
    });
    
    const response = await apiClient.get(
      `/projects/${collectionSlug}/history/pricefloor/${granularity}`,
      {
        params: {
          start: startTime,
          end: endTime
        }
      }
    );
    
    console.log('API response status:', response.status);
    console.log('API response data type:', typeof response.data, Array.isArray(response.data));
    console.log('API response data length:', response.data?.length);
    
    const data = response.data;
    const formattedPriceHistory = formatPriceData(data);
    
    console.log('Formatted price history length:', formattedPriceHistory.length);
    if (formattedPriceHistory.length > 0) {
      console.log('First formatted data point:', formattedPriceHistory[0]);
      console.log('Last formatted data point:', formattedPriceHistory[formattedPriceHistory.length - 1]);
    }
    
    // Extract collection name from first data point
    const collectionName = data.length > 0 ? (data[0].slug || data[0].collection || collectionSlug) : collectionSlug;
    
    const result = {
      success: true,
      data: data,
      collectionName: collectionName,
      priceHistory: formattedPriceHistory,
      rawData: {
        dataPoints: data,
        timestamps: data.map(d => d.timestamp),
        floorEth: data.map(d => d.lowestNative),
        floorUsd: data.map(d => d.lowestUsd)
      }
    };
    
    console.log('Final result object:', {
      success: result.success,
      collectionName: result.collectionName,
      priceHistoryLength: result.priceHistory.length,
      hasData: result.data && result.data.length > 0
    });
    
    // Cache the result with timeframe-aware TTL
    await cacheService.set(cacheKey, result, timeframe);
    
    return result;
  } catch (error) {
    console.error(`Error fetching floor price for ${collectionSlug}:`, error);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null
    };
  }
};

// Import collections from data file
import { TOP_COLLECTIONS } from '../data/collections';

/**
 * Search for NFT collections by name
 * Note: RapidAPI may not have a search endpoint, so we provide common collections
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of collection suggestions
 */
export const searchCollections = async (query) => {
  try {
    // Filter top collections based on query
    const filteredCollections = TOP_COLLECTIONS.filter(collection =>
      collection.name.toLowerCase().includes(query.toLowerCase()) ||
      collection.slug.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      success: true,
      collections: filteredCollections.slice(0, 10) // Limit to 10 results
    };
  } catch (error) {
    console.error('Error searching collections:', error);
    
    return {
      success: false,
      error: error.message,
      collections: []
    };
  }
};

/**
 * Get current floor price for a collection
 * This will use the latest data from the history endpoint
 * @param {string} collectionSlug - The collection identifier/slug
 * @returns {Promise<Object>} Current floor price data
 */
export const getCurrentFloorPrice = async (collectionSlug) => {
  try {
    // Get recent 1-day data to extract current floor price
    const result = await fetchFloorPriceHistory(collectionSlug, '1d', 1);
    
    if (result.success && result.rawData.floorEth && result.rawData.floorEth.length > 0) {
      const latestIndex = result.rawData.floorEth.length - 1;
      return {
        success: true,
        data: {
          floor_price_eth: result.rawData.floorEth[latestIndex],
          floor_price_usd: result.rawData.floorUsd?.[latestIndex],
          timestamp: result.rawData.timestamps?.[latestIndex]
        },
        floorPrice: result.rawData.floorEth[latestIndex],
        currency: 'ETH'
      };
    } else {
      return {
        success: false,
        error: 'No current price data available',
        data: null
      };
    }
  } catch (error) {
    console.error(`Error fetching current floor price for ${collectionSlug}:`, error);
    
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};
