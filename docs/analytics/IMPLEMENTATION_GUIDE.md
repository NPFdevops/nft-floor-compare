# PostHog Analytics Implementation Guide

## Overview

This guide provides complete implementation details for tracking user journeys in the NFT Floor Compare application.

**Status:** ✅ Foundation Complete | 🔨 Component Instrumentation In Progress

### Completed
- ✅ Safe analytics utility (`src/utils/analytics.js`)
- ✅ App.jsx session lifecycle tracking
- ✅ User properties management
- ✅ First visit detection
- ✅ Session counting
- ✅ Visibility tracking

### Remaining Components to Instrument
The implementation follows best practices for product analytics with non-blocking, error-proof event capture.

---

## Customer Journey Funnels

### Journey 1: Awareness → Engagement → Conversion → Retention
```
app_session_start 
  → (search_input_focused OR example_comparison_clicked)
  → chart_loaded
  → (return visit with chart_loaded)
```

### Journey 2: First Visit → Search → Compare → Share
```
app_session_start (is_first_visit=true)
  → collection_selected
  → chart_loaded
  → (screenshot_completed OR url_share_started)
```

---

## Component Instrumentation Code

### 1. SearchBar.jsx - Engagement Tracking

Add at the top of the component:
```javascript
import { usePostHog } from 'posthog-js/react';
import { safeCapture, getDeviceType, sanitizeError } from '../utils/analytics';

// Inside component
const posthog = usePostHog();
const deviceType = getDeviceType();

// Determine slot based on placeholder or pass as prop
const slot = placeholder.includes('A') ? '1' : '2';
```

**On input focus** (in `handleInputClick` or add focus handler):
```javascript
safeCapture(posthog, 'search_input_focused', {
  slot: slot,
  device_type: deviceType
});
```

**On input change** (add to existing `handleInputChange`):
```javascript
// Add debounced tracking (after 300ms of no typing)
const debounceTimer = useRef(null);

const handleInputChange = (e) => {
  const value = e.target.value;
  setQuery(value);
  
  // Existing filtering logic...
  const filtered = collectionsService.searchCollections(value, 20);
  setFilteredCollections(filtered);
  
  // Debounced analytics
  clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    if (value.length >= 3) {
      safeCapture(posthog, 'search_query_typed', {
        q: value.substring(0, 50), // Truncate for safety
        q_len: value.length,
        debounce_ms: 300,
        suggestions_count: filtered.length,
        slot: slot
      });
    }
  }, 300);
  
  // Keep dropdown open logic...
};
```

**On collection select** (add to `handleCollectionSelect`):
```javascript
const handleCollectionSelect = (collection) => {
  setQuery(collection.name);
  setIsDropdownOpen(false);
  
  safeCapture(posthog, 'collection_selected', {
    slot: slot,
    collection_slug: collection.slug,
    collection_name: collection.name,
    source: 'dropdown',
    device_type: deviceType
  });
  
  onSearch(collection.slug);
};
```

**On clear** (add to `handleClear`):
```javascript
const handleClear = () => {
  safeCapture(posthog, 'search_cleared', {
    slot: slot
  });
  
  // Existing clear logic...
  setQuery('');
  setIsDropdownOpen(false);
  setFilteredCollections([]);
  onClear();
  inputRef.current?.focus();
};
```

**On error** (add to error handling):
```javascript
// In error state rendering or catch blocks
safeCapture(posthog, 'search_error', {
  code: error.code || 'unknown',
  message_sanitized: sanitizeError(error),
  slot: slot
});
```

---

### 2. ComparisonExamples.jsx - Example Selection Tracking

Add at the top:
```javascript
import { usePostHog } from 'posthog-js/react';
import { safeCapture, getDeviceType } from '../utils/analytics';

const posthog = usePostHog();
```

**Update `handleClick`**:
```javascript
const handleClick = (example, index) => {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50);
  }
  
  safeCapture(posthog, 'example_comparison_clicked', {
    example_id: index,
    collection1_slug: example.collection1.slug,
    collection2_slug: example.collection2.slug,
    device_type: getDeviceType()
  });
  
  setActiveExample(index);
  onSelectComparison(example.collection1.slug, example.collection2.slug);
};
```

