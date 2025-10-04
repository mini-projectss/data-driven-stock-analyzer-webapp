import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Plus, RefreshCw, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistStock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  addedAt: string;
}

export function Watchlist() {
  const [newStock, setNewStock] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [watchlistStocks, setWatchlistStocks] = useState<WatchlistStock[]>([
    {
      symbol: 'RELIANCE',
      price: 2850.75,
      change: 24.55,
      changePercent: 0.87,
      addedAt: '2 days ago'
    },
    {
      symbol: 'TCS',
      price: 4125.30,
      change: 18.90,
      changePercent: 0.46,
      addedAt: '1 week ago'
    },
    {
      symbol: 'INFY',
      price: 1742.20,
      change: -8.25,
      changePercent: -0.47,
      addedAt: '3 days ago'
    },
    {
      symbol: 'HDFC',
      price: 1685.90,
      change: 7.40,
      changePercent: 0.44,
      addedAt: '1 day ago'
    }
  ]);

  // Mock stock suggestions for autocomplete
  const stockSuggestions = [
    'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'SBIN', 'BHARTIARTL',
    'ITC', 'HDFCBANK', 'LT', 'ASIANPAINT', 'MARUTI', 'NESTLEIND', 'KOTAKBANK'
  ];

  const filteredSuggestions = newStock 
    ? stockSuggestions.filter(stock => 
        stock.toLowerCase().includes(newStock.toLowerCase()) &&
        !watchlistStocks.some(w => w.symbol === stock)
      )
    : [];

  const handleAddStock = () => {
    if (!newStock.trim() || watchlistStocks.some(stock => stock.symbol === newStock.toUpperCase())) {
      return;
    }

    setIsAdding(true);
    
    // Simulate API call to add stock
    setTimeout(() => {
      const newWatchlistStock: WatchlistStock = {
        symbol: newStock.toUpperCase(),
        price: Math.random() * 3000 + 1000,
        change: (Math.random() - 0.5) * 50,
        changePercent: (Math.random() - 0.5) * 3,
        addedAt: 'Just now'
      };

      setWatchlistStocks(prev => [...prev, newWatchlistStock]);
      setNewStock('');
      setIsAdding(false);
    }, 1000);
  };

  const handleRemoveStock = (symbol: string) => {
    setWatchlistStocks(prev => prev.filter(stock => stock.symbol !== symbol));
  };

  const handleRefreshPrices = () => {
    setIsRefreshing(true);
    
    // Simulate price refresh
    setTimeout(() => {
      setWatchlistStocks(prev => prev.map(stock => ({
        ...stock,
        price: stock.price + (Math.random() - 0.5) * 20,
        change: (Math.random() - 0.5) * 30,
        changePercent: (Math.random() - 0.5) * 2
      })));
      setIsRefreshing(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Add Stock Section */}
      <Card className="glass-card p-6">
        <h2 className="text-xl text-white font-semibold mb-4">
          Add Stock to Watchlist
        </h2>
        
        <div className="space-y-4">
          <div className="relative">
            <Label htmlFor="new-stock" className="text-neutral-text">
              Stock Symbol
            </Label>
            <div className="relative mt-1">
              <Input
                id="new-stock"
                placeholder="Enter stock symbol (e.g., RELIANCE)"
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

      {/* Watchlist */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-white font-semibold">
            Watchlist ({watchlistStocks.length})
          </h2>
          
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

        {watchlistStocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-text/80 mb-4">
              Your watchlist is empty
            </p>
            <p className="text-neutral-text/60 text-sm">
              Add stocks above to start tracking their performance
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {watchlistStocks.map((stock) => {
              const isPositive = stock.change >= 0;
              
              return (
                <div 
                  key={stock.symbol}
                  className="glass-card p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg text-white font-semibold">
                          {stock.symbol}
                        </h3>
                        <Badge variant="outline" className="border-white/20 text-neutral-text/60 text-xs">
                          Added {stock.addedAt}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div>
                          <p className="text-2xl text-white font-semibold">
                            ₹{stock.price.toFixed(2)}
                          </p>
                        </div>
                        
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
                          <span className="font-medium">
                            {isPositive ? '+' : ''}₹{stock.change.toFixed(2)}
                          </span>
                          <span className="text-sm">
                            ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>

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
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}