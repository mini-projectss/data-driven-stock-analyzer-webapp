// src/components/dashboard/MainChart.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface MainChartProps {
  selectedStock: string;            // format "SYMBOL::EXCHANGE" e.g. "RELIANCE::NSE"
  onStockChange: (stockKey: string) => void; // expects same format
}

function getApiBase(): string {
  try {
    // Vite-style
    // @ts-ignore
    const vite = (typeof window !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE) || null;
    if (vite) return vite;
  } catch (_){}

  try {
    // CRA-style (process may be undefined in Vite)
    // @ts-ignore
    if (typeof process !== "undefined" && (process as any).env?.REACT_APP_API_BASE) {
      // @ts-ignore
      return (process as any).env.REACT_APP_API_BASE;
    }
  } catch (_){}

  // DEV convenience: if running in browser on localhost, default to backend at 8000
  try {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:8000";
      }
    }
  } catch (_){}

  // production fallback: same origin
  return "";
}

export function MainChart({ selectedStock, onStockChange }: MainChartProps) {
  const [timeRange, setTimeRange] = useState('1m');
  const [fullData, setFullData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedValueKey, setSelectedValueKey] = useState<'open' | 'high' | 'low' | 'close' | 'volume'>('close');

  const timeRanges = [
    { value: '1d', label: '1D', days: 1 },
    { value: '5d', label: '5D', days: 5 },
    { value: '1m', label: '1M', days: 22 },
    { value: '6m', label: '6M', days: 22 * 6 },
    { value: '1y', label: '1Y', days: 252 },
    { value: '2y', label: '2Y', days: 252 * 2 },
    { value: '3y', label: '3Y', days: 252 * 3 },
    { value: '5y', label: '5Y', days: 252 * 5 }
  ];

  // parse selectedStock safely
  const parts = (selectedStock || "RELIANCE::NSE").split("::");
  const symbol = parts[0] || "RELIANCE";
  const exchange = (parts[1] || "NSE").toUpperCase();

  useEffect(() => {
    if (!symbol) return;
    async function fetchData() {
      setLoading(true);
      try {
        const API_BASE = getApiBase();
        const base = API_BASE || "";
        const url = `${base}/api/stock?query=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn("stock fetch failed", res.status);
          setFullData([]);
          setLoading(false);
          return;
        }
        const j = await res.json();
        const processed = (j.data || []).map((r: any) => ({
          date: r.date,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume
        })).filter((row: any) => row && (row.close !== null && row.close !== undefined));
        setFullData(processed);
      } catch (err) {
        console.error("fetch stock error", err);
        setFullData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [symbol, exchange]);

  // Prepare chart data based on selected value key
  const slicedData = useMemo(() => {
    if (!fullData || fullData.length === 0) return [];
    const r = timeRanges.find(t => t.value === timeRange);
    let days = r ? Number(r.days) : 22;
    if (!Number.isFinite(days) || days <= 0) days = Math.min(22, fullData.length);
    const start = Math.max(0, fullData.length - days);
    const slice = fullData.slice(start);
    return slice.map(d => ({
      date: d.date,
      value: d[selectedValueKey]
    }));
  }, [fullData, timeRange, selectedValueKey]);

  // For header stats, use latest row
  const latestRow = fullData.length ? fullData[fullData.length - 1] : {};
  const previousRow = fullData.length > 1 ? fullData[fullData.length - 2] : latestRow;
  const currentValue = latestRow[selectedValueKey] ?? 0;
  const previousValue = previousRow[selectedValueKey] ?? currentValue;
  const valueChange = (currentValue || 0) - (previousValue || 0);
  const valueChangePercent = previousValue ? (valueChange / previousValue) * 100 : 0;
  const isPositive = valueChange >= 0;

  // Value pills
  const valuePills: { key: 'open' | 'high' | 'low' | 'close' | 'volume'; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'high', label: 'High' },
    { key: 'low', label: 'Low' },
    { key: 'close', label: 'Close' },
    { key: 'volume', label: 'Volume' }
  ];

  return (
    <Card className="glass-card p-6 mb-6">
      {/* Value Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {valuePills.map((pill) => (
          <Badge
            key={pill.key}
            variant={selectedValueKey === pill.key ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${
              selectedValueKey === pill.key
                ? 'bg-accent-teal text-white border-accent-teal'
                : 'border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal'
            }`}
            onClick={() => setSelectedValueKey(pill.key)}
            style={selectedValueKey === pill.key ? { backgroundColor: 'var(--accent-teal)' } : {}}
          >
            {pill.label}
          </Badge>
        ))}
      </div>

      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl text-white font-semibold mb-1">
            {symbol} - {selectedValueKey === "volume" ? "" : "₹"}
            {(currentValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </h2>
          <p
            className="text-lg flex items-center space-x-2"
            style={{ color: isPositive ? 'var(--success-green)' : 'var(--error-red)' }}
          >
            <span>
              {isPositive ? '+' : ''}
              {selectedValueKey === "volume" ? "" : "₹"}
              {valueChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span>
              ({isPositive ? '+' : ''}
              {valueChangePercent.toFixed(2)}%)
            </span>
          </p>
        </div>

        <div className="flex space-x-1">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range.value)}
              className={`${
                timeRange === range.value
                  ? 'bg-accent-teal text-white border-accent-teal'
                  : 'border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal'
              }`}
              style={timeRange === range.value ? { backgroundColor: 'var(--accent-teal)' } : {}}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={slicedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(221, 232, 245, 0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(221, 232, 245, 0.6)"
              fontSize={12}
            />
            <YAxis
              stroke="rgba(221, 232, 245, 0.6)"
              fontSize={12}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(30, 41, 59, 0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px"
              }}
              labelStyle={{
                color: "#aee",
                fontWeight: 500
              }}
              formatter={(value: any) => [
                selectedValueKey === "volume"
                  ? `${Number(value).toLocaleString()}`
                  : `₹${Number(value).toFixed(2)}`,
                valuePills.find(p => p.key === selectedValueKey)?.label || "Value"
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPositive ? 'var(--success-green)' : 'var(--error-red)'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
