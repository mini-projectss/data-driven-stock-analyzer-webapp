import React, { useState, useEffect, useMemo } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar'; 
import { Input } from '../components/ui/input'; 
import { Search, TrendingUp, ArrowDown, ArrowUp, ArrowLeft, Flame, Snowflake, Hash, Zap, Sun } from 'lucide-react';
import { toast } from 'sonner'; 
import { TRACKED_TICKERS } from '../utils/tickerLoader'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; 
// NOTE: ResponsiveContainer imported above 

// NOTE: Ensure you have run: npm install recharts sonner

// -----------------------------------------------------------------------------
// --- TYPE DEFINITIONS & CONSTANTS ---
// -----------------------------------------------------------------------------
interface TrendSummary {
  ticker: string;
  currentInterest: number; // Google Trends Index (0-100)
  changePct: number; // % change over the last 30 days
  searchRank: number; 
}

interface HistoricalDataPoint {
    date: string;
    interest: number; // Search interest (0-100)
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
    // Ensure sufficient spread for hottest/coldest
    let changePct = Math.random() * 40 - 20; 
    
    // Occasionally make one stock very hot and one very cold for better visualization
    if (index === 0) changePct = 35 + Math.random() * 10; // Hottest
    if (index === 1) changePct = -35 - Math.random() * 10; // Coldest

    return { ticker, currentInterest, changePct: parseFloat(changePct.toFixed(2)), searchRank: index + 1 };
  });
  // Sort by changePct descending to identify the "Top Movers"
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
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp className="w-3 h-3 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1" />
    );
};

const getChangeStyle = (changePct: number) => {
    if (changePct > 0) return 'text-green-400';
    if (changePct < 0) return 'text-red-400';
    return 'text-neutral-text/70';
};

// -----------------------------------------------------------------------------
// --- COMPONENT: StatusChip (Unchanged) ---
// -----------------------------------------------------------------------------
interface StatusChipProps {
    rank: number;
}

const StatusChip: React.FC<StatusChipProps> = ({ rank }) => {
    let colorClass = 'bg-gray-700/50 text-neutral-text';
    let emoji = '🏅';
    let shadowClass = 'shadow-md';

    if (rank === 1) {
        colorClass = 'bg-yellow-500/30 text-yellow-300';
        emoji = '🥇';
        shadowClass = 'shadow-[0_0_8px_rgba(252,211,77,0.5)]'; // Yellow glow
    } else if (rank === 2) {
        colorClass = 'bg-gray-400/30 text-gray-300';
        emoji = '🥈';
        shadowClass = 'shadow-[0_0_8px_rgba(209,213,219,0.5)]'; // Gray glow
    } else if (rank === 3) {
        colorClass = 'bg-orange-600/30 text-orange-400';
        emoji = '🥉';
        shadowClass = 'shadow-[0_0_8px_rgba(251,146,60,0.5)]'; // Orange glow
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${shadowClass} transition-all duration-300`}>
            {emoji} {rank}
        </span>
    );
};


// -----------------------------------------------------------------------------
// --- COMPONENT: OverviewStatCard (Unchanged) ---
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
        ? 'cursor-pointer hover:border-pink-400 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300'
        : '';
        
    return (
        <div 
            className={`glass-card p-5 rounded-xl border border-white/10 ${clickableClasses}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-text/80 flex items-center">
                    <span className="mr-2 text-lg">{emoji}</span>
                    {title}
                </p>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="mt-2 flex flex-col">
                <span className={`text-3xl font-extrabold ${color} drop-shadow-lg`}>
                    {value}
                </span>
                {description && (
                    <span className="text-xs text-neutral-text/60 mt-1 truncate">
                        {description}
                    </span>
                )}
            </div>
        </div>
    );
};


// -----------------------------------------------------------------------------
// --- COMPONENT: Chart Sidebar Insights (Unchanged) ---
// -----------------------------------------------------------------------------

interface ChartSidebarProps {
    tickerData: TrendSummary | undefined;
    hottestMover: TrendSummary | undefined;
    coldestMover: TrendSummary | undefined;
    onSelectTicker: (ticker: string) => void;
}

