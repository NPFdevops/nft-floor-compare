import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const ChartDisplay = ({ collection1, collection2, layout, loading }) => {
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const collectionName = context.dataset.label;
            const price = context.parsed.y;
            return `${collectionName}: ${price} ETH`;
          },
          afterLabel: function(context) {
            const date = new Date(context.parsed.x);
            return `Date: ${date.toLocaleDateString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM dd'
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Floor Price (ETH)'
        },
        ticks: {
          callback: function(value) {
            return value + ' ETH';
          }
        }
      }
    },
  }), []);

  const prepareChartData = (collections) => {
    const datasets = [];
    const colors = ['#8b5cf6', '#10b981']; // Purple and green
    
    collections.forEach((collection, index) => {
      if (collection && collection.data) {
        const data = collection.data.map(point => ({
          x: new Date(point.timestamp),
          y: parseFloat(point.floor_price)
        }));

        datasets.push({
          label: collection.name,
          data: data,
          borderColor: colors[index],
          backgroundColor: colors[index] + '20',
          tension: 0.1,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
        });
      }
    });

    return { datasets };
  };

  const renderChart = (collections, title) => {
    const hasData = collections.some(c => c && c.data && c.data.length > 0);
    
    if (!hasData) {
      return (
        <div className="chart-placeholder">
          <div className="placeholder-content">
            <h3>{title}</h3>
            <p>No data to display</p>
            <span>Search for collections to see their floor price charts</span>
          </div>
        </div>
      );
    }

    const chartData = prepareChartData(collections);
    
    return (
      <div className="chart-wrapper">
        <h3>{title}</h3>
        <div className="chart-canvas-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  };

  const renderLoadingState = (collectionName) => (
    <div className="chart-loading">
      <div className="loading-spinner"></div>
      <p>Loading {collectionName} data...</p>
    </div>
  );

  if (layout === 'horizontal') {
    return (
      <div className="charts-horizontal">
        <div className="chart-section">
          {loading.collection1 && renderLoadingState('first collection')}
          {!loading.collection1 && renderChart([collection1], collection1?.name || 'Collection 1')}
        </div>
        <div className="chart-section">
          {loading.collection2 && renderLoadingState('second collection')}
          {!loading.collection2 && renderChart([collection2], collection2?.name || 'Collection 2')}
        </div>
      </div>
    );
  }

  // Vertical layout or combined view
  if (collection1 && collection2 && !loading.collection1 && !loading.collection2) {
    // Show combined chart when both collections are loaded
    return (
      <div className="charts-vertical">
        <div className="chart-section full-width">
          {renderChart([collection1, collection2], 'Floor Price Comparison')}
        </div>
      </div>
    );
  }

  // Show individual charts in vertical layout
  return (
    <div className="charts-vertical">
      <div className="chart-section">
        {loading.collection1 && renderLoadingState('first collection')}
        {!loading.collection1 && renderChart([collection1], collection1?.name || 'Collection 1')}
      </div>
      <div className="chart-section">
        {loading.collection2 && renderLoadingState('second collection')}
        {!loading.collection2 && renderChart([collection2], collection2?.name || 'Collection 2')}
      </div>
    </div>
  );
};

export default ChartDisplay;
