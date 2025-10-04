import React, { useState } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { TrendsChart } from '../components/trends/TrendsChart';
import { TrendsTable } from '../components/trends/TrendsTable';
import { Search, TrendingUp } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface GoogleTrendsPageProps {
  onNavigate?: (page: string) => void;
}

interface TrendData {
  date: string;
  interest: number;
}

export function GoogleTrendsPage({ onNavigate }: GoogleTrendsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [showAutoComplete, setShowAutoComplete] = useState(false);

  // Mock NSE/BSE ticker suggestions
  const mockTickers = [
    'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'SBIN', 'BHARTIARTL',
    'ITC', 'HDFCBANK', 'LT', 'ASIANPAINT', 'MARUTI', 'NESTLEIND', 'KOTAKBANK',
    'WIPRO', 'ONGC', 'NTPC', 'POWERGRID', 'ULTRACEMCO', 'AXISBANK',
    'HCLTECH', 'SUNPHARMA', 'TATAMOTORS', 'BAJFINANCE', 'DRREDDY'
  ];

  const filteredTickers = searchQuery 
    ? mockTickers.filter(ticker => 
        ticker.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const generateMockTrendsData = (ticker: string): TrendData[] => {
    const data: TrendData[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5); // 5 years of data

    for (let i = 0; i < 60; i++) { // 60 data points over 5 years
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      // Generate realistic trending data with some seasonality
      const baseInterest = 30 + Math.random() * 40;
      const seasonality = Math.sin((i / 12) * 2 * Math.PI) * 10;
      const randomNoise = (Math.random() - 0.5) * 20;
      const interest = Math.max(0, Math.min(100, Math.round(baseInterest + seasonality + randomNoise)));

      data.push({
        date: date.toISOString().split('T')[0],
        interest
      });
    }

    return data;
  };

  const handleFetchTrends = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a stock ticker');
      return;
    }

    const ticker = searchQuery.toUpperCase();
    setSelectedTicker(ticker);
    setIsLoading(true);
    setShowAutoComplete(false);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock data
      const mockData = generateMockTrendsData(ticker);
      setTrendsData(mockData);
      
      toast.success(`Google Trends data fetched for ${ticker}`);
    } catch (error) {
      toast.error("Couldn't fetch trends – check API key or try again");
      setTrendsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTickerSelect = (ticker: string) => {
    setSearchQuery(ticker);
    setShowAutoComplete(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetchTrends();
    }
  };

  return (
    <div className="min-h-screen brand-gradient flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="trends"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="glass-card border-b border-white/10 p-6">
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Search className="w-8 h-8 text-accent-teal" />
                <h1 className="text-3xl text-white font-semibold">
                  📊 Google Trends Analysis
                </h1>
              </div>
              <p className="text-neutral-text/80 max-w-2xl mx-auto">
                Discover how search interest aligns with market sentiment
              </p>
            </div>
            
            {/* Search Section */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
                <Input
                  placeholder="Enter stock ticker (e.g., RELIANCE, HDFCBANK)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowAutoComplete(true);
                  }}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setShowAutoComplete(true)}
                  onBlur={() => setTimeout(() => setShowAutoComplete(false), 200)}
                  className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                />
                
                {/* Auto-complete dropdown */}
                {showAutoComplete && filteredTickers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-white/20 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredTickers.map((ticker) => (
                      <button
                        key={ticker}
                        onClick={() => handleTickerSelect(ticker)}
                        className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors"
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleFetchTrends}
                disabled={isLoading || !searchQuery.trim()}
                className="bg-accent-teal hover:bg-accent-teal/90 text-white min-w-32"
                style={{ backgroundColor: 'var(--accent-teal)' }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Fetching...
                  </>
                ) : (
                  'Fetch Trends'
                )}
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart Section - Left (65%) */}
            <div className="lg:col-span-2">
              <TrendsChart 
                ticker={selectedTicker || 'N/A'}
                data={trendsData}
                isLoading={isLoading}
              />
            </div>
            
            {/* Insights Panel - Right (35%) */}
            <div className="lg:col-span-1">
              <TrendsTable 
                ticker={selectedTicker || 'N/A'}
                data={trendsData}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}