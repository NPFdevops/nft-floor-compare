import React, { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';
import './TradingViewChart.css';
import logoImage from '../assets/NFTPriceFloor_logo.png';

const TradingViewChart = ({
  collections = [],
  title = 'Floor Price Chart',
  onRangeChange,
  height = 400,
  currency = 'ETH',
  isLogScale = false,
  currentTimeRange = 'All' // Prop to sync selected range from parent
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRefs = useRef([]);
  const [selectedRange, setSelectedRange] = useState(currentTimeRange);

  // Sync local state with prop when it changes
  useEffect(() => {
    setSelectedRange(currentTimeRange);
  }, [currentTimeRange]);

  const ranges = [
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
    { label: 'YTD', days: null }, // null indicates YTD calculation
    { label: 'All', days: null }
  ];

  const colors = [
    { line: '#e91e63', top: 'rgba(233, 30, 99, 0.2)', bottom: 'rgba(233, 30, 99, 0.05)' }, // Pink gradient
    { line: '#9c27b0', top: 'rgba(156, 39, 176, 0.2)', bottom: 'rgba(156, 39, 176, 0.05)' }, // Purple gradient
    { line: '#673ab7', top: 'rgba(103, 58, 183, 0.2)', bottom: 'rgba(103, 58, 183, 0.05)' }, // Deep purple gradient
    { line: '#3f51b5', top: 'rgba(63, 81, 181, 0.2)', bottom: 'rgba(63, 81, 181, 0.05)' }  // Indigo gradient
  ];

  // Filter data based on selected time range
  const filterDataByRange = (data, rangeLabel) => {
    if (!data || data.length === 0) return data;

    const now = new Date();
    let cutoffDate;

    if (rangeLabel === 'All') {
      console.log('🔵 Range is "All" - returning all data');
      return data; // Return all data
    } else if (rangeLabel === 'YTD') {
      // Year to date - from Jan 1 of current year
      cutoffDate = new Date(now.getFullYear(), 0, 1);
      console.log(`🔵 YTD filter - cutoff date: ${cutoffDate.toISOString()}`);
    } else {
      // For 30D, 90D - calculate days back
      const range = ranges.find(r => r.label === rangeLabel);
      if (!range || !range.days) {
        console.log(`⚠️ Invalid range: ${rangeLabel}, returning all data`);
        return data;
      }

      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - range.days);
      console.log(`🔵 ${rangeLabel} filter - cutoff date: ${cutoffDate.toISOString()}, days: ${range.days}`);
    }

    // Filter data points after cutoff date
    const filtered = data.filter(point => {
      const pointDate = point.x instanceof Date ? point.x : new Date(point.x);
      return pointDate >= cutoffDate;
    });

    console.log(`🔵 Filtered ${data.length} points to ${filtered.length} points for range ${rangeLabel}`);
    if (filtered.length > 0) {
      const firstPoint = filtered[0];
      const lastPoint = filtered[filtered.length - 1];
      const firstDate = firstPoint.x instanceof Date ? firstPoint.x : new Date(firstPoint.x);
      const lastDate = lastPoint.x instanceof Date ? lastPoint.x : new Date(lastPoint.x);
      console.log(`🔵 Date range: ${firstDate.toISOString()} to ${lastDate.toISOString()}`);
    }

    return filtered;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        // Chart already disposed, ignore
      }
      chartRef.current = null;
    }

    // Use setTimeout to ensure DOM is fully ready - increased delay for production
    const timer = setTimeout(() => {
      if (!chartContainerRef.current) return;
      
      // Ensure container has proper dimensions with retries
      let containerWidth = chartContainerRef.current.clientWidth;
      let containerHeight = height || 400;
      
      // Fallback for when container dimensions aren't ready yet
      if (!containerWidth || containerWidth < 100) {
        containerWidth = chartContainerRef.current.offsetWidth || 600;
      }
      if (!containerWidth || containerWidth < 100) {
        containerWidth = 600; // Final fallback
      }
      
      console.log('Chart container dimensions:', { containerWidth, containerHeight });
      
      // Detect dark mode by checking if .dark class exists on document element
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      // Get colors from CSS variables
      const rootStyles = getComputedStyle(document.documentElement);
      const backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
      const textColor = isDarkMode ? '#e0e0e0' : '#666666';
      const gridColor = isDarkMode ? '#333333' : '#f0f0f0';
      
      // Create chart following latest documentation
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: 'solid', color: backgroundColor },
          textColor: textColor,
        },
        width: containerWidth,
        height: containerHeight,
        grid: {
          vertLines: {
            visible: false,
          },
          horzLines: {
            color: gridColor,
            style: 1,
          },
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          // Format price scale based on currency
          priceFormat: {
            type: 'price',
            precision: currency === 'USD' ? 2 : 2,
            minMove: currency === 'USD' ? 0.01 : 0.01,
          },
          mode: isLogScale ? 1 : 0, // 0 = Normal, 1 = Logarithmic
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: false,
          rightBarStaysOnScroll: false,
          lockVisibleTimeRangeOnResize: false,
          rightOffset: 5,
          barSpacing: 6,
        },
        // Enable interactive features: zoom, pan, and drag
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: {
            time: true,
            price: true,
          },
          axisDoubleClickReset: {
            time: true,
            price: true,
          },
        },
        crosshair: {
          mode: 1, // Normal crosshair mode
          vertLine: {
            width: 1,
            color: isDarkMode ? '#666666' : '#999999',
            style: 3, // Dashed line
            labelBackgroundColor: isDarkMode ? '#333333' : '#cccccc',
          },
          horzLine: {
            width: 1,
            color: isDarkMode ? '#666666' : '#999999',
            style: 3, // Dashed line
            labelBackgroundColor: isDarkMode ? '#333333' : '#cccccc',
          },
        },
        watermark: {
          visible: false, // Disable text watermark since we'll use image overlay
        },
      });


    chartRef.current = chart;
    seriesRefs.current = [];

    console.log('🚀 TradingViewChart received collections:', {
      totalCollections: collections.length,
      collectionNames: collections.map(c => c?.name),
      collectionsWithData: collections.filter(c => c?.data?.length > 0).length
    });

    // Add line series for each collection
    collections.forEach((collection, index) => {
      console.log(`🔍 TradingViewChart processing collection ${index}:`, {
        name: collection?.name,
        hasData: !!collection?.data,
        dataLength: collection?.data?.length,
        sampleData: collection?.data?.slice(0, 3),
        colorConfig: colors[index] || colors[0],
        selectedRange
      });

      if (collection && collection.data && Array.isArray(collection.data) && collection.data.length > 0) {
        try {
          // Filter data based on selected time range
          const filteredData = filterDataByRange(collection.data, selectedRange);

          console.log(`📊 Filtered data for ${collection.name}:`, {
            originalLength: collection.data.length,
            filteredLength: filteredData.length,
            selectedRange
          });

          // Use v5.0 API with AreaSeries type for gradient fill
          const colorConfig = colors[index] || colors[0];
          const areaSeries = chart.addSeries(AreaSeries, {
            lineColor: colorConfig.line,
            topColor: colorConfig.top,
            bottomColor: colorConfig.bottom,
            lineWidth: 3, // Increased line width for better visibility
            lineStyle: 0, // Solid line
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 6,
            crosshairMarkerBorderColor: colorConfig.line,
            crosshairMarkerBackgroundColor: colorConfig.line,
            lastValueVisible: true,
            priceLineVisible: true,
        });

          // Convert data format for TradingView Lightweight Charts
          // Data format: [{ time: '2018-12-22', value: 32.51 }, ...]
          const chartData = filteredData
            .filter(point => {
              // More robust data validation (from HEAD)
              if (!point || !point.x) return false;
              if (point.y === undefined || point.y === null) return false;
              const value = parseFloat(point.y);
              if (isNaN(value) || value < 0) return false;
              
              // Validate date
              const date = point.x instanceof Date ? point.x : new Date(point.x);
              if (isNaN(date.getTime())) return false;
              
              return true;
            })
            .map(point => {
              // Convert to YYYY-MM-DD format as required by TradingView
              const date = point.x instanceof Date ? point.x : new Date(point.x);
              const time = date.toISOString().split('T')[0]; // YYYY-MM-DD format
              const value = parseFloat(point.y);
              return { time, value };
            })
            .filter(point => point.value > 0)
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            // Remove duplicates by keeping the last value for each unique date
            .reduce((acc, current) => {
              const existingIndex = acc.findIndex(item => item.time === current.time);
              if (existingIndex >= 0) {
                // Replace existing entry with current one (keep latest)
                acc[existingIndex] = current;
              } else {
                acc.push(current);
              }
              return acc;
            }, [])
            // Final sort to ensure strict ascending order
            .sort((a, b) => new Date(a.time) - new Date(b.time));

          console.log(`📊 TradingViewChart data transformation for ${collection.name}:`, {
            collectionIndex: index,
            originalDataLength: collection.data.length,
            afterFilterLength: filteredData.filter(point => {
              if (!point || !point.x) return false;
              if (point.y === undefined || point.y === null) return false;
              const value = parseFloat(point.y);
              if (isNaN(value) || value < 0) return false;
              const date = point.x instanceof Date ? point.x : new Date(point.x);
              if (isNaN(date.getTime())) return false;
              return true;
            }).length,
            chartDataLength: chartData.length,
            sampleOriginalData: filteredData.slice(0, 3),
            sampleChartData: chartData.slice(0, 3),
            // Check for duplicates
            hasDuplicateTimes: chartData.length !== new Set(chartData.map(d => d.time)).size,
            uniqueTimes: new Set(chartData.map(d => d.time)).size,
            // Data validation
            hasValidData: chartData.every(point => point.time && !isNaN(point.value) && point.value > 0),
            invalidDataPoints: chartData.filter(point => !point.time || isNaN(point.value) || point.value <= 0).length,
            colorConfig
          });

          if (chartData.length > 0) {
            console.log(`✅ Setting chart data for ${collection.name || `collection ${index}`}:`, {
              dataPoints: chartData.length,
              firstPoint: chartData[0],
              lastPoint: chartData[chartData.length - 1]
            });
            
            areaSeries.setData(chartData);
            seriesRefs.current[index] = areaSeries;
            console.log(`✨ Successfully set chart data for ${collection.name} (series ${index} added)`);
            
            // Add custom tooltip formatting based on currency
            areaSeries.applyOptions({
              priceFormat: {
                type: 'custom',
                formatter: (price) => {
                  if (currency === 'USD') {
                    return `$${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  } else {
                    return `${parseFloat(price).toFixed(2)} ETH`;
                  }
                },
              },
            });
          } else {
            console.warn(`⚠️ No valid chart data for ${collection.name || index} after processing:`, {
              originalDataLength: collection.data?.length,
              collection: collection.name
            });
          }
        } catch (error) {
          console.error('Error creating line series:', error);
        }
      }
    });

    // Fit content to show all data
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          try {
            chartRef.current.remove();
          } catch (e) {
            // Chart already disposed, ignore
          }
          chartRef.current = null;
        }
        seriesRefs.current = [];
      };
    }, 250); // Increased delay for production environments

    // Cleanup timeout on unmount
    return () => {
      clearTimeout(timer);
    };
  }, [collections, height, currency, isLogScale, selectedRange]);

  // Show placeholder if no valid data
  if (!collections || collections.length === 0 || !collections.some(c => c && c.data && c.data.length > 0)) {
    return (
      <div className="trading-view-chart-container">
        <div className="chart-placeholder" style={{ height: `${height}px` }}>
          <div className="placeholder-content">
            <p>No data to display</p>
            <span>Select collections to see their floor price charts</span>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="trading-view-chart-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={chartContainerRef}
        className="chart-container"
        style={{
          width: '100%',
          height: `${height}px`,
          minHeight: `${height}px`
        }}
      />
      {/* Logo Watermark Overlay */}
      <div
        className="chart-logo-watermark"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 1,
          userSelect: 'none'
        }}
      >
        <img
          src={logoImage}
          alt="NFT Price Floor"
          style={{
            height: '60px',
            width: 'auto',
            opacity: 0.5
          }}
        />
      </div>
    </div>
  );
};

export default TradingViewChart;
