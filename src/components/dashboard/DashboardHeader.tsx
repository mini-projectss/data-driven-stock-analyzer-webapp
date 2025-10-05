// DashboardHeader.tsx
import React, { useEffect, useState } from "react";
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
  onSearch?: (query: string) => void;
}

function getApiBase(): string {
  try {
    // Vite-style env: only access import.meta.env when running in the browser context.
    // Use a cast to any to avoid parser/type issues.
    // @ts-ignore
    const vite = (typeof window !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE) || null;
    if (vite) return vite;
  } catch (_) {}
  try {
    // CRA-style env
    // @ts-ignore
    if (typeof process !== "undefined" && (process as any).env?.REACT_APP_API_BASE) {
      // @ts-ignore
      return (process as any).env.REACT_APP_API_BASE;
    }
  } catch (_) {}
  return ""; // same-origin fallback
}

export function DashboardHeader({ onSearch }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [exchange, setExchange] = useState<"nse" | "bse">("nse");

  // dynamic values
  const [clockStr, setClockStr] = useState("IST --:--:--");
  const [marketText, setMarketText] = useState("Market Closed");
  const [advDecText, setAdvDecText] = useState("Adv/Dec: --");
  const [usdInrText, setUsdInrText] = useState("USD/INR: --");
  const [vixText, setVixText] = useState("India VIX: --");

  const API_BASE = getApiBase();

  useEffect(() => {
    // client-side IST clock update
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
    let mounted = true;

    async function fetchHeader() {
      try {
        const res = await fetch(`${API_BASE}/api/header?exchange=${exchange.toUpperCase()}`);
        if (!res.ok) {
          console.warn("header fetch failed:", res.status);
          return;
        }
        const d = await res.json();
        if (!mounted) return;

        if (d.market_status) {
          setMarketText(d.market_status === "OPEN" ? "Market Open" : "Market Closed");
        }
        if (typeof d.adv === "number" && typeof d.dec === "number") {
          setAdvDecText(`Adv/Dec: ${d.adv} / ${d.dec}`);
        } else if (typeof d.adv === "number") {
          setAdvDecText(`Adv/Dec: ${d.adv} / --`);
        } else {
          setAdvDecText("Adv/Dec: --");
        }
        if (typeof d.usdinr === "number") {
          setUsdInrText(`USD/INR: ${d.usdinr.toFixed(2)}`);
        } else {
          setUsdInrText("USD/INR: --");
        }
        if (typeof d.vix === "number") {
          setVixText(`India VIX: ${d.vix.toFixed(2)}`);
        } else {
          setVixText("India VIX: --");
        }
      } catch (err) {
        console.warn("Error fetching header:", err);
      }
    }

    fetchHeader(); // immediate
    const id = setInterval(fetchHeader, 5000); // poll every 5s
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [exchange, API_BASE]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="glass-card border-b border-white/10 p-4 space-y-4">
      {/* Search and Exchange Selector */}
      <div className="flex items-center space-x-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
          <Input
            placeholder="Search stocks (e.g., RELIANCE, TCS)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
          />
        </form>

        <Select value={exchange} onValueChange={(val) => setExchange(val as "nse" | "bse")}>
          <SelectTrigger className="w-32 bg-input border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/20">
            <SelectItem value="nse">NSE</SelectItem>
            <SelectItem value="bse">BSE</SelectItem>
          </SelectContent>
        </Select>
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
    </div>
  );
}
