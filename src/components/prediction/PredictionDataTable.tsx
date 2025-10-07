import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PredictionDataTableProps {
  selectedStock: string;
  predictionData?: {
    historical: any[];
    prophet: any[];
    lgbm: any[];
  } | null;
}

export function PredictionDataTable({ selectedStock, predictionData }: PredictionDataTableProps) {
  const [showFuture, setShowFuture] = useState(true);

  // Helper for volume formatting
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    return `${(volume / 1000).toFixed(0)}K`;
  };

  // If no predictionData, fallback to mock data
  const generateHistoricalData = () => {
    const data = [];
    let basePrice = 2800;
    
    for (let i = 7; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const open = basePrice + (Math.random() - 0.5) * 20;
      const high = open + Math.random() * 30;
      const low = open - Math.random() * 25;
      const close = open + (Math.random() - 0.5) * 25;
      const volume = Math.floor(Math.random() * 1000000) + 500000;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: volume,
        change: Math.round((close - open) * 100) / 100,
        changePercent: Math.round(((close - open) / open) * 100 * 100) / 100
      });
      
      basePrice = close;
    }
    
    return data;
  };
  const generateFutureData = () => {
    const data = [];
    let basePrice = 2850;
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Prophet predictions
      const prophetPrice = basePrice + (Math.random() - 0.4) * 30 + i * 1.5;
      const prophetHigh = prophetPrice + Math.random() * 20;
      const prophetLow = prophetPrice - Math.random() * 20;
      
      // LightGBM predictions
      const lightgbmPrice = basePrice + (Math.random() - 0.3) * 25 + i * 1.2;
      const lightgbmHigh = lightgbmPrice + Math.random() * 18;
      const lightgbmLow = lightgbmPrice - Math.random() * 18;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        prophetPrice: Math.round(prophetPrice * 100) / 100,
        prophetHigh: Math.round(prophetHigh * 100) / 100,
        prophetLow: Math.round(prophetLow * 100) / 100,
        lightgbmPrice: Math.round(lightgbmPrice * 100) / 100,
        lightgbmHigh: Math.round(lightgbmHigh * 100) / 100,
        lightgbmLow: Math.round(lightgbmLow * 100) / 100,
        confidence: Math.round((Math.random() * 20 + 75) * 100) / 100
      });
      
      basePrice = (prophetPrice + lightgbmPrice) / 2;
    }
    
    return data;
  };

  // Use backend data if available, else fallback to mock
  let historicalData: any[] = [];
  let futureData: any[] = [];

  if (predictionData) {
    // Historical: use last 7 (or all) from predictionData.historical
    historicalData = (predictionData.historical || []).map(row => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      // No volume in backend, so fake it for now
      volume: Math.floor(Math.random() * 1000000) + 500000,
      change: row.close - row.open,
      changePercent: row.open ? ((row.close - row.open) / row.open) * 100 : 0,
    }));

    // Future: combine prophet and lgbm by date
    const prophetMap = new Map<string, any>();
    (predictionData.prophet || []).forEach(row => {
      prophetMap.set(row.date, row);
    });
    futureData = (predictionData.lgbm || []).map(row => {
      const dateStr = row.date;
      const prophet = prophetMap.get(dateStr);
      return {
        date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        prophetPrice: prophet ? prophet.close : null,
        prophetHigh: prophet ? prophet.high : null,
        prophetLow: prophet ? prophet.low : null,
        lightgbmPrice: row.close,
        lightgbmHigh: row.high,
        lightgbmLow: row.low,
        // Confidence: fake for now, or could be based on model agreement
        confidence: prophet && row.close
          ? 80 + Math.max(0, 20 - Math.abs(prophet.close - row.close) / (prophet.close || 1) * 100)
          : 80,
      };
    });
  } else {
    historicalData = generateHistoricalData();
    futureData = generateFutureData();
  }

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-white font-semibold">
          {selectedStock} Data Analysis
        </h3>
        
        <div className="flex items-center space-x-3">
          <Label htmlFor="data-toggle" className="text-neutral-text">
            Historical
          </Label>
          <Switch
            id="data-toggle"
            checked={showFuture}
            onCheckedChange={setShowFuture}
          />
          <Label htmlFor="data-toggle" className="text-neutral-text">
            Future Predictions
          </Label>
        </div>
      </div>

      <div className="overflow-x-auto">
        {!showFuture ? (
          // Historical Data Table
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-neutral-text">Date</TableHead>
                <TableHead className="text-neutral-text">Open</TableHead>
                <TableHead className="text-neutral-text">High</TableHead>
                <TableHead className="text-neutral-text">Low</TableHead>
                <TableHead className="text-neutral-text">Close</TableHead>
                <TableHead className="text-neutral-text">Volume</TableHead>
                <TableHead className="text-neutral-text">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicalData.map((row, index) => {
                const isPositive = row.change >= 0;
                
                return (
                  <TableRow 
                    key={index} 
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white font-medium">
                      {row.date}
                    </TableCell>
                    <TableCell className="text-neutral-text">
                      ₹{row.open?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-neutral-text">
                      ₹{row.high?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-neutral-text">
                      ₹{row.low?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-white font-semibold">
                      ₹{row.close?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-neutral-text">
                      {formatVolume(row.volume)}
                    </TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center space-x-1"
                        style={{ 
                          color: isPositive ? 'var(--success-green)' : 'var(--error-red)' 
                        }}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>
                          {isPositive ? '+' : ''}₹{row.change?.toFixed(2)} ({isPositive ? '+' : ''}{row.changePercent?.toFixed(2)}%)
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          // Future Predictions Table
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-neutral-text">Date</TableHead>
                <TableHead className="text-neutral-text">Prophet Price</TableHead>
                <TableHead className="text-neutral-text">Prophet Range</TableHead>
                <TableHead className="text-neutral-text">LightGBM Price</TableHead>
                <TableHead className="text-neutral-text">LightGBM Range</TableHead>
                <TableHead className="text-neutral-text">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {futureData.map((row, index) => (
                <TableRow 
                  key={index} 
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell className="text-white font-medium">
                    {row.date}
                  </TableCell>
                  <TableCell 
                    className="font-semibold"
                    style={{ color: 'var(--success-green)' }}
                  >
                    ₹{row.prophetPrice?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-neutral-text text-sm">
                    ₹{row.prophetLow?.toFixed(2)} - ₹{row.prophetHigh?.toFixed(2)}
                  </TableCell>
                  <TableCell 
                    className="font-semibold"
                    style={{ color: '#FF9800' }}
                  >
                    ₹{row.lightgbmPrice?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-neutral-text text-sm">
                    ₹{row.lightgbmLow?.toFixed(2)} - ₹{row.lightgbmHigh?.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div 
                      className="text-sm font-medium"
                      style={{ 
                        color: row.confidence > 85 ? 'var(--success-green)' : 
                               row.confidence > 75 ? '#FF9800' : 'var(--error-red)'
                      }}
                    >
                      {row.confidence?.toFixed(1)}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}