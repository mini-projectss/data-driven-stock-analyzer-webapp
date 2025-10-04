import React from 'react';
import { Card } from '../ui/card';
import { CheckCircle, TrendingUp, Database } from 'lucide-react';

export function TrustBand() {
  const metrics = [
    {
      icon: TrendingUp,
      label: 'Backtest Accuracy',
      value: '87%',
      color: 'var(--success-green)'
    },
    {
      icon: CheckCircle,
      label: 'Institutional-grade Indicators',
      value: '50+',
      color: 'var(--accent-teal)'
    },
    {
      icon: Database,
      label: 'Data Sources',
      value: 'Yahoo Finance + CSV',
      color: 'var(--accent-teal)'
    }
  ];

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <Card className="glass-card soft-shadow p-8">
          <div className="grid md:grid-cols-3 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-white/10">
                    <metric.icon 
                      className="w-6 h-6" 
                      style={{ color: metric.color }}
                    />
                  </div>
                </div>
                <div>
                  <div 
                    className="text-2xl font-semibold mb-1"
                    style={{ color: metric.color }}
                  >
                    {metric.value}
                  </div>
                  <p className="text-neutral-text/80 text-sm">
                    {metric.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}