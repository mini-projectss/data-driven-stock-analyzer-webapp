import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface TrendsChartProps {
  ticker: string;
  data: Array<{
    date: string;
    interest: number;
  }>;
  isLoading?: boolean;
}

export function TrendsChart({ ticker, data, isLoading }: TrendsChartProps) {
  const handleZoomIn = () => {
    // Zoom functionality would be implemented here
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    // Zoom out functionality would be implemented here
    console.log('Zoom out');
  };

  const handleReset = () => {
    // Reset zoom functionality would be implemented here
    console.log('Reset zoom');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="text-white font-medium">{`Date: ${label}`}</p>
          <p 
            className="font-semibold"
            style={{ color: '#0EA5E9' }}
          >
            {`Interest Index: ${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="glass-card p-6">
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Fetching Google Trends data...</p>
          <p className="text-neutral-text/80 text-sm mt-2">
            Analyzing search interest for {ticker}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6">
      <div className="space-y-6">
        {/* Chart Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-white font-semibold">
            Interest Over Time for {ticker}
          </h2>
          
          {/* Chart Controls */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-96 w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <defs>
                  <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(221, 232, 245, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(221, 232, 245, 0.6)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(221, 232, 245, 0.6)"
                  fontSize={12}
                  domain={[0, 100]}
                  label={{ 
                    value: 'Interest Index', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: 'rgba(221, 232, 245, 0.6)' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="interest" 
                  stroke="#0EA5E9"
                  strokeWidth={3}
                  dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#0EA5E9', stroke: '#ffffff', strokeWidth: 2 }}
                  fill="url(#interestGradient)"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.3))'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 opacity-20">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    />
                    <path 
                      d="M30 50 L45 35 L55 60 L70 40" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <p className="text-neutral-text/80">
                  No trend data available
                </p>
                <p className="text-neutral-text/60 text-sm mt-1">
                  Search for a ticker to view Google Trends data
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}