const ChartSidebarInsights: React.FC<ChartSidebarProps> = ({ tickerData, hottestMover, coldestMover, onSelectTicker }) => {

    // Safely calculate change style, defaulting to 0 if tickerData is undefined
    const changeStyle = getChangeStyle(tickerData?.changePct || 0);

    // Micro stat card component
    const StatMicroCard: React.FC<{ title: string, value: string | number, color: string, icon: React.ElementType }> = ({ title, value, color, icon: Icon }) => (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 shadow-lg">
            <div className="flex items-center">
                <Icon className={`w-4 h-4 mr-3 ${color}`} />
                <span className="text-sm font-medium text-neutral-text/80">{title}</span>
            </div>
            <span className={`text-lg font-bold ${color}`}>{value}</span>
        </div>
    );
    
    // Ticker item for Hottest/Coldest list
    const TickerListItem: React.FC<{ data: TrendSummary, isHot: boolean }> = ({ data, isHot }) => (
        <div 
            className="flex justify-between items-center p-3 rounded-xl border border-white/10 transition-all duration-200 hover:bg-white/10 cursor-pointer"
            onClick={() => onSelectTicker(data.ticker)}
        >
            <div className="flex items-center">
                <span className={`mr-3 ${isHot ? 'text-green-400' : 'text-red-400'}`}>
                    {isHot ? <Sun className="w-5 h-5" /> : <Snowflake className="w-5 h-5" />}
                </span>
                <span className="font-semibold text-white">{data.ticker}</span>
            </div>
            <span className={`${getChangeStyle(data.changePct)} text-sm font-bold`}>
                {data.changePct > 0 ? '+' : ''}{data.changePct}%
            </span>
        </div>
    );

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-400" /> Current Ticker Focus
            </h3>
            
            <div className="glass-card p-5 rounded-xl border border-white/10 shadow-xl space-y-4">
                {/* Stat 1: Rank */}
                <StatMicroCard 
                    title="Current Rank" 
                    // Use optional chaining (?.) and nullish coalescing (||) for safety
                    value={tickerData?.searchRank || 'N/A'}
                    color={tickerData && (tickerData.searchRank || 4) <= 3 ? 'text-yellow-400' : 'text-indigo-400'}
                    icon={Hash}
                />
                
                {/* Stat 2: 30-Day Change */}
                <StatMicroCard 
                    title="30-Day Change" 
                    // Use optional chaining (?.) and nullish coalescing (||) for safety
                    value={`${(tickerData?.changePct || 0) > 0 ? '+' : ''}${tickerData?.changePct || 0}%`}
                    color={changeStyle}
                    icon={TrendingUp}
                />

                {/* Stat 3: Current Interest Bar */}
                <div className="pt-2">
                    <p className="text-sm font-medium text-neutral-text/80 mb-2">Interest Score (0-100)</p>
                    <div className="w-full h-3 rounded-full bg-gray-700 overflow-hidden shadow-inner">
                        <div 
                            className="h-full rounded-full bg-pink-500 transition-all duration-1000"
                            // Use optional chaining (?.) and nullish coalescing (||) for safety
                            style={{ width: `${tickerData?.currentInterest || 0}%` }}
                        ></div>
                    </div>
                    <p className="text-right text-xs text-neutral-text/60 mt-1">
                        Score: {tickerData?.currentInterest || 'N/A'}
                    </p>
                </div>
            </div>
            
            {/* Hottest/Coldest Movers Quick View */}
            <h3 className="text-xl font-bold text-white mt-8 mb-4">
                Market Pulse ⚡
            </h3>
            <div className="space-y-3">
                {hottestMover && <TickerListItem data={hottestMover} isHot={true} />}
                {coldestMover && <TickerListItem data={coldestMover} isHot={false} />}
                <p className="text-xs text-neutral-text/60 pt-2 border-t border-white/5">
                    Click to view the historical trend for these top movers.
                </p>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// --- COMPONENT: DetailedTrendsChart (FIXED CHART RESPONSIVENESS) ---
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
    
    // Find the detailed data for the current ticker being viewed
    const currentTickerData = useMemo(() => summaryData.find(d => d.ticker === ticker), [summaryData, ticker]);

    // Derive Hottest/Coldest movers from the full summary list for the sidebar
    const hottestMover = summaryData[0]; 
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
                className="text-pink-400 hover:text-white transition-colors flex items-center mb-4 text-sm font-medium"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Summary
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                
                {/* LEFT COLUMN: CHART AREA */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <h2 className="text-2xl font-bold text-white mb-3 sm:mb-0">
                            {ticker} Search Interest ({timeframe}) 📈
                        </h2>
                        <div className="flex space-x-2 bg-input p-1 rounded-xl shadow-inner">
                            {TIME_FRAMES.map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-all duration-200 
                                        ${timeframe === tf 
                                            ? 'bg-pink-500 text-white shadow-lg' 
                                            : 'text-neutral-text hover:text-pink-300'
                                        }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-40 text-neutral-text/70 h-full bg-card rounded-xl border border-white/10">
                            <div className="w-6 h-6 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            Loading {timeframe} search history for {ticker}...
                        </div>
                    ) : (
                        <div className="bg-card p-4 rounded-xl border border-white/10 shadow-xl">
                            {/* IMPORTANT FIX: The fixed width/height on LineChart is removed. 
                                We now use ResponsiveContainer which fills the parent div's size (100% width, 400px height).
                                This prevents the X-Axis labels from flowing outside the box on small screens.
                            */}
                            <div style={{ width: '100%', height: '400px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart 
                                        data={history} 
                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#FFFFFF" 
                                            interval="preserveStartEnd"
                                            tickFormatter={tickFormatter}
                                            style={{ fontSize: '12px' }}
                                        />
                                        <YAxis 
                                            stroke="#FFFFFF" 
                                            domain={[0, 100]} 
                                            label={{ value: 'Interest (0-100)', angle: -90, position: 'insideLeft', fill: '#FFFFFF' }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #e11d48', color: '#FFFFFF', borderRadius: '8px' }}
                                            labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                                            formatter={(value) => [`Interest: ${value}`, '']}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="interest" 
                                            stroke="#ec4899" 
                                            strokeWidth={3} 
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* RIGHT COLUMN: INSIGHTS SIDEBAR (Unchanged) */}
                <div className="hidden lg:block">
                    <ChartSidebarInsights 
                        tickerData={currentTickerData} 
                        hottestMover={hottestMover}
                        coldestMover={coldestMover}
                        onSelectTicker={onSelectTicker}
                    />
                </div>
            </div>
            
            {/* Mobile/Tablet view for sidebar info (Unchanged) */}
            <div className="lg:hidden pt-4">
                 <ChartSidebarInsights 
                        tickerData={currentTickerData} 
                        hottestMover={hottestMover}
                        coldestMover={coldestMover}
                        onSelectTicker={onSelectTicker}
                    />
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// --- MAIN COMPONENT: GoogleTrendsPage (Unchanged) ---
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

  // Function to handle ticker selection in both table and sidebar
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


  // Derive Overview Statistics
  const hottestMover = allSortedItems[0]; 
  const coldestMover = useMemo(() => {
    if (allSortedItems.length === 0) return undefined;
    return [...allSortedItems].sort((a, b) => a.changePct - b.changePct)[0];
  }, [allSortedItems]);


  // Determine the display title
  const tableTitle = searchTerm 
      ? `🔍 Search Results for "${searchTerm}"`
      : `🔥 Top 10 Hottest Search Movers (Out of ${TRACKED_TICKERS.length})`;


  // RENDER CHART VIEW IF A Ticker is selected
  if (selectedTicker) {
    return (
        <div className="min-h-screen bg-gray-900 flex">
            <div className="flex-shrink-0">
                <DashboardSidebar activeSection="trends" onSectionChange={() => {}} onNavigate={onNavigate} />
            </div>
            <div className="flex-1 flex flex-col p-6 min-w-0">
                <div className="glass-card p-6 min-h-full">
                    <DetailedTrendsChart 
                        ticker={selectedTicker} 
                        onBack={() => setSelectedTicker(null)}
                        summaryData={allSortedItems} // Pass full data for sidebar context
                        onSelectTicker={handleSelectTicker} // Pass handler for sidebar clicks
                    />
                </div>
            </div>
        </div>
    );
  }

  // RENDER SUMMARY TABLE VIEW
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 flex"> 
      {/* Sidebar (Unchanged) */}
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="trends"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header (Styling updated) */}
        <div className="glass-card border-b border-white/10 p-6 shadow-2xl">
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <h1 className="text-4xl text-white font-extrabold tracking-tight drop-shadow-md">
                  📈 Google Trends Spike Watch 🚀
                </h1>
              </div>
              <p className="text-neutral-text/80 max-w-2xl mx-auto">
                Discover the stocks with the biggest shifts in public search interest over the last 30 days.
              </p>
            </div>
            
            <div className="flex gap-4 max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
                <Input
                  placeholder={`Search all ${TRACKED_TICKERS.length} stocks by ticker...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700/50 border-pink-500/50 text-white placeholder:text-neutral-text/60 focus:border-pink-400 shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          {/* OVERVIEW STAT CARDS */}
          {isLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-card p-5 rounded-xl h-24 animate-pulse bg-white/5"></div>
                <div className="glass-card p-5 rounded-xl h-24 animate-pulse bg-white/5"></div>
                <div className="glass-card p-5 rounded-xl h-24 animate-pulse bg-white/5"></div>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                {/* Card 1: Total Stocks Tracked */}
                <OverviewStatCard
                    title="Monitored Universe"
                    value={TRACKED_TICKERS.length}
                    icon={Hash}
                    color="text-indigo-400"
                    description="Total monitored tickers"
                    emoji="🌐"
                />

                {/* Card 2: Hottest Mover (Highest Positive Change) */}
                <OverviewStatCard
                    title="Hottest Mover (30D)"
                    value={hottestMover ? hottestMover.ticker : 'N/A'}
                    icon={Flame}
                    color="text-green-400"
                    description={hottestMover ? `+${hottestMover.changePct}% search surge` : 'No data'}
                    onClick={() => hottestMover && handleSelectTicker(hottestMover.ticker)}
                    isClickable={!!hottestMover}
                    emoji="🔥"
                />

                {/* Card 3: Coldest Mover (Lowest Negative Change) */}
                <OverviewStatCard
                    title="Coldest Mover (30D)"
                    value={coldestMover ? coldestMover.ticker : 'N/A'}
                    icon={Snowflake}
                    color="text-red-400"
                    description={coldestMover ? `${coldestMover.changePct}% search drop` : 'No data'}
                    onClick={() => coldestMover && handleSelectTicker(coldestMover.ticker)}
                    isClickable={!!coldestMover}
                    emoji="❄️"
                />
            </div>
          )}


          {/* TABLE (Styling updated) */}
          <div className="glass-card p-6 min-h-full shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              {tableTitle}
            </h2>

            {isLoading ? (
              <div className="text-center py-20 text-neutral-text/70">
                <div className="w-6 h-6 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Analyzing {TRACKED_TICKERS.length} stock trends...
              </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 text-neutral-text/70">
                    No matching trends found for "{searchTerm}".
                </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/10 sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-pink-300 uppercase tracking-wider">
                        Rank
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-pink-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                        onClick={() => requestSort('ticker')}
                      >
                        <div className="flex items-center">
                          Stock Ticker {getSortIcon('ticker', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-pink-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                        onClick={() => requestSort('currentInterest')}
                      >
                        <div className="flex items-center">
                          Interest (0-100) {getSortIcon('currentInterest', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-pink-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                        onClick={() => requestSort('changePct')}
                      >
                        <div className="flex items-center">
                          30-Day Change (%) {getSortIcon('changePct', sortConfig)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredItems.map((item, index) => {
                       const isHottest = index === 0 && !searchTerm; 
                       return (
                          <tr 
                            key={item.ticker} 
                            className="hover:bg-white/10 transition-colors duration-200 cursor-pointer group"
                            onClick={() => handleSelectTicker(item.ticker)} 
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-text">
                              {isHottest ? (
                                  <div className="relative inline-flex">
                                      {/* Pulsing ring for the absolute hottest */}
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <StatusChip rank={index + 1} />
                                  </div>
                              ) : (
                                  <StatusChip rank={index + 1} />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                              {item.ticker}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-text">
                              <div className="flex items-center space-x-2">
                                 <span>{item.currentInterest}</span>
                                 <div className="w-16 h-2 rounded-full bg-gray-700">
                                    <div 
                                      className="h-full rounded-full bg-pink-500 transition-all duration-700"
                                      style={{ width: `${item.currentInterest}%` }}
                                    ></div>
                                 </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                              <span className={`${getChangeStyle(item.changePct)} flex items-center`}>
                                {item.changePct > 0 ? (
                                    <>
                                        <ArrowUp className="w-4 h-4 mr-1 animate-pulse" />
                                        +{item.changePct}%
                                    </>
                                ) : (
                                    <>
                                        <ArrowDown className="w-4 h-4 mr-1" />
                                        {item.changePct}%
                                    </>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