**Update `handleCustomClick`**:
```javascript
const handleCustomClick = () => {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50);
  }
  
  safeCapture(posthog, 'custom_comparison_clicked', {
    device_type: getDeviceType()
  });
  
  if (onOpenSearch) {
    onOpenSearch();
  }
};
```

---

### 3. ChartDisplay.jsx - Conversion Milestone Tracking

Add at the top:
```javascript
import { usePostHog } from 'posthog-js/react';
import { safeCapture, safeRegister, startTimer, endTimer, sanitizeError, incrementTotalComparisons, addFavoriteCollection } from '../utils/analytics';
```

Add inside component:
```javascript
const posthog = usePostHog();
const renderTimerRef = useRef(null);
```

**Track chart loading** (add useEffect):
```javascript
useEffect(() => {
  if (!collection && !collection2) {
    // Empty state
    safeCapture(posthog, 'empty_state_viewed', {
      reason: 'no_selection',
      is_comparison: isComparison
    });
    return;
  }
  
  if (loading) {
    // Start render timer
    renderTimerRef.current = startTimer('chart_render');
    return;
  }
  
  if (error) {
    // Track failure
    safeCapture(posthog, 'chart_load_failed', {
      collection1_slug: collection?.slug,
      collection2_slug: collection2?.slug,
      timeframe: timeframe || '30d',
      code: error.code || 'unknown',
      message_sanitized: sanitizeError(error),
      is_comparison: isComparison
    });
    return;
  }
  
  if (collection || collection2) {
    // Track successful load
    const renderMs = endTimer(renderTimerRef.current);
    const pointsCount = collection?.data?.length || 0 + (collection2?.data?.length || 0);
    
    safeCapture(posthog, 'chart_loaded', {
      collection1_slug: collection?.slug,
      collection2_slug: collection2?.slug,
      timeframe: timeframe || '30d',
      points_count: pointsCount,
      data_source: 'db', // Adjust based on your API response if available
      render_ms: renderMs,
      is_comparison: isComparison,
      currency: currency
    });
    
    // Update user properties
    const totalComparisons = incrementTotalComparisons();
    safeRegister(posthog, { total_comparisons: totalComparisons });
    
    // Track favorite collections
    if (collection?.slug) {
      addFavoriteCollection(collection.slug);
    }
    if (collection2?.slug) {
      addFavoriteCollection(collection2.slug);
    }
    
    // Update favorite_collections in PostHog
    const favorites = getFavoriteCollections();
    safeRegister(posthog, { favorite_collections: favorites });
  }
}, [collection, collection2, loading, error, posthog, isComparison, timeframe, currency]);
```

---

### 4. ScreenshotShare.jsx - Enhanced Tracking

**Update `captureScreenshot` function** (enhance existing tracking):
```javascript
const captureScreenshot = async () => {
  // ... existing validation code ...
  
  // Enhance existing tracking call
  posthog?.capture('screenshot_started', {
    target_id: targetId,
    collection1_slug: collection1?.slug,
    collection2_slug: collection2?.slug,
    timeframe: timeframe,
    layout: layout,
    has_both_collections: !!(collection1 && collection2),
    device_type: getDeviceType(),
    dpr: window.devicePixelRatio || 2
  });
  
  // ... rest of screenshot logic ...
  
  // Inside success callback, enhance tracking:
  posthog?.capture('screenshot_completed', {
    filename: filename,
    collection1_slug: collection1?.slug,
    collection2_slug: collection2?.slug,
    timeframe: timeframe,
    layout: layout,
    has_both_collections: !!(collection1 && collection2),
    dpr: window.devicePixelRatio || 2,
    image_bytes: blob.size,
    area: 'chart_container'
  });
};
```

**Add action sheet tracking**:
```javascript
const ActionSheet = () => {
  // Add useEffect to track when sheet opens
  useEffect(() => {
    safeCapture(posthog, 'share_sheet_opened', {
      device_type: getDeviceType()
    });
  }, []);
  
  // ... rest of component ...
};
```

