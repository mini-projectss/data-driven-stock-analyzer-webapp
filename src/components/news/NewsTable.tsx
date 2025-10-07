import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ExternalLink } from 'lucide-react';

interface NewsItem {
  ticker: string;
  text: string;  // Backend uses 'text' for headline/title
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  source: string;
  url: string;
  // backend currently does not provide publishedAt, so optional or fixed string
  publishedAt?: string;
}

interface NewsTableProps {
  newsItems: NewsItem[];
  isLoading?: boolean;
}

export function NewsTable({ newsItems, isLoading }: NewsTableProps) {
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

  if (newsItems.length === 0) {
    return (
      <Card className="glass-card p-6">
        <div className="text-center py-8">
          <p className="text-neutral-text/80">
            No news articles available.
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
          {newsItems.length} articles
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
            {newsItems.map((item, index) => (
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
                    <span className="text-white truncate">{item.text}</span>
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
                  {item.publishedAt || 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
