# PostHog Analytics for NFT Floor Compare

## 📊 Overview

Comprehensive analytics implementation tracking user journeys through Awareness → Engagement → Conversion → Retention funnels.

**Status:** ✅ Foundation Complete | 🔨 Component Instrumentation Ready

---

## 🚀 Quick Start

### What's Already Implemented

✅ **Core Infrastructure** (`src/utils/analytics.js`)
- Non-blocking, error-proof event capture
- Automatic context enrichment (device, UTM, referrer)
- Performance timers for render tracking
- LocalStorage-based user properties
- PII sanitization and payload size limits

✅ **App.jsx - Session Lifecycle**
- `app_session_start` - Session initialization with first-visit detection
- `app_session_end` - Session duration and active time tracking
- `page_visibility_changed` - Tab visibility monitoring
- User property registration (session_count, total_comparisons, etc.)

### What's Next (Copy-Paste Ready)

📖 **See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** for complete code snippets to add to:
- SearchBar.jsx (search engagement)
- ComparisonExamples.jsx (example clicks)
- ChartDisplay.jsx (conversion milestone)
- ScreenshotShare.jsx (share/screenshot actions)
- SettingsModal.jsx (theme preferences)
- CollectionMetrics.jsx (metrics engagement)
- ThemeContext.jsx (theme persistence)

---

## 📁 Documentation Files

| File | Purpose |
|------|---------|
| **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** | Complete code snippets for each component with detailed instructions |
| **[POSTHOG_DASHBOARDS.md](./POSTHOG_DASHBOARDS.md)** | Dashboard setup guides, funnel configurations, alerts, and HogQL queries |
| **README.md** (this file) | Quick reference and overview |

---

## 🎯 Customer Journey Funnels

### Journey 1: Awareness → Engagement → Conversion → Retention

```
┌─────────────────┐
│  app_session_   │  Awareness
│     start       │
└────────┬────────┘
         ↓
┌─────────────────┐
│ search_input_   │  Engagement
│    focused      │  (OR example_
│                 │   comparison_
│                 │   clicked)
└────────┬────────┘
         ↓
┌─────────────────┐
│  chart_loaded   │  Conversion ⭐
│                 │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Return visit   │  Retention
│  with chart_    │
│    loaded       │
└─────────────────┘
```

### Journey 2: First Visit → Search → Compare → Share

```
┌─────────────────┐
│ app_session_    │  First Visit
│ start (first=   │
│     true)       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  collection_    │  Collection
│   selected      │  Search
└────────┬────────┘
         ↓
┌─────────────────┐
│  chart_loaded   │  Comparison ⭐
│                 │  View
└────────┬────────┘
         ↓
┌─────────────────┐
│  screenshot_    │  Share/
│  completed OR   │  Screenshot
│  url_share_     │
│   started       │
└─────────────────┘
```

---

## 📊 Event Taxonomy (24 Events Total)

### Session Lifecycle (3 events)
- `app_session_start` - New session with first-visit detection
- `app_session_end` - Session ended with duration
- `page_visibility_changed` - Tab visibility changed

### Engagement (7 events)
- `search_input_focused` - User clicked into search
- `search_query_typed` - User typed search query (debounced 300ms)
- `collection_selected` - User selected a collection
- `search_cleared` - User cleared search input
- `example_comparison_clicked` - User clicked pre-made example
- `custom_comparison_clicked` - User clicked custom comparison button
- `metrics_viewed` - CollectionMetrics component displayed

### Conversion ⭐ (3 events)
- `chart_loaded` - **KEY EVENT** - Chart successfully rendered
- `chart_load_failed` - Chart failed to load
- `empty_state_viewed` - Empty state displayed

### Retention Actions (5 events)
- `screenshot_completed` - Screenshot successfully captured
- `screenshot_failed` - Screenshot capture failed
- `copy_to_clipboard_success` - URL copied to clipboard
- `share_sheet_opened` - Mobile share sheet displayed
- `currency_toggled` - Currency switched (ETH ↔ USD)

