import axios from 'axios';
import { cacheService } from './cacheService.js';

// Environment variables validation
const RAPIDAPI_HOST = import.meta.env.VITE_RAPIDAPI_HOST;
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

// Validate required environment variables
const validateEnvironmentVariables = () => {
  const missing = [];
  
  if (!RAPIDAPI_HOST) missing.push('VITE_RAPIDAPI_HOST');
  if (!RAPIDAPI_KEY) missing.push('VITE_RAPIDAPI_KEY');
  
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    console.error('🔴 Environment Variables Error:', error);
    console.error('💡 Make sure to set these variables in Vercel dashboard or your .env file');
    throw new Error(error);
  }
  
  console.log('✅ Environment variables validated successfully');
  console.log('🔑 API Host:', RAPIDAPI_HOST);
  console.log('🔑 API Key:', RAPIDAPI_KEY ? `${RAPIDAPI_KEY.substring(0, 8)}...` : 'Not set');
};

// Validate on module load
try {
  validateEnvironmentVariables();
} catch (error) {
  console.error('❌ API service initialization failed:', error.message);
}

const API_BASE_URL = `https://${RAPIDAPI_HOST}`;

// Create axios instance with RapidAPI headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST,
    'Content-Type': 'application/json',
  },
  timeout: 150000 // 150 seconds - extended timeout for production stability
});

/**
 * Convert API response to Chart.js compatible format
 * @param {Object} apiData - API response object with timestamps and floorNative/floorUsd arrays
 * @param {string} currency - Currency to use ('ETH' or 'USD')
 * @returns {Array} Array of {x: Date, y: price} objects
 */
