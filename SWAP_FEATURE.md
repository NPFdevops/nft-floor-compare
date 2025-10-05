# Swap Collections Feature

## Overview
Added a swap functionality that allows users to switch the positions of Collection 1 and Collection 2 throughout the application.

## Implementation Details

### App.jsx Changes
- **New Function**: `handleSwapCollections()` - Swaps the state of both collections including their data, loading states, and error states
- **Analytics**: Tracks swap events with PostHog analytics
- **Haptic Feedback**: Provides tactile feedback on mobile devices
- **URL Sync**: The swap is automatically reflected in the URL parameters

### CollectionMetrics.jsx Changes
- **Swap Button**: Added a prominent swap button in the component header
- **Responsive Design**: Shows "Swap Collections" on desktop, "Swap" on mobile
- **Conditional Rendering**: Only shows when both collections are selected
- **Brutalist Design**: Follows the app's design system with black borders and drop shadows

### PriceBanner.jsx Changes
- **Swap Button**: Added a smaller swap button in the header for quick access
- **Integrated Design**: Button blends with the banner's color scheme
- **Accessibility**: Proper hover states and focus indicators

## User Experience
1. **Visual Feedback**: Instant swap of all collection data and displays
2. **Consistency**: Collection names, metrics, charts, and price projections all update simultaneously
3. **Accessibility**: Buttons have proper titles and keyboard navigation
4. **Mobile Optimized**: Touch-friendly buttons with haptic feedback

## Technical Features
- **State Management**: Properly swaps all related states (collections, loading, errors)
- **URL Synchronization**: Swap is reflected in shareable URLs
- **Analytics Tracking**: User interactions are tracked for product insights
- **Error Handling**: Maintains error states during swap operations
- **Performance**: No API calls required - just state manipulation

## Design System Compliance
- ✅ Black borders (`border-2 border-black`)
- ✅ Sharp corners (`rounded-none`)
- ✅ Drop shadows (`shadow-[4px_4px_0px_#000000]`)
- ✅ Hover animations (`hover:scale-105`)
- ✅ Material Design icons (`swap_horiz`)
- ✅ Responsive typography and spacing

## Usage
Users can swap collections by clicking the swap button in either:
1. **CollectionMetrics component** - Main swap button in the header
2. **PriceBanner component** - Quick swap button next to "Price Projection" title

The swap action immediately updates:
- Chart titles and data
- Collection metrics comparison
- Price projection calculations
- URL parameters for sharing