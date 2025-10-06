import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";

interface TreemapData {
  symbol: string;
  volume: number;
  change: number;
  size: number;
}

interface TreemapProps {
  onStockSelect?: (symbol: string) => void;
  exchange?: "NSE" | "BSE";
}

function getApiBase(): string {
  try {
    // vite env
    // @ts-ignore
    const vite = (import.meta as any)?.env?.VITE_API_BASE;
    if (vite) return vite;
  } catch {}
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
    return "http://localhost:8000";
  return "";
}

export function Treemap({ onStockSelect, exchange = "NSE" }: TreemapProps) {
  const [data, setData] = useState<TreemapData[]>([]);
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const API_BASE = getApiBase();

  useEffect(() => {
    async function fetchTreemap() {
      try {
        const res = await fetch(`${API_BASE}/api/treemap?exchange=${exchange}`);
        if (!res.ok) throw new Error("Failed to fetch treemap");
        const json = await res.json();
        setData(json.items || []);
      } catch (err) {
        console.error("Treemap fetch error:", err);
      }
    }
    fetchTreemap();
    const id = setInterval(fetchTreemap, 15000); // refresh every 15s
    return () => clearInterval(id);
  }, [exchange, API_BASE]);

  const getColor = (change: number) => {
    if (change > 0) {
      return `rgba(46, 125, 50, ${Math.min(Math.abs(change) / 3, 0.8) + 0.2})`;
    } else {
      return `rgba(198, 40, 40, ${Math.min(Math.abs(change) / 3, 0.8) + 0.2})`;
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
    return `${(volume / 1_000).toFixed(0)}K`;
  };

  return (
    <Card className="glass-card p-6">
      <h3 className="text-lg text-white font-semibold mb-4">Volume Treemap</h3>
      <div className="grid grid-cols-4 gap-2 h-96">
        {data.map((item) => {
          const isHovered = hoveredStock === item.symbol;
          return (
            <div
              key={item.symbol}
              className={`rounded-lg border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                isHovered ? "ring-2 ring-accent-teal scale-105" : ""
              }`}
              style={{
                backgroundColor: getColor(item.change),
                borderColor: "rgba(221, 232, 245, 0.2)",
                gridColumn: item.size > 20 ? "span 2" : "span 1",
                gridRow: item.size > 25 ? "span 2" : "span 1",
                minHeight: "60px",
              }}
              onMouseEnter={() => setHoveredStock(item.symbol)}
              onMouseLeave={() => setHoveredStock(null)}
              onClick={() => onStockSelect?.(item.symbol)}
            >
              <div className="p-3 h-full flex flex-col justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">
                    {item.symbol}
                  </p>
                  <p className="text-white/80 text-xs">
                    Vol: {formatVolume(item.volume)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="font-semibold text-sm"
                    style={{
                      color:
                        item.change >= 0
                          ? "var(--success-green)"
                          : "var(--error-red)",
                    }}
                  >
                    {item.change >= 0 ? "+" : ""}
                    {item.change.toFixed(1)}%
                  </p>
                </div>
              </div>

              {isHovered && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="font-semibold">{item.symbol}</p>
                    <p className="text-sm">Click to view chart</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-4 text-sm text-neutral-text/60">
        <span>Size = Volume</span>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "rgba(46, 125, 50, 0.6)" }}
            />
            <span>Positive</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "rgba(198, 40, 40, 0.6)" }}
            />
            <span>Negative</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