### Settings & Preferences (4 events)
- `settings_opened` - Settings modal opened
- `settings_closed` - Settings modal closed
- `theme_changed` - Theme preference changed
- `theme_preference_saved` - Theme persisted to storage

### Health & Reliability (2 events)
- `metrics_load_success` - Metrics fetched successfully
- `metrics_load_failed` - Metrics fetch failed with error

---

## 🔧 User Properties (Super Properties)

Automatically tracked across all events:

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

## 🎨 Event Properties (Common Context)

Auto-enriched on every event by `safeCapture()`:

```javascript
{
  device_type: 'mobile' | 'desktop',
  url: 'https://compare.nftpricefloor.com/?c1=azuki',
  pathname: '/',
  referrer_domain: 'twitter.com',
  utm_source: 'twitter',
  utm_medium: 'social',
  utm_campaign: 'launch',
  timestamp: '2025-01-24T22:34:10.123Z'
}
```

---

## 🧪 Testing Your Implementation

### 1. Enable Debug Mode

Add `?__debug=true` to your URL in development:
```
http://localhost:5173/?__debug=true
```

### 2. Check Browser Console

Look for `[Analytics]` prefixed logs:
```
[Analytics] Event captured: app_session_start {...}
[Analytics] Timer started: session_active_ms
[Analytics] Properties registered: {...}
```

### 3. Verify PostHog Network Requests

Open DevTools → Network tab:
- Filter by `/ingest` (dev) or `/e` (prod)
- Check POST payloads contain expected properties
- Verify non-blocking behavior (no UI freezes)

### 4. Test User Flows

- ✅ Clear localStorage → Test first visit
- ✅ Keep localStorage → Test return visit
- ✅ Resize to mobile (< 768px) → Test mobile tracking
- ✅ Search collections → Verify engagement events
- ✅ Load charts → Check conversion events
- ✅ Take screenshots → Confirm share events
- ✅ Change settings → Validate preference tracking

---

## 📈 Key Metrics to Monitor

### Activation (First Visit Success)
**Formula:** `chart_loaded (where is_first_visit=true) / app_session_start (where is_first_visit=true)`  
**Target:** > 40%

### Search → Compare Conversion
**Formula:** `chart_loaded / search_input_focused`  
**Target:** > 60%

### Share Rate
**Formula:** `(screenshot_completed + url_share_started) / chart_loaded`  
**Target:** > 15%

### D1 Retention
**Cohort:** Users who performed `chart_loaded`  
**Return:** `app_session_start` within 24 hours  
**Target:** > 25%

### D7 Retention
**Cohort:** Users who performed `chart_loaded`  
**Return:** `app_session_start` within 7 days  
**Target:** > 15%

### Chart Load Success Rate
**Formula:** `chart_loaded / (chart_loaded + chart_load_failed)`  
**Target:** > 95%

### Average Comparisons per Session
**Formula:** `chart_loaded / app_session_start`  
**Target:** > 1.5

---

## 🚨 Alerts to Configure

### Critical (P1)
1. **Chart Load Failure Rate > 5%** (1 hour window)
2. **Session Start Drop > 30%** (day-over-day)

### High (P2)
3. **Funnel B Conversion Drop > 20%** (week-over-week)
4. **Chart Render P95 > 3000ms**

### Medium (P3)
5. **D1 Retention < 25%**
6. **Search Error Rate > 2%**

---

## 🔐 Privacy & Security

### What We Track
✅ Behavioral events (clicks, views, loads)  
✅ Performance metrics (render times, durations)  
✅ Device context (mobile/desktop, browser)  
✅ UTM parameters (marketing attribution)

### What We DON'T Track
❌ No personally identifiable information (PII)  
❌ No email addresses or user IDs (anonymous by default)  
❌ No raw error stack traces (sanitized messages only)  
❌ No collection names in searchqueries (slugs only, truncated)  
❌ No oversized payloads (capped at 500 chars per property)

