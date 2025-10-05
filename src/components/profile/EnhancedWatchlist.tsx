import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Plus, RefreshCw, Trash2, TrendingUp, TrendingDown, Eye, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Portal } from '../Portal';

import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';

interface WatchlistStock {
  symbol: string;
  ltp: number;
  dailyChange: number;
  dailyChangePercent: number;
  prediction: 'Buy' | 'Sell' | 'Hold';
  predictionConfidence: number;
  addedAt: string;
}

// Helper to fetch real price data from Yahoo Finance
async function fetchStockData(symbols: string[]): Promise<Record<string, Partial<WatchlistStock>>> {
  const baseUrl = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + symbols.join(',');
  try {
    const response = await fetch(baseUrl);
    const data = await response.json();
    const result: Record<string, Partial<WatchlistStock>> = {};
    if (data?.quoteResponse?.result) {
      for (const item of data.quoteResponse.result) {
        const symbol = item.symbol;
        result[symbol] = {
          ltp: item.regularMarketPrice ?? 0,
          dailyChange: item.regularMarketChange ?? 0,
          dailyChangePercent: item.regularMarketChangePercent ?? 0,
        };
      }
    }
    return result;
  } catch (error) {
    console.error("Failed to fetch stock data", error);
    return {};
  }
}

export function EnhancedWatchlist() {
  const [newStock, setNewStock] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [watchlistStocks, setWatchlistStocks] = useState<WatchlistStock[]>([]);
  const [stockSuggestions, setStockSuggestions] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);

  // Listen for auth state changes and set UID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        setUid(null);
        setWatchlistStocks([]);
        toast.error("You must be logged in to manage your watchlist.");
      }
    });
    return () => unsubscribe();
  }, []);

  // Load stock suggestions from tickers files on mount
  useEffect(() => {
    const fetchTickers = async (url: string): Promise<string[]> => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        return text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      } catch (error) {
        console.error(`Failed to load ${url}`, error);
        return [];
      }
    };

    const loadAllTickers = async () => {
      const [bseTickers, nseTickers] = await Promise.all([
        fetchTickers('/tickersbse.txt'),
        fetchTickers('/tickersnse.txt')
      ]);
      const combinedTickers = Array.from(new Set([...bseTickers, ...nseTickers]));
      setStockSuggestions(combinedTickers);
    };

    loadAllTickers();
  }, []);

  // Update bounding rect for suggestions dropdown
  useEffect(() => {
    const updatePosition = () => {
      if (inputWrapperRef.current) {
        setInputRect(inputWrapperRef.current.getBoundingClientRect());
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, []);

  useEffect(() => {
    if (inputWrapperRef.current) {
      setInputRect(inputWrapperRef.current.getBoundingClientRect());
    }
  }, [newStock, stockSuggestions]);

  // Subscribe to Firestore watchlist updates when uid changes
  useEffect(() => {
    if (!uid) {
      setWatchlistStocks([]);
      return;
    }

    const colRef = collection(db, 'users', uid, 'watchlist', 'default', 'items');

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const stocks: WatchlistStock[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          stocks.push({
            symbol: data.symbol,
            ltp: data.ltp,
            dailyChange: data.dailyChange,
            dailyChangePercent: data.dailyChangePercent,
            prediction: data.prediction,
            predictionConfidence: data.predictionConfidence,
            addedAt: data.addedAt
          });
        });
        setWatchlistStocks(stocks);
      },
      (error) => {
        console.error('Failed to fetch watchlist', error);
        toast.error('Failed to load your watchlist.');
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const filteredSuggestions = newStock
    ? stockSuggestions.filter(stock =>
        stock.toLowerCase().includes(newStock.toLowerCase()) &&
        !watchlistStocks.some(w => w.symbol.toLowerCase() === stock.toLowerCase())
      )
    : [];

  const filteredWatchlist = watchlistStocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Add stock to Firestore with live data
  const handleAddStock = async () => {
    if (!uid) {
      toast.error('Please log in to add stocks.');
      return;
    }

    const trimmedStock = newStock.trim().toUpperCase();
    const alreadyInWatchlist = watchlistStocks.some(
      stock => stock.symbol.toLowerCase() === trimmedStock.toLowerCase()
    );
    const isValid = stockSuggestions.some(
      s => s.toLowerCase() === trimmedStock.toLowerCase()
    );

    if (!trimmedStock || alreadyInWatchlist || !isValid) {
      toast.error('Invalid or duplicate stock symbol');
      return;
    }

    setIsAdding(true);
    try {
      const fetched = await fetchStockData([trimmedStock]);
      const live = fetched[trimmedStock] ?? {};

      const newWatchlistStock: WatchlistStock = {
        symbol: trimmedStock,
        ltp: live.ltp ?? 0,
        dailyChange: live.dailyChange ?? 0,
        dailyChangePercent: live.dailyChangePercent ?? 0,
        prediction: ['Buy', 'Sell', 'Hold'][Math.floor(Math.random() * 3)] as 'Buy' | 'Sell' | 'Hold',
        predictionConfidence: Math.random() * 30 + 65,
        addedAt: new Date().toISOString()
      };

      await setDoc(
        doc(db, 'users', uid, 'watchlist', 'default', 'items', trimmedStock),
        newWatchlistStock
      );

      setNewStock('');
      toast.success(`${trimmedStock} added to watchlist`);
    } catch (error) {
      console.error('Error adding stock', error);
      toast.error('Failed to add stock');
    } finally {
      setIsAdding(false);
    }
  };

  // Remove stock from Firestore
  const handleRemoveStock = async (symbol: string) => {
    if (!uid) {
      toast.error('Please log in to remove stocks.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', uid, 'watchlist', 'default', 'items', symbol));
      toast.success(`${symbol} removed from watchlist`);
    } catch (error) {
      console.error('Error removing stock', error);
      toast.error('Failed to remove stock');
    }
  };

  // Refresh stock prices using Yahoo Finance
  const handleRefreshPrices = async () => {
    if (!uid) {
      toast.error('Please log in to refresh data.');
      return;
    }

    setIsRefreshing(true);
    try {
      const symbols = watchlistStocks.map(stock => stock.symbol);
      const fetched = await fetchStockData(symbols);

      const updatedStocks = watchlistStocks.map(stock => {
        const live = fetched[stock.symbol] ?? {};
        return {
          ...stock,
          ltp: live.ltp ?? stock.ltp,
          dailyChange: live.dailyChange ?? stock.dailyChange,
          dailyChangePercent: live.dailyChangePercent ?? stock.dailyChangePercent,
          prediction: ['Buy', 'Sell', 'Hold'][Math.floor(Math.random() * 3)] as 'Buy' | 'Sell' | 'Hold',
          predictionConfidence: Math.random() * 30 + 65
        };
      });

      await Promise.all(updatedStocks.map(stock =>
        setDoc(doc(db, 'users', uid, 'watchlist', 'default', 'items', stock.symbol), stock)
      ));

      toast.success('Prices and predictions refreshed');
    } catch (error) {
      console.error('Error refreshing data', error);
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
        <h2 className="text-xl text-white font-semibold mb-4">Add Stock to Watchlist</h2>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative" ref={inputWrapperRef}>
            <Input
              placeholder="Enter stock symbol (e.g., RELIANCE.NS)"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="bg-input border-white/20 text-white placeholder:text-neutral-text/60"
              onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
            />

            {filteredSuggestions.length > 0 && newStock && inputRect && (
              <Portal>
                <div
                  className="z-[9999] bg-card border border-white/20 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                  style={{
                    position: 'absolute',
                    top: inputRect.bottom + window.scrollY,
                    left: inputRect.left + window.scrollX,
                    width: inputRect.width
                  }}
                >
                  {filteredSuggestions.slice(0, 5).map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setNewStock(suggestion);
                        setTimeout(() => handleAddStock(), 100);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </Portal>
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
      <Card className="glass-card p-6" style={{ overflow: 'visible', position: 'relative', zIndex: 0 }}>
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
                  <TableHead className="text-neutral-text">Prediction</TableHead>
                  <TableHead className="text-neutral-text">Confidence</TableHead>
                  <TableHead className="text-neutral-text">Added At</TableHead>
                  <TableHead className="text-neutral-text">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWatchlist.map(stock => {
                  const isPositive = stock.dailyChange >= 0;
                  return (
                    <TableRow key={stock.symbol} className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell className="font-semibold text-white">{stock.symbol}</TableCell>
                      <TableCell className="text-white font-semibold">{`\u20B9 ${stock.ltp.toFixed(2)}`}</TableCell>
                      <TableCell
                        className={`font-medium ${
                          isPositive ? 'text-success-green' : 'text-error-red'
                        }`}
                      >
                        {isPositive ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                        {stock.dailyChangePercent.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: getPredictionColor(stock.prediction),
                            color: getPredictionColor(stock.prediction)
                          }}
                        >
                          {stock.prediction}
                        </Badge>
                      </TableCell>
                      <TableCell>{stock.predictionConfidence.toFixed(1)}%</TableCell>
                      <TableCell>{new Date(stock.addedAt).toLocaleString()}</TableCell>
                      <TableCell className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewStock(stock.symbol)}
                          className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveStock(stock.symbol)}
                          className="border-error-red/30 text-error-red hover:bg-error-red hover:text-white"
                          style={{ borderColor: 'var(--error-red)', color: 'var(--error-red)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
