import React from 'react';
import { Card } from '../ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface TrendSummaryCardProps {
  totalBuys: number;
  totalSells: number;
  totalBuyValue: number;
  totalSellValue: number;
  netValue: number;
}

export function TrendSummaryCard({
  totalBuys,
  totalSells,
  totalBuyValue,
  totalSellValue,
  netValue
}: TrendSummaryCardProps) {
  const formatCurrency = (value: number) => {
    if (value >= 10000000) { // 1 Crore
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) { // 1 Lakh
      return `₹${(value / 100000).toFixed(1)}L`;
    } else {
      return `₹${value.toLocaleString()}`;
    }
  };

  const isNetPositive = netValue >= 0;

  return (
    <Card className="glass-card p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Buys */}
        <div className="flex items-center space-x-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(46, 125, 50, 0.2)' }}
          >
            <TrendingUp 
              className="w-6 h-6"
              style={{ color: 'var(--success-green)' }}
            />
          </div>
          <div>
            <p className="text-neutral-text/80 text-sm">Total Buys This Week</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl text-white font-semibold">{totalBuys}</p>
              <p 
                className="text-sm font-medium"
                style={{ color: 'var(--success-green)' }}
              >
                {formatCurrency(totalBuyValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Sells */}
        <div className="flex items-center space-x-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(198, 40, 40, 0.2)' }}
          >
            <TrendingDown 
              className="w-6 h-6"
              style={{ color: 'var(--error-red)' }}
            />
          </div>
          <div>
            <p className="text-neutral-text/80 text-sm">Total Sells This Week</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl text-white font-semibold">{totalSells}</p>
              <p 
                className="text-sm font-medium"
                style={{ color: 'var(--error-red)' }}
              >
                {formatCurrency(totalSellValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Net Value Change */}
        <div className="flex items-center space-x-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: isNetPositive ? 'rgba(46, 125, 50, 0.2)' : 'rgba(198, 40, 40, 0.2)' }}
          >
            {isNetPositive ? (
              <TrendingUp 
                className="w-6 h-6"
                style={{ color: 'var(--success-green)' }}
              />
            ) : (
              <TrendingDown 
                className="w-6 h-6"
                style={{ color: 'var(--error-red)' }}
              />
            )}
          </div>
          <div>
            <p className="text-neutral-text/80 text-sm">Net Value Change</p>
            <p 
              className="text-2xl font-semibold"
              style={{ color: isNetPositive ? 'var(--success-green)' : 'var(--error-red)' }}
            >
              {isNetPositive ? '+' : ''}{formatCurrency(Math.abs(netValue))}
            </p>
          </div>
        </div>

        {/* Activity Indicator */}
        <div className="flex items-center space-x-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(0, 194, 184, 0.2)' }}
          >
            <Activity 
              className="w-6 h-6"
              style={{ color: 'var(--accent-teal)' }}
            />
          </div>
          <div>
            <p className="text-neutral-text/80 text-sm">Total Transactions</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl text-white font-semibold">{totalBuys + totalSells}</p>
              <div className="flex space-x-1">
                <div 
                  className="w-12 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--success-green)' }}
                  title={`${totalBuys} Buys`}
                ></div>
                <div 
                  className="w-12 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--error-red)' }}
                  title={`${totalSells} Sells`}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}