**Add clipboard success tracking** (in `copyToClipboard`):
```javascript
const copyToClipboard = () => {
  const shareTitle = generateShareTitle({ collection1, collection2, timeframe });
  const shareUrl = createShareableUrl({ collection1, collection2, timeframe, layout });
  const text = `${shareTitle} - View interactive comparison: ${shareUrl}`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      safeCapture(posthog, 'copy_to_clipboard_success', {
        content_length: text.length,
        method: 'clipboard_api'
      });
      
      // ... rest of success logic ...
    });
  }
};
```

---

### 5. SettingsModal.jsx - Theme Preference Tracking

Add at the top:
```javascript
import { usePostHog } from 'posthog-js/react';
import { safeCapture, safeRegister } from '../utils/analytics';
```

**Track modal open**:
```javascript
useEffect(() => {
  if (isOpen) {
    safeCapture(posthog, 'settings_opened', {});
  }
}, [isOpen, posthog]);
```

**Track theme changes** (update radio button onChange handlers):
```javascript
// For Light Mode radio
onChange={() => {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(1);
  }
  
  safeCapture(posthog, 'theme_changed', {
    previous: themeMode,
    next: 'light'
  });
  
  setThemeMode('light');
  safeRegister(posthog, { theme_preference: 'light' });
}}

// Repeat for Dark and System modes with appropriate 'next' values
```

**Track modal close**:
```javascript
const handleClose = () => {
  safeCapture(posthog, 'settings_closed', {
    theme_preference: themeMode
  });
  
  // ... existing close logic ...
  onClose();
};
```

---

### 6. CollectionMetrics.jsx - Metrics Engagement

Add at the top:
```javascript
import { usePostHog } from 'posthog-js/react';
import { safeCapture, sanitizeError } from '../utils/analytics';
```

**Track metrics view** (add useEffect):
```javascript
useEffect(() => {
  if ((collection1 || collection2) && !parentLoading.collection1 && !parentLoading.collection2) {
    const availableMetrics = [];
    if (metrics.collection1) availableMetrics.push(...Object.keys(metrics.collection1));
    if (metrics.collection2) availableMetrics.push(...Object.keys(metrics.collection2));
    
    safeCapture(posthog, 'metrics_viewed', {
      collection1_slug: collection1?.slug,
      collection2_slug: collection2?.slug,
      metrics: [...new Set(availableMetrics)],
      has_both: !!(collection1 && collection2)
    });
  }
}, [collection1, collection2, metrics, parentLoading, posthog]);
```

**Track load success/failure** (in `fetchMetrics`):
```javascript
const fetchMetrics = async (slug, collectionNumber) => {
  // ... existing setup ...
  
  try {
    const result = await fetchCollectionDetails(slug);
    
    if (result.success) {
      setMetrics(prev => ({ ...prev, [key]: result.data }));
      
      safeCapture(posthog, 'metrics_load_success', {
        collection_slug: slug,
        collection_number: collectionNumber,
        metrics_count: Object.keys(result.data || {}).length
      });
    } else {
      setError(prev => ({ ...prev, [key]: result.error }));
      
      safeCapture(posthog, 'metrics_load_failed', {
        collection_slug: slug,
        collection_number: collectionNumber,
        code: result.error?.code || 'unknown',
        message_sanitized: sanitizeError(result.error)
      });
    }
  } catch (err) {
    // ... existing error handling ...
    
    safeCapture(posthog, 'metrics_load_failed', {
      collection_slug: slug,
      collection_number: collectionNumber,
      code: 'exception',
      message_sanitized: sanitizeError(err)
    });
  }
  // ... rest of function ...
};
```

---

### 7. ThemeContext.jsx - Theme Persistence Tracking

Add at the top of the provider:
```javascript
import { safeCapture, safeRegister } from '../utils/analytics';
import posthog from 'posthog-js';
```

**Track theme preference saved** (in the `changeThemeMode` function):
```javascript
const changeThemeMode = (mode) => {
  setThemeMode(mode);
  
  safeCapture(posthog, 'theme_preference_saved', {
    value: mode,
    previous_value: themeMode
  });
  
  safeRegister(posthog, {
    theme_preference: mode
  });
};
```

---

## Event Naming Conventions

