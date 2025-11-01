/**
 * Debug utilities for testing NFTPriceFloor API connection and data format
 */

import { fetchFloorPriceHistory, searchCollections, fetchTopCollections } from '../services/nftAPI';

/**
 * Test the API connection and log detailed information about the response
 */
export const testAPIConnection = async (collectionSlug = 'azuki') => {
  console.log('🧪 Testing NFTPriceFloor API Connection...');
  console.log('📡 Endpoint:', `nftpf-api-v0.p.rapidapi.com/projects/${collectionSlug}/charts/all`);
  
  try {
    const startTime = Date.now();
    const result = await fetchFloorPriceHistory(collectionSlug);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️ API call completed in ${duration}ms`);
    
    if (result.success) {
      console.log('✅ API Connection Successful!');
      console.log('📊 Raw API Data Structure:', {
        hasData: !!result.data,
        hasTimestamps: !!result.data?.timestamps,
        hasFloorNative: !!result.data?.floorNative,
        timestampCount: result.data?.timestamps?.length || 0,
        floorPriceCount: result.data?.floorNative?.length || 0,
        collectionName: result.collectionName,
        priceHistoryPoints: result.priceHistory?.length || 0
      });
      
      // Sample the first few data points
      if (result.data?.timestamps && result.data?.floorNative) {
        console.log('🔍 Sample Data Points (first 3):');
        for (let i = 0; i < Math.min(3, result.data.timestamps.length); i++) {
          const timestamp = result.data.timestamps[i];
          const price = result.data.floorNative[i];
          const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
          
          console.log(`  [${i}]: ${date.toISOString().split('T')[0]} → ${price} ETH`);
        }
      }
      
      // Sample the transformed chart data
      if (result.priceHistory && result.priceHistory.length > 0) {
        console.log('📈 Sample Transformed Chart Data (first 3):');
        for (let i = 0; i < Math.min(3, result.priceHistory.length); i++) {
          const point = result.priceHistory[i];
          console.log(`  [${i}]: ${point.x.toISOString().split('T')[0]} → ${point.y} ETH`);
        }
      }
      
      return {
        success: true,
        duration,
        dataPoints: result.priceHistory?.length || 0,
        dateRange: {
          from: result.priceHistory?.[0]?.x,
          to: result.priceHistory?.[result.priceHistory?.length - 1]?.x
        }
      };
    } else {
      console.error('❌ API Connection Failed:', result.error);
      return {
        success: false,
        error: result.error,
        duration
      };
    }
  } catch (error) {
    console.error('💥 API Test Exception:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Test multiple collections to verify API consistency
 */
export const testMultipleCollections = async (collectionSlugs = ['azuki', 'cryptopunks', 'bored-ape-yacht-club']) => {
  console.log('🧪 Testing Multiple Collections...');
  
  const results = {};
  
  for (const slug of collectionSlugs) {
    console.log(`\n🔄 Testing ${slug}...`);
    const result = await testAPIConnection(slug);
    results[slug] = result;
    
    // Small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Summary Report:');
  console.table(Object.entries(results).map(([slug, result]) => ({
    Collection: slug,
    Success: result.success ? '✅' : '❌',
    DataPoints: result.dataPoints || 0,
    Duration: `${result.duration || 0}ms`,
    Error: result.error || 'None'
  })));
  
  return results;
};

/**
 * Test search functionality
 */
export const testSearchAPI = async (query = 'azuki') => {
  console.log(`🔍 Testing Search API with query: "${query}"`);
  
  try {
    const result = await searchCollections(query);
    
    if (result.success) {
      console.log('✅ Search API Successful!');
      console.log('📋 Search Results:', result.collections);
      return result;
    } else {
      console.error('❌ Search API Failed:', result.error);
      return result;
    }
  } catch (error) {
    console.error('💥 Search API Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate chart data format for TradingView
 */
export const validateChartData = (collectionData) => {
  console.log('🔍 Validating Chart Data Format...');
  
  const issues = [];
  
  // Check required properties
  if (!collectionData.slug) issues.push('Missing slug property');
  if (!collectionData.name) issues.push('Missing name property');
  if (!collectionData.data) issues.push('Missing data array');
  
  if (collectionData.data) {
    // Check data array format
    if (!Array.isArray(collectionData.data)) {
      issues.push('Data is not an array');
    } else {
      // Check individual data points
      collectionData.data.forEach((point, index) => {
        if (!point.x) issues.push(`Data point ${index}: missing x (date)`);
        if (typeof point.y !== 'number') issues.push(`Data point ${index}: y is not a number`);
        if (!(point.x instanceof Date)) issues.push(`Data point ${index}: x is not a Date object`);
        if (point.y <= 0) issues.push(`Data point ${index}: y is not positive (${point.y})`);
      });
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ Chart data format is valid!');
    console.log('📊 Data summary:', {
      collection: collectionData.name,
      slug: collectionData.slug,
      dataPoints: collectionData.data?.length || 0,
      dateRange: {
        from: collectionData.data?.[0]?.x,
        to: collectionData.data?.[collectionData.data?.length - 1]?.x
      }
    });
  } else {
    console.warn('⚠️ Chart data validation issues:', issues);
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// Export a combined test function
export const runFullAPITest = async () => {
  console.log('🚀 Starting Full API Test Suite...\n');
  
  // Test single collection
  console.log('=== TEST 1: Single Collection (Azuki) ===');
  const azukiTest = await testAPIConnection('azuki');
  
  console.log('\n=== TEST 2: Search Functionality ===');
  await testSearchAPI('azuki');
  
  console.log('\n=== TEST 3: Multiple Collections ===');
  const multiTest = await testMultipleCollections(['azuki', 'cryptopunks']);
  
  console.log('\n🏁 Full API Test Suite Complete!');
  
  return {
    singleTest: azukiTest,
    multiTest
  };
};