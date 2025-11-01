# PostHog Dashboard Setup Guide

## Quick Start

This guide shows you how to create dashboards, funnels, and insights in your PostHog project for the NFT Floor Compare application.

---

## Dashboard 1: Customer Journey Overview

### Setup Instructions

1. In PostHog, go to **Dashboards** → **New Dashboard**
2. Name: "Customer Journey - NFT Floor Compare"
3. Description: "Track user awareness, engagement, conversion, and retention"
4. Tags: `journey_awareness`, `kpi`, `main`

### Insights to Add

#### 1. Session Starts (Trend)
- **Type:** Trends
- **Event:** `app_session_start`
- **Breakdown by:** `device_type`, `is_first_visit`
- **Chart type:** Line graph
- **Date range:** Last 30 days

#### 2. Funnel A: Awareness → Engagement → Conversion
- **Type:** Funnel
- **Steps:**
  1. `app_session_start`
  2. `search_input_focused` OR `example_comparison_clicked`
  3. `chart_loaded`
- **Conversion window:** 7 days
- **Breakdown by:** `device_type`
- **Order:** Sequential (strict)

#### 3. Funnel B: First Visit Journey
- **Type:** Funnel
- **Steps:**
  1. `app_session_start` (filter: `is_first_visit = true`)
  2. `collection_selected`
  3. `chart_loaded`
  4. `screenshot_completed` OR `url_share_started`
- **Conversion window:** 30 minutes
- **Breakdown by:** `device_type`

#### 4. Activation Rate (Formula)
- **Type:** Insight
- **Formula:** `(chart_loaded where is_first_visit=true) / (app_session_start where is_first_visit=true)`
- **Display:** Big number (percentage)
- **Target:** > 40%

#### 5. Share Rate
- **Type:** Insight
- **Formula:** `(screenshot_completed + url_share_started) / chart_loaded`
- **Display:** Big number (percentage)
- **Target:** > 15%

---

## Dashboard 2: Product Health & Reliability

### Setup Instructions

1. **Dashboards** → **New Dashboard**
2. Name: "Product Health - Reliability"
3. Tags: `reliability`, `errors`, `monitoring`

### Insights to Add

#### 1. Chart Load Success Rate
- **Type:** Trends
- **Events:** 
  - A: `chart_loaded` (success)
  - B: `chart_load_failed` (failure)
- **Formula:** `A / (A + B)`
- **Display:** Line graph
- **Alert:** If < 95% over 1 hour
- **Breakdown by:** `device_type`

#### 2. Error Details Table
- **Type:** Data table
- **Event:** `chart_load_failed`
- **Properties to show:**
  - `code`
  - `message_sanitized`
  - `collection1_slug`
  - `collection2_slug`
  - `device_type`
- **Date range:** Last 7 days
- **Limit:** 100 rows

#### 3. Chart Render Performance
- **Type:** Trends
- **Event:** `chart_loaded`
- **Property:** `render_ms`
- **Aggregation:** P50, P90, P95
- **Display:** Line graph
- **Target:** P95 < 2000ms

#### 4. Search Errors
- **Type:** Trends
- **Event:** `search_error`
- **Breakdown by:** `code`
- **Display:** Bar chart

---

## Dashboard 3: Engagement & Feature Usage

### Setup Instructions

1. **Dashboards** → **New Dashboard**
2. Name: "Feature Engagement"
3. Tags: `engagement`, `features`

### Insights to Add

#### 1. Search Activity
- **Type:** Trends
- **Events:**
  - `search_input_focused`
  - `search_query_typed`
  - `collection_selected`
- **Display:** Stacked area chart
- **Breakdown by:** `device_type`

#### 2. Example vs Custom Comparisons
- **Type:** Trends
- **Events:**
  - `example_comparison_clicked`
  - `custom_comparison_clicked`
- **Display:** Pie chart
- **Date range:** Last 30 days

#### 3. Popular Collections (Top 10)
- **Type:** Data table
- **Event:** `collection_selected`
- **Property:** `collection_slug`
- **Aggregation:** Count
- **Limit:** 10
- **Display:** Horizontal bar chart

#### 4. Screenshot & Share Activity
- **Type:** Trends
- **Events:**
  - `screenshot_completed`
  - `url_share_started`
  - `copy_to_clipboard_success`
- **Display:** Line graph

#### 5. Theme Preferences
- **Type:** Trends
- **Event:** `theme_changed`
- **Breakdown by:** `next` (theme value)
- **Display:** Pie chart

---

## Dashboard 4: Retention & Growth

### Setup Instructions

1. **Dashboards** → **New Dashboard**
2. Name: "Retention & Growth"
3. Tags: `retention`, `growth`, `kpi`

### Insights to Add

#### 1. D1/D7/D30 Retention
- **Type:** Retention
- **Cohort event:** `chart_loaded` (first time)
- **Return event:** `app_session_start`
- **Intervals:** Daily (show D1, D7, D30)
- **Cohort size:** Weekly

#### 2. Weekly Active Users
- **Type:** Trends
- **Event:** `app_session_start`
- **Aggregation:** Unique users
- **Interval:** Week
- **Date range:** Last 3 months

