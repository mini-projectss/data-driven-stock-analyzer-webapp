import React, { useState, useEffect, useMemo } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { Input } from '../components/ui/input';
import {
  Search,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Flame,
  Snowflake,
  Hash,
  Zap,
  Sun,
  ZoomIn, // Added
  ZoomOut, // Added
  RotateCcw, // Added
} from 'lucide-react';
import { toast } from 'sonner';
import { TRACKED_TICKERS } from '../utils/tickerLoader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Defs, linearGradient, Stop } from 'recharts'; // Added Defs, linearGradient, Stop
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'; // Added
import { Button } from '../components/ui/button'; // Added

// -----------------------------------------------------------------------------
// --- TYPE DEFINITIONS & CONSTANTS ---
// -----------------------------------------------------------------------------
interface TrendSummary {
  ticker: string;
  currentInterest: number;
  changePct: number;
  searchRank: number;
}

interface HistoricalDataPoint {
  date: string;
  interest: number;
}

interface GoogleTrendsPageProps {
  onNavigate?: (page: string) => void;
}

type Timeframe = '90D' | '1Y' | '5Y';
const TIME_FRAMES: Timeframe[] = ['90D', '1Y', '5Y'];

// -----------------------------------------------------------------------------
// --- MOCK API CALLS (Unchanged) ---
// -----------------------------------------------------------------------------
const fetchTrendsSummary = async (): Promise<TrendSummary[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const data: TrendSummary[] = TRACKED_TICKERS.map((ticker, index) => {
    const currentInterest = Math.floor(20 + Math.random() * 80);
    let changePct = Math.random() * 40 - 20;
    if (index === 0) changePct = 35 + Math.random() * 10;
    if (index === 1) changePct = -35 - Math.random() * 10;
    return { ticker, currentInterest, changePct: parseFloat(changePct.toFixed(2)), searchRank: index + 1 };
  });
  return data.sort((a, b) => b.changePct - a.changePct);
};

const fetchHistoricalTrends = async (ticker: string, timeframe: Timeframe): Promise<HistoricalDataPoint[]> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const mockHistory: HistoricalDataPoint[] = [];
  let totalDays: number;
  let step: number;

  switch (timeframe) {
    case '1Y':
      totalDays = 365;
      step = 7;
      break;
    case '5Y':
      totalDays = 5 * 365;
      step = 30;
      break;
    case '90D':
    default:
      totalDays = 90;
      step = 1;
      break;
  }

  const today = Date.now();
  for (let i = 0; i <= totalDays; i += step) {
    const dateOffset = (totalDays - i) * 86400000;
    const date = new Date(today - dateOffset).toISOString().split('T')[0];
    const base = 50 + Math.sin((totalDays - i) / (totalDays / 8)) * 30;
    const noise = Math.random() * 10 - 5;
    mockHistory.push({
      date: date,
      interest: Math.min(100, Math.max(0, Math.round(base + noise))),
    });
  }

  return mockHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// -----------------------------------------------------------------------------
