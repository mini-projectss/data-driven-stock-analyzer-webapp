import React, { useState, useEffect, useMemo } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar'; 
import { Input } from '../components/ui/input'; 
import { Search, TrendingUp, ArrowDown, ArrowUp, ArrowLeft, Flame, Snowflake, Hash, Zap, Sun } from 'lucide-react';
import { toast } from 'sonner'; 
import { TRACKED_TICKERS } from '../utils/tickerLoader'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; 

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
  if (sortConfig.key !== key) return null;
  return sortConfig.direction === 'ascending' ? (
    <ArrowUp className="w-3 h-3 ml-1" />
  ) : (
    <ArrowDown className="w-3 h-3 ml-1" />
  );
};

const getChangeStyle = (changePct: number) => {
  if (changePct > 0) return 'text-teal-400';
  if (changePct < 0) return 'text-red-400';
  return 'text-gray-400';
};

// -----------------------------------------------------------------------------
// --- COMPONENT: StatusChip ---
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
// --- COMPONENT: OverviewStatCard ---
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
    ? 'hover:bg-indigo-900/50 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300'
    : '';
    
  return (
    <div 
      className={`bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 ${clickableClasses}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300 flex items-center">
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
          <span className="text-xs text-gray-400 mt-1 truncate">
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- COMPONENT: Chart Sidebar Insights ---
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
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center">
        <Icon className={`w-4 h-4 mr-2 ${color}`} />
        <span className="text-sm font-medium text-gray-300">{title}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );

  const TickerListItem: React.FC<{ data: TrendSummary, isTop: boolean }> = ({ data, isTop }) => (
    <div 
      className="flex justify-between items-center p-3 rounded-lg border border-gray-700/50 hover:bg-indigo-900/50 transition-all duration-200 cursor-pointer"
      onClick={() => onSelectTicker(data.ticker)}
    >
      <div className="flex items-center">
        <span className={`mr-2 ${isTop ? 'text-teal-400' : 'text-red-400'}`}>
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
      
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 space-y-4">
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
          <p className="text-sm font-medium text-gray-300 mb-2">Interest Score (0-100)</p>
          <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
            <div 
              className="h-full rounded-full bg-teal-500 transition-all duration-1000"
              style={{ width: `${tickerData?.currentInterest || 0}%` }}
            ></div>
          </div>
          <p className="text-right text-xs text-gray-400 mt-1">
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
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-700/50">
          Click to view historical trends for these tickers.
        </p>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- COMPONENT: DetailedTrendsChart ---
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
        className="text-indigo-300 hover:text-white transition-colors flex items-center text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h2 className="text-xl font-semibold text-white mb-3 sm:mb-0">
              {ticker} Search Interest ({timeframe}) 📈
            </h2>
            <div className="flex space-x-2 bg-gray-800/50 p-1 rounded-lg">
              {TIME_FRAMES.map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 
                    ${timeframe === tf 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-gray-300 hover:text-indigo-300'
                    }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-40 text-gray-400 h-full bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading {timeframe} search history for {ticker}...
            </div>
          ) : (
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={history} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF" 
                      interval="preserveStartEnd"
                      tickFormatter={tickFormatter}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      domain={[0, 100]} 
                      label={{ value: 'Interest (0-100)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4f46e5', color: '#FFFFFF', borderRadius: '8px' }}
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                      formatter={(value) => [`Interest: ${value}`, '']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="interest" 
                      stroke="#4f46e5" 
                      strokeWidth={2} 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
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
// --- MAIN COMPONENT: GoogleTrendsPage ---
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
      <div className="min-h-screen bg-gray-900 flex">
        <div className="flex-shrink-0">
          <DashboardSidebar activeSection="trends" onSectionChange={() => {}} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 flex flex-col p-6 min-w-0">
          <div className="bg-gray-800/50 p-6 rounded-lg">
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 flex"> 
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="trends"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-800/50 border-b border-gray-700/50 p-6">
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <h1 className="text-3xl text-white font-semibold tracking-tight">
                  📈 Search Trends Monitor
                </h1>
              </div>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm">
                Track significant shifts in public search interest for stocks over the past 30 days.
              </p>
            </div>
            
            <div className="flex gap-4 max-w-xl mx-auto">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                <Input
                  placeholder={`Search all ${TRACKED_TICKERS.length} stocks by ticker...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700/30 border-gray-600 text-white placeholder:text-gray-400 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800/50 p-4 rounded-lg h-24 animate-pulse"></div>
              <div className="bg-gray-800/50 p-4 rounded-lg h-24 animate-pulse"></div>
              <div className="bg-gray-800/50 p-4 rounded-lg h-24 animate-pulse"></div>
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
                color="text-teal-400"
                description={topMover ? `+${topMover.changePct}% search surge` : 'No data'}
                onClick={() => topMover && handleSelectTicker(topMover.ticker)}
                isClickable={!!topMover}
                emoji="🔥"
              />
              <OverviewStatCard
                title="Lowest Mover (30D)"
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

          <div className="bg-gray-800/50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">
              {tableTitle}
            </h2>

            {isLoading ? (
              <div className="text-center py-20 text-gray-400">
                <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Analyzing {TRACKED_TICKERS.length} stock trends...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                No matching trends found for "{searchTerm}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700/50">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">
                        Rank
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                        onClick={() => requestSort('ticker')}
                      >
                        <div className="flex items-center">
                          Stock Ticker {getSortIcon('ticker', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                        onClick={() => requestSort('currentInterest')}
                      >
                        <div className="flex items-center">
                          Interest (0-100) {getSortIcon('currentInterest', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                        onClick={() => requestSort('changePct')}
                      >
                        <div className="flex items-center">
                          30-Day Change (%) {getSortIcon('changePct', sortConfig)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredItems.map((item, index) => {
                      const isTop = index === 0 && !searchTerm;
                      return (
                        <tr 
                          key={item.ticker} 
                          className="hover:bg-indigo-900/50 transition-colors duration-200 cursor-pointer"
                          onClick={() => handleSelectTicker(item.ticker)} 
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
                            {isTop ? (
                              <div className="relative inline-flex">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <StatusChip rank={index + 1} />
                              </div>
                            ) : (
                              <StatusChip rank={index + 1} />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                            {item.ticker}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <div className="flex items-center space-x-2">
                              <span>{item.currentInterest}</span>
                              <div className="w-16 h-2 rounded-full bg-gray-700">
                                <div 
                                  className="h-full rounded-full bg-teal-500 transition-all duration-700"
                                  style={{ width: `${item.currentInterest}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
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