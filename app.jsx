import React, { useState, useEffect, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Papa from 'papaparse';

const TaxImpactVisualization = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChart, setActiveChart] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const fileContent = await window.fs.readFile('household_tax_income_changes_senate_current_law_baseline.csv', { encoding: 'utf8' });
        
        Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Clean and process data
            const processedData = results.data.map(row => ({
              income: row['Market Income'] || 0,
              percentageChange: row['Percentage Change in Net Income'] || 0,
              totalChange: row['Total Change in Net Income'] || 0,
              weight: row['Household Weight'] || 1,
              state: row['State'] || '',
            })).filter(d => d.income > 0 && Math.abs(d.percentageChange) < 50); // Filter outliers
            
            setData(processedData);
            setLoading(false);
          },
          error: (err) => {
            setError(err.message);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const statistics = useMemo(() => {
    if (data.length === 0) return { gained: 0, lost: 0, noChange: 0 };
    
    const gained = data.filter(d => d.percentageChange > 0.01).length;
    const lost = data.filter(d => d.percentageChange < -0.01).length;
    const noChange = data.filter(d => Math.abs(d.percentageChange) <= 0.01).length;
    const total = data.length;
    
    return {
      gained: Math.round((gained / total) * 100),
      lost: Math.round((lost / total) * 100),
      noChange: Math.round((noChange / total) * 100),
    };
  }, [data]);

  const chartData = useMemo(() => {
    return data.map(d => ({
      x: d.percentageChange * 100, // Convert to percentage
      y: d.income,
      fill: d.percentageChange > 0 ? '#22c55e' : d.percentageChange < 0 ? '#ef4444' : '#6b7280',
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-sm">
          <p className="text-sm">Income: ${data.payload.y.toLocaleString()}</p>
          <p className="text-sm">Change: {data.payload.x.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const chartConfigs = [
    { xlim: [-12, 12], ylim: [0, 50000] },
    { xlim: [-18, 18], ylim: [0, 500000] },
    { xlim: [-18, 18], ylim: [0, 350000] },
    { xlim: [-18, 18], ylim: [0, 250000] },
    { xlim: [-25, 25], ylim: [0, 120000] },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error loading data: {error}</div>
      </div>
    );
  }

  const currentConfig = chartConfigs[activeChart];

  return (
    <div className="max-w-4xl mx-auto p-6 font-serif">
      {/* NYT Header */}
      <header className="border-b border-gray-300 pb-4 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <button className="text-2xl">☰</button>
            <button className="text-2xl">🔍</button>
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            The New York Times
          </h1>
          <div className="flex items-center space-x-4">
            <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-sans">
              GIVE THE TIMES
            </button>
            <button className="text-sm font-sans">Account ▼</button>
          </div>
        </div>
      </header>

      {/* Article */}
      <article>
        <div className="text-center mb-8">
          <p className="text-red-600 font-sans text-sm font-bold mb-4">OPINION</p>
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            These 40,000 Families Show<br />
            Us Who the Winners and Losers<br />
            of the "Big Beautiful Bill" Are
          </h1>
          <p className="text-gray-600 mb-2">By The New York Times</p>
          <p className="text-gray-600 text-sm">July 2, 2025</p>
          <div className="flex justify-center space-x-4 mt-4">
            <button className="flex items-center space-x-1 text-sm">
              <span>📤</span>
              <span>Share full article</span>
            </button>
            <button className="text-sm">↗</button>
            <button className="text-sm">🔖</button>
          </div>
        </div>

        <div className="prose prose-lg max-w-none mb-8">
          <p className="mb-4">
            Aenean lacinia bibendum nulla sed consectetur. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Etiam porta sem malesuada magna mollis euismod. Donec id elit non mi porta gravida at eget metus. Nulla vitae elit libero, a pharetra augue.
          </p>
          <p className="mb-8">
            Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Aenean lacinia bibendum nulla sed consectetur. Aenean lacinia bibendum nulla sed consectetur. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Nullam quis risus eget urna mollis ornare vel eu leo. Etiam porta sem malesuada magna mollis euismod. Maecenas faucibus mollis interdum.
          </p>
        </div>

        {/* Chart Section */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <p className="text-lg font-sans">
              Gained Money {statistics.gained}% Lost Money {statistics.lost}% No Change {statistics.noChange}%
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="x" 
                  type="number" 
                  domain={currentConfig.xlim}
                  tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}%`}
                  label={{ value: 'Percentage Change in Net Income', position: 'insideBottom', offset: -10 }}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  dataKey="y" 
                  type="number"
                  domain={currentConfig.ylim}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  label={{ value: 'Market Income', angle: -90, position: 'insideLeft' }}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="#374151" strokeWidth={2} />
                <Scatter 
                  name="Households" 
                  data={chartData} 
                  fill="#8884d8"
                  fillOpacity={0.6}
                  shape={(props) => {
                    const { cx, cy, fill } = props;
                    return <circle cx={cx} cy={cy} r={2} fill={fill} fillOpacity={0.7} />;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Controls */}
          <div className="flex justify-center space-x-2 mt-4">
            {chartConfigs.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveChart(index)}
                className={`w-3 h-3 rounded-full ${
                  activeChart === index ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p className="mb-4">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>
      </article>
    </div>
  );
};

export default TaxImpactVisualization;