import React, { useState } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { PredictionChart } from '../components/prediction/PredictionChart';
import { PredictionDataTable } from '../components/prediction/PredictionDataTable';
import { MarketScreener } from '../components/prediction/MarketScreener';
import { Search, TrendingUp } from 'lucide-react';

interface PredictionEnginePageProps {
  onNavigate?: (page: string) => void;
}

export function PredictionEnginePage({ onNavigate }: PredictionEnginePageProps) {
  const [selectedStock, setSelectedStock] = useState('RELIANCE');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('days');
  const [exchange, setExchange] = useState('nse');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleAnalyze = () => {
    if (!searchQuery.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setSelectedStock(searchQuery.toUpperCase());
    
    // Simulate analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const getProgressText = () => {
    if (analysisProgress < 30) return 'Fetching historical data...';
    if (analysisProgress < 60) return 'Running Prophet model...';
    if (analysisProgress < 90) return 'Running LightGBM model...';
    return 'Analysis completed!';
  };

  return (
    <div className="min-h-screen brand-gradient flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="prediction"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="glass-card border-b border-white/10 p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-accent-teal" />
              <h1 className="text-2xl text-white font-semibold">
                Prediction & Analysis Platform
              </h1>
            </div>
            
            {/* Search and Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
                <Input
                  placeholder="Enter ticker (e.g., RELIANCE, TCS)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                />
              </div>

              <Select value={exchange} onValueChange={setExchange}>
                <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/20">
                  <SelectItem value="nse">NSE</SelectItem>
                  <SelectItem value="bse">BSE</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32 bg-input border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/20">
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !searchQuery.trim()}
                className="bg-accent-teal hover:bg-accent-teal/90 text-white"
                style={{ backgroundColor: 'var(--accent-teal)' }}
              >
                Analyze Symbol
              </Button>
            </div>

            {/* Progress Indicator */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-text">{getProgressText()}</span>
                  <span className="text-neutral-text">{analysisProgress}%</span>
                </div>
                <Progress 
                  value={analysisProgress} 
                  className="h-2"
                />
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="analyze" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/10 max-w-md">
              <TabsTrigger 
                value="analyze" 
                className="data-[state=active]:bg-accent-teal data-[state=active]:text-white"
              >
                Analyze
              </TabsTrigger>
              <TabsTrigger 
                value="screener" 
                className="data-[state=active]:bg-accent-teal data-[state=active]:text-white"
              >
                Market Screener
              </TabsTrigger>
              <TabsTrigger 
                value="watchlist" 
                className="data-[state=active]:bg-accent-teal data-[state=active]:text-white"
              >
                Watchlist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analyze" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2">
                  <PredictionChart 
                    selectedStock={selectedStock}
                    isAnalyzing={isAnalyzing}
                  />
                </div>
                
                {/* Data Table */}
                <div className="lg:col-span-2">
                  <PredictionDataTable selectedStock={selectedStock} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="screener">
              <MarketScreener />
            </TabsContent>

            <TabsContent value="watchlist">
              <div className="glass-card soft-shadow p-8 text-center">
                <h2 className="text-2xl text-white mb-4">Watchlist</h2>
                <p className="text-neutral-text/80">
                  Coming soon... Add stocks to your watchlist for continuous monitoring.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}