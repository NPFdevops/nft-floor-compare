import axios from 'axios';

const API_BASE_URL = 'https://api.nftpricefloor.com';

/**
 * Fetch floor price history for a specific NFT collection
 * @param {string} collectionSlug - The collection identifier/slug
 * @param {number} days - Number of days to fetch (default: 30)
 * @returns {Promise<Object>} Floor price data with timestamps and prices
 */
export const fetchFloorPriceHistory = async (collectionSlug, days = 30) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/collection/${collectionSlug}/floor-price-history`, {
      params: { days }
    });
    
    return {
      success: true,
      data: response.data,
      collectionName: response.data.collection_name || collectionSlug,
      priceHistory: response.data.price_history || []
    };
  } catch (error) {
    console.error(`Error fetching floor price for ${collectionSlug}:`, error);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null
    };
  }
};

/**
 * Search for NFT collections by name
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of collection suggestions
 */
export const searchCollections = async (query) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/search/collections`, {
      params: { q: query, limit: 10 }
    });
    
    return {
      success: true,
      collections: response.data.collections || []
    };
  } catch (error) {
    console.error('Error searching collections:', error);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      collections: []
    };
  }
};

/**
 * Get current floor price for a collection
 * @param {string} collectionSlug - The collection identifier/slug
 * @returns {Promise<Object>} Current floor price data
 */
export const getCurrentFloorPrice = async (collectionSlug) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/collection/${collectionSlug}/current`);
    
    return {
      success: true,
      data: response.data,
      floorPrice: response.data.floor_price,
      currency: response.data.currency || 'ETH'
    };
  } catch (error) {
    console.error(`Error fetching current floor price for ${collectionSlug}:`, error);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: null
    };
  }
};
