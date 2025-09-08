/**
 * Convert a date string (YYYY-MM-DD) to Unix timestamp
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {number} Unix timestamp in seconds
 */
export const dateToTimestamp = (dateString) => {
  const date = new Date(dateString);
  // Set to start of day to avoid timezone issues
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
};

/**
 * Convert Unix timestamp to date string (YYYY-MM-DD)
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const timestampToDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0];
};

/**
 * Get default date range (30 days ending today)
 * @returns {Object} Object with startDate and endDate strings
 */
export const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

/**
 * Calculate the number of days between two dates
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {number} Number of days between the dates
 */
export const daysBetweenDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determine appropriate granularity based on date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {string} Granularity ('1h', '1d', '1w')
 */
export const getOptimalGranularity = (startDate, endDate) => {
  // For now, we'll use '1d' for all ranges since that's what the API supports
  // In the future, we can add support for other granularities when available
  return '1d';
};

/**
 * Validate that end date is after start date
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start < end;
};
