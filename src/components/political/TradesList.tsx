import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ExternalLink, Calendar, TrendingUp, TrendingDown, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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

interface TradesListProps {
  trades: PoliticalTrade[];
  onStockClick?: (symbol: string) => void;
}

export function TradesList({ trades, onStockClick }: TradesListProps) {
  const formatCurrency = (value: number) => {
    if (value >= 10000000) { // 1 Crore
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) { // 1 Lakh
      return `₹${(value / 100000).toFixed(2)}L`;
    } else {
      return `₹${value.toLocaleString()}`;
    }
  };

  const formatQuantity = (quantity: number) => {
    if (quantity >= 100000) {
      return `${(quantity / 100000).toFixed(1)}L`;
    } else if (quantity >= 1000) {
      return `${(quantity / 1000).toFixed(1)}K`;
    } else {
      return quantity.toLocaleString();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCategoryColor = (category: string) => {
    return category === 'Politician' ? '#9C27B0' : '#FF9800';
  };

  const handleStockClick = (symbol: string, stockName: string) => {
    if (onStockClick) {
      onStockClick(symbol);
    } else {
      toast.info(`Opening chart for ${stockName} (${symbol})`);
    }
  };

  if (trades.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full text-neutral-text">
            <circle cx="30" cy="70" r="8" fill="currentColor" opacity="0.3" />
            <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.5" />
            <circle cx="70" cy="60" r="8" fill="currentColor" opacity="0.7" />
            <path d="M25 75 L45 55 L65 65" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
          </svg>
        </div>
        <h3 className="text-xl text-white font-semibold mb-2">No trades found</h3>
        <p className="text-neutral-text/80 mb-4">
          No political or promoter trades match your current filters
        </p>
        <p className="text-neutral-text/60 text-sm">
          Try adjusting your date range, exchange, or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {trades.map((trade) => {
        const isPositiveAction = trade.action === 'BUY';
        const actionColor = isPositiveAction ? 'var(--success-green)' : 'var(--error-red)';
        const ActionIcon = isPositiveAction ? TrendingUp : TrendingDown;

        return (
          <Card 
            key={trade.id}
            className="glass-card p-6 hover:scale-105 hover:shadow-lg transition-all duration-300 group cursor-pointer"
            style={{
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Header with Avatar and Person Info */}
            <div className="flex items-start mb-4 min-w-0">
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12 border-2 border-white/20">
                  <AvatarFallback
                    className="text-white font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${getCategoryColor(trade.category)}, #302b63)`
                    }}
                  >
                    {getInitials(trade.personName)}
                  </AvatarFallback>
                </Avatar>
                
                {/* --- MODIFICATION START --- */}
                <div className="flex-1 min-w-0">
                  {/* Name is separate, allows it to wrap */}
                  <h3 className="text-white font-semibold" title={trade.personName}>
                    {trade.personName}
                  </h3>
                  
                  {/* Badges container: uses flex-wrap and gap-2
                      - mt-2 creates gap between name and badges
                      - gap-2 creates horizontal and vertical gap between badges
                  */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: getCategoryColor(trade.category),
                        color: getCategoryColor(trade.category)
                      }}
                    >
                      {trade.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="font-semibold text-xs"
                      style={{
                        borderColor: actionColor,
                        color: actionColor,
                        backgroundColor: `${actionColor}15`
                      }}
                    >
                      <ActionIcon className="w-3 h-3 mr-1" />
                      {trade.action}
                    </Badge>
                  </div>
                </div>
                {/* --- MODIFICATION END --- */}

              </div>
            </div>

            {/* Stock Information */}
            <div className="space-y-3 mb-4">
              <div 
                className="cursor-pointer group/stock"
                onClick={() => handleStockClick(trade.stockSymbol, trade.stockName)}
              >
                <div className="flex items-center space-x-2 group-hover/stock:text-accent-teal transition-colors">
                  <h4 className="text-white font-semibold group-hover/stock:text-accent-teal">
                    {trade.stockSymbol}
                  </h4>
                  <ExternalLink className="w-4 h-4 opacity-60" />
                </div>
                <p className="text-neutral-text/80 text-sm truncate" title={trade.stockName}>
                  {trade.stockName}
                </p>
                <p className="text-neutral-text/60 text-xs">
                  {trade.exchange} • ₹{trade.pricePerShare.toFixed(2)} per share
                </p>
              </div>

              {/* Transaction Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-text/80 text-sm">Quantity:</span>
                  <span className="text-white font-medium">{formatQuantity(trade.quantity)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-text/80 text-sm">Total Value:</span>
                  <span 
                    className="font-semibold"
                    style={{ color: actionColor }}
                  >
                    {formatCurrency(trade.value)}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Date */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center space-x-2 text-neutral-text/60">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {new Date(trade.transactionDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              
              {trade.portfolioImpact && (
                <Badge variant="outline" className="text-xs border-white/20 text-neutral-text/60">
                  {trade.portfolioImpact}
                </Badge>
              )}
            </div>

            {/* Hover Glow Effect */}
            <div 
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${actionColor}15, transparent)`,
                border: `1px solid ${actionColor}30`,
              }}
            />
          </Card>
        );
      })}
    </div>
  );
}