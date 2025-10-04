import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { RefreshCw, Filter } from 'lucide-react';

export function MarketScreener() {
  const [filters, setFilters] = useState({
    exchange: 'all',
    model: 'all',
    date: 'today',
    trend: 'all'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mockScreenerData = [
    {
      symbol: 'RELIANCE',
      exchange: 'NSE',
      currentPrice: 2850.75,
      prophetPrice: 2875.30,
      lightgbmPrice: 2868.90,
      trend: 'bullish',
      confidence: 87.5,
      change: 24.55,
      volume: '2.4M'
    },
    {
      symbol: 'TCS',
      exchange: 'NSE',
      currentPrice: 4125.30,
      prophetPrice: 4145.80,
      lightgbmPrice: 4138.20,
      trend: 'bullish',
      confidence: 82.1,
      change: 18.90,
      volume: '1.8M'
    },
    {
      symbol: 'INFY',
      exchange: 'NSE',
      currentPrice: 1742.20,
      prophetPrice: 1735.60,
      lightgbmPrice: 1738.45,
      trend: 'bearish',
      confidence: 79.3,
      change: -8.25,
      volume: '3.1M'
    },
    {
      symbol: 'HDFC',
      exchange: 'BSE',
      currentPrice: 1685.90,
      prophetPrice: 1695.30,
      lightgbmPrice: 1692.15,
      trend: 'bullish',
      confidence: 75.8,
      change: 7.40,
      volume: '1.5M'
    },
    {
      symbol: 'ICICIBANK',
      exchange: 'NSE',
      currentPrice: 1124.75,
      prophetPrice: 1118.20,
      lightgbmPrice: 1121.80,
      trend: 'neutral',
      confidence: 71.2,
      change: -2.55,
      volume: '2.7M'
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish': return 'var(--success-green)';
      case 'bearish': return 'var(--error-red)';
      default: return '#FF9800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 85) return 'var(--success-green)';
    if (confidence > 75) return '#FF9800';
    return 'var(--error-red)';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-neutral-text" />
            <span className="text-white font-medium">Filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-4 flex-1">
            <Select value={filters.exchange} onValueChange={(value) => setFilters(prev => ({...prev, exchange: value}))}>
              <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/20">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="nse">NSE</SelectItem>
                <SelectItem value="bse">BSE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.model} onValueChange={(value) => setFilters(prev => ({...prev, model: value}))}>
              <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/20">
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="prophet">Prophet</SelectItem>
                <SelectItem value="lightgbm">LightGBM</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.trend} onValueChange={(value) => setFilters(prev => ({...prev, trend: value}))}>
              <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                <SelectValue placeholder="Trend" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/20">
                <SelectItem value="all">All Trends</SelectItem>
                <SelectItem value="bullish">Bullish</SelectItem>
                <SelectItem value="bearish">Bearish</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Screener Results */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg text-white font-semibold">
            Market Screener Results
          </h3>
          <Badge variant="outline" className="border-accent-teal/30 text-accent-teal">
            {mockScreenerData.length} stocks found
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-neutral-text">Symbol</TableHead>
                <TableHead className="text-neutral-text">Exchange</TableHead>
                <TableHead className="text-neutral-text">Current</TableHead>
                <TableHead className="text-neutral-text">Prophet</TableHead>
                <TableHead className="text-neutral-text">LightGBM</TableHead>
                <TableHead className="text-neutral-text">Trend</TableHead>
                <TableHead className="text-neutral-text">Confidence</TableHead>
                <TableHead className="text-neutral-text">Change</TableHead>
                <TableHead className="text-neutral-text">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockScreenerData.map((stock) => {
                const isPositiveChange = stock.change >= 0;
                
                return (
                  <TableRow 
                    key={stock.symbol} 
                    className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <TableCell className="text-white font-semibold">
                      {stock.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/20 text-neutral-text text-xs">
                        {stock.exchange}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      ₹{stock.currentPrice.toFixed(2)}
                    </TableCell>
                    <TableCell 
                      className="font-medium"
                      style={{ color: 'var(--success-green)' }}
                    >
                      ₹{stock.prophetPrice.toFixed(2)}
                    </TableCell>
                    <TableCell 
                      className="font-medium"
                      style={{ color: '#FF9800' }}
                    >
                      ₹{stock.lightgbmPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="text-xs capitalize"
                        style={{ 
                          borderColor: getTrendColor(stock.trend), 
                          color: getTrendColor(stock.trend) 
                        }}
                      >
                        {stock.trend}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="font-medium"
                      style={{ color: getConfidenceColor(stock.confidence) }}
                    >
                      {stock.confidence.toFixed(1)}%
                    </TableCell>
                    <TableCell 
                      className="font-medium"
                      style={{ 
                        color: isPositiveChange ? 'var(--success-green)' : 'var(--error-red)' 
                      }}
                    >
                      {isPositiveChange ? '+' : ''}₹{stock.change.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-neutral-text">
                      {stock.volume}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}