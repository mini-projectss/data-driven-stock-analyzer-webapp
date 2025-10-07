import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { RefreshCw, Filter, Star } from 'lucide-react';
import { toast } from 'sonner';

import { auth, db } from '../../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';

function getApiBase(): string {
  const vite = (import.meta as any)?.env?.VITE_API_BASE;
  if (vite) return vite;
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:8000";
  }
  return "";
}

interface ScreenerData {
  symbol: string;
  exchange: string;
  date: string;
  prophet_open: number;
  prophet_high: number;
  prophet_low: number;
  prophet_close: number;
  lgbm_open: number;
  lgbm_high: number;
  lgbm_low: number;
  lgbm_close: number;
  selected_value: number;
  trend: string;
  confidence: number;
}

export function Watchlist() {
  const [filters, setFilters] = useState({
    date: 'latest',
    trend: 'all',
    ohlc: 'close'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<ScreenerData[]>([]);
  const [sortKey, setSortKey] = useState<keyof ScreenerData | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

  const API_BASE = getApiBase();

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setWatchlistSymbols([]);
        setData([]);
        setError("Please log in to view your watchlist predictions.");
      }
    });
    return () => unsub();
  }, []);

  // Firestore watchlist subscription
  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, 'users', user.uid, 'watchlist', 'default', 'items');
    const unsub = onSnapshot(
      colRef,
      (snap: QuerySnapshot<DocumentData>) => {
        const symbols: string[] = [];
        snap.forEach(docSnap => {
          symbols.push(docSnap.data().symbol);
        });
        setWatchlistSymbols(symbols);
      },
      (err) => {
        console.error('Watchlist fetch error', err);
        toast.error('Failed to load your watchlist symbols.');
        setError('Failed to load your watchlist symbols.');
      }
    );
    return () => unsub();
  }, [user]);

  async function fetchData() {
    if (!user || watchlistSymbols.length === 0) {
      setData([]);
      if (user && watchlistSymbols.length === 0) {
        setError("Your watchlist is empty. Add stocks to see predictions.");
      }
      return;
    }

    try {
      setError("");
      const params = new URLSearchParams({
        date: filters.date,
        trend: filters.trend,
        ohlc: filters.ohlc
      });
      const url = `${API_BASE}/api/watchlist/predictions?${params}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(watchlistSymbols)
      });
      const json = await res.json();
      if (!json || json.error || !json.items) {
        setError(json?.error || "No prediction data available for your watchlist");
        setData([]);
      } else {
        setData(json.items || []);
      }
    } catch (e) {
      setError("Failed to fetch prediction data");
      setData([]);
    }
  }

  useEffect(() => {
    fetchData();
  }, [filters.date, filters.trend, filters.ohlc, watchlistSymbols, user]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData().finally(() => setIsRefreshing(false));
  };

  function handleSort(key: keyof ScreenerData) {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey as keyof ScreenerData];
      const bv = b[sortKey as keyof ScreenerData];
      if (typeof av === "number" && typeof bv === "number") {
        return sortOrder === 'asc' ? av - bv : bv - av;
      }
      return sortOrder === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortOrder]);

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
            <Select value={filters.ohlc} onValueChange={(value: string) => setFilters(prev => ({...prev, ohlc: value}))}>
              <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                <SelectValue placeholder="OHLC" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/20">
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="close">Close</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.trend} onValueChange={(value: string) => setFilters(prev => ({...prev, trend: value}))}>
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

            <Input
              type="date"
              value={filters.date === 'latest' ? '' : filters.date}
              onChange={(e) => setFilters(prev => ({...prev, date: e.target.value || 'latest'}))}
              className="w-40 bg-input border-white/20 text-white"
              placeholder="Date (latest)"
            />
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
          <div className="flex items-center space-x-3">
            <Star className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg text-white font-semibold">
              Watchlist Predictions
            </h3>
          </div>
          <Badge variant="outline" className="border-accent-teal/30 text-accent-teal">
            {sortedData.length} stocks found
          </Badge>
        </div>

        {error ? (
          <p className="text-error-red text-center py-8">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <div
              style={{ maxHeight: 600, overflowY: "auto" }}
              className="custom-scrollbar"
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    {[
                      { key: "symbol", label: "Symbol" },
                      { key: "exchange", label: "Exch" },
                      { key: "selected_value", label: `Value (${filters.ohlc.toUpperCase()})` },
                      { key: `prophet_${filters.ohlc}`, label: `Prophet (${filters.ohlc.toUpperCase()})` },
                      { key: `lgbm_${filters.ohlc}`, label: `LightGBM (${filters.ohlc.toUpperCase()})` },
                      { key: "trend", label: "Trend" },
                      { key: "confidence", label: "Confidence" }
                    ].map(({ key, label }) => (
                      <TableHead
                        key={key}
                        onClick={() => handleSort(key as keyof ScreenerData)}
                        className="text-neutral-text cursor-pointer select-none"
                      >
                        {label}{" "}
                        {sortKey === key && (sortOrder === 'asc' ? "▲" : "▼")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.length > 0 ? (
                    sortedData.map((stock) => (
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
                          ₹{stock.selected_value.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className="font-medium"
                          style={{ color: 'var(--success-green)' }}
                        > 
                          ₹{(stock[`prophet_${filters.ohlc}` as keyof ScreenerData] as number).toFixed(2)}
                        </TableCell>
                        <TableCell
                          className="font-medium"
                          style={{ color: '#FF9800' }}
                        >
                          ₹{(stock[`lgbm_${filters.ohlc}` as keyof ScreenerData] as number).toFixed(2)}
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-neutral-text py-4"
                      >
                        {user ? "Loading predictions for your watchlist..." : "Please log in."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}