import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface IndexData {
  name: string;
  value: string | number;
  change?: number;
  changePercent?: number;
  sparkline?: number[];
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
    if (
      typeof process !== "undefined" &&
      (process as any).env?.REACT_APP_API_BASE
    ) {
      // @ts-ignore
      return (process as any).env.REACT_APP_API_BASE;
    }
  } catch {}
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:8000";
  }
  return "";
}

// Add mapping from index name to Yahoo Finance URL
const INDEX_URLS: Record<string, string> = {
  "SENSEX": "https://finance.yahoo.com/quote/%5EBSESN/?guccounter=1&guce_referrer=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS8&guce_referrer_sig=AQAAAIJy3fpH8l-Wagtn0VT5YQhnuUMWMaoAXwD80CpF-yyuY_Wb_TBqTWy8JlZqG7fvPSo6HbfzwoMETAVSvrDgszAfVPdiusNGa_g-thVehOzcRf5XMiNHrpnyaZR0P9A6br65e3MM8IkPy3QG_MR9gy-onIUEtc7ETczX04zWUM6S",
  "NIFTY 50": "https://finance.yahoo.com/quote/%5ENSEI/",
  "NIFTY Bank": "https://finance.yahoo.com/quote/%5ENSEBANK/",
  "MIDCAP 100": "https://finance.yahoo.com/quote/NIFTY_MIDCAP_100.NS/",
  "SMALLCAP 250": "https://finance.yahoo.com/quote/NIFTYSMLCAP250.NS/",
  "GOLD": "https://finance.yahoo.com/quote/GOLDBEES.NS/",
};

export function IndexCards() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const API_BASE = getApiBase();

  useEffect(() => {
    async function fetchLiveData() {
      try {
        const res = await fetch(`${API_BASE}/api/indices`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // normalize shape
        const items: IndexData[] = (data.items || data || []).map((i: any) => ({
          name: i.name || i.symbol || "Unknown",
          value: i.value ?? "--",
          change: typeof i.change === "number" ? i.change : 0,
          changePercent:
            typeof i.changePercent === "number" ? i.changePercent : 0,
          sparkline: Array.isArray(i.sparkline) ? i.sparkline : [0, 0, 0],
        }));

        setIndices(items);
      } catch (err) {
        console.error("Error fetching index data:", err);

        // fallback data (keeps UI alive)
        setIndices([
          {
            name: "NIFTY 50",
            value: "22,368.00",
            change: 125.4,
            changePercent: 0.56,
            sparkline: [22200, 22250, 22180, 22320, 22280, 22350, 22368],
          },
          {
            name: "SENSEX",
            value: "73,651.35",
            change: 415.82,
            changePercent: 0.57,
            sparkline: [73100, 73200, 73050, 73400, 73300, 73500, 73651],
          },
          {
            name: "NIFTY Bank",
            value: "48,245.90",
            change: -89.75,
            changePercent: -0.19,
            sparkline: [48400, 48350, 48280, 48320, 48200, 48180, 48246],
          },
          {
            name: "Midcap",
            value: "54,820.15",
            change: 312.45,
            changePercent: 0.57,
            sparkline: [54400, 54500, 54450, 54600, 54700, 54780, 54820],
          },
          {
            name: "Smallcap",
            value: "17,951.80",
            change: 98.25,
            changePercent: 0.55,
            sparkline: [17800, 17850, 17820, 17900, 17880, 17920, 17952],
          },
          {
            name: "Gold",
            value: "₹67,520",
            change: 145.0,
            changePercent: 0.22,
            sparkline: [67300, 67350, 67280, 67400, 67450, 67480, 67520],
          },
        ]);
      }
    }

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  const renderSparkline = (data: number[], isPositive: boolean) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;

    return (
      <div className="flex items-end space-x-0.5 h-8">
        {data.map((value, index) => {
          const height = range > 0 ? ((value - min) / range) * 100 : 50;
          return (
            <div
              key={index}
              className="w-1 rounded-t transition-all duration-300"
              style={{
                height: `${Math.max(height, 10)}%`,
                backgroundColor: isPositive
                  ? "var(--success-green)"
                  : "var(--error-red)",
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {indices.map((index) => {
        const isPositive = (index.change ?? 0) >= 0;
        const change = index.change ?? 0;
        const changePercent = index.changePercent ?? 0;
        const sparkline = index.sparkline ?? [];
        const url = INDEX_URLS[index.name.trim().toUpperCase()] || INDEX_URLS[index.name.trim()];

        return (
          <Card
            key={index.name}
            className="glass-card p-4 hover:scale-105 transition-transform duration-200 cursor-pointer"
            onClick={() => {
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if ((e.key === "Enter" || e.key === " ") && url) {
                window.open(url, "_blank", "noopener,noreferrer");
              }
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-neutral-text/80 truncate">
                  {index.name}
                </h3>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-success-green" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-error-red" />
                )}
              </div>

              <div>
                <p className="text-lg text-white font-semibold">
                  {index.value}
                </p>
                <p
                  className="text-sm flex items-center space-x-1"
                  style={{
                    color: isPositive
                      ? "var(--success-green)"
                      : "var(--error-red)",
                  }}
                >
                  <span>
                    {isPositive ? "+" : ""}
                    {change.toFixed(2)}
                  </span>
                  <span>
                    ({isPositive ? "+" : ""}
                    {changePercent.toFixed(2)}%)
                  </span>
                </p>
              </div>

              {renderSparkline(sparkline, isPositive)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
