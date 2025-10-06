import React, { useState, useMemo } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { FiltersBar } from '../components/political/FiltersBar';
import { TrendSummaryCard } from '../components/political/TrendSummaryCard';
import { TradesList } from '../components/political/TradesList';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PoliticalTradingPageProps {
  onNavigate?: (page: string) => void;
}

interface PoliticalTrade {
  id: string;
  personName: string;
  category: 'Politician' | 'Promoter';
  action: 'BUY' | 'SELL';
  stockSymbol: string;
  stockName: string;
  quantity: number;
  value: number;
  pricePerShare: number;
  transactionDate: string;
  exchange: 'NSE' | 'BSE';
  portfolioImpact?: string;
}

export function PoliticalTradingPage({ onNavigate }: PoliticalTradingPageProps) {
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [category, setCategory] = useState<'All' | 'Politician' | 'Promoter'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for political trades
  const mockTrades: PoliticalTrade[] = [
    {
      id: '1',
      personName: 'Ravi Shankar Prasad',
      category: 'Politician',
      action: 'BUY',
      stockSymbol: 'RELIANCE.NS',
      stockName: 'Reliance Industries Limited',
      quantity: 5000,
      value: 14753750,
      pricePerShare: 2950.75,
      transactionDate: '2024-01-15',
      exchange: 'NSE',
      portfolioImpact: 'Major'
    },
    {
      id: '2',
      personName: 'Mukesh Ambani',
      category: 'Promoter',
      action: 'SELL',
      stockSymbol: 'TCS.NS',
      stockName: 'Tata Consultancy Services Limited',
      quantity: 2500,
      value: 10313250,
      pricePerShare: 4125.30,
      transactionDate: '2024-01-14',
      exchange: 'NSE',
      portfolioImpact: 'Moderate'
    },
    {
      id: '3',
      personName: 'Nirmala Sitharaman',
      category: 'Politician',
      action: 'BUY',
      stockSymbol: 'INFY.NS',
      stockName: 'Infosys Limited',
      quantity: 8000,
      value: 13937600,
      pricePerShare: 1742.20,
      transactionDate: '2024-01-13',
      exchange: 'NSE',
      portfolioImpact: 'Major'
    },
    {
      id: '4',
      personName: 'Gautam Adani',
      category: 'Promoter',
      action: 'BUY',
      stockSymbol: 'ADANIPORTS.NS',
      stockName: 'Adani Ports and Special Economic Zone Limited',
      quantity: 15000,
      value: 11250000,
      pricePerShare: 750.00,
      transactionDate: '2024-01-12',
      exchange: 'NSE',
      portfolioImpact: 'Major'
    },
    {
      id: '5',
      personName: 'Piyush Goyal',
      category: 'Politician',
      action: 'SELL',
      stockSymbol: 'ICICIBANK.NS',
      stockName: 'ICICI Bank Limited',
      quantity: 3000,
      value: 3374250,
      pricePerShare: 1124.75,
      transactionDate: '2024-01-11',
      exchange: 'NSE',
      portfolioImpact: 'Minor'
    },
    {
      id: '6',
      personName: 'Ajay Piramal',
      category: 'Promoter',
      action: 'BUY',
      stockSymbol: 'PIRAMAL.NS',
      stockName: 'Piramal Enterprises Limited',
      quantity: 12000,
      value: 9600000,
      pricePerShare: 800.00,
      transactionDate: '2024-01-10',
      exchange: 'NSE',
      portfolioImpact: 'Major'
    },
    {
      id: '7',
      personName: 'Smriti Irani',
      category: 'Politician',
      action: 'BUY',
      stockSymbol: 'HDFCBANK.NS',
      stockName: 'HDFC Bank Limited',
      quantity: 4000,
      value: 6743600,
      pricePerShare: 1685.90,
      transactionDate: '2024-01-09',
      exchange: 'NSE',
      portfolioImpact: 'Moderate'
    },
    {
      id: '8',
      personName: 'Rahul Bajaj',
      category: 'Promoter',
      action: 'SELL',
      stockSymbol: 'BAJFINANCE.NS',
      stockName: 'Bajaj Finance Limited',
      quantity: 1500,
      value: 9750000,
      pricePerShare: 6500.00,
      transactionDate: '2024-01-08',
      exchange: 'NSE',
      portfolioImpact: 'Major'
    }
  ];

  // Filter trades based on current filters
  const filteredTrades = useMemo(() => {
    return mockTrades.filter(trade => {
      // Exchange filter
      if (trade.exchange !== exchange) return false;

      // Category filter
      if (category !== 'All' && trade.category !== category) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesPersonName = trade.personName.toLowerCase().includes(query);
        const matchesStockSymbol = trade.stockSymbol.toLowerCase().includes(query);
        const matchesStockName = trade.stockName.toLowerCase().includes(query);
        if (!matchesPersonName && !matchesStockSymbol && !matchesStockName) return false;
      }

      // Date filter
      if (startDate || endDate) {
        const tradeDate = new Date(trade.transactionDate);
        if (startDate && tradeDate < startDate) return false;
        if (endDate && tradeDate > endDate) return false;
      }

      return true;
    });
  }, [mockTrades, exchange, category, searchQuery, startDate, endDate]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyTrades = filteredTrades.filter(trade => 
      new Date(trade.transactionDate) >= oneWeekAgo
    );

    const buys = weeklyTrades.filter(trade => trade.action === 'BUY');
    const sells = weeklyTrades.filter(trade => trade.action === 'SELL');

    const totalBuyValue = buys.reduce((sum, trade) => sum + trade.value, 0);
    const totalSellValue = sells.reduce((sum, trade) => sum + trade.value, 0);
    const netValue = totalBuyValue - totalSellValue;

    return {
      totalBuys: buys.length,
      totalSells: sells.length,
      totalBuyValue,
      totalSellValue,
      netValue
    };
  }, [filteredTrades]);

  const handleStockClick = (symbol: string) => {
    toast.info(`Opening detailed chart for ${symbol}`);
    // In a real app, this would open the stock chart in MainChart component
  };

  const handleDateRangeChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  return (
    <div className="min-h-screen brand-gradient flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="political"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="glass-card border-b border-white/10 p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-accent-teal" />
            <div>
              <h1 className="text-2xl text-white font-semibold">
                Political Trading
              </h1>
              <p className="text-neutral-text/80">
                Track politician and promoter stock transactions across Indian markets
              </p>
            </div>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Filters Bar */}
            <FiltersBar
              exchange={exchange}
              startDate={startDate}
              endDate={endDate}
              category={category}
              searchQuery={searchQuery}
              onExchangeChange={setExchange}
              onDateRangeChange={handleDateRangeChange}
              onCategoryChange={setCategory}
              onSearchChange={setSearchQuery}
            />

            {/* Trend Summary Card */}
            <TrendSummaryCard {...summaryStats} />

            {/* Trades List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl text-white font-semibold">
                  Recent Transactions ({filteredTrades.length})
                </h2>
                {searchQuery && (
                  <p className="text-neutral-text/60 text-sm">
                    Showing results for "{searchQuery}"
                  </p>
                )}
              </div>
              
              <TradesList 
                trades={filteredTrades}
                onStockClick={handleStockClick}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}