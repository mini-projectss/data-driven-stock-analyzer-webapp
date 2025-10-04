import React, { useState } from 'react';
import { Card } from '../ui/card';

interface TreemapData {
  symbol: string;
  volume: number;
  change: number;
  size: number;
}

interface TreemapProps {
  onStockSelect?: (symbol: string) => void;
}

export function Treemap({ onStockSelect }: TreemapProps) {
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  
  const data: TreemapData[] = [
    { symbol: 'RELIANCE', volume: 24000000, change: 1.2, size: 20 },
    { symbol: 'TCS', volume: 18000000, change: 0.8, size: 16 },
    { symbol: 'INFY', volume: 31000000, change: -0.4, size: 24 },
    { symbol: 'HDFC', volume: 15000000, change: 0.6, size: 14 },
    { symbol: 'ICICI', volume: 27000000, change: -0.2, size: 22 },
    { symbol: 'SBIN', volume: 42000000, change: 1.1, size: 28 },
    { symbol: 'BHARTI', volume: 19000000, change: 0.3, size: 17 },
    { symbol: 'ASIAN', volume: 8000000, change: -0.7, size: 10 },
    { symbol: 'BAJAJ', volume: 12000000, change: 2.1, size: 12 },
    { symbol: 'MARUTI', volume: 16000000, change: -1.1, size: 15 },
    { symbol: 'WIPRO', volume: 22000000, change: 0.9, size: 19 },
    { symbol: 'LT', volume: 14000000, change: -0.5, size: 13 }
  ];

  const getColor = (change: number) => {
    if (change > 0) {
      return `rgba(46, 125, 50, ${Math.min(Math.abs(change) / 3, 0.8) + 0.2})`;
    } else {
      return `rgba(198, 40, 40, ${Math.min(Math.abs(change) / 3, 0.8) + 0.2})`;
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    return `${(volume / 1000).toFixed(0)}K`;
  };

  return (
    <Card className="glass-card p-6">
      <h3 className="text-lg text-white font-semibold mb-4">Volume Treemap</h3>
      
      <div className="grid grid-cols-4 gap-2 h-96">
        {data.map((item) => {
          const isHovered = hoveredStock === item.symbol;
          const baseSize = Math.sqrt(item.size);
          
          return (
            <div
              key={item.symbol}
              className={`rounded-lg border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                isHovered ? 'ring-2 ring-accent-teal scale-105' : ''
              }`}
              style={{
                backgroundColor: getColor(item.change),
                borderColor: 'rgba(221, 232, 245, 0.2)',
                gridColumn: item.size > 20 ? 'span 2' : 'span 1',
                gridRow: item.size > 25 ? 'span 2' : 'span 1',
                minHeight: '60px'
              }}
              onMouseEnter={() => setHoveredStock(item.symbol)}
              onMouseLeave={() => setHoveredStock(null)}
              onClick={() => onStockSelect?.(item.symbol)}
            >
              <div className="p-3 h-full flex flex-col justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">
                    {item.symbol}
                  </p>
                  <p className="text-white/80 text-xs">
                    Vol: {formatVolume(item.volume)}
                  </p>
                </div>
                
                <div className="text-right">
                  <p 
                    className="font-semibold text-sm"
                    style={{ 
                      color: item.change >= 0 ? 'var(--success-green)' : 'var(--error-red)' 
                    }}
                  >
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="font-semibold">{item.symbol}</p>
                    <p className="text-sm">Click to view chart</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center mt-4 text-sm text-neutral-text/60">
        <span>Size = Volume</span>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: 'rgba(46, 125, 50, 0.6)' }}
            />
            <span>Positive</span>
          </div>
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: 'rgba(198, 40, 40, 0.6)' }}
            />
            <span>Negative</span>
          </div>
        </div>
      </div>
    </Card>
  );
}