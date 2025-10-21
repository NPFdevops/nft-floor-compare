class PostHogService {
  constructor() {
    this.isInitialized = false;
    this.posthog = null;
    this.initPromise = null;
  }

  async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
    const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!posthogKey) {
      console.warn('PostHog key not found. Analytics will be disabled.');
      return;
    }

    this.initPromise = (async () => {
      try {
        // Lazy load posthog to reduce initial bundle size
        const { default: posthog } = await import('posthog-js');
        this.posthog = posthog;
        
        posthog.init(posthogKey, {
          api_host: posthogHost,
          person_profiles: 'identified_only',
          capture_pageview: true,
          capture_pageleave: true,
          loaded: (posthog) => {
            if (import.meta.env.DEV) {
              console.log('PostHog loaded successfully');
            }
          }
        });

        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize PostHog:', error);
      }
    })();
    
    return this.initPromise;
  }

  // Track custom events
  async track(eventName, properties = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    if (!this.posthog) return;
    
    try {
      this.posthog.capture(eventName, properties);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // Track page views manually if needed
  async trackPageView(pageName, properties = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    if (!this.posthog) return;
    
    try {
      this.posthog.capture('$pageview', {
        $current_url: window.location.href,
        page_name: pageName,
        ...properties
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  // Identify users (for when you have user authentication)
  async identify(userId, properties = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    if (!this.posthog) return;
    
    try {
      this.posthog.identify(userId, properties);
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  // Set user properties
  async setPersonProperties(properties) {
    if (!this.isInitialized) {
      await this.init();
    }
    if (!this.posthog) return;
    
    try {
      this.posthog.setPersonProperties(properties);
    } catch (error) {
      console.error('Failed to set person properties:', error);
    }
  }

  // Reset user (for logout)
  async reset() {
    if (!this.isInitialized) return;
    if (!this.posthog) return;
    
    try {
      this.posthog.reset();
    } catch (error) {
      console.error('Failed to reset PostHog:', error);
    }
  }

  // Get the PostHog instance for advanced usage
  getInstance() {
    return this.posthog;
  }
}

// Export a singleton instance
export const posthogService = new PostHogService();

// Export the class for testing or multiple instances if needed
export default PostHogService;