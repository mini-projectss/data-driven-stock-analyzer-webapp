import React, { useState, useEffect } from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { NewsTable } from '../components/news/NewsTable';
import { Search, Newspaper } from 'lucide-react';

interface NewsFeedPageProps {
  onNavigate?: (page: string) => void;
}

export function NewsFeedPage({ onNavigate }: NewsFeedPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newsData, setNewsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/news/trending');
      if (!response.ok) throw new Error('Failed to fetch trending news');
      const json = await response.json();
      setNewsData(json.news || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setNewsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSearchNews = async (ticker: string) => {
    if (!ticker.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/news/search?ticker=${encodeURIComponent(ticker)}`);
      if (!response.ok) throw new Error('Failed to fetch search news');
      const json = await response.json();
      setNewsData(json.news || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setNewsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // On initial load, fetch trending news
  React.useEffect(() => {
    fetchTrendingNews();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchSearchNews(searchQuery.trim());
  };

  const handleTrendingNews = () => {
    setSearchQuery('');
    fetchTrendingNews();
  };

  return (
    <div className="min-h-screen brand-gradient flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="news"
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
                <Newspaper className="w-8 h-8 text-accent-teal" />
                <h1 className="text-3xl text-white font-semibold">
                   Market News & Sentiment Dashboard
                </h1>
              </div>
              <p className="text-neutral-text/80 max-w-2xl mx-auto">
                Real-time sentiment analysis from leading financial news sources using advanced NLP
              </p>
            </div>
            
            {/* Search Controls */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
                <Input
                  placeholder="Enter ticker (e.g. RELIANCE, TCS)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                />
              </form>

              <div className="flex space-x-2">
                <Button 
                  type="submit"
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  style={{ backgroundColor: '#2563eb' }}
                >
                   Search
                </Button>
                
                <Button 
                  onClick={handleTrendingNews}
                  disabled={isLoading}
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                >
                   Trending News
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-center mt-2">
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <NewsTable 
            newsItems={newsData}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}
