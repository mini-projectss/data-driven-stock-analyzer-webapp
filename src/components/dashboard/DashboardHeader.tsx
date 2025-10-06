// src/components/dashboard/DashboardHeader.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Search, Clock, Activity, TrendingUp, DollarSign } from "lucide-react";

interface DashboardHeaderProps {
  onSearch?: (symbol: string, exchange: "NSE" | "BSE") => void;
  onExchangeChange?: (exchange: "NSE" | "BSE") => void;
}

type TickerItem = { display: string; file: string };

function getApiBase(): string {
  try {
    // Vite env support
    // @ts-ignore
    const vite = typeof window !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE;
    if (vite) return vite;
  } catch {}
  try {
    // CRA env support (guarded)
    // @ts-ignore
    if (typeof process !== "undefined" && (process as any).env?.REACT_APP_API_BASE) {
      // @ts-ignore
      return (process as any).env.REACT_APP_API_BASE;
    }
  } catch {}
  // dev fallback
  try {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return "http://localhost:8000";
    }
  } catch {}
  return "";
}

export function DashboardHeader({ onSearch, onExchangeChange }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
  const [justSelected, setJustSelected] = useState(false);


  // ticker suggestions state
  const [allTickers, setAllTickers] = useState<TickerItem[]>([]);
  const [suggestions, setSuggestions] = useState<TickerItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingTickers, setLoadingTickers] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // position for portal dropdown
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({ display: "none" });

  // status pills
  const [clockStr, setClockStr] = useState("IST --:--:--");
  const [marketText, setMarketText] = useState("Market Closed");
  const [advDecText, setAdvDecText] = useState("Adv/Dec: --");
  const [usdInrText, setUsdInrText] = useState("USD/INR: --");
  const [vixText, setVixText] = useState("India VIX: --");

  const API_BASE = getApiBase();

  useEffect(() => {
    // clock
    function tick() {
      const now = new Date();
      const opts: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      };
      const s = new Intl.DateTimeFormat("en-GB", opts).format(now);
      setClockStr(`IST ${s}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // fetch header data periodically
    let mounted = true;
    async function fetchHeader() {
      try {
        const res = await fetch(`${API_BASE}/api/header?exchange=${exchange}`);
        if (!res.ok) return;
        const d = await res.json();
        if (!mounted) return;
        if (d.market_status) setMarketText(d.market_status === "OPEN" ? "Market Open" : "Market Closed");
        if (typeof d.adv === "number" && typeof d.dec === "number") setAdvDecText(`Adv/Dec: ${d.adv} / ${d.dec}`);
        else setAdvDecText("Adv/Dec: --");
        if (typeof d.usdinr === "number") setUsdInrText(`USD/INR: ${d.usdinr.toFixed(2)}`);
        else setUsdInrText("USD/INR: --");
        if (typeof d.vix === "number") setVixText(`India VIX: ${d.vix.toFixed(2)}`);
        else setVixText("India VIX: --");
      } catch (err) {
        // ignore
      }
    }
    fetchHeader();
    const id = setInterval(fetchHeader, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [exchange, API_BASE]);

  // fetch tickers for selected exchange
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

  // debounce filter
  useEffect(() => {
  if (justSelected) return; // skip re-opening suggestions after selection
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
    setShowSuggestions(true);
  }

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const q = (searchQuery || "").trim();
    if (!q) return;
    onSearch?.(q.toUpperCase(), exchange);
    setShowSuggestions(false);
  }

  function handleSelectSuggestion(item: TickerItem) {
  const sym = item.display || item.file.split(".")[0];
  setJustSelected(true); // temporarily disable suggestions update
  setSearchQuery(sym);
  setShowSuggestions(false);
  onSearch?.(sym.toUpperCase(), exchange);
  // reset flag after a short delay
  setTimeout(() => setJustSelected(false), 300);
}


  // close suggestions on outside click
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

  // compute portal dropdown position relative to page
  const updatePortalPosition = () => {
    const el = formRef.current;
    if (!el) {
      setPortalStyle({ display: "none" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const left = rect.left + window.scrollX;
    const top = rect.bottom + window.scrollY; // attach under the form
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

  // update position when suggestions toggle, resize, scroll
  useLayoutEffect(() => {
    updatePortalPosition();
    // small throttled listeners
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

  // render dropdown as portal into body
  const suggestionsPortal = showSuggestions ? createPortal(
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
          aria-selected={false}
          onMouseDown={(e) => {
          e.stopPropagation(); // Prevent outside click handler from closing early
          e.preventDefault();  // Prevent focus loss
          handleSelectSuggestion(s);
          }}
          className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between"

            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <div className="flex flex-col">
              <span className="text-sm text-white font-medium">{s.display}</span>
              <span className="text-xs text-neutral-text">{s.file}</span>
            </div>
            <div className="text-xs text-neutral-text">{exchange}</div>
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="glass-card border-b border-white/10 p-4 space-y-4">
      <div className="flex items-center space-x-4">
        <form ref={formRef} onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative overflow-visible" role="search" aria-label="Stock search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
          <Input
            ref={inputRef}
            placeholder="Search stocks (e.g., RELIANCE, TCS)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
            className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="ticker-suggestion-list"
            aria-haspopup="listbox"
          />
        </form>

        <Select
          value={exchange.toLowerCase()}
          onValueChange={(v) => {
            const newEx = v === "bse" ? "BSE" : "NSE";
            setExchange(newEx);
            onExchangeChange?.(newEx); // 👈 Notify parent DashboardPage
          }}
        >
          <SelectTrigger className="w-32 bg-input border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/20">
            <SelectItem value="nse">NSE</SelectItem>
            <SelectItem value="bse">BSE</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => handleSearchSubmit()} className="ml-2" >
          Search
        </Button>
      </div>

      {/* Status Pills */}
      <div className="flex items-center space-x-4 overflow-x-auto">
        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          <Clock className="w-3 h-3 mr-1" />
          {clockStr}
        </Badge>

        <Badge
          variant="outline"
          className={`border-success-green/30 ${marketText === "Market Open" ? "text-success-green" : "text-neutral-text"} whitespace-nowrap`}
          style={marketText === "Market Open" ? { borderColor: "var(--success-green)", color: "var(--success-green)" } : undefined}
        >
          <Activity className="w-3 h-3 mr-1" />
          {marketText}
        </Badge>

        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          <TrendingUp className="w-3 h-3 mr-1" />
          {advDecText}
        </Badge>

        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          <DollarSign className="w-3 h-3 mr-1" />
          {usdInrText}
        </Badge>

        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          {vixText}
        </Badge>
      </div>

      {/* render portal when needed */}
      {suggestionsPortal}
    </div>
  );
}
  
