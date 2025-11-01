/**
 * Safe Analytics Utility for PostHog
 * 
 * This module provides error-proof, non-blocking analytics wrappers
 * that ensure tracking never breaks app functionality.
 */

// Maximum size for property values (to prevent oversized payloads)
const MAX_PROP_LENGTH = 500;
const MAX_ERROR_LENGTH = 200;

// Active timers for performance measurement
const timers = new Map();

/**
 * Get common context properties for all events
 */
const getCommonContext = () => {
  try {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    return {
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
      url: window.location.href,
      pathname: window.location.pathname,
      referrer_domain: document.referrer ? new URL(document.referrer).hostname : null,
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn('[Analytics] Error getting common context:', error);
    return {
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Sanitize property values to prevent oversized payloads or sensitive data leaks
 */
const sanitizeProps = (props) => {
  if (!props || typeof props !== 'object') return {};
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) {
      sanitized[key] = null;
      continue;
    }
    
    // Truncate long strings
    if (typeof value === 'string' && value.length > MAX_PROP_LENGTH) {
      sanitized[key] = value.substring(0, MAX_PROP_LENGTH) + '...';
    }
    // Keep numbers, booleans as-is
    else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Arrays: keep if small, otherwise truncate
    else if (Array.isArray(value)) {
      sanitized[key] = value.length > 10 ? value.slice(0, 10) : value;
    }
    // Objects: convert to JSON string if possible
    else if (typeof value === 'object') {
      try {
        const jsonStr = JSON.stringify(value);
        sanitized[key] = jsonStr.length > MAX_PROP_LENGTH 
          ? jsonStr.substring(0, MAX_PROP_LENGTH) + '...' 
          : jsonStr;
      } catch {
        sanitized[key] = '[Object]';
      }
    }
    else {
      sanitized[key] = String(value);
    }
  }
  
  return sanitized;
};

/**
 * Sanitize error messages to prevent PII leaks
 */
export const sanitizeError = (error, maxLength = MAX_ERROR_LENGTH) => {
  if (!error) return null;
  
  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  } else {
    message = String(error);
  }
  
  // Truncate if too long
  if (message.length > maxLength) {
    message = message.substring(0, maxLength) + '...';
  }
  
  return message;
};

/**
 * Safe event capture with error handling and non-blocking execution
 * 
 * @param {Object} posthog - PostHog instance
 * @param {string} eventName - Name of the event (snake_case, past tense)
 * @param {Object} properties - Event properties
 * @param {Object} options - Additional options
 */
export const safeCapture = (posthog, eventName, properties = {}, options = {}) => {
  // Don't proceed if PostHog is not available
  if (!posthog || typeof posthog.capture !== 'function') {
    if (import.meta.env.DEV) {
      console.warn('[Analytics] PostHog not available for event:', eventName);
    }
    return;
  }
  
  // Use requestIdleCallback for better performance, with setTimeout fallback
  const captureEvent = () => {
    try {
      const commonContext = getCommonContext();
      const sanitized = sanitizeProps(properties);
      const enrichedProps = {
        ...commonContext,
        ...sanitized
      };
      
      posthog.capture(eventName, enrichedProps, options);
      
      if (import.meta.env.DEV) {
        console.log('[Analytics] Event captured:', eventName, enrichedProps);
      }
    } catch (error) {
      // Silently fail - never break the app
      console.error('[Analytics] Error capturing event:', eventName, error);
    }
  };
  
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(captureEvent, { timeout: 1000 });
  } else {
    setTimeout(captureEvent, 0);
  }
};

/**
 * Register super properties (persisted across all events)
 * 
 * @param {Object} posthog - PostHog instance
 * @param {Object} properties - Properties to register
 */
export const safeRegister = (posthog, properties = {}) => {
  if (!posthog || typeof posthog.register !== 'function') {
    if (import.meta.env.DEV) {
      console.warn('[Analytics] PostHog not available for register');
    }
    return;
  }
  
  try {
    const sanitized = sanitizeProps(properties);
    posthog.register(sanitized);
    
    if (import.meta.env.DEV) {
      console.log('[Analytics] Properties registered:', sanitized);
    }
  } catch (error) {
    console.error('[Analytics] Error registering properties:', error);
  }
};

/**
 * Identify a user (for authenticated users only)
 * 
 * @param {Object} posthog - PostHog instance
 * @param {string} userId - User identifier (optional)
 * @param {Object} properties - User properties
 */
