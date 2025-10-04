import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Plus, RefreshCw, Trash2, TrendingUp, TrendingDown, Eye, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface WatchlistStock {
  symbol: string;
  ltp: number; // Last Traded Price
  dailyChange: number;
  dailyChangePercent: number;
  prediction: 'Buy' | 'Sell' | 'Hold';
  predictionConfidence: number;
  addedAt: string;
}

export function EnhancedWatchlist() {
  const [newStock, setNewStock] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [watchlistStocks, setWatchlistStocks] = useState<WatchlistStock[]>([
    {
      symbol: 'RELIANCE.NS',
      ltp: 2950.75,
      dailyChange: 24.55,
      dailyChangePercent: 0.84,
      prediction: 'Buy',
      predictionConfidence: 87.5,
      addedAt: '2 days ago'
    },
    {
      symbol: 'TCS.NS',
      ltp: 4125.30,
      dailyChange: 18.90,
      dailyChangePercent: 0.46,
      prediction: 'Buy',
      predictionConfidence: 82.1,
      addedAt: '1 week ago'
    },
    {
      symbol: 'INFY.NS',
      ltp: 1742.20,
      dailyChange: -8.25,
      dailyChangePercent: -0.47,
      prediction: 'Hold',
      predictionConfidence: 65.3,
      addedAt: '3 days ago'
    },
    {
      symbol: 'HDFC.NS',
      ltp: 1685.90,
      dailyChange: 7.40,
      dailyChangePercent: 0.44,
      prediction: 'Buy',
      predictionConfidence: 75.8,
      addedAt: '1 day ago'
    },
    {
      symbol: 'ICICIBANK.NS',
      ltp: 1124.75,
      dailyChange: -2.55,
      dailyChangePercent: -0.23,
      prediction: 'Sell',
      predictionConfidence: 71.2,
      addedAt: '5 days ago'
    }
  ]);

  // Mock stock suggestions for autocomplete
  const stockSuggestions = [
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFC.NS', 'ICICIBANK.NS', 'SBIN.NS', 
    'BHARTIARTL.NS', 'ITC.NS', 'HDFCBANK.NS', 'LT.NS', 'ASIANPAINT.NS', 'MARUTI.NS'
  ];

  const filteredSuggestions = newStock 
    ? stockSuggestions.filter(stock => 
        stock.toLowerCase().includes(newStock.toLowerCase()) &&
        !watchlistStocks.some(w => w.symbol === stock)
      )
    : [];

  const filteredWatchlist = watchlistStocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleAddStock = async () => {
    if (!newStock.trim() || watchlistStocks.some(stock => stock.symbol === newStock)) {
      toast.error('Stock already in watchlist or invalid symbol');
      return;
    }

    setIsAdding(true);
    
    try {
      // Simulate Firebase/API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newWatchlistStock: WatchlistStock = {
        symbol: newStock.toUpperCase(),
        ltp: Math.random() * 3000 + 1000,
        dailyChange: (Math.random() - 0.5) * 50,
        dailyChangePercent: (Math.random() - 0.5) * 3,
        prediction: ['Buy', 'Sell', 'Hold'][Math.floor(Math.random() * 3)] as 'Buy' | 'Sell' | 'Hold',
        predictionConfidence: Math.random() * 30 + 65,
        addedAt: 'Just now'
      };

      setWatchlistStocks(prev => [...prev, newWatchlistStock]);
      setNewStock('');
      toast.success(`${newStock.toUpperCase()} added to watchlist`);
    } catch (error) {
      toast.error('Failed to add stock to watchlist');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    try {
      // Simulate Firebase/API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setWatchlistStocks(prev => prev.filter(stock => stock.symbol !== symbol));
      toast.success(`${symbol} removed from watchlist`);
    } catch (error) {
      toast.error('Failed to remove stock from watchlist');
    }
  };

  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    
    try {
      // Simulate price refresh API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setWatchlistStocks(prev => prev.map(stock => ({
        ...stock,
        ltp: stock.ltp + (Math.random() - 0.5) * 20,
        dailyChange: (Math.random() - 0.5) * 30,
        dailyChangePercent: (Math.random() - 0.5) * 2,
        prediction: ['Buy', 'Sell', 'Hold'][Math.floor(Math.random() * 3)] as 'Buy' | 'Sell' | 'Hold',
        predictionConfidence: Math.random() * 30 + 65
      })));
      
      toast.success('Prices and predictions refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'Buy': return 'var(--success-green)';
      case 'Sell': return 'var(--error-red)';
      default: return '#FF9800';
    }
  };

  const handleViewStock = (symbol: string) => {
    toast.info(`Viewing details for ${symbol}`);
  };

  return (
    <div className="space-y-6">
      {/* Add Stock Section */}
      <Card className="glass-card p-6">
        <h2 className="text-xl text-white font-semibold mb-4">
          Add Stock to Watchlist
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Input
              placeholder="Enter stock symbol (e.g., RELIANCE.NS)"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="bg-input border-white/20 text-white placeholder:text-neutral-text/60"
              onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
            />
            
            {/* Autocomplete suggestions */}
            {filteredSuggestions.length > 0 && newStock && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-white/20 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setNewStock(suggestion)}
                    className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button 
            onClick={handleAddStock}
            disabled={isAdding || !newStock.trim()}
            className="bg-accent-teal hover:bg-accent-teal/90 text-white"
            style={{ backgroundColor: 'var(--accent-teal)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </Card>

      {/* Watchlist Table */}
      <Card className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl text-white font-semibold">
            Watchlist ({filteredWatchlist.length})
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
              <Input
                placeholder="Search stocks..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60 sm:w-48"
              />
            </div>
            
            <Button 
              onClick={handleRefreshPrices}
              disabled={isRefreshing}
              variant="outline"
              className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Prices
            </Button>
          </div>
        </div>

        {filteredWatchlist.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-text/80 mb-4">
              {searchFilter ? `No stocks found matching "${searchFilter}"` : 'Your watchlist is empty'}
            </p>
            <p className="text-neutral-text/60 text-sm">
              Add stocks above to start tracking their performance
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-neutral-text">Symbol</TableHead>
                  <TableHead className="text-neutral-text">LTP</TableHead>
                  <TableHead className="text-neutral-text">Daily %</TableHead>
                  <TableHead className="text-neutral-text">Apex Analytics Prediction</TableHead>
                  <TableHead className="text-neutral-text">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWatchlist.map((stock) => {
                  const isPositive = stock.dailyChange >= 0;
                  
                  return (
                    <TableRow 
                      key={stock.symbol}
                      className="border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="text-white">{stock.symbol}</span>
                          <Badge variant="outline" className="border-white/20 text-neutral-text/60 text-xs">
                            {stock.addedAt}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-white font-semibold">
                        ₹{stock.ltp.toFixed(2)}
                      </TableCell>
                      
                      <TableCell>
                        <div 
                          className="flex items-center space-x-1 font-medium"
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
                            {isPositive ? '+' : ''}{stock.dailyChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className="font-medium"
                            style={{ 
                              borderColor: getPredictionColor(stock.prediction), 
                              color: getPredictionColor(stock.prediction) 
                            }}
                          >
                            {stock.prediction}
                          </Badge>
                          <span 
                            className="text-xs"
                            title={`Based on Prophet & LightGBM models. Confidence: ${stock.predictionConfidence.toFixed(1)}%`}
                          >
                            ({stock.predictionConfidence.toFixed(1)}%)
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleViewStock(stock.symbol)}
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleRemoveStock(stock.symbol)}
                            variant="outline"
                            size="sm"
                            className="border-error-red/30 text-error-red hover:bg-error-red hover:text-white"
                            style={{ borderColor: 'var(--error-red)', color: 'var(--error-red)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}