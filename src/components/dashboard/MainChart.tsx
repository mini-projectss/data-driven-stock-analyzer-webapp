import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, CandlestickChart } from 'recharts';

interface MainChartProps {
  selectedStock: string;
  onStockChange: (stock: string) => void;
}

export function MainChart({ selectedStock, onStockChange }: MainChartProps) {
  const [timeRange, setTimeRange] = useState('1m');
  
  const stockChips = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'SBIN', 'BHARTIARTL'];
  const timeRanges = [
    { value: '1d', label: '1D' },
    { value: '5d', label: '5D' },
    { value: '1m', label: '1M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '2y', label: '2Y' },
    { value: '3y', label: '3Y' },
    { value: '5y', label: '5Y' }
  ];

  // Mock candlestick data
  const generateMockData = () => {
    const data = [];
    let basePrice = 2800;
    
    for (let i = 0; i < 50; i++) {
      const open = basePrice + (Math.random() - 0.5) * 20;
      const high = open + Math.random() * 30;
      const low = open - Math.random() * 25;
      const close = open + (Math.random() - 0.5) * 25;
      
      data.push({
        date: new Date(Date.now() - (49 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.floor(Math.random() * 1000000) + 500000
      });
      
      basePrice = close;
    }
    
    return data;
  };

  const chartData = generateMockData();

  // Simple line chart representation of candlestick data
  const lineChartData = chartData.map(item => ({
    date: item.date,
    price: item.close
  }));

  const currentPrice = chartData[chartData.length - 1]?.close || 2850;
  const previousPrice = chartData[chartData.length - 2]?.close || 2835;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;
  const isPositive = priceChange >= 0;

  return (
    <Card className="glass-card p-6 mb-6">
      {/* Stock Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {stockChips.map((stock) => (
          <Badge
            key={stock}
            variant={selectedStock === stock ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${
              selectedStock === stock
                ? 'bg-accent-teal text-white border-accent-teal'
                : 'border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal'
            }`}
            onClick={() => onStockChange(stock)}
            style={selectedStock === stock ? { backgroundColor: 'var(--accent-teal)' } : {}}
          >
            {stock}
          </Badge>
        ))}
      </div>

      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl text-white font-semibold mb-1">
            {selectedStock} - ₹{currentPrice.toFixed(2)}
          </h2>
          <p 
            className="text-lg flex items-center space-x-2"
            style={{ color: isPositive ? 'var(--success-green)' : 'var(--error-red)' }}
          >
            <span>{isPositive ? '+' : ''}₹{priceChange.toFixed(2)}</span>
            <span>({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
          </p>
        </div>

        <div className="flex space-x-1">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range.value)}
              className={`${
                timeRange === range.value
                  ? 'bg-accent-teal text-white border-accent-teal'
                  : 'border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal'
              }`}
              style={timeRange === range.value ? { backgroundColor: 'var(--accent-teal)' } : {}}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(221, 232, 245, 0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(221, 232, 245, 0.6)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(221, 232, 245, 0.6)"
              fontSize={12}
              domain={['dataMin - 20', 'dataMax + 20']}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={isPositive ? 'var(--success-green)' : 'var(--error-red)'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}