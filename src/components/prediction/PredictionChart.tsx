import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';

interface PredictionChartProps {
  selectedStock: string;
  isAnalyzing: boolean;
}

export function PredictionChart({ selectedStock, isAnalyzing }: PredictionChartProps) {
  const [showHistorical, setShowHistorical] = useState(true);
  const [showProphet, setShowProphet] = useState(true);
  const [showLightGBM, setShowLightGBM] = useState(true);

  // Mock data for demonstration
  const generateMockData = () => {
    const data = [];
    const basePrice = 2800;
    
    // Historical data (past 30 days)
    for (let i = -30; i <= 0; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const historical = basePrice + (Math.random() - 0.5) * 100 + i * 2;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        historical: Math.round(historical * 100) / 100,
        prophet: null,
        lightgbm: null,
        isPrediction: false
      });
    }
    
    // Future predictions (next 15 days)
    for (let i = 1; i <= 15; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const lastPrice = data[data.length - 1].historical;
      const prophet = lastPrice + (Math.random() - 0.4) * 50 + i * 1.5;
      const lightgbm = lastPrice + (Math.random() - 0.3) * 40 + i * 1.2;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        historical: null,
        prophet: Math.round(prophet * 100) / 100,
        lightgbm: Math.round(lightgbm * 100) / 100,
        isPrediction: true
      });
    }
    
    return data;
  };

  const chartData = generateMockData();
  const currentPrice = chartData.find(d => !d.isPrediction && d.historical)?.historical || 2850;
  const prophetPrice = chartData.find(d => d.prophet)?.prophet || 2870;
  const lightgbmPrice = chartData.find(d => d.lightgbm)?.lightgbm || 2865;

  return (
    <Card className="glass-card p-6">
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl text-white font-semibold mb-2">
            {selectedStock} Prediction Analysis
          </h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-neutral-text/80">Current:</span>
              <span className="text-white font-semibold">₹{currentPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-neutral-text/80">Prophet:</span>
              <span 
                className="font-semibold"
                style={{ color: prophetPrice > currentPrice ? 'var(--success-green)' : 'var(--error-red)' }}
              >
                ₹{prophetPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-neutral-text/80">LightGBM:</span>
              <span 
                className="font-semibold"
                style={{ color: lightgbmPrice > currentPrice ? 'var(--success-green)' : 'var(--error-red)' }}
              >
                ₹{lightgbmPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Legend Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showHistorical ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHistorical(!showHistorical)}
            className={`${
              showHistorical
                ? 'bg-accent-teal text-white'
                : 'border-white/20 text-neutral-text hover:border-accent-teal'
            }`}
            style={showHistorical ? { backgroundColor: 'var(--accent-teal)' } : {}}
          >
            {showHistorical ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            Historical
          </Button>
          
          <Button
            variant={showProphet ? "default" : "outline"}
            size="sm"
            onClick={() => setShowProphet(!showProphet)}
            className={`${
              showProphet
                ? 'bg-success-green text-white'
                : 'border-white/20 text-neutral-text hover:border-success-green'
            }`}
            style={showProphet ? { backgroundColor: 'var(--success-green)' } : {}}
          >
            {showProphet ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            Prophet
          </Button>
          
          <Button
            variant={showLightGBM ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLightGBM(!showLightGBM)}
            className={`${
              showLightGBM
                ? 'text-white'
                : 'border-white/20 text-neutral-text hover:border-orange-500'
            }`}
            style={showLightGBM ? { backgroundColor: '#FF9800' } : {}}
          >
            {showLightGBM ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
            LightGBM
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full relative">
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Analyzing {selectedStock}...</p>
            </div>
          </div>
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            <Legend />
            
            {showHistorical && (
              <Line 
                type="monotone" 
                dataKey="historical" 
                stroke="var(--accent-teal)"
                strokeWidth={2}
                dot={false}
                name="Historical"
                connectNulls={false}
              />
            )}
            
            {showProphet && (
              <Line 
                type="monotone" 
                dataKey="prophet" 
                stroke="var(--success-green)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Prophet Forecast"
                connectNulls={false}
              />
            )}
            
            {showLightGBM && (
              <Line 
                type="monotone" 
                dataKey="lightgbm" 
                stroke="#FF9800"
                strokeWidth={2}
                strokeDasharray="10 5"
                dot={false}
                name="LightGBM Forecast"
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}