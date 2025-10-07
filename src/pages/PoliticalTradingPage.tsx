// src/pages/PoliticalTradingPage.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { FiltersBar } from '../components/political/FiltersBar';
import { TrendSummaryCard } from '../components/political/TrendSummaryCard';
import { TradesList } from '../components/political/TradesList';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

type PoliticalTrade = {
  id: string;
  personName: string;
  category: 'Politician' | 'Promoter';
  action: 'BUY' | 'SELL';
  stockSymbol: string;
  stockName: string;
  quantity: number;
  value: number;
  pricePerShare: number;
  transactionDate: string; // YYYY-MM-DD
  exchange: 'NSE' | 'BSE';
  portfolioImpact?: string;
};

interface PoliticalTradingPageProps {
  onNavigate?: (page: string) => void;
  onStockSelect?: (stockKey: string) => void; // optional: allow parent to open main chart
}

function getApiBase(): string {
  try {
    // Vite / import.meta
    // @ts-ignore
    const vite = typeof window !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE;
    if (vite) return vite;
  } catch {}
  try {
    // CRA style
    // @ts-ignore
    if (typeof process !== "undefined" && (process as any).env?.REACT_APP_API_BASE) {
      // @ts-ignore
      return (process as any).env.REACT_APP_API_BASE;
    }
  } catch {}
  try {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return "http://localhost:8000";
    }
  } catch {}
  return "";
}

export function PoliticalTradingPage({ onNavigate, onStockSelect }: PoliticalTradingPageProps) {
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [category, setCategory] = useState<'All' | 'Politician' | 'Promoter'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [trades, setTrades] = useState<PoliticalTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = getApiBase();
  const searchDebounceRef = useRef<number | null>(null);

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('exchange', exchange);
      if (startDate) params.append('start_date', startDate.toISOString().slice(0,10));
      if (endDate) params.append('end_date', endDate.toISOString().slice(0,10));
      if (category && category !== 'All') params.append('category', category);
      if (searchQuery) params.append('search', searchQuery);
      const res = await fetch(`${apiBase}/api/political/trades?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`server ${res.status}`);
      }
      const json = await res.json();
      setTrades(json.items || []);
    } catch (err: any) {
      console.error("Error fetching political trades:", err);
      setError("Failed to load trades");
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  // fetch on filter change; debounce search
  useEffect(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    // small debounce for typing search
    searchDebounceRef.current = window.setTimeout(() => {
      fetchTrades();
    }, 300);
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchange, startDate, endDate, category, searchQuery]);

  // summary computed client-side (also available via /api/political/summary)
  const summaryStats = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekly = trades.filter(t => new Date(t.transactionDate) >= oneWeekAgo);
    const buys = weekly.filter(t => t.action === 'BUY');
    const sells = weekly.filter(t => t.action === 'SELL');
    const totalBuyValue = buys.reduce((s, t) => s + (t.value || 0), 0);
    const totalSellValue = sells.reduce((s, t) => s + (t.value || 0), 0);
    return {
      totalBuys: buys.length,
      totalSells: sells.length,
      totalBuyValue,
      totalSellValue,
      netValue: totalBuyValue - totalSellValue
    };
  }, [trades]);

  const handleStockClick = (symbol: string) => {
    // allow parent to handle opening chart if provided
    if (onStockSelect) {
      // provide standardized key: "SYMBOL::EXCHANGE" (strip suffix if required)
      const base = symbol.includes('.') ? symbol.split('.')[0] : symbol;
      onStockSelect(`${base}::${exchange}`);
    } else {
      toast.info(`Open chart for ${symbol}`);
    }
  };

  return (
    <div className="min-h-screen brand-gradient flex">
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="political"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="glass-card border-b border-white/10 p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-accent-teal" />
            <div>
              <h1 className="text-2xl text-white font-semibold">Political Trading</h1>
              <p className="text-neutral-text/80">Track politician & promoter stock transactions</p>
            </div>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <FiltersBar
              exchange={exchange}
              startDate={startDate}
              endDate={endDate}
              category={category}
              searchQuery={searchQuery}
              onExchangeChange={setExchange}
              onDateRangeChange={(s,e) => { setStartDate(s); setEndDate(e); }}
              onCategoryChange={(c) => setCategory(c)}
              onSearchChange={(q) => setSearchQuery(q)}
            />

            <TrendSummaryCard {...summaryStats} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl text-white font-semibold">Recent Transactions ({trades.length})</h2>
                {searchQuery && <p className="text-neutral-text/60 text-sm">Showing results for "{searchQuery}"</p>}
              </div>

              <div>
                {loading && <div className="text-neutral-text p-4">Loading...</div>}
                {error && <div className="text-red-400 p-4">{error}</div>}
                {!loading && !error && (
                  <TradesList trades={trades} onStockClick={handleStockClick} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