// --- HOOKS AND HELPERS (Unchanged) ---
// -----------------------------------------------------------------------------
const useSortableData = (items: TrendSummary[], config = { key: 'changePct', direction: 'descending' }) => {
  const [sortConfig, setSortConfig] = useState(config);
  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key as keyof TrendSummary;
        if (a[key] < b[key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: keyof TrendSummary) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

const getSortIcon = (key: keyof TrendSummary, sortConfig: { key: string, direction: string }) => {
  // If not active sort, show a lightweight fallback glyph (no external icon dependency)
  if (sortConfig.key !== key) {
    return <span className="ml-2 opacity-50 text-xs" aria-hidden>↕</span>;
  }
  return sortConfig.direction === 'ascending' ? (
    <ArrowUp className="w-3 h-3 ml-2" />
  ) : (
    <ArrowDown className="w-3 h-3 ml-2" />
  );
};

const getChangeStyle = (changePct: number) => {
  if (changePct > 0) return 'text-success-green'; // Use theme variable
  if (changePct < 0) return 'text-error-red'; // Use theme variable
  return 'text-neutral-text';
};

// Add helper: choose bar color based on interest level
const getBarColor = (interest: number) => {
  if (interest >= 80) return 'linear-gradient(90deg, #16A34A, #34D399)'; // green
  if (interest >= 60) return 'linear-gradient(90deg, #F97316, #FB923C)'; // orange
  if (interest >= 40) return 'linear-gradient(90deg, #06B6D4, #14B8A6)'; // teal
  return 'linear-gradient(90deg, #EF4444, #F87171)'; // red
};

// --- Custom Tooltip (Copied from TrendsChart.tsx) ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return (
      <div className="glass-card p-3 border border-white/20">
        <p className="text-white font-medium">{`Date: ${date}`}</p>
        <p
          className="font-semibold"
          style={{ color: '#0EA5E9' }} // Color from TrendsChart
        >
          {`Interest Index: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

// -----------------------------------------------------------------------------
// --- COMPONENT: StatusChip (Unchanged) ---
// -----------------------------------------------------------------------------
interface StatusChipProps {
  rank: number;
}

const StatusChip: React.FC<StatusChipProps> = ({ rank }) => {
  let colorClass = 'bg-gray-700/30 text-gray-300';
  let emoji = '🏅';
  let shadowClass = 'shadow-sm';

  if (rank === 1) {
    colorClass = 'bg-amber-500/20 text-amber-300';
    emoji = '🥇';
    shadowClass = 'shadow-[0_0_6px_rgba(245,158,11,0.4)]';
  } else if (rank === 2) {
    colorClass = 'bg-gray-500/20 text-gray-300';
    emoji = '🥈';
    shadowClass = 'shadow-[0_0_6px_rgba(209,213,219,0.4)]';
  } else if (rank === 3) {
    colorClass = 'bg-orange-500/20 text-orange-300';
    emoji = '🥉';
    shadowClass = 'shadow-[0_0_6px_rgba(249,115,22,0.4)]';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${shadowClass} transition-all duration-300`}>
      {emoji} {rank}
    </span>
  );
};

// -----------------------------------------------------------------------------
// --- COMPONENT: OverviewStatCard (Updated) ---
// -----------------------------------------------------------------------------
interface OverviewStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
  onClick?: () => void;
  isClickable?: boolean;
  emoji: string;
}

