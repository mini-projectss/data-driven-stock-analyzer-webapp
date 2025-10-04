import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ExternalLink } from 'lucide-react';

interface NewsItem {
  ticker: string;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  source: string;
  url: string;
  publishedAt: string;
}

interface NewsTableProps {
  searchTicker?: string;
  isLoading?: boolean;
}

export function NewsTable({ searchTicker, isLoading }: NewsTableProps) {
  const mockNewsData: NewsItem[] = [
    {
      ticker: 'RELIANCE',
      headline: 'Reliance Industries reports strong Q3 earnings, beats estimates',
      sentiment: 'positive',
      score: 0.85,
      source: 'Economic Times',
      url: '#',
      publishedAt: '2 hours ago'
    },
    {
      ticker: 'TCS',
      headline: 'TCS announces major cloud infrastructure deal with Fortune 500 company',
      sentiment: 'positive',
      score: 0.72,
      source: 'Business Standard',
      url: '#',
      publishedAt: '4 hours ago'
    },
    {
      ticker: 'INFY',
      headline: 'Infosys faces headwinds in key European markets amid economic uncertainty',
      sentiment: 'negative',
      score: -0.68,
      source: 'Reuters',
      url: '#',
      publishedAt: '6 hours ago'
    },
    {
      ticker: 'HDFC',
      headline: 'HDFC Bank maintains stable outlook despite sector challenges',
      sentiment: 'neutral',
      score: 0.12,
      source: 'Mint',
      url: '#',
      publishedAt: '8 hours ago'
    },
    {
      ticker: 'ICICIBANK',
      headline: 'ICICI Bank digital transformation drives customer growth',
      sentiment: 'positive',
      score: 0.59,
      source: 'Financial Express',
      url: '#',
      publishedAt: '10 hours ago'
    },
    {
      ticker: 'NIFTY',
      headline: 'Nifty 50 reaches new milestone as institutional buying surges',
      sentiment: 'positive',
      score: 0.91,
      source: 'MoneyControl',
      url: '#',
      publishedAt: '12 hours ago'
    },
    {
      ticker: 'RELIANCE',
      headline: 'Reliance Jio expansion into international markets shows promise',
      sentiment: 'positive',
      score: 0.76,
      source: 'CNBC TV18',
      url: '#',
      publishedAt: '1 day ago'
    },
    {
      ticker: 'TCS',
      headline: 'TCS quarterly revenue growth slows down amid global economic concerns',
      sentiment: 'negative',
      score: -0.45,
      source: 'Bloomberg',
      url: '#',
      publishedAt: '1 day ago'
    }
  ];

  const filteredNews = searchTicker 
    ? mockNewsData.filter(item => 
        item.ticker.toLowerCase().includes(searchTicker.toLowerCase())
      )
    : mockNewsData;

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'var(--success-green)';
      case 'negative': return 'var(--error-red)';
      default: return '#FF9800';
    }
  };

  const getSentimentBadge = (sentiment: string, score: number) => {
    const color = getSentimentColor(sentiment);
    return (
      <Badge 
        variant="outline" 
        className="text-xs capitalize"
        style={{ borderColor: color, color: color }}
      >
        {sentiment} ({score > 0 ? '+' : ''}{score.toFixed(2)})
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="glass-card p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">⏳ Fetching news...</p>
          <p className="text-neutral-text/80 text-sm mt-2">
            Analyzing sentiment from multiple sources
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-white font-semibold">
          Market News & Sentiment
        </h3>
        <Badge variant="outline" className="border-accent-teal/30 text-accent-teal">
          {filteredNews.length} articles
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-neutral-text">Ticker</TableHead>
              <TableHead className="text-neutral-text">Headline</TableHead>
              <TableHead className="text-neutral-text">Sentiment</TableHead>
              <TableHead className="text-neutral-text">Score</TableHead>
              <TableHead className="text-neutral-text">Source</TableHead>
              <TableHead className="text-neutral-text">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNews.map((item, index) => (
              <TableRow 
                key={index} 
                className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => window.open(item.url, '_blank')}
              >
                <TableCell>
                  <Badge variant="outline" className="border-white/20 text-neutral-text font-semibold">
                    {item.ticker}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="flex items-center space-x-2">
                    <span className="text-white truncate">{item.headline}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-text/60 flex-shrink-0" />
                  </div>
                </TableCell>
                <TableCell>
                  {getSentimentBadge(item.sentiment, item.score)}
                </TableCell>
                <TableCell>
                  <div 
                    className="text-sm font-medium flex items-center"
                    style={{ color: getSentimentColor(item.sentiment) }}
                  >
                    <div 
                      className="w-12 h-2 bg-white/20 rounded-full overflow-hidden mr-2"
                    >
                      <div 
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.abs(item.score) * 100}%`,
                          backgroundColor: getSentimentColor(item.sentiment)
                        }}
                      />
                    </div>
                    {Math.abs(item.score).toFixed(2)}
                  </div>
                </TableCell>
                <TableCell className="text-neutral-text text-sm">
                  {item.source}
                </TableCell>
                <TableCell className="text-neutral-text/60 text-sm">
                  {item.publishedAt}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-8">
          <p className="text-neutral-text/80">
            No news found for "{searchTicker}"
          </p>
        </div>
      )}
    </Card>
  );
}