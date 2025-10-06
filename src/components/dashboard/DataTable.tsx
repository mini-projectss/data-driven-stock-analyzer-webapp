// src/components/dashboard/DataTable.tsx
import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockData {
  instrument: string;
  volume: number;
  high: number;
  low: number;
  change: number;
}

interface DataTableProps {
  exchange: "NSE" | "BSE";
  onStockSelect?: (stockKey: string) => void;
}

function getApiBase(): string {
  try {
    // vite env
    // @ts-ignore
    const vite = (import.meta as any)?.env?.VITE_API_BASE;
    if (vite) return vite;
  } catch {}
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:8000";
  }
  return "";
}

export function DataTable({ exchange, onStockSelect }: DataTableProps) {
  const [data, setData] = useState<StockData[]>([]);
  const [date, setDate] = useState("");
  const [sortKey, setSortKey] = useState<keyof StockData | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [error, setError] = useState("");
  const API_BASE = getApiBase();

  async function fetchData(dateOverride?: string) {
    try {
      const url = `${API_BASE}/api/datatable?exchange=${exchange}${
        dateOverride ? `&date=${dateOverride}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json || json.error || !json.items) {
        setError(json?.error || "No data available");
        setData([]);
      } else {
        setError("");
        setData(json.items || []);
        setDate(json.date || "");
      }
    } catch (e) {
      setError("Failed to fetch data");
      setData([]);
    }
  }

  useEffect(() => {
    fetchData();
  }, [exchange]);

  function handleSort(key: keyof StockData) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortAsc]);

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-white font-semibold">
          Market Data ({exchange})
        </h3>

        <input
          type="date"
          onChange={(e) => fetchData(e.target.value)}
          className="bg-input border border-white/20 text-white px-3 py-1 rounded-md text-sm"
        />
      </div>

      {error ? (
        <p className="text-error-red text-sm">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <div
            style={{ maxHeight: 420, overflowY: "auto" }}
            className="custom-scrollbar"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  {["instrument", "volume", "high", "low", "change"].map((key) => (
                    <TableHead
                      key={key}
                      onClick={() => handleSort(key as keyof StockData)}
                      className="text-neutral-text cursor-pointer select-none"
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                      {sortKey === key && (sortAsc ? "▲" : "▼")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length > 0 ? (
                  sortedData.map((stock) => {
                    const isPositive = stock.change >= 0;
                    return (
                      <TableRow
                        key={stock.instrument}
                        className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <TableCell className="text-white font-medium">
                          <span
                            className="underline cursor-pointer hover:text-accent-teal"
                            onClick={() =>
                              onStockSelect?.(`${stock.instrument}::${exchange}`)
                            }
                            tabIndex={0}
                            role="button"
                            onKeyDown={e => {
                              if (e.key === "Enter" || e.key === " ") {
                                onStockSelect?.(`${stock.instrument}::${exchange}`);
                              }
                            }}
                          >
                            {stock.instrument}
                          </span>
                        </TableCell>
                        <TableCell className="text-neutral-text">
                          {stock.volume.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-neutral-text">
                          ₹{stock.high.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-neutral-text">
                          ₹{stock.low.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center space-x-1"
                            style={{
                              color: isPositive
                                ? "var(--success-green)"
                                : "var(--error-red)",
                            }}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span>
                              {isPositive ? "+" : ""}
                              {stock.change.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-neutral-text py-4"
                    >
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
}

// Add custom scrollbar styles
// You can place this in your global CSS or inside a CSS module.
// For demonstration, add this at the end of the file or in your main CSS:
//
// .custom-scrollbar::-webkit-scrollbar {
//   width: 8px;
//   background: transparent;
// }
// .custom-scrollbar::-webkit-scrollbar-thumb {
//   background: rgba(255,255,255,0.12);
//   border-radius: 8px;
// }
// .custom-scrollbar {
//   scrollbar-width: thin;
//   scrollbar-color: rgba(255,255,255,0.18) transparent;
// }
