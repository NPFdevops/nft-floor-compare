# NFT Floor Price Compare

A lightweight web application for NFT collectors and researchers to visually compare floor price charts of two collections side-by-side. Users can search for two collections via dedicated search bars, fetch floor price history from the nftpricefloor API, and toggle between vertical or horizontal layouts. One-click screenshot and share options help users communicate insights quickly.

![NFT Floor Compare Screenshot](https://via.placeholder.com/800x400/8b5cf6/ffffff?text=NFT+Floor+Compare)

## Features

✨ **Side-by-Side Comparison**: Compare floor price charts of two NFT collections simultaneously

🔍 **Smart Search**: Search for collections with autocomplete suggestions

📊 **Interactive Charts**: Powered by Chart.js with responsive design and hover tooltips

📱 **Responsive Layout**: Toggle between horizontal and vertical layouts, mobile-friendly

📸 **Screenshot & Share**: Capture and download comparisons with one click

🎨 **Modern UI**: Clean, professional interface with smooth animations

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nft-floor-compare
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Search Collections**: Use the search bars to find NFT collections. The app provides autocomplete suggestions as you type.

2. **View Charts**: Once collections are selected, their floor price charts will appear automatically.

3. **Toggle Layout**: Switch between horizontal (side-by-side) and vertical (stacked) layouts using the layout toggle buttons.

4. **Screenshot**: Click the "Screenshot" button to capture and download the current comparison as a PNG image.

5. **Share**: Use the "Share" button to share your comparison via native sharing options (where supported) or copy text to clipboard.

## Technology Stack

- **Frontend**: React 19, Vite
- **Charts**: Chart.js with react-chartjs-2
- **Screenshots**: html2canvas
- **HTTP Client**: Axios
- **Styling**: Custom CSS with CSS variables
- **Date Handling**: date-fns with chartjs-adapter-date-fns

## API Integration

This application integrates with the NFT Price Floor API to fetch:
- Collection search results with autocomplete
- Historical floor price data for selected time periods
- Current floor price information

### API Endpoints Used

- `GET /v1/search/collections` - Search for collections
- `GET /v1/collection/{slug}/floor-price-history` - Get historical floor prices
- `GET /v1/collection/{slug}/current` - Get current floor price

## Project Structure

```
src/
├── components/           # React components
│   ├── SearchBar.jsx    # Collection search with autocomplete
│   ├── ChartDisplay.jsx # Chart rendering and layout
│   ├── LayoutToggle.jsx # Layout switching controls
│   └── ScreenshotShare.jsx # Screenshot and sharing functionality
├── services/            # API integration
│   └── nftAPI.js       # NFT Price Floor API client
├── App.jsx             # Main application component
├── App.css             # Application styles
├── main.jsx            # React entry point
└── index.css           # Global styles and CSS variables
```

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with modern JavaScript support

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [NFT Price Floor API](https://api.nftpricefloor.com) for providing the floor price data
- [Chart.js](https://www.chartjs.org/) for the excellent charting library
- [html2canvas](https://html2canvas.hertzen.com/) for screenshot functionality
- [React](https://react.dev/) for the UI framework
- [Vite](https://vitejs.dev/) for the build tool

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-username/nft-floor-compare/issues) on GitHub.

---

Made with ❤️ for the NFT community
