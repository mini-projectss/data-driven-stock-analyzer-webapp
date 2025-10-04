import React from 'react';
import { Card } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface IndexData {
  name: string;
  value: string;
  change: number;
  changePercent: number;
  sparkline: number[];
}

export function IndexCards() {
  const indices: IndexData[] = [
    {
      name: 'NIFTY 50',
      value: '22,368.00',
      change: 125.40,
      changePercent: 0.56,
      sparkline: [22200, 22250, 22180, 22320, 22280, 22350, 22368]
    },
    {
      name: 'SENSEX',
      value: '73,651.35',
      change: 415.82,
      changePercent: 0.57,
      sparkline: [73100, 73200, 73050, 73400, 73300, 73500, 73651]
    },
    {
      name: 'NIFTY Bank',
      value: '48,245.90',
      change: -89.75,
      changePercent: -0.19,
      sparkline: [48400, 48350, 48280, 48320, 48200, 48180, 48246]
    },
    {
      name: 'Midcap',
      value: '54,820.15',
      change: 312.45,
      changePercent: 0.57,
      sparkline: [54400, 54500, 54450, 54600, 54700, 54780, 54820]
    },
    {
      name: 'Smallcap',
      value: '17,951.80',
      change: 98.25,
      changePercent: 0.55,
      sparkline: [17800, 17850, 17820, 17900, 17880, 17920, 17952]
    },
    {
      name: 'Gold',
      value: '₹67,520',
      change: 145.00,
      changePercent: 0.22,
      sparkline: [67300, 67350, 67280, 67400, 67450, 67480, 67520]
    }
  ];

  const renderSparkline = (data: number[], isPositive: boolean) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    
    return (
      <div className="flex items-end space-x-0.5 h-8">
        {data.map((value, index) => {
          const height = range > 0 ? ((value - min) / range) * 100 : 50;
          return (
            <div
              key={index}
              className="w-1 rounded-t transition-all duration-300"
              style={{
                height: `${Math.max(height, 10)}%`,
                backgroundColor: isPositive ? 'var(--success-green)' : 'var(--error-red)'
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {indices.map((index) => {
        const isPositive = index.change >= 0;
        
        return (
          <Card 
            key={index.name} 
            className="glass-card p-4 hover:scale-105 transition-transform duration-200 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-neutral-text/80 truncate">
                  {index.name}
                </h3>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-success-green" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-error-red" />
                )}
              </div>
              
              <div>
                <p className="text-lg text-white font-semibold">
                  {index.value}
                </p>
                <p 
                  className="text-sm flex items-center space-x-1"
                  style={{ 
                    color: isPositive ? 'var(--success-green)' : 'var(--error-red)' 
                  }}
                >
                  <span>{isPositive ? '+' : ''}{index.change}</span>
                  <span>({isPositive ? '+' : ''}{index.changePercent}%)</span>
                </p>
              </div>

              {renderSparkline(index.sparkline, isPositive)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}