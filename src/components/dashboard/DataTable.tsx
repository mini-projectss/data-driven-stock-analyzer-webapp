import React from 'react';
import { Card } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockData {
  instrument: string;
  volume: string;
  high: number;
  low: number;
  change: number;
}

export function DataTable() {
  const stockData: StockData[] = [
    {
      instrument: 'RELIANCE',
      volume: '2.4M',
      high: 2856.75,
      low: 2832.10,
      change: 1.2
    },
    {
      instrument: 'TCS',
      volume: '1.8M',
      high: 4125.30,
      low: 4098.85,
      change: 0.8
    },
    {
      instrument: 'INFY',
      volume: '3.1M',
      high: 1742.20,
      low: 1728.45,
      change: -0.4
    },
    {
      instrument: 'HDFC',
      volume: '1.5M',
      high: 1685.90,
      low: 1672.30,
      change: 0.6
    },
    {
      instrument: 'ICICIBANK',
      volume: '2.7M',
      high: 1124.75,
      low: 1118.20,
      change: -0.2
    },
    {
      instrument: 'SBIN',
      volume: '4.2M',
      high: 812.45,
      low: 805.10,
      change: 1.1
    },
    {
      instrument: 'BHARTIARTL',
      volume: '1.9M',
      high: 1542.80,
      low: 1535.25,
      change: 0.3
    },
    {
      instrument: 'ASIANPAINT',
      volume: '0.8M',
      high: 2985.40,
      low: 2968.15,
      change: -0.7
    }
  ];

  return (
    <Card className="glass-card p-6">
      <h3 className="text-lg text-white font-semibold mb-4">Market Data</h3>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-neutral-text">Instrument</TableHead>
              <TableHead className="text-neutral-text">Volume</TableHead>
              <TableHead className="text-neutral-text">High</TableHead>
              <TableHead className="text-neutral-text">Low</TableHead>
              <TableHead className="text-neutral-text">Change %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockData.map((stock) => {
              const isPositive = stock.change >= 0;
              
              return (
                <TableRow 
                  key={stock.instrument} 
                  className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <TableCell className="text-white font-medium">
                    {stock.instrument}
                  </TableCell>
                  <TableCell className="text-neutral-text">
                    {stock.volume}
                  </TableCell>
                  <TableCell className="text-neutral-text">
                    ₹{stock.high.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-neutral-text">
                    ₹{stock.low.toFixed(2)}
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
                        {isPositive ? '+' : ''}{stock.change.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}