### Safety Features
- Non-blocking event capture (never breaks UI)
- Error-proof try/catch wrappers
- `requestIdleCallback` for performance
- Property sanitization and truncation
- LocalStorage graceful degradation

---

## 📚 Implementation Checklist

### Phase 1: Foundation (✅ Complete)
- [x] Create safe analytics utility
- [x] Implement App.jsx session tracking
- [x] Set up user property management
- [x] Add first-visit detection
- [x] Track visibility changes

### Phase 2: Component Instrumentation (📋 Ready)
- [ ] Add SearchBar.jsx engagement tracking
- [ ] Add ComparisonExamples.jsx click tracking
- [ ] Add ChartDisplay.jsx conversion tracking
- [ ] Enhance ScreenshotShare.jsx tracking
- [ ] Add SettingsModal.jsx theme tracking
- [ ] Add CollectionMetrics.jsx metrics tracking
- [ ] Add ThemeContext.jsx persistence tracking

### Phase 3: PostHog Configuration (📖 Documented)
- [ ] Create Dashboard 1: Customer Journey Overview
- [ ] Create Dashboard 2: Product Health & Reliability
- [ ] Create Dashboard 3: Engagement & Feature Usage
- [ ] Create Dashboard 4: Retention & Growth
- [ ] Set up user cohorts (First-Time, Active, Sharers, Mobile)
- [ ] Configure critical alerts
- [ ] Enable session recordings for errors

### Phase 4: Testing & Deployment
- [ ] Test all events in development
- [ ] Verify PostHog dashboard setup
- [ ] Review data quality and privacy
- [ ] Deploy to production
- [ ] Monitor dashboards for 1 week
- [ ] Iterate based on insights

---

## 💡 Best Practices

### Event Naming
- Use `snake_case` (e.g., `chart_loaded`)
- Use past tense verbs (e.g., `clicked`, not `click`)
- Be descriptive (e.g., `search_input_focused` not just `focused`)

### Properties
- Keep property keys consistent across events
- Use enums for categorical values (e.g., `device_type: 'mobile' | 'desktop'`)
- Include context (e.g., `collection1_slug`, `collection2_slug`)

### Performance
- All events are non-blocking (async)
- Use timers for performance measurement
- Debounce high-frequency events (e.g., search typing)

### Debugging
- Check console for `[Analytics]` logs in development
- Use PostHog's Debug mode (`?__debug=true`)
- Verify Network tab shows event POSTs

---

## 🤝 Contributing

When adding new events:

1. Update event taxonomy in IMPLEMENTATION_GUIDE.md
2. Add to appropriate dashboard in POSTHOG_DASHBOARDS.md
3. Use `safeCapture()` wrapper for consistency
4. Include common context (device_type, slug, etc.)
5. Test in development before deploying
6. Document in commit message

---

## 📞 Support

### Common Issues

**Events not appearing:**
- Verify `VITE_POSTHOG_KEY` is set in `.env`
- Check reverse proxy config (`/ingest` in dev)
- Look for errors in browser console
- Confirm PostHog project is not paused

**LocalStorage errors:**
- Already handled gracefully in analytics.js
- Check browser privacy settings (some block localStorage)

**Performance concerns:**
- All events use idle callback or setTimeout(0)
- No synchronous operations
- Payload sizes are capped

### Get Help

- 📖 Review [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- 📊 Check [POSTHOG_DASHBOARDS.md](./POSTHOG_DASHBOARDS.md)
- 🐛 Check browser console for `[Analytics]` errors
- 🔍 Use PostHog's Live Events feed for real-time debugging

---

## 🎓 Learning Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React Integration](https://posthog.com/docs/libraries/react)
- [Product Analytics Best Practices](https://posthog.com/blog/product-analytics-best-practices)
- [Funnel Analysis Guide](https://posthog.com/docs/user-guides/funnels)

---

Last Updated: 2025-01-24  
Version: 1.0.0  
Maintained by: NFT Floor Compare Team