const OverviewStatCard: React.FC<OverviewStatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  description,
  onClick,
  isClickable = false,
  emoji
}) => {
  const clickableClasses = isClickable
    ? 'hover:bg-indigo-900/50 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 cursor-pointer'
    : 'cursor-default';

  return (
    // --- MODIFIED: Use glass-card class ---
    <div
      className={`glass-card p-4 ${clickableClasses} rounded-lg`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-text flex items-center">
          <span className="mr-2 text-base">{emoji}</span>
          {title}
        </p>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="mt-2 flex flex-col">
        <span className={`text-2xl font-bold ${color}`}>
          {value}
        </span>
        {description && (
          <span className="text-xs text-neutral-text/80 mt-1 truncate">
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- COMPONENT: Chart Sidebar Insights (Updated) ---
// -----------------------------------------------------------------------------
interface ChartSidebarProps {
  tickerData: TrendSummary | undefined;
  topMover: TrendSummary | undefined;
  coldestMover: TrendSummary | undefined;
  onSelectTicker: (ticker: string) => void;
}

const ChartSidebarInsights: React.FC<ChartSidebarProps> = ({ tickerData, topMover, coldestMover, onSelectTicker }) => {
  const changeStyle = getChangeStyle(tickerData?.changePct || 0);

  const StatMicroCard: React.FC<{ title: string, value: string | number, color: string, icon: React.ElementType }> = ({ title, value, color, icon: Icon }) => (
    // --- MODIFIED: Use glass-card class ---
    <div className="flex items-center justify-between p-3 glass-card">
      <div className="flex items-center">
        <Icon className={`w-4 h-4 mr-2 ${color}`} />
        <span className="text-sm font-medium text-neutral-text">{title}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );

  const TickerListItem: React.FC<{ data: TrendSummary, isTop: boolean }> = ({ data, isTop }) => (
    // --- MODIFIED: Use glass-card class ---
    <div
      className="flex justify-between items-center p-3 glass-card hover:bg-indigo-900/50 transition-all duration-200 cursor-pointer"
      onClick={() => onSelectTicker(data.ticker)}
    >
      <div className="flex items-center">
        <span className={`mr-2 ${isTop ? 'text-success-green' : 'text-error-red'}`}>
          {isTop ? <Sun className="w-5 h-5" /> : <Snowflake className="w-5 h-5" />}
        </span>
        <span className="font-semibold text-white">{data.ticker}</span>
      </div>
      <span className={`${getChangeStyle(data.changePct)} text-sm font-semibold`}>
        {data.changePct > 0 ? '+' : ''}{data.changePct}%
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
        <Zap className="w-5 h-5 mr-2 text-amber-400" /> Ticker Insights
      </h3>

      {/* --- MODIFIED: Use glass-card class --- */}
      <div className="glass-card p-4 space-y-4">
        <StatMicroCard
          title="Search Rank"
          value={tickerData?.searchRank || 'N/A'}
          color={tickerData && (tickerData.searchRank || 4) <= 3 ? 'text-amber-400' : 'text-indigo-300'}
          icon={Hash}
        />
        <StatMicroCard
          title="30-Day Change"
          value={`${(tickerData?.changePct || 0) > 0 ? '+' : ''}${tickerData?.changePct || 0}%`}
          color={changeStyle}
          icon={TrendingUp}
        />
        <div className="pt-2">
          <p className="text-sm font-medium text-neutral-text mb-2">Interest Score (0-100)</p>
          <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-teal transition-all duration-1000"
              style={{ width: `${tickerData?.currentInterest || 0}%` }}
            ></div>
          </div>
          <p className="text-right text-xs text-neutral-text/80 mt-1">
            Score: {tickerData?.currentInterest || 'N/A'}
          </p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mt-6 mb-3">
        Market Trends 📊
      </h3>
      <div className="space-y-3">
        {topMover && <TickerListItem data={topMover} isTop={true} />}
        {coldestMover && <TickerListItem data={coldestMover} isTop={false} />}
        <p className="text-xs text-neutral-text/60 pt-2 border-t border-white/10">
          Click to view historical trends for these tickers.
        </p>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- COMPONENT: DetailedTrendsChart (Updated) ---
// -----------------------------------------------------------------------------
interface DetailedTrendsChartProps {
  ticker: string;
  onBack: () => void;
  summaryData: TrendSummary[];
  onSelectTicker: (ticker: string) => void;
}

const DetailedTrendsChart: React.FC<DetailedTrendsChartProps> = ({ ticker, onBack, summaryData, onSelectTicker }) => {
  const [history, setHistory] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('90D');

  const currentTickerData = useMemo(() => summaryData.find(d => d.ticker === ticker), [summaryData, ticker]);
  const topMover = summaryData[0];
  const coldestMover = useMemo(() => {
    if (summaryData.length === 0) return undefined;
    return [...summaryData].sort((a, b) => a.changePct - b.changePct)[0];
  }, [summaryData]);

  useEffect(() => {
    setLoading(true);
    fetchHistoricalTrends(ticker, timeframe).then(data => {
      setHistory(data);
      setLoading(false);
    }).catch(() => {
      toast.error(`Failed to load historical trends for ${ticker}.`);
      setLoading(false);
    });
  }, [ticker, timeframe]);

  const tickFormatter = (tick: string) => {
    const date = new Date(tick);
    if (timeframe === '90D') {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }
    if (timeframe === '1Y') {
      return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    return date.toLocaleDateString('en-IN', { year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-accent-teal hover:text-white transition-colors flex items-center text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          {/* --- MODIFIED: Wrapper for chart + header --- */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h2 className="text-xl font-semibold text-white mb-3 sm:mb-0">
                {ticker} Search Interest ({timeframe}) 📈
              </h2>
              {/* --- ADDED: Wrapper for buttons --- */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex space-x-2 bg-black/20 p-1 rounded-lg">
                  {TIME_FRAMES.map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 
                        ${timeframe === tf
                          ? 'bg-accent-teal text-white shadow-md'
                          : 'text-neutral-text hover:text-white'
                        }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                {/* --- ADDED: Zoom buttons --- */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-40 text-neutral-text h-full">
                <div className="w-6 h-6 border-4 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent-teal)' }}></div>
                Loading {timeframe} search history for {ticker}...
              </div>
            ) : (
              // --- MODIFIED: Chart styling ---
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={history}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    {/* --- ADDED: Gradient Defs --- */}
                    <defs>
                      <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(221, 232, 245, 0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(221, 232, 245, 0.6)"
                      interval="preserveStartEnd"
                      tickFormatter={tickFormatter}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="rgba(221, 232, 245, 0.6)"
                      domain={[0, 100]}
                      style={{ fontSize: '12px' }}
                      label={{
                        value: 'Interest Index',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: 'rgba(221, 232, 245, 0.6)' }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="interest"
                      stroke="#0EA5E9"
                      strokeWidth={3}
                      dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#0EA5E9', stroke: '#ffffff', strokeWidth: 2 }}
                      fill="url(#interestGradient)"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.3))'
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block">
          <ChartSidebarInsights
            tickerData={currentTickerData}
            topMover={topMover}
            coldestMover={coldestMover}
            onSelectTicker={onSelectTicker}
          />
        </div>
      </div>

      <div className="lg:hidden pt-4">
        <ChartSidebarInsights
          tickerData={currentTickerData}
          topMover={topMover}
          coldestMover={coldestMover}
          onSelectTicker={onSelectTicker}
        />
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- MAIN COMPONENT: GoogleTrendsPage (Updated) ---
// -----------------------------------------------------------------------------
export function GoogleTrendsPage({ onNavigate }: GoogleTrendsPageProps) {
  const [data, setData] = useState<TrendSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTicker) {
      const loadSummaryData = async () => {
        setIsLoading(true);
        try {
          const summaryData = await fetchTrendsSummary();
          setData(summaryData);
        } catch (error) {
          toast.error("Couldn't fetch trends summary data.");
          setData([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadSummaryData();
    }
  }, [selectedTicker]);

  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  const { items: allSortedItems, requestSort, sortConfig } = useSortableData(data);

  const filteredItems = useMemo(() => {
    if (searchTerm) {
      return allSortedItems.filter(item =>
        item.ticker.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return allSortedItems.slice(0, 10);
  }, [allSortedItems, searchTerm]);

  const topMover = allSortedItems[0];
  const coldestMover = useMemo(() => {
    if (allSortedItems.length === 0) return undefined;
    return [...allSortedItems].sort((a, b) => a.changePct - b.changePct)[0];
  }, [allSortedItems]);

  const tableTitle = searchTerm
    ? `🔍 Search Results for "${searchTerm}"`
    : `📈 Top 10 Search Movers (Out of ${TRACKED_TICKERS.length})`;

  if (selectedTicker) {
    return (
      <div className="min-h-screen brand-gradient flex"> {/* Use brand-gradient */}
        <div className="flex-shrink-0">
          <DashboardSidebar activeSection="trends" onSectionChange={() => { }} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 flex flex-col p-6 min-w-0">
          {/* --- MODIFIED: Use glass-card class --- */}
          <div className="glass-card p-6">
            <DetailedTrendsChart
              ticker={selectedTicker}
              onBack={() => setSelectedTicker(null)}
              summaryData={allSortedItems}
              onSelectTicker={handleSelectTicker}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen brand-gradient flex"> {/* Use brand-gradient */}
      <div className="flex-shrink-0">
        <DashboardSidebar
          activeSection="trends"
          onSectionChange={() => { }}
          onNavigate={onNavigate}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* --- MODIFIED: Use glass-card class + rounded corners --- */}
        <div className="glass-card p-6 mb-6 rounded-lg">
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <h1 className="text-3xl text-white font-semibold tracking-tight">
                  📈 Search Trends Monitor
                </h1>
              </div>
              <p className="text-neutral-text/80 max-w-2xl mx-auto text-sm">
                Track significant shifts in public search interest for stocks over the past 30 days.
              </p>
            </div>

            <div className="flex gap-4 max-w-xl mx-auto">
              <div className="flex-1 relative">
                {/* --- MODIFIED: Search icon style --- */}
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
                <Input
                  placeholder={`Search all ${TRACKED_TICKERS.length} stocks by ticker...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  // --- MODIFIED: Input style ---
                  className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 p-6 pt-0 overflow-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              <div className="glass-card p-4 h-24 animate-pulse"></div>
              <div className="glass-card p-4 h-24 animate-pulse"></div>
              <div className="glass-card p-4 h-24 animate-pulse"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              <OverviewStatCard
                title="Monitored Stocks"
                value={TRACKED_TICKERS.length}
                icon={Hash}
                color="text-indigo-300"
                description="Total stocks tracked"
                emoji="🌐"
              />
              <OverviewStatCard
                title="Top Mover (30D)"
                value={topMover ? topMover.ticker : 'N/A'}
                icon={Flame}
                color="text-success-green"
                description={topMover ? `+${topMover.changePct}% search surge` : 'No data'}
                onClick={() => topMover && handleSelectTicker(topMover.ticker)}
                isClickable={!!topMover}
                emoji="🔥"
              />
              <OverviewStatCard
                title="Lowest Mover (30D)"
                value={coldestMover ? coldestMover.ticker : 'N/A'}
                icon={Snowflake}
                color="text-error-red"
                description={coldestMover ? `${coldestMover.changePct}% search drop` : 'No data'}
                onClick={() => coldestMover && handleSelectTicker(coldestMover.ticker)}
                isClickable={!!coldestMover}
                emoji="❄️"
              />
            </div>
          )}

          {/* --- MODIFIED: Use glass-card class + rounded corners --- */}
          <div className="glass-card p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">
              {tableTitle}
            </h2>

            {isLoading ? (
              <div className="text-center py-20 text-neutral-text">
                <div className="w-6 h-6 border-4 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent-teal)' }}></div>
                Analyzing {TRACKED_TICKERS.length} stock trends...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 text-neutral-text">
                No matching trends found for "{searchTerm}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* --- MODIFIED: Replaced <table> with shadcn/ui <Table> --- */}
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-neutral-text">Rank</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort('ticker')}
                          className="text-neutral-text hover:text-white hover:bg-white/10 p-0 h-auto font-normal"
                        >
                          Stock Ticker
                          {getSortIcon('ticker', sortConfig)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort('currentInterest')}
                          className="text-neutral-text hover:text-white hover:bg-white/10 p-0 h-auto font-normal"
                        >
                          Interest (0-100)
                          {getSortIcon('currentInterest', sortConfig)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => requestSort('changePct')}
                          className="text-neutral-text hover:text-white hover:bg-white/10 p-0 h-auto font-normal"
                        >
                          30-Day Change (%)
                          {getSortIcon('changePct', sortConfig)}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, index) => {
                      const isTop = index === 0 && !searchTerm;
                      return (
                        <TableRow
                          key={item.ticker}
                          className="border-white/10 hover:bg-white/5 cursor-pointer"
                          onClick={() => handleSelectTicker(item.ticker)}
                        >
                          <TableCell className="text-neutral-text">
                            {isTop ? (
                              <div className="relative inline-flex">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <StatusChip rank={index + 1} />
                              </div>
                            ) : (
                              <StatusChip rank={index + 1} />
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-white">
                            {item.ticker}
                          </TableCell>
                          <TableCell className="text-neutral-text">
                            <div className="flex items-center space-x-3 justify-end">
                              <span className="w-6 text-right">{item.currentInterest}</span>
                              <div className="w-28 h-3 rounded-full bg-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${Math.max(2, item.currentInterest)}%`,
                                    background: getBarColor(item.currentInterest),
                                    boxShadow: '0 6px 14px rgba(0,0,0,0.35)'
                                  }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            <span className={`${getChangeStyle(item.changePct)} flex items-center`}>
                              {item.changePct > 0 ? (
                                <>
                                  <ArrowUp className="w-4 h-4 mr-1" />
                                  +{item.changePct}%
                                </>
                              ) : (
                                <>
                                  <ArrowDown className="w-4 h-4 mr-1" />
                                  {item.changePct}%
                                </>
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}