const formatPriceData = (apiData, currency = 'ETH') => {
  if (!apiData || !apiData.timestamps) {
    console.log('formatPriceData: Invalid data structure:', apiData);
    return [];
  }
  
  const { timestamps, floorNative, floorUsd } = apiData;
  const priceArray = currency === 'USD' ? floorUsd : floorNative;
  
  if (!priceArray) {
    console.log(`formatPriceData: ${currency} price data not available:`, apiData);
    return [];
  }
  
  if (!Array.isArray(timestamps) || !Array.isArray(priceArray)) {
    console.log('formatPriceData: timestamps or price array not arrays');
    return [];
  }
  
  if (timestamps.length !== priceArray.length) {
    console.log('formatPriceData: Mismatched array lengths:', timestamps.length, 'vs', priceArray.length);
    return [];
  }
  
  console.log('formatPriceData: Processing', timestamps.length, 'data points for', currency);
  console.log('formatPriceData: Sample timestamp:', timestamps[0], 'Sample price:', priceArray[0]);
  
  return timestamps.map((timestamp, index) => {
    // New API returns timestamps in milliseconds
    const result = {
      x: new Date(timestamp),
      y: parseFloat(priceArray[index]) || 0
    };
    
    if (index < 3) {
      console.log(`formatPriceData[${index}] (${currency}):`, {
        timestamp: timestamp,
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
 * @param {string} granularity - Time granularity (not used with new endpoint, kept for compatibility)
 * @param {number} startTimestamp - Start timestamp in seconds (not used with new endpoint, kept for compatibility)
 * @param {number} endTimestamp - End timestamp in seconds (not used with new endpoint, kept for compatibility)
 * @param {string} timeframe - Timeframe for cache TTL (not used with new endpoint, kept for compatibility)
 * @param {string} currency - Currency to use ('ETH' or 'USD')
 * @returns {Promise<Object>} Floor price data with timestamps and prices
 */
export const fetchFloorPriceHistory = async (collectionSlug, granularity = '1d', startTimestamp = null, endTimestamp = null, timeframe = '30d', currency = 'ETH') => {
  try {
    // Generate cache key (simplified since new endpoint doesn't use timeframes)
    const cacheKey = `${collectionSlug}-charts-1d`;
    
    // Try to get from cache first (multi-layer cache with stale support)
    const cachedResult = await cacheService.get(cacheKey, '1h', true);
    if (cachedResult && !cachedResult.isStale) {
      console.log(`✅ Using fresh cached data for ${collectionSlug}`);
      return cachedResult.data;
    }
    
    // If we have stale data, return it immediately and fetch fresh in background
    if (cachedResult && cachedResult.isStale) {
      console.log(`⚡ Using stale data for ${collectionSlug}, fetching fresh in background`);
      // Return stale data immediately
      const staleData = cachedResult.data;
      
      // Fetch fresh data in background (don't await)
      fetchFreshData(collectionSlug, cacheKey, currency).catch(err => {
        console.warn('Background refresh failed:', err);
      });
      
      return staleData;
    }
    
    // Use request deduplication to prevent duplicate simultaneous requests
    return await cacheService.deduplicate(cacheKey, async () => {
      return await fetchFreshData(collectionSlug, cacheKey, currency);
    });
  } catch (error) {
    
    console.error(`❌ Error fetching floor price for ${collectionSlug}:`, error);
    
    // Enhanced error handling
    let errorMessage = 'Unknown error occurred';
    let errorDetails = {};
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS resolution failed - Check if the API host is correct';
      errorDetails = { host: RAPIDAPI_HOST };
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout - API took too long to respond';
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      errorMessage = `API Error (${status}): ${error.response.data?.message || error.response.statusText}`;
      errorDetails = {
        status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      };
      
      // Specific handling for common API errors
      if (status === 401) {
        errorMessage = 'Authentication failed - Check your RapidAPI key';
      } else if (status === 403) {
        errorMessage = 'Access forbidden - Check API permissions or subscription status';
      } else if (status === 429) {
        errorMessage = 'Rate limit exceeded - Too many requests';
      } else if (status === 404) {
        errorMessage = `Collection '${collectionSlug}' not found or endpoint unavailable`;
      }
    } else if (error.request) {
      // Network error
      errorMessage = 'Network error - Unable to reach the API';
      errorDetails = { 
        code: error.code,
        message: error.message,
        baseURL: API_BASE_URL
      };
    } else {
      // Other error
      errorMessage = error.message || 'Request setup error';
    }
    
    console.error('🔍 Error details:', {
      message: errorMessage,
      details: errorDetails,
      originalError: error.message,
      apiBaseUrl: API_BASE_URL,
      hasApiKey: !!RAPIDAPI_KEY
    });
    
    return {
      success: false,
      error: errorMessage,
      errorDetails,
      data: null
    };
  }
};

/**
 * Internal function to fetch fresh data from API
 * Separated for reuse in background refresh
 */
async function fetchFreshData(collectionSlug, cacheKey, currency = 'ETH') {
  console.log(`🔄 Fetching fresh data for ${collectionSlug}`);
  console.log('API request params:', {
    collectionSlug,
    endpoint: `/projects/${collectionSlug}/charts/1d`
  });
  
  // Check for cached ETag
  const etagCacheKey = `etag_${cacheKey}`;
  const cachedETagResult = await cacheService.get(etagCacheKey, '30m');
  const cachedETag = cachedETagResult?.data || null;
  
  const requestConfig = {};
  
  // Add If-None-Match header if we have a cached ETag
  if (cachedETag) {
    requestConfig.headers = {
      'If-None-Match': cachedETag
    };
  }
  
  try {
    const response = await apiClient.get(
      `/projects/${collectionSlug}/charts/1d`,
      requestConfig
    );
    
    console.log('API response status:', response.status);
    console.log('API response data structure:', Object.keys(response.data));
    
    const data = response.data;
    const formattedPriceHistory = formatPriceData(data, currency);
    
    // Extract collection name from response
    const collectionName = data.slug || collectionSlug;
    
    const result = {
      success: true,
      data: data,
      collectionName: collectionName,
      priceHistory: formattedPriceHistory,
      rawData: {
        dataPoints: data,
        timestamps: data.timestamps,
        floorEth: data.floorNative,
        floorUsd: data.floorUsd
      }
    };
    
    // Cache the result with 1 hour TTL
    await cacheService.set(cacheKey, result, '1h');
    
    // Cache ETag for future conditional requests
    const etag = response.headers.etag;
    if (etag) {
      await cacheService.set(etagCacheKey, etag, '30m');
    }
    
    return result;
  } catch (error) {
    // Handle 304 Not Modified - return cached data
    if (error.response?.status === 304) {
      console.log(`✅ Using cached data for ${collectionSlug} (304 Not Modified)`);
      const cachedResult = await cacheService.get(cacheKey, '1h', true);
      if (cachedResult) {
        return cachedResult.data;
      }
    }
    throw error;
  }
}

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
 * Fetch top collections from rankings-v2 endpoint with pagination
 * @param {number} limit - Total number of collections to fetch (default: 500)
 * @returns {Promise<Object>} Top collections data
 */
export const fetchTopCollections = async (limit = 500) => {
  try {
    console.log(`🔄 Fetching top ${limit} collections from projects API`);
    
    // Check cache first with stale-while-revalidate
    const cacheKey = `top-collections-${limit}`;
    const cachedResult = await cacheService.get(cacheKey, '1h', true);
    
    if (cachedResult && !cachedResult.isStale) {
      console.log(`✅ Using fresh cached top collections data (${cachedResult.data.collections?.length} collections)`);
      return cachedResult.data;
    }
    
    // If we have stale data, return it and fetch fresh in background
    if (cachedResult && cachedResult.isStale) {
      console.log(`⚡ Using stale collections data, refreshing in background`);
      
      // Fetch fresh in background
      fetchFreshCollections(limit, cacheKey).catch(err => {
        console.warn('Background collections refresh failed:', err);
      });
      
      return cachedResult.data;
    }
    
    // Use request deduplication
    return await cacheService.deduplicate(cacheKey, async () => {
      return await fetchFreshCollections(limit, cacheKey);
    });
  } catch (error) {
    console.error('❌ Error fetching top collections:', error);
    
    let errorMessage = 'Failed to fetch top collections';
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        errorMessage = 'Projects endpoint not found - API may have changed';
      } else if (status === 429) {
        errorMessage = 'Rate limit exceeded while fetching collections';
      } else {
        errorMessage = `API Error (${status}): ${error.response.data?.message || error.response.statusText}`;
      }
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network error - Unable to reach projects API';
    }
    
    return {
      success: false,
      error: errorMessage,
      collections: [],
      totalFetched: 0
    };
  }
};

/**
 * Internal function to fetch fresh collections data
 */
async function fetchFreshCollections(limit, cacheKey) {
  console.log(`🌐 Making API request to fetch all collections...`);
  const response = await apiClient.get('/projects');
    
    console.log(`📄 Received ${response.data?.length || 0} collections`);
    
    const allCollections = [];
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach((collection) => {
        // Transform API response to match our collection format
        allCollections.push({
          slug: collection.slug,
          name: collection.name,
          ranking: collection.ranking,
          image: collection.imageBlur || `https://api.dicebear.com/7.x/shapes/svg?seed=${collection.slug}`,
          floorPrice: collection.stats?.floorInfo?.currentFloorNative,
          floorPriceUsd: collection.stats?.floorInfo?.currentFloorUsd,
          volume: collection.stats?.salesTemporalityUsd?.volume?.val24h,
          marketCap: collection.stats?.floorCapUsd,
          totalSupply: collection.stats?.totalSupply,
          owners: collection.stats?.totalOwners
        });
      });
    }
    
    // Sort by ranking and limit to requested number
    const topCollections = allCollections
      .sort((a, b) => a.ranking - b.ranking)
      .slice(0, limit);
    
    console.log(`✅ Successfully fetched ${topCollections.length} collections`);
    console.log('Sample collections:', topCollections.slice(0, 3));
    
    const result = {
      success: true,
      collections: topCollections,
      totalFetched: topCollections.length,
      fetchedAt: Date.now()
    };
    
    // Cache the result for 1 hour
    await cacheService.set(cacheKey, result, '1h');
    
    return result;
}

/**
 * Fetch detailed collection information
 * @param {string} collectionSlug - The collection identifier/slug
 * @returns {Promise<Object>} Collection details including metrics
 */
export const fetchCollectionDetails = async (collectionSlug) => {
  try {
    console.log(`🔄 Fetching collection details for ${collectionSlug}`);
    
    // Check cache first with stale-while-revalidate
    const cacheKey = `collection-details-${collectionSlug}`;
    const cachedResult = await cacheService.get(cacheKey, '30m', true);
    
    if (cachedResult && !cachedResult.isStale) {
      console.log(`✅ Using fresh cached collection details for ${collectionSlug}`);
      return cachedResult.data;
    }
    
    // If we have stale data, return it and fetch fresh in background
    if (cachedResult && cachedResult.isStale) {
      console.log(`⚡ Using stale collection details for ${collectionSlug}, refreshing in background`);
      
      // Fetch fresh in background
      fetchFreshCollectionDetails(collectionSlug, cacheKey).catch(err => {
        console.warn('Background collection details refresh failed:', err);
      });
      
      return cachedResult.data;
    }
    
    // Use request deduplication
    return await cacheService.deduplicate(cacheKey, async () => {
      return await fetchFreshCollectionDetails(collectionSlug, cacheKey);
    });
  } catch (error) {
    console.error(`❌ Error fetching collection details for ${collectionSlug}:`, error);
    
    return {
      success: false,
      error: error.message || 'Failed to fetch collection details',
      data: null
    };
  }
};

/**
 * Internal function to fetch fresh collection details
 */
async function fetchFreshCollectionDetails(collectionSlug, cacheKey) {
  console.log(`🌐 Making API request for collection details: ${collectionSlug}`);
  const response = await apiClient.get(`/projects/${collectionSlug}`);
  
  console.log('Collection details response:', response.data);
  
  const collection = response.data;
  
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  // Extract all the metrics we need
  const details = {
    slug: collection.slug,
    name: collection.name,
    image: collection.imageBlur || `https://api.dicebear.com/7.x/shapes/svg?seed=${collection.slug}`,
    floorPrice: collection.stats?.floorInfo?.currentFloorNative,
    floorPriceUsd: collection.stats?.floorInfo?.currentFloorUsd,
    marketCap: collection.stats?.floorCapUsd,
    totalSupply: collection.stats?.totalSupply,
    owners: collection.stats?.totalOwners,
    listedItems: collection.stats?.listedCount || collection.stats?.totalListed,
    volume24h: collection.stats?.salesTemporalityUsd?.volume?.val24h,
    volumeChange24h: collection.stats?.salesTemporalityUsd?.volume?.change24h
  };
  
  const result = {
    success: true,
    data: details
  };
  
  // Cache the result for 30 minutes
  await cacheService.set(cacheKey, result, '30m');
  
  return result;
}

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
