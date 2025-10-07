import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { PredictionChart } from '../components/prediction/PredictionChart';
import { PredictionDataTable } from '../components/prediction/PredictionDataTable';
import { Watchlist } from '../components/prediction/Watchlist';
import { MarketScreener } from '../components/prediction/MarketScreener';
import { Search, TrendingUp } from 'lucide-react';
import { createPortal } from 'react-dom';

interface PredictionEnginePageProps {
  onNavigate?: (page: string) => void;
}

function getApiBase(): string {
  try {
    // Vite env
    // @ts-ignore
    const vite = (import.meta as any)?.env?.VITE_API_BASE;
    if (vite) return vite;
  } catch {}
  try {
    // CRA env
    // @ts-ignore
    if (typeof process !== "undefined" && (process as any).env?.REACT_APP_API_BASE) {
      // @ts-ignore
      return (process as any).env.REACT_APP_API_BASE;
    }
  } catch {}
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:8000";
  }
  return "";
}

type TickerItem = { display: string; file: string };

export function PredictionEnginePage({ onNavigate }: PredictionEnginePageProps) {
  const [selectedStock, setSelectedStock] = useState('RELIANCE');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('days');
  const [exchange, setExchange] = useState('nse');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Prediction data state
  const [predictionData, setPredictionData] = useState<{
    historical: any[];
    prophet: any[];
    lgbm: any[];
  } | null>(null);

  const API_BASE = getApiBase();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyze = async (symbolOverride?: string) => {
    const symbol = symbolOverride || searchQuery.trim();
    if (!symbol) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setErrorMsg(null);
    setSelectedStock(symbol.toUpperCase());
    setPredictionData(null);

    // Simulate progress bar
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      setAnalysisProgress(progress);
      if (progress >= 90) clearInterval(progressInterval);
    }, 300);

    try {
      const res = await fetch(
        `${API_BASE}/api/prediction/analyze?ticker=${encodeURIComponent(symbol.toUpperCase())}&exchange=${exchange.toUpperCase()}&time_range=${timeRange}`
      );
      if (!res.ok) {
        // Try to parse error from backend
        let errJson = null;
        try { errJson = await res.json(); } catch {}
        if (errJson && errJson.error === "ticker_not_found") {
          setErrorMsg("Stock not found. Please check the symbol.");
        } else {
          setErrorMsg("Prediction failed. Please try another symbol.");
        }
        setPredictionData(null);
        setAnalysisProgress(0);
        return;
      }
      const json = await res.json();
      setPredictionData(json);
      setAnalysisProgress(100);
      setErrorMsg(null);
    } catch (err) {
      setPredictionData(null);
      setAnalysisProgress(0);
      setErrorMsg("Prediction failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProgressText = () => {
    if (analysisProgress < 30) return 'Fetching historical data...';
    if (analysisProgress < 60) return 'Running Prophet model...';
    if (analysisProgress < 90) return 'Running LightGBM model...';
    return 'Analysis completed!';
  };

  const [allTickers, setAllTickers] = useState<TickerItem[]>([]);
  const [suggestions, setSuggestions] = useState<TickerItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingTickers, setLoadingTickers] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // For portal dropdown position
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({ display: "none" });

  // Fetch tickers for selected exchange
  useEffect(() => {
    let mounted = true;
    async function fetchTickers() {
      setLoadingTickers(true);
      try {
        const res = await fetch(`${API_BASE}/api/tickers?exchange=${exchange}`);
        if (!res.ok) {
          setAllTickers([]);
          setLoadingTickers(false);
          return;
        }
        const json = await res.json();
        if (!mounted) return;
        const items: TickerItem[] = (json.items || []).map((it: any) => ({ display: it.display, file: it.file }));
        setAllTickers(items);
        if (searchQuery.trim()) filterSuggestions(searchQuery, items);
      } catch (err) {
        setAllTickers([]);
      } finally {
        setLoadingTickers(false);
      }
    }
    fetchTickers();
    return () => { mounted = false; };
  }, [exchange, API_BASE]);

  // Debounce filter
  useEffect(() => {
    if (justSelected) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      filterSuggestions(searchQuery, allTickers);
    }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [searchQuery, allTickers]);

  function filterSuggestions(q: string, tickers: TickerItem[]) {
    const qTrim = (q || "").trim().toUpperCase();
    if (!qTrim) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const starts: TickerItem[] = [];
    const contains: TickerItem[] = [];
    for (const t of tickers) {
      const d = (t.display || "").toUpperCase();
      if (d.startsWith(qTrim)) starts.push(t);
      else if (d.includes(qTrim)) contains.push(t);
    }
    const combined = [...starts, ...contains].slice(0, 20);
    setSuggestions(combined);
    setShowSuggestions(combined.length > 0);
    setHighlightedIdx(-1);
  }

  function handleSelectSuggestion(item: TickerItem) {
    const sym = item.display || item.file.split(".")[0];
    setJustSelected(true);
    setSearchQuery(sym);
    setShowSuggestions(false);
    setHighlightedIdx(-1);
    setErrorMsg(null);
    setTimeout(() => setJustSelected(false), 300);
    setTimeout(() => handleAnalyze(sym), 0);
  }

  // Keyboard navigation for suggestions
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIdx(idx => Math.min(idx + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIdx(idx => Math.max(idx - 1, 0));
      } else if (e.key === "Enter") {
        if (highlightedIdx >= 0 && highlightedIdx < suggestions.length) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[highlightedIdx]);
        } else {
          // If no suggestion highlighted, try to match exactly
          const match = allTickers.find(
            t => t.display.toUpperCase() === searchQuery.trim().toUpperCase()
          );
          if (match) {
            e.preventDefault();
            handleSelectSuggestion(match);
          } else {
            // No match, run analyze with input (will show error if not found)
            handleAnalyze();
          }
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter") {
      // No suggestions open, try to match exactly
      const match = allTickers.find(
        t => t.display.toUpperCase() === searchQuery.trim().toUpperCase()
      );
      if (match) {
        e.preventDefault();
        handleSelectSuggestion(match);
      } else {
        handleAnalyze();
      }
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!formRef.current) return;
      if (!formRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Compute portal dropdown position
  const updatePortalPosition = () => {
    const el = formRef.current;
    if (!el) {
      setPortalStyle({ display: "none" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const left = rect.left + window.scrollX;
    const top = rect.bottom + window.scrollY;
    const width = rect.width;
    setPortalStyle({
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      zIndex: 999999,
      display: showSuggestions ? "block" : "none",
    });
  };

  useLayoutEffect(() => {
    updatePortalPosition();
    let raf = 0;
    const onWinChange = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updatePortalPosition());
    };
    window.addEventListener("resize", onWinChange);
    window.addEventListener("scroll", onWinChange, true);
    return () => {
      window.removeEventListener("resize", onWinChange);
      window.removeEventListener("scroll", onWinChange, true);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [showSuggestions, suggestions.length]);

  // Suggestions dropdown portal
  const suggestionsPortal = showSuggestions ? (
    typeof document !== "undefined" && document.body
      ? createPortal(
        <div
          id="ticker-suggestion-list-portal"
          role="listbox"
          aria-label="Ticker suggestions"
          style={portalStyle}
        >
          <div className="bg-card border border-white/10 rounded-lg shadow-lg max-h-64 overflow-auto" style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
            {loadingTickers && <div className="p-3 text-sm text-neutral-text">Loading...</div>}
            {!loadingTickers && suggestions.length === 0 && <div className="p-3 text-sm text-neutral-text">No suggestions</div>}
            {!loadingTickers && suggestions.map((s, i) => (
              <button
                key={`${s.file}-${i}`}
                role="option"
                aria-selected={highlightedIdx === i}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSelectSuggestion(s);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                  highlightedIdx === i ? "bg-white/10" : ""
                }`}
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
              >
                <div className="flex flex-col">
                  <span className="text-sm text-white font-medium">{s.display}</span>
                  <span className="text-xs text-neutral-text">{s.file}</span>
                </div>
                <div className="text-xs text-neutral-text">{exchange.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )
      : null
  ) : null;

  return (
    <div className="min-h-screen brand-gradient flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="prediction"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="glass-card border-b border-white/10 p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-accent-teal" />
              <h1 className="text-2xl text-white font-semibold">
                Prediction & Analysis Platform
              </h1>
            </div>
            
            {/* Search and Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              <form ref={formRef} className="flex-1 relative max-w-md" onSubmit={e => { e.preventDefault(); handleAnalyze(); }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
                <Input
                  ref={inputRef}
                  placeholder="Enter ticker (e.g., RELIANCE, TCS)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                  onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                  onKeyDown={handleInputKeyDown}
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions}
                  aria-controls="ticker-suggestion-list"
                  aria-haspopup="listbox"
                />
                {errorMsg && (
                  <div className="absolute left-0 right-0 mt-1 text-sm text-red-400 bg-black/60 rounded px-3 py-2 z-50">
                    {errorMsg}
                  </div>
                )}
                {suggestionsPortal}
              </form>

              <Select value={exchange} onValueChange={setExchange}>
                <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/20">
                  <SelectItem value="nse">NSE</SelectItem>
                  <SelectItem value="bse">BSE</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/20">
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !searchQuery.trim()}
                className="bg-accent-teal hover:bg-accent-teal/90 text-white"
                style={{ backgroundColor: 'var(--accent-teal)' }}
              >
                Analyze Symbol
              </Button>
            </div>

            {/* Progress Indicator */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-text">{getProgressText()}</span>
                  <span className="text-neutral-text">{analysisProgress}%</span>
                </div>
                <Progress 
                  value={analysisProgress} 
                  className="h-2"
                />
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="analyze" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/10 max-w-md">
              <TabsTrigger 
                value="analyze" 
                className="data-[state=active]:bg-accent-teal data-[state=active]:text-white"
              >
                Analyze
              </TabsTrigger>
              <TabsTrigger 
                value="screener" 
                className="data-[state=active]:bg-accent-teal data-[state=active]:text-white"
              >
                Market Screener
              </TabsTrigger>
              <TabsTrigger 
                value="watchlist" 
                className="data-[state=active]:bg-accent-teal data-[state=active]:text-white"
              >
                Watchlist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analyze" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2">
                  <PredictionChart 
                    selectedStock={selectedStock}
                    isAnalyzing={isAnalyzing}
                    predictionData={predictionData}
                  />
                </div>
                
                {/* Data Table */}
                <div className="lg:col-span-2">
                  <PredictionDataTable selectedStock={selectedStock} predictionData={predictionData} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="screener">
              <MarketScreener />
            </TabsContent>

            <TabsContent value="watchlist">
              <Watchlist />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}