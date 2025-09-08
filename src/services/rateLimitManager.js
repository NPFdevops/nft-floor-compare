/**
 * Rate Limit Manager for NFT Price Floor API
 * Implements intelligent rate limiting, retry logic, and request queuing
 */

class RateLimitManager {
  constructor() {
    // Rate limiting configuration based on your rule (16 minutes = 960 seconds)
    this.config = {
      maxRequestsPerWindow: 5,        // Max requests per window
      windowSizeMs: 16 * 60 * 1000,   // 16 minutes window (per your rule)
      retryDelays: [1000, 2000, 5000, 10000, 30000], // Progressive backoff (1s, 2s, 5s, 10s, 30s)
      maxRetries: 4,
      timeoutMs: 45000,               // Increased from 30s to 45s
      queueSize: 20,                  // Max queued requests
    };

    // Request tracking
    this.requestHistory = [];
    this.requestQueue = [];
    this.activeRequests = new Set();
    this.isProcessingQueue = false;

    // Rate limit state
    this.rateLimitReset = null;
    this.remainingRequests = this.config.maxRequestsPerWindow;

    console.log('🔧 Rate Limit Manager initialized:', {
      maxRequests: this.config.maxRequestsPerWindow,
      window: `${this.config.windowSizeMs / 1000 / 60}min`,
      timeout: `${this.config.timeoutMs / 1000}s`
    });
  }

  /**
   * Check if we can make a request now
   */
  canMakeRequest() {
    this.cleanOldRequests();
    
    const recentRequests = this.requestHistory.filter(
      time => Date.now() - time < this.config.windowSizeMs
    );

    return recentRequests.length < this.config.maxRequestsPerWindow;
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest() {
    this.cleanOldRequests();
    
    if (this.canMakeRequest()) return 0;

    const oldestRequest = Math.min(...this.requestHistory);
    const nextAllowedTime = oldestRequest + this.config.windowSizeMs;
    
    return Math.max(0, nextAllowedTime - Date.now());
  }

  /**
   * Add request to history
   */
  recordRequest() {
    this.requestHistory.push(Date.now());
    this.cleanOldRequests();
  }

  /**
   * Clean old requests from history
   */
  cleanOldRequests() {
    const cutoff = Date.now() - this.config.windowSizeMs;
    this.requestHistory = this.requestHistory.filter(time => time > cutoff);
  }

  /**
   * Update rate limit info from API response headers
   */
  updateFromHeaders(headers) {
    const remaining = parseInt(headers['x-ratelimit-remaining']);
    const reset = parseInt(headers['x-ratelimit-reset']);
    const limit = parseInt(headers['x-ratelimit-limit']);

    if (!isNaN(remaining)) {
      this.remainingRequests = remaining;
    }

    if (!isNaN(reset)) {
      this.rateLimitReset = reset * 1000; // Convert to milliseconds
    }

    console.log('📊 Rate limit updated:', {
      remaining: this.remainingRequests,
      limit,
      resetTime: this.rateLimitReset ? new Date(this.rateLimitReset) : 'unknown'
    });
  }

  /**
   * Add request to queue if rate limited
   */
  async queueRequest(requestFn, priority = 'normal') {
    return new Promise((resolve, reject) => {
      if (this.requestQueue.length >= this.config.queueSize) {
        reject(new Error('Request queue is full. Please try again later.'));
        return;
      }

      const queueItem = {
        requestFn,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
        retryCount: 0
      };

      // Insert based on priority
      if (priority === 'high') {
        this.requestQueue.unshift(queueItem);
      } else {
        this.requestQueue.push(queueItem);
      }

      console.log(`📥 Request queued (${priority}). Queue size: ${this.requestQueue.length}`);
      
      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      if (!this.canMakeRequest()) {
        const waitTime = this.getTimeUntilNextRequest();
        console.log(`⏳ Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s before next request`);
        await this.sleep(waitTime + 1000); // Add 1s buffer
        continue;
      }

      const queueItem = this.requestQueue.shift();
      
      try {
        this.recordRequest();
        const result = await this.executeWithRetry(queueItem.requestFn, queueItem.retryCount);
        queueItem.resolve(result);
      } catch (error) {
        queueItem.reject(error);
      }

      // Small delay between requests to be respectful
      await this.sleep(500);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute request with retry logic
   */
  async executeWithRetry(requestFn, startRetryCount = 0) {
    for (let attempt = startRetryCount; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await requestFn();
        
        // Update rate limit info from response headers if available
        if (result.headers) {
          this.updateFromHeaders(result.headers);
        }

        return result;
      } catch (error) {
        console.log(`❌ Request attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on certain errors
        if (error.response?.status === 404 || error.response?.status === 403) {
          throw error;
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelays[attempt] || 30000;
          
          console.log(`🚦 Rate limited (429). Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${this.config.maxRetries}`);
          
          if (attempt < this.config.maxRetries) {
            await this.sleep(waitTime);
            continue;
          }
        }

        // Handle timeouts and network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
          const waitTime = this.config.retryDelays[attempt] || 10000;
          
          console.log(`🌐 Network error. Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${this.config.maxRetries}`);
          
          if (attempt < this.config.maxRetries) {
            await this.sleep(waitTime);
            continue;
          }
        }

        // Final attempt failed
        if (attempt === this.config.maxRetries) {
          throw error;
        }

        // Progressive backoff for other errors
        const waitTime = this.config.retryDelays[attempt] || 5000;
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue and rate limit statistics
   */
  getStats() {
    return {
      queueSize: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      recentRequests: this.requestHistory.length,
      canMakeRequest: this.canMakeRequest(),
      timeUntilNextRequest: this.getTimeUntilNextRequest(),
      remainingRequests: this.remainingRequests,
      rateLimitReset: this.rateLimitReset ? new Date(this.rateLimitReset) : null
    };
  }

  /**
   * Clear queue (for emergency situations)
   */
  clearQueue() {
    this.requestQueue.forEach(item => {
      item.reject(new Error('Request queue cleared'));
    });
    this.requestQueue = [];
    console.log('🧹 Request queue cleared');
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager();