All events follow these rules:
- **snake_case** format
- **Past tense** verb (e.g., `chart_loaded`, not `load_chart`)
- **Descriptive nouns** (e.g., `search_input_focused`, not just `focused`)
- **Consistent property keys** across events

### Event Categories

**Session Lifecycle:**
- `app_session_start`
- `app_session_end`
- `page_visibility_changed`

**Engagement:**
- `search_input_focused`
- `search_query_typed`
- `collection_selected`
- `search_cleared`
- `example_comparison_clicked`
- `custom_comparison_clicked`

**Conversion:**
- `chart_loaded` ⭐ (Key conversion event)
- `chart_load_failed`
- `empty_state_viewed`

**Retention Actions:**
- `screenshot_started`
- `screenshot_completed`
- `screenshot_failed`
- `url_share_started`
- `copy_to_clipboard_success`
- `share_sheet_opened`

**Settings:**
- `settings_opened`
- `settings_closed`
- `theme_changed`
- `theme_preference_saved`
- `currency_toggled`

**Metrics:**
- `metrics_viewed`
- `metrics_load_success`
- `metrics_load_failed`

---

## User Properties (Super Properties)

These persist across all events using `posthog.register()`:

```javascript
{
  device_type: 'mobile' | 'desktop',
  first_visit_date: '2025-01-24T22:00:00Z',
  session_count: 5,
  total_comparisons: 12,
  favorite_collections: ['cryptopunks', 'bored-ape-yacht-club'],
  theme_preference: 'dark' | 'light' | 'system'
}
```

---

## Event Properties (Common Context)

Automatically added to all events by `safeCapture()`:

```javascript
{
  device_type: 'mobile' | 'desktop',
  url: 'https://compare.nftpricefloor.com/?c1=azuki&c2=pudgy-penguins',
  pathname: '/',
  referrer_domain: 'twitter.com',
  utm_source: 'twitter',
  utm_medium: 'social',
  utm_campaign: 'launch',
  timestamp: '2025-01-24T22:34:10.123Z'
}
```

---

## Testing Checklist

### Local Development Testing

1. **Open PostHog Debug Panel**
   - Add `?__debug=true` to URL
   - Check browser console for `[Analytics]` logs
   - Verify all events fire with correct properties

2. **Test User Flows**
   - ✅ First visit (clear localStorage)
   - ✅ Return visit (keep localStorage)
   - ✅ Mobile view (resize browser < 768px)
   - ✅ Desktop view (resize browser ≥ 768px)
   - ✅ Search and select collections
   - ✅ Load charts (success and error states)
   - ✅ Take screenshots
   - ✅ Share URLs
   - ✅ Change theme settings
   - ✅ View metrics

3. **Network Tab Verification**
   - Check POST requests to PostHog `/e` endpoint
   - Verify event payloads don't contain PII
   - Confirm non-blocking behavior (app works if PostHog fails)

### Production Monitoring

- Set up PostHog dashboard with funnels (see POSTHOG_SETUP.md)
- Monitor chart_load_failed rate
- Track D1/D7 retention cohorts
- Set up alerts for anomalies

---

## Next Steps

1. Apply the code snippets above to each component
2. Test thoroughly in development
3. Review PostHog dashboard setup (POSTHOG_SETUP.md)
4. Review event taxonomy (EVENT_TAXONOMY.md)
5. Deploy and monitor

---

## Support & Debugging

### Common Issues

**Events not appearing in PostHog:**
- Check browser console for errors
- Verify VITE_POSTHOG_KEY is set
- Confirm reverse proxy is working in dev (`/ingest`)
- Check PostHog project settings (IngestionFilter)

**LocalStorage errors:**
- Handle gracefully in analytics.js (already implemented)
- Check browser privacy settings

**Performance impact:**
- All events use `requestIdleCallback` or `setTimeout(0)`
- No synchronous blocking operations
- Sanitization limits payload sizes

### Debug Mode

Enable verbose logging:
```javascript
// In .env file for development
VITE_ENV=development
```

Check logs in browser console with `[Analytics]` prefix.

---

Last Updated: 2025-01-24
Version: 1.0.0