#### 3. Average Comparisons per Session
- **Type:** Insight
- **Formula:** `chart_loaded / app_session_start`
- **Display:** Big number
- **Target:** > 1.5

#### 4. Session Duration
- **Type:** Trends
- **Event:** `app_session_end`
- **Property:** `active_ms`
- **Aggregation:** Average, Median
- **Display:** Line graph

#### 5. Return Visitor Rate
- **Type:** Insight
- **Formula:** `(app_session_start where is_return_visit=true) / app_session_start`
- **Display:** Big number (percentage)

---

## User Paths Analysis

### Setup Instructions

1. **Product Analytics** → **Paths**
2. Name: "User Journey Paths"
3. **Start point:** `app_session_start`
4. **End point:** Any
5. **Path depth:** 5 steps
6. **Filters:** None (or filter by device_type/date)

### What to Look For:
- Most common paths to `chart_loaded`
- Drop-off points before conversion
- Unexpected user behaviors
- Successful vs failed journeys

---

## Cohort Definitions

### Cohort 1: First-Time Users
- **Name:** "First-Time Users"
- **Definition:** Users who performed `app_session_start` with `is_first_visit = true`
- **Use for:** Activation funnel analysis

### Cohort 2: Active Comparers
- **Name:** "Active Comparers"
- **Definition:** Users who performed `chart_loaded` ≥ 3 times in last 7 days
- **Use for:** Power user analysis

### Cohort 3: Sharers
- **Name:** "Sharers"
- **Definition:** Users who performed `screenshot_completed` OR `url_share_started`
- **Use for:** Viral loop analysis

### Cohort 4: Mobile Users
- **Name:** "Mobile Users"
- **Definition:** Users with `device_type = mobile`
- **Use for:** Mobile experience optimization

---

## Alerts Configuration

### Critical Alerts (Slack/Email)

#### 1. Chart Load Failure Rate
- **Condition:** `chart_load_failed rate > 5%` over 1 hour
- **Channels:** Slack #engineering-alerts
- **Priority:** P1 (Critical)

#### 2. Funnel B Conversion Drop
- **Condition:** First-visit funnel conversion rate drops > 20% week-over-week
- **Channels:** Slack #product-alerts
- **Priority:** P2 (High)

#### 3. Session Start Anomaly
- **Condition:** `app_session_start` count drops > 30% from previous day
- **Channels:** Slack #growth-alerts
- **Priority:** P2 (High)

### Warning Alerts

#### 4. D1 Retention Below Threshold
- **Condition:** D1 retention < 25%
- **Channels:** Email to product team
- **Priority:** P3 (Medium)

#### 5. Average Render Time Spike
- **Condition:** P95 `render_ms` > 3000ms
- **Channels:** Slack #engineering-performance
- **Priority:** P3 (Medium)

---

## Session Recordings Setup

### Enable Recordings for:

1. **All error states:**
   - Filter: Event = `chart_load_failed`
   - Sample rate: 100%

2. **New users (first session):**
   - Filter: Event = `app_session_start` where `is_first_visit = true`
   - Sample rate: 10%

3. **Share events:**
   - Filter: Event = `screenshot_completed` OR `url_share_started`
   - Sample rate: 5%

### Privacy Settings:
- ✅ Mask all input fields
- ✅ Mask email addresses
- ✅ Mask credit card numbers
- ❌ Don't record on explicit opt-out

---

## Feature Flags Integration (Future)

When ready to add feature flags:

### Flag 1: `new-comparison-ui`
- **Rollout:** 10% → 50% → 100%
- **Track:** `feature_flag_called` with `flag_key = new-comparison-ui`
- **Metrics:** Compare `chart_loaded` conversion rates

### Flag 2: `enhanced-metrics`
- **Rollout:** Beta users first
- **Track:** `metrics_viewed` frequency
- **Metrics:** Engagement with new metrics panel

---

## Data Quality Checks

### Weekly Review Checklist:

- ✅ Event volume trends (no unexpected drops)
- ✅ User property completeness (device_type, session_count populated)
- ✅ Error event details (messages make sense, no PII leaks)
- ✅ Funnel conversion rates (stable or improving)
- ✅ Path analysis (no unexpected loops or dead ends)
- ✅ Session recordings (representative sample, no privacy issues)

---

## Useful PostHog Queries (HogQL)

### Most Active Users (by comparisons):
```sql
SELECT 
  person_id,
  count(*) as comparison_count
FROM events
WHERE event = 'chart_loaded'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY person_id
ORDER BY comparison_count DESC
LIMIT 10
```

### Average Session Duration:
```sql
SELECT 
  avg(properties.active_ms) / 1000 as avg_session_seconds
FROM events
WHERE event = 'app_session_end'
  AND timestamp > now() - INTERVAL 30 DAY
```

### Conversion Rate by Referrer:
```sql
SELECT 
  properties.referrer_domain,
  countIf(event = 'chart_loaded') as conversions,
  countIf(event = 'app_session_start') as sessions,
  conversions / sessions as conversion_rate
FROM events
WHERE timestamp > now() - INTERVAL 30 DAY
GROUP BY properties.referrer_domain
ORDER BY sessions DESC
LIMIT 20
```

---

Last Updated: 2025-01-24
Version: 1.0.0
