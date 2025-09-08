# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

NFT Floor Price Compare is a React-based web application that allows users to visually compare floor price charts of two NFT collections side-by-side. The app integrates with the NFT Price Floor API to fetch real-time and historical price data.

## Common Development Commands

### Development Server
```bash
npm run dev          # Start Vite development server on http://localhost:5173
```

### Build Commands
```bash
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

### Package Management
```bash
npm install          # Install all dependencies
npm install <package> # Add new dependency
```

### Environment Setup
```bash
cp .env.example .env # Copy environment template
# Edit .env to add your RapidAPI key:
# VITE_RAPIDAPI_KEY=your_rapidapi_key_here
```

## Architecture Overview

### Application Structure
- **React 19** with Vite as the build tool
- **Component-based architecture** with clear separation of concerns
- **Service layer** for API integration
- **State management** via React hooks (no external state library)

### Key Components
- **App.jsx**: Main application component managing global state (selected collections, layout, loading states)
- **SearchBar.jsx**: Handles collection search with autocomplete functionality and debounced API calls
- **ChartDisplay.jsx**: Renders Chart.js charts for price comparison
- **LayoutToggle.jsx**: Controls horizontal/vertical layout switching
- **ScreenshotShare.jsx**: Provides screenshot capture using html2canvas and URL sharing functionality

### API Service Layer
- **nftAPI.js**: Centralized API client with three main functions:
  - `fetchFloorPriceHistory()`: Gets historical price data for charts
  - `searchCollections()`: Provides autocomplete suggestions
  - `getCurrentFloorPrice()`: Fetches current floor price data

### Data Flow
1. User searches for collections via SearchBar components
2. API calls are made through the nftAPI service layer
3. App.jsx manages the response data and error states
4. ChartDisplay receives collection data and renders Chart.js visualizations
5. Layout and sharing controls operate on the rendered chart container

### State Management Pattern
The app uses a centralized state pattern where App.jsx maintains:
- `collection1` and `collection2`: Selected collection data objects
- `layout`: Current display layout ('horizontal' or 'vertical')
- `loading`: Loading states for each collection API call
- `error`: Error states for failed API requests

### API Integration Notes
- **RapidAPI Integration**: Uses `nftpf-api-v0.p.rapidapi.com` via RapidAPI
- **Authentication**: Requires `VITE_RAPIDAPI_KEY` environment variable
- **Endpoint Pattern**: `/projects/{slug}/history/pricefloor/{granularity}?start={timestamp}&end={timestamp}`
- **Response Format**: Returns arrays of timestamps, floorEth, floorUsd, volumeEth, volumeUsd, salesCount
- **Search Functionality**: Uses predefined list of common NFT collections for autocomplete
- **Current Price**: Derived from latest historical data point
- All API functions return consistent response objects with `success` boolean and error handling
- Default history fetch is 30 days with '1d' granularity, but can be customized

### Dependencies
- **Chart.js ecosystem**: chart.js, react-chartjs-2, chartjs-adapter-date-fns, date-fns
- **HTTP client**: axios for API requests
- **Screenshot functionality**: html2canvas for image capture
- **URL routing**: react-router-dom for shareable URL parameters
- **Build tools**: Vite with React plugin

## Development Patterns

### Error Handling
All API calls follow a consistent error handling pattern returning objects with `success`, `error`, and `data` properties. UI components display errors inline near related inputs.

### Loading States
Loading states are managed per collection to allow independent loading indicators. The UI shows spinners and disables inputs during API calls.

### Responsive Design
The application uses CSS Grid and Flexbox with a toggle between horizontal (side-by-side) and vertical (stacked) chart layouts. All components are mobile-responsive.

### Search UX
Search bars implement debounced autocomplete with suggestion dropdowns, direct slug input fallback, and clear/remove functionality.

### URL Sharing
The application implements URL-based state sharing for enhanced user experience:
- **URL Parameters**: Collections and timeframe are encoded in URL query parameters (`c1`, `c2`, `t`, `layout`)
- **Shareable Links**: Users can share URLs that automatically load specific collection comparisons
- **URL Synchronization**: App state changes are reflected in the URL in real-time for browser history support
- **Deep Linking**: Direct links to specific comparisons work on page load
- **Share Functionality**: Multiple sharing options including URL copying, native share API, and screenshot sharing