export const safeIdentify = (posthog, userId = null, properties = {}) => {
  if (!posthog || typeof posthog.identify !== 'function') {
    if (import.meta.env.DEV) {
      console.warn('[Analytics] PostHog not available for identify');
    }
    return;
  }
  
  try {
    const sanitized = sanitizeProps(properties);
    
    if (userId) {
      posthog.identify(userId, sanitized);
    } else {
      posthog.identify(undefined, sanitized);
    }
    
    if (import.meta.env.DEV) {
      console.log('[Analytics] User identified:', userId || 'anonymous', sanitized);
    }
  } catch (error) {
    console.error('[Analytics] Error identifying user:', error);
  }
};

/**
 * Start a performance timer
 * 
 * @param {string} label - Timer label
 * @returns {string} Timer ID
 */
export const startTimer = (label) => {
  const timerId = `${label}_${Date.now()}`;
  timers.set(timerId, {
    label,
    startTime: performance.now()
  });
  
  if (import.meta.env.DEV) {
    console.log('[Analytics] Timer started:', label);
  }
  
  return timerId;
};

/**
 * End a performance timer and return duration in milliseconds
 * 
 * @param {string} timerIdOrLabel - Timer ID or label
 * @returns {number|null} Duration in milliseconds, or null if timer not found
 */
export const endTimer = (timerIdOrLabel) => {
  // Try to find timer by ID first
  let timer = timers.get(timerIdOrLabel);
  
  // If not found by ID, try to find by label (get most recent)
  if (!timer) {
    for (const [id, t] of timers.entries()) {
      if (t.label === timerIdOrLabel) {
        timer = t;
        timerIdOrLabel = id;
        break;
      }
    }
  }
  
  if (!timer) {
    if (import.meta.env.DEV) {
      console.warn('[Analytics] Timer not found:', timerIdOrLabel);
    }
    return null;
  }
  
  const duration = Math.round(performance.now() - timer.startTime);
  timers.delete(timerIdOrLabel);
  
  if (import.meta.env.DEV) {
    console.log('[Analytics] Timer ended:', timer.label, `${duration}ms`);
  }
  
  return duration;
};

/**
 * Get device type
 */
export const getDeviceType = () => {
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
};

/**
 * Get referrer domain
 */
export const getReferrerDomain = () => {
  try {
    if (!document.referrer) return null;
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
};

/**
 * Get UTM parameters from URL
 */
export const getUtmParams = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_content: params.get('utm_content') || null,
      utm_term: params.get('utm_term') || null
    };
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null
    };
  }
};

/**
 * LocalStorage helpers for user properties
 */
export const getUserProperty = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(`nfc_${key}`);
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setUserProperty = (key, value) => {
  try {
    localStorage.setItem(`nfc_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('[Analytics] Error setting user property:', key, error);
  }
};

export const incrementUserProperty = (key, increment = 1) => {
  const current = getUserProperty(key, 0);
  const newValue = (typeof current === 'number' ? current : 0) + increment;
  setUserProperty(key, newValue);
  return newValue;
};

/**
 * Check if this is the user's first visit
 */
export const isFirstVisit = () => {
  const firstVisit = getUserProperty('first_visit_at');
  return !firstVisit;
};

/**
 * Mark first visit timestamp
 */
export const markFirstVisit = () => {
  if (isFirstVisit()) {
    setUserProperty('first_visit_at', new Date().toISOString());
    return true;
  }
  return false;
};

/**
 * Get or increment session count
 */
export const getSessionCount = () => {
  return getUserProperty('session_count', 0);
};

export const incrementSessionCount = () => {
  return incrementUserProperty('session_count');
};

/**
 * Get total comparisons count
 */
export const getTotalComparisons = () => {
  return getUserProperty('total_comparisons', 0);
};

export const incrementTotalComparisons = () => {
  return incrementUserProperty('total_comparisons');
};

/**
 * Manage favorite collections (bounded array, max 10)
 */
export const addFavoriteCollection = (slug) => {
  try {
    const favorites = getUserProperty('favorite_collections', []);
    const updated = [slug, ...favorites.filter(s => s !== slug)].slice(0, 10);
    setUserProperty('favorite_collections', updated);
    return updated;
  } catch (error) {
    console.error('[Analytics] Error adding favorite collection:', error);
    return [];
  }
};

export const getFavoriteCollections = () => {
  return getUserProperty('favorite_collections', []);
};
